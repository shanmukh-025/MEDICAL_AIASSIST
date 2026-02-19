const mongoose = require('mongoose');

const medicineReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    enum: ['once', 'twice', 'thrice', 'four-times', 'weekly', 'custom'],
    required: true
  },
  daysOfWeek: [{ type: Number }], // 0=Sun .. 6=Sat for weekly schedules
  customSchedule: { type: String }, // freeform schedule descriptor for custom cases
  timings: [{
    type: String, // HH:MM format (e.g., "09:00", "14:00", "21:00")
    required: true
  }],
  duration: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  instructions: {
    beforeFood: Boolean,
    afterFood: Boolean,
    withWater: Boolean,
    notes: String
  },
  // Notification settings
  notifications: {
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    voice: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      enum: ['en', 'te'],
      default: 'te'
    }
  },
  // Family member alerts
  familyContacts: [{
    name: String,
    phone: String,
    relation: String
  }],
  // Track reminder history
  history: [{
    scheduledTime: Date,
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'failed', 'acknowledged'],
      default: 'sent'
    },
    method: {
      type: String,
      enum: ['push', 'sms', 'voice']
    },
    timingSlot: {
      type: String  // e.g. '09:00', '21:00' - which specific timing was taken
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // Link to treatment plan (auto-created reminders)
  treatmentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TreatmentPlan'
  },
  // Push notification subscription
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  }
}, {
  timestamps: true
});

// Index for efficient reminder queries
medicineReminderSchema.index({ userId: 1, isActive: 1 });
medicineReminderSchema.index({ 'duration.startDate': 1, 'duration.endDate': 1 });

module.exports = mongoose.model('MedicineReminder', medicineReminderSchema);
