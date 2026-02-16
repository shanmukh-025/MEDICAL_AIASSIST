const mongoose = require('mongoose');

const RecoveryLogSchema = new mongoose.Schema({
  treatmentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TreatmentPlan',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Date of this log entry
  date: { type: Date, required: true },
  dayNumber: { type: Number, required: true },  // Day 1, Day 2, etc. of treatment

  // Symptom tracking
  symptoms: [{
    name: { type: String, required: true },
    severity: { type: Number, min: 1, max: 10, required: true },
    notes: { type: String }
  }],
  
  // Overall feeling
  overallFeeling: {
    type: String,
    enum: ['much_worse', 'worse', 'same', 'better', 'much_better'],
    required: true
  },
  overallSeverity: { type: Number, min: 1, max: 10, required: true },

  // Medicine adherence for the day
  medicinesTaken: [{
    medicineName: { type: String, required: true },
    taken: { type: Boolean, default: false },
    timeTaken: { type: String },  // HH:MM
    skippedReason: { type: String }
  }],
  medicineAdherence: { type: Number, min: 0, max: 100 },  // percentage

  // Side effects reported
  sideEffects: [{ type: String }],
  
  // Any new symptoms
  newSymptoms: [{ type: String }],
  
  // Patient notes
  patientNotes: { type: String },

  // Flag for doctor attention
  needsDoctorAttention: { type: Boolean, default: false },
  doctorAlerted: { type: Boolean, default: false },
  
  // Auto-calculated trend
  trend: {
    type: String,
    enum: ['improving', 'stable', 'worsening', 'critical'],
    default: 'stable'
  },

  loggedAt: { type: Date, default: Date.now }
}, { timestamps: true });

RecoveryLogSchema.index({ treatmentPlanId: 1, date: -1 });
RecoveryLogSchema.index({ patientId: 1, date: -1 });
RecoveryLogSchema.index({ hospitalId: 1, needsDoctorAttention: 1 });
RecoveryLogSchema.index({ treatmentPlanId: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.model('RecoveryLog', RecoveryLogSchema);
