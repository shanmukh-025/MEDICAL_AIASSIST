const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// --- 1. DYNAMIC MODEL FINDER (Restored & Cached) ---
let cachedModel = null;

// --- REQUEST DEDUPLICATION CACHE ---
// Cache recent analysis results to prevent duplicate AI calls
const analysisCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache TTL

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      analysisCache.delete(key);
    }
  }
}, 30000); // Clean every 30 seconds

// Generate cache key from request
function getCacheKey(userId, symptoms, duration, severity) {
  return `${userId}:${symptoms.sort().join(',')}:${duration}:${severity}`;
}

// --- API KEY ROTATION SUPPORT ---
let currentKeyIndex = 0;
let apiKeyFailureCount = new Map(); // Track failures per key

function getApiKeys() {
  const keys = [];
  // Support multiple API keys: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);

  return keys;
}

function getNextApiKey() {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("No API Key found");

  // Try to find a key that hasn't failed recently
  for (let i = 0; i < keys.length; i++) {
    const key = keys[currentKeyIndex];
    const failures = apiKeyFailureCount.get(key) || 0;

    if (failures < 3) { // Allow up to 3 failures before skipping
      return key;
    }

    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  }

  // All keys have failures, reset and use first one
  apiKeyFailureCount.clear();
  currentKeyIndex = 0;
  return keys[0];
}

function markKeyAsFailed(apiKey) {
  const failures = (apiKeyFailureCount.get(apiKey) || 0) + 1;
  apiKeyFailureCount.set(apiKey, failures);

  // Rotate to next key
  const keys = getApiKeys();
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  console.log(`⚠️ API key ${currentKeyIndex} quota exceeded, rotating to next key...`);
}

