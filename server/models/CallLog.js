const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  callerSocketId: {
    type: String,
    required: true
  },
  callerUserId: {
    type: String,
    default: null
  },
  callerName: {
    type: String,
    default: 'Unknown Patient'
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    default: 'audio'
  },
  status: {
    type: String,
    enum: ['MISSED', 'ANSWERED', 'BUSY', 'REJECTED'],
    default: 'MISSED'
  },
  duration: {
    type: Number, // seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  answeredAt: {
    type: Date
  },
  endedAt: {
    type: Date
  }
});

// Index for efficient date-based queries
CallLogSchema.index({ hospitalId: 1, startedAt: -1 });

module.exports = mongoose.model('CallLog', CallLogSchema);
