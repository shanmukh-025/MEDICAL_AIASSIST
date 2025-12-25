const express = require('express');
const mongoose = require('mongoose'); 
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. Connect Database
connectDB();

// --- AUTO-FIX: Drop the bad 'clerkId' index ---
// This runs once when the server starts to clean up your database
mongoose.connection.once('open', async () => {
  try {
    // Access the users collection directly
    const collection = mongoose.connection.db.collection('users');
    
    // Check if the specific bad index exists
    const indexes = await collection.indexes();
    const indexExists = indexes.some(index => index.name === 'clerkId_1');
    
    if (indexExists) {
      await collection.dropIndex('clerkId_1');
      console.log("✅ SUCCESS: Bad database rule (clerkId) deleted. Registration will work now!");
    }
  } catch (e) {
    // If index doesn't exist, that's good! Ignore the error.
    console.log("Database index is clean (No fix needed).");
  }
});
// ----------------------------------------------

// 2. Configure CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], 
  credentials: true
}));

// 3. Increase Data Limit (CRITICAL for Image Uploads)
// This allows large images to be sent to the database
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 4. Request Logger
app.use((req, res, next) => {
  console.log(`📩 Request Received: ${req.method} ${req.url}`);
  next();
});

// 5. Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/wellness', require('./routes/wellness'));
app.use('/api/records', require('./routes/records'));
app.use('/api/appointments', require('./routes/appointments')); // <--- ADDED THIS FOR DOCTOR BOOKING

// 6. Test Route
app.get('/', (req, res) => res.send('API is Running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend Server running on port ${PORT}`));