const mongoose = require('mongoose');

const SymptomLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    default: null // null means it's for the user themselves
  },
  symptoms: [{
    type: String,
    required: true
  }],
  severity: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  conditionName: {
    type: String,
    default: null // Optional: Groups related symptoms (e.g., "Flu Feb 2026", "Knee Injury")
  },
  aiAnalysis: {
    primaryDiagnosis: String,
    confidence: Number,
    urgencyLevel: String,
    recommendations: [String],
    trend: String // "improving", "worsening", "stable", "recurring"
  },
  loggedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient querying
SymptomLogSchema.index({ user: 1, loggedAt: -1 });
SymptomLogSchema.index({ familyMember: 1, loggedAt: -1 });
SymptomLogSchema.index({ user: 1, conditionName: 1 }); // For filtering by condition

module.exports = mongoose.model('SymptomLog', SymptomLogSchema);
