const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

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
        photoUrl: user.photoUrl
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
        role: user.role || 'PATIENT'
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

module.exports = router;