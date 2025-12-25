const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import middleware
const Appointment = require('../models/Appointment');

// @route   GET api/appointments
// @desc    Get all appointments for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Find appointments where user ID matches the token ID
    const appointments = await Appointment.find({ user: req.user.id }).sort({ date: -1 });
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/appointments
// @desc    Add new appointment
// @access  Private
router.post('/', auth, async (req, res) => {
  const { doctor, hospital, specialty, date, time } = req.body;

  try {
    const newAppointment = new Appointment({
      user: req.user.id, // Get ID from Token
      doctor,
      hospital,
      specialty,
      date,
      time
    });

    const appointment = await newAppointment.save();
    res.json(appointment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/appointments/:id
// @desc    Cancel appointment
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    let appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Appointment not found' });

    // Ensure user owns this appointment
    if (appointment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Appointment Removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;