import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Search, Calendar, Bell, BrainCircuit, FileText, Utensils, 
  ChevronRight, MapPin, Activity, Globe, LogOut, BarChart2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Home = () => {
  const navigate = useNavigate();
  const { lang, toggleLanguage } = useLanguage();
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) setUserName(savedName);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
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
    diet: lang === 'en' ? 'Diet / BMI' : 'ఆహారం / BMI',
    appointments: lang === 'en' ? 'My Appointments' : 'నా అపాయింట్‌మెంట్లు',
    viewBookings: lang === 'en' ? 'View Bookings' : 'బుకింగ్‌లను చూడండి'
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
                <Activity size={12} className="animate-pulse text-emerald-100"/> 
                <span>VillageMed AI</span>
             </div>
             
             <div className="flex items-center gap-2">
                 {/* LANGUAGE TOGGLE BUTTON */}
                 <button onClick={toggleLanguage} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition border border-white/10 flex items-center gap-1">
                    <Globe size={12}/> {lang === 'en' ? 'ENGLISH' : 'తెలుగు'}
                 </button>

                 <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition flex items-center gap-1 border border-white/10">
                    <LogOut size={12} />
                 </button>
             </div>
          </div>
          
          {/* Greeting */}
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

          {/* UPDATED: Navigates to /doctors instead of Google Maps */}
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

        {/* SEARCH BAR */}
        <div className="relative group">
           <Search className="absolute left-5 top-5 text-slate-400 group-focus-within:text-emerald-500 transition" size={20}/>
           <input 
             type="text" 
             placeholder={t.searchPlaceholder}
             className="w-full bg-white py-5 pl-14 pr-24 rounded-2xl shadow-sm border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 font-medium text-slate-700 transition-all"
             onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/result/${e.target.value}`);
             }}
           />
           <button className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-emerald-600 hover:shadow-lg transition-all">GO</button>
        </div>

        {/* DAILY HEALTH TOOLS */}
        <div>
           <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-emerald-500"/>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.toolsTitle}</h3>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ToolCard icon={Bell} color="purple" label={t.reminders} onClick={() => navigate('/reminders')} />
              <ToolCard icon={BrainCircuit} color="pink" label={t.medibot} onClick={() => navigate('/first-aid')} />
              <ToolCard icon={BarChart2} color="blue" label={t.analytics} onClick={() => navigate('/analytics')} />
              <ToolCard icon={FileText} color="teal" label={t.records} onClick={() => navigate('/records')} />
              <ToolCard icon={Utensils} color="orange" label={t.diet} onClick={() => navigate('/wellness')} />
           </div>
        </div>

        {/* APPOINTMENTS */}
        <div onClick={() => navigate('/appointments')} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer">
           <div className="flex items-center gap-4">
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl"><Calendar size={20}/></div>
              <div><h3 className="font-bold text-slate-800 text-sm">{t.appointments}</h3><p className="text-[10px] text-slate-400 font-bold uppercase">{t.viewBookings}</p></div>
           </div>
           <ChevronRight size={16} className="text-slate-300"/>
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
    };
    return (
        <div onClick={onClick} className={`${colors[color]} transition-all duration-300 p-4 rounded-2xl border cursor-pointer flex flex-col items-center justify-center gap-3 text-center h-32 group shadow-sm hover:shadow-md`}>
            <Icon size={28} className="transition-transform group-hover:scale-110"/>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
    )
}

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default Home;