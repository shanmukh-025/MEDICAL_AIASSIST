import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AlertTriangle, Clock, User, Phone, CheckCircle, XCircle, RefreshCw, Calendar, Activity, FileText, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const EmergencyPatientRecords = () => {
  const [emergencyPatients, setEmergencyPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchEmergencyPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?._id;

      if (!userId) {
        toast.error('User ID not found. Please log in again.');
        return;
      }

      const res = await axios.get(
        `${API_URL}/api/appointments/emergency/${userId}/${selectedDate}`,
        { headers: { 'x-auth-token': token } }
      );

      setEmergencyPatients(res.data);
    } catch (err) {
      console.error('Failed to fetch emergency patients:', err);
      // Try alternative endpoint
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.id || user?._id;
        
        // Fallback: fetch all appointments and filter by EMERGENCY type
        const res = await axios.get(
          `${API_URL}/api/appointments/hospital`,
          { headers: { 'x-auth-token': token } }
        );
        
        const emergencyOnly = res.data.filter(
          appt => appt.type === 'EMERGENCY' && appt.appointmentDate === selectedDate
        );
        setEmergencyPatients(emergencyOnly);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        toast.error('Failed to load emergency patients');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyPatients();
    const interval = setInterval(fetchEmergencyPatients, 15000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleCompleteEmergency = async (appointmentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/appointments/${appointmentId}/complete`,
        {},
        { headers: { 'x-auth-token': token } }
      );
      toast.success('Emergency case completed!');
      fetchEmergencyPatients();
    } catch (err) {
      toast.error('Failed to complete emergency');
    }
  };

  const activeEmergencies = emergencyPatients.filter(
    appt => appt.status !== 'COMPLETED'
  );
  const completedEmergencies = emergencyPatients.filter(
    appt => appt.status === 'COMPLETED'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl border border-red-400 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Emergency Patient Records</h2>
              <p className="text-red-100 text-sm">Priority queue patients requiring immediate attention</p>
            </div>
          </div>
          <button
            onClick={fetchEmergencyPatients}
            className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <Calendar size={20} className="text-red-600" />
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Active Emergencies</p>
          <p className="text-3xl font-bold text-red-600">{activeEmergencies.length}</p>
          <p className="text-xs text-slate-400 mt-2">In progress</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Completed Today</p>
          <p className="text-3xl font-bold text-green-600">{completedEmergencies.length}</p>
          <p className="text-xs text-slate-400 mt-2">Treated</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Today</p>
          <p className="text-3xl font-bold text-blue-600">{emergencyPatients.length}</p>
          <p className="text-xs text-slate-400 mt-2">Cases</p>
        </div>
      </div>

      {/* Active Emergencies */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-red-50">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            Active Emergency Cases
          </h3>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
            {activeEmergencies.length} patients
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeEmergencies.length > 0 ? (
            activeEmergencies.map((appt) => (
              <div key={appt._id} className="p-4 hover:bg-red-50/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg">
                        {appt.patientName || 'Unknown Patient'}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={11} /> {appt.appointmentTime}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar size={11} /> {appt.appointmentDate}
                        </span>
                        {appt.phone && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone size={11} /> {appt.phone}
                          </span>
                        )}
                      </div>
                      {appt.queueNumber && (
                        <div className="mt-2">
                          <span className="bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
                            Queue #{appt.queueNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {appt.status === 'IN_PROGRESS' ? (
                      <button
                        onClick={() => handleCompleteEmergency(appt._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition flex items-center gap-1.5"
                      >
                        <CheckCircle size={16} /> Complete
                      </button>
                    ) : appt.status === 'EMERGENCY' ? (
                      <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        Waiting
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <p className="font-bold text-slate-500">No active emergencies</p>
              <p className="text-sm text-slate-400 mt-1">All patients have been attended to</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed Emergencies */}
      {completedEmergencies.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-green-50">
            <h3 className="font-bold text-green-800 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              Completed Cases
            </h3>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
              {completedEmergencies.length} patients
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {completedEmergencies.map((appt) => (
              <div key={appt._id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-700">
                        {appt.patientName || 'Unknown Patient'}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={11} /> {appt.appointmentTime}
                        </span>
                        <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                          <CheckCircle size={11} /> Completed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyPatientRecords;

