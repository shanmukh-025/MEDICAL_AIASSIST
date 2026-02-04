const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const HospitalNotification = require('../models/HospitalNotification');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'hospital-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get current hospital's profile
router.get('/profile', auth, async (req, res) => {
  try {
    const hospital = await User.findById(req.user.id).select('-password');
    if (!hospital || hospital.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    res.json(hospital);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update hospital profile
router.put('/profile', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { phone, workingHours, services, doctors, about, emergencyContact, address, logo } = req.body;

    const updateFields = {};
    if (phone) updateFields.phone = phone;
    if (workingHours) updateFields.workingHours = workingHours;
    if (services) updateFields.services = services;
    if (doctors) updateFields.doctors = doctors;
    if (about) updateFields.about = about;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;
    if (address) updateFields.address = address;
    if (logo) updateFields.logo = logo;
    
    console.log('🔄 Updating hospital profile - User ID:', req.user.id);
    console.log('🔄 Logo in request:', logo);
    console.log('🔄 Update fields:', updateFields);

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    console.log('✅ Profile updated - Logo in DB:', updated.logo);

    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Upload hospital logo
router.post('/upload-logo', auth, upload.single('logo'), async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Generate logo URL (in production, this would be your CDN/storage URL)
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    console.log('📸 Logo upload - User ID:', req.user.id);
    console.log('📸 File:', req.file.filename);
    console.log('📸 Logo URL:', logoUrl);

    // Update user's logo field
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { logo: logoUrl } },
      { new: true }
    );
    
    console.log('📸 Updated user logo field:', updatedUser.logo);

    res.json({ logoUrl, success: true });
  } catch (err) {
    console.error('Logo upload error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// Get all registered hospitals with locations (for map display)
router.get('/registered', async (req, res) => {
  try {
    const hospitals = await User.find(
      { 
        role: 'HOSPITAL',
        'location.latitude': { $exists: true },
        'location.longitude': { $exists: true }
      },
      {
        name: 1,
        address: 1,
        location: 1,
        email: 1,
        phone: 1,
        workingHours: 1,
        services: 1,
        doctors: 1,
        about: 1,
        emergencyContact: 1,
        logo: 1  // Include logo field
      }
    );
    
    res.json(hospitals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get hospital branding
router.get('/:id/branding', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ msg: 'Hospital not found' });
    
    res.json({
      logo: hospital.branding?.logo || null,
      primaryColor: hospital.branding?.primaryColor || '#059669',
      secondaryColor: hospital.branding?.secondaryColor || '#10b981',
      accentColor: hospital.branding?.accentColor || '#34d399',
      appName: hospital.branding?.appName || 'VillageMed',
      hospitalName: hospital.name
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update hospital branding
router.put('/:id/branding', auth, async (req, res) => {
  try {
    const { logo, primaryColor, secondaryColor, accentColor, appName } = req.body;
    
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ msg: 'Hospital not found' });
    
    // Update branding
    hospital.branding = {
      logo: logo || hospital.branding?.logo,
      primaryColor: primaryColor || hospital.branding?.primaryColor || '#059669',
      secondaryColor: secondaryColor || hospital.branding?.secondaryColor || '#10b981',
      accentColor: accentColor || hospital.branding?.accentColor || '#34d399',
      appName: appName || hospital.branding?.appName || 'VillageMed'
    };
    
    await hospital.save();
    
    res.json({
      logo: hospital.branding.logo,
      primaryColor: hospital.branding.primaryColor,
      secondaryColor: hospital.branding.secondaryColor,
      accentColor: hospital.branding.accentColor,
      appName: hospital.branding.appName,
      hospitalName: hospital.name
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Upload hospital logo
router.post('/:id/logo', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }
    
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ msg: 'Hospital not found' });
    
    // Save logo URL
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    if (!hospital.branding) {
      hospital.branding = {};
    }
    hospital.branding.logo = logoUrl;
    
    await hospital.save();
    
    res.json({ logo: logoUrl, msg: 'Logo uploaded successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get hospital by name
router.get('/name/:name', async (req, res) => {
  try {
    const hosp = await Hospital.findOne({ name: req.params.name });
    if (!hosp) return res.status(404).json({ msg: 'Hospital not found' });
    res.json(hosp);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get notifications for a hospital by hospital id
router.get('/:id/notifications', async (req, res) => {
  try {
    const notifications = await HospitalNotification.find({ hospital: req.params.id }).sort({ createdAt: -1 }).populate('appointment');
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
