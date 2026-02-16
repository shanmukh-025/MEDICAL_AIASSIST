import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Activity, Heart, Pill, Clock, TrendingUp, TrendingDown, 
  Minus, AlertTriangle, CheckCircle, Calendar, ChevronRight, 
  Thermometer, Star, Send, Bell, RefreshCw, Loader2, Stethoscope,
  Smile, Frown, Meh, ChevronDown, ChevronUp, Hospital, BellRing,
  Sun, Sunset, Moon, Coffee, Check
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const PatientRecoveryTracker = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingCheckins, setPendingCheckins] = useState([]);
  const [view, setView] = useState('plans'); // plans, detail, log
  const [medicineSchedule, setMedicineSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [markingTaken, setMarkingTaken] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushRequesting, setPushRequesting] = useState(false);
  const token = localStorage.getItem('token');

  // Log form state
  const [logForm, setLogForm] = useState({
    symptoms: [],
    overallFeeling: 'same',
    overallSeverity: 5,
    medicinesTaken: [],
    sideEffects: [],
    newSymptoms: [],
    patientNotes: '',
    newSideEffect: '',
    newSymptom: ''
  });

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/patient-monitoring/my-plans`, {
        headers: { 'x-auth-token': token }
      });
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      toast.error('Failed to load treatment plans');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPendingCheckins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/patient-monitoring/pending-checkins`, {
        headers: { 'x-auth-token': token }
      });
      setPendingCheckins(res.data);
    } catch (err) {
      console.error('Failed to fetch pending checkins:', err);
    }
  }, [token]);

  const fetchPlanDetail = useCallback(async (planId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/patient-monitoring/plan/${planId}`, {
        headers: { 'x-auth-token': token }
      });
      setPlanDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch plan detail:', err);
      toast.error('Failed to load plan details');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch today's medicine schedule
  const fetchMedicineSchedule = useCallback(async (autoSync = true) => {
    try {
      setScheduleLoading(true);
      const res = await axios.get(`${API_URL}/api/patient-monitoring/my-medicine-schedule`, {
        headers: { 'x-auth-token': token }
      });
      
      // If empty and we have active plans, try syncing reminders first
      if (res.data.length === 0 && autoSync && plans.length > 0) {
        try {
          const syncRes = await axios.post(`${API_URL}/api/patient-monitoring/sync-reminders`, {}, {
            headers: { 'x-auth-token': token }
          });
          if (syncRes.data.created > 0) {
            // Re-fetch after sync
            const res2 = await axios.get(`${API_URL}/api/patient-monitoring/my-medicine-schedule`, {
              headers: { 'x-auth-token': token }
            });
            setMedicineSchedule(res2.data);
            return;
          }
        } catch (syncErr) {
          console.error('Auto-sync reminders failed:', syncErr);
        }
      }
      
      setMedicineSchedule(res.data);
    } catch (err) {
      console.error('Failed to fetch medicine schedule:', err);
    } finally {
      setScheduleLoading(false);
    }
  }, [token, plans]);

  // Mark medicine as taken
  const markMedicineTaken = async (reminderId, timing) => {
    try {
      setMarkingTaken(reminderId + timing);
      await axios.post(`${API_URL}/api/patient-monitoring/medicine-taken/${reminderId}`, 
        { timing },
        { headers: { 'x-auth-token': token } }
      );
      toast.success('Medicine marked as taken! 💊');
      fetchMedicineSchedule();
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setMarkingTaken(null);
    }
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    try {
      setPushRequesting(true);
      
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        toast.error('Your browser does not support notifications');
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied. Please enable it in browser settings.');
        return;
      }

      // Check for service worker support
      if (!('serviceWorker' in navigator)) {
        toast.error('Service workers not supported');
        return;
      }

      // Register our custom push service worker (separate from the PWA one)
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        // Wait for it to be active
        if (registration.installing) {
          await new Promise((resolve) => {
            registration.installing.addEventListener('statechange', (e) => {
              if (e.target.state === 'activated') resolve();
            });
          });
        } else if (registration.waiting) {
          await new Promise((resolve) => {
            registration.waiting.addEventListener('statechange', (e) => {
              if (e.target.state === 'activated') resolve();
            });
          });
        }
      } catch (regErr) {
        console.error('SW registration failed:', regErr);
        // Fall back to any existing service worker
        registration = await navigator.serviceWorker.ready;
      }
      
      // Get VAPID public key from server or env
      const vapidRes = await axios.get(`${API_URL}/api/patient-monitoring/vapid-public-key`, {
        headers: { 'x-auth-token': token }
      }).catch(() => null);
      
      const vapidPublicKey = vapidRes?.data?.publicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        // Even without VAPID, we can still show in-app reminders
        toast.success('In-app medicine reminders enabled!');
        setPushEnabled(true);
        return;
      }

      // Convert VAPID key
      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Check for existing subscription first
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      // Send subscription to server
      await axios.post(`${API_URL}/api/patient-monitoring/subscribe-push`,
        { subscription: subscription.toJSON() },
        { headers: { 'x-auth-token': token } }
      );

      setPushEnabled(true);
      toast.success('Push notifications enabled! You\'ll be reminded to take your medicines.');
    } catch (err) {
      console.error('Push subscription error:', err);
      toast.error('Could not enable push notifications');
    } finally {
      setPushRequesting(false);
    }
  };

  // Check if push is already enabled and auto-subscribe if permission already granted
  useEffect(() => {
    const checkAndAutoSubscribe = async () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        setPushEnabled(true);
        // Auto re-subscribe to ensure server has latest subscription
        if ('serviceWorker' in navigator && token && medicineSchedule.length > 0) {
          try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) {
              await axios.post(`${API_URL}/api/patient-monitoring/subscribe-push`,
                { subscription: existingSub.toJSON() },
                { headers: { 'x-auth-token': token } }
              ).catch(() => {});
            }
          } catch (e) {
            // Silent fail
          }
        }
      }
    };
    checkAndAutoSubscribe();
  }, [token, medicineSchedule]);

  useEffect(() => {
    fetchPlans();
    fetchPendingCheckins();
  }, [fetchPlans, fetchPendingCheckins]);

  // Fetch medicine schedule AFTER plans are loaded
  useEffect(() => {
    if (plans.length > 0) {
      fetchMedicineSchedule();
    }
  }, [plans, fetchMedicineSchedule]);

  const selectPlan = (plan) => {
    setSelectedPlan(plan);
    fetchPlanDetail(plan._id);
    setView('detail');
  };

  const startLog = (plan) => {
    setSelectedPlan(plan);
    // Initialize log form with plan's symptoms
    const symptoms = (plan.symptomsToMonitor || []).map(s => ({
      name: s,
      severity: 5,
      notes: ''
    }));
    const medicinesTaken = (plan.medicines || []).map(m => ({
      medicineName: m.name,
      taken: false,
      timeTaken: '',
      skippedReason: ''
    }));
    setLogForm(prev => ({
      ...prev,
      symptoms,
      medicinesTaken,
      overallFeeling: 'same',
      overallSeverity: 5,
      sideEffects: [],
      newSymptoms: [],
      patientNotes: '',
      newSideEffect: '',
      newSymptom: ''
    }));
    setView('log');
  };

  const submitLog = async () => {
    if (!selectedPlan) return;
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API_URL}/api/patient-monitoring/plan/${selectedPlan._id}/log`,
        {
          symptoms: logForm.symptoms,
          overallFeeling: logForm.overallFeeling,
          overallSeverity: logForm.overallSeverity,
          medicinesTaken: logForm.medicinesTaken,
          sideEffects: logForm.sideEffects,
          newSymptoms: logForm.newSymptoms,
          patientNotes: logForm.patientNotes
        },
        { headers: { 'x-auth-token': token } }
      );

      const { trend, needsDoctorAttention } = res.data;
      
      if (needsDoctorAttention) {
        toast('Your doctor has been alerted about your symptoms. They will review your condition.', {
          icon: '🏥',
          duration: 6000
        });
      } else if (trend === 'improving') {
        toast.success('Great news! Your symptoms are improving! Keep it up! 💪', { duration: 4000 });
      } else {
        toast.success('Recovery log submitted successfully!', { duration: 3000 });
      }

      setView('plans');
      fetchPlans();
      fetchPendingCheckins();
    } catch (err) {
      const msg = err.response?.data?.msg || 'Failed to submit recovery log';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (severity <= 3) return 'text-green-600 bg-green-50';
    if (severity <= 5) return 'text-yellow-600 bg-yellow-50';
    if (severity <= 7) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityLabel = (severity) => {
    if (severity <= 2) return 'Very Mild';
    if (severity <= 4) return 'Mild';
    if (severity <= 6) return 'Moderate';
    if (severity <= 8) return 'Severe';
    return 'Very Severe';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="text-green-500" size={18} />;
      case 'worsening': return <TrendingUp className="text-red-500" size={18} />;
      case 'critical': return <AlertTriangle className="text-red-600" size={18} />;
      default: return <Minus className="text-yellow-500" size={18} />;
    }
  };

  const getFeelingEmoji = (feeling) => {
    switch (feeling) {
      case 'much_better': return { icon: <Smile className="text-green-500" size={24} />, label: 'Much Better', color: 'bg-green-100 border-green-300' };
      case 'better': return { icon: <Smile className="text-emerald-500" size={24} />, label: 'Better', color: 'bg-emerald-50 border-emerald-300' };
      case 'same': return { icon: <Meh className="text-yellow-500" size={24} />, label: 'Same', color: 'bg-yellow-50 border-yellow-300' };
      case 'worse': return { icon: <Frown className="text-orange-500" size={24} />, label: 'Worse', color: 'bg-orange-50 border-orange-300' };
      case 'much_worse': return { icon: <Frown className="text-red-500" size={24} />, label: 'Much Worse', color: 'bg-red-100 border-red-300' };
      default: return { icon: <Meh className="text-gray-500" size={24} />, label: 'Unknown', color: 'bg-gray-50 border-gray-300' };
    }
  };

  // ============ MEDICINE SCHEDULE SECTION ============
  const getTimeIcon = (time) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 5 && hour < 12) return <Sun size={14} className="text-amber-500" />;
    if (hour >= 12 && hour < 17) return <Coffee size={14} className="text-orange-500" />;
    if (hour >= 17 && hour < 21) return <Sunset size={14} className="text-purple-500" />;
    return <Moon size={14} className="text-indigo-500" />;
  };

  const getTimeLabel = (time) => {
    const [hr, min] = time.split(':');
    const hour = parseInt(hr);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${min} ${ampm}`;
  };

  const getTimingStatus = (time) => {
    const now = new Date();
    const [hr, min] = time.split(':');
    const scheduleTime = new Date();
    scheduleTime.setHours(parseInt(hr), parseInt(min), 0, 0);
    const diffMin = (scheduleTime - now) / (1000 * 60);
    
    if (diffMin > 30) return 'upcoming';       // more than 30 min away
    if (diffMin > -15) return 'due';            // within window (-15 to +30 min)
    return 'past';                               // past due
  };

  const renderMedicineSchedule = () => {
    if (scheduleLoading) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center mb-4">
          <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm mt-2">Loading medicine schedule...</p>
        </div>
      );
    }

    if (medicineSchedule.length === 0) {
      // Show empty state with sync button if plans exist
      if (plans.length > 0) {
        return (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Pill size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-800">Today's Medicines</h3>
                <p className="text-xs text-indigo-600">No medicine schedule found</p>
              </div>
            </div>
            <p className="text-sm text-indigo-700 mb-3">
              Medicine reminders haven't been set up yet. Tap below to sync your prescribed medicines.
            </p>
            <button
              onClick={async () => {
                try {
                  setScheduleLoading(true);
                  const syncRes = await axios.post(`${API_URL}/api/patient-monitoring/sync-reminders`, {}, {
                    headers: { 'x-auth-token': token }
                  });
                  if (syncRes.data.created > 0) {
                    toast.success(`${syncRes.data.created} medicine reminder(s) created!`);
                    fetchMedicineSchedule(false);
                  } else {
                    toast('No new reminders to create. Your doctor may not have added medicines to the plan yet.', { icon: 'ℹ️' });
                    setScheduleLoading(false);
                  }
                } catch (err) {
                  toast.error('Failed to sync reminders');
                  setScheduleLoading(false);
                }
              }}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Sync Medicine Reminders
            </button>
          </div>
        );
      }
      return null;
    }

    const totalDoses = medicineSchedule.length;
    const takenDoses = medicineSchedule.filter(m => m.taken).length;
    const allTaken = totalDoses === takenDoses;

    return (
      <div className={`rounded-2xl border-2 p-4 mb-4 ${
        allTaken 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              allTaken ? 'bg-green-500' : 'bg-indigo-600'
            }`}>
              <Pill size={20} className="text-white" />
            </div>
            <div>
              <h3 className={`font-bold ${allTaken ? 'text-green-800' : 'text-indigo-800'}`}>
                Today's Medicines
              </h3>
              <p className={`text-xs ${allTaken ? 'text-green-600' : 'text-indigo-600'}`}>
                {takenDoses}/{totalDoses} doses taken
              </p>
            </div>
          </div>
          
          {/* Push Notification Toggle */}
          {!pushEnabled ? (
            <button
              onClick={subscribeToPush}
              disabled={pushRequesting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition shadow-sm"
            >
              {pushRequesting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <BellRing size={12} />
              )}
              Enable Reminders
            </button>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 rounded-xl text-green-700 text-xs font-semibold">
              <Bell size={12} />
              Reminders On
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/60 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${allTaken ? 'bg-green-500' : 'bg-indigo-500'}`}
            style={{ width: `${(takenDoses / totalDoses) * 100}%` }}
          />
        </div>

        {/* Medicine List */}
        <div className="space-y-2">
          {medicineSchedule.map((med, idx) => {
            const timingStatus = med.taken ? 'taken' : getTimingStatus(med.scheduledTime);
            const isMarking = markingTaken === med.reminderId + med.scheduledTime;
            
            return (
              <div
                key={`${med.reminderId}-${med.scheduledTime}-${idx}`}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  med.taken 
                    ? 'bg-green-50 border-green-200' 
                    : timingStatus === 'due'
                    ? 'bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-200' 
                    : timingStatus === 'past'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Time */}
                <div className="flex flex-col items-center min-w-[52px]">
                  {getTimeIcon(med.scheduledTime)}
                  <span className={`text-xs font-bold mt-0.5 ${
                    med.taken ? 'text-green-600' :
                    timingStatus === 'due' ? 'text-amber-700' :
                    timingStatus === 'past' ? 'text-red-600' :
                    'text-slate-600'
                  }`}>
                    {getTimeLabel(med.scheduledTime)}
                  </span>
                </div>

                {/* Medicine Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${
                    med.taken ? 'text-green-700 line-through' : 'text-slate-800'
                  }`}>
                    {med.medicineName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {med.dosage}
                    {med.instructions?.beforeFood && ' • Before food'}
                    {med.instructions?.afterFood && ' • After food'}
                    {med.instructions?.withWater && ' • With water'}
                  </p>
                </div>

                {/* Action */}
                {med.taken ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 rounded-lg">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-xs font-bold text-green-700">Taken</span>
                  </div>
                ) : (
                  <button
                    onClick={() => markMedicineTaken(med.reminderId, med.scheduledTime)}
                    disabled={isMarking}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      timingStatus === 'due'
                        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm animate-pulse'
                        : timingStatus === 'past'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-indigo-500 text-white hover:bg-indigo-600'
                    }`}
                  >
                    {isMarking ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Take
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {allTaken && (
          <div className="mt-3 text-center">
            <p className="text-green-700 text-sm font-semibold">🎉 All medicines taken for today! Great job!</p>
          </div>
        )}
      </div>
    );
  };

  // ============ PLAN LIST VIEW ============
  const renderPlansList = () => (
    <div className="space-y-4">
      {/* Pending Checkins Banner */}
      {pendingCheckins.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="text-amber-600" size={20} />
            <h3 className="font-bold text-amber-800">Today's Check-ins Pending</h3>
          </div>
          <p className="text-amber-700 text-sm mb-3">You have {pendingCheckins.length} treatment plan(s) that need today's recovery log.</p>
          <div className="space-y-2">
            {pendingCheckins.map(plan => (
              <button
                key={plan._id}
                onClick={() => startLog(plan)}
                className="w-full flex items-center justify-between bg-white rounded-xl p-3 border border-amber-200 hover:border-amber-400 transition"
              >
                <div className="flex items-center gap-3">
                  <Stethoscope className="text-amber-600" size={18} />
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 text-sm">{plan.diagnosis}</p>
                    <p className="text-xs text-slate-500">Day {plan.dayNumber} • Log your symptoms</p>
                  </div>
                </div>
                <ChevronRight className="text-amber-500" size={18} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Medicine Schedule */}
      {renderMedicineSchedule()}

      {/* Active Plans */}
      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
        <Activity size={20} className="text-indigo-600" />
        Active Treatment Plans
      </h3>

      {plans.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <Stethoscope className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="font-bold text-slate-600 mb-1">No Active Treatment Plans</h3>
          <p className="text-slate-400 text-sm">When your doctor creates a recovery plan after your appointment, it will appear here.</p>
        </div>
      ) : (
        plans.map(plan => (
          <div key={plan._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Plan Header */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    plan.status === 'ACTIVE' ? 'bg-green-500' :
                    plan.status === 'FOLLOW_UP_NEEDED' ? 'bg-amber-500' :
                    'bg-slate-400'
                  }`} />
                  <h4 className="font-bold text-slate-800">{plan.diagnosis}</h4>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  plan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                  plan.status === 'FOLLOW_UP_NEEDED' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {plan.status === 'FOLLOW_UP_NEEDED' ? 'Follow-up Needed' : plan.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Hospital size={12} /> {plan.hospitalId?.name || 'Hospital'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {new Date(plan.startDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Pill size={12} /> {plan.medicines?.length || 0} medicines
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 pt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Day {Math.min(plan.currentDay, plan.totalDays)}/{plan.totalDays}</span>
                <span>{plan.completionPercentage}% complete</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    plan.completionPercentage >= 100 ? 'bg-green-500' :
                    plan.completionPercentage >= 60 ? 'bg-blue-500' :
                    'bg-indigo-500'
                  }`}
                  style={{ width: `${plan.completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Stats Row */}
            <div className="px-4 py-3 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-xs text-slate-500">Days Left</p>
                <p className="font-bold text-slate-800">{plan.daysRemaining}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Logs</p>
                <p className="font-bold text-slate-800">{plan.logsSubmitted}/{plan.totalDays}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Adherence</p>
                <p className={`font-bold ${plan.avgAdherence >= 80 ? 'text-green-600' : plan.avgAdherence >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {plan.avgAdherence}%
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={() => selectPlan(plan)}
                className="flex-1 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2"
              >
                <Activity size={16} /> View Recovery
              </button>
              {!plan.todayLogSubmitted && plan.status === 'ACTIVE' && !plan.treatmentEnded && (
                <button
                  onClick={() => startLog(plan)}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Log Today
                </button>
              )}
              {plan.todayLogSubmitted && plan.status === 'ACTIVE' && (
                <div className="flex-1 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Logged Today
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ============ PLAN DETAIL VIEW ============
  const renderPlanDetail = () => {
    if (!planDetail || !selectedPlan) return null;
    const { plan, recoveryLogs, severityTimeline, totalDays, currentDay, daysRemaining, treatmentEnded } = planDetail;

    return (
      <div className="space-y-4">
        <button onClick={() => setView('plans')} className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
          <ArrowLeft size={16} /> Back to Plans
        </button>

        {/* Plan Summary Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
          <h3 className="text-xl font-bold mb-1">{plan.diagnosis}</h3>
          <p className="text-indigo-200 text-sm mb-3">Dr. {plan.doctorName} • {plan.hospitalId?.name}</p>
          
          <div className="grid grid-cols-4 gap-3 mt-3">
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <p className="text-xs text-indigo-200">Day</p>
              <p className="text-lg font-bold">{Math.min(currentDay, totalDays)}/{totalDays}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <p className="text-xs text-indigo-200">Left</p>
              <p className="text-lg font-bold">{daysRemaining}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <p className="text-xs text-indigo-200">Logs</p>
              <p className="text-lg font-bold">{recoveryLogs.length}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <p className="text-xs text-indigo-200">Status</p>
              <p className="text-sm font-bold">{treatmentEnded ? '✅ Done' : '🔄 Active'}</p>
            </div>
          </div>
        </div>

        {/* Medicines List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Pill size={18} className="text-indigo-600" /> Prescribed Medicines
          </h4>
          <div className="space-y-2">
            {plan.medicines?.map((med, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{med.name}</p>
                  <p className="text-xs text-slate-500">
                    {med.dosage} • {med.frequency === 'once' ? 'Once daily' : med.frequency === 'twice' ? 'Twice daily' : med.frequency === 'thrice' ? 'Thrice daily' : 'Four times daily'}
                    {med.instructions?.beforeFood ? ' • Before food' : med.instructions?.afterFood ? ' • After food' : ''}
                  </p>
                </div>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                  {med.duration} days
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        {plan.specialInstructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h4 className="font-bold text-amber-800 mb-1 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" /> Doctor's Instructions
            </h4>
            <p className="text-amber-700 text-sm">{plan.specialInstructions}</p>
          </div>
        )}

        {/* Follow-up Info */}
        {plan.followUpRequired && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" /> Follow-up Visit
            </h4>
            <p className="text-blue-700 text-sm">
              {plan.followUpDate 
                ? `Scheduled around ${new Date(plan.followUpDate).toLocaleDateString()}`
                : 'Follow-up recommended after treatment completion'}
            </p>
            {plan.followUpNotes && <p className="text-blue-600 text-xs mt-1">{plan.followUpNotes}</p>}
            {(plan.status === 'FOLLOW_UP_NEEDED' || treatmentEnded) && (
              <button
                onClick={() => navigate('/appointments')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
              >
                Book Follow-up Appointment
              </button>
            )}
          </div>
        )}

        {/* Severity Timeline */}
        {severityTimeline.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" /> Severity Timeline
            </h4>
            <div className="relative">
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-32">
                {severityTimeline.map((point, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{point.severity}</span>
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        point.severity <= 3 ? 'bg-green-400' :
                        point.severity <= 5 ? 'bg-yellow-400' :
                        point.severity <= 7 ? 'bg-orange-400' :
                        'bg-red-400'
                      }`}
                      style={{ height: `${(point.severity / 10) * 100}%` }}
                    />
                    <span className="text-[10px] text-slate-400">D{point.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>Better</span>
                <span>Worse →</span>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Logs History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" /> Recovery Log History
          </h4>
          {recoveryLogs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No recovery logs yet. Start logging daily!</p>
          ) : (
            <div className="space-y-2">
              {[...recoveryLogs].reverse().map((log, i) => {
                const feeling = getFeelingEmoji(log.overallFeeling);
                return (
                  <LogEntryCard key={log._id || i} log={log} feeling={feeling} getSeverityColor={getSeverityColor} getTrendIcon={getTrendIcon} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ LOG FORM VIEW ============
  const renderLogForm = () => {
    if (!selectedPlan) return null;

    return (
      <div className="space-y-4">
        <button onClick={() => setView('plans')} className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
          <ArrowLeft size={16} /> Cancel
        </button>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white">
          <h3 className="text-lg font-bold">Daily Recovery Check-in</h3>
          <p className="text-indigo-200 text-sm">{selectedPlan.diagnosis} • Day {selectedPlan.currentDay || '?'}</p>
        </div>

        {/* Overall Feeling */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-3">How are you feeling today?</h4>
          <div className="grid grid-cols-5 gap-2">
            {[
              { value: 'much_worse', label: 'Much Worse', emoji: '😣' },
              { value: 'worse', label: 'Worse', emoji: '😟' },
              { value: 'same', label: 'Same', emoji: '😐' },
              { value: 'better', label: 'Better', emoji: '🙂' },
              { value: 'much_better', label: 'M. Better', emoji: '😊' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setLogForm(f => ({ ...f, overallFeeling: opt.value }))}
                className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition text-center ${
                  logForm.overallFeeling === opt.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-[10px] font-semibold text-slate-600 mt-1">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overall Severity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2">Overall Symptom Severity</h4>
          <p className="text-xs text-slate-500 mb-3">1 = No symptoms, 10 = Severe pain/discomfort</p>
          <div className="flex items-center gap-3">
            <span className="text-green-500 text-sm font-bold">1</span>
            <input
              type="range"
              min="1" max="10"
              value={logForm.overallSeverity}
              onChange={e => setLogForm(f => ({ ...f, overallSeverity: parseInt(e.target.value) }))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-red-500 text-sm font-bold">10</span>
          </div>
          <div className="text-center mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getSeverityColor(logForm.overallSeverity)}`}>
              {logForm.overallSeverity} - {getSeverityLabel(logForm.overallSeverity)}
            </span>
          </div>
        </div>

        {/* Symptom-wise Tracking */}
        {logForm.symptoms.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Thermometer size={16} className="text-indigo-600" /> Track Each Symptom
            </h4>
            <div className="space-y-3">
              {logForm.symptoms.map((symptom, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-700 text-sm capitalize">{symptom.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getSeverityColor(symptom.severity)}`}>
                      {symptom.severity}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1" max="10"
                    value={symptom.severity}
                    onChange={e => {
                      const newSymptoms = [...logForm.symptoms];
                      newSymptoms[i].severity = parseInt(e.target.value);
                      setLogForm(f => ({ ...f, symptoms: newSymptoms }));
                    }}
                    className="w-full accent-indigo-600"
                  />
                  <input
                    type="text"
                    placeholder="Any notes about this symptom..."
                    value={symptom.notes}
                    onChange={e => {
                      const newSymptoms = [...logForm.symptoms];
                      newSymptoms[i].notes = e.target.value;
                      setLogForm(f => ({ ...f, symptoms: newSymptoms }));
                    }}
                    className="w-full mt-2 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medicine Adherence */}
        {logForm.medicinesTaken.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Pill size={16} className="text-indigo-600" /> Did you take your medicines today?
            </h4>
            <div className="space-y-2">
              {logForm.medicinesTaken.map((med, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <span className="font-semibold text-slate-700 text-sm">{med.medicineName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newMeds = [...logForm.medicinesTaken];
                        newMeds[i].taken = true;
                        setLogForm(f => ({ ...f, medicinesTaken: newMeds }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        med.taken ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-green-100'
                      }`}
                    >
                      ✓ Taken
                    </button>
                    <button
                      onClick={() => {
                        const newMeds = [...logForm.medicinesTaken];
                        newMeds[i].taken = false;
                        const reason = prompt('Why did you skip? (optional)');
                        newMeds[i].skippedReason = reason || '';
                        setLogForm(f => ({ ...f, medicinesTaken: newMeds }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        !med.taken ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-red-100'
                      }`}
                    >
                      ✗ Skipped
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side Effects */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" /> Any Side Effects?
          </h4>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="e.g., nausea, dizziness..."
              value={logForm.newSideEffect}
              onChange={e => setLogForm(f => ({ ...f, newSideEffect: e.target.value }))}
              className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
              onKeyDown={e => {
                if (e.key === 'Enter' && logForm.newSideEffect.trim()) {
                  setLogForm(f => ({
                    ...f,
                    sideEffects: [...f.sideEffects, f.newSideEffect.trim()],
                    newSideEffect: ''
                  }));
                }
              }}
            />
            <button
              onClick={() => {
                if (logForm.newSideEffect.trim()) {
                  setLogForm(f => ({
                    ...f,
                    sideEffects: [...f.sideEffects, f.newSideEffect.trim()],
                    newSideEffect: ''
                  }));
                }
              }}
              className="px-3 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-200 transition"
            >
              Add
            </button>
          </div>
          {logForm.sideEffects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {logForm.sideEffects.map((se, i) => (
                <span key={i} className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  {se}
                  <button onClick={() => setLogForm(f => ({ ...f, sideEffects: f.sideEffects.filter((_, j) => j !== i) }))} className="hover:text-amber-900">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* New Symptoms */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Thermometer size={16} className="text-red-500" /> Any New Symptoms?
          </h4>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="e.g., rash, swelling..."
              value={logForm.newSymptom}
              onChange={e => setLogForm(f => ({ ...f, newSymptom: e.target.value }))}
              className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
              onKeyDown={e => {
                if (e.key === 'Enter' && logForm.newSymptom.trim()) {
                  setLogForm(f => ({
                    ...f,
                    newSymptoms: [...f.newSymptoms, f.newSymptom.trim()],
                    newSymptom: ''
                  }));
                }
              }}
            />
            <button
              onClick={() => {
                if (logForm.newSymptom.trim()) {
                  setLogForm(f => ({
                    ...f,
                    newSymptoms: [...f.newSymptoms, f.newSymptom.trim()],
                    newSymptom: ''
                  }));
                }
              }}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold hover:bg-red-200 transition"
            >
              Add
            </button>
          </div>
          {logForm.newSymptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {logForm.newSymptoms.map((ns, i) => (
                <span key={i} className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  {ns}
                  <button onClick={() => setLogForm(f => ({ ...f, newSymptoms: f.newSymptoms.filter((_, j) => j !== i) }))} className="hover:text-red-900">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2">Additional Notes</h4>
          <textarea
            placeholder="Anything else you want to tell your doctor..."
            value={logForm.patientNotes}
            onChange={e => setLogForm(f => ({ ...f, patientNotes: e.target.value }))}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 resize-none h-20"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={submitLog}
          disabled={submitting}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-base hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send size={20} /> Submit Recovery Log
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Recovery Tracker</h1>
            <p className="text-sm text-slate-500">Track your daily health & recovery</p>
          </div>
          <button onClick={() => { fetchPlans(); fetchPendingCheckins(); }} className="ml-auto p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <RefreshCw size={18} className="text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {view === 'plans' && renderPlansList()}
            {view === 'detail' && renderPlanDetail()}
            {view === 'log' && renderLogForm()}
          </>
        )}
      </div>
    </div>
  );
};

// Log Entry Card (collapsible)
const LogEntryCard = ({ log, feeling, getSeverityColor, getTrendIcon }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
            D{log.dayNumber}
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
              {feeling.icon}
              <span>{feeling.label}</span>
              {getTrendIcon(log.trend)}
            </p>
            <p className="text-xs text-slate-400">{new Date(log.date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getSeverityColor(log.overallSeverity)}`}>
            {log.overallSeverity}/10
          </span>
          {log.needsDoctorAttention && (
            <AlertTriangle size={14} className="text-red-500" />
          )}
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100">
          {/* Adherence */}
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500">Medicine Adherence</span>
            <span className={`font-bold ${log.medicineAdherence >= 80 ? 'text-green-600' : log.medicineAdherence >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {log.medicineAdherence}%
            </span>
          </div>
          
          {/* Symptoms */}
          {log.symptoms?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Symptoms</p>
              <div className="flex flex-wrap gap-1">
                {log.symptoms.map((s, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(s.severity)}`}>
                    {s.name}: {s.severity}/10
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Side effects */}
          {log.sideEffects?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-600 mb-1">Side Effects</p>
              <div className="flex flex-wrap gap-1">
                {log.sideEffects.map((se, i) => (
                  <span key={i} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{se}</span>
                ))}
              </div>
            </div>
          )}

          {/* Patient notes */}
          {log.patientNotes && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-600">{log.patientNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientRecoveryTracker;
