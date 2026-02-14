const mongoose = require('mongoose');
require('dotenv').config();

const SymptomLog = require('./models/SymptomLog');
const User = require('./models/User');
const FamilyMember = require('./models/FamilyMember');

// Sample symptom data with a realistic progression
const generateSampleSymptoms = (userId) => {
  const today = new Date();
  const symptoms = [
    {
      user: userId,
      familyMember: null,
      symptoms: ['Fever', 'Headache', 'Body Pain'],
      severity: 9,
      duration: 'Few Hours',
      notes: 'Started feeling unwell after lunch. High temperature.',
      aiAnalysis: {
        primaryDiagnosis: 'Viral Fever',
        confidence: 85,
        urgencyLevel: 'medium',
        recommendations: ['Rest', 'Hydration', 'Monitor temperature'],
        trend: 'stable'
      },
      loggedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    },
    {
      user: userId,
      familyMember: null,
      symptoms: ['Fever', 'Headache', 'Cough', 'Sore Throat'],
      severity: 8,
      duration: '1 Day',
      notes: 'Cough and sore throat developed. Still feverish.',
      aiAnalysis: {
        primaryDiagnosis: 'Upper Respiratory Infection',
        confidence: 80,
        urgencyLevel: 'medium',
        recommendations: ['Continue rest', 'Warm water gargling', 'Steam inhalation'],
        trend: 'worsening'
      },
      loggedAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
    },
    {
      user: userId,
      familyMember: null,
      symptoms: ['Fever', 'Cough', 'Sore Throat', 'Fatigue'],
      severity: 7,
      duration: '2-3 Days',
      notes: 'Fever slightly reduced but cough persists. Feeling very tired.',
      aiAnalysis: {
        primaryDiagnosis: 'Viral Upper Respiratory Infection',
        confidence: 88,
        urgencyLevel: 'medium',
        recommendations: ['Plenty of fluids', 'Adequate sleep', 'Avoid cold drinks'],
        trend: 'improving'
      },
      loggedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    },
    {
      user: userId,
      familyMember: null,
      symptoms: ['Fever', 'Cough', 'Fatigue'],
      severity: 6,
      duration: '2-3 Days',
      notes: 'Fever much better. Cough still present but improving.',
      aiAnalysis: {
        primaryDiagnosis: 'Recovering from Viral Infection',
        confidence: 90,
        urgencyLevel: 'low',
        recommendations: ['Continue rest', 'Maintain hydration', 'Light meals'],
        trend: 'improving'
      },
      loggedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
    },
    {
      user: userId,
      familyMember: null,
      symptoms: ['Cough', 'Fatigue'],
      severity: 4,
      duration: '1 Week',
      notes: 'No fever! Just residual cough and tiredness.',
      aiAnalysis: {
        primaryDiagnosis: 'Post-viral Recovery',
        confidence: 92,
        urgencyLevel: 'low',
        recommendations: ['Resume normal activities gradually', 'Continue hydration', 'Nutritious diet'],
        trend: 'improving'
      },
      loggedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    {
      user: userId,
      familyMember: null,
      symptoms: ['Cough'],
      severity: 3,
      duration: '1 Week',
      notes: 'Feeling much better. Only occasional cough remains.',
      aiAnalysis: {
        primaryDiagnosis: 'Residual Post-viral Cough',
        confidence: 88,
        urgencyLevel: 'low',
        recommendations: ['Warm fluids', 'Honey for cough relief', 'Avoid irritants'],
        trend: 'improving'
      },
      loggedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      user: userId,
      familyMember: null,
      symptoms: ['Mild Cough'],
      severity: 2,
      duration: '1 Week',
      notes: 'Almost fully recovered. Just a very mild cough.',
      aiAnalysis: {
        primaryDiagnosis: 'Near Complete Recovery',
        confidence: 95,
        urgencyLevel: 'low',
        recommendations: ['Monitor for complete resolution', 'Continue healthy habits'],
        trend: 'improving'
      },
      loggedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    }
  ];

  return symptoms;
};

// Generate sample symptoms for a family member (child with allergy symptoms)
const generateFamilyMemberSymptoms = (userId, familyMemberId) => {
  const today = new Date();
  const symptoms = [
    {
      user: userId,
      familyMember: familyMemberId,
      symptoms: ['Sneezing', 'Runny Nose', 'Itchy Eyes'],
      severity: 6,
      duration: 'Few Hours',
      notes: 'Started sneezing after playing outside',
      aiAnalysis: {
        primaryDiagnosis: 'Allergic Rhinitis',
        confidence: 82,
        urgencyLevel: 'low',
        recommendations: ['Avoid allergens', 'Antihistamine if needed', 'Keep windows closed'],
        trend: 'stable'
      },
      loggedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
    },
    {
      user: userId,
      familyMember: familyMemberId,
      symptoms: ['Sneezing', 'Runny Nose', 'Nasal Congestion'],
      severity: 7,
      duration: '1 Day',
      notes: 'Symptoms worse in the morning',
      aiAnalysis: {
        primaryDiagnosis: 'Seasonal Allergies',
        confidence: 85,
        urgencyLevel: 'low',
        recommendations: ['Antihistamine medication', 'Nasal spray', 'Clean bedding'],
        trend: 'worsening'
      },
      loggedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    {
      user: userId,
      familyMember: familyMemberId,
      symptoms: ['Mild Sneezing', 'Runny Nose'],
      severity: 4,
      duration: '2-3 Days',
      notes: 'Better after taking allergy medication',
      aiAnalysis: {
        primaryDiagnosis: 'Improving Allergic Reaction',
        confidence: 90,
        urgencyLevel: 'low',
        recommendations: ['Continue medication', 'Monitor symptoms', 'Identify triggers'],
        trend: 'improving'
      },
      loggedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    }
  ];

  return symptoms;
};

// Seed function
async function seedSymptoms() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find first user (or create a test user)
    let user = await User.findOne();
    
    if (!user) {
      console.log('❌ No users found. Please create a user account first.');
      console.log('   Run: npm run dev (in server directory) and register via the app');
      process.exit(1);
    }

    console.log(`📝 Seeding symptoms for user: ${user.email}`);

    // Delete existing symptom logs for this user (optional)
    await SymptomLog.deleteMany({ user: user._id });
    console.log('🗑️  Cleared existing symptom logs');

    // Generate and insert sample symptoms for user
    const userSymptoms = generateSampleSymptoms(user._id);
    await SymptomLog.insertMany(userSymptoms);
    console.log(`✅ Seeded ${userSymptoms.length} symptom logs for user`);

    // Check if user has family members and seed symptoms for them too
    const familyMembers = await FamilyMember.find({ user: user._id });
    
    if (familyMembers.length > 0) {
      const firstMember = familyMembers[0];
      const familySymptoms = generateFamilyMemberSymptoms(user._id, firstMember._id);
      await SymptomLog.insertMany(familySymptoms);
      console.log(`✅ Seeded ${familySymptoms.length} symptom logs for family member: ${firstMember.name} (${firstMember.relation})`);
    } else {
      console.log('ℹ️  No family members found. Only seeding user symptoms.');
      console.log('   To test family tracking: Add a family member via Family Profile page');
    }

    const totalLogs = userSymptoms.length + (familyMembers.length > 0 ? 3 : 0);
    
    console.log(`\n📊 Sample Data Summary:`);
    console.log(`   Total Symptom Logs: ${totalLogs}`);
    console.log(`   - User Symptoms: Fever → Upper Respiratory Infection → Recovery (7 days)`);
    console.log(`   - User Severity Trend: 9/10 → 2/10 (Improving)`);
    if (familyMembers.length > 0) {
      console.log(`   - Family Member: Seasonal Allergies (4 days)`);
      console.log(`   - Family Severity Trend: 6/10 → 4/10 (Improving)`);
    }
    console.log(`   - AI Analysis: Included for all entries`);
    console.log('\n🎯 You can now:');
    console.log('   1. Login with this user account');
    console.log('   2. Go to Symptom Analysis page');
    console.log('   3. Switch to "View History" mode');
    console.log('   4. Toggle between "Myself" and family members in the dropdown');
    console.log('   5. See charts, timeline, and trend analysis for each person');
    console.log('   6. Export as PDF to test export functionality\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding symptoms:', error);
    process.exit(1);
  }
}

// Run seeder
seedSymptoms();
