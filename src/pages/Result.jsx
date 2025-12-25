import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Info, ShieldAlert, Pill, MapPin, Loader2, Volume2, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext'; // 1. Import Context

const Result = () => {
  const { medicineName } = useParams(); // Get name from URL param
  const navigate = useNavigate();
  const { lang } = useLanguage(); // 2. Get Language

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 3. Translations Dictionary
  const t = {
    analyzing: lang === 'en' ? 'Analyzing Medicine...' : 'మందును విశ్లేషిస్తోంది...',
    notFound: lang === 'en' ? 'Medicine Not Found' : 'మందు కనుగొనబడలేదు',
    notFoundMsg: lang === 'en' ? "We couldn't find info for this item." : "దీనికి సంబంధించిన సమాచారం లభించలేదు.",
    goBack: lang === 'en' ? 'Go Back' : 'వెనుకకు',
    scanAgain: lang === 'en' ? 'Scan Again' : 'మళ్ళీ స్కాన్ చేయండి',
    resultTitle: lang === 'en' ? 'Analysis Result' : 'విశ్లేషణ ఫలితం',
    aiGenerated: lang === 'en' ? 'AI GENERATED INFO' : 'AI ద్వారా రూపొందించబడింది',
    uses: lang === 'en' ? 'Uses' : 'ఉపయోగాలు',
    dosage: lang === 'en' ? 'Dosage' : 'మోతాదు',
    warnings: lang === 'en' ? 'Warnings' : 'హెచ్చరికలు',
    sideEffects: lang === 'en' ? 'Side Effects' : 'దుష్ప్రభావాలు',
    findDoctor: lang === 'en' ? 'Find Doctor' : 'డాక్టర్‌ను కనుగొనండి',
    consult: lang === 'en' ? 'Consult a doctor' : 'వైద్యుడిని సంప్రదించండి'
  };

  useEffect(() => {
    const fetchMedicineInfo = async () => {
      setLoading(true);
      setError(false);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/ai/medicine-info', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token 
            },
            body: JSON.stringify({ medicineName, language: lang }) // Send Language to Backend
        });
        
        if (!res.ok) throw new Error("Failed");
        
        const result = await res.json();
        setData({ name: medicineName, ...result });

      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if(medicineName) fetchMedicineInfo();
  }, [medicineName, lang]);

  const speakInfo = () => {
    if (!data) return;
    const text = lang === 'en' 
        ? `This is ${data.name}. Uses: ${data.uses}. Dosage: ${data.dosage}.`
        : `ఇది ${data.name}. ఉపయోగాలు: ${data.uses}. మోతాదు: ${data.dosage}.`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'te-IN'; // Set Voice Language
    window.speechSynthesis.speak(utterance);
  };

  // --- LOADING STATE ---
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
      <p className="text-emerald-800 font-bold animate-pulse">{t.analyzing}</p>
    </div>
  );

  // --- ERROR STATE ---
  if (error) return (
    <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-6 rounded-full shadow-lg mb-6 animate-bounce">
         <AlertCircle className="text-rose-500" size={64} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.notFound}</h2>
      <p className="text-gray-500 mb-8 max-w-xs">{t.notFoundMsg}</p>
      
      <div className="flex gap-4 w-full max-w-sm">
        <button onClick={() => navigate('/')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold">{t.goBack}</button>
        <button onClick={() => navigate('/scan')} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg">{t.scanAgain}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      
      {/* HEADER */}
      <div className="bg-emerald-600 p-6 pt-8 pb-12 rounded-b-[40px] shadow-xl text-white sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
            <button onClick={() => navigate('/scan')} className="bg-white/20 p-2 rounded-full backdrop-blur-md hover:bg-white/30 transition">
                <ArrowLeft size={24} />
            </button>
            <h1 className="font-bold text-lg tracking-wide opacity-90">{t.resultTitle}</h1>
            <button onClick={speakInfo} className="bg-white/20 p-2 rounded-full backdrop-blur-md hover:bg-white/30 transition">
                <Volume2 size={24} />
            </button>
        </div>
      </div>

      <div className="px-5 -mt-8 max-w-2xl mx-auto space-y-5 relative z-20">
        
        {/* IDENTITY CARD */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center">
            <div className="bg-emerald-100 p-4 rounded-full mb-3 text-emerald-600 shadow-inner">
                <Pill size={40} />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-1 capitalize">{data.name}</h2>
            
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mt-2">
                <Database size={12}/> {t.aiGenerated}
            </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid gap-4">
            
            {/* Uses */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50">
                <h3 className="text-emerald-700 font-bold flex items-center gap-2 mb-2">
                    <CheckCircle size={20}/> {t.uses}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{data.uses}</p>
            </div>

            {/* Dosage */}
            {/* Note: AI might not always return dosage safely, but we display what we get */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
                <h3 className="text-blue-700 font-bold flex items-center gap-2 mb-2">
                    <Info size={20}/> {t.dosage}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{data.dosage || t.consult}</p>
            </div>

            {/* Warnings (Red) */}
            <div className="bg-rose-50 p-5 rounded-2xl shadow-sm border border-rose-100">
                <h3 className="text-rose-700 font-bold flex items-center gap-2 mb-2">
                    <ShieldAlert size={20}/> {t.warnings}
                </h3>
                <p className="text-rose-900 text-sm leading-relaxed font-medium">{data.warnings}</p>
            </div>

             {/* Side Effects */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50">
                <h3 className="text-orange-700 font-bold flex items-center gap-2 mb-2">
                    <AlertCircle size={20}/> {t.sideEffects}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{data.sideEffects}</p>
            </div>
        </div>

        {/* FIND DOCTOR CTA */}
        <button 
            onClick={() => window.open('https://www.google.com/maps/search/doctors+near+me', '_blank')} 
            className="w-full bg-gray-900 text-white p-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
        >
            <MapPin size={20} /> {t.findDoctor}
        </button>

      </div>
    </div>
  );
};

export default Result;