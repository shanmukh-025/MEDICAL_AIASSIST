import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Info, ShieldAlert, Pill, MapPin, Loader2, Volume2, Database } from 'lucide-react';

// --- 1. EXPANDED OFFLINE DATABASE (MOCK) ---
const MOCK_DB = {
  "paracetamol": {
    name: "Paracetamol",
    generic: "Acetaminophen",
    uses: "Pain relief, Fever reduction",
    dosage: "500mg every 4-6 hours. Max 4g/day.",
    warnings: "Liver damage if overdosed. Avoid alcohol.",
    sideEffects: "Nausea, Rash",
    manufacturer: "Generic"
  },
  "dolo 650": {
    name: "Dolo 650",
    generic: "Paracetamol",
    uses: "High Fever, Body Pain",
    dosage: "1 tablet every 6 hours after food.",
    warnings: "Do not take with other paracetamol products.",
    sideEffects: "Gastric irritation, Nausea",
    manufacturer: "Micro Labs"
  },
  "meftal forte": {
    name: "Meftal Forte",
    generic: "Mefenamic Acid + Paracetamol",
    uses: "Menstrual pain, Muscle pain, Fever",
    dosage: "1 tablet every 8 hours after food.",
    warnings: "Avoid if you have ulcers or kidney issues.",
    sideEffects: "Drowsiness, Nausea, Dizziness",
    manufacturer: "Blue Cross Labs"
  },
  "azithral": {
    name: "Azithral 500",
    generic: "Azithromycin",
    uses: "Bacterial Infections (Throat, Chest)",
    dosage: "Once daily for 3-5 days.",
    warnings: "Complete full course. Do not skip.",
    sideEffects: "Diarrhea, Stomach pain",
    manufacturer: "Alembic"
  }
};

const Result = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('search') || '';
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [source, setSource] = useState('offline'); // 'offline' or 'online'

  useEffect(() => {
    fetchData(query);
  }, [query]);

  // --- 2. SMART SEARCH LOGIC ---
  const fetchData = async (term) => {
    setLoading(true);
    setError(false);
    const cleanTerm = term.toLowerCase().trim();

    // STEP A: Check Offline DB first (Instant)
    if (MOCK_DB[cleanTerm]) {
      setData(MOCK_DB[cleanTerm]);
      setSource('offline');
      setLoading(false);
      return;
    }

    // STEP B: Fallback to OpenFDA API (Real Data)
    try {
      const response = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${term}"&limit=1`);
      const json = await response.json();

      if (json.results && json.results.length > 0) {
        const drug = json.results[0];
        // Format API data to match our UI
        setData({
          name: term.toUpperCase(), // API returns messy names, use user term
          generic: drug.openfda?.generic_name?.[0] || "Generic",
          uses: drug.indications_and_usage ? drug.indications_and_usage[0].slice(0, 200) + "..." : "Consult Doctor",
          dosage: drug.dosage_and_administration ? drug.dosage_and_administration[0].slice(0, 200) + "..." : "As prescribed",
          warnings: drug.warnings ? drug.warnings[0].slice(0, 200) + "..." : "Consult Doctor",
          sideEffects: drug.adverse_reactions ? drug.adverse_reactions[0].slice(0, 100) + "..." : "Nausea, Dizziness",
          manufacturer: drug.openfda?.manufacturer_name?.[0] || "Unknown"
        });
        setSource('online');
      } else {
        throw new Error("Not found");
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const speakInfo = () => {
    if (!data) return;
    const text = `This is ${data.name}. It is used for ${data.uses}. Dosage is ${data.dosage}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // --- 3. PROFESSIONAL UI ---
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
      <p className="text-emerald-800 font-bold animate-pulse">Searching Medical Database...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-6 rounded-full shadow-lg mb-6 animate-bounce">
         <AlertCircle className="text-rose-500" size={64} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Medicine Not Found</h2>
      <p className="text-gray-500 mb-8 max-w-xs">We couldn't find "{query}" in our offline database or the FDA registry.</p>
      
      <div className="flex gap-4 w-full max-w-sm">
        <button onClick={() => navigate('/')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold">Go Back</button>
        <button onClick={() => navigate('/scan')} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg">Scan Again</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      
      {/* HEADER */}
      <div className="bg-emerald-600 p-6 pt-8 pb-12 rounded-b-[40px] shadow-xl text-white sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-full backdrop-blur-md hover:bg-white/30 transition">
                <ArrowLeft size={24} />
            </button>
            <h1 className="font-bold text-lg tracking-wide opacity-90">Analysis Result</h1>
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
            <p className="text-gray-500 text-sm font-medium bg-gray-100 px-3 py-1 rounded-full mb-4">{data.generic}</p>
            
            {/* Source Badge */}
            {source === 'offline' ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <Database size={12}/> VERIFIED OFFLINE DATA
                </div>
            ) : (
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    <Database size={12}/> OPENFDA GOV API
                </div>
            )}
        </div>

        {/* DETAILS GRID */}
        <div className="grid gap-4">
            
            {/* Uses */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50">
                <h3 className="text-emerald-700 font-bold flex items-center gap-2 mb-2">
                    <CheckCircle size={20}/> Uses
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{data.uses}</p>
            </div>

            {/* Dosage */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
                <h3 className="text-blue-700 font-bold flex items-center gap-2 mb-2">
                    <Info size={20}/> Dosage
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{data.dosage}</p>
            </div>

            {/* Warnings (Red) */}
            <div className="bg-rose-50 p-5 rounded-2xl shadow-sm border border-rose-100">
                <h3 className="text-rose-700 font-bold flex items-center gap-2 mb-2">
                    <ShieldAlert size={20}/> Warnings
                </h3>
                <p className="text-rose-900 text-sm leading-relaxed font-medium">{data.warnings}</p>
            </div>

             {/* Side Effects */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50">
                <h3 className="text-orange-700 font-bold flex items-center gap-2 mb-2">
                    <AlertCircle size={20}/> Side Effects
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{data.sideEffects}</p>
            </div>
        </div>

        {/* FIND DOCTOR CTA */}
        <button 
            onClick={() => navigate('/')} 
            className="w-full bg-gray-900 text-white p-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
        >
            <MapPin size={20} /> Find Doctor for {data.name}
        </button>

      </div>
    </div>
  );
};

export default Result;