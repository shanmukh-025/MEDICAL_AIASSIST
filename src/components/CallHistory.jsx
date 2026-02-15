import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Phone, PhoneOff, PhoneMissed, PhoneIncoming, Clock, Calendar, ChevronLeft, ChevronRight, Search, Filter, BarChart3, PhoneCall, PhoneOutgoing } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const CallHistory = ({ onCallPatient }) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalCalls: 0, todayCalls: 0, missedCalls: 0, answeredCalls: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const token = localStorage.getItem('token');

  const fetchCallLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 30 };
      if (filterDate) params.date = filterDate;
      const res = await axios.get(`${API}/api/call-logs`, {
        headers: { 'x-auth-token': token },
        params
      });
      setLogs(res.data.logs || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch call logs:', err);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  }, [page, filterDate, token]);

  const fetchCallStats = React.useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/call-logs/stats`, {
        headers: { 'x-auth-token': token }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch call stats:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchCallLogs();
    fetchCallStats();
  }, [fetchCallLogs, fetchCallStats]);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filterStatus !== 'ALL') {
      result = result.filter(log => log.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log =>
        (log.callerName || '').toLowerCase().includes(q) ||
        (log.callerSocketId || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, filterStatus, searchQuery]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.startedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'ANSWERED':
        return { icon: PhoneCall, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Answered', dotColor: 'bg-green-500' };
      case 'MISSED':
        return { icon: PhoneMissed, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Missed', dotColor: 'bg-red-500' };
      case 'BUSY':
        return { icon: PhoneIncoming, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Busy', dotColor: 'bg-orange-500' };
      case 'REJECTED':
        return { icon: PhoneOff, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Rejected', dotColor: 'bg-slate-500' };
      default:
        return { icon: Phone, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: status, dotColor: 'bg-slate-500' };
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2.5 rounded-xl">
              <Phone size={20} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Calls</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalCalls}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <Calendar size={20} className="text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Today</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.todayCalls}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2.5 rounded-xl">
              <PhoneCall size={20} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Answered</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.answeredCalls}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 p-2.5 rounded-xl">
              <PhoneMissed size={20} className="text-red-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Missed / Busy</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.missedCalls}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by caller name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {['ALL', 'ANSWERED', 'MISSED', 'BUSY', 'REJECTED'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {(filterDate || filterStatus !== 'ALL' || searchQuery) && (
            <button
              onClick={() => { setFilterDate(''); setFilterStatus('ALL'); setSearchQuery(''); setPage(1); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Call Logs grouped by date */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-3 border-blue-500 border-solid"></div>
        </div>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <PhoneMissed size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No call records found</h3>
          <p className="text-slate-500 text-sm">
            {filterDate || filterStatus !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Call history will appear here when patients call your hospital'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                  <Calendar size={14} />
                  {date}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {dateLogs.length} call{dateLogs.length !== 1 ? 's' : ''}
                </div>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Call Cards */}
              <div className="space-y-2">
                {dateLogs.map((log) => {
                  const config = getStatusConfig(log.status);
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={log._id}
                      className={`bg-white rounded-xl border ${config.border} p-4 shadow-sm hover:shadow-md transition flex items-center gap-4`}
                    >
                      {/* Status Icon */}
                      <div className={`${config.bg} p-3 rounded-xl`}>
                        <StatusIcon size={20} className={config.color} />
                      </div>

                      {/* Caller Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 truncate">
                            {log.callerName || 'Unknown Patient'}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}></span>
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(log.startedAt)}
                          </span>
                          <span className="capitalize flex items-center gap-1">
                            {log.callType === 'video' ? '📹' : '🎤'} {log.callType}
                          </span>
                          {log.duration > 0 && (
                            <span className="flex items-center gap-1">
                              ⏱️ {formatDuration(log.duration)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Call Back & Time */}
                      <div className="flex items-center gap-3 shrink-0">
                        {onCallPatient && (
                          <button
                            onClick={() => {
                              if (log.callerUserId) {
                                onCallPatient({ userId: log.callerUserId, name: log.callerName || 'Patient' });
                              } else {
                                toast.error('Cannot call back — patient ID not available for older calls');
                              }
                            }}
                            className={`p-2.5 rounded-full text-white shadow-md transition-all hover:scale-110 active:scale-95 ${
                              log.callerUserId 
                                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' 
                                : 'bg-slate-400 hover:bg-slate-500 shadow-slate-200'
                            }`}
                            title={log.callerUserId ? `Call back ${log.callerName || 'Patient'}` : 'Patient ID not available'}
                          >
                            <PhoneOutgoing size={16} />
                          </button>
                        )}
                        <div className="text-right text-sm text-slate-500 whitespace-nowrap">
                          {formatTime(log.startedAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-slate-600 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CallHistory;
