/**
 * Integration Guide: OPDQueueManager with Express.js Routes
 * 
 * This file shows how to integrate the Smart OPD Queue Management System
 * into your existing appointment routes
 */

const express = require('express');
const router = express.Router();
const OPDQueueManager = require('../services/OPDQueueManager');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Initialize queue manager (In production, use singleton pattern)
const queueManager = new OPDQueueManager();

// In-memory store for active doctor breaks
const activeBreaks = new Map();

// Helper function to get active break for a doctor
const getActiveBreak = (doctorId) => {
  const breakInfo = activeBreaks.get(doctorId);
  if (!breakInfo) return null;

  const now = new Date();
  if (now > breakInfo.breakEndTime) {
    // Break has ended
    activeBreaks.delete(doctorId);
    return null;
  }

  // Calculate remaining time in minutes
  const remainingMs = breakInfo.breakEndTime - now;
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return {
    isOnBreak: true,
    breakDurationMinutes: breakInfo.breakDurationMinutes,
    breakStartTime: breakInfo.breakStartTime,
    breakEndTime: breakInfo.breakEndTime,
    remainingMinutes
  };
};

// Make helper available to other routes
router.getActiveBreak = getActiveBreak;

// =====================================================
// EVENT LISTENERS - Real-time notifications via Socket.IO
// =====================================================

queueManager.on('appointmentBooked', (appointment) => {
  console.log('📅 New appointment booked:', appointment.tokenNumber);
  // Emit to Socket.IO for real-time updates
  // io.to(`doctor_${appointment.doctorId}`).emit('newAppointment', appointment);
});

queueManager.on('emergencyInserted', (data) => {
  console.log('🚨 Emergency patient inserted:', data.appointment.tokenNumber);
  // Notify all affected patients
  data.affectedPatients.forEach(patient => {
    // io.to(`patient_${patient.tokenNumber}`).emit('queueUpdated', patient);
  });
});

queueManager.on('noShowHandled', (data) => {
  console.log('❌ No-show handled:', data.noShowAppointment.tokenNumber);
  // Notify patients who moved forward
  data.pulledForward.forEach(patient => {
    // io.to(`patient_${patient.tokenNumber}`).emit('queueUpdated', patient);
  });
});

queueManager.on('breakScheduled', (data) => {
  console.log('☕ Doctor break scheduled:', data.doctorId);
  // Notify all waiting patients
});

queueManager.on('queueAdjusted', (data) => {
  console.log('⏰ Queue adjusted for delay:', data.delayMinutes, 'minutes');
});

// =====================================================
// ROUTE 1: Book Smart Appointment (Feature 1)
// =====================================================

