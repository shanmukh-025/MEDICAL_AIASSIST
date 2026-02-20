import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Info, ShieldAlert, Pill, MapPin, Loader2, Volume2, Database, StopCircle, Bug } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const Result = () => {
  const { medicineName } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [debugMsg, setDebugMsg] = useState(""); 

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // 1. Get API Key
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => window.speechSynthesis.cancel();
  }, []);

  const extractJSON = (text) => {
    try {
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1) {
        return JSON.parse(text.substring(startIndex, endIndex + 1));
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const fetchMedicineInfo = async () => {
      setLoading(true);
      setError(false);
      setDebugMsg("");
      
      try {
        if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY in .env");

        // --- STEP 1: AUTO-DETECT AVAILABLE MODELS ---
        // We ask Google what models are allowed for this Key
        const modelsReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsReq.json();
        
        if (modelsData.error) {
            throw new Error(`API Key Error: ${modelsData.error.message}`);
        }

        // Find the first model that supports content generation (usually 'models/gemini-pro')
        const validModel = modelsData.models?.find(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes("generateContent") &&
            m.name.includes("gemini")
        );

        if (!validModel) {
            throw new Error("No Gemini models are enabled for this API Key. Please check your Google Cloud Console.");
        }

        console.log(`Auto-selected Model: ${validModel.name}`); // Debugging

        // --- STEP 2: USE THE DETECTED MODEL ---
        const prompt = `
          Act as a pharmacist. Analyze "${medicineName}".
          Return ONLY valid JSON.
          {
            "name": "${medicineName}",
            "uses": "Uses in ${lang === 'te' ? 'Telugu' : 'English'}",
            "dosage": "Dosage in ${lang === 'te' ? 'Telugu' : 'English'}",
            "warnings": "Warnings in ${lang === 'te' ? 'Telugu' : 'English'}",
            "sideEffects": "Side effects in ${lang === 'te' ? 'Telugu' : 'English'}"
          }
        `;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            throw new Error(`AI Error: ${result.error.message}`);
        }

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No text returned from AI");

        const parsedData = extractJSON(text);
        if (!parsedData) throw new Error("Could not parse AI JSON");
        
        setData(parsedData);

      } catch (err) {
        console.error("Analysis Error:", err);
        setError(true);
        setDebugMsg(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    if(medicineName) fetchMedicineInfo();
  }, [medicineName, lang]);

  const speakInfo = () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
    }
    if (!data) return;

    const text = lang === 'en' 
        ? `This is ${data.name}. Uses: ${data.uses}. Dosage: ${data.dosage}. Warning: ${data.warnings}`
        : `ఇది ${data.name}. ఉపయోగాలు: ${data.uses}. మోతాదు: ${data.dosage}. హెచ్చరిక: ${data.warnings}`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'te') {
        const teluguVoice = availableVoices.find(v => v.lang.includes('te'));
        if (teluguVoice) utterance.voice = teluguVoice;
    } 
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
      <p className="text-emerald-800 font-bold animate-pulse">Running AI Analysis...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-6 rounded-full shadow-lg mb-6">
         <Bug className="text-rose-500" size={64} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Analysis Failed</h2>
      <div className="bg-rose-100 text-rose-800 p-4 rounded-xl text-sm font-mono max-w-md mb-6 break-words border border-rose-200">
        {debugMsg}
      </div>
      <div className="flex gap-4 w-full max-w-sm">
        <button onClick={() => navigate('/dashboard')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold">Back</button>
        <button onClick={() => window.location.reload()} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <div className="bg-emerald-600 p-6 pt-8 pb-12 rounded-b-[40px] shadow-xl text-white sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
            <button onClick={() => navigate('/scan')} className="bg-white/20 p-2 rounded-full backdrop-blur-md"><ArrowLeft size={24} /></button>
            <h1 className="font-bold text-lg opacity-90">Analysis Result</h1>
            <button onClick={speakInfo} className={`p-2 rounded-full backdrop-blur-md transition shadow-md ${isSpeaking ? 'bg-red-500' : 'bg-white/20'}`}>
                {isSpeaking ? <StopCircle size={24} className="animate-pulse"/> : <Volume2 size={24} />}
            </button>
        </div>
      </div>

      <div className="px-5 -mt-8 max-w-2xl mx-auto space-y-5 relative z-20">
        {data && (
            <>
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center">
                    <div className="bg-emerald-100 p-4 rounded-full mb-3 text-emerald-600"><Pill size={40} /></div>
                    <h2 className="text-2xl font-extrabold text-gray-800 mb-1 capitalize">{data.name}</h2>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mt-2"><Database size={12}/> AI GENERATED</div>
                </div>

                <div className="grid gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50">
                        <h3 className="text-emerald-700 font-bold flex items-center gap-2 mb-2"><CheckCircle size={20}/> Uses</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{data.uses}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
                        <h3 className="text-blue-700 font-bold flex items-center gap-2 mb-2"><Info size={20}/> Dosage</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{data.dosage}</p>
                    </div>
                    <div className="bg-rose-50 p-5 rounded-2xl shadow-sm border border-rose-100">
                        <h3 className="text-rose-700 font-bold flex items-center gap-2 mb-2"><ShieldAlert size={20}/> Warnings</h3>
                        <p className="text-rose-900 text-sm leading-relaxed font-medium">{data.warnings}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50">
                        <h3 className="text-orange-700 font-bold flex items-center gap-2 mb-2"><AlertCircle size={20}/> Side Effects</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{data.sideEffects}</p>
                    </div>
                </div>
            </>
        )}
        <button onClick={() => navigate('/doctors')} className="w-full bg-gray-900 text-white p-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"><MapPin size={20} /> Find Doctor</button>
      </div>
    </div>
  );
};

export default Result;