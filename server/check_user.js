const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'test@gmail.com' });
        if (user) {
            console.log(`User: ${user.email}, Role: ${user.role}`);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUser();
