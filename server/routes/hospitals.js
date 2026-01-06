const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const HospitalNotification = require('../models/HospitalNotification');
const User = require('../models/User');
const auth = require('../middleware/auth');

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

    const { phone, workingHours, services, doctors, about, emergencyContact, address } = req.body;

    const updateFields = {};
    if (phone) updateFields.phone = phone;
    if (workingHours) updateFields.workingHours = workingHours;
    if (services) updateFields.services = services;
    if (doctors) updateFields.doctors = doctors;
    if (about) updateFields.about = about;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;
    if (address) updateFields.address = address;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
        emergencyContact: 1
      }
    );
    
    res.json(hospitals);
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
