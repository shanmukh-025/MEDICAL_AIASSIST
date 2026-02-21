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

    const { phone, workingHours, services, doctors, pharmacies, about, emergencyContact, address, logo, location, paymentInfo } = req.body;

    const updateFields = {};
    if (phone) updateFields.phone = phone;
    if (workingHours) updateFields.workingHours = workingHours;
    if (services) updateFields.services = services;
    if (doctors) updateFields.doctors = doctors;
    if (pharmacies) updateFields.pharmacies = pharmacies;
    if (about) updateFields.about = about;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;
    if (address) updateFields.address = address;
    if (logo) updateFields.logo = logo;
    if (location && location.latitude && location.longitude) {
      updateFields.location = {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude)
      };
    }
    if (paymentInfo) {
      updateFields['paymentInfo.upiId'] = paymentInfo.upiId || null;
      updateFields['paymentInfo.accountName'] = paymentInfo.accountName || null;
    }

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
        'location.latitude': { $exists: true, $ne: null },
        'location.longitude': { $exists: true, $ne: null }
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
    ).lean(); // Use lean() for faster read-only queries

    // Set cache headers so the browser can cache results for 60 seconds
    res.set('Cache-Control', 'public, max-age=60');
    res.json(hospitals);
  } catch (err) {
    console.error('❌ Error fetching registered hospitals:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
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
    const { logo, primaryColor, secondaryColor, accentColor, appName, upiId, accountName } = req.body;

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

    // Update payment info if provided
    if (upiId !== undefined) {
      if (!hospital.paymentInfo) hospital.paymentInfo = {};
      hospital.paymentInfo.upiId = upiId || null;
    }
    if (accountName !== undefined) {
      if (!hospital.paymentInfo) hospital.paymentInfo = {};
      hospital.paymentInfo.accountName = accountName || null;
    }

    await hospital.save();

    res.json({
      logo: hospital.branding.logo,
      primaryColor: hospital.branding.primaryColor,
      secondaryColor: hospital.branding.secondaryColor,
      accentColor: hospital.branding.accentColor,
      appName: hospital.branding.appName,
      hospitalName: hospital.name,
      upiId: hospital.paymentInfo?.upiId || null,
      accountName: hospital.paymentInfo?.accountName || null
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

// Search nearby hospitals by condition/specialty
router.post('/search-by-condition', async (req, res) => {
  try {
    const { latitude, longitude, specialties, maxDistance = 50 } = req.body;

    console.log('🏥 Hospital search request:', {
      hasLocation: !!(latitude && longitude),
      specialties,
      maxDistance
    });

    // Get all hospitals (don't require location - some may not have it set)
    const hospitals = await User.find({ role: 'HOSPITAL' });

    console.log(`📊 Found ${hospitals.length} total hospitals in database`);

    // Calculate distance and filter by specialty/service
    const hospitalResults = hospitals.map(hospital => {
      let distance = null;

      // Calculate distance only if both user and hospital locations are available
      if (latitude && longitude && hospital.location?.latitude && hospital.location?.longitude) {
        const lat1 = latitude * Math.PI / 180;
        const lat2 = hospital.location.latitude * Math.PI / 180;
        const deltaLat = (hospital.location.latitude - latitude) * Math.PI / 180;
        const deltaLon = (hospital.location.longitude - longitude) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = Math.round(6371 * c * 10) / 10;
      }

      // Check if hospital has any of the requested specialties (broad matching)
      let hasSpecialty = false;
      let matchScore = 0; // Higher = better match

      if (specialties && specialties.length > 0) {
        const hospitalServices = (hospital.services || []).map(s => s.toLowerCase());
        const doctorSpecialties = (hospital.doctors || []).map(d => d.specialty?.toLowerCase() || '').filter(Boolean);
        const allHospitalTerms = [...hospitalServices, ...doctorSpecialties];

        // Check each requested specialty for matches
        for (const specialty of specialties) {
          const specLower = specialty.toLowerCase();
          const specWords = specLower.split(/\s+/); // Split "General Physician" into ["general", "physician"]

          for (const term of allHospitalTerms) {
            // Exact match
            if (term === specLower) { hasSpecialty = true; matchScore += 10; continue; }
            // Contains match (e.g., "general" in "general medicine")
            if (term.includes(specLower) || specLower.includes(term)) { hasSpecialty = true; matchScore += 7; continue; }
            // Word-level match (e.g., "physician" matches "general physician")
            if (specWords.some(word => word.length > 3 && term.includes(word))) { hasSpecialty = true; matchScore += 5; continue; }
          }
        }

        if (hasSpecialty) {
          console.log(`✅ ${hospital.name} matches specialty filter (score: ${matchScore})`);
        }
      } else {
        hasSpecialty = true;
      }

      return {
        hospital: {
          _id: hospital._id,
          name: hospital.name,
          address: hospital.address,
          phone: hospital.phone,
          location: hospital.location,
          services: hospital.services,
          doctors: hospital.doctors,
          workingHours: hospital.workingHours,
          emergencyContact: hospital.emergencyContact,
          logo: hospital.logo
        },
        distance: distance,
        hasSpecialty,
        matchScore
      };
    });

    // First try: specialty-matched hospitals within distance
    let filtered = hospitalResults
      .filter(result => {
        if (!result.hasSpecialty) return false;
        if (result.distance !== null && maxDistance) return result.distance <= maxDistance;
        return true;
      });

    // Fallback: if no specialty matches found, show ALL hospitals (sorted by distance)
    if (filtered.length === 0) {
      console.log('⚠️ No specialty matches found - falling back to ALL hospitals');
      filtered = hospitalResults.filter(result => {
        if (result.distance !== null && maxDistance) return result.distance <= maxDistance;
        return true; // Include all if no distance
      });
    }

    // Sort: specialty matches first (by score), then by distance
    filtered.sort((a, b) => {
      // Specialty matches always come first
      if (a.hasSpecialty && !b.hasSpecialty) return -1;
      if (!a.hasSpecialty && b.hasSpecialty) return 1;
      // Among same specialty status, sort by match score (higher first)
      if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
      // Then by distance
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return a.hospital.name.localeCompare(b.hospital.name);
    });

    // Clean up internal fields before sending
    const results = filtered.map(({ matchScore, hasSpecialty, ...rest }) => rest);

    console.log(`✅ Returning ${results.length} hospitals (${filtered.filter(f => f.hasSpecialty).length} specialty matches)`);
    res.json(results);
  } catch (err) {
    console.error('❌ Hospital search error:', err.message);
    res.status(500).send('Server Error');
  }
});

// Add or link a doctor to the hospital
router.post('/doctors', auth, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const { name, email, specialty, qualification, experience, password } = req.body;

    // 1. Check if caller is a hospital
    const hospital = await User.findById(hospitalId);
    if (!hospital || hospital.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospitals can add doctors' });
    }

    // 2. Validate input
    if (!name || !email) {
      return res.status(400).json({ msg: 'Name and email are required' });
    }

    // 3. Check if doctor already exists
    let doctorUser = await User.findOne({ email });

    try {
      if (doctorUser) {
        // If user exists, update their role and link to hospital
        doctorUser.role = 'DOCTOR';
        doctorUser.hospitalId = hospitalId;
        // Update other fields if provided
        if (name) doctorUser.name = name;
        await doctorUser.save();
      } else {
        // Create new doctor user
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || 'doctor123', salt);

        doctorUser = new User({
          name,
          email,
          password: hashedPassword,
          role: 'DOCTOR',
          hospitalId: hospitalId
        });
        await doctorUser.save();
      }
    } catch (dbErr) {
      console.error('❌ Error saving doctor user:', dbErr.message);
      return res.status(400).json({ msg: 'Database error: ' + dbErr.message });
    }

    // 4. Update or add to the doctors list in the hospital profile
    const docIdx = hospital.doctors.findIndex(d => d.email === email);
    if (docIdx !== -1) {
      // Update existing entry
      hospital.doctors[docIdx].name = name || hospital.doctors[docIdx].name;
      hospital.doctors[docIdx].specialty = specialty || hospital.doctors[docIdx].specialty;
      hospital.doctors[docIdx].qualification = qualification || hospital.doctors[docIdx].qualification;
      hospital.doctors[docIdx].experience = experience || hospital.doctors[docIdx].experience;
      hospital.doctors[docIdx].userId = doctorUser._id;
      hospital.doctors[docIdx].isRegistered = true;
    } else {
      // Add new entry
      hospital.doctors.push({
        userId: doctorUser._id,
        name,
        specialty,
        qualification,
        experience,
        email,
        isRegistered: true
      });
    }

    try {
      await hospital.save();
    } catch (hospErr) {
      console.error('❌ Error updating hospital doctors:', hospErr.message);
      return res.status(400).json({ msg: 'Hospital update error: ' + hospErr.message });
    }

    res.json({ msg: 'Doctor registered and linked successfully', doctor: doctorUser });
  } catch (err) {
    console.error('❌ General registration error:', err.message);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// Add or link a pharmacy to the hospital
router.post('/pharmacies', auth, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const { name, email, password } = req.body;

    const hospital = await User.findById(hospitalId);
    if (!hospital || hospital.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospitals can add pharmacies' });
    }

    let pharmacyUser = await User.findOne({ email });

    if (pharmacyUser) {
      pharmacyUser.role = 'PHARMACY';
      pharmacyUser.hospitalId = hospitalId;
      if (name) pharmacyUser.name = name;
      await pharmacyUser.save();
    } else {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password || 'pharmacy123', salt);

      pharmacyUser = new User({
        name,
        email,
        password: hashedPassword,
        role: 'PHARMACY',
        hospitalId: hospitalId
      });
      await pharmacyUser.save();
    }

    // Update hospital's pharmacies list
    const pharmIdx = hospital.pharmacies.findIndex(p => p.email === email);
    if (pharmIdx !== -1) {
      hospital.pharmacies[pharmIdx].name = name || hospital.pharmacies[pharmIdx].name;
      hospital.pharmacies[pharmIdx].userId = pharmacyUser._id;
      hospital.pharmacies[pharmIdx].isRegistered = true;
    } else {
      hospital.pharmacies.push({
        userId: pharmacyUser._id,
        name,
        email,
        isRegistered: true
      });
    }
    await hospital.save();

    res.json({ msg: 'Pharmacy registered and linked successfully', pharmacy: pharmacyUser });
  } catch (err) {
    console.error('❌ Pharmacy registration error:', err.message);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// Remove/Unlink a doctor
router.delete('/doctors/:id', auth, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const hospital = await User.findById(hospitalId);
    if (!hospital || hospital.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospitals can manage staff' });
    }

    hospital.doctors = hospital.doctors.filter(d => d._id.toString() !== req.params.id);
    await hospital.save();

    res.json({ msg: 'Doctor removed from hospital list', doctors: hospital.doctors });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Remove/Unlink a pharmacy
router.delete('/pharmacies/:id', auth, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const hospital = await User.findById(hospitalId);
    if (!hospital || hospital.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Only hospitals can manage pharmacies' });
    }

    hospital.pharmacies = hospital.pharmacies.filter(p => p._id.toString() !== req.params.id);
    await hospital.save();

    res.json({ msg: 'Pharmacy removed from hospital list', pharmacies: hospital.pharmacies });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
