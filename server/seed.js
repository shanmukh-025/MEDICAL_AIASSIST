const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const seedUsers = async () => {
  await connectDB();

  try {
    // Create a patient user
    const patientExists = await User.findOne({ email: 'patient@test.com' });
    let patient;
    if (!patientExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPwd = await bcrypt.hash('password123', salt);
      patient = await User.create({
        name: 'Test Patient',
        email: 'patient@test.com',
        password: hashedPwd,
        role: 'PATIENT'
      });
      console.log('✅ Patient created:', patient.email, '| ID:', patient._id);
    } else {
      patient = patientExists;
      console.log('ℹ️  Patient already exists:', patient.email, '| ID:', patient._id);
    }

    // Create a hospital user
    const hospitalExists = await User.findOne({ email: 'hospital@test.com' });
    let hospital;
    if (!hospitalExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPwd = await bcrypt.hash('password123', salt);
      hospital = await User.create({
        name: 'Test Hospital',
        email: 'hospital@test.com',
        password: hashedPwd,
        role: 'HOSPITAL',
        contactEmail: 'hospital@test.com'
      });
      console.log('✅ Hospital created:', hospital.email, '| ID:', hospital._id);
    } else {
      hospital = hospitalExists;
      console.log('ℹ️  Hospital already exists:', hospital.email, '| ID:', hospital._id);
    }

    console.log('\n📝 Use these credentials to test:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PATIENT LOGIN:');
    console.log('  Email: patient@test.com');
    console.log('  Password: password123');
    console.log('  ID:', patient._id.toString());
    console.log('');
    console.log('HOSPITAL LOGIN:');
    console.log('  Email: hospital@test.com');
    console.log('  Password: password123');
    console.log('  ID:', hospital._id.toString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err.message);
    process.exit(1);
  }
};

seedUsers();
