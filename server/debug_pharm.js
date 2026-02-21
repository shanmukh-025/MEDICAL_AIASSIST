const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const debugPharmacies = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospital = await User.findOne({ email: 'test@gmail.com' });
        if (hospital) {
            console.log(`Hospital ID: ${hospital._id}, Email: ${hospital.email}`);
            hospital.pharmacies.forEach((p, i) => {
                console.log(`[${i}] ID: ${p._id}, UserID: ${p.userId}, Email: ${p.email}`);
            });
        } else {
            console.log('Hospital not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugPharmacies();
