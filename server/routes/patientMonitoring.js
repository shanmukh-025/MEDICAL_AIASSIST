const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const TreatmentPlan = require('../models/TreatmentPlan');
const RecoveryLog = require('../models/RecoveryLog');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const MedicineReminder = require('../models/MedicineReminder');

// ============================================================
// DOCTOR / HOSPITAL ENDPOINTS
// ============================================================

// POST /api/patient-monitoring/treatment-plan
// Doctor creates a treatment plan after completing an appointment
router.post('/treatment-plan', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id).select('-password');
    if (!doctor || doctor.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospitals/doctors can create treatment plans' });
    }

    const {
      appointmentId, patientId, doctorName, diagnosis,
      medicines, durationDays, symptomsToMonitor,
      followUpRequired, followUpDays, followUpNotes,
      specialInstructions, initialSeverity
    } = req.body;

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (durationDays || 7));

    let followUpDate = null;
    if (followUpRequired && followUpDays) {
      followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + followUpDays);
    }

    const plan = new TreatmentPlan({
      appointmentId,
      patientId,
      hospitalId: doctor._id,
      doctorName: doctorName || doctor.name,
      diagnosis,
      medicines: medicines || [],
      startDate,
      endDate,
      symptomsToMonitor: symptomsToMonitor || [],
      followUpRequired: followUpRequired !== false,
      followUpDate,
      followUpNotes,
      specialInstructions,
      initialSeverity: initialSeverity || 5,
      status: 'ACTIVE'
    });

    await plan.save();

    // Update appointment to COMPLETED if not already
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'COMPLETED' });
    }

    // Notify the patient
    const notification = new Notification({
      userId: patientId,
      message: `Your doctor has created a recovery plan for "${diagnosis}". Please track your symptoms daily for the next ${durationDays} days.`,
      type: 'TREATMENT_PLAN'
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${patientId}`).emit('notification', {
        message: notification.message,
        type: 'TREATMENT_PLAN'
      });
    }

    // Auto-create MedicineReminder entries for each prescribed medicine
    const defaultTimings = {
      'once': ['09:00'],
      'twice': ['09:00', '21:00'],
      'thrice': ['08:00', '14:00', '21:00'],
      'four-times': ['08:00', '12:00', '17:00', '22:00']
    };

    const createdReminders = [];
    for (const med of (medicines || [])) {
      try {
        const medEndDate = new Date(startDate);
        medEndDate.setDate(medEndDate.getDate() + (med.duration || durationDays || 7));

        const reminder = new MedicineReminder({
          userId: patientId,
          medicineName: med.name,
          dosage: med.dosage || '',
          frequency: med.frequency || 'twice',
          timings: (med.timings && med.timings.length > 0) ? med.timings : (defaultTimings[med.frequency] || defaultTimings['twice']),
          duration: {
            startDate: startDate,
            endDate: medEndDate
          },
          instructions: {
            beforeFood: med.instructions?.beforeFood || false,
            afterFood: med.instructions?.afterFood || true,
            notes: med.instructions?.notes || `Prescribed for ${diagnosis} by Dr. ${doctorName || doctor.name}`
          },
          notifications: {
            push: true,
            sms: false,
            voice: false,
            language: 'en'
          },
          treatmentPlanId: plan._id,
          isActive: true
        });
        await reminder.save();
        createdReminders.push(reminder);
      } catch (medErr) {
        console.error(`Failed to create reminder for ${med.name}:`, medErr.message);
      }
    }

    console.log(`✅ Created ${createdReminders.length} medicine reminders for treatment plan`);

    res.json({ msg: 'Treatment plan created successfully', plan, remindersCreated: createdReminders.length });
  } catch (err) {
    console.error('Treatment plan error:', err);
    res.status(500).json({ msg: 'Failed to create treatment plan', error: err.message });
  }
});

// GET /api/patient-monitoring/hospital/patients
// Doctor views all patients being monitored
router.get('/hospital/patients', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id).select('-password');
    if (!doctor || doctor.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { status } = req.query;
    const filter = { hospitalId: doctor._id };
    if (status) filter.status = status;

    const plans = await TreatmentPlan.find(filter)
      .populate('patientId', 'name email phone')
      .populate('appointmentId', 'appointmentDate reason')
      .sort({ createdAt: -1 });

    // Get latest recovery log for each plan
    const plansWithRecovery = await Promise.all(plans.map(async (plan) => {
      const latestLog = await RecoveryLog.findOne({ treatmentPlanId: plan._id })
        .sort({ date: -1 });
      
      const logCount = await RecoveryLog.countDocuments({ treatmentPlanId: plan._id });
      
      // Calculate days elapsed
      const now = new Date();
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

      // Calculate average adherence
      const logs = await RecoveryLog.find({ treatmentPlanId: plan._id });
      let avgAdherence = logs.length > 0 
        ? Math.round(logs.reduce((sum, l) => sum + (l.medicineAdherence || 0), 0) / logs.length) 
        : 0;

      // If no recovery logs, calculate adherence from MedicineReminder history
      if (logs.length === 0) {
        const planReminders = await MedicineReminder.find({ treatmentPlanId: plan._id, isActive: true });
        if (planReminders.length > 0) {
          let totalExpected = 0;
          let totalTaken = 0;
          for (const rem of planReminders) {
            totalExpected += rem.timings.length * Math.max(1, daysElapsed);
            totalTaken += rem.history.filter(h => h.status === 'acknowledged').length;
          }
          avgAdherence = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;
        }
      }

      // Determine overall trend from recent logs
      const recentLogs = await RecoveryLog.find({ treatmentPlanId: plan._id })
        .sort({ date: -1 }).limit(3);
      
      let overallTrend = 'stable';
      if (recentLogs.length >= 2) {
        const severities = recentLogs.map(l => l.overallSeverity);
        const isImproving = severities[0] < severities[severities.length - 1];
        const isWorsening = severities[0] > severities[severities.length - 1];
        if (isImproving) overallTrend = 'improving';
        else if (isWorsening) overallTrend = 'worsening';
      }

      return {
        ...plan.toObject(),
        latestLog,
        logCount,
        totalDays,
        daysElapsed,
        daysRemaining,
        avgAdherence,
        overallTrend,
        completionPercentage: Math.min(100, Math.round((daysElapsed / totalDays) * 100))
      };
    }));

    res.json(plansWithRecovery);
  } catch (err) {
    console.error('Fetch patients error:', err);
    res.status(500).json({ msg: 'Failed to fetch monitored patients' });
  }
});

// GET /api/patient-monitoring/hospital/patient/:planId/recovery
// Doctor views detailed recovery data for a specific patient's plan
router.get('/hospital/patient/:planId/recovery', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id).select('-password');
    if (!doctor || doctor.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const plan = await TreatmentPlan.findOne({ _id: req.params.planId, hospitalId: doctor._id })
      .populate('patientId', 'name email phone')
      .populate('appointmentId', 'appointmentDate reason');

    if (!plan) return res.status(404).json({ msg: 'Treatment plan not found' });

    const recoveryLogs = await RecoveryLog.find({ treatmentPlanId: plan._id })
      .sort({ dayNumber: 1 });

    // Build severity timeline for charting
    const severityTimeline = recoveryLogs.map(log => ({
      day: log.dayNumber,
      date: log.date,
      overallSeverity: log.overallSeverity,
      symptoms: log.symptoms,
      feeling: log.overallFeeling,
      adherence: log.medicineAdherence,
      trend: log.trend,
      sideEffects: log.sideEffects,
      needsAttention: log.needsDoctorAttention
    }));

    // Calculate symptom-wise breakdown
    const symptomBreakdown = {};
    recoveryLogs.forEach(log => {
      log.symptoms.forEach(s => {
        if (!symptomBreakdown[s.name]) symptomBreakdown[s.name] = [];
        symptomBreakdown[s.name].push({
          day: log.dayNumber,
          severity: s.severity,
          date: log.date
        });
      });
    });

    // Calculate stats
    const totalDays = Math.ceil((new Date(plan.endDate) - new Date(plan.startDate)) / (1000 * 60 * 60 * 24));
    const logsSubmitted = recoveryLogs.length;
    const missedDays = Math.max(0, Math.ceil((new Date() - new Date(plan.startDate)) / (1000 * 60 * 60 * 24)) - logsSubmitted);
    
    // Calculate adherence from recovery logs
    let avgAdherence = logsSubmitted > 0 
      ? Math.round(recoveryLogs.reduce((s, l) => s + (l.medicineAdherence || 0), 0) / logsSubmitted) 
      : 0;

    // Also get real-time medicine compliance from MedicineReminder history
    const planReminders = await MedicineReminder.find({ 
      treatmentPlanId: plan._id, 
      isActive: true 
    });

    let medicineComplianceData = null;
    if (planReminders.length > 0) {
      // Calculate total expected doses and actual taken doses across entire treatment
      const planStartDate = new Date(plan.startDate);
      const now = new Date();
      const daysSinceStart = Math.max(1, Math.ceil((now - planStartDate) / (1000 * 60 * 60 * 24)));
      
      let totalExpectedDoses = 0;
      let totalTakenDoses = 0;
      const todayStr = new Date().toDateString();
      let todayExpected = 0;
      let todayTaken = 0;

      for (const rem of planReminders) {
        // Expected doses per day = number of timings
        totalExpectedDoses += rem.timings.length * daysSinceStart;
        todayExpected += rem.timings.length;

        // Actual taken = acknowledged entries
        const acknowledgedEntries = rem.history.filter(h => h.status === 'acknowledged');
        totalTakenDoses += acknowledgedEntries.length;

        // Today's taken
        todayTaken += acknowledgedEntries.filter(h => 
          h.sentAt && new Date(h.sentAt).toDateString() === todayStr
        ).length;
      }

      const overallCompliance = totalExpectedDoses > 0 
        ? Math.round((totalTakenDoses / totalExpectedDoses) * 100) 
        : 0;
      const todayCompliance = todayExpected > 0 
        ? Math.round((todayTaken / todayExpected) * 100) 
        : 0;

      medicineComplianceData = {
        overallCompliance,
        todayCompliance,
        todayTaken,
        todayExpected,
        totalTakenDoses,
        totalExpectedDoses,
        medicines: planReminders.map(r => ({
          name: r.medicineName,
          dosage: r.dosage,
          frequency: r.frequency,
          timings: r.timings,
          takenToday: r.history.filter(h => 
            h.status === 'acknowledged' && h.sentAt && new Date(h.sentAt).toDateString() === todayStr
          ).length,
          totalTaken: r.history.filter(h => h.status === 'acknowledged').length
        }))
      };

      // Use real-time compliance as adherence if no recovery logs yet
      if (logsSubmitted === 0 && overallCompliance > 0) {
        avgAdherence = overallCompliance;
      }
    }

    const avgSeverity = logsSubmitted > 0
      ? (recoveryLogs.reduce((s, l) => s + l.overallSeverity, 0) / logsSubmitted).toFixed(1)
      : plan.initialSeverity;
    
    // Alerts
    const alerts = [];
    const recentLogs = recoveryLogs.slice(-3);
    if (recentLogs.some(l => l.needsDoctorAttention)) {
      alerts.push({ type: 'critical', message: 'Patient flagged for doctor attention' });
    }
    if (recentLogs.length >= 2 && recentLogs[recentLogs.length - 1].overallSeverity > recentLogs[recentLogs.length - 2].overallSeverity) {
      alerts.push({ type: 'warning', message: 'Symptoms worsening - severity increasing' });
    }
    if (avgAdherence < 70) {
      alerts.push({ type: 'warning', message: `Low medicine adherence: ${avgAdherence}%` });
    }
    if (missedDays > 2) {
      alerts.push({ type: 'info', message: `Patient missed ${missedDays} daily check-ins` });
    }

    // Check if treatment ended and follow-up needed
    const treatmentEnded = new Date() > new Date(plan.endDate);
    if (treatmentEnded && plan.status === 'ACTIVE') {
      // Auto-update status
      plan.status = 'FOLLOW_UP_NEEDED';
      await plan.save();
    }

    res.json({
      plan,
      recoveryLogs,
      severityTimeline,
      symptomBreakdown,
      medicineComplianceData,
      stats: {
        totalDays,
        logsSubmitted,
        missedDays,
        avgAdherence,
        avgSeverity,
        initialSeverity: plan.initialSeverity,
        treatmentEnded,
        alerts
      }
    });
  } catch (err) {
    console.error('Recovery data error:', err);
    res.status(500).json({ msg: 'Failed to fetch recovery data' });
  }
});

// PUT /api/patient-monitoring/hospital/plan/:planId/request-followup
// Doctor requests a follow-up
router.put('/hospital/plan/:planId/request-followup', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id).select('-password');
    if (!doctor || doctor.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const plan = await TreatmentPlan.findOne({ _id: req.params.planId, hospitalId: doctor._id });
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });

    const { followUpDate, followUpNotes } = req.body;
    plan.status = 'FOLLOW_UP_NEEDED';
    plan.followUpRequired = true;
    plan.followUpDate = followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    plan.followUpNotes = followUpNotes || 'Doctor has requested a follow-up visit.';
    await plan.save();

    // Notify patient
    const notification = new Notification({
      userId: plan.patientId,
      message: `Your doctor has requested a follow-up visit for "${plan.diagnosis}". Please book an appointment${followUpDate ? ` around ${new Date(followUpDate).toLocaleDateString()}` : ' soon'}.`,
      type: 'FOLLOW_UP'
    });
    await notification.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${plan.patientId}`).emit('notification', {
        message: notification.message,
        type: 'FOLLOW_UP'
      });
    }

    res.json({ msg: 'Follow-up requested', plan });
  } catch (err) {
    console.error('Follow-up request error:', err);
    res.status(500).json({ msg: 'Failed to request follow-up' });
  }
});

