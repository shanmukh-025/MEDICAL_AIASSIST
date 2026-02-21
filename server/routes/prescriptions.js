const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const Notification = require('../models/Notification');


// POST /api/prescriptions -> Doctor creates a prescription
router.post('/', auth, async (req, res) => {
    try {
        console.log('📝 Creating prescription:', req.body);
        const caller = await User.findById(req.user.id);
        if (!caller || caller.role !== 'DOCTOR') {
            return res.status(403).json({ msg: 'Only doctors can write prescriptions' });
        }

        const {
            patientId, appointmentId, diagnosis, medicines, specialInstructions, symptoms
        } = req.body;

        if (!patientId) {
            return res.status(400).json({ msg: 'Patient ID is required' });
        }

        const prescription = new Prescription({
            patientId,
            appointmentId,
            doctorId: caller._id,
            doctorName: caller.name,
            hospitalId: caller.hospitalId,
            diagnosis,
            medicines,
            specialInstructions,
            symptoms,
            status: 'PENDING'
        });

        await prescription.save();
        console.log('✅ Prescription saved:', prescription._id);

        // Notify Patient (Non-blocking)
        if (patientId) {
            Notification.create({
                userId: patientId,
                message: `🩺 Dr. ${caller.name} has issued a new digital prescription for you.`,
                type: 'PRESCRIPTION'
            }).catch(err => console.error('Patient notification failed:', err.message));
        }

        // Notify Pharmacies
        const pQuery = { role: 'PHARMACY' };
        if (caller.hospitalId) pQuery.hospitalId = caller.hospitalId;

        const pharmacies = await User.find(pQuery);
        console.log(`📢 Notifying ${pharmacies.length} pharmacies`);

        pharmacies.forEach(pharmacy => {
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

            // Notify hospital pharmacies
            if (caller.hospitalId) {
                console.log('🏥 Notifying hospital room:', caller.hospitalId);
                io.to(`hospital_${caller.hospitalId}`).emit('new_prescription', { prescriptionId: prescription._id });
            } else {
                io.emit('new_prescription', { prescriptionId: prescription._id });
            }
        }

        res.json(prescription);
    } catch (err) {
        console.error('❌ Prescription Error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
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
        // Otherwise show all (for standalone pharmacies)
        let query = { status: 'PENDING' };
        if (caller.hospitalId) {
            query.hospitalId = caller.hospitalId;
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
