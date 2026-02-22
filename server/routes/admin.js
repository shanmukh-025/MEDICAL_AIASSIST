const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const HealthLog = require('../models/HealthLog');
const Record = require('../models/Record');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// GET /api/admin/stats - Admin only
router.get('/stats', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await User.countDocuments({ role: 'PATIENT' });
    const hospitals = await User.countDocuments({ role: 'HOSPITAL' });
    const doctors = await User.countDocuments({ role: 'DOCTOR' });

    // Count total health records (uploaded medical files)
    const records = await Record.countDocuments();

    res.json({ users, hospitals, doctors, records });
  } catch (err) {
    console.error('Admin Stats Error:', err);
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

module.exports = router;
