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
  // Role for RBAC: 'PATIENT' or 'HOSPITAL' or 'ADMIN' or 'DOCTOR' or 'PHARMACY'
  role: {
    type: String,
    enum: ['PATIENT', 'HOSPITAL', 'ADMIN', 'DOCTOR', 'PHARMACY'],
    default: 'PATIENT'
  },
  // Link to hospital (for Doctors and Patients)
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  phoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationUid: {
    type: String
  },
  phoneVerifiedAt: {
    type: Date
  },
  workingHours: {
    type: String,
    default: '09:00 AM - 09:00 PM'
  },
  services: [{
    type: String
  }],
  doctors: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    specialty: String,
    qualification: String,
    experience: String,
    email: String,
    isRegistered: { type: Boolean, default: false }
  }],
  pharmacies: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    isRegistered: { type: Boolean, default: false }
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
  paymentInfo: {
    upiId: { type: String, default: null },
    accountName: { type: String, default: null }
  },
  // Push notification subscription (Web Push API)
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

module.exports = mongoose.model('User', UserSchema);