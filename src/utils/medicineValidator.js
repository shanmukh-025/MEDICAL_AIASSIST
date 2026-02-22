// Medicine Content Validation Utility
// Validates whether text or content is related to medicine/health

// Medical keywords that indicate medicine-related content
const medicalKeywords = [
  // English keywords
  'fever', 'cough', 'headache', 'pain', 'temperature', 'blood pressure', 'sugar', 'diabetes',
  'heart', 'chest', 'breath', 'stomach', 'vomit', 'nausea', 'diarrhea', 'constipation',
  'medicine', 'tablet', 'capsule', 'syrup', 'injection', 'dose', 'dosage', 'prescription',
  'doctor', 'hospital', 'clinic', 'treatment', 'diagnosis', 'symptom', 'disease', 'illness',
  'infection', 'virus', 'bacteria', 'allergy', 'asthma', 'cancer', 'TB', 'malaria', 'dengue',
  'pregnancy', 'baby', 'child', 'adult', 'elderly', 'skin', 'eye', 'ear', 'nose', 'throat',
  'bone', 'joint', 'muscle', 'nerve', 'brain', 'kidney', 'liver', 'lung', 'stomach',
  'health', 'weight', 'height', 'BMI', 'oxygen', 'pulse', 'heartbeat', 'ECG', 'EEG',
  'X-ray', 'MRI', 'CT scan', 'ultrasound', 'blood test', 'urine test', 'stool test',
  'surgery', 'operation', 'medication', 'antibiotic', 'painkiller', 'vaccine', 'vitamin',
  'diet', 'nutrition', 'exercise', 'sleep', 'stress', 'anxiety', 'depression',
  'hypertension', 'hypotension', 'anemia', 'cholesterol', 'thyroid', 'arthritis',
  'cold', 'flu', 'flu', 'running nose', 'sore throat', 'body pain', 'fatigue', 'weakness',
  'dizziness', 'vertigo', 'headache', 'migraine', 'seizure', 'convulsion',
  'swelling', 'inflammation', 'redness', 'itching', 'rash', 'wound', 'cut', 'burn',
  'tooth', 'dental', 'gum', 'mouth', 'tongue', 'lip',
  'mental', 'psychological', 'panic', 'attack', 'phobia',
  'injury', 'accident', 'fracture', 'sprain', 'strain', 'bruise',
  'faint', 'unconscious', 'coma', 'shock',
  'bleeding', 'hemorrhage', 'blood', 'cut', 'injury',
  'emergency', 'ambulance', 'critical', 'urgent',
  'follow up', 'review', 'checkup', 'appointment',
  'report', 'result', 'finding', 'summary',
  // Telugu keywords (common medical terms in Telugu)
  'fever', 'cough', 'headache', 'pain', 'temperature', 'blood pressure', 'sugar',
  'heart', 'chest', 'breath', 'stomach', 'vomiting', 'diarrhea', 'constipation',
  'medicine', 'tablet', 'capsule', 'syrup', 'injection', 'dose', 'dosage',
  'doctor', 'hospital', 'clinic', 'treatment', 'diagnosis', 'symptom', 'disease',
  'Infection', 'virus', 'bacteria', 'allergy', 'asthma', 'cancer', 'TB',
  'pregnancy', 'baby', 'child', 'adult', 'elderly', 'skin', 'eye', 'ear', 'nose', 'throat',
  'bone', 'joint', 'muscle', 'nerve', 'brain', 'kidney', 'liver', 'lung', 'stomach',
  'health', 'weight', 'height', 'BMI', 'oxygen', 'pulse', 'heartbeat',
  'X-ray', 'MRI', 'CT scan', 'ultrasound', 'blood test', 'urine test',
  'surgery', 'operation', 'medication', 'antibiotic', 'painkiller', 'vaccine', 'vitamin',
  'diet', 'nutrition', 'exercise', 'sleep', 'stress', 'anxiety', 'depression',
  'hypertension', 'hypotension', 'anemia', 'cholesterol', 'thyroid', 'arthritis',
  'cold', 'flu', 'running nose', 'sore throat', 'body pain', 'fatigue', 'weakness',
  'dizziness', 'vertigo', 'headache', 'migraine', 'seizure', 'convulsion',
  'swelling', 'inflammation', 'redness', 'itching', 'rash', 'wound', 'cut', 'burn',
  'tooth', 'dental', 'gum', 'mouth', 'tongue', 'lip',
  'mental', 'psychological', 'panic', 'attack', 'phobia',
  'injury', 'accident', 'fracture', 'sprain', 'strain', 'bruise',
  'faint', 'unconscious', 'coma', 'shock',
  'bleeding', 'hemorrhage', 'blood', 'cut', 'injury',
  'emergency', 'ambulance', 'critical', 'urgent',
  'follow up', 'review', 'checkup', 'appointment',
  'report', 'result', 'finding', 'summary',
  // Additional medical terms
  'prescription', 'rx', 'tablet', 'cap', 'susp', 'ointment', 'cream', 'gel',
  'drops', 'inhaler', 'nebulizer', 'pump', 'patch', 'bandage', 'plaster',
  'medical', 'healthcare', 'pharma', 'chemist', 'pharmacy', 'dispensary',
  'nurse', 'surgeon', 'physician', 'specialist', 'consultant', 'doctor',
  'diagnosis', 'prognosis', 'chronic', 'acute', 'terminal', 'benign', 'malignant',
  'contagious', 'infectious', 'communicable', 'non-communicable',
  'pathology', 'radiology', 'cardiology', 'neurology', 'orthopedics', 'pediatrics',
  'gynecology', 'urology', 'nephrology', 'hepatology', 'gastroenterology', 'pulmonology',
  'dermatology', 'ophthalmology', 'ENT', 'oncology', 'psychiatry', 'endocrinology',
  // Active Ingredients & Brands (Common in India)
  'paracetamol', 'dolo', 'crocin', 'calpol', 'ibuprofen', 'aspirin', 'acetaminophen',
  'nimesulide', 'cetirizine', 'amoxicillin', 'azithromycin', 'metformin', 'amlodipine',
  'pantoprazole', 'ranitidine', 'omeprazole', 'diclofenac', 'aceclofenac', 'cetirizine',
  'levocetirizine', 'montelukast', 'amoxiclav', 'azithral', 'limcee', 'zinc', 'vitamin c',
  // Packaging Terms & Standards
  'batch', 'mfg', 'exp', 'expiry', 'mg', 'mcg', 'ml', 'tablet ip', 'capsule ip',
  'manufactured by', 'mkt by', 'marketed by', 'lic no', 'regd', 'pharmacopoeia',
  'ip', 'bp', 'usp', 'compendium', 'dosage', 'strength', 'dosage',
  // Strengths
  '12.5', '25', '50', '100', '125', '250', '500', '650', '1000',
  // OCR Variants
  'd0lo', '0olo', 'g50', '6s0', 's00', 'paracet', 'acetamin',
  // Packaging
  'strip', 'blister', 'pack', 'bottle', 'vial', 'ampoule'
];

