const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const connectDB = require('./config/db');
const { startReminderScheduler } = require('./services/reminderScheduler');
const { startMonitoringScheduler } = require('./services/monitoringScheduler');
const CallLog = require('./models/CallLog');

const app = express();
const http = require('http');
const { Server } = require('socket.io');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads/logos directory');
}

// 1. Connect Database (Server starts inside startServer() at the bottom of the file)
// connectDB(); // Removed from here, moved to the bottom

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

    // Fix for prescriptions duplicate key error (prescriptionNumber)
    const prescriptionCollection = mongoose.connection.db.collection('prescriptions');
    const pIndexes = await prescriptionCollection.indexes();
    const pIndexExists = pIndexes.some(index => index.name === 'prescriptionNumber_1');
    if (pIndexExists) {
      await prescriptionCollection.dropIndex('prescriptionNumber_1');
      console.log("✅ SUCCESS: Old prescriptionNumber index deleted.");
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
app.use('/api/health', require('./routes/health')); // NEW: Symptom tracking & health logs
app.use('/api/records', require('./routes/records'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/smart-queue', require('./routes/smartQueue')); // NEW: Smart OPD Queue Manager
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/family', require('./routes/family'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/patient-records', require('./routes/patientRecords'));
app.use('/api/call-logs', require('./routes/callLogs'));
app.use('/api/patient-monitoring', require('./routes/patientMonitoring'));
app.use('/api/billing', require('./routes/billing'));          // Billing & Payments
app.use('/api/discharge', require('./routes/discharge'));      // Discharge Summaries
app.use('/api/prescriptions', require('./routes/prescriptions')); // Digital Prescriptions
app.use('/api/admin', require('./routes/admin'));

// 6. Test Route
app.get('/', (req, res) => res.send('API is Running...'));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// setup socket.io
const io = new Server(server, { cors: { origin: '*' } });

// Track which hospital rooms are currently in a call
// Key: hospital room id (e.g. "hospital_xxx"), Value: { callerSocketId, startedAt, callLogId, timeout }
const activeCalls = new Map();

// Helper: clear an active call for a hospital room
const clearActiveCall = async (room, reason) => {
  const callData = activeCalls.get(room);
  if (!callData) return;

  if (callData.timeout) clearTimeout(callData.timeout);

  if (callData.callLogId) {
    try {
      const duration = Math.round((Date.now() - callData.startedAt) / 1000);
      await CallLog.findByIdAndUpdate(callData.callLogId, {
        endedAt: new Date(),
        duration
      });
    } catch (e) { console.error('Failed to update call log on clear:', e); }
  }

  activeCalls.delete(room);
  console.log(`🟢 Hospital ${room} is now FREE (${reason})`);
};

// Helper: find the hospital room associated with a socket (as caller)
const findRoomByCallerSocket = (socketId) => {
  for (const [room, callData] of activeCalls.entries()) {
    if (callData.callerSocketId === socketId) return room;
  }
  return null;
};

// Helper: find the hospital room where the given socketId is the caller (by 'to' param which is the caller)
const findRoomByCallerTarget = (callerSocketId) => {
  for (const [room, callData] of activeCalls.entries()) {
    if (callData.callerSocketId === callerSocketId) return room;
  }
  return null;
};

io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);

  // clients should join room `user_<userId>` after authentication on client
  socket.on('join', (room) => {
    socket.join(room);
    console.log('✅ Socket joined room:', room, 'Socket ID:', socket.id);
  });

  // WebRTC Signaling for Audio/Video Calls — with busy-line detection & call logging
  socket.on('call:offer', async ({ to, offer, callType, callerName, callerUserId }) => {
    console.log(`📞 Call offer from ${socket.id} to ${to} (${callType}) callerName=${callerName} callerUserId=${callerUserId}`);

    // Extract hospital ID from room name (e.g. "hospital_abc123" -> "abc123")
    const hospitalIdMatch = to.match(/^hospital_(.+)$/);
    const hospitalId = hospitalIdMatch ? hospitalIdMatch[1] : null;

    // Check if the hospital is already on a call
    if (activeCalls.has(to)) {
      // Safety: if the existing call is stale (>2 min old and not answered), clear it
      const existing = activeCalls.get(to);
      const age = Date.now() - existing.startedAt;
      if (age > 120000) {
        console.log(`⚠️ Stale call detected for ${to} (${Math.round(age / 1000)}s old), clearing...`);
        await clearActiveCall(to, 'stale timeout');
      } else {
        console.log(`🔴 Hospital ${to} is BUSY — rejecting call from ${socket.id}`);

        // Log the busy/missed call
        if (hospitalId) {
          try {
            await CallLog.create({
              hospitalId,
              callerSocketId: socket.id,
              callerUserId: callerUserId || null,
              callerName: callerName || 'Unknown Patient',
              callType: callType || 'audio',
              status: 'BUSY',
              startedAt: new Date()
            });
          } catch (e) { console.error('Failed to log busy call:', e); }
        }

        // Tell the caller that the hospital is busy
        socket.emit('call:busy', { message: 'Hospital is currently on another call. Please try again later.' });
        return;
      }
    }

    // Mark the hospital as busy
    let callLogId = null;
    if (hospitalId) {
      try {
        const log = await CallLog.create({
          hospitalId,
          callerSocketId: socket.id,
          callerUserId: callerUserId || null,
          callerName: callerName || 'Unknown Patient',
          callType: callType || 'audio',
          status: 'MISSED', // default; will be updated to ANSWERED if the hospital picks up
          startedAt: new Date()
        });
        callLogId = log._id;
      } catch (e) { console.error('Failed to create call log:', e); }
    }

    // Auto-clear after 60s if call is never answered (ringing timeout)
    const ringingTimeout = setTimeout(async () => {
      if (activeCalls.has(to)) {
        const data = activeCalls.get(to);
        // Only auto-clear if still in MISSED state (not answered)
        if (data.callLogId === callLogId) {
          console.log(`⏰ Ringing timeout for ${to}, auto-clearing...`);
          await clearActiveCall(to, 'ringing timeout');
          // Notify both sides
          io.to(to).emit('call:end');
          socket.emit('call:end');
        }
      }
    }, 60000);

    activeCalls.set(to, { callerSocketId: socket.id, startedAt: Date.now(), callLogId, timeout: ringingTimeout });

    io.to(to).emit('call:offer', {
      from: socket.id,
      offer,
      callType,
      callerName: callerName || 'Patient',
      callerUserId: callerUserId || null
    });
  });

  socket.on('call:answer', async ({ to, answer }) => {
    console.log(`✅ Call answer from ${socket.id} to ${to}`);
    io.to(to).emit('call:answer', { answer });

    // Update the call log to ANSWERED and clear the ringing timeout
    const room = findRoomByCallerTarget(to);
    if (room) {
      const callData = activeCalls.get(room);
      if (callData) {
        if (callData.timeout) clearTimeout(callData.timeout);
        callData.timeout = null;
        if (callData.callLogId) {
          try {
            await CallLog.findByIdAndUpdate(callData.callLogId, {
              status: 'ANSWERED',
              answeredAt: new Date()
            });
          } catch (e) { console.error('Failed to update call log:', e); }
        }
      }
    }
  });

  socket.on('call:ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('call:ice-candidate', { candidate });
  });

  socket.on('call:end', async ({ to }) => {
    console.log(`📴 Call ended by ${socket.id}`);
    io.to(to).emit('call:end');

    // Clear active call — check if this socket is the caller
    const roomAsCaller = findRoomByCallerSocket(socket.id);
    if (roomAsCaller) {
      await clearActiveCall(roomAsCaller, 'caller ended');
    } else {
      // Hospital ended the call — 'to' is the caller socket ID
      const roomAsTarget = findRoomByCallerTarget(to);
      if (roomAsTarget) {
        await clearActiveCall(roomAsTarget, 'hospital ended');
      }
    }
  });

  socket.on('call:reject', async ({ to }) => {
    console.log(`❌ Call rejected by ${socket.id}`);
    io.to(to).emit('call:rejected');

    // Clear active call — 'to' is the caller socket ID
    const room = findRoomByCallerTarget(to);
    if (room) {
      const callData = activeCalls.get(room);
      if (callData && callLogId) {
        try {
          await CallLog.findByIdAndUpdate(callData.callLogId, {
            status: 'REJECTED',
            endedAt: new Date()
          });
        } catch (e) { console.error('Failed to update call log on reject:', e); }
      }
      if (callData && callData.timeout) clearTimeout(callData.timeout);
      activeCalls.delete(room);
      console.log(`🟢 Hospital ${room} is now FREE (call rejected)`);
    }
  });

  socket.on('call:rejected', ({ to }) => {
    console.log(`❌ Call rejected by ${socket.id} to ${to}`);
    io.to(to).emit('call:rejected');

    // Also clean up activeCalls
    const roomAsCaller = findRoomByCallerSocket(socket.id);
    if (roomAsCaller) {
      clearActiveCall(roomAsCaller, 'call:rejected cleanup');
    }
    const roomAsTarget = findRoomByCallerTarget(to);
    if (roomAsTarget) {
      clearActiveCall(roomAsTarget, 'call:rejected cleanup');
    }
  });

  // Check if a hospital is currently busy
  socket.on('call:check-busy', ({ hospitalRoom }, callback) => {
    const isBusy = activeCalls.has(hospitalRoom);
    if (typeof callback === 'function') {
      callback({ busy: isBusy });
    } else {
      socket.emit('call:busy-status', { hospitalRoom, busy: isBusy });
    }
  });

  socket.on('disconnect', async () => {
    console.log('❌ Socket disconnected:', socket.id);

    // Clean up any active calls involving this socket (as caller)
    const room = findRoomByCallerSocket(socket.id);
    if (room) {
      await clearActiveCall(room, 'caller disconnected');
      io.to(room).emit('call:end');
    }
  });
});
app.set('io', io);

// Start Server & Schedulers after DB connection
const startServer = async () => {
  try {
    await connectDB();

    // Start medicine reminder scheduler
    startReminderScheduler();

    // Start patient monitoring scheduler
    startMonitoringScheduler(io);

    server.listen(PORT, () => console.log(`🚀 Backend Server running on port ${PORT}`));
  } catch (err) {
    console.error('CRITICAL: Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();