const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Discharge = require('../models/Discharge');
const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * BillingService
 * Centralized business logic for billing operations.
 * Ensures consistency, validation, and audit logging.
 */
class BillingService {

  /**
   * Create a new bill with validated line items
   */
  static async createBill({ patientId, hospitalId, appointmentId, billType, items, notes, createdBy, req }) {
    // Fetch patient snapshot
    const patient = await User.findById(patientId).select('name phone email age gender address');
    if (!patient) throw new Error('Patient not found');

    // Validate and compute each line item
    const computedItems = items.map(item => Bill.calculateLineItem(item));

    const bill = new Bill({
      patientId,
      hospitalId,
      appointmentId,
      billType: billType || 'OPD',
      items: computedItems,
      patientSnapshot: {
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        age: patient.age,
        gender: patient.gender,
        address: patient.address
      },
      notes,
      createdBy,
      lastModifiedBy: createdBy,
      subtotal: 0,    // will be computed in pre-save
      grandTotal: 0   // will be computed in pre-save
    });

    await bill.save();

    // Audit log
    await AuditLog.log({
      action: 'BILL_CREATED',
      userId: createdBy,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId,
      patientId,
      newValues: { billNumber: bill.billNumber, grandTotal: bill.grandTotal, itemCount: bill.items.length },
      description: `Bill ${bill.billNumber} created for patient ${patient.name}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return bill;
  }

  /**
   * Add a line item to an existing bill
   */
  static async addLineItem(billId, item, userId, req) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status !== 'DRAFT') throw new Error('Cannot modify a finalized bill');

    const computedItem = Bill.calculateLineItem(item);
    bill.items.push(computedItem);
    bill.lastModifiedBy = userId;
    bill.version += 1;
    await bill.save();

    await AuditLog.log({
      action: 'BILL_ITEM_ADDED',
      userId,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      newValues: { item: computedItem, newTotal: bill.grandTotal },
      description: `Item "${item.description}" added to bill ${bill.billNumber}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return bill;
  }

  /**
   * Remove a line item from a bill
   */
  static async removeLineItem(billId, itemId, userId, req) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status !== 'DRAFT') throw new Error('Cannot modify a finalized bill');

    const item = bill.items.id(itemId);
    if (!item) throw new Error('Item not found');

    const removedItem = item.toObject();
    bill.items.pull(itemId);
    bill.lastModifiedBy = userId;
    bill.version += 1;
    await bill.save();

    await AuditLog.log({
      action: 'BILL_ITEM_REMOVED',
      userId,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      previousValues: removedItem,
      description: `Item "${removedItem.description}" removed from bill ${bill.billNumber}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return bill;
  }

  /**
   * Finalize a bill - locks it for payment
   */
  static async finalizeBill(billId, userId, req) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status !== 'DRAFT') throw new Error('Bill is already finalized');
    if (!bill.items || bill.items.length === 0) throw new Error('Cannot finalize an empty bill');

    // Verify integrity before finalizing
    bill.status = 'FINALIZED';
    bill.finalizedAt = new Date();
    bill.lastModifiedBy = userId;
    bill.version += 1;

    // Set due date (default 30 days)
    if (!bill.dueDate) {
      bill.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    await bill.save();

    await AuditLog.log({
      action: 'BILL_FINALIZED',
      userId,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      newValues: { grandTotal: bill.grandTotal, balanceDue: bill.balanceDue },
      description: `Bill ${bill.billNumber} finalized. Total: ${bill.grandTotal}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
      severity: 'INFO'
    });

    return bill;
  }

