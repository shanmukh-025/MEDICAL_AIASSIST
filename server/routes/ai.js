const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// --- 1. DYNAMIC MODEL FINDER (Restored & Cached) ---
let cachedModel = null;

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

// --- 2. API CALLER ---
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No API Key found");

  // A. Find a working model
  let modelName = await getWorkingModel(apiKey);
  
  // B. Fallback if detection fails (Safe default)
  if (!modelName) modelName = "gemini-1.5-flash";

  // C. Make the call
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data.error?.message || response.statusText;
    throw new Error(msg);
  }

  if (!data.candidates || !data.candidates[0].content) {
    return "{}"; // Empty response safety
  }

  return data.candidates[0].content.parts[0].text;
}

// --- 3. ROUTES ---

// Chat Route (Updated for Telugu Support)
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, language } = req.body; // Receive language from frontend
    
    let instruction = "";
    if (language === 'te') {
        instruction = `
            You are MediBot, a Village Medical Assistant.
            The user has selected TELUGU language.
            
            RULES:
            1. You MUST reply in TELUGU script (తెలుగు) ONLY.
            2. Even if the user asks in English, translate your answer to Telugu.
            3. Keep the medical advice simple and easy to understand for villagers.
        `;
    } else {
        instruction = `
            You are MediBot, a helpful Village Medical Assistant.
            Rules:
            1. Explain remedies clearly.
            2. Explain medicines simply.
            3. Only refer to a doctor if symptoms are severe.
            4. Be polite and concise in English.
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

module.exports = router;