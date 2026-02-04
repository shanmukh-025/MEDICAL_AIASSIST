const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // Role for RBAC: 'PATIENT' or 'HOSPITAL' or 'ADMIN'
  role: {
    type: String,
    enum: ['PATIENT', 'HOSPITAL', 'ADMIN'],
    default: 'PATIENT'
  },
  // Contact email for hospital notifications (optional)
  contactEmail: {
    type: String
  },
  // Location for hospitals (GPS coordinates)
  location: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  // Address for hospitals
  address: {
    type: String
  },
  // Hospital-specific profile fields
  phone: {
    type: String
  },
  workingHours: {
    type: String,
    default: '09:00 AM - 09:00 PM'
  },
  services: [{
    type: String
  }],
  doctors: [{
    name: String,
    specialty: String,
    qualification: String,
    experience: String
  }],
  about: {
    type: String
  },
  emergencyContact: {
    type: String
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  photoUrl: {
    type: String
  },
  logo: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);