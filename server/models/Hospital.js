const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: false
  },
  contactEmail: {
    type: String
  },
  webhook: {
    type: String // optional webhook URL to notify the hospital system
  },
  // White-labeling fields
  branding: {
    logo: {
      type: String, // URL or base64 of hospital logo
      default: null
    },
    primaryColor: {
      type: String,
      default: '#059669' // emerald-600
    },
    secondaryColor: {
      type: String,
      default: '#10b981' // emerald-500
    },
    accentColor: {
      type: String,
      default: '#34d399' // emerald-400
    },
    appName: {
      type: String,
      default: 'VillageMed'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('hospital', HospitalSchema);
