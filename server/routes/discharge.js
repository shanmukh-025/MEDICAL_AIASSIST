const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Hospital = require('../models/Hospital');

// @route   POST /api/discharge/appointments/:appointmentId
// @desc    Discharge a patient from hospital
// @access  Private (Hospital Admin/Doctor)
router.post('/appointments/:appointmentId', auth, async (req, res) => {
  try {
    const { 
      dischargeSummary, 
      medications, 
      followUpInstructions, 
      followUpDate,
      dischargeType,
      finalDiagnosis
    } = req.body;

    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('hospitalId', 'name address')
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization - must be hospital admin or the assigned doctor
    const user = await User.findById(req.user.id);
    const isHospitalAdmin = user.role === 'hospital_admin' && 
                           appointment.hospitalId._id.toString() === user.hospitalId?.toString();
    const isDoctor = user.role === 'doctor' && 
                    appointment.doctorId?._id.toString() === req.user.id;

    if (!isHospitalAdmin && !isDoctor && user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized to discharge patient' });
    }

    // Update appointment with discharge information
    appointment.status = 'discharged';
    appointment.dischargeInfo = {
      dischargeDate: new Date(),
      dischargeType: dischargeType || 'regular',
      finalDiagnosis: finalDiagnosis || appointment.reason || 'Not specified',
      dischargeSummary: dischargeSummary || '',
      medications: medications || [],
      followUpInstructions: followUpInstructions || '',
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      dischargedBy: req.user.id
    };

    await appointment.save();

    res.json({
      success: true,
      message: 'Patient discharged successfully',
      discharge: {
        appointmentId: appointment._id,
        patient: appointment.patientId,
        hospital: appointment.hospitalId,
        doctor: appointment.doctorId,
        dischargeDate: appointment.dischargeInfo.dischargeDate,
        dischargeType: appointment.dischargeInfo.dischargeType,
        finalDiagnosis: appointment.dischargeInfo.finalDiagnosis,
        followUpDate: appointment.dischargeInfo.followUpDate
      }
    });
  } catch (error) {
    console.error('Error discharging patient:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/discharge/appointments/:appointmentId/summary
// @desc    Get discharge summary for an appointment
// @access  Private
router.get('/appointments/:appointmentId/summary', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('hospitalId', 'name address phone email')
      .populate('patientId', 'name email phone dateOfBirth gender bloodGroup')
      .populate('doctorId', 'name specialization')
      .populate('dischargeInfo.dischargedBy', 'name role');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization
    const user = await User.findById(req.user.id);
    const isPatient = appointment.patientId._id.toString() === req.user.id;
    const isHospitalStaff = user.role === 'hospital_admin' || user.role === 'doctor' || user.role === 'super_admin';

    if (!isPatient && !isHospitalStaff) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (appointment.status !== 'discharged' && !isHospitalStaff) {
      return res.status(400).json({ message: 'Patient has not been discharged yet' });
    }

    const dischargeSummary = {
      hospital: appointment.hospitalId,
      patient: appointment.patientId,
      doctor: appointment.doctorId,
      admissionDate: appointment.date,
      dischargeDate: appointment.dischargeInfo?.dischargeDate,
      dischargeType: appointment.dischargeInfo?.dischargeType || 'regular',
      finalDiagnosis: appointment.dischargeInfo?.finalDiagnosis || appointment.reason,
      dischargeSummary: appointment.dischargeInfo?.dischargeSummary || '',
      medications: appointment.dischargeInfo?.medications || [],
      followUpInstructions: appointment.dischargeInfo?.followUpInstructions || '',
      followUpDate: appointment.dischargeInfo?.followUpDate,
      dischargedBy: appointment.dischargeInfo?.dischargedBy,
      billing: {
        consultationFee: appointment.consultationFee || 500,
        additionalCharges: appointment.additionalCharges || 0,
        totalAmount: ((appointment.consultationFee || 500) + (appointment.additionalCharges || 0)) * 1.18,
        paymentStatus: appointment.paymentStatus
      }
    };

    res.json(dischargeSummary);
  } catch (error) {
    console.error('Error fetching discharge summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/discharge/hospital/:hospitalId
// @desc    Get all discharged patients for a hospital
// @access  Private (Hospital Admin)
router.get('/hospital/:hospitalId', auth, async (req, res) => {
  try {
    // Check authorization
    const user = await User.findById(req.user.id);
    if (user.role !== 'hospital_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (user.role === 'hospital_admin' && user.hospitalId?.toString() !== req.params.hospitalId) {
      return res.status(403).json({ message: 'Not authorized for this hospital' });
    }

    const dischargedPatients = await Appointment.find({
      hospitalId: req.params.hospitalId,
      status: 'discharged'
    })
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization')
      .sort({ 'dischargeInfo.dischargeDate': -1 });

    const dischargeList = dischargedPatients.map(apt => ({
      appointmentId: apt._id,
      patient: apt.patientId,
      doctor: apt.doctorId,
      admissionDate: apt.date,
      dischargeDate: apt.dischargeInfo?.dischargeDate,
      dischargeType: apt.dischargeInfo?.dischargeType,
      finalDiagnosis: apt.dischargeInfo?.finalDiagnosis,
      followUpDate: apt.dischargeInfo?.followUpDate,
      paymentStatus: apt.paymentStatus
    }));

    res.json({
      count: dischargeList.length,
      discharges: dischargeList
    });
  } catch (error) {
    console.error('Error fetching discharged patients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/discharge/patient/history
// @desc    Get discharge history for current patient
// @access  Private
router.get('/patient/history', auth, async (req, res) => {
  try {
    const dischargeHistory = await Appointment.find({
      patientId: req.user.id,
      status: 'discharged'
    })
      .populate('hospitalId', 'name address phone')
      .populate('doctorId', 'name specialization')
      .sort({ 'dischargeInfo.dischargeDate': -1 });

    const history = dischargeHistory.map(apt => ({
      appointmentId: apt._id,
      hospital: apt.hospitalId,
      doctor: apt.doctorId,
      admissionDate: apt.date,
      dischargeDate: apt.dischargeInfo?.dischargeDate,
      dischargeType: apt.dischargeInfo?.dischargeType,
      finalDiagnosis: apt.dischargeInfo?.finalDiagnosis,
      followUpDate: apt.dischargeInfo?.followUpDate,
      dischargeSummary: apt.dischargeInfo?.dischargeSummary
    }));

    res.json({
      count: history.length,
      discharges: history
    });
  } catch (error) {
    console.error('Error fetching patient discharge history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/discharge/appointments/:appointmentId
// @desc    Update discharge information
// @access  Private (Hospital Admin/Doctor)
router.put('/appointments/:appointmentId', auth, async (req, res) => {
  try {
    const {
      dischargeSummary,
      medications,
      followUpInstructions,
      followUpDate
    } = req.body;

    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'discharged') {
      return res.status(400).json({ message: 'Patient has not been discharged yet' });
    }

    // Check authorization
    const user = await User.findById(req.user.id);
    const isHospitalAdmin = user.role === 'hospital_admin' && 
                           appointment.hospitalId.toString() === user.hospitalId?.toString();
    const isDoctor = user.role === 'doctor' && 
                    appointment.doctorId?.toString() === req.user.id;

    if (!isHospitalAdmin && !isDoctor && user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update discharge info
    if (dischargeSummary !== undefined) {
      appointment.dischargeInfo.dischargeSummary = dischargeSummary;
    }
    if (medications !== undefined) {
      appointment.dischargeInfo.medications = medications;
    }
    if (followUpInstructions !== undefined) {
      appointment.dischargeInfo.followUpInstructions = followUpInstructions;
    }
    if (followUpDate !== undefined) {
      appointment.dischargeInfo.followUpDate = followUpDate ? new Date(followUpDate) : null;
    }

    await appointment.save();

    res.json({
      success: true,
      message: 'Discharge information updated successfully',
      dischargeInfo: appointment.dischargeInfo
    });
  } catch (error) {
    console.error('Error updating discharge info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
