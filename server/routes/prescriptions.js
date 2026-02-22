const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const Notification = require('../models/Notification');


// POST /api/prescriptions -> Doctor creates a prescription
router.post('/', auth, async (req, res) => {
    try {
        console.log('📝 Creating prescription:', req.body);
        const caller = await User.findById(req.user.id).populate('hospitalId', 'name');
        if (!caller || caller.role !== 'DOCTOR') {
            return res.status(403).json({ msg: 'Only doctors can write prescriptions' });
        }

        const {
            patientId, appointmentId, diagnosis, medicines, specialInstructions, symptoms, pharmacyId
        } = req.body;

        if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({ msg: 'Valid Patient ID is required' });
        }

        // Feature: Explicit Pharmacy Routing
        // If hospital has pharmacies, require one to be selected
        if (caller.hospitalId && !pharmacyId) {
            const hospital = await User.findById(caller.hospitalId?._id || caller.hospitalId);
            if (hospital && hospital.pharmacies && hospital.pharmacies.filter(p => p.isRegistered).length > 0) {
                return res.status(400).json({ msg: 'Please select a specific pharmacy for this prescription.' });
            }
        }

        // Fetch selected pharmacy name if provided
        let targetPharmacyName = '';
        if (pharmacyId) {
            const pharmUser = await User.findById(pharmacyId);
            if (pharmUser) targetPharmacyName = pharmUser.name;
        }

        // Validate appointmentId if provided
        let validAppointmentId = null;
        if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
            validAppointmentId = appointmentId;
        }

        // Generate a unique prescription number (e.g., RX-20260221-XXXX)
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const prescriptionNumber = `RX-${dateStr}-${randomStr}`;

        const prescription = new Prescription({
            prescriptionNumber,
            patientId: new mongoose.Types.ObjectId(patientId),
            appointmentId: validAppointmentId,
            doctorId: caller._id,
            doctorName: caller.name,
            hospitalId: caller.hospitalId?._id || caller.hospitalId,
            hospitalName: caller.hospitalId?.name || '',
            pharmacyId: pharmacyId || null,
            pharmacyName: targetPharmacyName,
            diagnosis: diagnosis || 'Not specified',
            medicines,
            specialInstructions: specialInstructions || '',
            symptoms: symptoms || [],
            status: 'PENDING'
        });

        await prescription.save();
        console.log('✅ Prescription saved successfully:', prescription._id);

        // Notify Patient (Non-blocking)
        if (patientId) {
            Notification.create({
                userId: patientId,
                message: `🩺 Dr. ${caller.name} has issued a new digital prescription for you.${targetPharmacyName ? ` (Sent to ${targetPharmacyName})` : ''}`,
                type: 'PRESCRIPTION'
            }).catch(err => console.error('Patient notification failed:', err.message));
        }

        // Notify Pharmacies
        let targetPharmacies = [];
        if (pharmacyId) {
            targetPharmacies = await User.find({ _id: pharmacyId });
        } else {
            const pQuery = { role: 'PHARMACY' };
            if (caller.hospitalId) pQuery.hospitalId = caller.hospitalId;
            targetPharmacies = await User.find(pQuery);
        }

        console.log(`📢 Notifying ${targetPharmacies.length} pharmacies`);

        targetPharmacies.forEach(pharmacy => {
            Notification.create({
                userId: pharmacy._id,
                message: `💊 New prescription received from Dr. ${caller.name}.`,
                type: 'PRESCRIPTION'
            }).catch(err => console.error('Pharmacy notification failed:', err.message));
        });

        const io = req.app.get('io');
        if (io) {
            console.log('📡 Emitting socket events...');
            // Notify patient
            io.to(`user_${patientId}`).emit('notification', {
                message: `New prescription from Dr. ${caller.name}`,
                type: 'PRESCRIPTION',
                prescriptionId: prescription._id
            });

            // Notify specific pharmacy OR hospital pharmacies
            if (pharmacyId) {
                io.to(`user_${pharmacyId}`).emit('new_prescription', { prescriptionId: prescription._id });
            } else if (caller.hospitalId) {
                console.log('🏥 Notifying hospital room:', caller.hospitalId);
                io.to(`hospital_${caller.hospitalId}`).emit('new_prescription', { prescriptionId: prescription._id });
            } else {
                io.emit('new_prescription', { prescriptionId: prescription._id });
            }
        }

        res.json(prescription);
    } catch (err) {
        console.error('❌ Prescription Error DETAILS:', err);
        res.status(500).json({
            msg: `Server Error: ${err.message}`,
            error: err.message
        });
    }
});

// GET /api/prescriptions/patient -> Patient views their prescriptions
router.get('/patient', auth, async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ patientId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('doctorId', 'name email')
            .populate('hospitalId', 'name');
        res.json(prescriptions);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// GET /api/prescriptions/pharmacy -> Pharmacy views pending prescriptions
router.get('/pharmacy', auth, async (req, res) => {
    try {
        const caller = await User.findById(req.user.id);
        if (!caller || caller.role !== 'PHARMACY') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        // If pharmacy is linked to a hospital, show only that hospital's prescriptions
        // Also respect specific pharmacyId if it was set by the doctor
        let query = { $or: [{ status: 'PENDING' }, { status: 'DISPENSED' }] };

        if (caller.hospitalId) {
            // Either specifically for this pharmacy, OR for the whole hospital (legacy/unassigned)
            query = {
                ...query,
                $and: [
                    { hospitalId: caller.hospitalId },
                    { $or: [{ pharmacyId: caller._id }, { pharmacyId: { $exists: false } }, { pharmacyId: null }] }
                ]
            };
        } else {
            // Standalone pharmacy filter
            query.pharmacyId = caller._id;
        }

        const prescriptions = await Prescription.find(query)
            .sort({ createdAt: -1 })
            .populate('patientId', 'name phone email')
            .populate('doctorId', 'name');
        res.json(prescriptions);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// PUT /api/prescriptions/:id/dispense -> Pharmacy marks as dispensed
router.put('/:id/dispense', auth, async (req, res) => {
    try {
        const caller = await User.findById(req.user.id);
        if (!caller || caller.role !== 'PHARMACY') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ msg: 'Prescription not found' });

        prescription.status = 'DISPENSED';
        await prescription.save();

        res.json({ success: true, prescription });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
