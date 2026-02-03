import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ArrowLeft, Save, Activity, AlertCircle, X, Trash2, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext'; // 1. Import Context

const Tracker = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage(); // 2. Get Language

  // 3. Translation Dictionary
  const t = {
    title: lang === 'en' ? 'Symptom Tracker' : 'లక్షణాల ట్రాకర్',
    subtitle: lang === 'en' ? 'Monitor Your Recovery' : 'మీ రికవరీని పర్యవేక్షించండి',
    symType: lang === 'en' ? 'Symptom Type' : 'లక్షణ రకం',
    severity: lang === 'en' ? 'Severity (1 - 10)' : 'తీవ్రత (1 - 10)',
    mild: lang === 'en' ? 'Mild' : 'తక్కువ',
    moderate: lang === 'en' ? 'Moderate' : 'మధ్యస్థ',
    severe: lang === 'en' ? 'Severe' : 'ఎక్కువ',
    recordBtn: lang === 'en' ? 'Record Log' : 'లాగ్ రికార్డ్ చేయండి',
    trends: lang === 'en' ? 'Trends' : 'పోకడలు',
    noData: lang === 'en' ? 'No data recorded yet' : 'ఇంకా డేటా రికార్డ్ చేయబడలేదు',
    history: lang === 'en' ? 'Recent History' : 'ఇటీవలి చరిత్ర',
    loggedAt: lang === 'en' ? 'Logged at' : 'సమయం',
    clearAll: lang === 'en' ? 'Clear All Data' : 'మొత్తం డేటా క్లియర్ చేయండి',
    delete: lang === 'en' ? 'Entry Deleted' : 'ఎంట్రీ తొలగించబడింది',
    saved: lang === 'en' ? 'Log Saved' : 'లాగ్ సేవ్ చేయబడింది',
    cleared: lang === 'en' ? 'All data cleared' : 'మొత్తం డేటా తొలగించబడింది',
    placeholder: lang === 'en' ? 'Type specific illness...' : 'వ్యాధి పేరు టైప్ చేయండి...',
    addNew: lang === 'en' ? '+ Add New Symptom' : '+ కొత్త లక్షణాన్ని జోడించు',
    
    // Symptom Names
    Fever: lang === 'en' ? 'Fever' : 'జ్వరం',
    Cough: lang === 'en' ? 'Cough' : 'దగ్గు',
    Headache: lang === 'en' ? 'Headache' : 'తలనొప్పి',
    Fatigue: lang === 'en' ? 'Fatigue' : 'అలసట',
    Nausea: lang === 'en' ? 'Nausea' : 'వికారం',
    "Body Pain": lang === 'en' ? 'Body Pain' : 'ఒళ్లు నొప్పులు'
  };

  const DEFAULT_SYMPTOMS = ["Fever", "Cough", "Headache", "Fatigue", "Nausea", "Body Pain"];

  // State
  const [symptom, setSymptom] = useState('Fever');
  const [severity, setSeverity] = useState(5);
  const [logs, setLogs] = useState([]);
  const [isCustomInput, setIsCustomInput] = useState(false); 

  // Load data on mount
  useEffect(() => {
    const savedLogs = JSON.parse(localStorage.getItem('symptom_logs') || '[]');
    setLogs(savedLogs);
  }, []);

  // Listen for Vani voice commands
  useEffect(() => {
    const handleSetSeverity = (event) => {
      const newSeverity = event.detail.severity;
      setSeverity(newSeverity);
      toast.success(`Severity set to ${newSeverity}`);
    };
    
    const handleSetSymptom = (event) => {
      const newSymptom = event.detail.symptom;
      setSymptom(newSymptom);
      setIsCustomInput(false);
      toast.success(`Symptom changed to ${newSymptom}`);
    };
    
    const handleSaveLog = () => {
      if (!symptom.trim()) {
        toast.error("Please enter a symptom name");
        return;
      }

      const newLog = {
        id: Date.now(),
        type: symptom.trim(),
        severity: parseInt(severity),
        date: new Date().toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric' }),
        timestamp: Date.now()
      };

      const updatedLogs = [...logs, newLog];
      setLogs(updatedLogs);
      localStorage.setItem('symptom_logs', JSON.stringify(updatedLogs));
      setIsCustomInput(false);
      toast.success(t.saved);
    };
    
    window.addEventListener('vani-set-severity', handleSetSeverity);
    window.addEventListener('vani-set-symptom', handleSetSymptom);
    window.addEventListener('vani-save-log', handleSaveLog);
    
    return () => {
      window.removeEventListener('vani-set-severity', handleSetSeverity);
      window.removeEventListener('vani-set-symptom', handleSetSymptom);
      window.removeEventListener('vani-save-log', handleSaveLog);
    };
  }, [symptom, severity, logs, t.saved]);

  // Get list of all unique symptoms (Defaults + History)
  const uniqueSymptoms = Array.from(new Set([
    ...DEFAULT_SYMPTOMS, 
    ...logs.map(log => log.type)
  ]));

  // Filter data for the graph & history list
  const symptomLogs = logs.filter(log => log.type === symptom);
  const graphData = symptomLogs.slice(-7); // Last 7 for graph

  const handleSave = () => {
    if (!symptom.trim()) {
        toast.error("Please enter a symptom name");
        return;
    }

    const newLog = {
      id: Date.now(),
      type: symptom.trim(),
      severity: parseInt(severity),
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric' }),
      timestamp: Date.now()
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    localStorage.setItem('symptom_logs', JSON.stringify(updatedLogs));
    setIsCustomInput(false);
    toast.success(t.saved);
  };

  const handleDropdownChange = (e) => {
    const value = e.target.value;
    if (value === 'ADD_NEW_CUSTOM') {
        setIsCustomInput(true);
        setSymptom(''); 
    } else {
        setSymptom(value);
    }
  };

  const deleteLog = (id) => {
    const updatedLogs = logs.filter(log => log.id !== id);
    setLogs(updatedLogs);
    localStorage.setItem('symptom_logs', JSON.stringify(updatedLogs));
    toast.success(t.delete);
  };

  const clearSymptomHistory = () => {
    if(!window.confirm(`Delete all history for "${symptom}"?`)) return;

    const updatedLogs = logs.filter(log => log.type !== symptom);
    setLogs(updatedLogs);
    localStorage.setItem('symptom_logs', JSON.stringify(updatedLogs));
    
    if (!DEFAULT_SYMPTOMS.includes(symptom)) {
        setSymptom(DEFAULT_SYMPTOMS[0]);
    }
    toast.success(t.cleared);
  };

  // Helper to translate symptom name
  const getSymptomName = (sym) => t[sym] || sym;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
            <ArrowLeft size={20}/>
        </button>
        <div>
            <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.subtitle}</p>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        
        {/* INPUT CARD */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="space-y-6">
                
                {/* Symptom Selector */}
                <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 block">{t.symType}</label>
                    
                    {isCustomInput ? (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                            <input 
                                type="text" 
                                autoFocus
                                value={symptom}
                                onChange={(e) => setSymptom(e.target.value)}
                                placeholder={t.placeholder}
                                className="w-full bg-slate-50 border border-blue-500 p-4 rounded-xl font-bold text-slate-800 outline-none ring-4 ring-blue-500/10"
                            />
                            <button 
                                onClick={() => { setIsCustomInput(false); setSymptom(uniqueSymptoms[0]); }}
                                className="p-4 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-500 transition"
                                title="Cancel"
                            >
                                <X size={20}/>
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <select 
                                value={symptom}
                                onChange={handleDropdownChange}
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none transition-all"
                            >
                                {uniqueSymptoms.map(sym => (
                                    <option key={sym} value={sym}>{getSymptomName(sym)}</option>
                                ))}
                                <option disabled>──────────</option>
                                <option value="ADD_NEW_CUSTOM" className="text-blue-600 font-bold">{t.addNew}</option>
                            </select>
                            <Activity className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={20}/>
                        </div>
                    )}
                </div>

                {/* Severity Slider */}
                <div>
                    <div className="flex justify-between items-end mb-4">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t.severity}</label>
                        <span className="text-2xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                            {severity}
                        </span>
                    </div>
                    <input 
                        type="range" min="1" max="10" step="1"
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 font-bold mt-2 uppercase">
                        <span>{t.mild}</span>
                        <span>{t.moderate}</span>
                        <span>{t.severe}</span>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                    <Save size={20} /> {t.recordBtn}
                </button>
            </div>
        </div>

        {/* CHART CARD */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity size={20} className="text-blue-500"/>
                    <h3 className="font-bold text-slate-800">{getSymptomName(symptom)} {t.trends}</h3>
                </div>
                {symptomLogs.length > 0 && (
                    <button onClick={clearSymptomHistory} className="text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition">
                        <Trash2 size={12}/> {t.clearAll}
                    </button>
                )}
            </div>

            <div className="h-64 w-full">
                {graphData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData}>
                            <defs>
                                <linearGradient id="colorSeverity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10}/>
                            <YAxis domain={[0, 10]} hide={false} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}}/>
                            <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}/>
                            <Area type="monotone" dataKey="severity" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSeverity)" activeDot={{r: 6, strokeWidth: 0}}/>
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <AlertCircle size={48} className="mb-2 opacity-50"/>
                        <p className="text-sm font-bold">{t.noData}</p>
                    </div>
                )}
            </div>
        </div>

        {/* HISTORY LIST */}
        {symptomLogs.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <History size={16} className="text-slate-400"/>
                    <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest">{t.history}</h3>
                </div>
                <div>
                    {symptomLogs.slice().reverse().map((log) => (
                        <div key={log.id} className="p-4 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${log.severity <= 3 ? 'bg-green-100 text-green-600' : log.severity <= 6 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                    {log.severity}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{log.date}</p>
                                    <p className="text-xs text-slate-400 font-medium">{t.loggedAt} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => deleteLog(log.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                            >
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Tracker;