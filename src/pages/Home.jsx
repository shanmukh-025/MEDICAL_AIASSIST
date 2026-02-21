import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Search, Calendar, Bell, BrainCircuit, FileText, Utensils,
  ChevronRight, MapPin, Activity, Globe, LogOut, BarChart2, Users, User, Pill, Clock, Navigation2, Coffee, Stethoscope, Receipt, Shield
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';


const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const Home = () => {
  const navigate = useNavigate();
  const { lang, toggleLanguage } = useLanguage();
  const { socket, reminders, setReminders, doctorBreak, doctorDelay, emergencyAlert } = useSocket();
  const [userName, setUserName] = useState('User');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveQueueData, setLiveQueueData] = useState({});
  const [userAppointments, setUserAppointments] = useState([]);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [emergencySeconds, setEmergencySeconds] = useState(0);
  const [userRole, setUserRole] = useState('');

  const CREATOR_EMAILS = ['shanmukhasai250@gmail.com', 'varunmeruga@gmail.com'];
  const isCreator = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user && user.email && CREATOR_EMAILS.includes(user.email.toLowerCase());
  };

  useEffect(() => {
    // Redirect hospitals to their dashboard
    const role = localStorage.getItem('userRole');
    setUserRole(role || 'PATIENT');

    if (role === 'HOSPITAL') {
      navigate('/hospital-dashboard');
      return;
    }

    const savedName = localStorage.getItem('userName');
    if (savedName) setUserName(savedName);

    // Fetch user appointments to verify hospital matches
    fetchUserAppointments();

    // Clean up old reminders (older than 24 hours)
    if (reminders && reminders.length > 0) {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const filtered = reminders.filter(r => {
        const reminderTime = new Date(r.timestamp).getTime();
        return (now - reminderTime) < oneDayMs;
      });
      if (filtered.length !== reminders.length) {
        setReminders(filtered);
      }
    }
  }, []);

  // Fetch user's appointments to check hospital matches
  const fetchUserAppointments = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await axios.get(`${API}/api/appointments`, {
        headers: { 'x-auth-token': token }
      });
      if (res.data) {
        // Only include TODAY's active appointments (not completed/rejected/past)
        const today = new Date().toISOString().split('T')[0];
        const activeAppts = res.data.filter(appt => {
          const isNotCompleted = !['COMPLETED', 'REJECTED', 'NO_SHOW'].includes(appt.status);
          const isToday = appt.appointmentDate === today;
          return isNotCompleted && isToday;
        });
        setUserAppointments(activeAppts);
      }
    } catch (err) {
      console.error('Failed to fetch user appointments:', err);
    }
  };

  // Check if user has an appointment at the affected hospital
  const hasAppointmentAtHospital = (hospitalId) => {
    if (!hospitalId || !userAppointments || userAppointments.length === 0) return false;
    return userAppointments.some(appt =>
      appt.hospitalId && appt.hospitalId.toString() === hospitalId.toString()
    );
  };

  // Fetch live queue data for active reminders
  const fetchLiveQueueData = async () => {
    if (!reminders || reminders.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    for (const reminder of reminders) {
      if (reminder.apptId) {
        try {
          const res = await axios.get(
            `${API}/api/appointments/live-queue/${reminder.apptId}`,
            { headers: { 'x-auth-token': token } }
          );
          setLiveQueueData(prev => ({ ...prev, [reminder.apptId]: res.data }));
        } catch (err) {
          console.error('Failed to fetch live queue for reminder:', reminder.apptId, err);
        }
      }
    }
  };

  // Auto-refresh live queue data
  useEffect(() => {
    fetchLiveQueueData();

    const interval = setInterval(() => {
      fetchLiveQueueData();
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [reminders]);

  // Socket.IO listener for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdate = (data) => {
      console.log('🔔 Queue updated on home page:', data);
      fetchLiveQueueData();
    };

    socket.on('queueUpdated', handleQueueUpdate);

    return () => {
      socket.off('queueUpdated', handleQueueUpdate);
    };
  }, [socket, reminders]);

  // Break countdown for summary card
  useEffect(() => {
    if (!doctorBreak) { setBreakSeconds(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(doctorBreak.breakEndTime) - new Date()) / 1000));
      setBreakSeconds(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [doctorBreak]);

  // Delay countdown for summary card
  useEffect(() => {
    if (!doctorDelay) { setDelaySeconds(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(doctorDelay.delayEndTime) - new Date()) / 1000));
      setDelaySeconds(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [doctorDelay]);

  // Emergency countdown for summary card
  useEffect(() => {
    if (!emergencyAlert) { setEmergencySeconds(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(emergencyAlert.alertEndTime) - new Date()) / 1000));
      setEmergencySeconds(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [emergencyAlert]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // --- SEARCH HANDLER (DEBUGGED) ---
  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Search Triggered for:", searchQuery);

    if (searchQuery.trim()) {
      navigate(`/result/${encodeURIComponent(searchQuery)}`);
    }
  };

  // --- TRANSLATIONS HELPER ---
  const t = {
    greeting: lang === 'en' ? `Hi, ${userName}!` : `నమస్కారం, ${userName}!`,
    subtitle: lang === 'en' ? 'Safe Medicine Information for Everyone.' : 'అందరికీ సురక్షితమైన ఔషధ సమాచారం.',
    info: lang === 'en' ? 'Information only. Always consult a doctor.' : 'సమాచారం మాత్రమే. వైద్యుడిని సంప్రదించండి.',
    scan: lang === 'en' ? 'Scan Medicine' : 'మందులను స్కాన్ చేయండి',
    scanSub: lang === 'en' ? 'Camera / Text' : 'కెమెరా / వచనం',
    doctor: lang === 'en' ? 'Find Doctor' : 'వైద్యుడిని కనుగొనండి',
    doctorSub: lang === 'en' ? 'GPS Map' : 'GPS మ్యాప్',
    searchPlaceholder: lang === 'en' ? 'Type medicine name...' : 'మందు పేరు టైప్ చేయండి...',
    toolsTitle: lang === 'en' ? 'Daily Health Tools' : 'రోజువారీ ఆరోగ్య సాధనాలు',
    reminders: lang === 'en' ? 'Reminders' : 'జ్ఞాపికలు',
    medibot: lang === 'en' ? 'MediBot AI' : 'మెడి బాట్',
    analytics: lang === 'en' ? 'Analytics' : 'విశ్లేషణ',
    records: lang === 'en' ? 'Records' : 'రికార్డులు',
    family: lang === 'en' ? 'Family' : 'కుటుంబం',
    medicineReminders: lang === 'en' ? 'Medicine' : 'మందులు',
    diet: lang === 'en' ? 'Diet / BMI' : 'ఆహారం / BMI',
    recovery: lang === 'en' ? 'Recovery' : 'రికవరీ',
    appointments: lang === 'en' ? 'My Appointments' : 'నా అపాయింట్‌మెంట్లు',
    viewBookings: lang === 'en' ? 'View Bookings' : 'బుకింగ్‌లను చూడండి',

    // AI Features
    aiFeatures: lang === 'en' ? 'AI Health Analysis' : 'AI ఆరోగ్య విశ్లేషణ',
    symptomAnalysis: lang === 'en' ? 'Symptom Analysis' : 'లక్షణ విశ్లేషణ',
    symptomAnalysisSub: lang === 'en' ? 'AI Disease Prediction' : 'AI వ్యాధి అంచనా'
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">

      {/* HEADER SECTION */}
      <div className="bg-emerald-600 relative overflow-hidden pb-24 pt-8 px-6 text-white shadow-xl rounded-b-[40px]">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-400 opacity-20 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Top Bar */}
          <div className="flex justify-between items-start mb-8">
            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-white/10 shadow-sm">
              <Activity size={12} className="animate-pulse text-emerald-100" />
              <span>MediAssist AI</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleLanguage} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition border border-white/10 flex items-center gap-1">
                <Globe size={12} /> {lang === 'en' ? 'ENGLISH' : 'తెలుగు'}
              </button>

              <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition flex items-center gap-1 border border-white/10">
                <LogOut size={12} />
              </button>

              {(userRole === 'ADMIN' || isCreator()) && (
                <button
                  onClick={() => navigate('/admin-dashboard')}
                  className="bg-white/10 hover:bg-blue-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition flex items-center gap-1 border border-white/10"
                  title="Admin Dashboard"
                >
                  <Shield size={12} /> ADMIN
                </button>
              )}
            </div>
          </div>

          <h1 className="text-4xl font-black mb-2 tracking-tight drop-shadow-sm">
            {t.greeting}
          </h1>
          <p className="text-emerald-100 font-medium text-sm md:text-base opacity-90 max-w-md leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 space-y-6">

        {/* Queue Status Summary Card — links to dedicated Queue Dashboard */}
        {((doctorBreak && breakSeconds > 0 && hasAppointmentAtHospital(doctorBreak.hospitalId)) || (doctorDelay && delaySeconds > 0 && hasAppointmentAtHospital(doctorDelay.hospitalId)) || (emergencyAlert && emergencySeconds > 0 && hasAppointmentAtHospital(emergencyAlert.hospitalId)) || (reminders && reminders.length > 0)) && (
          <div
            onClick={() => navigate('/queue-dashboard')}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition group"
          >
            {/* Break mini-banner - only show if user has appointment at this hospital */}
            {doctorBreak && breakSeconds > 0 && hasAppointmentAtHospital(doctorBreak.hospitalId) && (
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-white flex items-center gap-3">
                <Coffee size={18} className="animate-pulse" />
                <div className="flex-1">
                  <span className="font-bold text-sm">Doctor on {doctorBreak.breakDurationMinutes}-min Break</span>
                  <span className="text-purple-200 text-xs ml-2">
                    ends at {new Date(doctorBreak.breakEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="font-mono font-bold text-lg tabular-nums bg-white/15 px-3 py-1 rounded-xl">
                  {String(Math.floor(breakSeconds / 60)).padStart(2, '0')}:{String(breakSeconds % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Emergency mini-banner - only show if user has appointment at this hospital */}
            {emergencyAlert && emergencySeconds > 0 && hasAppointmentAtHospital(emergencyAlert.hospitalId) && (
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-3 text-white flex items-center gap-3">
                <Activity size={18} className="animate-pulse" />
                <div className="flex-1">
                  <span className="font-bold text-sm">🚨 Emergency Case — Queue Paused</span>
                  <span className="text-red-200 text-xs ml-2">
                    est. ~{emergencyAlert.estimatedDuration} min
                  </span>
                </div>
                <span className="font-mono font-bold text-lg tabular-nums bg-white/15 px-3 py-1 rounded-xl">
                  {String(Math.floor(emergencySeconds / 60)).padStart(2, '0')}:{String(emergencySeconds % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Delay mini-banner - only show if user has appointment at this hospital */}
            {doctorDelay && delaySeconds > 0 && hasAppointmentAtHospital(doctorDelay.hospitalId) && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-white flex items-center gap-3">
                <Clock size={18} className="animate-pulse" />
                <div className="flex-1">
                  <span className="font-bold text-sm">Doctor Delayed by {doctorDelay.delayMinutes} min</span>
                  {doctorDelay.delayReason && (
                    <span className="text-orange-100 text-xs ml-2">({doctorDelay.delayReason})</span>
                  )}
                  <span className="text-orange-100 text-xs ml-2">
                    resumes at {new Date(doctorDelay.delayEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="font-mono font-bold text-lg tabular-nums bg-white/15 px-3 py-1 rounded-xl">
                  {String(Math.floor(delaySeconds / 60)).padStart(2, '0')}:{String(delaySeconds % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Reminders summary */}
            {reminders && reminders.length > 0 && (
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-full">
                  <Bell size={18} className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-slate-900">
                    {lang === 'en' ? 'Your Turn Approaching!' : 'మీ వంతు సమీపిస్తోంది!'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {reminders.length} active {reminders.length === 1 ? 'reminder' : 'reminders'} — tap to view details
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition" />
              </div>
            )}

            {/* CTA footer */}
            <div className="bg-indigo-50 px-5 py-2.5 flex items-center justify-center gap-2 group-hover:bg-indigo-100 transition">
              <Activity size={14} className="text-indigo-500" />
              <span className="text-xs font-bold text-indigo-600">
                {lang === 'en' ? 'Open Queue Dashboard' : 'క్యూ డాష్‌బోర్డ్ తెరవండి'}
              </span>
              <ChevronRight size={14} className="text-indigo-400" />
            </div>
          </div>
        )}

        {/* Notice Bar */}
        <div className="bg-emerald-900/90 backdrop-blur text-emerald-100 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-3 shadow-lg border border-white/10">
          <div className="bg-emerald-500/20 p-1 rounded-full"><AlertIcon /></div>
          {t.info}
        </div>

        {/* MAIN ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => navigate('/scan')} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center gap-4 group">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Camera size={32} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{t.scan}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{t.scanSub}</p>
            </div>
          </button>

          <button onClick={() => navigate('/doctors')} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center gap-4 group">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <MapPin size={32} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{t.doctor}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{t.doctorSub}</p>
            </div>
          </button>
        </div>

        {/* --- SEARCH BAR (FIXED FORM) --- */}
        <form onSubmit={handleSearch} className="relative group z-10">
          {/* Icon: Added pointer-events-none so it doesn't block clicks */}
          <div className="absolute left-5 top-5 text-slate-400 group-focus-within:text-emerald-500 transition z-20 pointer-events-none">
            <Search size={20} />
          </div>

          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full bg-white py-5 pl-14 pr-28 rounded-2xl shadow-sm border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 font-medium text-slate-700 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Button: Added z-30 to sit ON TOP of input */}
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-emerald-600 hover:shadow-lg transition-all z-30 cursor-pointer"
          >
            GO
          </button>
        </form>

        {/* DAILY HEALTH TOOLS */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-emerald-500" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.toolsTitle}</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="relative">
              <ToolCard icon={Bell} color="purple" label={t.reminders} onClick={() => navigate('/reminders')} />
              {reminders && reminders.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  {reminders.length}
                </div>
              )}
            </div>
            <ToolCard icon={BrainCircuit} color="pink" label={t.medibot} onClick={() => navigate('/first-aid')} />
            <ToolCard icon={BarChart2} color="blue" label={t.analytics} onClick={() => navigate('/symptom-analysis')} />
            <ToolCard icon={FileText} color="teal" label={t.records} onClick={() => navigate('/records')} />
            <ToolCard icon={Users} color="emerald" label={t.family} onClick={() => navigate('/family')} />
            <ToolCard icon={Utensils} color="orange" label={t.diet} onClick={() => navigate('/wellness')} />
            <ToolCard icon={Stethoscope} color="cyan" label={t.recovery} onClick={() => navigate('/recovery-tracker')} />
            <ToolCard icon={Receipt} color="sky" label="My Bills" onClick={() => navigate('/my-bills')} />
            {(userRole === 'ADMIN' || isCreator()) && (
              <ToolCard icon={Shield} color="red" label="Admin" onClick={() => navigate('/admin-dashboard')} />
            )}
          </div>
        </div>

        {/* APPOINTMENTS */}
        <div onClick={() => navigate('/appointments')} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl"><Calendar size={20} /></div>
            <div><h3 className="font-bold text-slate-800 text-sm">{t.appointments}</h3><p className="text-[10px] text-slate-400 font-bold uppercase">{t.viewBookings}</p></div>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </div>


        {/* QUEUE DASHBOARD - Direct Access */}
        <div onClick={() => navigate('/queue-dashboard')} className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-3xl shadow-lg border border-blue-500 flex items-center justify-between hover:shadow-xl transition cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 text-white p-3 rounded-2xl"><Activity size={20} /></div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {lang === 'en' ? 'Queue Dashboard' : 'క్యూ డాష్‌బోర్డ్'}
              </h3>
              <p className="text-[10px] text-blue-100 font-bold uppercase">
                {lang === 'en' ? 'View Queue & Call Hospital' : 'క్యూ చూడండి & హాస్పిటల్‌కు కాల్ చేయండి'}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-white/60" />
        </div>

      </div>
    </div>
  );
};

// Helper Component for Tools
const ToolCard = ({ icon: Icon, color, label, onClick }) => {
  const colors = {
    purple: "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-600 hover:text-white hover:border-purple-600",
    pink: "bg-pink-50 text-pink-600 border-pink-100 hover:bg-pink-600 hover:text-white hover:border-pink-600",
    blue: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600",
    teal: "bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-600 hover:text-white hover:border-teal-600",
    orange: "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-600 hover:text-white hover:border-orange-600",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600",
    red: "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600",
  };
  return (
    <div onClick={onClick} className={`${colors[color]} transition-all duration-300 p-4 rounded-2xl border cursor-pointer flex flex-col items-center justify-center gap-3 text-center h-32 group shadow-sm hover:shadow-md`}>
      <Icon size={28} className="transition-transform group-hover:scale-110" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  )
}

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default Home;