// Reset queue numbers for today's appointments
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');

mongoose.connect('mongodb://localhost:27017/village-health-assistant', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function resetQueue() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Reset queue numbers for today's appointments (except completed/cancelled)
    const result = await Appointment.updateMany(
      { 
        appointmentDate: today,
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] }
      },
      { 
        $unset: { queueNumber: '', tokenNumber: '' }
      }
    );
    
    console.log(`✓ Reset ${result.modifiedCount} appointments`);
    console.log('Next time you open the hospital dashboard, queue numbers will be assigned by appointment time.');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

resetQueue();