async function getWorkingModel(apiKey) {
  // If we already found a working model, use it (saves API calls)
  if (cachedModel) return cachedModel;

  try {
    console.log("🔍 Auto-detecting available AI models...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (!data.models) return null;

    // Find the first model that supports text generation
    const validModel = data.models.find(m =>
      m.supportedGenerationMethods?.includes("generateContent")
    );

    if (validModel) {
      // Clean up the name (remove "models/" prefix)
      cachedModel = validModel.name.replace("models/", "");
      console.log(`✅ Connected to: ${cachedModel}`);
      return cachedModel;
    }
    return null;
  } catch (err) {
    console.error("Model detection failed, using fallback.");
    return null;
  }
}

// --- 2. API CALLER WITH RETRY LOGIC ---
async function callGemini(prompt, retryCount = 0) {
  const apiKey = getNextApiKey();

  // A. Find a working model
  let modelName = await getWorkingModel(apiKey);

  // B. Fallback if detection fails (Safe default)
  if (!modelName) modelName = "gemini-1.5-flash";

  // C. Make the call
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || response.statusText;

      // Check if it's a quota error
      if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || response.status === 429) {
        markKeyAsFailed(apiKey);

        // Retry with next API key if available
        const keys = getApiKeys();
        if (keys.length > 1 && retryCount < keys.length) {
          console.log(`🔄 Retrying with alternate API key (attempt ${retryCount + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          return callGemini(prompt, retryCount + 1);
        }
      }

      throw new Error(msg);
    }

    if (!data.candidates || !data.candidates[0].content) {
      return "{}"; // Empty response safety
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    // If all retries failed, throw the error
    if (retryCount >= getApiKeys().length - 1) {
      throw error;
    }
    throw error;
  }
}

// --- 3. ROUTES ---

// Chat Route (Updated for Telugu Support)
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, language } = req.body; // Receive language from frontend

    console.log('🔍 Chat request received:', { message, language });

    // NSFW Content Filter
    const inappropriatePatterns = [
      /\bsex\b/i,
      /\bmasturbat/i,
      /\bporn/i,
      /\berotic/i,
      /\bxxx\b/i,
      /\badult content/i,
      /\bintercourse\b/i,
      /\borgasm/i,
      /\blibido\b/i,
      /\barousal\b/i,
      /\bsexual pleasure/i,
      /\bsexy\b/i,
      /\bnude/i,
      /\bnaked/i,
      /\bviagra\b/i,
      /\berectile\b/i
    ];

    // Allow legitimate medical terms
    const legitimateMedicalPatterns = [
      /sexually transmitted/i,
      /\bstd\b/i,
      /\bsti\b/i,
      /reproductive health/i,
      /menstrual/i,
      /pregnancy/i,
      /contracepti/i,
      /birth control/i,
      /gynecolog/i,
      /urology/i,
      /testicular/i,
      /ovarian/i,
      /prostate/i,
      /cervical/i,
      /sexual health screening/i,
      /hiv/i,
      /aids\b/i,
      /gonorrhea/i,
      /syphilis/i,
      /chlamydia/i,
      /herpes/i
    ];

    // Check if message contains inappropriate content
    const hasInappropriateContent = inappropriatePatterns.some(pattern => pattern.test(message));
    const hasLegitimateMedicalContext = legitimateMedicalPatterns.some(pattern => pattern.test(message));

    console.log('🛡️ Filter check:', { hasInappropriateContent, hasLegitimateMedicalContext });

    // Block if inappropriate and NOT a legitimate medical query
    if (hasInappropriateContent && !hasLegitimateMedicalContext) {
      console.log('🚫 BLOCKED: Inappropriate content detected');
      const rejectionMessage = language === 'te'
        ? 'క్షమించండి, నేను అనుచితమైన లేదా పరిణతి చెందిన కంటెంట్‌కు సమాధానం ఇవ్వలేను. నేను ఒక వైద్య సహాయకుడిని మాత్రమే. దయచేసి ఆరోగ్య సంబంధిత ప్రశ్నలు మాత్రమే అడగండి.'
        : 'I\'m sorry, I cannot respond to inappropriate or adult content. I am a medical assistant designed to help with health-related questions only. Please ask about symptoms, treatments, or general health concerns.';

      return res.json({ reply: rejectionMessage });
    }

    let instruction = "";
    if (language === 'te') {
      instruction = `
            You are MediBot, a helpful Medical Assistant.
            The user has selected TELUGU language.
            
            RULES:
            1. You ONLY answer medical and health-related questions.
            2. If someone asks non-medical questions (sports, entertainment, general knowledge, etc.), politely say in Telugu: "క్షమించండి, నేను కేవలం వైద్య ప్రశ్నలకు మాత్రమే సమాధానం ఇస్తాను. దయచేసి ఆరోగ్య సంబంధిత ప్రశ్నలు అడగండి."
            3. You MUST reply in TELUGU script (తెలుగు) ONLY.
            4. Even if the user asks in English, translate your answer to Telugu.
            5. Keep the medical advice simple and easy to understand for villagers.
            6. You must NOT answer inappropriate or adult content questions. Only professional medical queries are allowed.
        `;
    } else {
      instruction = `
            You are MediBot, a helpful Medical Assistant.
            Rules:
            1. You ONLY answer medical and health-related questions.
            2. If someone asks non-medical questions (like sports, entertainment, general knowledge, etc.), politely say: "I'm sorry, I can only help with medical and health-related questions. Please ask me about health concerns, symptoms, or medical advice."
            3. Explain remedies clearly.
            4. Explain medicines simply.
            5. Only refer to a doctor if symptoms are severe.
            6. Be polite and concise in English.
            7. You must NOT answer inappropriate or adult content questions. Only professional medical queries are allowed.
        `;
    }

    const prompt = `${instruction}\nUser: "${message}"\nMediBot Answer:`;

    const text = await callGemini(prompt);
    res.json({ reply: text });

  } catch (err) {
    console.error("Chat Error:", err.message);
    res.json({ reply: "I'm having trouble connecting. Please try again." });
  }
});

// Diet Route (Updated for Telugu Support)
router.post('/generate-diet', auth, async (req, res) => {
  try {
    const { bmi, conditions, preference, language } = req.body;

    // Language specific instruction for the content INSIDE the JSON
    const langNote = language === 'te'
      ? "IMPORTANT: Provide all values (Meal Names, Reasons, Title, Description) in TELUGU language. However, keep the JSON KEYS (like 'time', 'type', 'item') in English."
      : "Provide all text in English.";

    const prompt = `
      Act as a nutritionist. Create a 1-day meal plan for:
      BMI: ${bmi}, Conditions: ${conditions}, Diet: ${preference}.
      
      ${langNote}

      You MUST return valid JSON with this EXACT structure:
      {
        "title": "Plan Name",
        "desc": "Short description",
        "color": "bg-emerald-50",
        "meals": [
          { "time": "8:00 AM", "type": "Breakfast", "item": "Food Name", "reason": "Why?" },
          { "time": "1:00 PM", "type": "Lunch", "item": "Food Name", "reason": "Why?" },
          { "time": "8:00 PM", "type": "Dinner", "item": "Food Name", "reason": "Why?" }
        ],
        "good": ["Food 1", "Food 2"],
        "bad": ["Avoid 1", "Avoid 2"]
      }
    `;

    const text = await callGemini(prompt);
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(cleanJson));

  } catch (err) {
    console.error("Diet Error:", err.message);
    // Fallback
    res.json({
      title: "Standard Plan (Offline)",
      desc: "AI Unavailable - Using Backup Plan",
      color: "bg-blue-50",
      meals: [
        { time: "8:00 AM", type: "Breakfast", "item": "Oatmeal", reason: "Energy" },
        { time: "1:00 PM", type: "Lunch", "item": "Rice & Lentils", reason: "Protein" },
        { time: "8:00 PM", type: "Dinner", "item": "Vegetables", reason: "Digestion" }
      ],
      good: ["Water"], bad: ["Sugar"]
    });
  }
});

// Swap Route (Updated for Telugu Support)
router.post('/swap-food', auth, async (req, res) => {
  try {
    const { originalFood, reason, language } = req.body;

    const langPrompt = language === 'te'
      ? `Suggest 1 alternative food in TELUGU language for "${originalFood}". Return ONLY the name.`
      : `Suggest 1 alternative food for "${originalFood}". Return ONLY the name.`;

    const text = await callGemini(langPrompt);
    res.json({ alternative: text.trim() });
  } catch (err) {
    res.json({ alternative: "Fresh Fruit" });
  }
});

// --- NEW ROUTE: Medicine Info (for Scan Results) ---
router.post('/medicine-info', auth, async (req, res) => {
  try {
    const { medicineName, language } = req.body;

    // Strict JSON Prompt
    const prompt = `
      You are a medical expert. 
      Provide details for the medicine: "${medicineName}".
      Language: ${language === 'te' ? 'TELUGU (Telugu Script)' : 'ENGLISH'}.
      
      Return valid JSON ONLY with this EXACT structure (keys must be English):
      {
        "uses": "Short explanation of what it treats (in requested language)",
        "dosage": "General dosage advice (in requested language)",
        "sideEffects": "Common side effects (in requested language)",
        "warnings": "Important safety warnings (in requested language)"
      }
    `;

    const text = await callGemini(prompt);

    // Clean JSON (remove markdown ticks)
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(cleanJson));

  } catch (err) {
    console.error("Medicine Info Error:", err);
    res.json({
      uses: "Could not fetch details.",
      dosage: "Consult Doctor",
      sideEffects: "Unknown",
      warnings: "Please consult a doctor."
    });
  }
});

// --- NEW ROUTE: AI Symptom Analysis & Disease Prediction ---
router.post('/analyze-symptoms', auth, async (req, res) => {
  try {
    const { symptoms, duration, severity, age, gender, language, existingConditions } = req.body;

    console.log('🔬 Symptom analysis request received:', {
      userId: req.user.id,
      symptoms: symptoms.join(', '),
      duration,
      severity
    });

    // Check cache first
    const cacheKey = getCacheKey(req.user.id, symptoms, duration, severity);
    const cached = analysisCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Returning cached analysis (preventing duplicate AI call)');
      console.log('📊 Cache stats:', {
        cacheSize: analysisCache.size,
        cacheAge: `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
        diagnosis: cached.data.primaryDiagnosis
      });
      return res.json(cached.data);
    }

    console.log('🔍 No valid cache found, calling AI...');

    const langNote = language === 'te'
      ? 'Provide all analysis in TELUGU (తెలుగు script). Keep JSON keys in English.'
      : 'Provide all analysis in English.';

    const prompt = `
      You are an AI Medical Diagnostic Assistant.
      
      PATIENT INFORMATION:
      - Symptoms: ${symptoms.join(', ')}
      - Duration: ${duration}
      - Severity: ${severity}/10
      - Age: ${age || 'Not specified'}
      - Gender: ${gender || 'Not specified'}
      - Existing Conditions: ${existingConditions || 'None'}
      
      ${langNote}
      
      Analyze these symptoms and provide a comprehensive medical assessment.
      Return ONLY valid JSON with this EXACT structure:
      {
        "primaryDiagnosis": "Most likely condition name",
        "confidence": "High/Medium/Low",
        "description": "Brief explanation of the condition",
        "possibleCauses": ["Cause 1", "Cause 2", "Cause 3"],
        "recommendations": ["Action 1", "Action 2", "Action 3"],
        "whenToSeeDoctor": "Specific circumstances requiring medical attention",
        "homeRemedies": ["Remedy 1", "Remedy 2"],
        "preventiveMeasures": ["Prevention tip 1", "Prevention tip 2"],
        "urgencyLevel": "Low/Medium/High/Critical",
        "alternativeDiagnoses": [
          {"condition": "Alternative 1", "probability": "percentage"},
          {"condition": "Alternative 2", "probability": "percentage"}
        ],
        "nextStepRecommendations": {
          "homeCareTips": ["Self-care tip 1", "Self-care tip 2", "Self-care tip 3"],
          "visitDoctor": "When to consult a doctor (be specific about warning signs)",
          "emergencyAction": "When to go to emergency/call ambulance (critical signs only)"
        },
        "relatedSpecialties": ["Specialty 1", "Specialty 2"]
      }
      
      IMPORTANT: Be accurate but emphasize seeing a doctor for serious symptoms.
      For nextStepRecommendations: homeCareTips should be immediate self-care actions, visitDoctor should explain when to schedule appointment, emergencyAction should ONLY list life-threatening signs.
      For relatedSpecialties: List medical specialties that treat this condition (e.g., "General Physician", "Cardiologist", "ENT Specialist", "Pulmonologist", "Gastroenterologist").
    `;

    console.log('🔍 Calling AI for new analysis...');
    const text = await callGemini(prompt);
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysis = JSON.parse(cleanJson);

    console.log('✅ AI analysis complete:', {
      diagnosis: analysis.primaryDiagnosis,
      urgency: analysis.urgencyLevel,
      specialties: analysis.relatedSpecialties
    });

    // Verify relatedSpecialties exists and is an array
    if (!analysis.relatedSpecialties || !Array.isArray(analysis.relatedSpecialties)) {
      console.warn('⚠️ AI did not return relatedSpecialties, adding default');
      analysis.relatedSpecialties = ["General Physician"];
    }

    // Store in cache
    analysisCache.set(cacheKey, {
      data: analysis,
      timestamp: Date.now()
    });

    console.log('📦 Analysis cached. Cache size:', analysisCache.size);
    res.json(analysis);

  } catch (err) {
    console.error("❌ Symptom Analysis Error:", err);
    const isQuotaError = err.message?.includes('quota') || err.message?.includes('rate limit');
    res.status(500).json({
      error: "Analysis failed",
      message: isQuotaError
        ? "API quota exceeded. Please wait a minute and try again, or contact support."
        : "Please consult a healthcare professional for accurate diagnosis."
    });
  }
});


