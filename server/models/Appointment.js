const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hospitalName: { type: String },
  doctor: { type: String },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  reason: { type: String },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED'],
    default: 'PENDING'
  },
  rejectionReason: { type: String },
  approvalMessage: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);