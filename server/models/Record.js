const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // References the User model
    required: true
  },
  title: { type: String, required: true }, 
  doctor: { type: String }, 
  type: { type: String },   // e.g., "Prescription", "Lab Report"
  date: { type: Date },     // Changed to 'Date' for correct sorting
  image: { type: String },  // <--- RENAMED from 'fileData' to 'image' to match Frontend
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // References User model (hospital user)
  },
  hospitalName: { type: String },
  sentByHospital: { type: Boolean, default: false }, // Track if sent by hospital
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('record', RecordSchema);