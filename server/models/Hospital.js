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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('hospital', HospitalSchema);
