const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { startReminderScheduler } = require('./services/reminderScheduler');
require('dotenv').config();

const app = express();
const http = require('http');
const { Server } = require('socket.io');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads/logos directory');
}

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

// 2. Configure CORS (CRITICAL UPDATE FOR PWA/OFFLINE MODE)
app.use(cors({
  origin: [
    'http://localhost:5173',   // Dev Server
    'http://127.0.0.1:5173',   // Dev Server (IP)
    'http://localhost:5174',   // Dev Server (alternate port)
    'http://127.0.0.1:5174',   // Dev Server (alternate port IP)
    'http://localhost:4173',   // Preview/Build Server (PWA)
    'http://127.0.0.1:4173',   // Preview/Build Server (IP)
    'https://medical-aiassist.vercel.app'  // Production Frontend (Vercel)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization']
}));

// 3. Increase Data Limit (CRITICAL for Image Uploads)
// This allows large images to be sent to the database
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3.5. Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/smart-queue', require('./routes/smartQueue')); // NEW: Smart OPD Queue Manager
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/family', require('./routes/family'));
app.use('/api/reminders', require('./routes/reminders'));

// 6. Test Route
app.get('/', (req, res) => res.send('API is Running...'));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// setup socket.io
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);

  // clients should join room `user_<userId>` after authentication on client
  socket.on('join', (room) => {
    socket.join(room);
    console.log('✅ Socket joined room:', room, 'Socket ID:', socket.id);
  });

  // WebRTC Signaling for Audio/Video Calls
  socket.on('call:offer', ({ to, offer, callType }) => {
    console.log(`📞 Call offer from ${socket.id} to ${to} (${callType})`);
    io.to(to).emit('call:offer', {
      from: socket.id,
      offer,
      callType
    });
  });

  socket.on('call:answer', ({ to, answer }) => {
    console.log(`✅ Call answer from ${socket.id} to ${to}`);
    io.to(to).emit('call:answer', { answer });
  });

  socket.on('call:ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('call:ice-candidate', { candidate });
  });

  socket.on('call:end', ({ to }) => {
    console.log(`📴 Call ended by ${socket.id}`);
    io.to(to).emit('call:end');
  });

  socket.on('call:reject', ({ to }) => {
    console.log(`❌ Call rejected by ${socket.id}`);
    io.to(to).emit('call:rejected');
  });

  socket.on('call:rejected', ({ to }) => {
    console.log(`❌ Call rejected by ${socket.id} to ${to}`);
    io.to(to).emit('call:rejected');
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});
app.set('io', io);

// Start medicine reminder scheduler
startReminderScheduler();

server.listen(PORT, () => console.log(`🚀 Backend Server running on port ${PORT}`));