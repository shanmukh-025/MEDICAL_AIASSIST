const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Attempt to connect to the database using the URI in .env
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;