// PUT /api/patient-monitoring/hospital/plan/:planId/add-notes
// Doctor adds clinical notes to a plan
router.put('/hospital/plan/:planId/add-notes', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id).select('-password');
    if (!doctor || doctor.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { notes } = req.body;
    const plan = await TreatmentPlan.findOneAndUpdate(
      { _id: req.params.planId, hospitalId: doctor._id },
      { $set: { specialInstructions: notes } },
      { new: true }
    );

    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    res.json({ msg: 'Notes updated', plan });
  } catch (err) {
    console.error('Add notes error:', err);
    res.status(500).json({ msg: 'Failed to update notes' });
  }
});


// ============================================================
// PATIENT ENDPOINTS  
// ============================================================

// GET /api/patient-monitoring/my-plans
// Patient views their active treatment plans
router.get('/my-plans', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { patientId: req.user.id };
    if (status) filter.status = status;
    else filter.status = { $in: ['ACTIVE', 'FOLLOW_UP_NEEDED'] };

    const plans = await TreatmentPlan.find(filter)
      .populate('hospitalId', 'name phone logo')
      .sort({ createdAt: -1 });

    // Enrich with recovery progress
    const enriched = await Promise.all(plans.map(async (plan) => {
      const logs = await RecoveryLog.find({ treatmentPlanId: plan._id }).sort({ dayNumber: 1 });
      const now = new Date();
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      const currentDay = Math.min(daysElapsed, totalDays);
      
      // Check if today's log is submitted
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLog = logs.find(l => {
        const logDate = new Date(l.date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });

      const latestLog = logs[logs.length - 1];
      const avgAdherence = logs.length > 0
        ? Math.round(logs.reduce((s, l) => s + (l.medicineAdherence || 0), 0) / logs.length)
        : 0;

      return {
        ...plan.toObject(),
        totalDays,
        currentDay,
        daysRemaining: Math.max(0, totalDays - daysElapsed),
        todayLogSubmitted: !!todayLog,
        logsSubmitted: logs.length,
        latestLog,
        avgAdherence,
        completionPercentage: Math.min(100, Math.round((daysElapsed / totalDays) * 100)),
        treatmentEnded: now > end
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('My plans error:', err);
    res.status(500).json({ msg: 'Failed to fetch treatment plans' });
  }
});

// GET /api/patient-monitoring/plan/:planId
// Patient views a specific treatment plan with all logs
router.get('/plan/:planId', auth, async (req, res) => {
  try {
    const plan = await TreatmentPlan.findOne({ _id: req.params.planId, patientId: req.user.id })
      .populate('hospitalId', 'name phone logo');
    
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });

    const recoveryLogs = await RecoveryLog.find({ treatmentPlanId: plan._id })
      .sort({ dayNumber: 1 });

    const now = new Date();
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(daysElapsed, totalDays);

    // Build severity timeline
    const severityTimeline = recoveryLogs.map(log => ({
      day: log.dayNumber,
      severity: log.overallSeverity,
      feeling: log.overallFeeling,
      adherence: log.medicineAdherence
    }));

    res.json({
      plan,
      recoveryLogs,
      severityTimeline,
      totalDays,
      currentDay,
      daysRemaining: Math.max(0, totalDays - daysElapsed),
      treatmentEnded: now > end
    });
  } catch (err) {
    console.error('Plan detail error:', err);
    res.status(500).json({ msg: 'Failed to fetch plan details' });
  }
});

// POST /api/patient-monitoring/plan/:planId/log
// Patient submits a daily recovery log
router.post('/plan/:planId/log', auth, async (req, res) => {
  try {
    const plan = await TreatmentPlan.findOne({ _id: req.params.planId, patientId: req.user.id });
    if (!plan) return res.status(404).json({ msg: 'Treatment plan not found' });

    const {
      symptoms, overallFeeling, overallSeverity,
      medicinesTaken, sideEffects, newSymptoms, patientNotes
    } = req.body;

    // Calculate day number
    const start = new Date(plan.startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dayNumber = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1);

    // Check if already logged today
    const existingLog = await RecoveryLog.findOne({
      treatmentPlanId: plan._id,
      dayNumber
    });
    if (existingLog) {
      return res.status(400).json({ msg: 'You have already logged your recovery for today. Come back tomorrow!' });
    }

    // Calculate medicine adherence
    const totalMeds = medicinesTaken ? medicinesTaken.length : 0;
    const takenMeds = medicinesTaken ? medicinesTaken.filter(m => m.taken).length : 0;
    const medicineAdherence = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

    // Determine trend by comparing with previous log
    let trend = 'stable';
    const previousLog = await RecoveryLog.findOne({ treatmentPlanId: plan._id })
      .sort({ dayNumber: -1 });
    
    if (previousLog) {
      const diff = overallSeverity - previousLog.overallSeverity;
      if (diff <= -2) trend = 'improving';
      else if (diff < 0) trend = 'improving';
      else if (diff >= 3) trend = 'critical';
      else if (diff > 0) trend = 'worsening';
    }

    // Auto-flag for doctor attention
    const needsDoctorAttention = 
      overallSeverity >= 8 || 
      trend === 'critical' || 
      (sideEffects && sideEffects.length > 0) ||
      overallFeeling === 'much_worse' ||
      (newSymptoms && newSymptoms.length > 0);

    const log = new RecoveryLog({
      treatmentPlanId: plan._id,
      patientId: req.user.id,
      hospitalId: plan.hospitalId,
      date: new Date(),
      dayNumber,
      symptoms: symptoms || [],
      overallFeeling,
      overallSeverity,
      medicinesTaken: medicinesTaken || [],
      medicineAdherence,
      sideEffects: sideEffects || [],
      newSymptoms: newSymptoms || [],
      patientNotes,
      needsDoctorAttention,
      trend
    });

    await log.save();

    // If needs doctor attention, send alert to hospital
    if (needsDoctorAttention) {
      const patient = await User.findById(req.user.id).select('name');
      const alertNotification = new Notification({
        userId: plan.hospitalId,
        message: `⚠️ ALERT: Patient ${patient?.name || 'Unknown'} reports ${
          trend === 'critical' ? 'CRITICAL worsening' :
          sideEffects?.length > 0 ? 'side effects' :
          overallFeeling === 'much_worse' ? 'feeling much worse' :
          newSymptoms?.length > 0 ? 'new symptoms' :
          'high severity'
        } during recovery from "${plan.diagnosis}" (Day ${dayNumber})`,
        type: 'RECOVERY_ALERT'
      });
      await alertNotification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${plan.hospitalId}`).emit('notification', {
          message: alertNotification.message,
          type: 'RECOVERY_ALERT'
        });
      }
    }

    res.json({ msg: 'Recovery log submitted successfully', log, trend, needsDoctorAttention });
  } catch (err) {
    console.error('Log submission error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Already logged for today' });
    }
    res.status(500).json({ msg: 'Failed to submit recovery log', error: err.message });
  }
});

// GET /api/patient-monitoring/my-history
// Patient views all their treatment history
router.get('/my-history', auth, async (req, res) => {
  try {
    const plans = await TreatmentPlan.find({ patientId: req.user.id })
      .populate('hospitalId', 'name')
      .sort({ createdAt: -1 });

    res.json(plans);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ msg: 'Failed to fetch treatment history' });
  }
});

// GET /api/patient-monitoring/pending-checkins
// Patient views plans that need today's check-in
router.get('/pending-checkins', auth, async (req, res) => {
  try {
    const activePlans = await TreatmentPlan.find({
      patientId: req.user.id,
      status: 'ACTIVE'
    }).populate('hospitalId', 'name');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = [];
    for (const plan of activePlans) {
      const start = new Date(plan.startDate);
      start.setHours(0, 0, 0, 0);
      const dayNumber = Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1);
      
      const existingLog = await RecoveryLog.findOne({
        treatmentPlanId: plan._id,
        dayNumber
      });

      if (!existingLog) {
        pending.push({
          ...plan.toObject(),
          dayNumber
        });
      }
    }

    res.json(pending);
  } catch (err) {
    console.error('Pending check-ins error:', err);
    res.status(500).json({ msg: 'Failed to fetch pending check-ins' });
  }
});

// GET /api/patient-monitoring/my-medicine-schedule
// Patient gets today's medicine schedule with times and status
router.get('/my-medicine-schedule', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active reminders for this patient (from treatment plans)
    const reminders = await MedicineReminder.find({
      userId: req.user.id,
      isActive: true,
      'duration.startDate': { $lte: new Date() },
      'duration.endDate': { $gte: today }
    }).populate('treatmentPlanId', 'diagnosis doctorName hospitalId status');

    // Build a time-sorted schedule
    const currentTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    
    const schedule = [];
    const todayStr = new Date().toDateString();
    for (const rem of reminders) {
      for (const timing of rem.timings) {
        const isPast = timing <= currentTime;
        // Check if THIS SPECIFIC TIMING was acknowledged today
        const todayAcknowledged = rem.history.some(h => {
          if (!h.sentAt || h.status !== 'acknowledged') return false;
          const sentDate = new Date(h.sentAt);
          // Match by timingSlot for precise per-dose tracking
          if (h.timingSlot) {
            return sentDate.toDateString() === todayStr && h.timingSlot === timing;
          }
          // Legacy fallback: if no timingSlot stored, consider taken only if single timing
          return sentDate.toDateString() === todayStr && rem.timings.length === 1;
        });

        schedule.push({
          reminderId: rem._id,
          medicineName: rem.medicineName,
          dosage: rem.dosage,
          frequency: rem.frequency,
          scheduledTime: timing,
          isPast,
          taken: todayAcknowledged,
          instructions: rem.instructions,
          diagnosis: rem.treatmentPlanId?.diagnosis || '',
          doctorName: rem.treatmentPlanId?.doctorName || '',
          treatmentPlanId: rem.treatmentPlanId?._id || null
        });
      }
    }

    // Sort by time
    schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    res.json(schedule);
  } catch (err) {
    console.error('Medicine schedule error:', err);
    res.status(500).json({ msg: 'Failed to fetch medicine schedule' });
  }
});

// POST /api/patient-monitoring/medicine-taken/:reminderId
// Patient marks a medicine as taken for a specific timing
router.post('/medicine-taken/:reminderId', auth, async (req, res) => {
  try {
    const { timing } = req.body; // e.g. '09:00'
    const reminder = await MedicineReminder.findOne({
      _id: req.params.reminderId,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ msg: 'Reminder not found' });
    }

    // Check if this timing was already acknowledged today
    const todayStr = new Date().toDateString();
    const alreadyTaken = reminder.history.some(h => {
      if (!h.sentAt || h.status !== 'acknowledged') return false;
      return new Date(h.sentAt).toDateString() === todayStr && h.timingSlot === timing;
    });

    if (alreadyTaken) {
      return res.json({ msg: 'Already marked as taken' });
    }

    reminder.history.push({
      scheduledTime: new Date(),
      sentAt: new Date(),
      status: 'acknowledged',
      method: 'push',
      timingSlot: timing || null
    });
    await reminder.save();

    res.json({ msg: 'Medicine marked as taken' });
  } catch (err) {
    console.error('Medicine taken error:', err);
    res.status(500).json({ msg: 'Failed to mark medicine as taken' });
  }
});

// GET /api/patient-monitoring/vapid-public-key
// Return the VAPID public key for push notification subscription
router.get('/vapid-public-key', auth, async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(404).json({ msg: 'VAPID public key not configured' });
    }
    res.json({ publicKey });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/patient-monitoring/sync-reminders
// Create MedicineReminder entries for active treatment plans that don't have them yet
router.post('/sync-reminders', auth, async (req, res) => {
  try {
    // Find all active treatment plans for this patient
    const activePlans = await TreatmentPlan.find({
      patientId: req.user.id,
      status: { $in: ['ACTIVE', 'FOLLOW_UP_NEEDED'] }
    });

    if (activePlans.length === 0) {
      return res.json({ msg: 'No active treatment plans found', created: 0 });
    }

    const defaultTimings = {
      'once': ['09:00'],
      'twice': ['09:00', '21:00'],
      'thrice': ['08:00', '14:00', '21:00'],
      'four-times': ['08:00', '12:00', '17:00', '22:00']
    };

    let totalCreated = 0;

    for (const plan of activePlans) {
      // Check if reminders already exist for this plan
      const existingCount = await MedicineReminder.countDocuments({
        treatmentPlanId: plan._id,
        isActive: true
      });

      if (existingCount > 0) continue; // Already has reminders

      for (const med of (plan.medicines || [])) {
        try {
          const medEndDate = new Date(plan.endDate || Date.now());

          const reminder = new MedicineReminder({
            userId: plan.patientId,
            medicineName: med.name,
            dosage: med.dosage || '',
            frequency: med.frequency || 'twice',
            timings: (med.timings && med.timings.length > 0) ? med.timings : (defaultTimings[med.frequency] || defaultTimings['twice']),
            duration: {
              startDate: plan.startDate,
              endDate: medEndDate
            },
            instructions: {
              beforeFood: med.instructions?.beforeFood || false,
              afterFood: med.instructions?.afterFood || true,
              notes: med.instructions?.notes || `Prescribed for ${plan.diagnosis} by Dr. ${plan.doctorName}`
            },
            notifications: {
              push: true,
              sms: false,
              voice: false,
              language: 'en'
            },
            treatmentPlanId: plan._id,
            isActive: true
          });
          await reminder.save();
          totalCreated++;
        } catch (medErr) {
          console.error(`Failed to create reminder for ${med.name}:`, medErr.message);
        }
      }
    }

    console.log(`✅ Synced ${totalCreated} medicine reminders for patient ${req.user.id}`);
    res.json({ msg: `Created ${totalCreated} medicine reminders`, created: totalCreated });
  } catch (err) {
    console.error('Sync reminders error:', err);
    res.status(500).json({ msg: 'Failed to sync reminders' });
  }
});

// POST /api/patient-monitoring/subscribe-push
// Patient subscribes to push notifications for medicine reminders
router.post('/subscribe-push', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    // Update all active reminders for this user with push subscription
    await MedicineReminder.updateMany(
      { userId: req.user.id, isActive: true },
      { pushSubscription: subscription }
    );

    res.json({ msg: 'Push notification subscription saved' });
  } catch (err) {
    console.error('Push subscription error:', err);
    res.status(500).json({ msg: 'Failed to save push subscription' });
  }
});

// GET /api/patient-monitoring/hospital/search-patients
// Search registered patients by name, email, or phone (for treatment plan creation)
router.get('/hospital/search-patients', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id).select('-password');
    if (!doctor || doctor.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const regex = new RegExp(q, 'i');
    const patients = await User.find({
      role: 'PATIENT',
      $or: [
        { name: regex },
        { email: regex },
        { phone: regex }
      ]
    }).select('name email phone _id').limit(10);

    res.json(patients);
  } catch (err) {
    console.error('Patient search error:', err);
    res.status(500).json({ msg: 'Failed to search patients' });
  }
});

// GET /api/patient-monitoring/hospital/patient-appointments/:patientId
// Get completed appointments for a specific patient at this hospital
router.get('/hospital/patient-appointments/:patientId', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id).select('-password');
    if (!doctor || doctor.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const appointments = await Appointment.find({
      patientId: req.params.patientId,
      hospitalId: doctor._id,
      status: 'COMPLETED'
    }).sort({ createdAt: -1 }).limit(10);

    res.json(appointments);
  } catch (err) {
    console.error('Patient appointments error:', err);
    res.status(500).json({ msg: 'Failed to fetch appointments' });
  }
});

module.exports = router;
