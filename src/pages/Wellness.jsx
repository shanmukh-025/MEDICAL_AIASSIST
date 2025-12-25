import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, Droplets, Smile, Meh, Frown, 
  Loader2, ChefHat, RefreshCw, AlertCircle, Scale, Salad, Save, Trash2, Download, Bell, BellOff, Calendar, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext'; // Import Language Context

const Wellness = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage(); // Get current language
  const [activeTab, setActiveTab] = useState('habits'); 
  const [loading, setLoading] = useState(true);

  // --- TRANSLATIONS DICTIONARY ---
  const t = {
    header: lang === 'en' ? 'Wellness Command' : 'ఆరోగ్య డాష్‌బోర్డ్',
    subHeader: lang === 'en' ? 'Live Dashboard' : 'లైవ్ డాష్‌బోర్డ్',
    recordsBtn: lang === 'en' ? 'Records' : 'రికార్డులు',
    tabs: {
        habits: lang === 'en' ? 'Habits' : 'అలవాట్లు',
        diet: lang === 'en' ? 'Diet' : 'ఆహారం',
        assess: lang === 'en' ? 'Assess' : 'అంచనా'
    },
    // Habits Tab
    hydration: lang === 'en' ? 'Hydration' : 'నీరు త్రాగడం',
    goal: lang === 'en' ? 'Goal: 8 Cups' : 'లక్ష్యం: 8 కప్పులు',
    remindersOn: lang === 'en' ? 'Reminders ON' : 'రిమైండర్ ఆన్',
    remindersOff: lang === 'en' ? 'OFF' : 'ఆఫ్',
    mood: lang === 'en' ? 'Mood' : 'మానసిక స్థితి',
    weeklyProgress: lang === 'en' ? 'Weekly Progress' : 'వారాంతపు పురోగతి',
    startTracking: lang === 'en' ? 'Start tracking today to see your history!' : 'చరిత్రను చూడటానికి ఈరోజే ట్రాకింగ్ ప్రారంభించండి!',
    
    // Diet Tab
    aiTitle: lang === 'en' ? 'AI Nutritionist' : 'AI పోషకాహార నిపుణుడు',
    phConditions: lang === 'en' ? 'Health Conditions (e.g. Flu, Fever)' : 'ఆరోగ్య సమస్యలు (ఉదా. జ్వరం, జలుబు)',
    phAllergies: lang === 'en' ? 'Allergies' : 'అలెర్జీలు',
    btnGenerate: lang === 'en' ? 'Generate Meal Plan' : 'మీల్ ప్లాన్ సృష్టించండి',
    generating: lang === 'en' ? 'Generating...' : 'సిద్ధం చేస్తోంది...',
    recoveryPlan: lang === 'en' ? 'Your Recovery Plan' : 'మీ రికవరీ ప్లాన్',
    download: lang === 'en' ? 'Download' : 'డౌన్లోడ్',
    deletePlan: lang === 'en' ? 'Delete Plan' : 'ప్లాన్ తొలగించు',
    recommended: lang === 'en' ? 'Recommended' : 'సూచించబడినవి',
    avoid: lang === 'en' ? 'Avoid' : 'నివారించాల్సినవి',
    swap: lang === 'en' ? 'Swap' : 'మార్చు',
    swapped: lang === 'en' ? 'Swapped' : 'మార్చబడింది',

    // BMI Tab
    bmiTitle: lang === 'en' ? 'BMI Calculator' : 'BMI కాలిక్యులేటర్',
    height: lang === 'en' ? 'Height (cm)' : 'ఎత్తు (cm)',
    weight: lang === 'en' ? 'Weight (kg)' : 'బరువు (kg)',
    calcBtn: lang === 'en' ? 'Calculate Score' : 'స్కోర్‌ని లెక్కించు',
    enterDetails: lang === 'en' ? 'Enter details to see result' : 'ఫలితాన్ని చూడటానికి వివరాలను నమోదు చేయండి',
    
    // BMI Labels
    underweight: lang === 'en' ? 'Underweight' : 'బరువు తక్కువ',
    normal: lang === 'en' ? 'Normal' : 'సాధారణం',
    overweight: lang === 'en' ? 'Overweight' : 'బరువు ఎక్కువ'
  };

  // --- TRACKING STATES ---
  const [hydration, setHydration] = useState(0);
  const [mood, setMood] = useState('Happy');
  const [history, setHistory] = useState([]); 
  
  // --- REMINDER STATE ---
  const [remindersOn, setRemindersOn] = useState(false);
  const reminderInterval = useRef(null);

  // Diet & AI States
  const [dietProfile, setDietProfile] = useState({ conditions: '', preference: 'Vegetarian', allergies: '' });
  const [aiPlan, setAiPlan] = useState(null);
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState(null);
  
  // BMI States
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmiResult, setBmiResult] = useState(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const savedPlan = localStorage.getItem('offline_diet_plan');
            if (savedPlan) {
                const parsed = JSON.parse(savedPlan);
                if (parsed && Array.isArray(parsed.meals) && parsed.meals.length > 0) setAiPlan(parsed);
            }
        } catch (e) { localStorage.removeItem('offline_diet_plan'); }

        if(!token) { setLoading(false); return; }

        try {
            const res = await fetch('http://localhost:5000/api/wellness/today', { headers: { 'x-auth-token': token } });
            if(res.ok) {
                const data = await res.json();
                setHydration(data.hydration || 0);
                setMood(data.mood || 'Happy');
            }
        } catch (err) { console.error("Stats Error", err); } 

        try {
            const histRes = await fetch('http://localhost:5000/api/wellness/history', { headers: { 'x-auth-token': token } });
            if(histRes.ok) {
                const histData = await histRes.json();
                setHistory(histData);
            }
        } catch (err) { console.error("History Error", err); }

        setLoading(false);
    };
    
    if (localStorage.getItem('water_reminders') === 'true') {
        setTimeout(() => startReminders(false), 1000); 
    }

    fetchData();

    return () => { if (reminderInterval.current) clearInterval(reminderInterval.current); };
  }, []);

  // --- DATABASE SAVING ---
  const saveToDb = async (updates) => {
    try {
        const token = localStorage.getItem('token');
        await fetch('http://localhost:5000/api/wellness/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(updates)
        });
        
        const histRes = await fetch('http://localhost:5000/api/wellness/history', { headers: { 'x-auth-token': token } });
        if(histRes.ok) setHistory(await histRes.json());
        
    } catch (err) { console.error("Save failed", err); }
  };

  const updateHydration = (val) => { if(val<=8){ setHydration(val); saveToDb({hydration:val}); }};
  const updateMood = (val) => { setMood(val); saveToDb({mood:val}); };

  // --- REMINDER LOGIC ---
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) { toast.error("Browser does not support notifications."); return false; }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { toast.error("Notifications blocked."); return false; }
    return true;
  };

  const sendWaterNotification = () => {
      new Notification("💧 Hydration Check", { body: lang === 'en' ? "Time to drink water!" : "నీరు త్రాగడానికి సమయం!", icon: "/vite.svg" });
  };

  const toggleReminders = async () => {
      if (remindersOn) {
          setRemindersOn(false); localStorage.setItem('water_reminders', 'false');
          if (reminderInterval.current) clearInterval(reminderInterval.current);
          toast.success(t.remindersOff);
      } else {
          if (await requestNotificationPermission()) startReminders(true);
      }
  };

  const startReminders = (showToast = true) => {
      setRemindersOn(true); localStorage.setItem('water_reminders', 'true');
      if(showToast) toast.success(t.remindersOn);
      if (reminderInterval.current) clearInterval(reminderInterval.current);
      reminderInterval.current = setInterval(sendWaterNotification, 3600000); 
  };

  // --- DIET & BMI LOGIC ---
  const generateAIDiet = async (e) => {
    e.preventDefault(); setGeneratingDiet(true);
    try {
        const token = localStorage.getItem('token');
        const bmi = bmiResult ? bmiResult.score : "24.0"; 
        const res = await fetch('http://localhost:5000/api/ai/generate-diet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ bmi, ...dietProfile, language: lang }) // Sending Language
        });
        const data = await res.json();
        if (!data.meals || data.meals.length === 0) throw new Error("Empty plan");
        setAiPlan(data); localStorage.setItem('offline_diet_plan', JSON.stringify(data));
        toast.success(lang === 'en' ? "Plan Generated!" : "ప్లాన్ సిద్ధం!");
    } catch (err) { toast.error("Generation failed."); } finally { setGeneratingDiet(false); }
  };

  const swapFood = async (index, item, reason) => {
    setSwappingIndex(index);
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/ai/swap-food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ originalFood: item, reason, language: lang })
        });
        const data = await res.json();
        const updatedMeals = [...aiPlan.meals];
        updatedMeals[index].item = data.alternative; updatedMeals[index].isSwapped = true;
        const updatedPlan = { ...aiPlan, meals: updatedMeals };
        setAiPlan(updatedPlan); localStorage.setItem('offline_diet_plan', JSON.stringify(updatedPlan));
        toast.success(t.swapped);
    } catch (err) { toast.error("Swap failed"); } finally { setSwappingIndex(null); }
  };

  const downloadPlan = () => {
    if (!aiPlan) return;
    let content = `MEDICAL RECOVERY PLAN (${lang.toUpperCase()})\n=====================\nPROTOCOL: ${aiPlan.title}\nSUMMARY: ${aiPlan.desc}\n\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Diet_Plan_${lang}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    toast.success(t.download);
  };

  const clearDietPlan = () => { setAiPlan(null); localStorage.removeItem('offline_diet_plan'); toast.success("Cleared"); };

  const calculateBMI = () => {
      if (!height || !weight) return toast.error(t.enterDetails);
      const h = parseFloat(height) / 100; const w = parseFloat(weight);
      const bmi = (w / (h * h)).toFixed(1);
      
      let statusKey = 'normal';
      let color = "text-emerald-600";
      let bg = "bg-emerald-50";

      if (bmi < 18.5) { statusKey = 'underweight'; color = "text-blue-600"; bg = "bg-blue-50"; }
      else if (bmi >= 25) { statusKey = 'overweight'; color = "text-orange-600"; bg = "bg-orange-50"; }
      
      // Store the key ('normal', etc) instead of the label so we can translate it in render
      setBmiResult({ score: bmi, statusKey, color, bg });
  };

  // Helper to get translated tab name
  const getTabName = (tabKey) => t.tabs[tabKey];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* HEADER */}
      <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
             <div className="flex items-center gap-3">
                 <button onClick={() => navigate('/')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition text-slate-600"><ArrowLeft size={20}/></button>
                 <div><h1 className="text-xl font-bold text-slate-900">{t.header}</h1><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.subHeader}</p></div>
             </div>
             
             {/* --- NAVIGATION & TABS --- */}
             <div className="flex items-center gap-2 overflow-x-auto">
                <button 
                    onClick={() => navigate('/records')} 
                    className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-emerald-100 transition whitespace-nowrap"
                >
                    <FileText size={16}/> {t.recordsBtn}
                </button>

                <div className="bg-slate-100 p-1 rounded-xl flex font-bold text-xs">
                    {['habits', 'diet', 'assess'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg flex gap-2 transition-all capitalize ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                            {tab === 'habits' && <CheckCircle size={16}/>}{tab === 'diet' && <Salad size={16}/>}{tab === 'assess' && <Scale size={16}/>}
                            {getTabName(tab)}
                        </button>
                    ))}
                </div>
             </div>
          </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {loading ? <Loader2 className="animate-spin mx-auto mt-10 text-emerald-600"/> : (
            <>
                {/* HABITS TAB */}
                {activeTab === 'habits' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-5">
                        
                        {/* HYDRATION TRACKER */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 md:col-span-2 relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><Droplets size={28}/></div>
                                    <div><h3 className="font-bold text-lg text-slate-800">{t.hydration}</h3><p className="text-xs text-slate-500">{t.goal}</p></div>
                                </div>
                                <button onClick={toggleReminders} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition ${remindersOn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                    {remindersOn ? <Bell size={14}/> : <BellOff size={14}/>} {remindersOn ? t.remindersOn : t.remindersOff}
                                </button>
                            </div>
                            <div className="grid grid-cols-8 gap-3">
                                {[...Array(8)].map((_, i) => (
                                    <button key={i} onClick={() => updateHydration(i + 1)} className={`h-14 rounded-2xl flex items-center justify-center border-2 transition ${i < hydration ? 'bg-blue-50 border-blue-200 text-blue-500' : 'bg-white border-slate-100 text-slate-200'}`}>
                                        <Droplets size={20} fill={i < hydration ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* MOOD TRACKER */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                             <div className="flex items-center gap-3 mb-4"><Smile className="text-orange-500"/><span className="font-bold">{t.mood}</span></div>
                             <div className="flex justify-between px-2 py-4">
                                {['Sad', 'Meh', 'Happy'].map(m => (
                                    <button key={m} onClick={() => updateMood(m)} className={`p-2 rounded-full transition ${mood === m ? 'scale-125 text-orange-500 bg-orange-50' : 'text-slate-300'}`}>
                                        {m === 'Happy' ? <Smile size={32}/> : m === 'Meh' ? <Meh size={32}/> : <Frown size={32}/>}
                                    </button>
                                ))}
                             </div>
                        </div>

                        {/* WEEKLY PROGRESS HISTORY */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 md:col-span-3">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-violet-100 p-2 rounded-xl text-violet-600"><Calendar size={20}/></div>
                                <h3 className="font-bold text-slate-800">{t.weeklyProgress}</h3>
                            </div>
                            <div className="grid grid-cols-7 gap-4">
                                {history.map((day, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2">
                                        <div className="h-24 w-full bg-slate-50 rounded-xl relative overflow-hidden flex items-end">
                                            {/* Water Bar */}
                                            <div style={{ height: `${(day.hydration / 8) * 100}%` }} className="w-full bg-blue-400 opacity-80 transition-all rounded-t-sm"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{day.date.slice(5)}</span>
                                        {day.mood === 'Happy' && <Smile size={12} className="text-orange-400"/>}
                                        {day.mood === 'Meh' && <Meh size={12} className="text-slate-400"/>}
                                        {day.mood === 'Sad' && <Frown size={12} className="text-slate-300"/>}
                                    </div>
                                ))}
                                {history.length === 0 && <p className="col-span-7 text-center text-xs text-slate-400 italic py-4">{t.startTracking}</p>}
                            </div>
                        </div>

                    </div>
                )}

                {/* DIET TAB */}
                {activeTab === 'diet' && (
                    <div className="animate-in slide-in-from-right-5">
                        {!aiPlan ? (
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto text-center">
                                <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600"><ChefHat size={32} /></div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-6">{t.aiTitle}</h2>
                                <form onSubmit={generateAIDiet} className="space-y-4 text-left">
                                    <input type="text" className="w-full bg-slate-50 border p-4 rounded-xl font-bold" placeholder={t.phConditions} value={dietProfile.conditions} onChange={e => setDietProfile({...dietProfile, conditions: e.target.value})}/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select className="w-full bg-slate-50 border p-4 rounded-xl font-bold" value={dietProfile.preference} onChange={e => setDietProfile({...dietProfile, preference: e.target.value})}>
                                            <option value="Vegetarian">{lang === 'en' ? 'Vegetarian' : 'శాకాహారి'}</option>
                                            <option value="Non-Vegetarian">{lang === 'en' ? 'Non-Vegetarian' : 'మాంసాహారి'}</option>
                                        </select>
                                        <input type="text" className="w-full bg-slate-50 border p-4 rounded-xl font-bold" placeholder={t.phAllergies} value={dietProfile.allergies} onChange={e => setDietProfile({...dietProfile, allergies: e.target.value})}/>
                                    </div>
                                    <button disabled={generatingDiet} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                                        {generatingDiet ? <Loader2 className="animate-spin"/> : <ChefHat size={20}/>} {generatingDiet ? t.generating : t.btnGenerate}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="animate-in zoom-in">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">{t.recoveryPlan}</h2>
                                        <button onClick={downloadPlan} className="flex items-center gap-2 text-emerald-600 mt-2 hover:bg-emerald-50 px-3 py-1.5 -ml-2 rounded-lg transition group">
                                            <Download size={16} className="group-hover:translate-y-0.5 transition-transform"/>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{t.download}</span>
                                        </button>
                                    </div>
                                    <button onClick={clearDietPlan} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1 transition"><Trash2 size={14}/> {t.deletePlan}</button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className={`p-8 rounded-3xl ${aiPlan.color || 'bg-emerald-50'} bg-opacity-20 lg:col-span-1`}>
                                        <h2 className="font-bold text-xl text-emerald-800 mb-2">{aiPlan.title}</h2>
                                        <p className="text-sm text-slate-600 mb-6">{aiPlan.desc}</p>
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-xl border border-emerald-100">
                                                <h4 className="font-bold text-xs uppercase text-emerald-600 mb-2 flex items-center gap-2"><CheckCircle size={14}/> {t.recommended}</h4>
                                                <ul className="text-xs text-slate-600 list-disc list-inside">{(aiPlan.good || ["Water"]).map((g, i) => <li key={i}>{g}</li>)}</ul>
                                            </div>
                                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                                <h4 className="font-bold text-xs uppercase text-red-500 mb-2 flex items-center gap-2"><AlertCircle size={14}/> {t.avoid}</h4>
                                                <ul className="text-xs text-slate-600 list-disc list-inside">{(aiPlan.bad || ["Junk"]).map((b, i) => <li key={i}>{b}</li>)}</ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-3xl bg-white border border-slate-100 lg:col-span-2 relative">
                                        <div className="space-y-8 pl-4 border-l-2 border-slate-100 ml-2">
                                            {(aiPlan.meals || []).map((meal, idx) => (
                                                <div key={idx} className="relative pl-8 group">
                                                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm bg-emerald-500"></div>
                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                                        <div className="flex-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{meal.time} • {meal.type}</span>
                                                            <h4 className={`font-bold text-base ${meal.isSwapped ? 'text-emerald-600' : 'text-slate-800'}`}>{meal.item || meal.food || meal.name}{meal.isSwapped && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{t.swapped}</span>}</h4>
                                                            <p className="text-xs text-slate-400 mt-1 italic">{meal.reason}</p>
                                                        </div>
                                                        <button onClick={() => swapFood(idx, meal.item || meal.food || meal.name, meal.reason)} disabled={swappingIndex === idx} className="bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 transition flex items-center gap-1">
                                                            {swappingIndex === idx ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} {t.swap}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* BMI TAB */}
                {activeTab === 'assess' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-5">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-full space-y-6">
                            <h3 className="font-bold text-xl text-slate-900 mb-8 flex items-center gap-2"><Scale size={24} className="text-slate-400"/> {t.bmiTitle}</h3>
                            <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t.height}</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t.weight}</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold" placeholder="70" value={weight} onChange={e => setWeight(e.target.value)} /></div>
                            <button onClick={calculateBMI} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg mt-4">{t.calcBtn}</button>
                        </div>
                        <div className={`p-8 rounded-3xl border-2 flex flex-col justify-center items-center text-center transition-all ${bmiResult ? bmiResult.bg : 'bg-slate-50 border-dashed border-slate-200'}`}>
                            {bmiResult ? (
                                <div className="animate-in zoom-in space-y-4">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-white shadow-sm ${bmiResult.color}`}>
                                        {/* TRANSLATE THE RESULT LABEL HERE */}
                                        {t[bmiResult.statusKey]} 
                                    </span>
                                    <div><h2 className={`text-7xl font-black ${bmiResult.color} tracking-tighter`}>{bmiResult.score}</h2></div>
                                </div>
                            ) : (<div className="text-slate-300"><Scale size={64} className="mx-auto mb-4 opacity-50"/><p className="font-bold text-sm">{t.enterDetails}</p></div>)}
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default Wellness;