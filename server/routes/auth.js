const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { sendResetEmail } = require('../utils/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// GOOGLE AUTH
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with Google data
      user = new User({
        name,
        email,
        password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
        role: 'PATIENT',
        googleId: payload.sub,
        photoUrl: picture
      });
      await user.save();
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl,
        hospitalId: user.hospitalId
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    // 1. Check if user exists
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) return res.status(400).json({ message: "Email already exists" });

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // 3. Create User
    const userData = {
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role || 'PATIENT'
    };

    // Add phone if provided
    if (req.body.phone) {
      userData.phone = req.body.phone;

      // Add verification status if provided
      if (req.body.phoneVerified) {
        userData.phoneVerified = true;
        userData.phoneVerificationUid = req.body.phoneVerificationUid;
        userData.phoneVerifiedAt = new Date();
      }
    }

    // Add hospital-specific fields if role is HOSPITAL
    if (req.body.role === 'HOSPITAL') {
      if (req.body.address) userData.address = req.body.address;
      if (req.body.location) userData.location = req.body.location;
    }

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    // 4. Create Token
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET);

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    // 1. Find User
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // 2. Check Password
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(400).json({ message: "Invalid password" });

    // 3. Create Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'PATIENT',
        hospitalId: user.hospitalId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY TOKEN (for auto-login)
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(verified.id).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Create a reset token
    const token = crypto.randomBytes(20).toString('hex');

    // Set token and expiry on user model
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

    // Attempt to send real email if credentials exist
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendResetEmail(user.email, resetUrl, user.name);
        return res.json({ message: 'Password reset link has been sent to your email.' });
      } catch (mailError) {
        console.error('❌ Mail Service Error:', mailError.message);
        // Fallback to console log in dev if mail fails
        console.log(`🔑 FALLBACK RESET LINK: ${resetUrl}`);
        return res.status(200).json({
          message: 'Mail service unavailable, but link generated.',
          devLink: process.env.NODE_ENV === 'development' ? resetUrl : undefined
        });
      }
    }

    // Default development behavior: log to console
    console.log(`🔑 [DEV-MODE] PASSWORD RESET LINK: ${resetUrl}`);
    res.json({ message: 'Password reset link generated. Check server logs (Dev Mode).' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// RESET PASSWORD
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
