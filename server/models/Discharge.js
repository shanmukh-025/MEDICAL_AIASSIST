const mongoose = require('mongoose');

/**
 * Discharge Schema
 * Clinical discharge summary following HL7 FHIR ClinicalImpression / Encounter.hospitalization
 * Links to billing for seamless discharge-to-billing workflow
 */
const DischargeSchema = new mongoose.Schema({
  // Unique discharge ID
  dischargeNumber: {
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
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    index: true
  },
  // Patient snapshot at discharge
  patientSnapshot: {
    name: String,
    age: Number,
    gender: String,
    phone: String,
    bloodGroup: String
  },
  // Admission details
  admissionDate: { type: Date },
  dischargeDate: { type: Date, default: Date.now },
  admissionType: {
    type: String,
    enum: ['OPD', 'IPD', 'EMERGENCY', 'DAY_CARE'],
    default: 'OPD'
  },
  wardRoom: { type: String },
  bedNumber: { type: String },
  // Clinical information
  chiefComplaint: { type: String, required: true },
  admissionDiagnosis: { type: String },
  // Discharge diagnosis (ICD-10 coded)
  dischargeDiagnosis: [{
    code: String,      // ICD-10 code
    description: String,
    type: {
      type: String,
      enum: ['PRIMARY', 'SECONDARY', 'COMORBIDITY'],
      default: 'PRIMARY'
    }
  }],
  // Procedures performed (CPT coded)
  procedures: [{
    code: String,      // CPT code
    description: String,
    date: Date,
    performedBy: String,
    notes: String
  }],
  // Treatment summary
  treatmentSummary: { type: String, maxlength: 5000 },
  courseInHospital: { type: String, maxlength: 5000 },
  // Vitals at discharge
  vitalsAtDischarge: {
    bloodPressure: String,
    heartRate: Number,
    temperature: Number,
    oxygenSaturation: Number,
    respiratoryRate: Number,
    weight: Number
  },
  // Lab results summary
  labResults: [{
    testName: String,
    result: String,
    normalRange: String,
    date: Date,
    isAbnormal: Boolean
  }],
  // Discharge medications
  medications: [{
    name: { type: String, required: true },
    dosage: String,
    frequency: String,
    duration: String,
    route: {
      type: String,
      enum: ['ORAL', 'IV', 'IM', 'SC', 'TOPICAL', 'INHALATION', 'OTHER'],
      default: 'ORAL'
    },
    instructions: String,
    isNew: { type: Boolean, default: true }  // New vs continued medication
  }],
  // Follow-up instructions
  followUp: {
    required: { type: Boolean, default: false },
    date: Date,
    doctor: String,
    department: String,
    instructions: String
  },
  // Discharge instructions for patient
  instructions: {
    diet: { type: String, maxlength: 2000 },
    activity: { type: String, maxlength: 2000 },
    woundCare: { type: String, maxlength: 2000 },
    warningSignsToWatch: [String],
    generalInstructions: { type: String, maxlength: 5000 },
    emergencyContactInfo: { type: String }
  },
  // Discharge condition
  conditionAtDischarge: {
    type: String,
    enum: [
      'IMPROVED',
      'STABLE',
      'UNCHANGED',
      'DETERIORATED',
      'CRITICAL',
      'EXPIRED',
      'LAMA',     // Left Against Medical Advice
      'ABSCONDED'
    ],
    default: 'IMPROVED'
  },
  dischargeType: {
    type: String,
    enum: [
      'NORMAL',
      'AMA',          // Against Medical Advice
      'TRANSFER',
      'REFERRAL',
      'DEATH',
      'ABSCONDED'
    ],
    default: 'NORMAL'
  },
  // If transferred/referred
  transferDetails: {
    facilityName: String,
    reason: String,
    contactPerson: String,
    contactNumber: String
  },
  // Discharge lifecycle
  status: {
    type: String,
    enum: [
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'COMPLETED',     // Fully discharged + bill settled
      'CANCELLED'
    ],
    default: 'DRAFT',
    index: true
  },
  // Approvals
  preparedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: { type: Date },
  // Doctor who is discharging
  dischargingDoctor: {
    name: String,
    specialization: String,
    registrationNumber: String
  },
  // Digital signature placeholder (base64 or reference)
  doctorSignature: { type: String },
  // Notes
  notes: { type: String, maxlength: 2000 },
  // Whether bill is settled before discharge
  isBillSettled: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
DischargeSchema.index({ hospitalId: 1, status: 1 });
DischargeSchema.index({ patientId: 1, createdAt: -1 });
DischargeSchema.index({ hospitalId: 1, dischargeDate: -1 });

/**
 * Pre-save: Auto-generate discharge number
 */
DischargeSchema.pre('save', async function (next) {
  if (!this.dischargeNumber) {
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('Discharge').countDocuments({
      hospitalId: this.hospitalId,
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    this.dischargeNumber = `DC-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Discharge', DischargeSchema);
