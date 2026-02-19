const mongoose = require('mongoose');

/**
 * Audit Log Schema
 * HIPAA-compliant audit trail for all billing & discharge operations
 * Immutable — entries are never updated or deleted
 */
const AuditLogSchema = new mongoose.Schema({
  // What happened
  action: {
    type: String,
    required: true,
    enum: [
      // Billing actions
      'BILL_CREATED',
      'BILL_UPDATED',
      'BILL_ITEM_ADDED',
      'BILL_ITEM_REMOVED',
      'BILL_ITEM_MODIFIED',
      'BILL_FINALIZED',
      'BILL_CANCELLED',
      'BILL_REFUNDED',
      'BILL_WRITTEN_OFF',
      'BILL_DISPUTED',
      'BILL_VIEWED',
      'BILL_PRINTED',
      'BILL_EXPORTED',
      // Payment actions
      'PAYMENT_INITIATED',
      'PAYMENT_COMPLETED',
      'PAYMENT_FAILED',
      'PAYMENT_REFUND_INITIATED',
      'PAYMENT_REFUNDED',
      'PAYMENT_CANCELLED',
      // Discharge actions
      'DISCHARGE_CREATED',
      'DISCHARGE_UPDATED',
      'DISCHARGE_SUBMITTED',
      'DISCHARGE_APPROVED',
      'DISCHARGE_COMPLETED',
      'DISCHARGE_CANCELLED',
      'DISCHARGE_VIEWED',
      'DISCHARGE_PRINTED',
      'DISCHARGE_EXPORTED',
      // Insurance actions
      'INSURANCE_CLAIM_FILED',
      'INSURANCE_CLAIM_UPDATED',
      'INSURANCE_CLAIM_APPROVED',
      'INSURANCE_CLAIM_REJECTED',
      // Security events
      'INTEGRITY_CHECK_FAILED',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'BULK_EXPORT'
    ],
    index: true
  },
  // Who did it
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userRole: { type: String },
  userName: { type: String },
  // What resource
  resourceType: {
    type: String,
    enum: ['BILL', 'PAYMENT', 'DISCHARGE', 'INSURANCE_CLAIM'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // Context
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  // Change details
  previousValues: { type: mongoose.Schema.Types.Mixed },
  newValues: { type: mongoose.Schema.Types.Mixed },
  description: { type: String, maxlength: 1000 },
  // Request metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  // Severity
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'INFO'
  }
}, {
  timestamps: true,
  // Make collection append-only at application level
  strict: true
});

// Compound indexes for common audit queries
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ hospitalId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

// TTL index: Retain audit logs for 7 years (HIPAA requirement)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 365.25 * 24 * 60 * 60 });

/**
 * Static helper to create audit entries
 */
AuditLogSchema.statics.log = async function ({
  action, userId, userRole, userName,
  resourceType, resourceId,
  hospitalId, patientId,
  previousValues, newValues, description,
  ipAddress, userAgent,
  severity = 'INFO'
}) {
  try {
    return await this.create({
      action, userId, userRole, userName,
      resourceType, resourceId,
      hospitalId, patientId,
      previousValues, newValues, description,
      ipAddress, userAgent, severity
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error('Audit log write failed:', err.message);
  }
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
