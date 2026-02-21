const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const HealthLog = require('../models/HealthLog');
const { requireRole } = require('../middleware/roles');

// GET /api/admin/stats - Admin only
router.get('/stats', requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await User.countDocuments({ role: 'PATIENT' });
    const hospitals = await User.countDocuments({ role: 'HOSPITAL' });
    const doctors = await User.countDocuments({ role: 'DOCTOR' });
    const records = await HealthLog.countDocuments();
    res.json({ users, hospitals, doctors, records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
