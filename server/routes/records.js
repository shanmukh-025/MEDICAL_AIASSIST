const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Record = require('../models/Record');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @route   GET api/records
// @desc    Get all records for the user
router.get('/', auth, async (req, res) => {
  try {
    console.log('📋 Fetching records for user:', req.user.id);
    const records = await Record.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('hospitalId', 'name')
      .populate('familyMember', 'name relationship')
      .lean();
    console.log(`✅ Found ${records.length} records for user ${req.user.id}`);
    res.json(records);
  } catch (err) {
    console.error('❌ Error fetching records:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/records
// @desc    Add a new record (by patient)
router.post('/', auth, async (req, res) => {
  try {
    // UPDATED: Destructure 'image' instead of 'fileData'
    const { title, doctor, type, date, image, familyMember } = req.body;
    
    const newRecord = new Record({
      user: req.user.id,
      title,
      doctor,
      type,
      date,
      image, // UPDATED: Matches the new Schema field
      familyMember: familyMember || null,
      sentByHospital: false
    });

    const record = await newRecord.save();
    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/records/send-to-patient
// @desc    Hospital sends test report to patient
router.post('/send-to-patient', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospitals can send test reports' });
    }

    const { patientId, title, doctor, type, date, image, appointmentId } = req.body;
    console.log('📤 Hospital sending report to patient:', { 
      hospitalName: caller.name, 
      patientId, 
      title 
    });

    if (!patientId || !title || !image) {
      return res.status(400).json({ msg: 'Patient ID, title, and image are required' });
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'PATIENT') {
      console.log('❌ Patient not found:', patientId);
      return res.status(404).json({ msg: 'Patient not found' });
    }

    console.log('✅ Patient found:', patient.name, patient.email);

    const newRecord = new Record({
      user: patientId,
      title,
      doctor: doctor || '',
      type: type || 'Lab Report',
      date: date || new Date(),
      image,
      hospitalId: caller._id,
      hospitalName: caller.name,
      sentByHospital: true,
      appointmentId: appointmentId || null
    });

    const record = await newRecord.save();
    console.log('✅ Record saved successfully:', record._id);

    // Send notification to patient
    try {
      const msg = `${caller.name} has sent you a test report: ${title}`;
      await Notification.create({ 
        userId: patientId, 
        message: msg, 
        type: 'TEST_REPORT' 
      });
      
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${patientId}`).emit('notification', { 
          message: msg, 
          recordId: record._id,
          type: 'TEST_REPORT'
        });
      }
    } catch (e) {
      console.warn('Notification creation failed', e.message);
    }

    res.json({ success: true, record });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/records/:id
// @desc    Delete a record
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);

    // Check if record exists
    if (!record) {
      return res.status(404).json({ msg: 'Record not found' });
    }

    // Check user (Make sure user owns the record)
    if (record.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Record.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Record removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;