const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const BillingService = require('../services/BillingService');
const { notifyQueueAssigned, notifyQueueCalledIn, notifyQueueApproaching, notifyAppointmentUpdate } = require('../services/pushNotificationService');

// GET /api/appointments -> Generic endpoint for both patients and hospitals
router.get('/', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller) return res.status(401).json({ msg: 'User not found' });

    let appts;
    if (caller.role === 'HOSPITAL') {
      // Hospitals see their pending appointments
      appts = await Appointment.find({
        hospitalId: caller._id,
        status: 'PENDING'
      }).sort({ createdAt: -1 });
    } else {
      // Patients see all their appointments
      appts = await Appointment.find({ patientId: caller._id }).sort({ createdAt: -1 });
    }

    res.json(appts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/appointments -> Patient books appointment (status = PENDING)
router.post('/', auth, async (req, res) => {
  try {
    const {
      hospitalName, hospitalId: reqHospitalId, doctor, doctorId: reqDoctorId, doctorEmail,
      appointmentDate, appointmentTime, reason, patientName, familyMemberId
    } = req.body;

    // ensure caller is a patient
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller) return res.status(401).json({ msg: 'User not found' });
    if (caller.role !== 'PATIENT') return res.status(403).json({ msg: 'Only patients can book appointments' });

    // Find hospital user
    let hospitalId = reqHospitalId;
    if (!hospitalId && hospitalName) {
      const hospitalUser = await User.findOne({
        name: { $regex: new RegExp(`^${hospitalName}$`, 'i') },
        role: 'HOSPITAL'
      });
      if (hospitalUser) hospitalId = hospitalUser._id;
    }

    // Resolve doctorId if email is provided
    let finalDoctorId = reqDoctorId;
    if (!finalDoctorId && doctorEmail) {
      const docUser = await User.findOne({ email: doctorEmail, role: 'DOCTOR' });
      if (docUser) finalDoctorId = docUser._id;
    }

    // Fallback: Resolve doctorId by name and hospitalId if still missing
    if (!finalDoctorId && doctor && hospitalId) {
      const docUser = await User.findOne({
        name: { $regex: new RegExp(`^${doctor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        role: 'DOCTOR',
        hospitalId: hospitalId
      });
      if (docUser) finalDoctorId = docUser._id;
    }

    const appt = new Appointment({
      patientId: caller._id,
      hospitalId: hospitalId,
      doctorId: finalDoctorId,
      hospitalName: hospitalName || '',
      patientName: patientName || caller.name,
      doctor: doctor || '',
      appointmentDate,
      appointmentTime,
      reason,
      status: 'PENDING'
    });

    await appt.save();

    // Check if there's an active emergency at this hospital RIGHT NOW
    let emergencyWarning = null;
    if (hospitalId) {
      // Find emergency appointments created in the last 90 minutes (emergency impact window)
      const now = new Date();
      const emergencyWindowStart = new Date(now.getTime() - 90 * 60 * 1000); // 90 minutes ago

      const activeEmergency = await Appointment.findOne({
        hospitalId: hospitalId,
        appointmentDate,
        status: 'EMERGENCY',
        type: 'EMERGENCY',
        createdAt: { $gte: emergencyWindowStart } // Only emergencies from last 90 mins
      }).sort({ createdAt: -1 });

      if (activeEmergency) {
        // Emergency exists and was created recently
        // Now check if user's booking time falls within the emergency impact period
        try {
          if (appointmentTime) {
            const emergencyTime = new Date(activeEmergency.createdAt);
            const emergencyEndTime = new Date(emergencyTime.getTime() + 90 * 60 * 1000); // Emergency affects next 90 mins
            const bookingDateTime = new Date(`${appointmentDate}T${appointmentTime}`);

            // Only show warning if booking time is within emergency impact window
            // i.e., booking is between emergency start and emergency end (start + 90 mins)
            if (bookingDateTime >= emergencyTime && bookingDateTime <= emergencyEndTime) {
              emergencyWarning = {
                isEmergencyActive: true,
                message: 'An emergency case is currently being handled at this hospital. Your wait time may be significantly longer.'
              };
            }
          }
        } catch (e) {
          console.error('Emergency time comparison error:', e);
        }
      }
    }

    // Create notification for hospital user if found
    try {
      if (hospitalUser) {
        const displayName = patientName || caller.name;
        const msg = `New appointment request from ${displayName} for ${hospitalName} on ${appointmentDate} at ${appointmentTime}`;
        await Notification.create({ userId: hospitalUser._id, message: msg, type: 'APPOINTMENT' });
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${hospitalUser._id}`).emit('notification', { message: msg, apptId: appt._id });
          io.to(`hospital_${hospitalUser._id}`).emit('queueUpdated');
        }
      }
    } catch (e) {
      console.warn('Notification creation failed', e.message);
    }

    res.json({ ...appt.toObject(), emergencyWarning });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/appointments/patient -> Patient views appointments
router.get('/patient', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'PATIENT') return res.status(403).json({ msg: 'Access denied' });

    const appts = await Appointment.find({ patientId: caller._id })
      .sort({ createdAt: -1 })
      .populate('hospitalId', 'name phone address');

    // Enhance appointments with hospital phone if available
    const enhancedAppts = appts.map(appt => {
      const apptObj = appt.toObject();
      if (appt.hospitalId && appt.hospitalId.phone) {
        apptObj.hospitalPhone = appt.hospitalId.phone;
      }
      return apptObj;
    });

    res.json(enhancedAppts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/appointments/hospital -> Hospital views all appointments (exclude rejected)
router.get('/hospital', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Access denied' });

    // Find appointments by both hospitalId and hospital name
    const appts = await Appointment.find({
      $or: [
        { hospitalId: caller._id },
        { hospitalName: caller.name }
      ],
      status: { $in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CHECKED_IN', 'IN_PROGRESS'] }
    }).sort({ createdAt: -1 }).populate('patientId', 'name email');

    console.log(`Hospital ${caller.name} has ${appts.length} appointments`);

    res.json(appts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/appointments/doctor -> Doctor views their specific appointments
router.get('/doctor', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'DOCTOR') return res.status(403).json({ msg: 'Access denied' });

    const cleanName = caller.name.replace(/^(dr|doctor)\.?\s+/i, '').trim();
    const appts = await Appointment.find({
      $or: [
        { doctorId: caller._id },
        {
          hospitalId: caller.hospitalId,
          doctor: { $regex: new RegExp(`^((dr|doctor)\\.?\\s+)?${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        },
        {
          hospitalId: caller.hospitalId,
          doctor: { $regex: new RegExp(`^${caller.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }
      ]
    }).sort({ createdAt: -1 }).populate('patientId', 'name email phone location');

    res.json(appts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/appointments/:id/approve -> Hospital approves
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) return res.status(403).json({ msg: 'Access denied' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    const isHospitalMatch = appt.hospitalId?.toString() === (caller.role === 'DOCTOR' ? caller.hospitalId?.toString() : caller._id.toString());
    const isDoctorMatch = appt.doctorId?.toString() === caller._id.toString();
    if (!isHospitalMatch && !isDoctorMatch) return res.status(403).json({ msg: 'Not authorized' });

    // Assign queue number if not already assigned
    if (!appt.queueNumber) {
      // Get the highest queue number for this hospital on this date
      const lastAppt = await Appointment.findOne({
        hospitalId: appt.hospitalId,
        appointmentDate: appt.appointmentDate,
        queueNumber: { $exists: true }
      }).sort({ queueNumber: -1 });

      appt.queueNumber = lastAppt ? lastAppt.queueNumber + 1 : 1;
      appt.tokenNumber = `${appt.appointmentDate.replace(/-/g, '')}-${String(appt.queueNumber).padStart(3, '0')}`;
    }

    appt.status = 'CONFIRMED';
    appt.approvalMessage = message || '';

    // Auto check-in if appointment is for today
    const today = new Date().toISOString().split('T')[0];
    if (appt.appointmentDate === today) {
      appt.status = 'CHECKED_IN';
    }

    await appt.save();

    // Queue number already assigned - no need to re-sort

    // notify patient (socket + push)
    const msg = `Your appointment on ${appt.appointmentDate} at ${appt.appointmentTime} has been CONFIRMED. Your queue number is #${appt.queueNumber}. ${message || ''}`;
    await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${appt.patientId}`).emit('notification', { message: msg, apptId: appt._id, status: 'CONFIRMED', queueNumber: appt.queueNumber });
      io.to(`hospital_${appt.hospitalId}`).emit('queueUpdated');
    }

    // Push notification (works even when app is closed)
    notifyQueueAssigned(appt.patientId, {
      queueNumber: appt.queueNumber,
      hospitalName: appt.hospitalName || caller.name,
      appointmentTime: appt.appointmentTime
    }).catch(err => console.warn('Push notify failed:', err.message));

    res.json({ success: true, appt });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/appointments/:id/reject -> Hospital rejects
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) return res.status(403).json({ msg: 'Access denied' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    const isHospitalMatch = appt.hospitalId?.toString() === (caller.role === 'DOCTOR' ? caller.hospitalId?.toString() : caller._id.toString());
    const isDoctorMatch = appt.doctorId?.toString() === caller._id.toString();
    if (!isHospitalMatch && !isDoctorMatch) return res.status(403).json({ msg: 'Not authorized' });

    appt.status = 'REJECTED';
    appt.rejectionReason = reason || '';
    await appt.save();

    // notify patient (socket + push)
    const msg = `Your appointment on ${appt.appointmentDate} at ${appt.appointmentTime} was REJECTED. ${reason || ''}`;
    await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${appt.patientId}`).emit('notification', { message: msg, apptId: appt._id, status: 'REJECTED' });
      io.to(`hospital_${appt.hospitalId}`).emit('queueUpdated');
    }

    // Push notification
    notifyAppointmentUpdate(appt.patientId, {
      status: 'CANCELLED',
      hospitalName: appt.hospitalName || caller.name
    }).catch(err => console.warn('Push notify failed:', err.message));

    res.json({ success: true, appt });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/appointments/:id/complete -> Hospital marks visit as completed
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) return res.status(403).json({ msg: 'Access denied' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    const isHospitalMatch = appt.hospitalId?.toString() === (caller.role === 'DOCTOR' ? caller.hospitalId?.toString() : caller._id.toString());
    const isDoctorMatch = appt.doctorId?.toString() === caller._id.toString();
    if (!isHospitalMatch && !isDoctorMatch) return res.status(403).json({ msg: 'Not authorized' });

    const io = req.app.get('io');
    appt.status = 'COMPLETED';
    await appt.save();

    // Auto-generate OPD bill for completed appointment
    try {
      const autoBill = await BillingService.autoGenerateBillFromAppointment({
        appointmentId: appt._id,
        hospitalId: appt.hospitalId,
        createdBy: caller._id,
        consultationFee: req.body.consultationFee || 500,
        req
      });
      if (io) {
        io.to(`user_${appt.patientId}`).emit('bill_created', {
          billId: autoBill._id,
          billNumber: autoBill.billNumber,
          grandTotal: autoBill.grandTotal,
          hospitalName: caller.name,
          autoGenerated: true
        });
      }
    } catch (billErr) {
      console.error('Auto bill generation skipped:', billErr.message);
    }

    // notify patient
    const msg = `Your visit to ${appt.hospitalName} on ${appt.appointmentDate} has been marked as COMPLETED. Thank you!`;
    await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
    if (io) {
      io.to(`user_${appt.patientId}`).emit('notification', { message: msg, apptId: appt._id, status: 'COMPLETED' });
      io.to(`hospital_${appt.hospitalId}`).emit('queueUpdated');
    }

    res.json({ success: true, appt });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/appointments/:id/cancel -> Patient cancels their appointment
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller) return res.status(401).json({ msg: 'User not found' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    // Only the patient who booked can cancel
    if (appt.patientId && appt.patientId.toString() !== caller._id.toString()) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Cannot cancel already completed, cancelled, or rejected appointments
    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(appt.status)) {
      return res.status(400).json({ msg: `Cannot cancel a ${appt.status.toLowerCase()} appointment` });
    }

    const previousStatus = appt.status;
    appt.status = 'CANCELLED';
    appt.cancelledAt = new Date();
    await appt.save();

    const displayName = appt.patientName || caller.name;
    const io = req.app.get('io');

    // Notify the hospital
    if (appt.hospitalId) {
      const hospitalMsg = `${displayName} has cancelled their appointment on ${appt.appointmentDate} at ${appt.appointmentTime}${appt.queueNumber ? ` (Queue #${appt.queueNumber})` : ''}.`;
      await Notification.create({ userId: appt.hospitalId, message: hospitalMsg, type: 'APPOINTMENT' });
      if (io) {
        io.to(`user_${appt.hospitalId}`).emit('notification', { message: hospitalMsg, apptId: appt._id, status: 'CANCELLED' });
        io.to(`hospital_${appt.hospitalId}`).emit('queueUpdated', { type: 'APPOINTMENT_CANCELLED', apptId: appt._id, hospitalId: appt.hospitalId });
      }
    }

    // Confirm to the patient
    const patientMsg = `Your appointment at ${appt.hospitalName} on ${appt.appointmentDate} has been cancelled.`;
    await Notification.create({ userId: appt.patientId, message: patientMsg, type: 'APPOINTMENT' });
    if (io) {
      io.to(`user_${appt.patientId}`).emit('notification', { message: patientMsg, apptId: appt._id, status: 'CANCELLED' });
    }

    res.json({ success: true, appt });
  } catch (err) {
    console.error('Cancel appointment error:', err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/appointments/:id -> Hospital deletes a completed appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) return res.status(403).json({ msg: 'Only medical staff can delete appointments' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    const isHospitalMatch = appt.hospitalId?.toString() === (caller.role === 'DOCTOR' ? caller.hospitalId?.toString() : caller._id.toString());
    const isDoctorMatch = appt.doctorId?.toString() === caller._id.toString();
    if (!isHospitalMatch && !isDoctorMatch) return res.status(403).json({ msg: 'Not authorized' });

    // Only allow deleting completed appointments
    if (appt.status !== 'COMPLETED') {
      return res.status(400).json({ msg: 'Only completed appointments can be deleted' });
    }

    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ success: true, msg: 'Appointment deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/appointments/queue-status/:hospitalId/:date -> Get queue status for hospital dashboard
router.get('/queue-status/:hospitalId/:date', auth, async (req, res) => {
  try {
    const { hospitalId, date } = req.params;

    // Verify access
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    // Resolve which hospital we're looking at
    const targetHospitalId = (caller.role === 'DOCTOR') ? caller.hospitalId : caller._id;
    if (!targetHospitalId) return res.status(400).json({ msg: 'No hospital association found' });

    console.log('Queue status request:', { hospitalId, date, callerName: caller.name, callerId: caller._id });

    // Build query - if hospitalId is null or invalid, search only by hospital name
    let query = {
      appointmentDate: date,
      status: { $in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CHECKED_IN'] }
    };

    // Add hospital filter
    query.$or = [
      { hospitalId: targetHospitalId },
      { hospitalName: caller.name }
    ];

    console.log('Query:', JSON.stringify(query));

    // Get appointments for the specified date
    const appointments = await Appointment.find(query)
      .sort({ queueNumber: 1 })
      .populate('patientId', 'name phone');

    console.log(`Found ${appointments.length} appointments for ${caller.name} on ${date}`);

    // Auto-assign queue numbers and check-in appointments for today
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      // Check if this is the first time opening the queue (no queue numbers assigned yet)
      const hasExistingQueueNumbers = appointments.some(appt => appt.queueNumber);

      // Find appointments that need queue numbers
      const needsQueueNumber = appointments.filter(appt =>
        !appt.queueNumber && (appt.status === 'PENDING' || appt.status === 'CONFIRMED' || appt.status === 'CHECKED_IN')
      );

      if (needsQueueNumber.length > 0) {
        if (!hasExistingQueueNumbers) {
          // First time opening queue - sort ALL appointments by time
          console.log('🎯 First queue open - sorting all appointments by time');

          // Sort by appointment time
          needsQueueNumber.sort((a, b) => {
            if (a.appointmentTime && b.appointmentTime) {
              const timeA = a.appointmentTime.split(':').map(Number);
              const timeB = b.appointmentTime.split(':').map(Number);
              const minutesA = timeA[0] * 60 + timeA[1];
              const minutesB = timeB[0] * 60 + timeB[1];
              if (minutesA !== minutesB) return minutesA - minutesB;
            }
            if (a.appointmentTime && !b.appointmentTime) return -1;
            if (!a.appointmentTime && b.appointmentTime) return 1;
            return new Date(a.createdAt) - new Date(b.createdAt);
          });

          // Assign queue numbers 1, 2, 3... based on time order
          let queueNum = 1;
          for (let appt of needsQueueNumber) {
            appt.queueNumber = queueNum++;
            appt.tokenNumber = `${date.replace(/-/g, '')}-${String(appt.queueNumber).padStart(3, '0')}`;
            appt.status = 'CHECKED_IN';

            if (!appt.hospitalId && appt.hospitalName === caller.name) {
              appt.hospitalId = caller._id;
            }

            await appt.save();
            console.log(`✓ Queue #${appt.queueNumber} → ${appt.patientId?.name || appt.patientName || 'patient'} (${appt.appointmentTime})`);

            // Notify patient
            if (appt.patientId) {
              try {
                const msg = `🎫 You've been added to the queue! Your queue number is #${appt.queueNumber}.`;
                await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
                const io = req.app.get('io');
                if (io) {
                  io.to(`user_${appt.patientId}`).emit('notification', {
                    message: msg,
                    apptId: appt._id,
                    status: 'CHECKED_IN',
                    queueNumber: appt.queueNumber
                  });
                }
              } catch (err) {
                console.error('Failed to send queue notification:', err);
              }
            }
          }
        } else {
          // Queue already active - assign next sequential numbers (PERMANENT)
          console.log('📝 Queue already active - assigning permanent sequential numbers');

          // Find the highest queue number across ALL appointments
          const maxQueueNumber = appointments.reduce((max, appt) =>
            Math.max(max, appt.queueNumber || 0), 0
          );

          let nextQueueNumber = maxQueueNumber + 1;

          for (let appt of needsQueueNumber) {
            appt.queueNumber = nextQueueNumber++;
            appt.tokenNumber = `${date.replace(/-/g, '')}-${String(appt.queueNumber).padStart(3, '0')}`;
            appt.status = 'CHECKED_IN';

            if (!appt.hospitalId && appt.hospitalName === caller.name) {
              appt.hospitalId = caller._id;
            }

            await appt.save();
            console.log(`✓ Queue #${appt.queueNumber} → ${appt.patientId?.name || appt.patientName || 'patient'} (late booking at ${appt.appointmentTime})`);

            // Notify patient
            if (appt.patientId) {
              try {
                const msg = `🎫 You've been added to the queue! Your queue number is #${appt.queueNumber}.`;
                await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
                const io = req.app.get('io');
                if (io) {
                  io.to(`user_${appt.patientId}`).emit('notification', {
                    message: msg,
                    apptId: appt._id,
                    status: 'CHECKED_IN',
                    queueNumber: appt.queueNumber
                  });
                }
              } catch (err) {
                console.error('Failed to send queue notification:', err);
              }
            }
          }
        }
      }

      // Notify hospital of queue changes
      const io = req.app.get('io');
      if (io) io.to(`hospital_${targetHospitalId}`).emit('queueUpdated');

      // Reload appointments after updates
      const updatedAppointments = await Appointment.find(query)
        .sort({ queueNumber: 1 })
        .populate('patientId', 'name phone');

      appointments.length = 0;
      appointments.push(...updatedAppointments);
    }

    // Calculate statistics
    const totalInQueue = appointments.filter(a =>
      ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(a.status)
    ).length;

    const completedToday = appointments.filter(a => a.status === 'COMPLETED').length;

    const inProgressAppt = appointments.find(a => a.status === 'IN_PROGRESS');
    const currentlyServing = inProgressAppt ? inProgressAppt.queueNumber : null;

    // Calculate average consultation time from completed appointments
    let avgConsultationTime = null;
    const completedWithTimes = appointments.filter(a =>
      a.status === 'COMPLETED' && a.consultationStartTime && a.consultationEndTime
    );

    if (completedWithTimes.length > 0) {
      const totalMinutes = completedWithTimes.reduce((sum, appt) => {
        const start = new Date(appt.consultationStartTime);
        const end = new Date(appt.consultationEndTime);
        const minutes = (end - start) / (1000 * 60);
        return sum + minutes;
      }, 0);
      avgConsultationTime = Math.round(totalMinutes / completedWithTimes.length);
    }

    // Format appointments for display
    const formattedAppointments = appointments
      .filter(a => a.status !== 'COMPLETED')
      .map(appt => ({
        _id: appt._id,
        patientName: appt.patientName || appt.patientId?.name || 'Unknown',
        phone: appt.patientId?.phone || appt.phone || '',
        queueNumber: appt.queueNumber || 0,
        status: appt.status,
        appointmentTime: appt.appointmentTime,
        doctor: appt.doctor || 'Unassigned',
        type: appt.type || 'REGULAR',
        tokenNumber: appt.tokenNumber
      }));

    // For future dates (or any date where queue numbers haven't been assigned yet),
    // sort by appointment time and assign provisional display positions
    const selectedIsToday = (date === new Date().toISOString().split('T')[0]);
    if (!selectedIsToday || formattedAppointments.some(a => a.queueNumber === 0)) {
      // Sort by appointment time
      formattedAppointments.sort((a, b) => {
        if (a.appointmentTime && b.appointmentTime) {
          const timeA = a.appointmentTime.split(':').map(Number);
          const timeB = b.appointmentTime.split(':').map(Number);
          const minutesA = (timeA[0] || 0) * 60 + (timeA[1] || 0);
          const minutesB = (timeB[0] || 0) * 60 + (timeB[1] || 0);
          if (minutesA !== minutesB) return minutesA - minutesB;
        }
        if (a.appointmentTime && !b.appointmentTime) return -1;
        if (!a.appointmentTime && b.appointmentTime) return 1;
        return 0;
      });

      // Assign provisional queue positions for appointments that don't have one yet
      let position = 1;
      // First find the max existing queue number
      const maxExisting = formattedAppointments.reduce((max, a) => Math.max(max, a.queueNumber || 0), 0);

      for (let appt of formattedAppointments) {
        if (appt.queueNumber === 0) {
          // For future dates, assign provisional positions based on time order
          appt.queueNumber = maxExisting > 0 ? ++position : position++;
        }
      }
    }

    res.json({
      success: true,
      currentlyServing,
      totalInQueue,
      completedToday,
      avgConsultationTime,
      appointments: formattedAppointments,
      date
    });
  } catch (err) {
    console.error('Queue status error:', err.message);
    res.status(500).json({ msg: 'Failed to load queue data', error: err.message });
  }
});

// PUT /api/appointments/:id/start-consultation -> Start consultation
router.put('/:id/start-consultation', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    const isHospitalMatch = appt.hospitalId?.toString() === (caller.role === 'DOCTOR' ? caller.hospitalId?.toString() : caller._id.toString());
    const isDoctorMatch = appt.doctorId?.toString() === caller._id.toString();
    if (!isHospitalMatch && !isDoctorMatch) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    appt.status = 'IN_PROGRESS';
    appt.consultationStartTime = new Date();
    await appt.save();

    // Broadcast queue update globally so ALL clients (including QueueDashboard) update in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${appt.hospitalId}`).emit('queueUpdated', {
        type: 'CONSULTATION_STARTED',
        doctorId: appt.hospitalId,
        queueNumber: appt.queueNumber,
        timestamp: new Date()
      });

      if (appt.patientId) {
        // Also notify the specific patient
        io.to(`user_${appt.patientId}`).emit('queueUpdated', {
          message: 'Your consultation has started',
          apptId: appt._id,
          status: 'IN_PROGRESS'
        });
      }
    }

    // Push notification: "It's your turn!"
    if (appt.patientId) {
      notifyQueueCalledIn(appt.patientId, {
        queueNumber: appt.queueNumber,
        hospitalName: appt.hospitalName || caller.name
      }).catch(err => console.warn('Push notify failed:', err.message));

      // Also notify the NEXT patient (2 patients ahead) via push
      const nextAppt = await Appointment.findOne({
        hospitalId: appt.hospitalId,
        appointmentDate: appt.appointmentDate,
        queueNumber: appt.queueNumber + 1,
        status: { $in: ['CHECKED_IN', 'CONFIRMED'] }
      });
      if (nextAppt?.patientId) {
        notifyQueueApproaching(nextAppt.patientId, {
          queueNumber: nextAppt.queueNumber,
          hospitalName: appt.hospitalName || caller.name,
          patientsAhead: 1
        }).catch(err => console.warn('Push notify next failed:', err.message));
      }
    }

    res.json({ success: true, appt });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// PUT /api/appointments/:id/end-consultation -> End consultation
router.put('/:id/end-consultation', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    const isHospitalMatch = appt.hospitalId?.toString() === (caller.role === 'DOCTOR' ? caller.hospitalId?.toString() : caller._id.toString());
    const isDoctorMatch = appt.doctorId?.toString() === caller._id.toString();
    if (!isHospitalMatch && !isDoctorMatch) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    appt.status = 'COMPLETED';
    appt.consultationEndTime = new Date();
    await appt.save();

    // Notify patient
    if (appt.patientId) {
      const msg = `Your consultation at ${appt.hospitalName || 'the hospital'} has been completed. Thank you!`;
      await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
    }

    // Broadcast queue update globally so ALL clients update in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${appt.hospitalId}`).emit('queueUpdated', {
        type: 'CONSULTATION_ENDED',
        doctorId: appt.hospitalId,
        apptId: appt._id.toString(),
        patientId: appt.patientId ? appt.patientId.toString() : null,
        queueNumber: appt.queueNumber,
        timestamp: new Date()
      });

      if (appt.patientId) {
        const msg = `Your consultation at ${appt.hospitalName || 'the hospital'} has been completed. Thank you!`;
        io.to(`user_${appt.patientId}`).emit('notification', { message: msg, apptId: appt._id, status: 'COMPLETED' });
      }
    }

    res.json({ success: true, appt });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// POST /api/appointments/:id/send-reminder -> Send location-based reminder
router.post('/:id/send-reminder', auth, async (req, res) => {
  try {
    const { patientLocation } = req.body; // { latitude, longitude }
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const appt = await Appointment.findById(req.params.id).populate('patientId', 'name phone');
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    const isHospitalMatch = appt.hospitalId?.toString() === (caller.role === 'DOCTOR' ? caller.hospitalId?.toString() : caller._id.toString());
    const isDoctorMatch = appt.doctorId?.toString() === caller._id.toString();
    if (!isHospitalMatch && !isDoctorMatch) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // If appointment doesn't have a queue number yet, calculate position from time
    let displayQueueNumber = appt.queueNumber;
    if (!displayQueueNumber) {
      // Count how many appointments for this doctor on this date have an earlier time
      const earlierCount = await Appointment.countDocuments({
        $or: [
          { hospitalId: appt.hospitalId },
          { hospitalName: caller.name }
        ],
        appointmentDate: appt.appointmentDate,
        appointmentTime: { $lt: appt.appointmentTime },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] }
      });
      displayQueueNumber = earlierCount + 1;
    }

    // Get hospital location from caller profile
    const hospitalLocation = caller.location;
    if (!hospitalLocation || !hospitalLocation.latitude || !hospitalLocation.longitude) {
      return res.status(400).json({ msg: 'Hospital location not configured' });
    }

    let travelTime = 15; // Default 15 mins
    let distance = 'nearby';

    // Calculate travel time based on location if provided
    if (patientLocation && patientLocation.latitude && patientLocation.longitude) {
      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (patientLocation.latitude - hospitalLocation.latitude) * Math.PI / 180;
      const dLon = (patientLocation.longitude - hospitalLocation.longitude) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(hospitalLocation.latitude * Math.PI / 180) * Math.cos(patientLocation.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      distance = distanceKm.toFixed(1) + ' km';

      // Estimate travel time (assuming 30 km/h average speed in rural areas + 5 min traffic buffer)
      travelTime = Math.ceil((distanceKm / 30) * 60) + 5;
    }

    // Check queue position to estimate when their turn will come (only count waiting patients)
    let queuePosition;
    if (appt.queueNumber) {
      queuePosition = await Appointment.countDocuments({
        $or: [
          { hospitalId: appt.hospitalId },
          { hospitalName: caller.name }
        ],
        appointmentDate: appt.appointmentDate,
        queueNumber: { $lt: appt.queueNumber },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
      });
    } else {
      // For appointments without queue numbers, count by appointment time
      queuePosition = await Appointment.countDocuments({
        $or: [
          { hospitalId: appt.hospitalId },
          { hospitalName: caller.name }
        ],
        appointmentDate: appt.appointmentDate,
        appointmentTime: { $lt: appt.appointmentTime },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
      });
    }

    // Estimate wait time (assume 15 min per patient)
    const estimatedWaitTime = queuePosition * 15;

    console.log(`Queue position for #${displayQueueNumber}: ${queuePosition} patients ahead, ~${estimatedWaitTime} mins wait`);

    // Send reminder notification
    const msg = `🔔 Your turn is approaching! Queue #${displayQueueNumber}\n📍 Distance: ${distance}\n⏱️ Est. travel time: ${travelTime} mins\n⏳ ${queuePosition} patients ahead\n\nPlease start heading to the hospital.`;

    await Notification.create({
      userId: appt.patientId._id,
      message: msg,
      type: 'REMINDER'
    });

    const io = req.app.get('io');
    const patientUserId = appt.patientId._id || appt.patientId;
    const roomName = `user_${patientUserId}`;

    console.log('📢 Emitting reminder to room:', roomName);
    console.log('📢 Patient ID:', patientUserId.toString());
    console.log('📢 Reminder message:', msg);

    if (io) {
      // Check if there are any sockets in the room
      const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
      console.log('👥 Sockets in room:', socketsInRoom ? socketsInRoom.size : 0);
      if (socketsInRoom) {
        console.log('🔌 Socket IDs in room:', Array.from(socketsInRoom));
      }

      io.to(roomName).emit('reminder', {
        message: msg,
        apptId: appt._id,
        hospitalId: appt.hospitalId ? appt.hospitalId.toString() : null,
        hospitalName: appt.hospitalName || '',
        queueNumber: displayQueueNumber,
        patientName: appt.patientName || appt.patientId.name,
        distance,
        travelTime,
        queuePosition,
        estimatedWaitTime
      });
      console.log('✅ Reminder emitted via Socket.IO');
    } else {
      console.log('❌ Socket.IO instance not found!');
    }

    res.json({
      success: true,
      message: 'Reminder sent',
      patientName: appt.patientId.name,
      distance,
      travelTime,
      queuePosition
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// GET /api/appointments/live-queue/:appointmentId -> Get live queue status for patient
router.get('/live-queue/:appointmentId', auth, async (req, res) => {
  try {
    console.log('📊 Live queue request for appointment:', req.params.appointmentId);

    const appt = await Appointment.findById(req.params.appointmentId);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });

    console.log('📋 Appointment details:', {
      queueNumber: appt.queueNumber,
      status: appt.status,
      appointmentDate: appt.appointmentDate
    });

    // Verify patient owns this appointment
    if (appt.patientId && appt.patientId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Handle completed appointments
    if (appt.status === 'COMPLETED') {
      const hospital = appt.hospitalId ? await User.findById(appt.hospitalId) : null;
      const hospitalName = hospital ? hospital.name : appt.hospitalName;
      return res.json({
        success: true,
        queueNumber: appt.queueNumber,
        currentlyServing: null,
        patientsAhead: 0,
        estimatedWaitTime: 0,
        status: 'COMPLETED',
        message: 'Consultation Completed',
        hospitalName
      });
    }

    if (!appt.queueNumber) {
      // For future-date appointments without queue numbers, calculate position from time
      const hospital = appt.hospitalId ? await User.findById(appt.hospitalId) : null;
      const hospitalName = hospital ? hospital.name : appt.hospitalName;

      const patientsAhead = await Appointment.countDocuments({
        $or: [
          { hospitalId: appt.hospitalId },
          { hospitalName: hospitalName }
        ],
        appointmentDate: appt.appointmentDate,
        appointmentTime: { $lt: appt.appointmentTime },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
      });

      // Calculate display queue number
      const displayQueueNumber = patientsAhead + 1;
      const estimatedWaitTime = patientsAhead * 15;

      let message = '';
      if (patientsAhead === 0) {
        message = '🎯 You\'re first in line!';
      } else if (patientsAhead <= 2) {
        message = '⏰ Almost your turn!';
      } else {
        message = '🕒 Please wait for your turn';
      }

      return res.json({
        success: true,
        queueNumber: displayQueueNumber,
        currentlyServing: null,
        patientsAhead,
        estimatedWaitTime,
        status: appt.status,
        message,
        hospitalName
      });
    }

    // Get hospital info
    const hospital = appt.hospitalId ? await User.findById(appt.hospitalId) : null;
    const hospitalName = hospital ? hospital.name : appt.hospitalName;

    // Find currently serving queue number
    // Build hospital filter carefully - avoid matching null hospitalId against all null records
    const hospitalFilter = [];
    if (appt.hospitalId) hospitalFilter.push({ hospitalId: appt.hospitalId });
    if (hospitalName) hospitalFilter.push({ hospitalName: hospitalName });

    const inProgressAppt = await Appointment.findOne({
      $or: hospitalFilter.length > 0 ? hospitalFilter : [{ hospitalId: appt.hospitalId }],
      appointmentDate: appt.appointmentDate,
      status: 'IN_PROGRESS'
    }).sort({ queueNumber: 1 });

    const currentlyServing = inProgressAppt ? inProgressAppt.queueNumber : null;

    // Count patients ahead in queue (all waiting statuses, not currently being seen or completed)
    const patientsAheadQuery = {
      $or: hospitalFilter.length > 0 ? hospitalFilter : [{ hospitalId: appt.hospitalId }],
      appointmentDate: appt.appointmentDate,
      queueNumber: { $lt: appt.queueNumber },
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
    };

    const patientsAhead = await Appointment.countDocuments(patientsAheadQuery);

    // Count emergency cases ahead of this patient
    const emergenciesAhead = await Appointment.countDocuments({
      $or: hospitalFilter.length > 0 ? hospitalFilter : [{ hospitalId: appt.hospitalId }],
      appointmentDate: appt.appointmentDate,
      queueNumber: { $lt: appt.queueNumber },
      status: { $in: ['EMERGENCY', 'PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      type: 'EMERGENCY'
    });

    console.log(`🔢 Patients ahead for queue #${appt.queueNumber}: ${patientsAhead}`);
    console.log(`🚨 Emergency cases ahead: ${emergenciesAhead}`);
    console.log(`👨‍⚕️ Currently serving: ${currentlyServing || 'None'}`);

    // Check for active doctor break
    const smartQueueRoutes = require('./smartQueue');
    const breakInfo = smartQueueRoutes.getActiveBreak && appt.hospitalId
      ? smartQueueRoutes.getActiveBreak(appt.hospitalId.toString())
      : null;

    // Calculate intelligent wait time
    // Base: 15 mins per regular patient, 20 mins per emergency patient
    let estimatedWaitTime = (patientsAhead - emergenciesAhead) * 15 + emergenciesAhead * 20;

    // Add break time if doctor is on break
    if (breakInfo && breakInfo.isOnBreak) {
      estimatedWaitTime += breakInfo.remainingMinutes;
    }

    let message = '';
    if (appt.status === 'IN_PROGRESS') {
      message = '🩺 Your consultation is in progress';
    } else if (breakInfo && breakInfo.isOnBreak) {
      message = `☕ Doctor is on break (${breakInfo.remainingMinutes} mins remaining)`;
    } else if (patientsAhead === 0) {
      message = '🎯 You\'re next! Please be ready';
    } else if (patientsAhead <= 2) {
      message = '⏰ Almost your turn!';
    } else {
      message = '🕒 Please wait for your turn';
    }

    const response = {
      success: true,
      queueNumber: appt.queueNumber,
      currentlyServing,
      patientsAhead,
      estimatedWaitTime,
      status: appt.status,
      message,
      hospitalName,
      patientName: appt.patientName || null
    };

    // Include break info if doctor is on break
    if (breakInfo && breakInfo.isOnBreak) {
      response.doctorBreak = {
        isOnBreak: true,
        remainingMinutes: breakInfo.remainingMinutes,
        breakEndTime: breakInfo.breakEndTime
      };
    }

    // Include emergency info if there are emergency cases
    if (emergenciesAhead > 0) {
      response.emergenciesAhead = emergenciesAhead;
    }

    res.json(response);
  } catch (err) {
    console.error('Live queue error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// GET /api/appointments/emergency/:hospitalId/:date -> Get emergency patients for hospital
router.get('/emergency/:hospitalId/:date', auth, async (req, res) => {
  try {
    const { hospitalId, date } = req.params;

    // Verify access
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'DOCTOR')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const targetHospitalId = (caller.role === 'DOCTOR') ? caller.hospitalId : caller._id;
    if (!targetHospitalId) return res.status(400).json({ msg: 'No hospital association found' });

    // Get emergency appointments for the specified date
    const emergencyAppointments = await Appointment.find({
      $or: [
        { hospitalId: targetHospitalId },
        { hospitalName: caller.name }
      ],
      appointmentDate: date,
      type: 'EMERGENCY'
    }).sort({ queueNumber: 1, createdAt: -1 }).populate('patientId', 'name phone email');

    // Format the response
    const formattedEmergencies = emergencyAppointments.map(appt => ({
      _id: appt._id,
      patientName: appt.patientName || appt.patientId?.name || 'Unknown',
      phone: appt.phone || appt.patientId?.phone || '',
      email: appt.patientId?.email || '',
      queueNumber: appt.queueNumber,
      tokenNumber: appt.tokenNumber,
      status: appt.status,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      type: appt.type,
      createdAt: appt.createdAt,
      consultationStartTime: appt.consultationStartTime,
      consultationEndTime: appt.consultationEndTime
    }));

    res.json(formattedEmergencies);
  } catch (err) {
    console.error('Emergency patients error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
