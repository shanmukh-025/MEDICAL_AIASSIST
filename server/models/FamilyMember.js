const mongoose = require('mongoose');

const FamilyMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // The account owner
  },
  name: {
    type: String,
    required: true
  },
  relationship: {
    type: String,
    enum: ['Self', 'Spouse', 'Child', 'Parent', 'Grandparent', 'Sibling', 'Other'],
    default: 'Other'
  },
  age: {
    type: Number
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  bloodGroup: {
    type: String
  },
  allergies: {
    type: [String],
    default: []
  },
  chronicConditions: {
    type: [String],
    default: []
  },
  emergencyContact: {
    type: String
  },
  city: {
    type: String
  },
  photoUrl: {
    type: String
  },
  dateOfBirth: {
    type: Date
  },
  documents: {
    type: [{
      name: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FamilyMember', FamilyMemberSchema);
