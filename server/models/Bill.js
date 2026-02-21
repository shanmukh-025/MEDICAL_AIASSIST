const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Billing Line Item Schema (embedded)
 * Follows HL7 FHIR Claim.item structure
 * Supports ICD-10 (diagnosis) and CPT/HCPCS (procedure) coding
 */
const BillingItemSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      'CONSULTATION',
      'PROCEDURE',
      'MEDICATION',
      'LAB_TEST',
      'IMAGING',
      'ROOM_CHARGE',
      'NURSING',
      'SURGICAL',
      'EMERGENCY',
      'EQUIPMENT',
      'MISCELLANEOUS'
    ],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  // Medical coding for insurance/compliance
  cptCode: { type: String },        // CPT/HCPCS procedure code
  icdCode: { type: String },        // ICD-10 diagnosis code
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100  // percentage
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100  // percentage
  },
  // Computed totals stored for consistency
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
  // Service date tracking
  serviceDate: { type: Date, default: Date.now },
  performedBy: { type: String },     // Doctor/staff name
  notes: { type: String, maxlength: 1000 }
}, { _id: true });

/**
 * Main Bill Schema
 * Industry-standard hospital billing document
 * HIPAA-compliant with audit trail and integrity verification
 */
const BillSchema = new mongoose.Schema({
  // Unique bill number (auto-generated, human-readable)
  billNumber: {
    type: String,
    unique: true,
    index: true
  },
  // References
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  dischargeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discharge',
    index: true
  },
  // Patient snapshot (denormalized for billing record permanence)
  patientSnapshot: {
    name: String,
    phone: String,
    email: String,
    age: Number,
    gender: String,
    address: String
  },
  // Bill type
  billType: {
    type: String,
    enum: ['OPD', 'IPD', 'EMERGENCY', 'DAY_CARE', 'PHARMACY_ONLY'],
    default: 'OPD'
  },
  // Line items
  items: [BillingItemSchema],
  // Financial summary
  subtotal: { type: Number, required: true, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  // Government scheme / subsidy discount
  govtScheme: {
    isApplied: { type: Boolean, default: false },
    schemeName: {
      type: String,
      enum: [
        'AYUSHMAN_BHARAT',
        'PM_JAY',
        'ESI',
        'CGHS',
        'STATE_HEALTH_SCHEME',
        'BPL_CARD',
        'SENIOR_CITIZEN',
        'EX_SERVICEMAN',
        'FREEDOM_FIGHTER',
        'JANANI_SURAKSHA',
        'RASHTRIYA_SWASTHYA_BIMA',
        'OTHER'
      ]
    },
    schemeId: { type: String },           // Patient's scheme enrollment ID
    schemeBeneficiaryName: { type: String },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    maxCoverageAmount: { type: Number, default: 0 },
    approvedAmount: { type: Number, default: 0 },
    verifiedBy: { type: String },
    verificationDate: { type: Date },
    notes: { type: String, maxlength: 500 }
  },
  // GST details
  gstDetails: {
    isGSTApplicable: { type: Boolean, default: false },
    hospitalGSTIN: { type: String },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalGST: { type: Number, default: 0 },
    sacCode: { type: String, default: '999312' }  // SAC code for healthcare
  },
  // Insurance details (optional)
  insurance: {
    provider: String,
    policyNumber: String,
    claimNumber: String,
    coverageAmount: { type: Number, default: 0 },
    claimStatus: {
      type: String,
      enum: ['NOT_FILED', 'PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'],
      default: 'NOT_FILED'
    },
    approvedAmount: { type: Number, default: 0 },
    rejectionReason: String
  },
  // Bill lifecycle
  status: {
    type: String,
    enum: [
      'DRAFT',          // Being prepared
      'FINALIZED',      // Ready for payment
      'PARTIALLY_PAID', // Some payment received
      'PAID',           // Fully paid
      'OVERDUE',        // Payment past due date
      'CANCELLED',      // Cancelled/voided
      'REFUNDED',       // Full refund issued
      'DISPUTED',       // Under dispute
      'WRITTEN_OFF'     // Bad debt written off
    ],
    default: 'DRAFT',
    index: true
  },
  // Dates
  billDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  finalizedAt: { type: Date },
  paidAt: { type: Date },
  // Integrity & security
  checksum: { type: String },  // HMAC of critical fields for tamper detection
  version: { type: Number, default: 1 },  // Optimistic concurrency
  // Metadata
  notes: { type: String, maxlength: 2000 },
  internalNotes: { type: String, maxlength: 2000 },  // Staff-only notes
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
BillSchema.index({ hospitalId: 1, status: 1 });
BillSchema.index({ patientId: 1, createdAt: -1 });
BillSchema.index({ hospitalId: 1, billDate: -1 });

/**
 * Pre-save: Auto-generate bill number and compute checksum
 */
BillSchema.pre('save', async function (next) {
  // Generate bill number on first save
  if (!this.billNumber) {
    const date = new Date();
    const prefix = 'BILL';
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('Bill').countDocuments({
      hospitalId: this.hospitalId,
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    this.billNumber = `${prefix}-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  // Recalculate totals from line items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalDiscount = this.items.reduce((sum, item) => sum + item.discountAmount, 0);
    this.totalTax = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
    this.grandTotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);

    // Apply GST if applicable
    if (this.gstDetails?.isGSTApplicable) {
      const taxableAmount = this.grandTotal - this.totalTax; // base amount without per-item taxes
      if (this.gstDetails.igstRate > 0) {
        this.gstDetails.igstAmount = Math.round(taxableAmount * this.gstDetails.igstRate / 100 * 100) / 100;
        this.gstDetails.cgstAmount = 0;
        this.gstDetails.sgstAmount = 0;
      } else {
        this.gstDetails.cgstAmount = Math.round(taxableAmount * (this.gstDetails.cgstRate || 0) / 100 * 100) / 100;
        this.gstDetails.sgstAmount = Math.round(taxableAmount * (this.gstDetails.sgstRate || 0) / 100 * 100) / 100;
        this.gstDetails.igstAmount = 0;
      }
      this.gstDetails.totalGST = this.gstDetails.cgstAmount + this.gstDetails.sgstAmount + this.gstDetails.igstAmount;
      this.grandTotal += this.gstDetails.totalGST;
    }

    // Apply govt scheme discount
    let schemeDiscount = 0;
    if (this.govtScheme?.isApplied && this.govtScheme.discountPercent > 0) {
      schemeDiscount = Math.round(this.grandTotal * this.govtScheme.discountPercent / 100 * 100) / 100;
      if (this.govtScheme.maxCoverageAmount > 0) {
        schemeDiscount = Math.min(schemeDiscount, this.govtScheme.maxCoverageAmount);
      }
      this.govtScheme.approvedAmount = schemeDiscount;
      this.grandTotal = Math.round((this.grandTotal - schemeDiscount) * 100) / 100;
    }

    this.balanceDue = this.grandTotal - this.amountPaid - (this.insurance?.approvedAmount || 0);
    if (this.balanceDue < 0) this.balanceDue = 0;
  }

  // Generate checksum for tamper detection
  this.checksum = this._generateChecksum();

  next();
});

/**
 * Generate HMAC checksum of critical billing fields
 * Used to detect unauthorized modifications
 */
BillSchema.methods._generateChecksum = function () {
  const secret = process.env.BILLING_HMAC_SECRET || process.env.JWT_SECRET;
  const data = JSON.stringify({
    billNumber: this.billNumber,
    patientId: this.patientId.toString(),
    hospitalId: this.hospitalId.toString(),
    grandTotal: this.grandTotal,
    items: this.items.map(i => ({
      description: i.description,
      lineTotal: i.lineTotal
    }))
  });
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify bill integrity
 */
BillSchema.methods.verifyIntegrity = function () {
  return this.checksum === this._generateChecksum();
};

/**
 * Recalculate a line item's totals
 */
BillSchema.statics.calculateLineItem = function (item) {
  const subtotal = item.quantity * item.unitPrice;
  const discountAmount = subtotal * (item.discount || 0) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (item.taxRate || 0) / 100;
  const lineTotal = taxableAmount + taxAmount;
  return {
    ...item,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100
  };
};

module.exports = mongoose.model('Bill', BillSchema);