// ============================================
// SYMPTOM TREND ANALYSIS
// ============================================

// @route   POST api/ai/analyze-symptom-trends
// @desc    Analyze symptom patterns over time
router.post('/analyze-symptom-trends', auth, async (req, res) => {
  const { symptomHistory, personName } = req.body;

  try {
    // Validate input
    if (!symptomHistory || !Array.isArray(symptomHistory) || symptomHistory.length === 0) {
      return res.status(400).json({ error: 'Symptom history is required' });
    }

    // Sort by date (oldest first) for chronological analysis
    const sortedHistory = symptomHistory.sort((a, b) =>
      new Date(a.loggedAt) - new Date(b.loggedAt)
    );

    // Format symptom history for AI - include conditionName for grouping
    const historyText = sortedHistory.map((log, index) => {
      const date = new Date(log.loggedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `Entry ${index + 1} (${date}):
- Condition/Episode: ${log.conditionName || 'Not specified'}
- Symptoms: ${log.symptoms.join(', ')}
- Severity: ${log.severity}/10
- Duration: ${log.duration}
${log.notes ? `- Notes: ${log.notes}` : ''}`;
    }).join('\n\n');

    // Detect distinct conditions in the data
    const distinctConditions = [...new Set(sortedHistory.map(l => l.conditionName || 'Unspecified').filter(Boolean))];
    const conditionNote = distinctConditions.length > 1
      ? `\n\nIMPORTANT: These logs contain MULTIPLE different conditions/episodes: ${distinctConditions.join(', ')}. 
If these are unrelated conditions (e.g., fever vs knee pain), analyze them SEPARATELY in your summary and clearly state they are distinct issues. 
Do NOT try to link unrelated symptoms together. Your diagnosis should focus on the most recent/active condition.`
      : '';

    const personLabel = personName ? `for ${personName}` : 'for this patient';

    const prompt = `You are a medical AI assistant analyzing symptom trends over time ${personLabel}.

SYMPTOM HISTORY (Chronological Order):
${historyText}
${conditionNote}

ANALYSIS REQUIREMENTS:
1. **SUMMARY**: Provide a comprehensive summary of the symptom logs over this period
   - What symptoms were recorded and when
   - How severity levels changed over time
   - Any notable patterns in when symptoms appeared
   
2. **TREND ANALYSIS**: Identify if the condition is improving, worsening, stable, or recurring
   - Look at both symptom types and severity levels
   - Consider the timeline and progression
   
3. **ASSUMPTIONS & INSIGHTS**: Based on the logs, make clinical assumptions about:
   - What might be causing these symptoms
   - Why symptoms may be following this pattern
   - What underlying conditions could explain the trend
   - Environmental or lifestyle factors that might be involved
   
4. **PATTERN DETECTION**: Are symptoms cyclical, progressive, episodic, or steady?
   
5. **URGENCY ASSESSMENT**: How urgent is medical attention based on this trend?
   
6. **RECOMMENDATIONS**: What should the patient do next based on this multi-day analysis?

Return ONLY valid JSON with this EXACT structure:
{
  "summary": "Detailed narrative summary of all symptom logs over this period, describing what was recorded, when, and at what severity levels",
  "assumptions": [
    "Clinical assumption 1 about what might be causing these symptoms",
    "Clinical assumption 2 about underlying conditions",
    "Clinical assumption 3 about contributing factors"
  ],
  "trend": "improving/worsening/stable/recurring",
  "trendConfidence": 85,
  "pattern": {
    "type": "progressive/cyclical/episodic/steady",
    "description": "Detailed explanation of the pattern observed across these days"
  },
  "currentDiagnosis": "Most likely current condition based on latest symptoms",
  "diagnosisConfidence": 80,
  "urgencyLevel": "low/medium/high/critical",
  "urgencyReason": "Why this urgency level based on the multi-day trend",
  "insights": [
    "Key observation 1 about the symptom progression over these days",
    "Key observation 2 about severity changes and patterns",
    "Key observation 3 about concerning patterns or improvements"
  ],
  "recommendations": [
    "Immediate action recommendation based on multi-day analysis",
    "Monitoring advice for the coming days",
    "Prevention tip based on identified patterns"
  ],
  "warningSignsToWatch": [
    "Sign 1 that would indicate worsening",
    "Sign 2 that requires immediate medical attention"
  ],
  "whenToSeekHelp": "Clear guidance on when to see a doctor",
  "possibleCauses": [
    "Most likely cause based on trend",
    "Alternative explanation"
  ],
  "nextSteps": [
    "What to do in next 24-48 hours",
    "Follow-up recommendations"
  ],
  "relatedSpecialties": ["General Physician", "Relevant Specialist"]
}

IMPORTANT:
- For relatedSpecialties: List 2-3 medical specialties relevant to the symptoms (e.g., "General Physician", "Pulmonologist", "Cardiologist", "Orthopedist", "ENT Specialist", "Gastroenterologist"). 
- Be specific about trends (e.g., "Fever decreased from 9/10 to 5/10 over 3 days")
- Note any concerning patterns (e.g., "Symptoms worsen every evening")
- Consider both severity AND symptom changes
- Provide actionable, practical advice
- Use confidence scores (0-100) realistically
- If trend shows improvement, acknowledge it but remain cautious
- If worsening or recurring, emphasize seeking medical help

Return ONLY the JSON object, no other text.`;

    const text = await callGemini(prompt);
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysis = JSON.parse(cleanJson);

    // Ensure relatedSpecialties exists
    if (!analysis.relatedSpecialties || !Array.isArray(analysis.relatedSpecialties) || analysis.relatedSpecialties.length === 0) {
      analysis.relatedSpecialties = ['General Physician'];
    }

    console.log('✅ Trend analysis complete:', {
      trend: analysis.trend,
      diagnosis: analysis.currentDiagnosis,
      specialties: analysis.relatedSpecialties
    });

    res.json(analysis);

  } catch (err) {
    console.error("Symptom Trend Analysis Error:", err);
    const isQuotaError = err.message?.includes('quota') || err.message?.includes('rate limit');
    res.status(500).json({
      error: "Analysis failed",
      message: isQuotaError
        ? "API quota exceeded. Please wait a minute and try again."
        : "Unable to analyze symptom trends."
    });
  }
});

// --- ANALYZE MEDICAL RECORD IMAGE WITH AI (Vision) ---
router.post('/analyze-record', auth, async (req, res) => {
  try {
    const { image, title, type, language } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Extract base64 data and mime type from data URL
    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const apiKey = getNextApiKey();
    let modelName = await getWorkingModel(apiKey);
    if (!modelName) modelName = "gemini-1.5-flash";

    const isTeluguLang = language === 'te';

    const prompt = isTeluguLang
      ? `మీరు ఒక AI వైద్య సహాయకుడు. ఈ వైద్య రికార్డు చిత్రాన్ని విశ్లేషించండి (రకం: ${type || 'Medical Record'}, శీర్షిక: ${title || 'N/A'}).

దయచేసి ఈ JSON ఆకృతిలో తెలుగులో సమాధానం ఇవ్వండి:
{
  "summary": "రికార్డులో ఏమి ఉందో సంక్షిప్త సారాంశం",
  "findings": ["ముఖ్యమైన ఫలితం 1", "ముఖ్యమైన ఫలితం 2"],
  "medications": ["మందులు ఉంటే జాబితా"],
  "recommendations": ["సిఫార్సు 1", "సిఫార్సు 2"],
  "urgency": "low/medium/high"
}

ONLY return valid JSON, no other text.`
      : `You are an AI medical assistant. Analyze this medical record image (Type: ${type || 'Medical Record'}, Title: ${title || 'N/A'}).

Please provide your analysis in this JSON format:
{
  "summary": "Brief summary of what this record contains",
  "findings": ["Key finding 1", "Key finding 2"],
  "medications": ["List any medications if present"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "urgency": "low/medium/high"
}

IMPORTANT: 
- Identify any medications, dosages, and diagnoses visible
- Note any abnormal lab values if it's a lab report
- Provide practical, simple recommendations
- Be accurate but acknowledge limitations of AI analysis

ONLY return valid JSON, no other text.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || response.statusText;
      if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || response.status === 429) {
        markKeyAsFailed(apiKey);
      }
      throw new Error(msg);
    }

    if (!data.candidates || !data.candidates[0]?.content) {
      throw new Error('No analysis generated');
    }

    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanJson);

    console.log('✅ Record analysis complete:', { title, type, urgency: analysis.urgency });
    res.json(analysis);

  } catch (err) {
    console.error('Record Analysis Error:', err.message);
    const isQuotaError = err.message?.includes('quota') || err.message?.includes('rate limit');
    res.status(500).json({
      error: 'Analysis failed',
      message: isQuotaError
        ? 'API quota exceeded. Please wait a minute and try again.'
        : 'Unable to analyze this record. Please try again.'
    });
  }
});

// --- SEARCH HOSPITAL CONTACT INFO WITH AI ---
router.post('/hospital-contact', auth, async (req, res) => {
  try {
    const { hospitalName, lat, lng, language } = req.body;

    if (!hospitalName) {
      return res.status(400).json({ error: 'Hospital name required' });
    }

    const isTeluguLang = language === 'te';

    const prompt = `You are a helpful assistant. Find the phone number and contact details for the hospital/clinic named "${hospitalName}" located near coordinates (${lat}, ${lng}) in India.

Search your knowledge for this hospital or similar hospitals in this area.

Return ONLY a valid JSON object in this format:
{
  "phone": "the phone number if found, or null",
  "alternatePhone": "alternate number if available, or null",
  "address": "full address if known, or null",
  "found": true or false,
  "confidence": "high/medium/low",
  "note": "${isTeluguLang ? 'Telugu brief note about the hospital' : 'Brief note about the hospital or suggest similar hospitals nearby if not found'}"
}

IMPORTANT:
- If you are confident about the phone number, set "found": true and "confidence": "high"
- If you found something but aren't 100% sure, set "confidence": "medium" 
- If you cannot find it, set "found": false and provide a helpful note suggesting the user search Google Maps
- Phone numbers for Indian hospitals typically start with +91 or are 10-digit numbers
- ONLY return valid JSON, no other text`;

    const text = await callGemini(prompt);
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const contact = JSON.parse(cleanJson);

    console.log('✅ Hospital contact search:', { hospitalName, found: contact.found, confidence: contact.confidence });
    res.json(contact);

  } catch (err) {
    console.error('Hospital Contact Search Error:', err.message);
    res.status(500).json({
      error: 'Search failed',
      found: false,
      phone: null,
      note: 'Could not search for contact info. Please try Google Maps.'
    });
  }
});

module.exports = router;