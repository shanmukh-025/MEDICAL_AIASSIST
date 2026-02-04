const express = require('express');
const router = express.Router();
const MedicineReminder = require('../models/MedicineReminder');
const auth = require('../middleware/auth');

// Create a new medicine reminder
router.post('/', auth, async (req, res) => {
  try {
    const {
      medicineName,
      dosage,
      frequency,
      timings,
      duration,
      instructions,
      notifications,
      familyContacts,
      pushSubscription
    } = req.body;

    const reminder = new MedicineReminder({
      userId: req.user.id,
      medicineName,
      dosage,
      frequency,
      timings,
      duration,
      instructions,
      notifications,
      familyContacts,
      pushSubscription
    });

    await reminder.save();
    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ message: 'Failed to create reminder' });
  }
});

// Get all reminders for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const reminders = await MedicineReminder.find({
      userId: req.user.id,
      isActive: true,
      'duration.endDate': { $gte: new Date() }
    }).sort({ createdAt: -1 });

    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ message: 'Failed to fetch reminders' });
  }
});

// Get reminder history
router.get('/history', auth, async (req, res) => {
  try {
    const reminders = await MedicineReminder.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminder history:', error);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// Update a reminder
router.put('/:id', auth, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    Object.assign(reminder, req.body);
    await reminder.save();

    res.json(reminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ message: 'Failed to update reminder' });
  }
});

// Mark reminder as acknowledged
router.post('/:id/acknowledge', auth, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Find the latest history entry and mark as acknowledged
    if (reminder.history.length > 0) {
      reminder.history[reminder.history.length - 1].status = 'acknowledged';
      await reminder.save();
    }

    res.json({ message: 'Reminder acknowledged' });
  } catch (error) {
    console.error('Error acknowledging reminder:', error);
    res.status(500).json({ message: 'Failed to acknowledge reminder' });
  }
});

// Delete/deactivate a reminder
router.delete('/:id', auth, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    reminder.isActive = false;
    await reminder.save();

    res.json({ message: 'Reminder deactivated successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ message: 'Failed to delete reminder' });
  }
});

// Subscribe to push notifications
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription, reminderId } = req.body;

    if (reminderId) {
      // Update specific reminder
      await MedicineReminder.findOneAndUpdate(
        { _id: reminderId, userId: req.user.id },
        { pushSubscription: subscription }
      );
    } else {
      // Update all active reminders for this user
      await MedicineReminder.updateMany(
        { userId: req.user.id, isActive: true },
        { pushSubscription: subscription }
      );
    }

    res.json({ message: 'Push subscription saved' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription' });
  }
});

module.exports = router;
