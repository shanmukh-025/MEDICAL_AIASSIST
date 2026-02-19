const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { VAPID_PUBLIC_KEY } = require('../services/pushNotificationService');

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

// ─── Push Notification Endpoints ──────────────────────────────

// GET /api/notifications/vapid-key -> Get VAPID public key for client
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY || null });
});

// POST /api/notifications/subscribe -> Save push subscription for user
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ msg: 'Invalid push subscription' });
    }

    await User.findByIdAndUpdate(req.user.id, {
      pushSubscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      }
    });

    console.log(`🔔 Push subscription saved for user ${req.user.id}`);
    res.json({ success: true, msg: 'Push notifications enabled' });
  } catch (err) {
    console.error('Push subscribe error:', err.message);
    res.status(500).json({ msg: 'Failed to save push subscription' });
  }
});

// POST /api/notifications/unsubscribe -> Remove push subscription
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { pushSubscription: 1 }
    });
    res.json({ success: true, msg: 'Push notifications disabled' });
  } catch (err) {
    console.error('Push unsubscribe error:', err.message);
    res.status(500).json({ msg: 'Failed to remove push subscription' });
  }
});

module.exports = router;

