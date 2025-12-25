const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  doctor: { type: String, required: true },
  hospital: { type: String, required: true },
  specialty: { type: String },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, default: "Confirmed" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('appointment', AppointmentSchema);