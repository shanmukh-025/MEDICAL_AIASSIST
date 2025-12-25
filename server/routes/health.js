const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const HealthLog = require('../models/HealthLog');

// @route   POST api/health/log
// @desc    Log BMI or Illness
router.post('/log', auth, async (req, res) => {
  const { type, value, description } = req.body;
  try {
    const newLog = new HealthLog({
      user: req.user.id,
      type,
      value,
      description
    });
    await newLog.save();
    res.json(newLog);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/health/history
// @desc    Get all logs
router.get('/history', auth, async (req, res) => {
  try {
    const logs = await HealthLog.find({ user: req.user.id }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/health/check-status
// @desc    Check if user hasn't updated in 3 weeks (21 days)
router.get('/check-status', auth, async (req, res) => {
  try {
    const lastLog = await HealthLog.findOne({ user: req.user.id }).sort({ date: -1 });
    
    if (!lastLog) {
      // New user or no logs ever
      return res.json({ needsUpdate: true, daysSince: 'Never' });
    }

    const today = new Date();
    const lastDate = new Date(lastLog.date);
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 21) {
        res.json({ needsUpdate: true, daysSince: diffDays });
    } else {
        res.json({ needsUpdate: false, daysSince: diffDays });
    }
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;