const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Record = require('../models/Record');
const User = require('../models/User');

// GET /api/patient-records/hospital
// Hospital fetches all completed/confirmed visits grouped by doctor & date
// Supports query params: ?search=name&date=2026-02-12&doctor=Shantanu
router.get('/hospital', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { search, date, doctor } = req.query;

    // Build query for this hospital's appointments
    const query = {
      $or: [
        { hospitalId: caller._id },
        { hospitalName: caller.name }
      ],
      status: { $in: ['COMPLETED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] }
    };

    // Filter by date if provided
    if (date) {
      query.appointmentDate = date;
    }

    // Filter by doctor if provided
    if (doctor && doctor !== 'all') {
      query.doctor = { $regex: new RegExp(doctor, 'i') };
    }

    let appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .populate('patientId', 'name email phone')
      .lean();

    // Filter by patient name search if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      appointments = appointments.filter(a => {
        const pName = a.patientName || a.patientId?.name || '';
        const pEmail = a.patientId?.email || '';
        const pPhone = a.phone || a.patientId?.phone || '';
        return searchRegex.test(pName) || searchRegex.test(pEmail) || searchRegex.test(pPhone);
      });
    }

    // Get records linked to these appointments
    const appointmentIds = appointments.map(a => a._id);
    const records = await Record.find({
      appointmentId: { $in: appointmentIds }
    }).lean();

    // Map records to their appointment
    const recordsByAppointment = {};
    records.forEach(r => {
      const key = r.appointmentId?.toString();
      if (key) {
        if (!recordsByAppointment[key]) recordsByAppointment[key] = [];
        recordsByAppointment[key].push(r);
      }
    });

    // Also get any records sent by this hospital (even without appointmentId)
    const hospitalRecords = await Record.find({
      hospitalId: caller._id,
      sentByHospital: true
    }).lean();

    // Map hospital records to patient for lookup
    const recordsByPatient = {};
    hospitalRecords.forEach(r => {
      const key = r.user?.toString();
      if (key) {
        if (!recordsByPatient[key]) recordsByPatient[key] = [];
        recordsByPatient[key].push(r);
      }
    });

    // Attach records to appointments
    const enrichedAppointments = appointments.map(a => ({
      ...a,
      records: recordsByAppointment[a._id.toString()] || [],
      allPatientRecords: a.patientId ? (recordsByPatient[a.patientId._id?.toString()] || []) : []
    }));

    // Group by doctor
    const groupedByDoctor = {};
    enrichedAppointments.forEach(a => {
      const doc = a.doctor || 'Unassigned';
      if (!groupedByDoctor[doc]) groupedByDoctor[doc] = [];
      groupedByDoctor[doc].push(a);
    });

    // Group by date
    const groupedByDate = {};
    enrichedAppointments.forEach(a => {
      const d = a.appointmentDate || 'Unknown';
      if (!groupedByDate[d]) groupedByDate[d] = [];
      groupedByDate[d].push(a);
    });

    // Get unique doctors
    const doctors = [...new Set(appointments.map(a => a.doctor).filter(Boolean))];

    // Get unique dates
    const dates = [...new Set(appointments.map(a => a.appointmentDate).filter(Boolean))].sort().reverse();

    res.json({
      appointments: enrichedAppointments,
      groupedByDoctor,
      groupedByDate,
      doctors,
      dates,
      total: enrichedAppointments.length
    });
  } catch (err) {
    console.error('Error fetching patient records:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// GET /api/patient-records/patient/:patientId
// Get full visit history for a specific patient at this hospital
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id).select('-password');
    if (!caller || caller.role !== 'HOSPITAL') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { patientId } = req.params;

    // Get all appointments for this patient at this hospital
    const appointments = await Appointment.find({
      $or: [
        { hospitalId: caller._id },
        { hospitalName: caller.name }
      ],
      $or: [
        { patientId: patientId },
        { patientName: { $exists: true } }
      ]
    }).sort({ appointmentDate: -1 }).populate('patientId', 'name email phone').lean();

    // Filter by actual patient ID
    const patientAppointments = appointments.filter(a => 
      a.patientId?._id?.toString() === patientId
    );

    // Get all records for this patient from this hospital
    const records = await Record.find({
      user: patientId,
      $or: [
        { hospitalId: caller._id },
        { sentByHospital: true, hospitalName: caller.name }
      ]
    }).sort({ date: -1 }).lean();

    // Patient info
    const patient = await User.findById(patientId).select('name email phone');

    res.json({
      patient,
      appointments: patientAppointments,
      records,
      totalVisits: patientAppointments.length,
      totalRecords: records.length
    });
  } catch (err) {
    console.error('Error fetching patient history:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