// Non-medical keywords that should be rejected
const nonMedicalKeywords = [
  // Entertainment
  'movie', 'film', 'cinema', 'actor', 'actress', 'bollywood', 'hollywood', 'song', 'music',
  'dance', 'concert', 'party', 'game', 'gaming', 'video', 'youtube', 'netflix', 'series',
  // Sports
  'cricket', 'football', 'soccer', 'tennis', 'badminton', 'olympics', 'match', 'score',
  'player', 'team', 'goal', 'run', 'wicket', 'ball', 'bat',
  // Politics
  'election', 'vote', 'party', 'government', 'minister', 'president', 'prime minister',
  'congress', 'bjp', 'politics', 'political', 'campaign', 'rally',
  // Religion
  'god', 'lord', 'jesus', 'allah', 'ram', 'krishna', 'shiva', 'vishnu', 'buddha',
  'temple', 'church', 'mosque', 'mosjid', 'prayer', 'worship', 'spiritual',
  // Technology/Computers (Removed phone/mobile as they appear on medicine packs)
  'computer', 'laptop', 'software', 'application',
  'internet', 'wifi', 'google', 'facebook', 'instagram', 'twitter', 'whatsapp',
  'tiktok', 'snapchat', 'linkedin', 'youtube', 'streaming',
  // Shopping/Ecommerce (Removed price/product/item/order as they appear on medicine packs)
  'amazon', 'flipkart', 'shopping', 'discount', 'sale', 'offer',
  'delivery', 'cart',
  // Finance/Stocks
  'stock', 'share', 'market', 'sensex', 'nifty', 'trading', 'investment', 'mutual fund',
  'bank', 'loan', 'credit', 'debit', 'card', 'account', 'balance', 'transaction',
  'bitcoin', 'crypto', 'cryptocurrency', 'etherium',
  // Food/Restaurants (non-medical)
  'restaurant', 'hotel', 'cafe', 'coffee', 'tea', 'pizza', 'burger', 'biryani',
  'food delivery', 'zomato', 'swiggy', 'dining',
  // Travel
  'flight', 'train', 'bus', 'taxi', 'uber', 'ola', 'airport', 'railway', 'station',
  'hotel', 'booking', 'reservation', 'travel', 'vacation', 'holiday',
  // Education (non-medical)
  'school', 'college', 'university', 'student', 'teacher', 'exam', 'result', 'class',
  'homework', 'assignment', 'course', 'degree', 'certificate',
  // Jobs/Career
  'job', 'interview', 'resume', 'salary', 'hiring', 'recruitment', 'promotion',
  // Relationships
  'love', 'dating', 'marriage', 'wedding', 'divorce', 'boyfriend', 'girlfriend',
  // Other non-medical topics
  'news', 'weather', 'fashion', 'beauty', 'makeup', 'clothes', 'shopping',
  'real estate', 'property', 'house', 'apartment', 'rent',
  'car', 'bike', 'vehicle', 'insurance',
  'astrology', 'horoscope', 'luck', 'fortune',
  'meme', 'joke', 'funny', 'comedy',
  'recipe', 'cooking', 'kitchen',
  'pet', 'dog', 'cat', 'animal',
  'car', 'bike', 'vehicle',
  'govt', 'government', 'scheme', 'subsidy'
];

