const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const HealthLog = require('../models/HealthLog');
const SymptomLog = require('../models/SymptomLog');

// @route   POST api/health/log
// @desc    Log BMI or Illness
router.post('/log', auth, async (req, res) => {
  const { type, value, description } = req.body;
  try {
    const newLog = new HealthLog({
      user: req.user.id,
      type,
      value,
      description
    });
    await newLog.save();
    res.json(newLog);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/health/history
// @desc    Get all logs
router.get('/history', auth, async (req, res) => {
  try {
    const logs = await HealthLog.find({ user: req.user.id }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/health/check-status
// @desc    Check if user hasn't updated in 3 weeks (21 days)
router.get('/check-status', auth, async (req, res) => {
  try {
    const lastLog = await HealthLog.findOne({ user: req.user.id }).sort({ date: -1 });
    
    if (!lastLog) {
      // New user or no logs ever
      return res.json({ needsUpdate: true, daysSince: 'Never' });
    }

    const today = new Date();
    const lastDate = new Date(lastLog.date);
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 21) {
        res.json({ needsUpdate: true, daysSince: diffDays });
    } else {
        res.json({ needsUpdate: false, daysSince: diffDays });
    }
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// ============================================
// SYMPTOM TRACKING ROUTES
// ============================================

// @route   POST api/health/symptoms/log
// @desc    Log symptoms for user or family member
router.post('/symptoms/log', auth, async (req, res) => {
  const { familyMemberId, symptoms, severity, duration, notes, aiAnalysis } = req.body;
  
  try {
    console.log('💊 Saving symptom log:', { 
      userId: req.user.id, 
      familyMemberId, 
      symptoms, 
      severity 
    });
    
    const newLog = new SymptomLog({
      user: req.user.id,
      familyMember: familyMemberId || null,
      symptoms,
      severity,
      duration,
      notes: notes || '',
      aiAnalysis: aiAnalysis || {}
    });
    
    await newLog.save();
    console.log('✅ Symptom log saved successfully:', newLog._id);
    res.json(newLog);
  } catch (err) {
    console.error('❌ Error logging symptoms:', err);
    console.error('Error details:', err.message, err.stack);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @route   GET api/health/symptoms/history
// @desc    Get symptom history for user
router.get('/symptoms/history', auth, async (req, res) => {
  const { days = 30 } = req.query; // Default to last 30 days
  
  try {
    console.log('📊 Fetching symptom history for user:', req.user.id, 'Days:', days);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    const logs = await SymptomLog.find({
      user: req.user.id,
      familyMember: null, // User's own symptoms
      loggedAt: { $gte: cutoffDate }
    })
    .sort({ loggedAt: -1 });
    
    console.log('✅ Found symptom logs:', logs.length);
    res.json(logs);
  } catch (err) {
    console.error('❌ Error fetching symptom history:', err);
    console.error('Error details:', err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @route   GET api/health/symptoms/member/:memberId
// @desc    Get symptom history for a family member
router.get('/symptoms/member/:memberId', auth, async (req, res) => {
  const { days = 30 } = req.query;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    const logs = await SymptomLog.find({
      user: req.user.id,
      familyMember: req.params.memberId,
      loggedAt: { $gte: cutoffDate }
    })
    .sort({ loggedAt: -1 })
    .populate('familyMember', 'name relation age');
    
    res.json(logs);
  } catch (err) {
    console.error('Error fetching family member symptoms:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET api/health/symptoms/all
// @desc    Get all symptom logs (user + all family members)
router.get('/symptoms/all', auth, async (req, res) => {
  const { days = 30 } = req.query;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    const logs = await SymptomLog.find({
      user: req.user.id,
      loggedAt: { $gte: cutoffDate }
    })
    .sort({ loggedAt: -1 })
    .populate('familyMember', 'name relation age');
    
    res.json(logs);
  } catch (err) {
    console.error('Error fetching all symptom logs:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;