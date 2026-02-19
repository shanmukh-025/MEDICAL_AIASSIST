const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hospitalName: { type: String },
  patientName: { type: String }, // For walk-ins without user accounts
  phone: { type: String }, // For walk-ins
  doctor: { type: String },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  reason: { type: String },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'CHECKED_IN', 'NO_SHOW', 'EMERGENCY'],
    default: 'PENDING'
  },
  cancelledAt: { type: Date },
  type: {
    type: String,
    enum: ['REGULAR', 'WALK_IN', 'EMERGENCY', 'FOLLOW_UP'],
    default: 'REGULAR'
  },
  queueNumber: { type: Number },
  tokenNumber: { type: String },
  consultationStartTime: { type: Date },
  consultationEndTime: { type: Date },
  rejectionReason: { type: String },
  approvalMessage: { type: String },
  createdAt: { type: Date, default: Date.now },

  // Emergency Patient Monitoring Fields
  emergencyMonitoring: {
    enabled: { type: Boolean, default: false },
    startedAt: { type: Date },
    endedAt: { type: Date },
    initialSymptoms: { type: String },
    initialSeverity: { type: Number, min: 1, max: 10 },
    chiefComplaint: { type: String },
    allergies: { type: String },
    currentMedications: { type: String },
    vitalSignsHistory: [{
      recordedAt: { type: Date, default: Date.now },
      bloodPressureSystolic: { type: Number },
      bloodPressureDiastolic: { type: Number },
      heartRate: { type: Number },
      temperature: { type: Number },
      respiratoryRate: { type: Number },
      oxygenSaturation: { type: Number },
      painLevel: { type: Number, min: 0, max: 10 },
      consciousnessLevel: { type: String, enum: ['Alert', 'Voice', 'Pain', 'Unresponsive'] },
      notes: { type: String },
      recordedBy: { type: String }
    }],
    monitoringNotes: [{
      note: { type: String },
      addedAt: { type: Date, default: Date.now },
      addedBy: { type: String }
    }],
    interventions: [{
      intervention: { type: String },
      time: { type: Date, default: Date.now },
      result: { type: String }
    }],
    isCritical: { type: Boolean, default: false },
    lastVitalUpdate: { type: Date }
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
