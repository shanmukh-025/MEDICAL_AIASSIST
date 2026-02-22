const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Record = require('./models/Record');
const HealthLog = require('./models/HealthLog');

const debugStats = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const patients = await User.countDocuments({ role: 'PATIENT' });
        const hospitals = await User.countDocuments({ role: 'HOSPITAL' });
        const doctors = await User.countDocuments({ role: 'DOCTOR' });
        const records = await Record.countDocuments();
        const healthLogs = await HealthLog.countDocuments();

        console.log('--- PLATFORM STATS ---');
        console.log('Patients:', patients);
        console.log('Hospitals:', hospitals);
        console.log('Doctors:', doctors);
        console.log('Medical Records:', records);
        console.log('Health Logs:', healthLogs);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugStats();
