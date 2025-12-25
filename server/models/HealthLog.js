const mongoose = require('mongoose');

const HealthLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: { type: String, enum: ['bmi', 'illness'], required: true }, // Distinguishes the log type
  value: { type: Number }, // For BMI/Weight
  description: { type: String }, // For Illness name (e.g., "Flu")
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HealthLog', HealthLogSchema);