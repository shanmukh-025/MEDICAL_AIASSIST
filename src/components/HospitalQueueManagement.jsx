import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, PlayCircle, CheckCircle, RefreshCw, Calendar, UserPlus, AlertOctagon, Coffee, X, UserMinus, Bell } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const HospitalQueueManagement = () => {
  const [queueData, setQueueData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  
  // Form states
  const [walkInName, setWalkInName] = useState('');
  const [walkInTime, setWalkInTime] = useState('');
  const [emergencyForm, setEmergencyForm] = useState({ name: '', phone: '' });
  const [delayForm, setDelayForm] = useState({ minutes: 30, reason: '' });
  const [breakDuration, setBreakDuration] = useState(15);

  const fetchQueueData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?._id;
      
      if (!userId) {
        console.error('No user ID found in localStorage');
        toast.error('Please log in again');
        return;
      }

      console.log('Fetching queue data for:', { userId, date: selectedDate, userName: user?.name });

      const res = await axios.get(
        `${API_URL}/api/appointments/queue-status/${userId}/${selectedDate}`,
        { headers: { 'x-auth-token': token } }
      );
      
      console.log('Queue data received:', res.data);
      setQueueData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load queue data:', err);
      console.error('Error details:', err.response?.data);
      setLoading(false);
      // Set empty queue data instead of showing error toast
      setQueueData({
        currentlyServing: null,
        totalInQueue: 0,
        completedToday: 0,
        avgConsultationTime: null,
        appointments: []
      });
      
      // Only show error if it's a server error (not just empty data)
      if (err.response?.status === 500) {
        console.error('Server error loading queue data');
        toast.error('Failed to load queue. Check server console.');
      }
    }
  }, [selectedDate]);

  // Feature 2: Walk-in Digital Token
  const handleGenerateWalkIn = async () => {
    if (!walkInName.trim()) {
      toast.error('Please enter patient name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?._id;
      
      if (!userId) {
        toast.error('User ID not found. Please log in again.');
        return;
      }
      
      const res = await axios.post(
        `${API_URL}/api/smart-queue/walk-in-token`,
        { patientName: walkInName, appointmentTime: walkInTime || undefined, doctorId: userId },
        { headers: { 'x-auth-token': token } }
      );

      toast.success(`✅ Walk-in Token Generated!\nQueue #${res.data.serialNumber}`, {
        duration: 5000
      });
      
      setWalkInName('');
      setWalkInTime('');
      setShowWalkInModal(false);
      fetchQueueData();
    } catch (err) {
      console.error('Walk-in generation error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.msg || 'Failed to generate walk-in token');
    }
  };

  // Feature 6: Emergency Priority Override
  const handleEmergencyInsertion = async () => {
    if (!emergencyForm.name.trim()) {
      toast.error('Please enter patient name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?._id;
      
      if (!userId) {
        toast.error('User ID not found. Please log in again.');
        return;
      }
      
      console.log('Inserting emergency patient with doctorId:', userId);
      
      const res = await axios.post(
        `${API_URL}/api/smart-queue/emergency`,
        { 
          patientName: emergencyForm.name,
          phone: emergencyForm.phone,
          doctorId: userId 
        },
        { headers: { 'x-auth-token': token } }
      );

      toast.success(
        `🚨 ${res.data.message}\n${res.data.affectedPatients} patients shifted`,
        { duration: 5000 }
      );
      
      setEmergencyForm({ name: '', phone: '' });
      setShowEmergencyModal(false);
      fetchQueueData();
    } catch (err) {
      console.error('Emergency insertion error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.msg || 'Failed to insert emergency patient');
    }
  };

  // Feature 10: Delay Broadcast
  const handleBroadcastDelay = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?._id;
      
      if (!userId) {
        toast.error('User ID not found. Please log in again.');
        return;
      }
      
      const res = await axios.post(
        `${API_URL}/api/smart-queue/broadcast-delay`,
        {
          doctorId: userId,
          delayMinutes: parseInt(delayForm.minutes),
          delayReason: delayForm.reason
        },
        { headers: { 'x-auth-token': token } }
      );

      toast.success(
        `📢 Delay broadcasted to ${res.data.notificationsSent} patients`,
        { duration: 5000 }
      );
      
      setDelayForm({ minutes: 30, reason: '' });
      setShowDelayModal(false);
      fetchQueueData();
    } catch (err) {
      console.error('Delay broadcast error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.msg || 'Failed to broadcast delay');
    }
  };

  // Feature 12: Doctor Break Management
  const handleTakeBreak = async () => {
    if (!breakDuration || breakDuration < 5 || breakDuration > 120) {
      toast.error('Break duration must be between 5 and 120 minutes');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?._id;
      
      if (!userId) {
        toast.error('User ID not found. Please log in again.');
        return;
      }
      
      console.log('Scheduling break for doctorId:', userId, 'Duration:', breakDuration);
      
      const res = await axios.post(
        `${API_URL}/api/smart-queue/doctor-break`,
        { 
          doctorId: userId,
          breakDurationMinutes: breakDuration 
        },
        { headers: { 'x-auth-token': token } }
      );

      toast.success(
        `☕ Break scheduled for ${breakDuration} minutes!\n${res.data.affectedPatients} patients notified`,
        { duration: 6000 }
      );
      
      setShowBreakModal(false);
      setBreakDuration(15);
      fetchQueueData();
    } catch (err) {
      console.error('Break scheduling error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.msg || 'Failed to schedule break');
    }
  };

  // Feature 5: Start Consultation
  const handleStartConsultation = async (appointmentId, queueNumber) => {
    if (!window.confirm(`Start consultation for Queue #${queueNumber}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/appointments/${appointmentId}/start-consultation`,
        {},
        { headers: { 'x-auth-token': token } }
      );
      toast.success(`✅ Now serving Queue #${queueNumber}`);
      fetchQueueData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to start consultation');
    }
  };

  // Feature 5: End Consultation
  const handleEndConsultation = async (appointmentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/appointments/${appointmentId}/end-consultation`,
        {},
        { headers: { 'x-auth-token': token } }
      );
      toast.success('✅ Consultation completed');
      fetchQueueData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to end consultation');
    }
  };

  // Feature 8: Handle No-Show
  const handleNoShow = async (appointmentId, tokenNumber) => {
    if (!window.confirm('Mark this patient as NO-SHOW?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${API_URL}/api/smart-queue/no-show/${tokenNumber}`,
        {},
        { headers: { 'x-auth-token': token } }
      );

      toast.success(
        `❌ ${res.data.message}\n${res.data.affectedPatients} patients moved forward`,
        { duration: 5000 }
      );
      fetchQueueData();
    } catch (err) {
      console.error('No-show error:', err);
      toast.error('Failed to mark no-show');
    }
  };

  // Send location-based reminder to patient
  const handleSendReminder = async (appointmentId, patientName) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get patient's current location if available
      let patientLocation = null;
      
      // Try to get location (in real app, this would come from patient's device)
      // For now, we'll send reminder without exact location
      
      const res = await axios.post(
        `${API_URL}/api/appointments/${appointmentId}/send-reminder`,
        { patientLocation },
        { headers: { 'x-auth-token': token } }
      );

      toast.success(
        `🔔 Reminder sent to ${patientName}!\n${res.data.distance ? `Distance: ${res.data.distance}` : ''}\n${res.data.queuePosition} patients ahead`,
        { duration: 5000 }
      );
    } catch (err) {
      console.error('Reminder error:', err);
      toast.error(err.response?.data?.msg || 'Failed to send reminder');
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Actions */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 -mx-6 -mt-6 px-6 pt-6 pb-8 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-xl">
                <Users className="text-white" size={32} />
              </div>
              Queue Management
            </h2>
            <p className="text-slate-600 mt-2 font-medium">Manage patient flow efficiently</p>
          </div>
          <button
            onClick={fetchQueueData}
            className="p-3 bg-white rounded-xl hover:bg-slate-50 transition shadow-lg border border-slate-200 group"
            title="Refresh"
          >
            <RefreshCw size={22} className="text-emerald-600 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Feature 2: Walk-in Token */}
        <button
          onClick={() => setShowWalkInModal(true)}
          className="group bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 flex flex-col items-center gap-3 border border-blue-400/50 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
            <UserPlus size={28} />
          </div>
          <span className="text-sm font-bold relative">Walk-in Token</span>
        </button>

        {/* Feature 6: Emergency */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="group bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 flex flex-col items-center gap-3 border border-red-400/50 relative overflow-hidden animate-pulse"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
            <AlertOctagon size={28} />
          </div>
          <span className="text-sm font-bold relative">Emergency</span>
        </button>

        {/* Feature 10: Delay Notification */}
        <button
          onClick={() => setShowDelayModal(true)}
          className="group bg-gradient-to-br from-orange-500 to-amber-600 text-white p-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 flex flex-col items-center gap-3 border border-orange-400/50 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
            <Clock size={28} />
          </div>
          <span className="text-sm font-bold relative">Broadcast Delay</span>
        </button>

        {/* Feature 12: Doctor Break */}
        <button
          onClick={() => setShowBreakModal(true)}
          className="group bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 flex flex-col items-center gap-3 border border-purple-400/50 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
            <Coffee size={28} />
          </div>
          <span className="text-sm font-bold relative">Take Break</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 rounded-3xl text-white shadow-2xl border border-emerald-400/30 relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Now Serving</div>
            <div className="text-5xl font-black tracking-tight">
              {queueData?.currentlyServing || '-'}
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex items-center gap-2 text-xs opacity-90">
                <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-2xl border border-blue-400/30 relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">In Queue</div>
            <div className="text-5xl font-black tracking-tight">{queueData?.totalInQueue || 0}</div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="text-xs opacity-90">Waiting</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 p-6 rounded-3xl text-white shadow-2xl border border-purple-400/30 relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Completed</div>
            <div className="text-5xl font-black tracking-tight">{queueData?.completedToday || 0}</div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="text-xs opacity-90">Today</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-6 rounded-3xl text-white shadow-2xl border border-orange-400/30 relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Avg Time</div>
            <div className="text-5xl font-black tracking-tight">
              {queueData?.avgConsultationTime ? `${queueData.avgConsultationTime}m` : '-'}
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="text-xs opacity-90">Per Patient</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-lg flex items-center gap-4 hover:shadow-xl transition-shadow">
        <div className="bg-emerald-100 p-3 rounded-xl">
          <Calendar className="text-emerald-600" size={24} />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-transparent border-0 px-0 py-1 text-lg font-bold text-slate-900 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* Patient Queue List */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-xl">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b-2 border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <Users className="text-white" size={22} />
              </div>
              Patient Queue
            </h3>
            <div className="bg-emerald-100 px-4 py-2 rounded-xl">
              <span className="text-emerald-700 font-black text-lg">{queueData?.appointments?.length || 0}</span>
              <span className="text-emerald-600 text-xs ml-1 font-bold">patients</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {queueData?.appointments && queueData.appointments.length > 0 ? (
            queueData.appointments.map((appt) => (
              <div key={appt._id} className="p-6 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition-all duration-200 border-l-4 border-transparent hover:border-l-emerald-500\">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg ${
                      appt.status === 'IN_PROGRESS' 
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white animate-pulse' 
                        : appt.status === 'EMERGENCY'
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse'
                        : appt.queueNumber === queueData.currentlyServing + 1
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'
                    }`}>
                      #{appt.queueNumber}
                    </div>
                    <div>
                      <div className="font-black text-lg text-slate-900">{appt.patientName || 'Patient'}</div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                        <Clock size={14} />
                        <span className="font-semibold">{appt.appointmentTime}</span>
                      </div>
                      {appt.checkInTime && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold mt-2 bg-emerald-50 px-2 py-1 rounded-lg">
                          <CheckCircle size={12} />
                          <span>Checked In</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {appt.status === 'IN_PROGRESS' ? (
                      <button
                        onClick={() => handleEndConsultation(appt._id)}
                        className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Complete
                      </button>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartConsultation(appt._id, appt.queueNumber)}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2"
                          >
                            <PlayCircle size={18} />
                            Start
                          </button>
                          <button
                            onClick={() => handleSendReminder(appt._id, appt.patientName)}
                            className="px-3 py-2.5 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded-xl font-bold text-sm hover:bg-gradient-to-r hover:from-emerald-100 hover:to-emerald-200 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                            title="Send reminder to patient"
                          >
                            <Bell size={18} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleNoShow(appt._id, appt.tokenNumber)}
                          className="px-5 py-2.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-gradient-to-r hover:from-red-100 hover:to-red-200 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                        >
                          <UserMinus size={18} />
                          No-Show
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  {appt.status === 'IN_PROGRESS' && (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-300">
                      🩺 In Progress
                    </span>
                  )}
                  {appt.status === 'EMERGENCY' && (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-lg text-xs font-black uppercase tracking-wider animate-pulse border border-red-300">
                      🚨 Emergency
                    </span>
                  )}
                  {appt.status === 'PENDING' && (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-lg text-xs font-black uppercase tracking-wider border border-yellow-300">
                      ⏳ Pending
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={48} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-500 text-lg">No patients in queue</p>
              <p className="text-slate-400 text-sm mt-2">Add walk-in patients or wait for appointments</p>
            </div>
          )}
        </div>
      </div>

      {/* Walk-in Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="text-blue-600" />
                Walk-in Token
              </h3>
              <button onClick={() => setShowWalkInModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Patient Name"
                className="w-full border border-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Appointment Time</label>
                <input
                  type="time"
                  value={walkInTime}
                  onChange={(e) => setWalkInTime(e.target.value)}
                  className="w-full border border-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty to use current time. Set a time to place the patient in the correct queue position.</p>
              </div>
              <button
                onClick={handleGenerateWalkIn}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700"
              >
                Generate Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertOctagon className="text-red-600" />
                Emergency Patient
              </h3>
              <button onClick={() => setShowEmergencyModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={emergencyForm.name}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
                placeholder="Patient Name"
                className="w-full border border-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="tel"
                value={emergencyForm.phone}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })}
                placeholder="Phone Number (optional)"
                className="w-full border border-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={handleEmergencyInsertion}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700"
              >
                 Insert as Emergency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delay Broadcast Modal */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-orange-600" />
                Broadcast Delay
              </h3>
              <button onClick={() => setShowDelayModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Delay Duration (minutes)</label>
                <input
                  type="number"
                  value={delayForm.minutes}
                  onChange={(e) => setDelayForm({ ...delayForm, minutes: e.target.value })}
                  className="w-full border border-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Reason</label>
                <textarea
                  value={delayForm.reason}
                  onChange={(e) => setDelayForm({ ...delayForm, reason: e.target.value })}
                  placeholder="e.g., Emergency surgery"
                  className="w-full border border-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows="3"
                />
              </div>
              <button
                onClick={handleBroadcastDelay}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700"
              >
                Broadcast to All Patients
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Coffee className="text-purple-600" />
                Take a Break
              </h3>
              <button onClick={() => setShowBreakModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Break Duration (minutes)</label>
                <input
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                  min="5"
                  max="120"
                  className="w-full border border-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-500 mt-1">Between 5 and 120 minutes</p>
              </div>
              
              {/* Quick duration buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setBreakDuration(15)}
                  className={`py-2 rounded-lg font-bold transition ${
                    breakDuration === 15 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  15 min
                </button>
                <button
                  onClick={() => setBreakDuration(30)}
                  className={`py-2 rounded-lg font-bold transition ${
                    breakDuration === 30 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  30 min
                </button>
                <button
                  onClick={() => setBreakDuration(60)}
                  className={`py-2 rounded-lg font-bold transition ${
                    breakDuration === 60 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  60 min
                </button>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800">
                  ℹ️ All waiting patients will be notified about your break and their wait time will be updated.
                </p>
              </div>

              <button
                onClick={handleTakeBreak}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700"
              >
                Schedule Break
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalQueueManagement;
