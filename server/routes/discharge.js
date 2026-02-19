const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Discharge = require('../models/Discharge');
const Bill = require('../models/Bill');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const BillingService = require('../services/BillingService');

// ============================================================
// DISCHARGE CRUD
// ============================================================

/**
 * POST /api/discharge
 * Create a discharge summary (Hospital only)
 */
router.post('/', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can create discharge summaries' });
    }

    const {
      patientId, appointmentId, billId,
      admissionDate, dischargeDate, admissionType, wardRoom, bedNumber,
      chiefComplaint, admissionDiagnosis, dischargeDiagnosis, procedures,
      treatmentSummary, courseInHospital,
      vitalsAtDischarge, labResults, medications,
      followUp, instructions,
      conditionAtDischarge, dischargeType, transferDetails,
      dischargingDoctor, notes
    } = req.body;

    if (!patientId) return res.status(400).json({ msg: 'Patient ID is required' });
    if (!chiefComplaint) return res.status(400).json({ msg: 'Chief complaint is required' });

    // Fetch patient snapshot
    const patient = await User.findById(patientId).select('name phone age gender');
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });

    const discharge = new Discharge({
      patientId,
      hospitalId: caller._id,
      appointmentId,
      billId,
      patientSnapshot: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone
      },
      admissionDate,
      dischargeDate: dischargeDate || new Date(),
      admissionType: admissionType || 'OPD',
      wardRoom,
      bedNumber,
      chiefComplaint,
      admissionDiagnosis,
      dischargeDiagnosis: dischargeDiagnosis || [],
      procedures: procedures || [],
      treatmentSummary,
      courseInHospital,
      vitalsAtDischarge,
      labResults: labResults || [],
      medications: medications || [],
      followUp,
      instructions,
      conditionAtDischarge,
      dischargeType: dischargeType || 'NORMAL',
      transferDetails,
      dischargingDoctor,
      notes,
      preparedBy: caller._id,
      status: 'DRAFT'
    });

    await discharge.save();

    // Link discharge to bill if billId provided
    if (billId) {
      await Bill.findByIdAndUpdate(billId, { dischargeId: discharge._id });
    }

    // Mark appointment as completed if linked
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: 'COMPLETED',
        consultationEndTime: new Date()
      });
    }

    // Audit log
    await AuditLog.log({
      action: 'DISCHARGE_CREATED',
      userId: caller._id,
      userRole: caller.role,
      userName: caller.name,
      resourceType: 'DISCHARGE',
      resourceId: discharge._id,
      hospitalId: caller._id,
      patientId,
      newValues: {
        dischargeNumber: discharge.dischargeNumber,
        conditionAtDischarge,
        dischargeType
      },
      description: `Discharge ${discharge.dischargeNumber} created for ${patient.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${patientId}`).emit('discharge_created', {
        dischargeId: discharge._id,
        dischargeNumber: discharge.dischargeNumber,
        hospitalName: caller.name,
        status: discharge.status
      });
    }

    res.status(201).json(discharge);
  } catch (err) {
    console.error('Create discharge error:', err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

/**
 * GET /api/discharge/hospital
 * Get all discharges for the hospital
 */
router.get('/hospital', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { status, startDate, endDate, page = 1, limit = 20, search } = req.query;

    const query = { hospitalId: caller._id };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.dischargeDate = {};
      if (startDate) query.dischargeDate.$gte = new Date(startDate);
      if (endDate) query.dischargeDate.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { dischargeNumber: { $regex: search, $options: 'i' } },
        { 'patientSnapshot.name': { $regex: search, $options: 'i' } },
        { chiefComplaint: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Discharge.countDocuments(query);
    const discharges = await Discharge.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('patientId', 'name phone')
      .populate('billId', 'billNumber grandTotal status');

    res.json({
      discharges,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get hospital discharges error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/discharge/patient
 * Get all discharges for the authenticated patient
 */
router.get('/patient', auth, async (req, res) => {
  try {
    const discharges = await Discharge.find({ patientId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('hospitalId', 'name phone address')
      .populate('billId', 'billNumber grandTotal status amountPaid balanceDue');

    res.json(discharges);
  } catch (err) {
    console.error('Get patient discharges error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/discharge/:id
 * Get a single discharge by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid discharge ID' });
    }

    const discharge = await Discharge.findById(req.params.id)
      .populate('patientId', 'name phone email age gender')
      .populate('hospitalId', 'name phone address logo')
      .populate('billId', 'billNumber grandTotal status amountPaid balanceDue items')
      .populate('preparedBy', 'name')
      .populate('approvedBy', 'name');

    if (!discharge) return res.status(404).json({ msg: 'Discharge not found' });

    // Authorization
    const caller = await User.findById(req.user.id);
    if (caller.role === 'PATIENT' && discharge.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (caller.role === 'HOSPITAL' && discharge.hospitalId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    // Audit
    await AuditLog.log({
      action: 'DISCHARGE_VIEWED',
      userId: req.user.id,
      userRole: caller.role,
      userName: caller.name,
      resourceType: 'DISCHARGE',
      resourceId: discharge._id,
      hospitalId: discharge.hospitalId._id,
      patientId: discharge.patientId._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(discharge);
  } catch (err) {
    console.error('Get discharge error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * PUT /api/discharge/:id
 * Update a discharge (only DRAFT status)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can update discharges' });
    }

    const discharge = await Discharge.findById(req.params.id);
    if (!discharge) return res.status(404).json({ msg: 'Discharge not found' });
    if (discharge.status !== 'DRAFT') {
      return res.status(400).json({ msg: 'Only draft discharges can be modified' });
    }
    if (discharge.hospitalId.toString() !== caller._id.toString()) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const allowedFields = [
      'chiefComplaint', 'admissionDiagnosis', 'dischargeDiagnosis', 'procedures',
      'treatmentSummary', 'courseInHospital', 'vitalsAtDischarge', 'labResults',
      'medications', 'followUp', 'instructions', 'conditionAtDischarge',
      'dischargeType', 'transferDetails', 'dischargingDoctor', 'notes',
      'admissionDate', 'dischargeDate', 'wardRoom', 'bedNumber'
    ];

    const previousValues = {};
    const newValues = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        previousValues[field] = discharge[field];
        discharge[field] = req.body[field];
        newValues[field] = req.body[field];
      }
    });

    await discharge.save();

    await AuditLog.log({
      action: 'DISCHARGE_UPDATED',
      userId: caller._id,
      userRole: caller.role,
      userName: caller.name,
      resourceType: 'DISCHARGE',
      resourceId: discharge._id,
      hospitalId: caller._id,
      patientId: discharge.patientId,
      previousValues,
      newValues,
      description: `Discharge ${discharge.dischargeNumber} updated`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(discharge);
  } catch (err) {
    console.error('Update discharge error:', err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

/**
 * PUT /api/discharge/:id/submit
 * Submit discharge for approval
 */
router.put('/:id/submit', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const discharge = await Discharge.findById(req.params.id);
    if (!discharge) return res.status(404).json({ msg: 'Discharge not found' });
    if (discharge.status !== 'DRAFT') {
      return res.status(400).json({ msg: 'Only draft discharges can be submitted' });
    }

    // Validate required fields
    if (!discharge.chiefComplaint) {
      return res.status(400).json({ msg: 'Chief complaint is required before submission' });
    }
    if (!discharge.dischargingDoctor || !discharge.dischargingDoctor.name) {
      return res.status(400).json({ msg: 'Discharging doctor details are required' });
    }

    discharge.status = 'PENDING_APPROVAL';
    await discharge.save();

    await AuditLog.log({
      action: 'DISCHARGE_SUBMITTED',
      userId: caller._id,
      resourceType: 'DISCHARGE',
      resourceId: discharge._id,
      hospitalId: caller._id,
      patientId: discharge.patientId,
      description: `Discharge ${discharge.dischargeNumber} submitted for approval`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(discharge);
  } catch (err) {
    console.error('Submit discharge error:', err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

/**
 * PUT /api/discharge/:id/approve
 * Approve a discharge
 */
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const discharge = await Discharge.findById(req.params.id);
    if (!discharge) return res.status(404).json({ msg: 'Discharge not found' });
    if (discharge.status !== 'PENDING_APPROVAL' && discharge.status !== 'DRAFT') {
      return res.status(400).json({ msg: 'Discharge cannot be approved in current state' });
    }

    const { doctorSignature } = req.body;

    discharge.status = 'APPROVED';
    discharge.approvedBy = caller._id;
    discharge.approvedAt = new Date();
    if (doctorSignature) discharge.doctorSignature = doctorSignature;

    // Check if bill is settled
    if (discharge.billId) {
      const bill = await Bill.findById(discharge.billId);
      if (bill && (bill.status === 'PAID' || bill.balanceDue === 0)) {
        discharge.isBillSettled = true;
        discharge.status = 'COMPLETED';
      }
    } else {
      // Auto-generate bill from discharge
      try {
        const autoBill = await BillingService.autoGenerateBillFromDischarge({
          dischargeId: discharge._id,
          hospitalId: caller._id,
          createdBy: caller._id,
          chargeConfig: req.body.chargeConfig || {},
          req
        });
        discharge.billId = autoBill._id;

        const io2 = req.app.get('io');
        if (io2) {
          io2.to(`user_${discharge.patientId}`).emit('bill_created', {
            billId: autoBill._id,
            billNumber: autoBill.billNumber,
            grandTotal: autoBill.grandTotal,
            hospitalName: caller.name,
            autoGenerated: true,
            source: 'discharge'
          });
        }
      } catch (billErr) {
        console.error('Auto bill from discharge skipped:', billErr.message);
        // Still mark as completed even if bill generation fails
        discharge.status = 'COMPLETED';
      }
    }

    await discharge.save();

    await AuditLog.log({
      action: 'DISCHARGE_APPROVED',
      userId: caller._id,
      userRole: caller.role,
      userName: caller.name,
      resourceType: 'DISCHARGE',
      resourceId: discharge._id,
      hospitalId: caller._id,
      patientId: discharge.patientId,
      description: `Discharge ${discharge.dischargeNumber} approved`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Notify patient
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${discharge.patientId}`).emit('discharge_approved', {
        dischargeId: discharge._id,
        dischargeNumber: discharge.dischargeNumber,
        status: discharge.status,
        isBillSettled: discharge.isBillSettled
      });
    }

    res.json(discharge);
  } catch (err) {
    console.error('Approve discharge error:', err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

/**
 * PUT /api/discharge/:id/complete
 * Mark discharge as completed (after bill settlement)
 */
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const discharge = await Discharge.findById(req.params.id);
    if (!discharge) return res.status(404).json({ msg: 'Discharge not found' });

    // Check bill settlement if linked
    if (discharge.billId) {
      const bill = await Bill.findById(discharge.billId);
      if (bill && bill.balanceDue > 0) {
        return res.status(400).json({
          msg: `Outstanding balance of ${bill.balanceDue}. Please settle the bill before completing discharge.`,
          balanceDue: bill.balanceDue
        });
      }
      discharge.isBillSettled = true;
    }

    discharge.status = 'COMPLETED';
    await discharge.save();

    await AuditLog.log({
      action: 'DISCHARGE_COMPLETED',
      userId: caller._id,
      resourceType: 'DISCHARGE',
      resourceId: discharge._id,
      hospitalId: caller._id,
      patientId: discharge.patientId,
      description: `Discharge ${discharge.dischargeNumber} completed`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Notify patient
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${discharge.patientId}`).emit('discharge_completed', {
        dischargeId: discharge._id,
        dischargeNumber: discharge.dischargeNumber
      });
    }

    res.json(discharge);
  } catch (err) {
    console.error('Complete discharge error:', err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

module.exports = router;
