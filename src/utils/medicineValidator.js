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
  'dermatology', 'ophthalmology', 'ENT', 'oncology', 'psychiatry', 'endocrinology'
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
  // Technology/Computers
  'computer', 'laptop', 'mobile', 'phone', 'software', 'app', 'application', 'website',
  'internet', 'wifi', 'email', 'google', 'facebook', 'instagram', 'twitter', 'whatsapp',
  'instagram', 'tiktok', 'snapchat', 'linkedin', 'youtube', 'streaming',
  // Shopping/Ecommerce
  'amazon', 'flipkart', 'shopping', 'buy', 'sell', 'price', 'discount', 'sale', 'offer',
  'product', 'item', 'order', 'delivery', 'cart',
  // Finance/Stocks
  'stock', 'share', 'market', 'sensex', 'nifty', 'trading', 'investment', 'mutual fund',
  'bank', 'loan', 'credit', 'debit', 'card', 'account', 'balance', 'transaction',
  'bitcoin', 'crypto', 'cryptocurrency', 'etherium',
  // Food/Restaurants (non-medical)
  'restaurant', 'hotel', 'cafe', 'coffee', 'tea', 'pizza', 'burger', 'biryani',
  'food delivery', 'zomato', 'swiggy', 'dining',
  // Travel
  'flight', 'train', 'bus', 'taxi', 'uber', 'ola', 'airport', 'railway', 'station',
  'hotel', 'booking', 'reservation', 'travel', 'trip', 'vacation', 'holiday',
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
  
  // Check for non-medical content first (higher priority for rejection)
  const foundNonMedical = nonMedicalKeywords.filter(keyword => 
    normalizedText.includes(keyword.toLowerCase())
  );

  // If significant non-medical content is found, reject it
  if (foundNonMedical.length >= 2) {
    return {
      isValid: false,
      reason: 'non_medical',
      matchedKeywords: foundNonMedical,
      message: 'This content does not appear to be related to medicine or health. Please enter medicine-related text or symptoms.'
    };
  }

  // Check for medical keywords
  const foundMedical = medicalKeywords.filter(keyword => 
    normalizedText.includes(keyword.toLowerCase())
  );

  // If no medical keywords found, it might not be medicine-related
  if (foundMedical.length === 0) {
    return {
      isValid: false,
      reason: 'no_medical_keywords',
      matchedKeywords: [],
      message: 'This does not appear to be related to medicine. Please enter medicine-related text, symptoms, or health information.'
    };
  }

  // If we found some medical keywords, it's likely medicine-related
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
      empty: 'Please enter some text to analyze',
      non_medical: 'This content is not related to medicine or health',
      no_medical_keywords: 'This does not appear to be related to medicine',
      invalid_text: 'The scanned text is not clear',
      not_medicine_related: 'Not relevant to medicine'
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
