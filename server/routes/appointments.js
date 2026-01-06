const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Notification = require('../models/Notification');

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
    const { hospitalName, doctor, appointmentDate, appointmentTime, reason } = req.body;
    // ensure caller is a patient
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller) return res.status(401).json({ msg: 'User not found' });
    if (caller.role !== 'PATIENT') return res.status(403).json({ msg: 'Only patients can book appointments' });

    // Find hospital user by name (case-insensitive) or create if doesn't exist
    let hospitalUser = null;
    let hospitalId = null;
    
    if (hospitalName) {
      hospitalUser = await User.findOne({ 
        name: { $regex: new RegExp(`^${hospitalName}$`, 'i') },
        role: 'HOSPITAL' 
      });
      
      if (hospitalUser) {
        hospitalId = hospitalUser._id;
      }
    }

    const appt = new Appointment({
      patientId: caller._id,
      hospitalId: hospitalId,
      hospitalName: hospitalName || '',
      doctor: doctor || '',
      appointmentDate,
      appointmentTime,
      reason,
      status: 'PENDING'
    });

    await appt.save();

    // Create notification for hospital user if found
    try {
      if (hospitalUser) {
        const msg = `New appointment request from ${caller.name} for ${hospitalName} on ${appointmentDate} at ${appointmentTime}`;
        await Notification.create({ userId: hospitalUser._id, message: msg, type: 'APPOINTMENT' });
        const io = req.app.get('io');
        if (io) io.to(`user_${hospitalUser._id}`).emit('notification', { message: msg, apptId: appt._id });
      }
    } catch (e) {
      console.warn('Notification creation failed', e.message);
    }

    res.json(appt);
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
    const appts = await Appointment.find({ patientId: caller._id }).sort({ createdAt: -1 });
    res.json(appts);
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
    const appts = await Appointment.find({ 
      hospitalId: caller._id, 
      status: { $in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } 
    }).sort({ createdAt: -1 }).populate('patientId', 'name email');
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
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Access denied' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });
    if (appt.hospitalId && appt.hospitalId.toString() !== caller._id.toString()) return res.status(403).json({ msg: 'Not authorized' });

    appt.status = 'CONFIRMED';
    appt.approvalMessage = message || '';
    await appt.save();

    // notify patient
    const msg = `Your appointment on ${appt.appointmentDate} at ${appt.appointmentTime} has been CONFIRMED. ${message || ''}`;
    await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
    const io = req.app.get('io');
    if (io) io.to(`user_${appt.patientId}`).emit('notification', { message: msg, apptId: appt._id, status: 'CONFIRMED' });

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
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Access denied' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });
    if (appt.hospitalId && appt.hospitalId.toString() !== caller._id.toString()) return res.status(403).json({ msg: 'Not authorized' });

    appt.status = 'REJECTED';
    appt.rejectionReason = reason || '';
    await appt.save();

    // notify patient
    const msg = `Your appointment on ${appt.appointmentDate} at ${appt.appointmentTime} was REJECTED. ${reason || ''}`;
    await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
    const io = req.app.get('io');
    if (io) io.to(`user_${appt.patientId}`).emit('notification', { message: msg, apptId: appt._id, status: 'REJECTED' });

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
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Access denied' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });
    if (appt.hospitalId && appt.hospitalId.toString() !== caller._id.toString()) return res.status(403).json({ msg: 'Not authorized' });

    appt.status = 'COMPLETED';
    await appt.save();

    // notify patient
    const msg = `Your visit to ${appt.hospitalName} on ${appt.appointmentDate} has been marked as COMPLETED. Thank you!`;
    await Notification.create({ userId: appt.patientId, message: msg, type: 'APPOINTMENT' });
    const io = req.app.get('io');
    if (io) io.to(`user_${appt.patientId}`).emit('notification', { message: msg, apptId: appt._id, status: 'COMPLETED' });

    res.json({ success: true, appt });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/appointments/:id -> Hospital deletes a completed appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Only hospitals can delete appointments' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });
    if (appt.hospitalId && appt.hospitalId.toString() !== caller._id.toString()) return res.status(403).json({ msg: 'Not authorized' });

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

module.exports = router;