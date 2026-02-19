import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, PlayCircle, CheckCircle, RefreshCw, Calendar, UserPlus, AlertOctagon, Coffee, X, UserMinus, Bell, Activity } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import EmergencyPatientMonitor from './EmergencyPatientMonitor';

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
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [monitoringAppointmentId, setMonitoringAppointmentId] = useState(null);
  
  // Form states
  const [walkInName, setWalkInName] = useState('');
  const [walkInTime, setWalkInTime] = useState('');
  const [emergencyForm, setEmergencyForm] = useState({ name: '', phone: '', chiefComplaint: '' });
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
  // Start monitoring for an emergency patient
  const handleStartMonitoring = async (appointmentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/emergency-monitoring/start/${appointmentId}`,
        {},
        { headers: { 'x-auth-token': token } }
      );
      
      toast.success('✅ Patient monitoring started');
      setMonitoringAppointmentId(appointmentId);
      setShowMonitorModal(true);
      fetchQueueData();
    } catch (err) {
      console.error('Start monitoring error:', err);
      toast.error(err.response?.data?.msg || 'Failed to start monitoring');
    }
  };

  // Open monitoring modal for existing monitoring
  const handleOpenMonitor = (appointmentId) => {
    setMonitoringAppointmentId(appointmentId);
    setShowMonitorModal(true);
  };

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
      
      setEmergencyForm({ name: '', phone: '', chiefComplaint: '' });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Queue Management</h2>
              <p className="text-sm text-slate-500">Manage patient flow efficiently</p>
            </div>
          </div>
          <button
            onClick={fetchQueueData}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setShowWalkInModal(true)}
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-blue-50 hover:border-blue-200 transition flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition">
            <UserPlus size={20} className="text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Walk-in Token</span>
        </button>

        <button
          onClick={() => setShowEmergencyModal(true)}
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-red-50 hover:border-red-200 transition flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition">
            <AlertOctagon size={20} className="text-red-600" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Emergency</span>
        </button>

        <button
          onClick={() => setShowDelayModal(true)}
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-amber-50 hover:border-amber-200 transition flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition">
            <Clock size={20} className="text-amber-600" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Broadcast Delay</span>
        </button>

        <button
          onClick={() => setShowBreakModal(true)}
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-purple-50 hover:border-purple-200 transition flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition">
            <Coffee size={20} className="text-purple-600" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Take Break</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Now Serving</p>
          <p className="text-3xl font-bold text-emerald-600">{queueData?.currentlyServing || '-'}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-500">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">In Queue</p>
          <p className="text-3xl font-bold text-blue-600">{queueData?.totalInQueue || 0}</p>
          <p className="text-xs text-slate-400 mt-2">Waiting</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Completed</p>
          <p className="text-3xl font-bold text-purple-600">{queueData?.completedToday || 0}</p>
          <p className="text-xs text-slate-400 mt-2">Today</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Avg Time</p>
          <p className="text-3xl font-bold text-orange-600">
            {queueData?.avgConsultationTime ? `${queueData.avgConsultationTime}m` : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-2">Per Patient</p>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Calendar size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-transparent border-0 px-0 py-0 text-sm font-bold text-slate-900 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* Patient Queue List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            Patient Queue
          </h3>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
            {queueData?.appointments?.length || 0} patients
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {queueData?.appointments && queueData.appointments.length > 0 ? (
            queueData.appointments.map((appt) => (
              <div key={appt._id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                      appt.status === 'IN_PROGRESS' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : appt.status === 'EMERGENCY'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{appt.queueNumber}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{appt.patientName || 'Patient'}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={11} /> {appt.appointmentTime}
                        </span>
                        {appt.checkInTime && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle size={11} /> Checked In
                          </span>
                        )}
                        {appt.status === 'IN_PROGRESS' && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">In Progress</span>
                        )}
                        {appt.status === 'EMERGENCY' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">Emergency</span>
                        )}
                        {/* Show monitoring status if enabled */}
                        {appt.emergencyMonitoring?.enabled && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1">
                            <Activity size={10} /> Monitoring
                          </span>
                        )}
                        {appt.status === 'PENDING' && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {appt.status === 'IN_PROGRESS' ? (
                      <button
                        onClick={() => handleEndConsultation(appt._id)}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-xs hover:bg-emerald-700 transition flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} /> Complete
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartConsultation(appt._id, appt.queueNumber)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs hover:bg-blue-700 transition flex items-center gap-1.5"
                        >
                          <PlayCircle size={14} /> Start
                        </button>
                        <button
                          onClick={() => handleSendReminder(appt._id, appt.patientName)}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition"
                          title="Send reminder"
                        >
                          <Bell size={14} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleNoShow(appt._id, appt.tokenNumber)}
                          className="px-3 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl font-semibold text-xs hover:bg-red-100 transition flex items-center gap-1.5"
                        >
                          <UserMinus size={14} /> No-Show
                        </button>
                        {/* Monitor button for emergency patients */}
                        {(appt.status === 'EMERGENCY' || appt.status === 'IN_PROGRESS') && (
                          <button
                            onClick={() => handleOpenMonitor(appt._id)}
                            className="px-3 py-2 bg-orange-50 border border-orange-100 text-orange-600 rounded-xl font-semibold text-xs hover:bg-orange-100 transition flex items-center gap-1.5"
                          >
                            <Activity size={14} /> Monitor
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-500">No patients in queue</p>
              <p className="text-sm text-slate-400 mt-1">Add walk-in patients or wait for appointments</p>
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
              <input
                type="text"
                value={emergencyForm.chiefComplaint}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, chiefComplaint: e.target.value })}
                placeholder="Chief Complaint (e.g., Chest pain, Difficulty breathing)"
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

      {/* Emergency Patient Monitor Modal */}
      {showMonitorModal && monitoringAppointmentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EmergencyPatientMonitor 
              appointmentId={monitoringAppointmentId}
              onClose={() => {
                setShowMonitorModal(false);
                setMonitoringAppointmentId(null);
              }}
              onMonitoringEnd={() => fetchQueueData()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalQueueManagement;
