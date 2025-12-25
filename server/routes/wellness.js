const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DailyStat = require('../models/DailyStat'); 

// Helper: Get "YYYY-MM-DD"
const getTodayDate = () => new Date().toISOString().split('T')[0];

// @route   GET api/wellness/today
router.get('/today', auth, async (req, res) => {
  try {
    const today = getTodayDate();
    let stats = await DailyStat.findOne({ user: req.user.id, date: today });
    if (!stats) return res.json({ hydration: 0, mood: 'Happy', sleep: 7 });
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/wellness/history (NEW: For Weekly Progress)
router.get('/history', auth, async (req, res) => {
  try {
    // Get last 7 entries, sorted by newest first
    const history = await DailyStat.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(7);
    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/wellness/update
router.post('/update', auth, async (req, res) => {
  const { hydration, mood, sleep } = req.body;
  const today = getTodayDate();

  try {
    let stats = await DailyStat.findOne({ user: req.user.id, date: today });

    if (stats) {
      if (hydration !== undefined) stats.hydration = hydration;
      if (mood !== undefined) stats.mood = mood;
      if (sleep !== undefined) stats.sleep = sleep;
      await stats.save();
    } else {
      stats = new DailyStat({
        user: req.user.id,
        date: today,
        hydration: hydration || 0,
        mood: mood || 'Happy',
        sleep: sleep || 7
      });
      await stats.save();
    }
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;