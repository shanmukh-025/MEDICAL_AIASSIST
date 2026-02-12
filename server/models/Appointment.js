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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);