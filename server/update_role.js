const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const updateRole = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOneAndUpdate(
            { email: 'test@gmail.com' },
            { role: 'HOSPITAL' },
            { new: true }
        );
        if (user) {
            console.log(`Updated successfully! User: ${user.email}, New Role: ${user.role}`);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateRole();
