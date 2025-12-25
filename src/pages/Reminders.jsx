import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Bell, Trash2, Clock, X, Pill, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

// Alarm Sound
const ALARM_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const Reminders = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  // Translations
  const t = {
    title: lang === 'en' ? 'Medication' : 'మందుల రిమైండర్లు',
    addNew: lang === 'en' ? 'Add New' : 'కొత్తది జోడించు',
    emptyTitle: lang === 'en' ? 'No reminders set' : 'రిమైండర్‌లు సెట్ చేయబడలేదు',
    medName: lang === 'en' ? 'Medicine Name' : 'మందు పేరు',
    time: lang === 'en' ? 'Time' : 'సమయం',
    dosage: lang === 'en' ? 'Dosage' : 'మోతాదు',
    save: lang === 'en' ? 'Save Reminder' : 'సేవ్ చేయండి',
    cancel: lang === 'en' ? 'Cancel' : 'రద్దు చేయండి',
    takeMed: lang === 'en' ? 'TAKE MEDICINE' : 'మందులు వేసుకోండి',
    itsTime: lang === 'en' ? "It's time for your medication" : "ఇది మీ మందుల సమయం",
    didYouTake: lang === 'en' ? "Did you take your medicine?" : "మీరు మందులు వేసుకున్నారా?",
    yes: lang === 'en' ? "Yes, I took it" : "అవును, వేసుకున్నాను",
    no: lang === 'en' ? "No, Remind in 5 mins" : "లేదు, 5 నిమిషాల్లో గుర్తుచేయండి",
    completed: lang === 'en' ? "Completed for Today" : "ఈ రోజుకి పూర్తయింది"
  };

  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', time: '', dosage: '1' });
  
  // ALARM STATES
  const [activeAlarm, setActiveAlarm] = useState(null); // The reminder currently ringing
  const [showConfirmation, setShowConfirmation] = useState(false); // Show "Did you take it?"
  const audioRef = useRef(new Audio(ALARM_SOUND));

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('med_reminders') || '[]');
    setReminders(saved);
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  // --- 2. SMART CLOCK ENGINE ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDate = now.toDateString(); // "Fri Oct 27 2025"

      reminders.forEach(rem => {
        // TRIGGER LOGIC:
        // 1. Time matches?
        // 2. Alarm NOT currently ringing?
        // 3. Not already taken today?
        // 4. Not snoozed into the future?
        if (
             rem.time === currentTime && 
             activeAlarm?.id !== rem.id && 
             rem.lastTakenDate !== todayDate &&
             (!rem.snoozeUntil || now.getTime() >= rem.snoozeUntil)
           ) {
             triggerAlarm(rem);
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [reminders, activeAlarm]);

  // --- 3. ALARM ACTIONS ---
  const triggerAlarm = (reminder) => {
    setActiveAlarm(reminder);
    setShowConfirmation(false); // Reset confirmation screen
    
    // Play Sound
    audioRef.current.currentTime = 0;
    audioRef.current.loop = true;
    audioRef.current.play().catch(e => console.log("Audio blocked:", e));
  };

  const stopSound = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  // Step 1: User clicks "Take Medicine" -> Stop sound, Show Question
  const handleTakeMedicineClick = () => {
    stopSound();
    setShowConfirmation(true); // Switch to "Did you take it?" screen
  };

  // Step 2A: User clicks "YES"
  const handleConfirmYes = () => {
    const todayStr = new Date().toDateString();
    
    // Update reminder: Mark as taken TODAY, clear snooze
    const updated = reminders.map(r => 
        r.id === activeAlarm.id 
        ? { ...r, lastTakenDate: todayStr, snoozeUntil: null } 
        : r
    );
    
    setReminders(updated);
    localStorage.setItem('med_reminders', JSON.stringify(updated));
    
    setActiveAlarm(null);
    setShowConfirmation(false);
    toast.success(t.yes);
  };

  // Step 2B: User clicks "NO" (Snooze)
  const handleConfirmNo = () => {
    const now = new Date();
    const snoozeTime = now.getTime() + (5 * 60 * 1000); // Current Time + 5 Minutes
    
    // Update reminder: Set snooze time
    const updated = reminders.map(r => 
        r.id === activeAlarm.id 
        ? { ...r, snoozeUntil: snoozeTime } 
        : r
    );

    setReminders(updated);
    localStorage.setItem('med_reminders', JSON.stringify(updated));

    setActiveAlarm(null);
    setShowConfirmation(false);
    toast(`Snoozed for 5 minutes`, { icon: '💤' });
  };

  // --- CRUD HANDLERS ---
  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.time) return toast.error("Fill details");
    
    const newRem = { 
        ...formData, 
        id: Date.now(), 
        lastTakenDate: null, 
        snoozeUntil: null 
    };
    
    const updated = [...reminders, newRem];
    setReminders(updated);
    localStorage.setItem('med_reminders', JSON.stringify(updated));
    setShowModal(false);
    setFormData({ name: '', time: '', dosage: '1' });
    toast.success("Saved!");
  };

  const handleDelete = (id) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem('med_reminders', JSON.stringify(updated));
  };

  // Helper to check if completed today
  const isCompletedToday = (lastDate) => {
      return lastDate === new Date().toDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative">
      
      {/* Header */}
      <div className="bg-purple-600 p-6 pb-12 text-white relative shadow-lg">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/')} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                <ArrowLeft size={20}/>
             </button>
             <h1 className="text-xl font-bold">{t.title}</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-white text-purple-600 px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-purple-50 transition">
             <Plus size={16}/> {t.addNew}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-6 -mt-6 pb-20">
        {reminders.length === 0 ? (
           <div className="bg-white p-8 rounded-3xl shadow-sm text-center border border-slate-100">
              <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                 <Bell size={32}/>
              </div>
              <h3 className="text-slate-800 font-bold">{t.emptyTitle}</h3>
           </div>
        ) : (
           <div className="space-y-3">
              {reminders.map(rem => {
                 const done = isCompletedToday(rem.lastTakenDate);
                 return (
                    <div key={rem.id} className={`p-4 rounded-2xl shadow-sm border flex items-center justify-between group transition ${done ? 'bg-green-50 border-green-100 opacity-80' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`p-3 rounded-xl flex items-center justify-center ${done ? 'bg-green-200 text-green-700' : 'bg-purple-50 text-purple-600'}`}>
                               {done ? <CheckCircle size={20}/> : <Clock size={20}/>}
                           </div>
                           <div>
                              <h3 className={`font-bold ${done ? 'text-green-800 line-through' : 'text-slate-800'}`}>{rem.name}</h3>
                              <p className="text-xs text-slate-500 font-medium">{rem.time} • {rem.dosage}</p>
                              {done && <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">{t.completed}</span>}
                           </div>
                        </div>
                        <button onClick={() => handleDelete(rem.id)} className="text-slate-300 hover:text-red-500 p-2 transition">
                           <Trash2 size={18}/>
                        </button>
                    </div>
                 );
              })}
           </div>
        )}
      </div>

      {/* --- ADD MODAL --- */}
      {showModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
               <h2 className="text-lg font-bold text-slate-800 mb-4">{t.addNew}</h2>
               <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">{t.medName}</label>
                     <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold outline-none focus:ring-2 focus:ring-purple-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.time}</label>
                        <input type="time" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold outline-none focus:ring-2 focus:ring-purple-500" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}/>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.dosage}</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold outline-none focus:ring-2 focus:ring-purple-500" value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})}/>
                     </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                     <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200">{t.cancel}</button>
                     <button type="submit" className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700">{t.save}</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* --- FULL SCREEN ALARM OVERLAY --- */}
      {activeAlarm && (
          <div className="fixed inset-0 z-[100] bg-purple-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
              
              <div className="bg-white p-6 rounded-full mb-6 animate-bounce shadow-[0_0_60px_rgba(255,255,255,0.3)]">
                  <Pill size={64} className="text-purple-600"/>
              </div>

              <h2 className="text-4xl font-black text-white mb-2">{activeAlarm.name}</h2>
              <p className="text-purple-200 text-lg font-medium mb-12">{t.itsTime} ({activeAlarm.time})</p>
              
              {!showConfirmation ? (
                  // STATE 1: RINGING
                  <button 
                    onClick={handleTakeMedicineClick}
                    className="bg-white text-purple-600 px-10 py-5 rounded-full font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition flex items-center gap-3"
                  >
                      <CheckCircle size={32}/> {t.takeMed}
                  </button>
              ) : (
                  // STATE 2: CONFIRMATION (Sound Stopped)
                  <div className="w-full max-w-sm animate-in zoom-in duration-200">
                      <h3 className="text-2xl font-bold text-white mb-6">{t.didYouTake}</h3>
                      <div className="flex flex-col gap-3">
                          <button 
                            onClick={handleConfirmYes}
                            className="bg-green-500 text-white w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-600 transition"
                          >
                             {t.yes}
                          </button>
                          
                          <button 
                            onClick={handleConfirmNo}
                            className="bg-white/10 text-white border border-white/20 w-full py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition flex items-center justify-center gap-2"
                          >
                             <Clock size={20}/> {t.no}
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

    </div>
  );
};

export default Reminders;