// Minimum medical keyword matches required
const MIN_MEDICAL_KEYWORDS = 1;

/**
 * Validates if the given text is related to medicine/health
 * @param {string} text - The text to validate
 * @returns {Object} - { isValid: boolean, reason: string, matchedKeywords: string[] }
 */
export function validateMedicalContent(text) {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      reason: 'empty',
      matchedKeywords: [],
      message: 'Please enter some text to analyze'
    };
  }

  const normalizedText = text.toLowerCase();
  // Remove all non-alphanumeric for a secondary "tight" check
  const tightText = normalizedText.replace(/[^a-z0-9]/g, '');

  // Check for medical keywords
  const foundMedical = medicalKeywords.filter(keyword => {
    const kw = keyword.toLowerCase();
    const tightKw = kw.replace(/[^a-z0-9]/g, '');

    // Check for original match, space-separated match, or tight match
    return normalizedText.includes(kw) ||
      (tightKw.length > 3 && tightText.includes(tightKw));
  });

  // Check for non-medical content
  const foundNonMedical = nonMedicalKeywords.filter(keyword =>
    normalizedText.includes(keyword.toLowerCase())
  );

  console.log("🩺 Non-Medical Keywords Found:", foundNonMedical);

  // SUPER KEYWORDS: If we find these, we bypass the non-medical check
  const superKeywords = [
    'paracetamol', 'dolo', 'crocin', 'calpol', 'prescription', 'rx',
    'antibiotic', 'physician', 'hospital', 'tablet ip', 'capsule ip',
    'ip', '650', '500', 'd0lo', '0olo', 'g50', '6s0'
  ];

  const foundSuper = superKeywords.some(sk =>
    normalizedText.includes(sk) || tightText.includes(sk.replace(/[^a-z0-9]/g, ''))
  );

  console.log("🩺 Super Keyword Match:", foundSuper);

  if (foundSuper) {
    return {
      isValid: true,
      reason: 'super_valid',
      matchedKeywords: foundMedical,
      message: ''
    };
  }

  // If no medical keywords found at all, it's definitely not medical
  if (foundMedical.length === 0) {
    return {
      isValid: false,
      reason: 'no_medical_keywords',
      matchedKeywords: [],
      message: 'This does not appear to be related to medicine. Please enter medicine-related text, symptoms, or health information.'
    };
  }

  // If significant non-medical content is found, but we have medical keywords, 
  // we use a much higher threshold as medical packs contain lots of meta-data
  const nonMedicalThreshold = Math.max(10, foundMedical.length * 4);

  if (foundNonMedical.length >= nonMedicalThreshold) {
    return {
      isValid: false,
      reason: 'non_medical',
      matchedKeywords: foundNonMedical,
      message: 'This content contains too much non-medical information. Please scan only the medicine pack or prescription.'
    };
  }

  // If we found medical keywords and not too many non-medical ones, it's valid
  return {
    isValid: true,
    reason: 'valid',
    matchedKeywords: foundMedical,
    message: ''
  };
}

