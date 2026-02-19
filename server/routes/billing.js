const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Discharge = require('../models/Discharge');
const BillingService = require('../services/BillingService');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// ============================================================
// PATIENT SEARCH (for billing/discharge forms)
// ============================================================

/**
 * GET /api/billing/search-patients?q=name_or_phone
 * Search patients by name or phone (Hospital/Admin only)
 */
router.get('/search-patients', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const patients = await User.find({
      $or: [
        { role: 'PATIENT' },
        { role: { $exists: false } },
        { role: null }
      ],
      $and: [{
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex }
        ]
      }]
    }).select('name phone email').limit(20);

    res.json(patients);
  } catch (err) {
    console.error('Patient search error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============================================================
// BILL CRUD
// ============================================================

/**
 * POST /api/billing
 * Create a new bill (Hospital only)
 */
router.post('/', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can create bills' });
    }

    const { patientId, appointmentId, billType, items, notes } = req.body;

    if (!patientId) return res.status(400).json({ msg: 'Patient ID is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'At least one billing item is required' });
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.category || !item.description || !item.unitPrice || item.unitPrice < 0) {
        return res.status(400).json({ msg: 'Each item must have category, description, and valid unitPrice' });
      }
      if (!item.quantity || item.quantity < 1) {
        item.quantity = 1;
      }
    }

    const bill = await BillingService.createBill({
      patientId,
      hospitalId: caller._id,
      appointmentId,
      billType,
      items,
      notes,
      createdBy: caller._id,
      req
    });

    // Real-time notification to patient
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${patientId}`).emit('bill_created', {
        billId: bill._id,
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal,
        hospitalName: caller.name
      });
    }

    res.status(201).json(bill);
  } catch (err) {
    console.error('Create bill error:', err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

/**
 * GET /api/billing/hospital
 * Get all bills for the hospital (Hospital only)
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
      query.billDate = {};
      if (startDate) query.billDate.$gte = new Date(startDate);
      if (endDate) query.billDate.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { 'patientSnapshot.name': { $regex: search, $options: 'i' } },
        { 'patientSnapshot.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('patientId', 'name phone email')
      .populate('appointmentId', 'appointmentDate doctor tokenNumber');

    res.json({
      bills,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get hospital bills error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/billing/patient
 * Get all bills for the authenticated patient
 */
router.get('/patient', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { patientId: req.user.id };
    if (status) query.status = status;

    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('hospitalId', 'name phone address')
      .select('-internalNotes -checksum'); // Don't expose internal fields

    res.json({
      bills,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get patient bills error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/billing/:id
 * Get a single bill by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid bill ID' });
    }

    const bill = await Bill.findById(req.params.id)
      .populate('patientId', 'name phone email')
      .populate('hospitalId', 'name phone address logo')
      .populate('appointmentId', 'appointmentDate doctor tokenNumber reason');

    if (!bill) return res.status(404).json({ msg: 'Bill not found' });

    // Authorization: patient can only see their own bills, hospital can see their hospital's bills
    const caller = await User.findById(req.user.id);
    if (caller.role === 'PATIENT' && bill.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (caller.role === 'HOSPITAL' && bill.hospitalId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    // Verify integrity for hospital users
    if (caller.role === 'HOSPITAL' || caller.role === 'ADMIN') {
      const isIntact = bill.verifyIntegrity();
      if (!isIntact) {
        await AuditLog.log({
          action: 'INTEGRITY_CHECK_FAILED',
          userId: req.user.id,
          resourceType: 'BILL',
          resourceId: bill._id,
          hospitalId: bill.hospitalId._id,
          patientId: bill.patientId._id,
          description: `Integrity check failed for bill ${bill.billNumber}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          severity: 'CRITICAL'
        });
      }
    }

    // Get associated payments
    const payments = await Payment.find({ billId: bill._id })
      .sort({ createdAt: -1 });

    // Audit: bill viewed
    await AuditLog.log({
      action: 'BILL_VIEWED',
      userId: req.user.id,
      userRole: caller.role,
      userName: caller.name,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId._id,
      patientId: bill.patientId._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Don't expose internal notes or checksum to patients
    const billObj = bill.toObject();
    if (caller.role === 'PATIENT') {
      delete billObj.internalNotes;
      delete billObj.checksum;
    }

    res.json({ bill: billObj, payments });
  } catch (err) {
    console.error('Get bill error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============================================================
// BILL LIFECYCLE
// ============================================================

/**
 * PUT /api/billing/:id/items
 * Add item to a draft bill
 */
router.put('/:id/items', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can modify bills' });
    }

    const { category, description, unitPrice, quantity, discount, taxRate, cptCode, icdCode, serviceDate, performedBy, notes } = req.body;

    if (!category || !description || unitPrice === undefined) {
      return res.status(400).json({ msg: 'Category, description, and unitPrice are required' });
    }

    const bill = await BillingService.addLineItem(
      req.params.id,
      { category, description, unitPrice, quantity: quantity || 1, discount, taxRate, cptCode, icdCode, serviceDate, performedBy, notes },
      caller._id,
      req
    );

    // Real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${bill.patientId}`).emit('bill_updated', {
        billId: bill._id,
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal
      });
    }

    res.json(bill);
  } catch (err) {
    console.error('Add item error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

/**
 * DELETE /api/billing/:id/items/:itemId
 * Remove item from a draft bill
 */
router.delete('/:id/items/:itemId', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can modify bills' });
    }

    const bill = await BillingService.removeLineItem(req.params.id, req.params.itemId, caller._id, req);
    res.json(bill);
  } catch (err) {
    console.error('Remove item error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

/**
 * PUT /api/billing/:id/finalize
 * Finalize a bill for payment
 */
router.put('/:id/finalize', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can finalize bills' });
    }

    const bill = await BillingService.finalizeBill(req.params.id, caller._id, req);

    // Notify patient
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${bill.patientId}`).emit('bill_finalized', {
        billId: bill._id,
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal,
        dueDate: bill.dueDate,
        hospitalName: caller.name
      });
    }

    res.json(bill);
  } catch (err) {
    console.error('Finalize bill error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

/**
 * PUT /api/billing/:id/cancel
 * Cancel a bill
 */
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can cancel bills' });
    }

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ msg: 'Cancellation reason is required' });

    const bill = await BillingService.cancelBill(req.params.id, reason, caller._id, req);
    res.json(bill);
  } catch (err) {
    console.error('Cancel bill error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

// ============================================================
// PAYMENTS
// ============================================================

/**
 * POST /api/billing/:id/payment
 * Record a payment against a bill
 */
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can process payments' });
    }

    const { amount, method, transactionId, referenceNumber, upiId, cardLast4, cardNetwork, chequeNumber, bankName, notes } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Valid payment amount is required' });
    if (!method) return res.status(400).json({ msg: 'Payment method is required' });

    const result = await BillingService.processPayment({
      billId: req.params.id,
      amount,
      method,
      transactionId,
      referenceNumber,
      upiId,
      cardLast4,
      cardNetwork,
      chequeNumber,
      bankName,
      notes,
      processedBy: caller._id,
      req
    });

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${result.bill.patientId}`).emit('payment_received', {
        billId: result.bill._id,
        billNumber: result.bill.billNumber,
        amount,
        method,
        receiptNumber: result.payment.receiptNumber,
        balanceDue: result.bill.balanceDue,
        billStatus: result.bill.status
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Process payment error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

/**
 * GET /api/billing/:id/payments
 * Get all payments for a bill
 */
router.get('/:id/payments', auth, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });

    // Authorization check
    const caller = await User.findById(req.user.id);
    if (caller.role === 'PATIENT' && bill.patientId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (caller.role === 'HOSPITAL' && bill.hospitalId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const payments = await Payment.find({ billId: bill._id })
      .sort({ createdAt: -1 })
      .populate('processedBy', 'name');

    res.json(payments);
  } catch (err) {
    console.error('Get payments error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * POST /api/billing/:id/create-order
 * Create a Razorpay order for patient self-service payment
 */
router.post('/:id/create-order', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller) return res.status(401).json({ msg: 'User not found' });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid bill ID' });
    }

    const bill = await Bill.findById(req.params.id).populate('hospitalId', 'name paymentInfo');
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });

    if (bill.patientId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'You can only pay your own bills' });
    }

    if (bill.status === 'DRAFT') return res.status(400).json({ msg: 'Bill has not been finalized yet. Please contact the hospital.' });
    if (bill.status === 'PAID') return res.status(400).json({ msg: 'Bill is already fully paid' });
    if (bill.status === 'CANCELLED') return res.status(400).json({ msg: 'Bill has been cancelled' });

    const { amount } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ msg: 'Enter a valid payment amount' });
    if (numAmount > bill.balanceDue) return res.status(400).json({ msg: `Amount (₹${numAmount}) exceeds balance due (₹${bill.balanceDue})` });

    // UPI ID for direct payment (always returned regardless of Razorpay)
    const hospitalUpiId = bill.hospitalId?.paymentInfo?.upiId || null;
    const hospitalAccountName = bill.hospitalId?.paymentInfo?.accountName || bill.hospitalId?.name || null;

    // Create Razorpay order — required for all payments
    let order;
    try {
      order = await razorpayInstance.orders.create({
        amount: Math.round(numAmount * 100),
        currency: 'INR',
        receipt: `${bill.billNumber}-${Date.now()}`,
        notes: {
          billId: bill._id.toString(),
          billNumber: bill.billNumber,
          patientId: caller._id.toString(),
          patientName: caller.name,
          hospitalName: bill.hospitalId?.name || 'Hospital'
        }
      });
    } catch (razorpayErr) {
      console.error('Razorpay order creation failed:', razorpayErr.message);
      return res.status(503).json({
        msg: 'Payment gateway not available. Please check Razorpay configuration or try again later.',
        error: razorpayErr.message
      });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      bill: {
        _id: bill._id,
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal,
        balanceDue: bill.balanceDue,
        hospitalName: bill.hospitalId?.name
      },
      patient: {
        name: caller.name,
        email: caller.email,
        phone: caller.phone
      },
      key: process.env.RAZORPAY_KEY_ID || null,
      hospitalUpiId,
      hospitalAccountName
    });
  } catch (err) {
    console.error('Create Razorpay order error:', err.message);
    res.status(500).json({ msg: err.message || 'Failed to create payment order' });
  }
});

