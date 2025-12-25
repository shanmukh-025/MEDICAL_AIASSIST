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
    res.status(500).send('Server Error');
  }
});

// @route   POST api/records
// @desc    Add a new record
router.post('/', auth, async (req, res) => {
  try {
    const { title, doctor, type, date, fileData } = req.body;
    
    const newRecord = new Record({
      user: req.user.id,
      title,
      doctor,
      type,
      date,
      fileData
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
    await Record.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Record removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;