const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: false
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    doctorName: { type: String, required: true },
    hospitalName: { type: String },
    diagnosis: { type: String },

    medicines: [{
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: Number, required: true },
        instructions: {
            beforeFood: { type: Boolean, default: false },
            afterFood: { type: Boolean, default: true },
            notes: { type: String }
        }
    }],

    specialInstructions: { type: String },
    symptoms: [{ type: String }],

    // Status for Pharmacy: PENDING, DISPENSED
    status: {
        type: String,
        enum: ['PENDING', 'DISPENSED', 'CANCELLED'],
        default: 'PENDING'
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
