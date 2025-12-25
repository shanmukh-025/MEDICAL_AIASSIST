const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true }, // e.g., "Blood Test"
  doctor: { type: String, required: true }, // e.g., "Dr. Jeremy"
  type: { type: String, required: true },   // e.g., "Lab", "Prescription", "Imaging"
  date: { type: String, required: true },
  fileData: { type: String }, // Stores the image as a text string (Base64)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Record', RecordSchema);