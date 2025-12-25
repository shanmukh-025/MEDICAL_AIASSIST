import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Trash2, Bell, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext'; // 1. Import Context

const Appointments = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage(); // 2. Get Language

  // 3. Translation Dictionary
  const t = {
    title: lang === 'en' ? 'My Appointments' : 'నా అపాయింట్‌మెంట్లు',
    loading: lang === 'en' ? 'Loading your schedule...' : 'మీ షెడ్యూల్ లోడ్ అవుతోంది...',
    noAppt: lang === 'en' ? 'No Appointments' : 'అపాయింట్‌మెంట్లు లేవు',
    bookInfo: lang === 'en' ? 'Book a doctor from the home screen' : 'హోమ్ స్క్రీన్ నుండి డాక్టర్‌ను బుక్ చేయండి',
    confirmed: lang === 'en' ? 'Confirmed' : 'ధృవీకరించబడింది',
    setReminder: lang === 'en' ? 'Set Reminder' : 'రిమైండర్ సెట్ చేయండి',
    reminderSet: lang === 'en' ? 'Reminder Set' : 'రిమైండర్ సెట్ చేయబడింది',
    remActivated: lang === 'en' ? 'Reminder Activated' : 'రిమైండర్ ఆన్ చేయబడింది',
    remDisabled: lang === 'en' ? 'Reminder Disabled' : 'రిమైండర్ ఆఫ్ చేయబడింది',
    cancelTitle: lang === 'en' ? 'Cancel Appointment?' : 'అపాయింట్‌మెంట్‌ని రద్దు చేయాలా?',
    cancelMsg: lang === 'en' ? 'Are you sure you want to cancel this visit? This action cannot be undone.' : 'మీరు ఖచ్చితంగా రద్దు చేయాలనుకుంటున్నారా? దీన్ని వెనక్కి తీసుకోలేము.',
    yesCancel: lang === 'en' ? 'Yes, Cancel' : 'అవును, రద్దు చేయి',
    keepIt: lang === 'en' ? 'Keep It' : 'వద్దు, ఉంచు',
    cancelled: lang === 'en' ? 'Appointment Cancelled' : 'అపాయింట్‌మెంట్ రద్దు చేయబడింది',
    failed: lang === 'en' ? 'Failed to cancel' : 'రద్దు చేయడం విఫలమైంది',
    loginAlert: lang === 'en' ? 'Please login to view appointments' : 'దయచేసి లాగిన్ అవ్వండి'
  };

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH APPOINTMENTS FROM DB ---
  const fetchAppointments = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error(t.loginAlert);
            navigate('/login');
            return;
        }

        const res = await fetch('http://localhost:5000/api/appointments', {
            headers: { 'x-auth-token': token }
        });

        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        setAppointments(data);
        setLoading(false);
    } catch (err) {
        console.error("Error fetching appointments:", err);
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // --- 2. DELETE FROM DB ---
  const deleteAppt = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/appointments/${id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });

        if (res.ok) {
            setAppointments(prev => prev.filter(a => a._id !== id)); 
            toast.success(t.cancelled, { icon: '🗑️' });
        } else {
            toast.error(t.failed);
        }
    } catch (err) {
        toast.error("Server Error");
    }
  };

  // --- UI: DELETE CONFIRMATION TOAST ---
  const triggerCancel = (id) => {
    toast.custom((to) => (
      <div className={`${to.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-3xl pointer-events-auto flex flex-col p-6 ring-1 ring-black ring-opacity-5 border border-gray-100`}>
        <div className="flex items-start gap-4 mb-4">
            <div className="bg-red-50 p-3 rounded-2xl text-red-500">
                <AlertTriangle size={28} strokeWidth={2.5}/>
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-lg">{t.cancelTitle}</h3>
                <p className="text-gray-500 text-sm mt-1 leading-tight">{t.cancelMsg}</p>
            </div>
        </div>
        <div className="flex gap-3 mt-2">
            <button 
                onClick={() => {
                    deleteAppt(id);
                    toast.dismiss(to.id);
                }}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-200 active:scale-95 transition"
            >
                {t.yesCancel}
            </button>
            <button 
                onClick={() => toast.dismiss(to.id)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition"
            >
                {t.keepIt}
            </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  // --- TOGGLE REMINDER (Local Only for Demo) ---
  const toggleReminder = (id) => {
    const updated = appointments.map(a => {
        if (a._id === id) { 
            const newState = !a.reminderEnabled;
            toast.custom((to) => (
                <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm">
                    {newState ? <CheckCircle className="text-green-400" size={20}/> : <Bell className="text-gray-400" size={20}/>}
                    {newState ? t.remActivated : t.remDisabled}
                </div>
            ), { duration: 2000 });
            return { ...a, reminderEnabled: newState, alerted: false };
        }
        return a;
    });
    setAppointments(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="bg-gray-100 p-2.5 rounded-full hover:bg-gray-200 transition text-gray-700">
            <ArrowLeft size={20}/>
        </button>
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600 mb-2" size={32}/>
            <p className="text-sm text-gray-400 font-bold">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-4">
            {appointments.length === 0 ? (
                <div className="text-center py-20">
                    <div className="bg-white p-6 rounded-full inline-block mb-4 shadow-sm border border-gray-100">
                        <Calendar size={48} className="text-gray-300"/>
                    </div>
                    <h3 className="font-bold text-gray-600 mb-1">{t.noAppt}</h3>
                    <p className="text-xs text-gray-400">{t.bookInfo}</p>
                </div>
            ) : (
                appointments.map(appt => (
                    <div key={appt._id} className={`bg-white p-5 rounded-3xl shadow-sm border transition-all duration-300 ${appt.reminderEnabled ? 'border-emerald-200 ring-1 ring-emerald-100 shadow-emerald-50' : 'border-gray-100'}`}>
                        
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 leading-tight">{appt.doctor}</h3>
                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">{appt.hospital}</p>
                            </div>
                            <span className="bg-green-100 text-green-700 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wide border border-green-200">
                                {appt.status || t.confirmed}
                            </span>
                        </div>

                        {/* Details Block */}
                        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 mb-5 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Calendar size={14} strokeWidth={3}/></div>
                                    <span className="font-bold text-gray-700 text-sm">{appt.date}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><Clock size={14} strokeWidth={3}/></div>
                                    <span className="font-bold text-gray-700 text-sm">{appt.time}</span>
                                </div>
                            </div>
                            {appt.specialty && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-200 pt-3 mt-1">
                                    <MapPin size={14} className="text-gray-400 shrink-0"/> 
                                    <span className="truncate font-medium">{appt.specialty}</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button 
                                onClick={() => toggleReminder(appt._id)}
                                className={`flex-1 py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${appt.reminderEnabled ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {appt.reminderEnabled ? <CheckCircle size={16}/> : <Bell size={16}/>}
                                {appt.reminderEnabled ? t.reminderSet : t.setReminder}
                            </button>

                            <button 
                                onClick={() => triggerCancel(appt._id)}
                                className="w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-100 hover:border-red-200 transition-colors"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  );
};

export default Appointments;