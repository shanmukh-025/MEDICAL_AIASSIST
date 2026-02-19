/**
 * Emergency Patient Monitoring API Routes
 * Provides real-time vital signs monitoring for emergency patients in queue
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Middleware to verify hospital staff
const verifyHospitalStaff = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospital staff can access emergency monitoring' });
    }
    req.hospitalUser = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ============================================================
// ROUTES - All require authentication and hospital role
// ============================================================

// POST /api/emergency-monitoring/start/:appointmentId
// Start monitoring an emergency patient
router.post('/start/:appointmentId', auth, verifyHospitalStaff, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      chiefComplaint,
      initialSymptoms,
      initialSeverity,
      allergies,
      currentMedications
    } = req.body;

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    // Verify this is an emergency appointment
    if (appointment.type !== 'EMERGENCY' && appointment.status !== 'EMERGENCY') {
      return res.status(400).json({ msg: 'This endpoint is for emergency patients only' });
    }

    // Check if monitoring already enabled
    if (appointment.emergencyMonitoring?.enabled) {
      return res.status(400).json({ msg: 'Monitoring already enabled for this patient' });
    }

    // Initialize monitoring
    appointment.emergencyMonitoring = {
      enabled: true,
      startedAt: new Date(),
      chiefComplaint: chiefComplaint || '',
      initialSymptoms: initialSymptoms || '',
      initialSeverity: initialSeverity || 5,
      allergies: allergies || '',
      currentMedications: currentMedications || '',
      vitalSignsHistory: [],
      monitoringNotes: [],
      interventions: [],
      isCritical: initialSeverity >= 8,
      lastVitalUpdate: new Date()
    };

    // Update appointment status if not already in progress
    if (appointment.status === 'EMERGENCY') {
      appointment.status = 'IN_PROGRESS';
      appointment.consultationStartTime = new Date();
    }

    await appointment.save();

    // Log initial vital signs entry
    const initialVital = {
      recordedAt: new Date(),
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      heartRate: null,
      temperature: null,
      respiratoryRate: null,
      oxygenSaturation: null,
      painLevel: initialSeverity || 5,
      consciousnessLevel: 'Alert',
      notes: `Monitoring started. Chief complaint: ${chiefComplaint || 'Not specified'}`,
      recordedBy: req.hospitalUser.name
    };

    appointment.emergencyMonitoring.vitalSignsHistory.push(initialVital);
    await appointment.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('emergencyMonitoringStarted', {
        appointmentId: appointment._id,
        queueNumber: appointment.queueNumber,
        patientName: appointment.patientName,
        hospitalId: appointment.hospitalId,
        timestamp: new Date()
      });
    }

    console.log(`✅ Emergency monitoring started for appointment ${appointmentId}`);

    res.json({
      msg: 'Emergency monitoring started',
      monitoring: appointment.emergencyMonitoring,
      appointment: {
        _id: appointment._id,
        queueNumber: appointment.queueNumber,
        patientName: appointment.patientName,
        status: appointment.status
      }
    });

  } catch (err) {
    console.error('Start monitoring error:', err);
    res.status(500).json({ msg: 'Failed to start monitoring', error: err.message });
  }
});

// POST /api/emergency-monitoring/vitals/:appointmentId
// Record vital signs for an emergency patient
router.post('/vitals/:appointmentId', auth, verifyHospitalStaff, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      bloodPressureSystolic,
      bloodPressureDiastolic,
      heartRate,
      temperature,
      respiratoryRate,
      oxygenSaturation,
      painLevel,
      consciousnessLevel,
      notes
    } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (!appointment.emergencyMonitoring?.enabled) {
      return res.status(400).json({ msg: 'Monitoring not enabled for this patient' });
    }

    // Check for critical vital signs
    let isCritical = false;
    const criticalAlerts = [];

    if (oxygenSaturation && oxygenSaturation < 92) {
      isCritical = true;
      criticalAlerts.push(`Low SpO2: ${oxygenSaturation}%`);
    }
    if (heartRate && (heartRate > 120 || heartRate < 50)) {
      isCritical = true;
      criticalAlerts.push(`Abnormal heart rate: ${heartRate} bpm`);
    }
    if (bloodPressureSystolic && (bloodPressureSystolic > 180 || bloodPressureSystolic < 90)) {
      isCritical = true;
      criticalAlerts.push(`Abnormal BP: ${bloodPressureSystolic}/${bloodPressureDiastolic}`);
    }
    if (respiratoryRate && respiratoryRate > 30) {
      isCritical = true;
      criticalAlerts.push(`High respiratory rate: ${respiratoryRate}/min`);
    }
    if (temperature && temperature > 39.5) {
      isCritical = true;
      criticalAlerts.push(`High fever: ${temperature}°C`);
    }
    if (consciousnessLevel && consciousnessLevel !== 'Alert') {
      isCritical = true;
      criticalAlerts.push(`Altered consciousness: ${consciousnessLevel}`);
    }

    // Create vital signs entry
    const vitalEntry = {
      recordedAt: new Date(),
      bloodPressureSystolic: bloodPressureSystolic || null,
      bloodPressureDiastolic: bloodPressureDiastolic || null,
      heartRate: heartRate || null,
      temperature: temperature || null,
      respiratoryRate: respiratoryRate || null,
      oxygenSaturation: oxygenSaturation || null,
      painLevel: painLevel !== undefined ? painLevel : null,
      consciousnessLevel: consciousnessLevel || 'Alert',
      notes: notes || '',
      recordedBy: req.hospitalUser.name
    };

    // Add to history
    appointment.emergencyMonitoring.vitalSignsHistory.push(vitalEntry);
    appointment.emergencyMonitoring.lastVitalUpdate = new Date();
    
    // Update critical status
    if (isCritical) {
      appointment.emergencyMonitoring.isCritical = true;
    } else {
      // Check if still critical based on previous vitals
      const recentVitals = appointment.emergencyMonitoring.vitalSignsHistory.slice(-3);
      const stillCritical = recentVitals.some(v => 
        (v.oxygenSaturation && v.oxygenSaturation < 92) ||
        (v.heartRate && (v.heartRate > 120 || v.heartRate < 50)) ||
        (v.bloodPressureSystolic && (v.bloodPressureSystolic > 180 || v.bloodPressureSystolic < 90)) ||
        (v.consciousnessLevel && v.consciousnessLevel !== 'Alert')
      );
      appointment.emergencyMonitoring.isCritical = stillCritical;
    }

    await appointment.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('vitalsRecorded', {
        appointmentId: appointment._id,
        queueNumber: appointment.queueNumber,
        patientName: appointment.patientName,
        vitalEntry,
        isCritical,
        criticalAlerts,
        timestamp: new Date()
      });

      // If critical, emit alert
      if (isCritical) {
        io.emit('criticalAlert', {
          appointmentId: appointment._id,
          queueNumber: appointment.queueNumber,
          patientName: appointment.patientName,
          hospitalId: appointment.hospitalId,
          alerts: criticalAlerts,
          vitalEntry,
          timestamp: new Date()
        });
      }
    }

    // Create notification if critical
    if (isCritical) {
      const notification = new Notification({
        userId: appointment.hospitalId,
        message: `⚠️ CRITICAL: Emergency patient #${appointment.queueNumber} (${appointment.patientName}) has abnormal vital signs: ${criticalAlerts.join(', ')}`,
        type: 'EMERGENCY_ALERT'
      });
      await notification.save();
    }

    console.log(`📊 Vitals recorded for appointment ${appointmentId}:`, isCritical ? 'CRITICAL' : 'Normal');

    res.json({
      msg: isCritical ? '⚠️ Critical vital signs recorded!' : 'Vital signs recorded',
      vitalEntry,
      isCritical,
      criticalAlerts,
      monitoring: {
        isCritical: appointment.emergencyMonitoring.isCritical,
        lastVitalUpdate: appointment.emergencyMonitoring.lastVitalUpdate,
        vitalSignsCount: appointment.emergencyMonitoring.vitalSignsHistory.length
      }
    });

  } catch (err) {
    console.error('Record vitals error:', err);
    res.status(500).json({ msg: 'Failed to record vital signs', error: err.message });
  }
});

// POST /api/emergency-monitoring/notes/:appointmentId
// Add clinical notes for an emergency patient
router.post('/notes/:appointmentId', auth, verifyHospitalStaff, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ msg: 'Note content is required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (!appointment.emergencyMonitoring?.enabled) {
      return res.status(400).json({ msg: 'Monitoring not enabled for this patient' });
    }

    // Add note
    const noteEntry = {
      note: note.trim(),
      addedAt: new Date(),
      addedBy: req.hospitalUser.name
    };

    appointment.emergencyMonitoring.monitoringNotes.push(noteEntry);
    await appointment.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('monitoringNoteAdded', {
        appointmentId: appointment._id,
        queueNumber: appointment.queueNumber,
        noteEntry,
        timestamp: new Date()
      });
    }

    console.log(`📝 Note added for appointment ${appointmentId}`);

    res.json({
      msg: 'Note added successfully',
      note: noteEntry
    });

  } catch (err) {
    console.error('Add note error:', err);
    res.status(500).json({ msg: 'Failed to add note', error: err.message });
  }
});

// POST /api/emergency-monitoring/intervention/:appointmentId
// Record an intervention performed
router.post('/intervention/:appointmentId', auth, verifyHospitalStaff, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { intervention, result } = req.body;

    if (!intervention || intervention.trim() === '') {
      return res.status(400).json({ msg: 'Intervention description is required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (!appointment.emergencyMonitoring?.enabled) {
      return res.status(400).json({ msg: 'Monitoring not enabled for this patient' });
    }

    // Add intervention
    const interventionEntry = {
      intervention: intervention.trim(),
      time: new Date(),
      result: result || ''
    };

    appointment.emergencyMonitoring.interventions.push(interventionEntry);
    await appointment.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('interventionRecorded', {
        appointmentId: appointment._id,
        queueNumber: appointment.queueNumber,
        interventionEntry,
        timestamp: new Date()
      });
    }

    console.log(`💊 Intervention recorded for appointment ${appointmentId}: ${intervention}`);

    res.json({
      msg: 'Intervention recorded',
      intervention: interventionEntry
    });

  } catch (err) {
    console.error('Record intervention error:', err);
    res.status(500).json({ msg: 'Failed to record intervention', error: err.message });
  }
});

// GET /api/emergency-monitoring/status/:appointmentId
// Get monitoring status for an emergency patient
router.get('/status/:appointmentId', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (!appointment.emergencyMonitoring?.enabled) {
      return res.status(400).json({ msg: 'Monitoring not enabled for this patient' });
    }

    // Get latest vital signs
    const vitalSignsHistory = appointment.emergencyMonitoring.vitalSignsHistory || [];
    const latestVitals = vitalSignsHistory.length > 0 
      ? vitalSignsHistory[vitalSignsHistory.length - 1] 
      : null;

    // Calculate monitoring duration
    const monitoringDuration = appointment.emergencyMonitoring.startedAt
      ? Math.round((new Date() - new Date(appointment.emergencyMonitoring.startedAt)) / 60000)
      : 0;

    res.json({
      appointment: {
        _id: appointment._id,
        queueNumber: appointment.queueNumber,
        patientName: appointment.patientName,
        phone: appointment.phone,
        status: appointment.status,
        type: appointment.type
      },
      monitoring: {
        enabled: appointment.emergencyMonitoring.enabled,
        startedAt: appointment.emergencyMonitoring.startedAt,
        endedAt: appointment.emergencyMonitoring.endedAt,
        durationMinutes: monitoringDuration,
        chiefComplaint: appointment.emergencyMonitoring.chiefComplaint,
        initialSymptoms: appointment.emergencyMonitoring.initialSymptoms,
        initialSeverity: appointment.emergencyMonitoring.initialSeverity,
        allergies: appointment.emergencyMonitoring.allergies,
        currentMedications: appointment.emergencyMonitoring.currentMedications,
        isCritical: appointment.emergencyMonitoring.isCritical,
        lastVitalUpdate: appointment.emergencyMonitoring.lastVitalUpdate,
        vitalSignsHistory: vitalSignsHistory.reverse(), // Most recent first
        monitoringNotes: appointment.emergencyMonitoring.monitoringNotes.reverse(),
        interventions: appointment.emergencyMonitoring.interventions.reverse()
      },
      latestVitals,
      vitalSignsCount: vitalSignsHistory.length,
      notesCount: appointment.emergencyMonitoring.monitoringNotes.length,
      interventionsCount: appointment.emergencyMonitoring.interventions.length
    });

  } catch (err) {
    console.error('Get monitoring status error:', err);
    res.status(500).json({ msg: 'Failed to get monitoring status', error: err.message });
  }
});

// GET /api/emergency-monitoring/hospital/active
// Get all active emergency monitoring patients for a hospital
router.get('/hospital/active', auth, verifyHospitalStaff, async (req, res) => {
  try {
    const hospitalId = req.hospitalUser._id;

    // Find all emergency appointments with active monitoring for this hospital
    const appointments = await Appointment.find({
      hospitalId: hospitalId,
      $or: [
        { type: 'EMERGENCY', status: { $in: ['EMERGENCY', 'IN_PROGRESS'] } },
        { 'emergencyMonitoring.enabled': true, 'emergencyMonitoring.endedAt': null }
      ]
    }).sort({ queueNumber: 1 });

    const activeMonitorings = appointments.map(appt => {
      const vitals = appt.emergencyMonitoring?.vitalSignsHistory || [];
      const latestVitals = vitals.length > 0 ? vitals[vitals.length - 1] : null;
      const monitoringDuration = appt.emergencyMonitoring?.startedAt
        ? Math.round((new Date() - new Date(appt.emergencyMonitoring.startedAt)) / 60000)
        : 0;

      return {
        appointmentId: appt._id,
        queueNumber: appt.queueNumber,
        patientName: appt.patientName,
        phone: appt.phone,
        status: appt.status,
        monitoringDuration,
        isCritical: appt.emergencyMonitoring?.isCritical || false,
        lastVitalUpdate: appt.emergencyMonitoring?.lastVitalUpdate,
        latestVitals,
        chiefComplaint: appt.emergencyMonitoring?.chiefComplaint
      };
    });

    res.json({
      activeMonitorings,
      count: activeMonitorings.length,
      criticalCount: activeMonitorings.filter(m => m.isCritical).length
    });

  } catch (err) {
    console.error('Get active monitorings error:', err);
    res.status(500).json({ msg: 'Failed to get active monitorings', error: err.message });
  }
});

// POST /api/emergency-monitoring/end/:appointmentId
// End monitoring for an emergency patient
router.post('/end/:appointmentId', auth, verifyHospitalStaff, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { outcome, notes } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (!appointment.emergencyMonitoring?.enabled) {
      return res.status(400).json({ msg: 'Monitoring not enabled for this patient' });
    }

    // End monitoring
    appointment.emergencyMonitoring.enabled = false;
    appointment.emergencyMonitoring.endedAt = new Date();

    // Add final note if provided
    if (notes) {
      appointment.emergencyMonitoring.monitoringNotes.push({
        note: notes,
        addedAt: new Date(),
        addedBy: req.hospitalUser.name
      });
    }

    // Update appointment status if still in progress
    if (appointment.status === 'IN_PROGRESS') {
      appointment.status = 'COMPLETED';
      appointment.consultationEndTime = new Date();
    }

    await appointment.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('emergencyMonitoringEnded', {
        appointmentId: appointment._id,
        queueNumber: appointment.queueNumber,
        patientName: appointment.patientName,
        outcome,
        timestamp: new Date()
      });
    }

    console.log(`✅ Emergency monitoring ended for appointment ${appointmentId}`);

    res.json({
      msg: 'Emergency monitoring ended',
      outcome,
      summary: {
        totalVitals: appointment.emergencyMonitoring.vitalSignsHistory.length,
        totalNotes: appointment.emergencyMonitoring.monitoringNotes.length,
        totalInterventions: appointment.emergencyMonitoring.interventions.length,
        wasCritical: appointment.emergencyMonitoring.isCritical,
        duration: Math.round((new Date(appointment.emergencyMonitoring.endedAt) - new Date(appointment.emergencyMonitoring.startedAt)) / 60000)
      }
    });

  } catch (err) {
    console.error('End monitoring error:', err);
    res.status(500).json({ msg: 'Failed to end monitoring', error: err.message });
  }
});

// GET /api/emergency-monitoring/vitals/trends/:appointmentId
// Get vital signs trends for charting
router.get('/vitals/trends/:appointmentId', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (!appointment.emergencyMonitoring?.enabled) {
      return res.status(400).json({ msg: 'Monitoring not enabled for this patient' });
    }

    const vitals = appointment.emergencyMonitoring.vitalSignsHistory || [];

    // Format data for charting
    const trends = {
      time: vitals.map(v => {
        const date = new Date(v.recordedAt);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }),
      bloodPressure: vitals.map(v => v.bloodPressureSystolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : null),
      heartRate: vitals.map(v => v.heartRate),
      temperature: vitals.map(v => v.temperature),
      oxygenSaturation: vitals.map(v => v.oxygenSaturation),
      respiratoryRate: vitals.map(v => v.respiratoryRate),
      painLevel: vitals.map(v => v.painLevel),
      consciousness: vitals.map(v => v.consciousnessLevel)
    };

    res.json({
      trends,
      dataPoints: vitals.length,
      monitoringStarted: appointment.emergencyMonitoring.startedAt
    });

  } catch (err) {
    console.error('Get vitals trends error:', err);
    res.status(500).json({ msg: 'Failed to get vital trends', error: err.message });
  }
});

module.exports = router;