  /**
   * Process a payment against a bill
   */
  static async processPayment({ billId, amount, method, transactionId, referenceNumber, upiId, cardLast4, cardNetwork, chequeNumber, bankName, notes, processedBy, req }) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status === 'DRAFT') throw new Error('Bill must be finalized before payment');
    if (bill.status === 'PAID') throw new Error('Bill is already fully paid');
    if (bill.status === 'CANCELLED') throw new Error('Cannot pay a cancelled bill');

    if (amount > bill.balanceDue) {
      throw new Error(`Payment amount (${amount}) exceeds balance due (${bill.balanceDue})`);
    }

    const payment = new Payment({
      billId: bill._id,
      patientId: bill.patientId,
      hospitalId: bill.hospitalId,
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
      processedBy,
      status: 'COMPLETED',
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    await payment.save();

    // Update bill payment totals
    bill.amountPaid += amount;
    bill.balanceDue = bill.grandTotal - bill.amountPaid - (bill.insurance?.approvedAmount || 0);
    if (bill.balanceDue < 0) bill.balanceDue = 0;

    if (bill.balanceDue === 0) {
      bill.status = 'PAID';
      bill.paidAt = new Date();
    } else {
      bill.status = 'PARTIALLY_PAID';
    }

    bill.lastModifiedBy = processedBy;
    bill.version += 1;
    await bill.save();

    // Audit
    await AuditLog.log({
      action: 'PAYMENT_COMPLETED',
      userId: processedBy,
      resourceType: 'PAYMENT',
      resourceId: payment._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      newValues: {
        amount, method, receiptNumber: payment.receiptNumber,
        billStatus: bill.status, balanceDue: bill.balanceDue
      },
      description: `Payment of ${amount} via ${method} for bill ${bill.billNumber}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return { payment, bill };
  }

  /**
   * Submit a UPI payment for hospital verification.
   * Bill stays FINALIZED until hospital confirms receipt.
   */
  static async submitUpiPaymentForVerification({ billId, amount, transactionId, upiId, processedBy, req }) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status === 'DRAFT') throw new Error('Bill must be finalized before payment');
    if (bill.status === 'PAID') throw new Error('Bill is already fully paid');
    if (bill.status === 'CANCELLED') throw new Error('Cannot pay a cancelled bill');
    if (amount > bill.balanceDue) throw new Error(`Amount exceeds balance due (₹${bill.balanceDue})`);

    // Check for duplicate transaction ID
    const duplicate = await Payment.findOne({ transactionId, status: { $in: ['PENDING_VERIFICATION', 'COMPLETED'] } });
    if (duplicate) throw new Error('This transaction ID has already been submitted.');

    const payment = new Payment({
      billId: bill._id,
      patientId: bill.patientId,
      hospitalId: bill.hospitalId,
      amount,
      method: 'UPI',
      transactionId,
      upiId,
      notes: `Patient UPI payment — awaiting hospital verification`,
      processedBy,
      status: 'PENDING_VERIFICATION',
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });
    await payment.save();

    await AuditLog.log({
      action: 'PAYMENT_PENDING_VERIFICATION',
      userId: processedBy,
      resourceType: 'PAYMENT',
      resourceId: payment._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      newValues: { amount, transactionId, billNumber: bill.billNumber },
      description: `Patient submitted UPI payment ₹${amount} for bill ${bill.billNumber}, awaiting hospital verification`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return { payment, bill };
  }

  /**
   * Hospital confirms they received the UPI payment.
   * Updates payment to COMPLETED and bill to PAID/PARTIALLY_PAID.
   */
  static async confirmUpiPayment({ paymentId, confirmedBy, req }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'PENDING_VERIFICATION') throw new Error('Payment is not pending verification');

    payment.status = 'COMPLETED';
    await payment.save(); // triggers receiptNumber generation in pre-save hook

    const bill = await Bill.findById(payment.billId);
    if (!bill) throw new Error('Bill not found');

    bill.amountPaid += payment.amount;
    bill.balanceDue = Math.max(0, bill.grandTotal - bill.amountPaid - (bill.insurance?.approvedAmount || 0));
    bill.status = bill.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
    if (bill.status === 'PAID') bill.paidAt = new Date();
    bill.lastModifiedBy = confirmedBy;
    bill.version += 1;
    await bill.save();

    await AuditLog.log({
      action: 'PAYMENT_COMPLETED',
      userId: confirmedBy,
      resourceType: 'PAYMENT',
      resourceId: payment._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      newValues: { amount: payment.amount, receiptNumber: payment.receiptNumber, billStatus: bill.status },
      description: `Hospital confirmed UPI payment ₹${payment.amount} for bill ${bill.billNumber}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return { payment, bill };
  }

  /**
   * Hospital rejects a pending UPI payment (wrong txn ID / not received).
   */
  static async rejectUpiPayment({ paymentId, reason, rejectedBy, req }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'PENDING_VERIFICATION') throw new Error('Payment is not pending verification');

    payment.status = 'FAILED';
    payment.failureReason = reason || 'Rejected by hospital — payment not received';
    await payment.save();

    await AuditLog.log({
      action: 'PAYMENT_REJECTED',
      userId: rejectedBy,
      resourceType: 'PAYMENT',
      resourceId: payment._id,
      hospitalId: payment.hospitalId,
      patientId: payment.patientId,
      newValues: { reason },
      description: `Hospital rejected UPI payment for bill`,
    });

    return { payment };
  }

  /**
   * Process a refund
   */
  static async processRefund({ paymentId, refundAmount, reason, processedBy, req }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'COMPLETED') throw new Error('Only completed payments can be refunded');
    if (refundAmount > payment.amount - payment.refundAmount) {
      throw new Error('Refund amount exceeds the refundable amount');
    }

    const bill = await Bill.findById(payment.billId);
    if (!bill) throw new Error('Associated bill not found');

    // Create refund payment record
    const refund = new Payment({
      billId: payment.billId,
      patientId: payment.patientId,
      hospitalId: payment.hospitalId,
      amount: -refundAmount,
      currency: payment.currency,
      method: payment.method,
      status: 'REFUNDED',
      refundAmount,
      refundReason: reason,
      refundedAt: new Date(),
      originalPaymentId: payment._id,
      processedBy,
      notes: `Refund for receipt ${payment.receiptNumber}: ${reason}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    await refund.save();

    // Update original payment
    payment.refundAmount += refundAmount;
    if (payment.refundAmount >= payment.amount) {
      payment.status = 'REFUNDED';
    } else {
      payment.status = 'REFUND_INITIATED';
    }
    await payment.save();

    // Update bill
    bill.amountPaid -= refundAmount;
    bill.balanceDue = bill.grandTotal - bill.amountPaid - (bill.insurance?.approvedAmount || 0);
    if (bill.balanceDue < 0) bill.balanceDue = 0;
    bill.status = bill.amountPaid <= 0 ? 'REFUNDED' : 'PARTIALLY_PAID';
    bill.lastModifiedBy = processedBy;
    bill.version += 1;
    await bill.save();

    await AuditLog.log({
      action: 'PAYMENT_REFUNDED',
      userId: processedBy,
      resourceType: 'PAYMENT',
      resourceId: refund._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      previousValues: { originalPaymentId: paymentId, originalAmount: payment.amount },
      newValues: { refundAmount, billStatus: bill.status, balanceDue: bill.balanceDue },
      description: `Refund of ${refundAmount} for bill ${bill.billNumber}. Reason: ${reason}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
      severity: 'WARNING'
    });

    return { refund, bill };
  }

  /**
   * Cancel a bill
   */
  static async cancelBill(billId, reason, userId, req) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status === 'PAID') throw new Error('Cannot cancel a paid bill. Process a refund instead.');

    const previousStatus = bill.status;
    bill.status = 'CANCELLED';
    bill.internalNotes = `${bill.internalNotes || ''}\nCancelled: ${reason}`.trim();
    bill.lastModifiedBy = userId;
    bill.version += 1;
    await bill.save();

    await AuditLog.log({
      action: 'BILL_CANCELLED',
      userId,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      previousValues: { status: previousStatus },
      newValues: { status: 'CANCELLED', reason },
      description: `Bill ${bill.billNumber} cancelled. Reason: ${reason}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
      severity: 'WARNING'
    });

    return bill;
  }

  /**
   * Get billing statistics for a hospital
   */
  static async getHospitalBillingStats(hospitalId, startDate, endDate) {
    const matchStage = {
      hospitalId: hospitalId,
      status: { $nin: ['CANCELLED'] }
    };

    if (startDate || endDate) {
      matchStage.billDate = {};
      if (startDate) matchStage.billDate.$gte = new Date(startDate);
      if (endDate) matchStage.billDate.$lte = new Date(endDate);
    }

    const stats = await Bill.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          totalCollected: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: '$balanceDue' },
          avgBillAmount: { $avg: '$grandTotal' },
          paidBills: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
          pendingBills: { $sum: { $cond: [{ $in: ['$status', ['FINALIZED', 'PARTIALLY_PAID']] }, 1, 0] } },
          draftBills: { $sum: { $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0] } },
          overdueBills: { $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, 1, 0] } }
        }
      }
    ]);

    // Category-wise breakdown
    const categoryBreakdown = await Bill.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          totalAmount: { $sum: '$items.lineTotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Daily revenue trend
    const dailyTrend = await Bill.aggregate([
      { $match: { ...matchStage, status: { $in: ['PAID', 'PARTIALLY_PAID'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$billDate' } },
          revenue: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    return {
      summary: stats[0] || {
        totalBills: 0, totalRevenue: 0, totalCollected: 0,
        totalOutstanding: 0, avgBillAmount: 0, paidBills: 0,
        pendingBills: 0, draftBills: 0, overdueBills: 0
      },
      categoryBreakdown,
      dailyTrend
    };
  }

  /**
   * Auto-generate bill from a completed appointment (OPD bill)
   */
  static async autoGenerateBillFromAppointment({ appointmentId, hospitalId, createdBy, consultationFee, req }) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    // Check if bill already exists for this appointment
    const existingBill = await Bill.findOne({ appointmentId, hospitalId, status: { $ne: 'CANCELLED' } });
    if (existingBill) return existingBill;

    const patient = await User.findById(appointment.patientId).select('name phone email age gender address');
    if (!patient) throw new Error('Patient not found');

    const items = [];

    // Consultation fee
    items.push(Bill.calculateLineItem({
      category: 'CONSULTATION',
      description: `Consultation - Dr. ${appointment.doctor || 'General'}`,
      quantity: 1,
      unitPrice: consultationFee || 500,
      discount: 0,
      taxRate: 0,
      serviceDate: new Date(),
      performedBy: appointment.doctor
    }));

    const bill = new Bill({
      patientId: appointment.patientId,
      hospitalId,
      appointmentId,
      billType: appointment.type === 'EMERGENCY' ? 'EMERGENCY' : 'OPD',
      items,
      patientSnapshot: {
        name: patient.name || appointment.patientName,
        phone: patient.phone || appointment.phone,
        email: patient.email,
        age: patient.age,
        gender: patient.gender,
        address: patient.address
      },
      notes: `Auto-generated from appointment on ${appointment.appointmentDate}`,
      createdBy,
      lastModifiedBy: createdBy,
      subtotal: 0,
      grandTotal: 0
    });

    await bill.save();

    await AuditLog.log({
      action: 'BILL_AUTO_GENERATED',
      userId: createdBy,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId,
      patientId: appointment.patientId,
      newValues: { billNumber: bill.billNumber, source: 'APPOINTMENT', appointmentId },
      description: `Auto-generated bill ${bill.billNumber} from appointment for ${patient.name || appointment.patientName}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return bill;
  }

  /**
   * Auto-generate bill from discharge (IPD bill with full charge breakdown)
   */
  static async autoGenerateBillFromDischarge({ dischargeId, hospitalId, createdBy, chargeConfig, req }) {
    const discharge = await Discharge.findById(dischargeId);
    if (!discharge) throw new Error('Discharge not found');

    // Check if bill already exists for this discharge
    if (discharge.billId) {
      const existingBill = await Bill.findById(discharge.billId);
      if (existingBill && existingBill.status !== 'CANCELLED') return existingBill;
    }

    const patient = await User.findById(discharge.patientId).select('name phone email age gender address');
    if (!patient) throw new Error('Patient not found');

    const items = [];
    const config = chargeConfig || {};

    // 1. Consultation Fee
    items.push(Bill.calculateLineItem({
      category: 'CONSULTATION',
      description: `Consultation - ${discharge.dischargingDoctor?.name || 'Doctor'}`,
      quantity: 1,
      unitPrice: config.consultationFee || 500,
      discount: 0,
      taxRate: 0,
      performedBy: discharge.dischargingDoctor?.name
    }));

    // 2. Room Charges (if admitted / IPD)
    if (discharge.admissionDate && discharge.admissionType !== 'OPD') {
      const admitDate = new Date(discharge.admissionDate);
      const dischargeDate = new Date(discharge.dischargeDate || Date.now());
      const days = Math.max(1, Math.ceil((dischargeDate - admitDate) / (1000 * 60 * 60 * 24)));
      items.push(Bill.calculateLineItem({
        category: 'ROOM_CHARGE',
        description: `Room/Ward: ${discharge.wardRoom || 'General'} (Bed: ${discharge.bedNumber || 'N/A'})`,
        quantity: days,
        unitPrice: config.roomChargePerDay || 1000,
        discount: 0,
        taxRate: 0
      }));

      // 6. Nursing Charges
      items.push(Bill.calculateLineItem({
        category: 'NURSING',
        description: 'Nursing care charges',
        quantity: days,
        unitPrice: config.nursingChargePerDay || 300,
        discount: 0,
        taxRate: 0
      }));
    }

    // 3. Lab Tests
    if (discharge.labResults && discharge.labResults.length > 0) {
      discharge.labResults.forEach(lab => {
        items.push(Bill.calculateLineItem({
          category: 'LAB_TEST',
          description: lab.testName || 'Laboratory Test',
          quantity: 1,
          unitPrice: config.labTestCharge || 200,
          discount: 0,
          taxRate: 0,
          serviceDate: lab.date
        }));
      });
    }

    // 4. Medicines
    if (discharge.medications && discharge.medications.length > 0) {
      discharge.medications.forEach(med => {
        items.push(Bill.calculateLineItem({
          category: 'MEDICATION',
          description: `${med.name} - ${med.dosage || ''} (${med.duration || ''})`,
          quantity: 1,
          unitPrice: config.medicineCharge || 100,
          discount: 0,
          taxRate: 0
        }));
      });
    }

    // 5. Procedures / Surgery Charges
    if (discharge.procedures && discharge.procedures.length > 0) {
      discharge.procedures.forEach(proc => {
        items.push(Bill.calculateLineItem({
          category: 'SURGICAL',
          description: proc.description || 'Procedure',
          quantity: 1,
          unitPrice: config.procedureCharge || 5000,
          discount: 0,
          taxRate: 0,
          cptCode: proc.code,
          serviceDate: proc.date,
          performedBy: proc.performedBy
        }));
      });
    }

    // 7. Miscellaneous
    if (config.miscCharge && config.miscCharge > 0) {
      items.push(Bill.calculateLineItem({
        category: 'MISCELLANEOUS',
        description: config.miscDescription || 'Miscellaneous charges',
        quantity: 1,
        unitPrice: config.miscCharge,
        discount: 0,
        taxRate: config.miscGSTRate || 0
      }));
    }

    const bill = new Bill({
      patientId: discharge.patientId,
      hospitalId,
      appointmentId: discharge.appointmentId,
      dischargeId: discharge._id,
      billType: discharge.admissionType === 'OPD' ? 'OPD' : 'IPD',
      items,
      patientSnapshot: {
        name: patient.name || discharge.patientSnapshot?.name,
        phone: patient.phone || discharge.patientSnapshot?.phone,
        email: patient.email,
        age: patient.age || discharge.patientSnapshot?.age,
        gender: patient.gender || discharge.patientSnapshot?.gender,
        address: patient.address
      },
      gstDetails: config.gstDetails || { isGSTApplicable: false },
      notes: `Auto-generated from discharge ${discharge.dischargeNumber}`,
      createdBy,
      lastModifiedBy: createdBy,
      subtotal: 0,
      grandTotal: 0
    });

    await bill.save();

    // Link bill to discharge
    discharge.billId = bill._id;
    await discharge.save();

    await AuditLog.log({
      action: 'BILL_AUTO_GENERATED',
      userId: createdBy,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId,
      patientId: discharge.patientId,
      newValues: { billNumber: bill.billNumber, source: 'DISCHARGE', dischargeId },
      description: `Auto-generated bill ${bill.billNumber} from discharge ${discharge.dischargeNumber}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return bill;
  }

  /**
   * Apply govt scheme discount to a bill
   */
  static async applyGovtScheme(billId, schemeData, userId, req) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status !== 'DRAFT') throw new Error('Can only apply scheme to draft bills');

    bill.govtScheme = {
      isApplied: true,
      schemeName: schemeData.schemeName,
      schemeId: schemeData.schemeId,
      schemeBeneficiaryName: schemeData.beneficiaryName,
      discountPercent: schemeData.discountPercent || 0,
      maxCoverageAmount: schemeData.maxCoverageAmount || 0,
      verifiedBy: schemeData.verifiedBy || userId.toString(),
      verificationDate: new Date(),
      notes: schemeData.notes
    };
    bill.lastModifiedBy = userId;
    bill.version += 1;
    await bill.save();

    await AuditLog.log({
      action: 'GOVT_SCHEME_APPLIED',
      userId,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      newValues: {
        schemeName: schemeData.schemeName,
        discountPercent: schemeData.discountPercent,
        approvedAmount: bill.govtScheme.approvedAmount,
        newGrandTotal: bill.grandTotal
      },
      description: `Govt scheme ${schemeData.schemeName} applied to bill ${bill.billNumber}. Discount: ${schemeData.discountPercent}%`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return bill;
  }

  /**
   * Remove govt scheme from a bill
   */
  static async removeGovtScheme(billId, userId, req) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status !== 'DRAFT') throw new Error('Can only modify draft bills');

    const previousScheme = bill.govtScheme?.schemeName;
    bill.govtScheme = { isApplied: false };
    bill.lastModifiedBy = userId;
    bill.version += 1;
    await bill.save();

    await AuditLog.log({
      action: 'GOVT_SCHEME_REMOVED',
      userId,
      resourceType: 'BILL',
      resourceId: bill._id,
      hospitalId: bill.hospitalId,
      patientId: bill.patientId,
      previousValues: { schemeName: previousScheme },
      description: `Govt scheme removed from bill ${bill.billNumber}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')
    });

    return bill;
  }

  /**
   * Apply GST details to a bill
   */
  static async applyGST(billId, gstData, userId, _req) {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status !== 'DRAFT') throw new Error('Can only modify draft bills');

    bill.gstDetails = {
      isGSTApplicable: true,
      hospitalGSTIN: gstData.hospitalGSTIN,
      cgstRate: gstData.cgstRate || 0,
      sgstRate: gstData.sgstRate || 0,
      igstRate: gstData.igstRate || 0,
      sacCode: gstData.sacCode || '999312'
    };
    bill.lastModifiedBy = userId;
    bill.version += 1;
    await bill.save();

    return bill;
  }

  /**
   * Generate HTML invoice for PDF rendering on client
   */
  static async generateInvoiceData(billId) {
    const bill = await Bill.findById(billId)
      .populate('patientId', 'name phone email age gender address')
      .populate('hospitalId', 'name phone address email logo')
      .populate('appointmentId', 'appointmentDate doctor tokenNumber reason');

    if (!bill) throw new Error('Bill not found');

    const payments = await Payment.find({ billId: bill._id, status: 'COMPLETED' })
      .sort({ createdAt: -1 });

    return {
      bill: bill.toObject(),
      payments: payments.map(p => p.toObject()),
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = BillingService;
