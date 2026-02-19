const mongoose = require('mongoose');

/**
 * Payment Schema
 * Tracks individual payment transactions against a bill.
 * Supports multiple payment methods and partial payments.
 * PCI-DSS compliant: NO raw card numbers stored.
 */
const PaymentSchema = new mongoose.Schema({
  // Reference to the bill
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'INR'
  },
  method: {
    type: String,
    enum: [
      'CASH',
      'UPI',
      'CARD',
      'NET_BANKING',
      'INSURANCE',
      'WALLET',
      'CHEQUE',
      'BANK_TRANSFER'
    ],
    required: true
  },
  // Transaction reference (gateway/receipt ID) - no raw card data
  transactionId: { type: String },
  referenceNumber: { type: String },
  // UPI specific
  upiId: { type: String },
  // Card specific (masked, PCI-DSS compliant)
  cardLast4: { type: String, maxlength: 4 },
  cardNetwork: {
    type: String,
    enum: ['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'OTHER', null]
  },
  // Cheque specific
  chequeNumber: { type: String },
  bankName: { type: String },
  // Insurance specific
  insuranceClaimId: { type: String },
  // Payment status
  status: {
    type: String,
    enum: [
      'INITIATED',
      'PROCESSING',
      'PENDING_VERIFICATION', // patient submitted UPI txn ID, awaiting hospital confirmation
      'COMPLETED',
      'FAILED',
      'REFUND_INITIATED',
      'REFUNDED',
      'CANCELLED'
    ],
    default: 'INITIATED',
    index: true
  },
  // Refund tracking
  refundAmount: { type: Number, default: 0 },
  refundReason: { type: String },
  refundedAt: { type: Date },
  originalPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  // Receipt
  receiptNumber: { type: String, unique: true, sparse: true },
  // Metadata
  notes: { type: String, maxlength: 500 },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: { type: Date },
  failureReason: { type: String },
  // IP & device info for fraud detection
  ipAddress: { type: String },
  userAgent: { type: String }
}, {
  timestamps: true
});

// Indexes for efficient queries
PaymentSchema.index({ billId: 1, status: 1 });
PaymentSchema.index({ hospitalId: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 });

/**
 * Pre-save: Generate receipt number for completed payments
 */
PaymentSchema.pre('save', async function (next) {
  if (this.status === 'COMPLETED' && !this.receiptNumber) {
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('Payment').countDocuments({
      hospitalId: this.hospitalId,
      status: 'COMPLETED',
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    this.receiptNumber = `RCP-${datePart}-${String(count + 1).padStart(4, '0')}`;
    if (!this.completedAt) this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