/**
 * Validates scanned text from OCR
 * @param {string} scannedText - The text extracted from OCR
 * @returns {Object} - Validation result with messages
 */
export function validateScannedText(scannedText) {
  if (!scannedText || scannedText.trim().length < 3) {
    return {
      isValid: false,
      isMedicineRelated: false,
      message: 'Text too blurry or unclear. Please try scanning a clearer image.'
    };
  }

  const result = validateMedicalContent(scannedText);

  return {
    isValid: result.isValid,
    isMedicineRelated: result.isValid,
    message: result.message || 'Text scanned successfully',
    matchedKeywords: result.matchedKeywords
  };
}

/**
 * Validates symptom input
 * @param {string} symptomInput - The symptom text input
 * @returns {Object} - Validation result
 */
export function validateSymptomInput(symptomInput) {
  if (!symptomInput || symptomInput.trim().length === 0) {
    return {
      isValid: false,
      message: 'Please enter at least one symptom'
    };
  }

  const result = validateMedicalContent(symptomInput);

  return {
    isValid: result.isValid,
    message: result.message || 'Valid symptom input'
  };
}

/**
 * Gets error messages in the specified language
 * @param {string} lang - Language code ('en' or 'te')
 * @param {string} type - Type of error message needed
 * @returns {string} - Localized error message
 */
export function getErrorMessage(lang = 'en', type = 'non_medical') {
  const messages = {
    en: {
      empty: 'Please enter some text to analyze',
      non_medical: 'This content does not appear to be related to medicine or health. Please enter medicine-related text or symptoms.',
      no_medical_keywords: 'This does not appear to be related to medicine. Please enter medicine-related text, symptoms, or health information.',
      invalid_text: 'The scanned text is not clear enough. Please try again with a clearer image.',
      not_medicine_related: 'Not relevant to medicine. Please scan or enter medicine-related content like medicine names, prescriptions, or medical reports.'
    },
    te: {
      empty: 'విశ్లేషించడానికి దయచేసి కొంత టెక్స్ట్‌ని నమోదు చేయండి',
      non_medical: 'ఈ విషయం మందులు లేదా ఆరోగ్యానికి సంబంధించినది కాదు. దయచేసి మందులకు సంబంధించిన టెక్స్ట్ లేదా లక్షణాలను నమోదు చేయండి.',
      no_medical_keywords: 'ఇది మందులకు సంబంధించినదిగా కనిపించడం లేదు. దయచేసి మందులకు సంబంధించిన టెక్స్ట్, లక్షణాలు లేదా ఆరోగ్య సమాచారాన్ని నమోదు చేయండి.',
      invalid_text: 'స్కాన్ చేసిన టెక్స్ట్ తగినంత స్పష్టంగా లేదు. దయచేసి మళ్లీ ప్రయత్నించండి.',
      not_medicine_related: 'మందులకు సంబంధించినది కాదు. దయచేసి మందుల పేర్లు, ప్రిస్క్రిప్షన్లు లేదా రిపోర్టుల వంటి విషయాలను స్కాన్ చేయండి.'
    }
  };

  return messages[lang]?.[type] || messages.en[type];
}

export default {
  validateMedicalContent,
  validateScannedText,
  validateSymptomInput,
  getErrorMessage
};
