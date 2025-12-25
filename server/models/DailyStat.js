const mongoose = require('mongoose');

const DailyStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Format: "YYYY-MM-DD"
    required: true
  },
  hydration: {
    type: Number,
    default: 0
  },
  mood: {
    type: String,
    default: 'Happy'
  },
  sleep: {
    type: Number,
    default: 7
  }
});

// Ensure a user only has one entry per date
DailyStatsSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyStat', DailyStatsSchema);