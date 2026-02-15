require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

connectDB().then(async () => {
  const CallLog = require('./models/CallLog');
  const result = await CallLog.deleteMany({ callerUserId: null });
  console.log('Deleted old logs without callerUserId:', result.deletedCount);
  process.exit(0);
});
