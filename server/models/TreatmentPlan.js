const mongoose = require('mongoose');

const TreatmentPlanSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
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
  doctorName: { type: String, required: true },
  diagnosis: { type: String, required: true },
  
  // Prescribed medicines 
  medicines: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true },       // e.g., "500mg"
    // Support daily and weekly/custom schedules
    frequency: { 
      type: String, 
      enum: ['once', 'twice', 'thrice', 'four-times', 'weekly', 'custom'],
      required: true 
    },
    // If weekly, provide daysOfWeek (0=Sun .. 6=Sat). If custom, provide explicit dates or cron-like schedule in `customSchedule`.
    daysOfWeek: [{ type: Number }],
    customSchedule: { type: String }, // optional freeform schedule descriptor for special cases
    timings: [{ type: String }],                     // e.g., ["08:00", "14:00", "20:00"]
    duration: { type: Number, required: true },       // number of days
    instructions: {
      beforeFood: { type: Boolean, default: false },
      afterFood: { type: Boolean, default: true },
      notes: { type: String }
    }
  }],

  // Treatment duration
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Symptoms to monitor during recovery
  symptomsToMonitor: [{ type: String }],  // e.g., ["fever", "headache", "cough"]
  
  // Follow-up instructions
  followUpRequired: { type: Boolean, default: true },
  followUpDate: { type: Date },
  followUpNotes: { type: String },
  
  // Status tracking
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'FOLLOW_UP_NEEDED', 'FOLLOW_UP_SCHEDULED', 'DISCONTINUED'],
    default: 'ACTIVE'
  },

  // Doctor's special instructions
  specialInstructions: { type: String },
  
  // Severity at time of prescription (baseline)
  initialSeverity: { type: Number, min: 1, max: 10, default: 5 },

  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

TreatmentPlanSchema.index({ patientId: 1, status: 1 });
TreatmentPlanSchema.index({ hospitalId: 1, status: 1 });
TreatmentPlanSchema.index({ appointmentId: 1 });
TreatmentPlanSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model('TreatmentPlan', TreatmentPlanSchema);
