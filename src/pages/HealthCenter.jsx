import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, TrendingUp, AlertCircle, Plus, Calendar, History, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const HealthCenter = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- NEW STATE: CONTROL HISTORY EXPANSION ---
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Stats
  const [bmiHistory, setBmiHistory] = useState([]);
  const [illnessCount, setIllnessCount] = useState(0);

  // Forms
  const [activeModal, setActiveModal] = useState(null); // 'bmi' | 'illness' | null
  const [inputValue, setInputValue] = useState('');
  const [inputDesc, setInputDesc] = useState('');

  const fetchHistory = async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/health/history', {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        
        setLogs(data);
        
        // Calculate Stats
        const bmis = data.filter(l => l.type === 'bmi');
        setBmiHistory(bmis);
        setIllnessCount(data.filter(l => l.type === 'illness').length);
        setLoading(false);
    } catch (err) {
        console.error(err);
        setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSubmit = async () => {
    if (!inputValue && !inputDesc) return toast.error("Please enter details");

    try {
        const token = localStorage.getItem('token');
        const body = activeModal === 'bmi' 
            ? { type: 'bmi', value: parseFloat(inputValue) }
            : { type: 'illness', description: inputDesc };

        await fetch('http://localhost:5000/api/health/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(body)
        });

        toast.success("Health Record Updated!");
        setActiveModal(null);
        setInputValue('');
        setInputDesc('');
        fetchHistory(); // Refresh
    } catch (err) {
        toast.error("Failed to save");
    }
  };

  // --- LOGIC: SLICE LOGS BASED ON STATE ---
  const displayedLogs = showAllHistory ? logs : logs.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><ArrowLeft size={20}/></button>
        <div>
            <h1 className="text-xl font-bold text-slate-900">Health Center</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Long-term Tracking</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <Activity className="absolute top-4 right-4 opacity-20" size={60} />
                <h3 className="font-bold text-blue-100 text-sm uppercase tracking-widest">Latest BMI</h3>
                <div className="text-5xl font-black mt-2">{bmiHistory[0]?.value || "--"}</div>
                <button onClick={() => setActiveModal('bmi')} className="mt-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                    <Plus size={14}/> Update BMI
                </button>
            </div>

            <div className="bg-rose-500 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <AlertCircle className="absolute top-4 right-4 opacity-20" size={60} />
                <h3 className="font-bold text-rose-100 text-sm uppercase tracking-widest">Illness Log</h3>
                <div className="text-5xl font-black mt-2">{illnessCount}</div>
                <p className="text-xs text-rose-200 mb-3">Times fallen ill</p>
                <button onClick={() => setActiveModal('illness')} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                    <Plus size={14}/> Report Sickness
                </button>
            </div>
        </div>

        {/* HISTORY LIST */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History size={18}/> Recent Activity</h3>
            
            <div className="space-y-4">
                {logs.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No health records yet.</p>
                ) : (
                    <>
                        {displayedLogs.map(log => (
                            <div key={log._id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl ${log.type === 'bmi' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {log.type === 'bmi' ? <TrendingUp size={18}/> : <AlertCircle size={18}/>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">
                                            {log.type === 'bmi' ? `Updated BMI: ${log.value}` : `Reported: ${log.description}`}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                            <Calendar size={10}/> {new Date(log.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* --- SEE MORE BUTTON --- */}
                        {logs.length > 10 && (
                            <div className="pt-2 text-center">
                                <button 
                                    onClick={() => setShowAllHistory(!showAllHistory)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 mx-auto bg-blue-50 px-4 py-2 rounded-full transition-colors"
                                >
                                    {showAllHistory ? (
                                        <>Show Less <ChevronUp size={14}/></>
                                    ) : (
                                        <>See More ({logs.length - 10} more) <ChevronDown size={14}/></>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* INPUT MODAL */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                <h3 className="font-bold text-xl mb-4 text-slate-900">
                    {activeModal === 'bmi' ? "Update Body Mass Index" : "Report Sickness"}
                </h3>
                
                {activeModal === 'bmi' ? (
                    <input 
                        type="number" 
                        autoFocus
                        placeholder="Enter BMI Score (e.g. 24.5)" 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-lg mb-4 outline-none focus:border-blue-500"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                    />
                ) : (
                    <input 
                        type="text"
                        autoFocus 
                        placeholder="What happened? (e.g. Flu, Fever)" 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-lg mb-4 outline-none focus:border-rose-500"
                        value={inputDesc}
                        onChange={e => setInputDesc(e.target.value)}
                    />
                )}

                <div className="flex gap-3">
                    <button onClick={handleSubmit} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold">Save</button>
                    <button onClick={() => setActiveModal(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">Cancel</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default HealthCenter;