/**
 * POST /api/billing/:id/verify-payment
 * Verify Razorpay payment signature and record payment in system
 */
router.post('/:id/verify-payment', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller) return res.status(401).json({ msg: 'User not found' });

    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ msg: 'Bill not found' });

    if (bill.patientId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, method } = req.body;

    // Verify Razorpay signature — ensures the bank actually confirmed the payment
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ msg: 'Payment verification failed. Invalid signature.' });
    }

    const numAmount = parseFloat(amount);

    // ── Razorpay path: signature verified by bank, mark as completed ──
    // This is the ONLY payment path — ensures money was actually received (like Amazon/Flipkart)
    const paymentMethod = method?.toUpperCase() || 'UPI';
    const methodMap = { 'CARD': 'CARD', 'UPI': 'UPI', 'NETBANKING': 'NET_BANKING', 'WALLET': 'WALLET', 'BANK_TRANSFER': 'NET_BANKING' };

    const result = await BillingService.processPayment({
      billId: bill._id,
      amount: numAmount,
      method: methodMap[paymentMethod] || 'UPI',
      transactionId: razorpay_payment_id,
      referenceNumber: razorpay_order_id,
      notes: `Razorpay Payment | Order: ${razorpay_order_id}`,
      processedBy: caller._id,
      req
    });

    // Notify hospital via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${bill.hospitalId}`).emit('payment_received', {
        billId: bill._id,
        billNumber: bill.billNumber,
        amount: numAmount,
        method: paymentMethod,
        patientName: caller.name,
        receiptNumber: result.payment.receiptNumber,
        balanceDue: result.bill.balanceDue,
        billStatus: result.bill.status,
      });
    }

    res.json({
      success: true,
      pendingVerification: false,
      payment: result.payment,
      bill: {
        _id: result.bill._id,
        billNumber: result.bill.billNumber,
        grandTotal: result.bill.grandTotal,
        amountPaid: result.bill.amountPaid,
        balanceDue: result.bill.balanceDue,
        status: result.bill.status
      },
      message: `Payment of ₹${numAmount.toFixed(2)} successful! Receipt: ${result.payment.receiptNumber}`
    });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    res.status(400).json({ msg: err.message || 'Payment verification failed' });
  }
});

