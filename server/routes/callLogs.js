const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CallLog = require('../models/CallLog');

// GET /api/call-logs - Get call logs for the authenticated hospital, grouped by date
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, date } = req.query;

    const filter = { hospitalId: userId };

    // Optional: filter by specific date
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.startedAt = { $gte: start, $lte: end };
    }

    const logs = await CallLog.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await CallLog.countDocuments(filter);

    res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error fetching call logs:', err);
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

// GET /api/call-logs/stats - Get call statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalCalls, todayCalls, missedCalls, answeredCalls] = await Promise.all([
      CallLog.countDocuments({ hospitalId: userId }),
      CallLog.countDocuments({ hospitalId: userId, startedAt: { $gte: today, $lt: tomorrow } }),
      CallLog.countDocuments({ hospitalId: userId, status: { $in: ['MISSED', 'BUSY'] } }),
      CallLog.countDocuments({ hospitalId: userId, status: 'ANSWERED' }),
    ]);

    res.json({ totalCalls, todayCalls, missedCalls, answeredCalls });
  } catch (err) {
    console.error('Error fetching call stats:', err);
    res.status(500).json({ error: 'Failed to fetch call stats' });
  }
});

module.exports = router;
