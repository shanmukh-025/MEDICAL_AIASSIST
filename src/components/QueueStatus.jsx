import React, { useState, useEffect } from 'react';
import { Users, Clock, RefreshCw, CheckCircle, Coffee } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const QueueStatus = ({ tokenNumber }) => {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchQueueStatus = async () => {
    if (!tokenNumber) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/smart-queue/mobile/queue-status/${tokenNumber}`,
        { headers: { 'x-auth-token': token } }
      );
      
      setQueueData(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
      setError(err.response?.data?.msg || 'Failed to load queue status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenNumber]);

  if (!tokenNumber) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="text-sm text-slate-500 mt-3">Loading queue status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-700 font-bold text-sm">⚠️ {error}</p>
        <button
          onClick={fetchQueueStatus}
          className="mt-3 text-red-600 text-sm font-bold hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!queueData || queueData.status === 'COMPLETED') {
    return null;
  }

  const getStatusColor = () => {
    if (queueData.status === 'IN_PROGRESS') return 'bg-emerald-500';
    if (queueData.status === 'CALLED') return 'bg-yellow-500';
    if (queueData.patientsAhead <= 2) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (queueData.status === 'IN_PROGRESS') return 'In Progress 🩺';
    if (queueData.status === 'CALLED') return 'Please Proceed 🔔';
    if (queueData.patientsAhead === 0) return 'Your Turn Next! 🎯';
    if (queueData.patientsAhead <= 2) return 'Almost Your Turn ⏰';
    return 'Waiting 🕒';
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-lg">
      {/* Header */}
      <div className={`${getStatusColor()} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} />
            <h3 className="font-bold text-lg">Live Queue Status</h3>
          </div>
          <button
            onClick={fetchQueueStatus}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <p className="text-sm opacity-90 mt-1">{getStatusText()}</p>
      </div>

      {/* Queue Details */}
      <div className="p-6 space-y-4">
        {/* Queue Number */}
        <div className="text-center pb-4 border-b border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Your Queue Number</div>
          <div className="text-5xl font-black text-slate-900">
            #{queueData.queueNumber}
          </div>
        </div>

        {/* Position Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users size={18} className="text-blue-600" />
              <div className="text-sm font-bold text-blue-900">Ahead of You</div>
            </div>
            <div className="text-3xl font-black text-blue-600">
              {queueData.patientsAhead}
            </div>
            {queueData.emergenciesAhead > 0 && (
              <div className="text-xs text-red-600 mt-1 font-bold">
                🚨 {queueData.emergenciesAhead} emergency
              </div>
            )}
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock size={18} className="text-emerald-600" />
              <div className="text-sm font-bold text-emerald-900">Est. Wait</div>
            </div>
            <div className="text-3xl font-black text-emerald-600">
              {queueData.estimatedWaitTime || 0}<span className="text-lg">m</span>
            </div>
            {queueData.doctorBreak?.isOnBreak && (
              <div className="text-xs text-purple-600 mt-1 font-bold">
                ☕ +{queueData.doctorBreak.remainingMinutes}m break
              </div>
            )}
          </div>
        </div>

        {/* Doctor Break Alert */}
        {queueData.doctorBreak?.isOnBreak && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coffee className="text-purple-600" size={20} />
              <div className="font-bold text-purple-900">Doctor is on Break</div>
            </div>
            <p className="text-sm text-purple-800">
              Break will end in <strong>{queueData.doctorBreak.remainingMinutes} minutes</strong>
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Your wait time has been adjusted accordingly
            </p>
          </div>
        )}

        {/* Current Status */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Current Status</div>
              <div className="font-bold text-slate-900">{queueData.status || 'WAITING'}</div>
            </div>
            {queueData.status === 'IN_PROGRESS' && (
              <CheckCircle className="text-emerald-600" size={24} />
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Auto-refresh every 30 seconds
          </p>
        </div>

        {/* Tips */}
        {queueData.patientsAhead > 5 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> You can stay nearby. We'll update your position automatically.
            </p>
          </div>
        )}

        {queueData.patientsAhead <= 2 && queueData.patientsAhead > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-sm text-orange-800">
              🔔 <strong>Get Ready:</strong> Please be near the consultation room. You're next soon!
            </p>
          </div>
        )}

        {queueData.patientsAhead === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-sm text-emerald-800">
              ✅ <strong>Your Turn!</strong> Please proceed to the consultation room.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueStatus;