/**
 * GET /api/billing/pending-verifications
 * Hospital fetches all UPI payments awaiting their confirmation
 */
router.get('/pending-verifications', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Hospitals only' });

    const payments = await Payment.find({ hospitalId: caller._id, status: 'PENDING_VERIFICATION' })
      .populate('patientId', 'name email phone')
      .populate('billId', 'billNumber grandTotal balanceDue')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/**
 * POST /api/billing/payment/:paymentId/confirm-upi
 * Hospital confirms they received the UPI payment
 */
router.post('/payment/:paymentId/confirm-upi', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Hospitals only' });

    const result = await BillingService.confirmUpiPayment({
      paymentId: req.params.paymentId,
      confirmedBy: caller._id,
      req
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${result.bill.patientId}`).emit('payment_confirmed', {
        billId: result.bill._id,
        billNumber: result.bill.billNumber,
        amount: result.payment.amount,
        receiptNumber: result.payment.receiptNumber,
        billStatus: result.bill.status,
        balanceDue: result.bill.balanceDue,
      });
    }

    res.json({ success: true, payment: result.payment, bill: result.bill });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

/**
 * POST /api/billing/payment/:paymentId/reject-upi
 * Hospital rejects a pending UPI payment (not received / wrong txn ID)
 */
router.post('/payment/:paymentId/reject-upi', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || caller.role !== 'HOSPITAL') return res.status(403).json({ msg: 'Hospitals only' });

    const { reason } = req.body;
    const result = await BillingService.rejectUpiPayment({
      paymentId: req.params.paymentId,
      reason,
      rejectedBy: caller._id,
      req
    });

    const io = req.app.get('io');
    if (io) {
      const payment = await Payment.findById(req.params.paymentId).populate('billId', 'patientId billNumber');
      if (payment?.billId?.patientId) {
        io.to(`user_${payment.billId.patientId}`).emit('payment_rejected', {
          billNumber: payment.billId.billNumber,
          reason: reason || 'Payment not received by hospital',
        });
      }
    }

    res.json({ success: true, payment: result.payment });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

/**
 * POST /api/billing/payment/:paymentId/refund
 * Process a refund
 */
router.post('/payment/:paymentId/refund', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can process refunds' });
    }

    const { refundAmount, reason } = req.body;
    if (!refundAmount || refundAmount <= 0) return res.status(400).json({ msg: 'Valid refund amount is required' });
    if (!reason) return res.status(400).json({ msg: 'Refund reason is required' });

    const result = await BillingService.processRefund({
      paymentId: req.params.paymentId,
      refundAmount,
      reason,
      processedBy: caller._id,
      req
    });

    // Notify patient
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${result.bill.patientId}`).emit('payment_refunded', {
        billNumber: result.bill.billNumber,
        refundAmount,
        reason
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Process refund error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

// ============================================================
// STATISTICS & REPORTS
// ============================================================

/**
 * GET /api/billing/stats/hospital
 * Get billing statistics for the hospital
 */
router.get('/stats/hospital', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { startDate, endDate } = req.query;
    const stats = await BillingService.getHospitalBillingStats(caller._id, startDate, endDate);

    res.json(stats);
  } catch (err) {
    console.error('Get billing stats error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/billing/audit/:billId
 * Get audit trail for a bill (Hospital/Admin only)
 */
router.get('/audit/:billId', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const logs = await AuditLog.find({
      resourceId: req.params.billId,
      resourceType: { $in: ['BILL', 'PAYMENT'] }
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (err) {
    console.error('Get audit log error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============================================================
// PDF INVOICE DATA
// ============================================================

/**
 * GET /api/billing/:id/invoice-data
 * Get full invoice data for client-side PDF generation
 */
router.get('/:id/invoice-data', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid bill ID' });
    }

    const bill = await Bill.findById(req.params.id)
      .populate('patientId', 'name phone email age gender address')
      .populate('hospitalId', 'name phone address email logo')
      .populate('appointmentId', 'appointmentDate doctor tokenNumber reason');

    if (!bill) return res.status(404).json({ msg: 'Bill not found' });

    // Authorization check
    const caller = await User.findById(req.user.id);
    if (caller.role === 'PATIENT' && bill.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (caller.role === 'HOSPITAL' && bill.hospitalId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const payments = await Payment.find({ billId: bill._id, status: 'COMPLETED' })
      .sort({ createdAt: -1 })
      .populate('processedBy', 'name');

    // Audit
    await AuditLog.log({
      action: 'INVOICE_DOWNLOADED',
      userId: req.user.id,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId._id,
      patientId: bill.patientId._id,
      description: `Invoice ${bill.billNumber} downloaded by ${caller.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const billObj = bill.toObject();
    if (caller.role === 'PATIENT') {
      delete billObj.internalNotes;
      delete billObj.checksum;
    }

    res.json({
      bill: billObj,
      payments: payments.map(p => p.toObject()),
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get invoice data error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============================================================
// AUTO BILL GENERATION
// ============================================================

/**
 * POST /api/billing/auto-generate/appointment/:appointmentId
 * Auto-generate OPD bill from completed appointment
 */
router.post('/auto-generate/appointment/:appointmentId', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can auto-generate bills' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.appointmentId)) {
      return res.status(400).json({ msg: 'Invalid appointment ID' });
    }

    const { consultationFee } = req.body;

    const bill = await BillingService.autoGenerateBillFromAppointment({
      appointmentId: req.params.appointmentId,
      hospitalId: caller._id,
      createdBy: caller._id,
      consultationFee: consultationFee || 500,
      req
    });

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${bill.patientId}`).emit('bill_created', {
        billId: bill._id,
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal,
        hospitalName: caller.name,
        autoGenerated: true
      });
    }

    res.status(201).json(bill);
  } catch (err) {
    console.error('Auto-generate bill from appointment error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

/**
 * POST /api/billing/auto-generate/discharge/:dischargeId
 * Auto-generate IPD bill from discharge with full charge breakdown
 */
router.post('/auto-generate/discharge/:dischargeId', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can auto-generate bills' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.dischargeId)) {
      return res.status(400).json({ msg: 'Invalid discharge ID' });
    }

    const { chargeConfig } = req.body;

    const bill = await BillingService.autoGenerateBillFromDischarge({
      dischargeId: req.params.dischargeId,
      hospitalId: caller._id,
      createdBy: caller._id,
      chargeConfig: chargeConfig || {},
      req
    });

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${bill.patientId}`).emit('bill_created', {
        billId: bill._id,
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal,
        hospitalName: caller.name,
        autoGenerated: true,
        source: 'discharge'
      });
    }

    res.status(201).json(bill);
  } catch (err) {
    console.error('Auto-generate bill from discharge error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

// ============================================================
// GOVT SCHEME & GST
// ============================================================

/**
 * PUT /api/billing/:id/govt-scheme
 * Apply government scheme discount to a bill
 */
router.put('/:id/govt-scheme', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can apply govt schemes' });
    }

    const { schemeName, schemeId, beneficiaryName, discountPercent, maxCoverageAmount, notes } = req.body;

    if (!schemeName) return res.status(400).json({ msg: 'Scheme name is required' });
    if (!discountPercent && !maxCoverageAmount) {
      return res.status(400).json({ msg: 'Either discount percent or max coverage amount is required' });
    }

    const bill = await BillingService.applyGovtScheme(
      req.params.id,
      { schemeName, schemeId, beneficiaryName, discountPercent, maxCoverageAmount, notes, verifiedBy: caller.name },
      caller._id,
      req
    );

    res.json(bill);
  } catch (err) {
    console.error('Apply govt scheme error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

/**
 * DELETE /api/billing/:id/govt-scheme
 * Remove government scheme from a bill
 */
router.delete('/:id/govt-scheme', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can remove govt schemes' });
    }

    const bill = await BillingService.removeGovtScheme(req.params.id, caller._id, req);
    res.json(bill);
  } catch (err) {
    console.error('Remove govt scheme error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

/**
 * PUT /api/billing/:id/gst
 * Apply GST to a bill
 */
router.put('/:id/gst', auth, async (req, res) => {
  try {
    const caller = await User.findById(req.user.id);
    if (!caller || (caller.role !== 'HOSPITAL' && caller.role !== 'ADMIN')) {
      return res.status(403).json({ msg: 'Only hospitals can apply GST' });
    }

    const { hospitalGSTIN, cgstRate, sgstRate, igstRate, sacCode } = req.body;
    const bill = await BillingService.applyGST(
      req.params.id,
      { hospitalGSTIN, cgstRate, sgstRate, igstRate, sacCode },
      caller._id,
      req
    );

    res.json(bill);
  } catch (err) {
    console.error('Apply GST error:', err.message);
    res.status(400).json({ msg: err.message });
  }
});

module.exports = router;
