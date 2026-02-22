import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Clock, User, FileText, Send, Loader2, WifiOff, AlertTriangle, Users, MapPin, Bell, ShieldAlert, Zap, Phone, Video } from 'lucide-react';
import api from '../utils/apiWrapper';
import QueueStatus from '../components/QueueStatus';
import DoctorBreakBanner from '../components/DoctorBreakBanner';
import CallHospital from '../components/CallHospital';
import { useSocket } from '../context/SocketContext';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const PatientAppointments = () => {
  const navigate = useNavigate();
  const locationState = useLocation();
  const { socket, emergencyAlert, doctorBreak, doctorDelay } = useSocket();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ hospitalName: '', doctor: '', appointmentDate: '', appointmentTime: '', reason: '', type: 'REGULAR' });
  const [isFromCache, setIsFromCache] = useState(false);
  const [peakHourWarning, setPeakHourWarning] = useState(null);
  const [location, setLocation] = useState(null);
  const [bookedToken, setBookedToken] = useState(null);
  const [liveQueueData, setLiveQueueData] = useState({});
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [pendingSubmitEvent, setPendingSubmitEvent] = useState(null);
  const [emergencySeconds, setEmergencySeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [callModalData, setCallModalData] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchList();
    getUserLocation();

    // Handle Book Again prefill from navigation state
    if (locationState.state?.prefill) {
      const p = locationState.state.prefill;
      setForm({
        hospitalName: p.hospitalName || '',
        doctor: p.doctor || 'DR001',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '',
        reason: p.reason || '',
        type: p.type || 'REGULAR'
      });
      toast.success('Form pre-filled for re-booking');
    }
  }, []);

  // Emergency countdown timer
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

  // Doctor break countdown timer
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

  // Doctor delay countdown timer
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

  // Check if user's selected appointment time falls within emergency period
  const isAppointmentDuringEmergency = () => {
    if (!emergencyAlert || !form.appointmentDate || !form.appointmentTime) return false;

    try {
      // Combine user's selected date and time
      const appointmentDateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
      const emergencyStart = new Date(emergencyAlert.alertStartTime);
      const emergencyEnd = new Date(emergencyAlert.alertEndTime);

      // Check if appointment falls within emergency period
      return appointmentDateTime >= emergencyStart && appointmentDateTime <= emergencyEnd;
    } catch (e) {
      console.error('Error checking emergency overlap:', e);
      return false;
    }
  };

  // Check if user's selected appointment time falls within doctor break period
  const isAppointmentDuringBreak = () => {
    if (!doctorBreak || !form.appointmentDate || !form.appointmentTime) return false;

    try {
      const appointmentDateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
      const breakStart = new Date(doctorBreak.breakStartTime);
      const breakEnd = new Date(doctorBreak.breakEndTime);

      return appointmentDateTime >= breakStart && appointmentDateTime <= breakEnd;
    } catch (e) {
      console.error('Error checking break overlap:', e);
      return false;
    }
  };

  // Check if user's selected appointment time falls within delay period
  const isAppointmentDuringDelay = () => {
    if (!doctorDelay || !form.appointmentDate || !form.appointmentTime) return false;

    try {
      const appointmentDateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
      const delayStart = new Date(doctorDelay.delayStartTime);
      const delayEnd = new Date(doctorDelay.delayEndTime);

      return appointmentDateTime >= delayStart && appointmentDateTime <= delayEnd;
    } catch (e) {
      console.error('Error checking delay overlap:', e);
      return false;
    }
  };

  // Separate effect for auto-refreshing queue data
  useEffect(() => {
    if (appointments.length === 0) return;

    // Fetch immediately when appointments change
    fetchQueueDataForAppointments();

    // Auto-refresh queue data every 15 seconds
    const interval = setInterval(() => {
      fetchQueueDataForAppointments();
    }, 15000);

    return () => clearInterval(interval);
  }, [appointments]); // Depend on appointments array

  // Setup socket listeners when socket is available
  useEffect(() => {
    if (!socket) return;

    // Listen for reminder notifications
    const handleReminder = (data) => {
      console.log('🔔 Reminder received:', data);
      toast.success(
        data.message,
        { duration: 10000, position: 'top-center', icon: '🔔' }
      );
      fetchList();
    };

    // Listen for queue updates with detailed messages
    const handleQueueUpdate = (data) => {
      console.log('📊 Queue updated:', data);

      // Show specific notifications based on update type
      if (data.type === 'DOCTOR_BREAK') {
        toast(
          `☕ Doctor is taking a ${data.breakDurationMinutes}-minute break`,
          { duration: 8000, icon: '☕', position: 'top-center' }
        );
      } else if (data.type === 'EMERGENCY_INSERTED') {
        toast(
          `🚨 Emergency patient added - Your wait time may be updated`,
          { duration: 6000, icon: '🚨', position: 'top-center' }
        );
      } else if (data.type === 'DELAY_BROADCAST') {
        toast(
          `⏰ Delay: ${data.delayReason || 'Queue delayed'} (+${data.delayMinutes} mins)`,
          { duration: 8000, icon: '⏰', position: 'top-center' }
        );
      } else if (data.type === 'WALK_IN_ADDED') {
        console.log('👥 Walk-in patient added to queue');
      }

      // Trigger re-fetch of appointments which will trigger queue data fetch
      fetchList();
      // Also immediately refresh queue data for active appointments
      fetchQueueDataForAppointments();
    };

    socket.on('reminder', handleReminder);
    socket.on('queueUpdated', handleQueueUpdate);

    return () => {
      socket.off('reminder', handleReminder);
      socket.off('queueUpdated', handleQueueUpdate);
    };
  }, [socket]);

  const fetchQueueDataForAppointments = async () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(
      a => a.appointmentDate === today &&
        (a.status === 'CONFIRMED' || a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS') &&
        a.queueNumber
    );

    console.log('🔄 Fetching queue data for', todayAppointments.length, 'appointments');

    for (const appt of todayAppointments) {
      try {
        const res = await axios.get(
          `${API}/api/appointments/live-queue/${appt._id}`,
          { headers: { 'x-auth-token': token } }
        );
        console.log('✅ Queue data for', appt._id, ':', res.data);
        setLiveQueueData(prev => ({ ...prev, [appt._id]: res.data }));
      } catch (err) {
        console.error('Failed to fetch queue data for appointment:', appt._id, err);
      }
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const result = await api.getAppointments();
      setAppointments(result.data);
      setIsFromCache(result.fromCache);

      if (result.fromCache) {
        toast('📦 Viewing offline appointments', { icon: '📱', duration: 2000 });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointments');
    } finally { setLoading(false); }
  };

  const handleBookAgain = (appt) => {
    setForm({
      hospitalName: appt.hospitalName || '',
      doctor: appt.doctor || 'DR001',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '',
      reason: appt.reason || '',
      type: appt.type || 'REGULAR'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Form filled with previous details');
  };

  // Feature 11: Peak Hour Detection
  const checkPeakHour = async (dateTime) => {
    try {
      const response = await axios.get(
        `${API}/api/smart-queue/peak-hour/${form.doctor || 'DR001'}/${dateTime}`,
        { headers: { 'x-auth-token': token } }
      );

      if (response.data.isPeak) {
        setPeakHourWarning(response.data);
        return false; // Cannot book
      }
      setPeakHourWarning(null);
      return true; // Can book
    } catch (err) {
      console.error('Peak hour check failed:', err);
      return true; // Allow booking if check fails
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!navigator.onLine) {
      toast.error('Cannot book appointments offline. Please connect to internet.');
      return;
    }

    // Check if emergency is active and appointment time is during emergency period
    if (isAppointmentDuringEmergency() && !showEmergencyConfirm) {
      setPendingSubmitEvent(e);
      setShowEmergencyConfirm(true);
      return;
    }
    setShowEmergencyConfirm(false);

    try {
      // Feature 11: Check peak hour before booking
      const dateTimeString = `${form.appointmentDate}T${form.appointmentTime}`;
      const canBook = await checkPeakHour(dateTimeString);

      if (!canBook) {
        toast.error('🔥 Peak hour! Please choose suggested time slots.', { duration: 5000 });
        return;
      }

      // Feature 1: Smart Appointment Booking (with Mutex locking)
      const response = await axios.post(`${API}/api/smart-queue/book-smart`, {
        doctorId: form.doctor || 'DR001',
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        type: form.type,
        reason: form.reason
      }, {
        headers: { 'x-auth-token': token }
      });

      setBookedToken(response.data);

      // Show extra warning if appointment was during emergency period
      const serverEmergency = response.data.emergencyWarning;
      if (isAppointmentDuringEmergency() || serverEmergency) {
        const mins = emergencySeconds > 0 ? Math.ceil(emergencySeconds / 60) : null;
        toast(
          `⚠️ Emergency case is active${mins ? ` (~${mins} min remaining)` : ''}.\nYour wait time will be significantly longer than usual.`,
          { duration: 8000, icon: '🚨', style: { background: '#FEF2F2', border: '2px solid #EF4444', color: '#991B1B' } }
        );
      }

      // Show warning if appointment is during break
      if (isAppointmentDuringBreak()) {
        toast(
          `☕ Doctor has a ${doctorBreak.breakDurationMinutes}-min break during your appointment. Expect delays.`,
          { duration: 6000, icon: '☕', style: { background: '#FEF3C7', border: '2px solid #F59E0B', color: '#92400E' } }
        );
      }

      // Show warning if appointment is during delay
      if (isAppointmentDuringDelay()) {
        toast(
          `⏰ Doctor is delayed by ${doctorDelay.delayMinutes} minutes. Your consultation may be delayed.`,
          { duration: 6000, icon: '⏰', style: { background: '#FED7AA', border: '2px solid #EA580C', color: '#7C2D12' } }
        );
      }

      toast.success(
        `✅ Appointment Booked!\n🎫 Your Queue Number: ${response.data.serialNumber}`,
        { duration: 6000 }
      );

      setForm({ hospitalName: '', doctor: '', appointmentDate: '', appointmentTime: '', reason: '', type: 'REGULAR' });
      fetchList();

    } catch (err) {
      console.error(err);
      if (err.response?.status === 429) {
        toast.error('🔥 Peak hour! Please choose another time slot.', { duration: 5000 });
        setPeakHourWarning(err.response.data);
      } else if (err.response?.data?.msg) {
        toast.error(`❌ ${err.response.data.msg}`);
      } else {
        toast.error('❌ Booking failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition text-slate-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Book Appointment</h1>
          {isFromCache && (
            <div className="flex items-center gap-1 text-xs text-orange-600 mt-0.5">
              <WifiOff size={10} />
              <span>Viewing offline data</span>
            </div>
          )}
        </div>
      </div>

      {/* Doctor Break Banner */}
      <DoctorBreakBanner />

      {/* Emergency Alert Banner - only show if appointment time is during emergency */}
      {isAppointmentDuringEmergency() && (
        <div className="mb-6 bg-gradient-to-r from-red-600 to-red-700 p-5 rounded-3xl shadow-lg text-white">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2.5 rounded-full">
              <ShieldAlert size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">🚨 Emergency Case — Queue Paused</h3>
              <p className="text-red-100 text-sm mt-1">
                An emergency patient is being attended. Est. ~{Math.ceil(emergencySeconds / 60)} min remaining.
              </p>
              <p className="text-red-200 text-xs mt-2">
                ⚠️ Booking now will result in significantly longer wait times. Consider visiting later.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">
                {String(Math.floor(emergencySeconds / 60)).padStart(2, '0')}:{String(emergencySeconds % 60).padStart(2, '0')}
              </div>
              <div className="text-xs text-red-200">remaining</div>
            </div>
          </div>
          <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white/60 h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, (emergencySeconds / ((emergencyAlert.estimatedDuration || 20) * 60)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Doctor Break Warning Banner - only show if appointment time is during break */}
      {isAppointmentDuringBreak() && (
        <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 p-5 rounded-3xl shadow-lg text-white">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2.5 rounded-full text-2xl">
              ☕
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">☕ Doctor Break Scheduled</h3>
              <p className="text-amber-100 text-sm mt-1">
                The doctor has a {doctorBreak.breakDurationMinutes}-minute break during your appointment time.
              </p>
              <p className="text-amber-200 text-xs mt-2">
                ⚠️ Your consultation will be delayed. Consider choosing a different time slot.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">
                {String(Math.floor(breakSeconds / 60)).padStart(2, '0')}:{String(breakSeconds % 60).padStart(2, '0')}
              </div>
              <div className="text-xs text-amber-200">break time</div>
            </div>
          </div>
          <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white/60 h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, (breakSeconds / (doctorBreak.breakDurationMinutes * 60)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Doctor Delay Warning Banner - only show if appointment time is during delay */}
      {isAppointmentDuringDelay() && (
        <div className="mb-6 bg-gradient-to-r from-orange-500 to-red-500 p-5 rounded-3xl shadow-lg text-white">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2.5 rounded-full text-2xl">
              ⏰
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">⏰ Doctor Delayed</h3>
              <p className="text-orange-100 text-sm mt-1">
                Doctor is delayed by {doctorDelay.delayMinutes} minutes{doctorDelay.delayReason ? `: ${doctorDelay.delayReason}` : ''}.
              </p>
              <p className="text-orange-200 text-xs mt-2">
                ⚠️ Your consultation may start later than scheduled. Consider adjusting your time.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">
                {String(Math.floor(delaySeconds / 60)).padStart(2, '0')}:{String(delaySeconds % 60).padStart(2, '0')}
              </div>
              <div className="text-xs text-orange-200">delay time</div>
            </div>
          </div>
          <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white/60 h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, (delaySeconds / (doctorDelay.delayMinutes * 60)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Emergency Booking Confirmation Dialog */}
      {showEmergencyConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldAlert size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Emergency Case Active</h3>
              <p className="text-slate-600 text-sm mt-2">
                An emergency patient is currently being treated. The queue is paused and your wait time will be <span className="font-bold text-red-600">significantly longer</span> than usual.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-3">
                <p className="text-red-700 text-sm font-bold">
                  ⏱️ Est. emergency time remaining: ~{Math.ceil(emergencySeconds / 60)} minutes
                </p>
                <p className="text-red-600 text-xs mt-1">
                  We recommend changing your visit time to avoid the wait.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEmergencyConfirm(false); setPendingSubmitEvent(null); }}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition"
              >
                Change Time
              </button>
              <button
                onClick={() => { setShowEmergencyConfirm(false); submit({ preventDefault: () => { } }); }}
                className="flex-1 bg-red-100 text-red-700 py-3 rounded-xl font-bold hover:bg-red-200 transition border border-red-200"
              >
                Book Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature 3 & 4: Real-Time Queue Status */}
      {bookedToken && (
        <div className="mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-3xl shadow-lg text-white">
          <div className="text-center mb-4">
            <div className="text-5xl font-black mb-2">#{bookedToken.serialNumber}</div>
            <div className="text-emerald-100 font-bold">Your Queue Number</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="text-sm mb-1">Token Number</div>
            <div className="text-2xl font-bold">{bookedToken.tokenNumber}</div>
          </div>
        </div>
      )}

      {/* Feature 3: Live Queue Tracking */}
      <QueueStatus />

      {/* Feature 14: Location-based Reminder */}
      {location && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
          <MapPin className="text-blue-600 mt-1" size={20} />
          <div className="flex-1">
            <div className="font-bold text-blue-900 mb-1">Location Tracking Active</div>
            <div className="text-sm text-blue-700">
              You'll receive smart reminders based on your location and live traffic conditions.
            </div>
          </div>
        </div>
      )}

      {/* Feature 11: Peak Hour Warning */}
      {peakHourWarning && (
        <div className="mb-6 bg-orange-50 border border-orange-200 p-5 rounded-2xl">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="text-orange-600 mt-0.5" size={22} />
            <div className="flex-1">
              <div className="font-bold text-orange-900 mb-1">⚠️ Peak Hour Detected</div>
              <div className="text-sm text-orange-700 mb-3">
                {peakHourWarning.message}
              </div>
            </div>
          </div>
          {peakHourWarning.suggestedSlots && peakHourWarning.suggestedSlots.length > 0 && (
            <div>
              <div className="text-sm font-bold text-orange-900 mb-2">Suggested Time Slots:</div>
              <div className="grid grid-cols-3 gap-2">
                {peakHourWarning.suggestedSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const time = new Date(slot.time);
                      setForm({
                        ...form,
                        appointmentDate: time.toISOString().split('T')[0],
                        appointmentTime: time.toTimeString().split(' ')[0].substring(0, 5)
                      });
                      setPeakHourWarning(null);
                    }}
                    className="bg-white border border-orange-300 p-2 rounded-lg text-xs hover:bg-orange-100 transition"
                  >
                    <div className="font-bold text-orange-900">
                      {new Date(slot.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-orange-600">{slot.availableSlots} slots</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Booking Form */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold mb-4 text-slate-800">New Appointment Request</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input required value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })} placeholder="Hospital Name" className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
          </div>
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input value={form.doctor} onChange={e => setForm({ ...form, doctor: e.target.value })} placeholder="Doctor ID (e.g., DR001)" className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
          </div>

          {/* Feature 7: Follow-up Selection */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <label className="block text-sm font-bold text-blue-900 mb-3">Appointment Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'REGULAR' })}
                className={`p-3 rounded-lg font-bold text-sm transition ${form.type === 'REGULAR'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100'
                  }`}
              >
                <div>Regular Visit</div>
                <div className="text-xs font-normal opacity-80">~15 minutes</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'FOLLOW_UP' })}
                className={`p-3 rounded-lg font-bold text-sm transition ${form.type === 'FOLLOW_UP'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                  }`}
              >
                <div>Follow-up</div>
                <div className="text-xs font-normal opacity-80">~5 minutes</div>
              </button>
            </div>
            {form.type === 'FOLLOW_UP' && (
              <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                ⚡ Quick visit: Test reports, stitch removal, prescription pickup
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input required value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
            </div>
            <div className="relative">
              <Clock className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input required value={form.appointmentTime} onChange={e => setForm({ ...form, appointmentTime: e.target.value })} type="time" className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
            </div>
          </div>
          <div className="relative">
            <FileText className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for visit" className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" rows="3" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition flex items-center justify-center gap-2">
            <Send size={18} /> Request Appointment
          </button>
        </form>
      </div>

      {/* Appointments List */}
      <h3 className="text-lg font-bold mb-3 text-slate-800">My Appointments</h3>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-400 font-bold">No appointments yet</p>
            </div>
          )}
          {appointments.map(a => {
            const queueInfo = liveQueueData[a._id];
            const isToday = a.appointmentDate === new Date().toISOString().split('T')[0];
            const hasQueue = a.queueNumber && (a.status === 'CONFIRMED' || a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS');

            return (
              <div key={a._id} className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold text-slate-900">{a.hospitalName || a.doctor || 'Hospital'}</div>
                      {a.queueNumber && (
                        <span className="bg-emerald-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
                          Queue #{a.queueNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{a.reason}</div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide whitespace-nowrap ml-2 ${a.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    a.status === 'CONFIRMED' || a.status === 'CHECKED_IN' ? 'bg-green-100 text-green-800 border border-green-200' :
                      a.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        a.status === 'COMPLETED' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-red-100 text-red-800 border border-red-200'}`}>
                    {a.status === 'CHECKED_IN' ? 'IN QUEUE' : a.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" />
                    <span className="font-bold">{a.appointmentDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-orange-500" />
                    <span className="font-bold">{a.appointmentTime}</span>
                  </div>
                </div>

                {/* Live Queue Status for Today's Appointments */}
                {isToday && hasQueue && queueInfo && (
                  <div className="mt-3 bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={18} className="text-blue-600" />
                      <h4 className="font-bold text-blue-900">Live Queue Status</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-600 mb-1">Now Serving</div>
                        <div className="text-2xl font-black text-emerald-600">
                          {queueInfo.currentlyServing || '-'}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-600 mb-1">Your Number</div>
                        <div className="text-2xl font-black text-blue-600">#{a.queueNumber}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-600 mb-1">Ahead of You</div>
                        <div className="text-2xl font-black text-orange-600">
                          {queueInfo.patientsAhead >= 0 ? queueInfo.patientsAhead : '-'}
                        </div>
                      </div>
                    </div>
                    {queueInfo.estimatedWaitTime && (
                      <div className="mt-3 text-center text-sm text-slate-700">
                        <Clock size={14} className="inline mr-1" />
                        Est. wait: <span className="font-bold">{queueInfo.estimatedWaitTime} mins</span>
                      </div>
                    )}
                    {queueInfo.message && (
                      <div className="mt-2 text-xs text-center font-bold text-blue-700">
                        {queueInfo.message}
                      </div>
                    )}
                  </div>
                )}

                {a.rejectionReason && <div className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">Reason: {a.rejectionReason}</div>}

                {/* Contact Hospital Button */}
                {(a.status === 'CONFIRMED' || a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS') && (
                  <div className="mt-3">
                    <button
                      onClick={() => setCallModalData({
                        hospitalName: a.hospitalName || a.doctor || 'Hospital',
                        hospitalPhone: a.hospitalPhone,
                        appointmentId: a._id
                      })}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Phone size={18} />
                      Contact Hospital
                    </button>
                  </div>
                )}

                {/* Feature: Book Again for completed appointments */}
                {a.status === 'COMPLETED' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleBookAgain(a)}
                      className="px-6 py-2 bg-white border-2 border-slate-900 text-slate-900 rounded-full font-bold text-sm hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      book again
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Call Hospital Modal */}
      {callModalData && (
        <CallHospital
          hospitalName={callModalData.hospitalName}
          hospitalPhone={callModalData.hospitalPhone}
          appointmentId={callModalData.appointmentId}
          onClose={() => setCallModalData(null)}
        />
      )}
    </div>
  );
};

export default PatientAppointments;
