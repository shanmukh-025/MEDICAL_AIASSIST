const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Record = require('../models/Record');
const { requireRole } = require('../middleware/roles');
const auth = require('../middleware/auth');

// GET /api/admin/stats - Admin only
router.get('/stats', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    // 1. Total Patients (Users)
    const users = await User.countDocuments({ role: 'PATIENT' });

    // 2. Total Hospitals
    const hospitals = await User.countDocuments({ role: 'HOSPITAL' });

    // 3. Total Doctors (Sum of all doctors listed in hospital profiles)
    const hospitalUsers = await User.find({ role: 'HOSPITAL' }, 'doctors');
    let doctors = 0;
    hospitalUsers.forEach(h => {
      if (h.doctors && Array.isArray(h.doctors)) {
        doctors += h.doctors.length;
      }
    });

    // 4. Total Health Records (Medical reports, scans, etc.)
    const records = await Record.countDocuments();

    console.log('📊 Admin Stats Summary:', { users, hospitals, doctors, records });

    res.json({ users, hospitals, doctors, records });
  } catch (err) {
    console.error('🔥 Admin Stats Error:', err);
    res.status(500).json({ error: 'Failed to fetch stats', message: err.message });
  }
});

// GET /api/admin/hospitals - List all hospitals for management
router.get('/hospitals', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const hospitals = await User.find({ role: 'HOSPITAL' }).select('-password').sort({ date: -1 });
    res.json(hospitals);
  } catch (err) {
    console.error('Error fetching hospitals:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE /api/admin/hospitals/:id - Delete a hospital
router.delete('/hospitals/:id', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const hospital = await User.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ msg: 'Hospital not found' });
    }

    if (hospital.role !== 'HOSPITAL') {
      return res.status(400).json({ msg: 'Specified user is not a hospital' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Hospital removed successfully' });
  } catch (err) {
    console.error('Error deleting hospital:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
