const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Record = require('../models/Record');

// @route   GET api/records
// @desc    Get all records for the user
router.get('/', auth, async (req, res) => {
  try {
    const records = await Record.find({ user: req.user.id }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/records
// @desc    Add a new record
router.post('/', auth, async (req, res) => {
  try {
    // UPDATED: Destructure 'image' instead of 'fileData'
    const { title, doctor, type, date, image } = req.body;
    
    const newRecord = new Record({
      user: req.user.id,
      title,
      doctor,
      type,
      date,
      image // UPDATED: Matches the new Schema field
    });

    const record = await newRecord.save();
    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/records/:id
// @desc    Delete a record
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);

    // Check if record exists
    if (!record) {
      return res.status(404).json({ msg: 'Record not found' });
    }

    // Check user (Make sure user owns the record)
    if (record.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Record.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Record removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;