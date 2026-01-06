const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// GET /api/notifications -> get notifications for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/notifications/:id/read -> mark as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ msg: 'Notification not found' });
    if (n.userId.toString() !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    n.isRead = true;
    await n.save();
    res.json(n);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
