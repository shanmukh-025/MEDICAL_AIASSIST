const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @route   GET /api/billing/appointments/:appointmentId
// @desc    Get billing details for an appointment
// @access  Private
router.get('/appointments/:appointmentId', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('hospitalId', 'name address phone')
      .populate('doctorId', 'name specialization');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId.toString() !== req.user.id && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Calculate billing details
    const consultationFee = appointment.consultationFee || 500;
    const additionalCharges = appointment.additionalCharges || 0;
    const totalAmount = consultationFee + additionalCharges;

    const billingDetails = {
      appointmentId: appointment._id,
      hospital: appointment.hospitalId,
      doctor: appointment.doctorId,
      appointmentDate: appointment.date,
      status: appointment.status,
      services: [
        {
          name: 'Consultation',
          description: `Consultation with ${appointment.doctorId?.name || 'Doctor'}`,
          amount: consultationFee
        }
      ],
      additionalCharges: additionalCharges > 0 ? {
        description: appointment.additionalChargesDescription || 'Additional Services',
        amount: additionalCharges
      } : null,
      subtotal: totalAmount,
      tax: totalAmount * 0.18, // 18% GST
      total: totalAmount * 1.18,
      paymentStatus: appointment.paymentStatus || 'pending',
      paymentMethod: appointment.paymentMethod || null,
      paidAt: appointment.paidAt || null
    };

    res.json(billingDetails);
  } catch (error) {
    console.error('Error fetching billing details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/billing/appointments/:appointmentId/pay
// @desc    Process payment for an appointment
// @access  Private
router.post('/appointments/:appointmentId/pay', auth, async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update payment status
    appointment.paymentStatus = 'paid';
    appointment.paymentMethod = paymentMethod || 'online';
    appointment.paidAt = new Date();
    await appointment.save();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      appointment: {
        id: appointment._id,
        paymentStatus: appointment.paymentStatus,
        paidAt: appointment.paidAt
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/billing/history
// @desc    Get billing history for current user
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.user.id,
      paymentStatus: { $in: ['paid', 'pending'] }
    })
      .populate('hospitalId', 'name address')
      .populate('doctorId', 'name specialization')
      .sort({ date: -1 });

    const billingHistory = appointments.map(apt => ({
      appointmentId: apt._id,
      hospital: apt.hospitalId,
      doctor: apt.doctorId,
      date: apt.date,
      status: apt.status,
      totalAmount: (apt.consultationFee || 500) * 1.18,
      paymentStatus: apt.paymentStatus,
      paidAt: apt.paidAt
    }));

    res.json(billingHistory);
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/billing/hospital/:hospitalId
// @desc    Get all billing for a hospital (admin only)
// @access  Private (Hospital Admin)
router.get('/hospital/:hospitalId', auth, async (req, res) => {
  try {
    // Check if user is hospital admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'hospital_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const appointments = await Appointment.find({
      hospitalId: req.params.hospitalId,
      paymentStatus: { $in: ['paid', 'pending'] }
    })
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization')
      .sort({ paidAt: -1, date: -1 });

    const billingRecords = appointments.map(apt => ({
      appointmentId: apt._id,
      patient: apt.patientId,
      doctor: apt.doctorId,
      date: apt.date,
      consultationFee: apt.consultationFee || 500,
      additionalCharges: apt.additionalCharges || 0,
      totalAmount: ((apt.consultationFee || 500) + (apt.additionalCharges || 0)) * 1.18,
      paymentStatus: apt.paymentStatus,
      paymentMethod: apt.paymentMethod,
      paidAt: apt.paidAt
    }));

    // Calculate totals
    const totalRevenue = billingRecords
      .filter(r => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const pendingAmount = billingRecords
      .filter(r => r.paymentStatus === 'pending')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    res.json({
      records: billingRecords,
      summary: {
        totalRevenue,
        pendingAmount,
        totalTransactions: billingRecords.length,
        paidCount: billingRecords.filter(r => r.paymentStatus === 'paid').length,
        pendingCount: billingRecords.filter(r => r.paymentStatus === 'pending').length
      }
    });
  } catch (error) {
    console.error('Error fetching hospital billing:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