router.post('/book-smart', auth, async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, type } = req.body;
    const patient = await User.findById(req.user.id);

    if (!patient) {
      return res.status(404).json({ msg: 'Patient not found' });
    }

    const scheduledTime = new Date(`${appointmentDate}T${appointmentTime}`);

    // Check peak hour first (Feature 11)
    const peakCheck = queueManager.checkPeakHour(doctorId, scheduledTime);
    if (!peakCheck.canBook) {
      return res.status(429).json({
        msg: peakCheck.message,
        isPeak: true,
        suggestedSlots: peakCheck.suggestedSlots
      });
    }

    let result;

    // Route to appropriate booking method
    if (type === 'FOLLOW_UP') {
      // Feature 7: Follow-up booking
      result = await queueManager.addFollowUp(
        { name: patient.name, phone: patient.phone, id: patient._id },
        doctorId,
        scheduledTime
      );
    } else {
      // Feature 1: Regular smart booking
      result = await queueManager.bookAppointment(
        { name: patient.name, phone: patient.phone, id: patient._id },
        doctorId,
        scheduledTime
      );
    }

    // Also save to MongoDB for persistence
    const dbAppointment = new Appointment({
      patientId: patient._id,
      hospitalId: doctorId,
      appointmentDate,
      appointmentTime,
      queueNumber: result.serialNumber,
      tokenNumber: result.tokenNumber,
      status: 'PENDING',
      type: type || 'REGULAR'
    });

    await dbAppointment.save();

    // Check if there's an active emergency for this hospital/doctor
    const today = new Date().toISOString().split('T')[0];
    const activeEmergency = await Appointment.findOne({
      hospitalId: doctorId,
      appointmentDate: today,
      status: 'EMERGENCY',
      type: 'EMERGENCY'
    }).sort({ createdAt: -1 });

    const emergencyWarning = activeEmergency ? {
      isEmergencyActive: true,
      message: 'An emergency case is currently being handled. Your wait time will be significantly longer.',
      emergencyPatient: activeEmergency.patientName
    } : null;

    res.json({
      success: true,
      ...result,
      dbId: dbAppointment._id,
      emergencyWarning
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 2: Generate Walk-in Token (Feature 2)
// =====================================================

router.post('/walk-in-token', auth, async (req, res) => {
  try {
    const { patientName, doctorId, appointmentTime: requestedTime } = req.body;

    // Verify user is hospital staff
    const staff = await User.findById(req.user.id);
    if (staff.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospital staff can generate walk-in tokens' });
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
    const walkInTime = requestedTime || currentTime; // Use requested time or current time

    // Get ALL today's appointments for this hospital (sorted by queue number)
    const allAppointments = await Appointment.find({
      $or: [
        { hospitalId: doctorId },
        { hospitalName: staff.name }
      ],
      appointmentDate: today,
      queueNumber: { $exists: true },
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] }
    }).sort({ queueNumber: 1 });

    // Helper to convert HH:MM to minutes for comparison
    const timeToMinutes = (t) => {
      if (!t) return Infinity;
      const parts = t.split(':').map(Number);
      return parts[0] * 60 + (parts[1] || 0);
    };

    const walkInMinutes = timeToMinutes(walkInTime);

    // Find the correct position based on time
    // Walk-in should go after all appointments with time <= walkInTime
    // and before appointments with time > walkInTime
    // But never before currently serving (IN_PROGRESS) or already completed patients
    let insertAfterIndex = -1; // -1 means insert at beginning

    for (let i = 0; i < allAppointments.length; i++) {
      const appt = allAppointments[i];
      // Always keep IN_PROGRESS and already-passed appointments before this walk-in
      if (appt.status === 'IN_PROGRESS') {
        insertAfterIndex = i;
        continue;
      }
      const apptMinutes = timeToMinutes(appt.appointmentTime);
      if (apptMinutes <= walkInMinutes) {
        insertAfterIndex = i;
      }
    }

    // The new queue number is one after the insert position
    const insertPosition = insertAfterIndex + 1;

    // Find highest queue number for token generation
    const lastAppt = await Appointment.findOne({
      $or: [
        { hospitalId: doctorId },
        { hospitalName: staff.name }
      ],
      appointmentDate: today,
      queueNumber: { $exists: true }
    }).sort({ queueNumber: -1 });

    const totalAppointments = lastAppt ? lastAppt.queueNumber : 0;

    // If inserting at the end, use next sequential number
    // If inserting in the middle, shift subsequent appointments down
    let newQueueNumber;

    if (insertPosition >= allAppointments.length) {
      // Inserting at end - just use the next number
      newQueueNumber = totalAppointments + 1;
    } else {
      // Inserting in the middle - need to shift subsequent appointments
      newQueueNumber = allAppointments[insertPosition].queueNumber;

      // Shift all appointments from insertPosition onwards by +1
      const appointmentsToShift = allAppointments.slice(insertPosition);
      for (const appt of appointmentsToShift.reverse()) {
        appt.queueNumber += 1;
        appt.tokenNumber = `${today.replace(/-/g, '')}-${String(appt.queueNumber).padStart(3, '0')}`;
        await appt.save();
      }

      console.log(`📋 Shifted ${appointmentsToShift.length} appointments to accommodate time-based walk-in`);
    }

    const tokenNumber = `${today.replace(/-/g, '')}-${String(newQueueNumber).padStart(3, '0')}`;

    // Create appointment with the correct queue number based on time
    const dbAppointment = new Appointment({
      hospitalId: doctorId,
      hospitalName: staff.name,
      appointmentDate: today,
      appointmentTime: walkInTime,
      queueNumber: newQueueNumber,
      tokenNumber: tokenNumber,
      status: 'CHECKED_IN',
      type: 'WALK_IN',
      patientName: patientName
    });

    await dbAppointment.save();

    console.log(`✓ Walk-in assigned queue #${newQueueNumber} for ${patientName} at ${walkInTime} (position based on time)`);

    // Generate result using queue manager for QR code
    const result = queueManager.generateOfflineToken(patientName, doctorId);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated', {
        type: 'WALK_IN_ADDED',
        doctorId,
        queueNumber: newQueueNumber,
        patientName,
        appointmentTime: walkInTime,
        timestamp: new Date()
      });
      console.log('📡 Emitted walk-in queue update');
    }

    res.json({
      success: true,
      serialNumber: newQueueNumber,
      tokenNumber: tokenNumber,
      qrCode: result.qrCode,
      dbId: dbAppointment._id,
      appointmentTime: walkInTime,
      printableToken: {
        qrCode: result.qrCode,
        displayText: `Queue Number: ${newQueueNumber}\nToken: ${tokenNumber}\nPatient: ${patientName}\nTime: ${walkInTime}`
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 3: Get Live Queue Status (Feature 3 & 4)
// =====================================================

router.get('/queue-status/:tokenNumber', auth, async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    // Feature 3: Live queue tracking
    const status = queueManager.getLiveQueueStatus(parseInt(tokenNumber));

    // Feature 4: ETR calculation
    const etr = queueManager.calculateETR(parseInt(tokenNumber));

    if (!status.success) {
      return res.status(404).json({ msg: 'Token not found' });
    }

    res.json({
      success: true,
      queue: status,
      timing: etr
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 4: Mobile Queue Status (Feature 9)
// =====================================================

router.get('/mobile/queue-status/:tokenNumber', auth, async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    // Feature 9: Mobile-friendly JSON format
    const mobileStatus = queueManager.getMobileQueueStatus(parseInt(tokenNumber));

    // Fetch appointment to get hospital information
    try {
      const appointment = await Appointment.findOne({ tokenNumber: parseInt(tokenNumber) })
        .populate('hospitalId', 'name phone address');
      
      if (appointment && appointment.hospitalId) {
        mobileStatus.hospitalName = appointment.hospitalId.name || appointment.hospitalName;
        mobileStatus.hospitalPhone = appointment.hospitalId.phone;
        mobileStatus.appointmentId = appointment._id;
      }
    } catch (err) {
      console.warn('Failed to fetch hospital details:', err.message);
    }

    res.json(mobileStatus);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 5: Insert Emergency Patient (Feature 6)
// =====================================================

router.post('/emergency', auth, async (req, res) => {
  try {
    const { patientName, phone, doctorId } = req.body;

    // Verify hospital staff
    const staff = await User.findById(req.user.id);
    if (staff.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospital staff can insert emergency patients' });
    }

    // Feature 6: Emergency insertion
    const result = queueManager.insertEmergencyPatient(
      { name: patientName, phone: phone },
      doctorId
    );

    // Save to MongoDB
    const today = new Date().toISOString().split('T')[0];
    const dbAppointment = new Appointment({
      hospitalId: doctorId,
      appointmentDate: today,
      appointmentTime: new Date().toTimeString().split(' ')[0],
      queueNumber: result.serialNumber,
      tokenNumber: result.tokenNumber,
      status: 'EMERGENCY',
      type: 'EMERGENCY',
      patientName: patientName
    });

    await dbAppointment.save();

    // Recalculate wait times for all waiting patients
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const waitingAppointments = await Appointment.find({
      hospitalId: doctorId,
      appointmentDate: { $gte: todayStart, $lt: todayEnd },
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
      queueNumber: { $gte: result.serialNumber }
    });

    console.log(`🔍 Found ${waitingAppointments.length} waiting appointments affected by emergency`);

    // Emit socket event with updated wait times
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated', {
        type: 'EMERGENCY_INSERTED',
        doctorId,
        emergencyPatientName: patientName,
        emergencyQueueNumber: result.serialNumber,
        estimatedDuration: 20,
        affectedPatients: waitingAppointments.length,
        timestamp: new Date()
      });
      console.log(`📡 Emitted emergency insertion update - ${waitingAppointments.length} patients affected`);
    }

    res.json({
      success: true,
      ...result,
      dbId: dbAppointment._id,
      message: 'Emergency patient inserted',
      affectedPatients: waitingAppointments.length
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 6: Handle No-Show (Feature 8)
// =====================================================

router.put('/no-show/:tokenNumber', auth, async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    // Feature 8: No-show handling
    const result = queueManager.handleNoShow(parseInt(tokenNumber));

    if (!result.success) {
      return res.status(404).json({ msg: 'Token not found' });
    }

    // Update MongoDB
    const noShowAppt = await Appointment.findOneAndUpdate(
      { tokenNumber: parseInt(tokenNumber) },
      { status: 'NO_SHOW' },
      { new: true }
    );

    // Broadcast queue update globally so ALL clients update in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated', {
        type: 'NO_SHOW',
        doctorId: noShowAppt?.hospitalId,
        queueNumber: noShowAppt?.queueNumber,
        timestamp: new Date()
      });
      console.log('📡 Emitted no-show queue update');
    }

    res.json(result);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 7: Broadcast Delay (Feature 10)
// =====================================================

router.post('/broadcast-delay', auth, async (req, res) => {
  try {
    const { doctorId, delayReason, delayMinutes } = req.body;

    // Verify hospital staff
    const staff = await User.findById(req.user.id);
    if (staff.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospital staff can broadcast delays' });
    }

    // Feature 10: Delay notification broadcast
    const result = queueManager.broadcastDelay(doctorId, delayReason, delayMinutes);

    // Count affected patients
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const waitingAppointments = await Appointment.find({
      hospitalId: doctorId,
      appointmentDate: { $gte: todayStart, $lt: todayEnd },
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] }
    });

    console.log(`🔍 Found ${waitingAppointments.length} waiting appointments for delay broadcast`);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated', {
        type: 'DELAY_BROADCAST',
        doctorId,
        delayMinutes,
        delayReason,
        affectedPatients: waitingAppointments.length,
        timestamp: new Date()
      });
      console.log(`📡 Broadcasted delay of ${delayMinutes} mins to ${waitingAppointments.length} patients`);
    }

    res.json({
      ...result,
      notificationsSent: waitingAppointments.length
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 8: Check Peak Hour (Feature 11)
// =====================================================

router.get('/peak-hour/:doctorId/:dateTime', auth, async (req, res) => {
  try {
    const { doctorId, dateTime } = req.params;
    const timeSlot = new Date(dateTime);

    // Feature 11: Peak hour detection
    const peakCheck = queueManager.checkPeakHour(doctorId, timeSlot);

    res.json(peakCheck);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 9: Monitor Doctor Fatigue (Feature 12)
// =====================================================

router.get('/doctor-fatigue/:doctorId', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Feature 12: Fatigue monitoring
    const fatigueCheck = queueManager.monitorFatigue(doctorId);

    res.json(fatigueCheck);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE: Doctor Break Management with Duration
// =====================================================

router.post('/doctor-break', auth, async (req, res) => {
  try {
    const { doctorId, breakDurationMinutes } = req.body;

    // Verify hospital staff
    const staff = await User.findById(req.user.id);
    if (staff.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospital staff can schedule breaks' });
    }

    if (!breakDurationMinutes || breakDurationMinutes < 5 || breakDurationMinutes > 120) {
      return res.status(400).json({ msg: 'Break duration must be between 5 and 120 minutes' });
    }

    const breakStartTime = new Date();
    const breakEndTime = new Date(breakStartTime.getTime() + breakDurationMinutes * 60000);

    // Store break information
    activeBreaks.set(doctorId, {
      breakDurationMinutes,
      breakStartTime,
      breakEndTime
    });

    // Count affected patients
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const waitingAppointments = await Appointment.find({
      hospitalId: doctorId,
      appointmentDate: { $gte: todayStart, $lt: todayEnd },
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] }
    });

    console.log(`🔍 Found ${waitingAppointments.length} waiting appointments for hospital ${doctorId} on ${today}`);

    // Emit socket event with break information
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated', {
        type: 'DOCTOR_BREAK',
        doctorId,
        breakDurationMinutes,
        breakStartTime,
        breakEndTime,
        affectedPatients: waitingAppointments.length,
        timestamp: new Date()
      });
      console.log(`📡 Doctor break scheduled: ${breakDurationMinutes} mins, affecting ${waitingAppointments.length} patients`);
    }

    res.json({
      success: true,
      message: `Break scheduled for ${breakDurationMinutes} minutes`,
      breakDurationMinutes,
      breakStartTime,
      breakEndTime,
      affectedPatients: waitingAppointments.length
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 10: Balance Doctor Load (Feature 13)
// =====================================================

router.post('/balance-load', auth, async (req, res) => {
  try {
    const { departmentId, doctorIds } = req.body;

    // Feature 13: Auto patient redistribution
    const balanceResult = queueManager.balanceDoctorLoad(departmentId, doctorIds);

    res.json(balanceResult);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 11: Geo-Fenced Call Alert (Feature 14)
// =====================================================

router.post('/call-alert', auth, async (req, res) => {
  try {
    const { patientLocation, appointmentId } = req.body;

    // Get appointment details
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    // Get hospital location (assume stored in hospital profile)
    const hospital = await User.findById(appointment.hospitalId);
    const hospitalLocation = {
      latitude: hospital.location?.latitude || 17.400,
      longitude: hospital.location?.longitude || 78.500
    };

    const appointmentTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);

    // Feature 14: Geo-fenced call alert
    const callAlert = queueManager.shouldTriggerCall(
      patientLocation,
      hospitalLocation,
      appointmentTime
    );

    // If should trigger, send SMS/call
    if (callAlert.shouldTrigger) {
      // Integrate with Twilio/SMS service
      console.log(`📞 CALL PATIENT: ${callAlert.message}`);
    }

    res.json(callAlert);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 12: Get Doctor Statistics
// =====================================================

router.get('/stats/:doctorId', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const stats = queueManager.getStatistics(doctorId);

    res.json({
      success: true,
      doctorId,
      stats
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 13: Start Consultation
// =====================================================

router.put('/start-consultation/:tokenNumber', auth, async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    queueManager.startConsultation(parseInt(tokenNumber));

    // Update MongoDB
    await Appointment.updateOne(
      { tokenNumber: parseInt(tokenNumber) },
      {
        status: 'IN_PROGRESS',
        consultationStartTime: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Consultation started',
      tokenNumber
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================================
// ROUTE 14: End Consultation
// =====================================================

router.put('/end-consultation/:tokenNumber', auth, async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    queueManager.endConsultation(parseInt(tokenNumber));

    // Update MongoDB
    await Appointment.updateOne(
      { tokenNumber: parseInt(tokenNumber) },
      {
        status: 'COMPLETED',
        consultationEndTime: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Consultation completed',
      tokenNumber
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

/**
 * INTEGRATION STEPS:
 * 
 * 1. Add to server.js:
 *    const smartQueueRoutes = require('./routes/smartQueue');
 *    app.use('/api/smart-queue', smartQueueRoutes);
 * 
 * 2. Update package.json dependencies:
 *    npm install --save (all existing dependencies are compatible)
 * 
 * 3. Frontend Integration Examples:
 * 
 *    // Book smart appointment
 *    const bookAppointment = async () => {
 *      const res = await axios.post('/api/smart-queue/book-smart', {
 *        doctorId: 'DR001',
 *        appointmentDate: '2026-02-08',
 *        appointmentTime: '10:00:00',
 *        type: 'REGULAR'
 *      });
 *      console.log('Queue Number:', res.data.serialNumber);
 *    };
 * 
 *    // Check queue status
 *    const checkStatus = async (tokenNumber) => {
 *      const res = await axios.get(`/api/smart-queue/queue-status/${tokenNumber}`);
 *      console.log('Patients ahead:', res.data.queue.patientsAhead);
 *      console.log('Wait time:', res.data.timing.estimatedTime);
 *    };
 * 
 *    // Mobile app - get status
 *    const getMobileStatus = async (tokenNumber) => {
 *      const res = await axios.get(`/api/smart-queue/mobile/queue-status/${tokenNumber}`);
 *      return res.data.data; // React Native friendly structure
 *    };
 * 
 * 4. Socket.IO Real-time Updates:
 *    
 *    // In server.js, pass io instance to queueManager
 *    const io = require('socket.io')(server);
 *    app.set('io', io);
 *    
 *    // Frontend React component
 *    useEffect(() => {
 *      socket.on('queueUpdated', (data) => {
 *        setQueueStatus(data);
 *      });
 *    }, []);
 */
