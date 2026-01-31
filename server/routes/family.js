const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FamilyMember = require('../models/FamilyMember');
const multer = require('multer');
const path = require('path');

// Multer storage for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// @route   GET api/family
// @desc    Get all family members for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const members = await FamilyMember.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/family/:id/documents
// @desc    Upload document for family member
router.post('/:id/documents', auth, upload.single('document'), async (req, res) => {
  try {
    const member = await FamilyMember.findOne({ _id: req.params.id, user: req.user.id });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const document = {
      name: req.body.name || req.file.originalname,
      url: `/uploads/${req.file.filename}`
    };

    member.documents.push(document);
    await member.save();
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/family/:id/documents/:docId
// @desc    Delete document from family member
router.delete('/:id/documents/:docId', auth, async (req, res) => {
  try {
    const member = await FamilyMember.findOne({ _id: req.params.id, user: req.user.id });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    member.documents = member.documents.filter(doc => doc._id.toString() !== req.params.docId);
    await member.save();
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/family
// @desc    Add a new family member
router.post('/', auth, async (req, res) => {
  try {
    const { name, relationship, age, gender, bloodGroup, allergies, chronicConditions, emergencyContact, photoUrl, dateOfBirth } = req.body;

    const newMember = new FamilyMember({
      user: req.user.id,
      name,
      relationship,
      age,
      gender,
      bloodGroup,
      allergies,
      chronicConditions,
      emergencyContact,
      photoUrl,
      dateOfBirth
    });

    const member = await newMember.save();
    res.json(member);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/family/:id
// @desc    Update a family member
router.put('/:id', auth, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ msg: 'Family member not found' });
    }

    // Check user owns this family member
    if (member.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { name, relationship, age, gender, bloodGroup, allergies, chronicConditions, emergencyContact, photoUrl, dateOfBirth } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (relationship) updateFields.relationship = relationship;
    if (age !== undefined) updateFields.age = age;
    if (gender) updateFields.gender = gender;
    if (bloodGroup) updateFields.bloodGroup = bloodGroup;
    if (allergies) updateFields.allergies = allergies;
    if (chronicConditions) updateFields.chronicConditions = chronicConditions;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;
    if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;
    if (dateOfBirth) updateFields.dateOfBirth = dateOfBirth;

    const updated = await FamilyMember.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/family/:id
// @desc    Delete a family member
router.delete('/:id', auth, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ msg: 'Family member not found' });
    }

    // Check user owns this family member
    if (member.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await FamilyMember.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Family member removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
