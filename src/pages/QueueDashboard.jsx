import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Users, Clock, Coffee, RefreshCw,
  Activity, Bell, Navigation2,
  Zap, Timer, Shield, Phone, User, XCircle
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import AudioCall from '../components/AudioCall';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const QueueDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { socket, doctorBreak, doctorDelay, emergencyAlert, reminders, setReminders } = useSocket();

  const [appointments, setAppointments] = useState([]);
  const [liveQueueData, setLiveQueueData] = useState({});
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [emergencySeconds, setEmergencySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [callHospitalData, setCallHospitalData] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const token = localStorage.getItem('token');
  const today = new Date().toISOString().split('T')[0];

  // --- Translations ---
  const t = {
    title: lang === 'en' ? 'My Queue Status' : 'నా క్యూ స్థితి',
    liveQueue: lang === 'en' ? 'Live Queue' : 'లైవ్ క్యూ',
    doctorBreak: lang === 'en' ? 'Doctor Break' : 'డాక్టర్ బ్రేక్',
    upcomingAppts: lang === 'en' ? 'Today\'s Appointments' : 'ఈరోజు అపాయింట్‌మెంట్లు',
    reminders: lang === 'en' ? 'Active Reminders' : 'రిమైండర్‌లు',
    noAppts: lang === 'en' ? 'No appointments today' : 'ఈరోజు అపాయింట్‌మెంట్లు లేవు',
    ahead: lang === 'en' ? 'Ahead' : 'ముందు',
    estWait: lang === 'en' ? 'Est. Wait' : 'అంచనా వేచి',
    yourQueue: lang === 'en' ? 'Your Queue' : 'మీ క్యూ',
    nowServing: lang === 'en' ? 'Now Serving' : 'ఇప్పుడు సేవ',
    breakEndsAt: lang === 'en' ? 'Break ends at' : 'బ్రేక్ ముగుస్తుంది',
    remaining: lang === 'en' ? 'remaining' : 'మిగిలింది',
    refreshing: lang === 'en' ? 'Auto-refreshing every 15s' : 'ప్రతి 15 సెకన్లకు రిఫ్రెష్',
    bookAppt: lang === 'en' ? 'Book Appointment' : 'అపాయింట్‌మెంట్ బుక్ చేయండి',
    viewAll: lang === 'en' ? 'View All Appointments' : 'అన్ని అపాయింట్‌మెంట్లు చూడండి',
    cancelAppt: lang === 'en' ? 'Cancel' : 'రద్దు',
    cancelConfirm: lang === 'en' ? 'Cancel this appointment?' : 'ఈ అపాయింట్‌మెంట్ రద్దు చేయాలా?',
    yesCancelIt: lang === 'en' ? 'Yes, Cancel' : 'అవును, రద్దు',
    no: lang === 'en' ? 'No' : 'వద్దు',
    appointmentCancelled: lang === 'en' ? 'Appointment cancelled' : 'అపాయింట్‌మెంట్ రద్దు చేయబడింది',
  };

  // --- Fetch appointments ---
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/appointments`, {
        headers: { 'x-auth-token': token }
      });
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // --- Cancel appointment ---
  const cancelAppointment = async (apptId) => {
    setCancellingId(apptId);
    try {
      const res = await axios.put(`${API}/api/appointments/${apptId}/cancel`, {}, {
        headers: { 'x-auth-token': token }
      });
      setAppointments(prev => prev.filter(a => a._id !== apptId));
      setLiveQueueData(prev => { const u = { ...prev }; delete u[apptId]; return u; });
      setReminders(prev => prev.filter(r => r.apptId !== apptId));
      toast.success(t.appointmentCancelled, { icon: '🗑️' });
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const triggerCancel = (apptId) => {
    toast.custom((to) => (
      <div className={`${to.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-2xl rounded-2xl p-5 ring-1 ring-black/5 pointer-events-auto`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-50 p-2 rounded-full"><XCircle size={22} className="text-red-500" /></div>
          <p className="font-bold text-slate-900 text-sm">{t.cancelConfirm}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { cancelAppointment(apptId); toast.dismiss(to.id); }} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-200 active:scale-95 transition">{t.yesCancelIt}</button>
          <button onClick={() => toast.dismiss(to.id)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 active:scale-95 transition">{t.no}</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  // Check if user has an appointment at the affected hospital TODAY
  const hasAppointmentAtHospital = (hospitalId) => {
    if (!hospitalId || !appointments || appointments.length === 0) return false;
    const today = new Date().toISOString().split('T')[0];
    return appointments.some(appt => 
      appt.hospitalId && 
      appt.hospitalId.toString() === hospitalId.toString() &&
      appt.appointmentDate === today &&
      !['COMPLETED', 'REJECTED', 'NO_SHOW'].includes(appt.status)
    );
  };

  // --- Fetch live queue data ---
  const fetchQueueData = useCallback(async () => {
    // Collect appointment IDs from both user's appointments and active reminders
    const todayAppts = appointments.filter(
      a => a.appointmentDate === today &&
        ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)
    );

    // Build a Set of all appointment IDs that need live data
    const apptIds = new Set(todayAppts.map(a => a._id));
    
    // Also include appointment IDs from reminders (for walk-in patients who have no "my" appointments)
    if (reminders && reminders.length > 0) {
      reminders.forEach(r => { if (r.apptId) apptIds.add(r.apptId); });
    }

    for (const apptId of apptIds) {
      try {
        const res = await axios.get(
          `${API}/api/appointments/live-queue/${apptId}`,
          { headers: { 'x-auth-token': token } }
        );

        if (res.data.status === 'COMPLETED') {
          // Cleanup if consultation is completed
          setReminders(prev => prev.filter(r => r.apptId !== apptId));
          setLiveQueueData(prev => {
            const updated = { ...prev };
            delete updated[apptId];
            return updated;
          });
          // Update local appointment state as well
          setAppointments(prev => prev.map(a => a._id === apptId ? { ...a, status: 'COMPLETED' } : a));
        } else {
          setLiveQueueData(prev => ({ ...prev, [apptId]: res.data }));
        }
      } catch (err) {
        console.error('Queue fetch failed for', apptId, err);
      }
    }
  }, [appointments, reminders, token, today, setReminders]);

  // Initial load
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Auto-refresh queue data
  useEffect(() => {
    const hasReminders = reminders && reminders.length > 0;
    if (appointments.length === 0 && !hasReminders) return;
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 15000);
    return () => clearInterval(interval);
  }, [appointments, reminders, fetchQueueData]);

  // Socket listener — fetch fresh appointment list, then queue data re-fetches
  // automatically via the [appointments, fetchQueueData] effect
  useEffect(() => {
    if (!socket) return;
    const handler = async (data) => {
      // If this is a CONSULTATION_ENDED for the user, clear related live data
      if (data && data.type === 'CONSULTATION_ENDED' && data.apptId) {
        setLiveQueueData(prev => {
          const updated = { ...prev };
          delete updated[data.apptId];
          return updated;
        });

        // Optimistically update appointment status to hide the queue card immediately
        setAppointments(prev => prev.map(a => 
          a._id === data.apptId ? { ...a, status: 'COMPLETED' } : a
        ));
      }
      await fetchAppointments();
      // Small delay to let state settle, then force queue data refresh
      setTimeout(() => fetchQueueData(), 300);
    };
    
    // Also listen for notification events (completion notifications)
    const notifHandler = async (data) => {
      if (data && data.status === 'COMPLETED' && data.apptId) {
        // Remove live data for completed appointment
        setLiveQueueData(prev => {
          const updated = { ...prev };
          delete updated[data.apptId];
          return updated;
        });

        // Optimistically update appointment status to hide the queue card immediately
        setAppointments(prev => prev.map(a => 
          a._id === data.apptId ? { ...a, status: 'COMPLETED' } : a
        ));
      }
      await fetchAppointments();
      setTimeout(() => fetchQueueData(), 300);
    };
    
    socket.on('queueUpdated', handler);
    socket.on('reminder', handler);
    socket.on('notification', notifHandler);
    return () => {
      socket.off('queueUpdated', handler);
      socket.off('reminder', handler);
      socket.off('notification', notifHandler);
    };
  }, [socket, fetchAppointments, fetchQueueData]);

  // Redirect if all appointments are completed
  useEffect(() => {
    if (loading) return; // Wait for initial load
    
    // Check if user has any active appointments today
    const hasActiveAppointments = appointments.some(a => 
      a.appointmentDate === today && 
      !['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(a.status)
    );
    
    // If no active appointments and no reminders, redirect to home
    if (!hasActiveAppointments && (!reminders || reminders.length === 0)) {
      navigate('/', { replace: true });
    }
  }, [appointments, reminders, loading, today, navigate]);

  // Break countdown
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

  // Delay countdown
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

  // Emergency countdown
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

  // --- Derived data ---
  const todayAppts = appointments.filter(a => a.appointmentDate === today && !['CANCELLED', 'REJECTED', 'COMPLETED'].includes(a.status));
  const activeAppt = todayAppts.find(a => ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status) && a.queueNumber);
  const activeQueueInfo = activeAppt ? liveQueueData[activeAppt._id] : null;

  const breakMinutes = Math.floor(breakSeconds / 60);
  const breakSecs = breakSeconds % 60;
  const breakEndTime = doctorBreak ? new Date(doctorBreak.breakEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const breakProgress = doctorBreak ? Math.max(0, (breakSeconds / (doctorBreak.breakDurationMinutes * 60)) * 100) : 0;

  const delayMins = Math.floor(delaySeconds / 60);
  const delaySecs = delaySeconds % 60;
  const delayEndTime = doctorDelay ? new Date(doctorDelay.delayEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const delayProgress = doctorDelay ? Math.max(0, (delaySeconds / (doctorDelay.delayMinutes * 60)) * 100) : 0;

  const emergencyMins = Math.floor(emergencySeconds / 60);
  const emergencySecs = emergencySeconds % 60;
  const emergencyProgress = emergencyAlert ? Math.max(0, (emergencySeconds / (emergencyAlert.estimatedDuration * 60)) * 100) : 0;

  const getUrgencyMessage = () => {
    if (!activeQueueInfo) return null;
    if (activeQueueInfo.patientsAhead === 0) return { text: lang === 'en' ? '🎯 Your Turn Next!' : '🎯 మీ వంతు తర్వాత!', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (activeQueueInfo.patientsAhead <= 2) return { text: lang === 'en' ? '⏰ Almost your turn — be ready!' : '⏰ దాదాపు మీ వంతు — సిద్ధంగా ఉండండి!', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    if (activeQueueInfo.patientsAhead <= 5) return { text: lang === 'en' ? '🕒 Your turn is coming soon' : '🕒 మీ వంతు త్వరలో వస్తుంది', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    return null;
  };

  const urgency = getUrgencyMessage();

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">

      {/* --- HEADER --- */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 relative overflow-hidden pb-20 pt-6 px-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400 opacity-15 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />

        <div className="max-w-2xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate('/')} className="bg-white/15 p-2.5 rounded-full hover:bg-white/25 transition">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{t.title}</h1>
              <p className="text-blue-200 text-xs mt-0.5">{t.refreshing}</p>
            </div>
            <button onClick={() => { fetchAppointments(); fetchQueueData(); }} className="bg-white/15 p-2.5 rounded-full hover:bg-white/25 transition">
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Hero Queue Number */}
          {activeAppt && (
            <div className="text-center">
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">{t.yourQueue}</p>
              <div className="text-7xl font-black tracking-tight drop-shadow-lg">#{activeAppt.queueNumber}</div>
              {activeQueueInfo && (
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-3xl font-black">{activeQueueInfo.patientsAhead}</div>
                    <div className="text-xs text-blue-200 font-bold">{t.ahead}</div>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="text-center">
                    <div className="text-3xl font-black">{activeQueueInfo.estimatedWaitTime || 0}<span className="text-lg">m</span></div>
                    <div className="text-xs text-blue-200 font-bold">{t.estWait}</div>
                  </div>
                  {activeQueueInfo.currentlyServing && (
                    <>
                      <div className="w-px h-10 bg-white/20" />
                      <div className="text-center">
                        <div className="text-3xl font-black">#{activeQueueInfo.currentlyServing}</div>
                        <div className="text-xs text-blue-200 font-bold">{t.nowServing}</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {!activeAppt && !loading && (
            <div className="text-center py-4">
              <Users size={40} className="mx-auto mb-2 text-blue-300" />
              <p className="text-blue-200 text-sm">{t.noAppts}</p>
              <button onClick={() => navigate('/patient-appointments')} className="mt-3 bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl text-sm font-bold transition">
                {t.bookAppt}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- BODY --- */}
      <div className="max-w-2xl mx-auto px-6 -mt-12 relative z-20 space-y-5">

        {/* Urgency Alert */}
        {urgency && (
          <div className={`${urgency.color} border-2 px-5 py-4 rounded-2xl text-center font-bold text-sm shadow-sm animate-pulse`}>
            {urgency.text}
          </div>
        )}

        {/* ========== EMERGENCY ALERT CARD ========== */}
        {emergencyAlert && emergencySeconds > 0 && hasAppointmentAtHospital(emergencyAlert.hospitalId) && (
          <div className="bg-white rounded-3xl shadow-sm border-2 border-red-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-full">
                  <Shield size={22} className="animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">
                    {lang === 'en'
                      ? '🚨 Emergency Case — Queue Paused'
                      : '🚨 అత్యవసర కేసు — క్యూ ఆపబడింది'}
                  </h3>
                  <p className="text-red-200 text-xs mt-0.5">
                    {lang === 'en'
                      ? `An emergency patient is being attended. Est. ~${emergencyAlert.estimatedDuration} min`
                      : `అత్యవసర రోగికి చికిత్స జరుగుతోంది. అంచనా ~${emergencyAlert.estimatedDuration} నిమి`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-white/15 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-1">
                      <Timer size={16} />
                      <span className="font-mono font-black text-2xl tabular-nums">
                        {String(emergencyMins).padStart(2, '0')}:{String(emergencySecs).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-red-200 mt-1 text-center">{t.remaining}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-white/80 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${emergencyProgress}%` }}
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-red-50 flex items-center gap-2">
              <Shield size={14} className="text-red-500" />
              <p className="text-xs text-red-700">
                {lang === 'en'
                  ? 'Your queue position is preserved. Wait time has been adjusted. Thank you for your patience.'
                  : 'మీ క్యూ స్థానం భద్రంగా ఉంది. వేచి సమయం సరిచేయబడింది. మీ ఓపికకు ధన్యవాదాలు.'}
              </p>
            </div>
          </div>
        )}

        {/* ========== DOCTOR BREAK CARD ========== */}
        {doctorBreak && breakSeconds > 0 && hasAppointmentAtHospital(doctorBreak.hospitalId) && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-full">
                  <Coffee size={22} className="animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">
                    {lang === 'en' 
                      ? `Doctor on ${doctorBreak.breakDurationMinutes}-minute Break` 
                      : `డాక్టర్ ${doctorBreak.breakDurationMinutes} నిమిషాల బ్రేక్‌లో`}
                  </h3>
                  <p className="text-purple-200 text-xs mt-0.5">
                    {t.breakEndsAt} <strong>{breakEndTime}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-white/15 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-1">
                      <Timer size={16} />
                      <span className="font-mono font-black text-2xl tabular-nums">
                        {String(breakMinutes).padStart(2, '0')}:{String(breakSecs).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-purple-200 mt-1 text-center">{t.remaining}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-white/80 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${breakProgress}%` }}
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-purple-50 flex items-center gap-2">
              <Shield size={14} className="text-purple-500" />
              <p className="text-xs text-purple-700">
                {lang === 'en'
                  ? 'Your estimated wait time already includes this break. You\'ll be notified when the doctor resumes.'
                  : 'మీ అంచనా వేచి సమయంలో ఈ బ్రేక్ కలుపబడింది. డాక్టర్ పునఃప్రారంభించినప్పుడు మీకు తెలియజేయబడుతుంది.'}
              </p>
            </div>
          </div>
        )}

        {/* ========== DOCTOR DELAY CARD ========== */}
        {doctorDelay && delaySeconds > 0 && hasAppointmentAtHospital(doctorDelay.hospitalId) && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-full">
                  <Clock size={22} className="animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">
                    {lang === 'en'
                      ? `Doctor Delayed by ${doctorDelay.delayMinutes} minutes`
                      : `డాక్టర్ ${doctorDelay.delayMinutes} నిమిషాలు ఆలస్యం`}
                  </h3>
                  <p className="text-orange-100 text-xs mt-0.5">
                    {doctorDelay.delayReason && (
                      <span className="mr-2">Reason: <strong>{doctorDelay.delayReason}</strong></span>
                    )}
                    {lang === 'en' ? 'Resumes at' : 'తిరిగి'} <strong>{delayEndTime}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-white/15 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-1">
                      <Timer size={16} />
                      <span className="font-mono font-black text-2xl tabular-nums">
                        {String(delayMins).padStart(2, '0')}:{String(delaySecs).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-100 mt-1 text-center">{t.remaining}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-white/80 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${delayProgress}%` }}
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-orange-50 flex items-center gap-2">
              <Shield size={14} className="text-orange-500" />
              <p className="text-xs text-orange-700">
                {lang === 'en'
                  ? 'Your estimated wait time has been updated to include this delay.'
                  : 'మీ అంచనా వేచి సమయంలో ఈ ఆలస్యం కలుపబడింది.'}
              </p>
            </div>
          </div>
        )}

        {/* ========== TODAY'S APPOINTMENTS ========== */}
        {todayAppts.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Activity size={18} className="text-indigo-500" />
              <h3 className="font-bold text-slate-900">{t.upcomingAppts}</h3>
              <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{todayAppts.length}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {todayAppts.map((appt) => (
                <div key={appt._id} className="p-5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900">{appt.hospitalName || 'Hospital'}</h4>
                    {appt.patientName && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <User size={12} className="text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-600">{appt.patientName}</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">Dr. {appt.doctor || ''}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {appt.queueNumber && (
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                          Queue #{appt.queueNumber}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        appt.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                        appt.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                        appt.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                        appt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                  {/* Call Hospital Button */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {appt.hospitalId && (
                      <button
                        onClick={() => {
                          if (!socket) {
                            toast.error('Not connected. Please refresh.');
                            return;
                          }
                          setCallHospitalData({
                            id: appt.hospitalId,
                            name: appt.hospitalName || 'Hospital'
                          });
                          setShowAudioCall(true);
                          toast.loading('Connecting call...', { id: 'call-connecting' });
                          setTimeout(() => toast.dismiss('call-connecting'), 2000);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 p-3 rounded-full text-white shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
                        title={lang === 'en' ? 'Call Hospital' : 'ఆసుపత్రికి కాల్ చేయండి'}
                      >
                        <Phone size={18} />
                      </button>
                    )}
                    {appt.status !== 'IN_PROGRESS' && appt.status !== 'COMPLETED' && (
                      <button
                        onClick={() => triggerCancel(appt._id)}
                        disabled={cancellingId === appt._id}
                        className="bg-red-50 hover:bg-red-100 p-3 rounded-full text-red-500 border border-red-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        title={t.cancelAppt}
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== ACTIVE REMINDERS ========== */}
        {reminders && reminders.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Bell size={18} className="text-orange-500" />
              <h3 className="font-bold text-slate-900">{t.reminders}</h3>
              <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">{reminders.length}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {reminders.map((reminder) => {
                // Try live data for this reminder's appointment, then fall back to the active appointment's live data
                const live = (reminder.apptId ? liveQueueData[reminder.apptId] : null) || activeQueueInfo;
                
                // Double-check: If the appointment associated with this reminder is completed, hide it immediately
                if (live && (live.status === 'COMPLETED' || live.type === 'CONSULTATION_ENDED')) return null;

                const ahead = live ? live.patientsAhead : reminder.queuePosition;

                return (
                  <div key={reminder.id} className="p-5 flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-full mt-0.5">
                      <Navigation2 size={16} className="text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900">
                        {lang === 'en' ? 'Your Turn Approaching!' : 'మీ వంతు సమీపిస్తోంది!'}
                      </h4>
                      {(() => {
                        const pName = reminder.patientName || live?.patientName || (reminder.apptId && appointments.find(a => a._id === reminder.apptId)?.patientName);
                        return pName ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <User size={12} className="text-indigo-500" />
                            <span className="text-xs font-bold text-indigo-600">{pName}</span>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(live?.queueNumber || reminder.queueNumber) && (
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                            Queue #{live?.queueNumber || reminder.queueNumber}
                          </span>
                        )}
                        {reminder.distance && (
                          <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                            📍 {reminder.distance}
                          </span>
                        )}
                        {(live?.estimatedWaitTime !== undefined ? true : reminder.travelTime) && (
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                            🚗 {live?.estimatedWaitTime !== undefined ? `${live.estimatedWaitTime} mins wait` : `${reminder.travelTime} mins`}
                          </span>
                        )}
                      </div>
                      {ahead !== undefined && (
                        <div className="mt-2 text-xs font-bold text-slate-600">
                          ⏳ {ahead} patients ahead {live && <span className="text-emerald-600">(live)</span>}
                        </div>
                      )}
                      {live?.message && (
                        <div className="mt-1 text-xs font-bold text-blue-600">{live.message}</div>
                      )}
                    </div>
                    {/* Call Hospital from reminder */}
                    {(() => {
                      const rAppt = reminder.apptId ? appointments.find(a => String(a._id) === String(reminder.apptId)) : null;
                      const hId = reminder.hospitalId || rAppt?.hospitalId;
                      const hName = reminder.hospitalName || rAppt?.hospitalName || 'Hospital';
                      return hId ? (
                        <button
                          onClick={() => {
                            if (!socket) { toast.error('Not connected. Please refresh.'); return; }
                            setCallHospitalData({ id: hId, name: hName });
                            setShowAudioCall(true);
                            toast.loading('Connecting call...', { id: 'call-connecting' });
                            setTimeout(() => toast.dismiss('call-connecting'), 2000);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 p-2.5 rounded-full text-white shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 shrink-0"
                          title={lang === 'en' ? 'Call Hospital' : 'ఆసుపత్రికి కాల్ చేయండి'}
                        >
                          <Phone size={16} />
                        </button>
                      ) : null;
                    })()}
                    <button
                      onClick={() => setReminders(prev => prev.filter(r => r.id !== reminder.id))}
                      className="text-slate-300 hover:text-slate-500 text-sm font-bold shrink-0"
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center py-4">
          <p className="text-[10px] text-slate-400 font-bold">
            {lang === 'en' 
              ? 'Queue position updates in real-time via live connection' 
              : 'క్యూ స్థానం లైవ్ కనెక్షన్ ద్వారా నిజ-సమయంలో నవీకరించబడుతుంది'}
          </p>
        </div>
      </div>

      {/* AUDIO CALL TO HOSPITAL */}
      {showAudioCall && callHospitalData && socket && (
        <AudioCall
          recipientId={`hospital_${callHospitalData.id}`}
          recipientName={callHospitalData.name}
          isIncoming={false}
          socket={socket}
          onClose={() => {
            setShowAudioCall(false);
            setCallHospitalData(null);
          }}
        />
      )}
    </div>
  );
};

export default QueueDashboard;
