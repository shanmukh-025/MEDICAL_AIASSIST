import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Search, Calendar, Clock, User, FileText, Filter,
  ChevronDown, ChevronRight, Stethoscope, Loader2,
  FolderOpen, Eye, Download, X as CloseIcon, Phone, Mail,
  CalendarDays, ClipboardList, UserCircle, History
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const DOCTOR_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100', dot: 'bg-blue-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100', dot: 'bg-emerald-400' },
  { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100', dot: 'bg-purple-400' },
  { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100', dot: 'bg-amber-400' },
  { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-100', dot: 'bg-rose-400' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', accent: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-100', dot: 'bg-cyan-400' },
];

const PatientRecordsManager = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [viewMode, setViewMode] = useState('doctor'); // 'doctor' or 'date'
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);

  const token = localStorage.getItem('token');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (dateFilter) params.append('date', dateFilter);
      if (doctorFilter !== 'all') params.append('doctor', doctorFilter);

      const res = await axios.get(`${API}/api/patient-records/hospital?${params.toString()}`, {
        headers: { 'x-auth-token': token }
      });
      setData(res.data);

      // Auto-expand all sections
      const expanded = {};
      if (res.data.groupedByDoctor) {
        Object.keys(res.data.groupedByDoctor).forEach(k => expanded[`doc_${k}`] = true);
      }
      if (res.data.groupedByDate) {
        Object.keys(res.data.groupedByDate).forEach(k => expanded[`date_${k}`] = true);
      }
      setExpandedSections(expanded);
    } catch (err) {
      console.error('Failed to fetch records:', err);
      toast.error('Failed to load patient records');
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, dateFilter, doctorFilter]);

  useEffect(() => {
    fetchRecords();
  }, [dateFilter, doctorFilter, fetchRecords]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchRecords]);

  const fetchPatientHistory = async (patientId) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/api/patient-records/patient/${patientId}`, {
        headers: { 'x-auth-token': token }
      });
      setPatientHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch patient history:', err);
      toast.error('Failed to load patient history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getDoctorColor = (index) => DOCTOR_COLORS[index % DOCTOR_COLORS.length];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderAppointmentCard = (appointment) => {
    const patientName = appointment.patientName || appointment.patientId?.name || 'Unknown Patient';
    const patientEmail = appointment.patientId?.email || '';
    const patientPhone = appointment.phone || appointment.patientId?.phone || '';
    const hasRecords = appointment.records && appointment.records.length > 0;

    return (
      <div
        key={appointment._id}
        className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {patientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-bold text-slate-900">{patientName}</h4>
              {patientEmail && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Mail size={10} /> {patientEmail}
                </div>
              )}
              {patientPhone && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone size={10} /> {patientPhone}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              appointment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
              appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {appointment.status}
            </span>
          </div>
        </div>

        {/* Visit Details */}
        <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-blue-500" />
            <span className="font-semibold">{appointment.appointmentDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-orange-500" />
            <span className="font-semibold">{appointment.appointmentTime}</span>
          </div>
          {appointment.doctor && (
            <div className="flex items-center gap-1.5">
              <Stethoscope size={13} className="text-purple-500" />
              <span className="font-semibold">{appointment.doctor}</span>
            </div>
          )}
          {appointment.queueNumber && (
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-bold">
              Queue #{appointment.queueNumber}
            </span>
          )}
        </div>

        {/* Reason */}
        {appointment.reason && (
          <div className="text-sm text-slate-600 bg-amber-50 border border-amber-100 p-2.5 rounded-xl mb-3">
            <span className="font-semibold text-amber-700">Reason:</span> {appointment.reason}
          </div>
        )}

        {/* Linked Records/Reports */}
        {hasRecords && (
          <div className="mt-2">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Reports ({appointment.records.length})</p>
            <div className="space-y-1.5">
              {appointment.records.map(record => (
                <div
                  key={record._id}
                  className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg cursor-pointer hover:bg-emerald-100 transition"
                  onClick={() => setPreviewRecord(record)}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">{record.title}</span>
                    <span className="text-xs text-emerald-500">({record.type})</span>
                  </div>
                  <Eye size={14} className="text-emerald-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Full Patient History button */}
        {appointment.patientId && (
          <button
            onClick={() => {
              setSelectedPatient(appointment.patientId);
              fetchPatientHistory(appointment.patientId._id);
            }}
            className="mt-3 w-full text-sm bg-indigo-50 text-indigo-700 py-2 rounded-xl font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2"
          >
            <History size={14} />
            View Full Visit History
          </button>
        )}
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <ClipboardList size={22} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Patient Records</h2>
              <p className="text-sm text-slate-500">{data?.total || 0} visit records found</p>
            </div>
          </div>
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('doctor')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                viewMode === 'doctor' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Stethoscope size={14} className="inline mr-1" />
              By Doctor
            </button>
            <button
              onClick={() => setViewMode('date')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                viewMode === 'date' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              <CalendarDays size={14} className="inline mr-1" />
              By Date
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, email, or phone..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Doctor Filter */}
          <div className="relative">
            <Stethoscope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Doctors</option>
              {data?.doctors?.map(doc => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear Filters */}
          {(searchQuery || dateFilter || doctorFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setDateFilter(''); setDoctorFilter('all'); }}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition flex items-center gap-1"
            >
              <CloseIcon size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
        </div>
      ) : !data || data?.total === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FolderOpen size={32} className="text-slate-400" />
          </div>
          <p className="font-bold text-slate-500 mb-1">No records found</p>
          <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'doctor' ? (
        /* ===== GROUP BY DOCTOR ===== */
        <div className="space-y-4">
          {Object.entries(data.groupedByDoctor || {}).map(([doctorName, appointments], idx) => {
            const color = getDoctorColor(idx);
            const sectionKey = `doc_${doctorName}`;
            const isExpanded = expandedSections[sectionKey];
            const uniqueDates = [...new Set(appointments.map(a => a.appointmentDate))];

            return (
              <div key={doctorName} className={`${color.bg} border ${color.border} rounded-2xl overflow-hidden`}>
                {/* Doctor Header */}
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:opacity-80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${color.accent} rounded-full flex items-center justify-center text-white font-bold`}>
                      {doctorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h3 className={`font-bold ${color.text}`}>Dr. {doctorName}</h3>
                      <p className="text-xs text-slate-500">
                        {appointments.length} visit{appointments.length > 1 ? 's' : ''} across {uniqueDates.length} date{uniqueDates.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`${color.light} ${color.text} px-3 py-1 rounded-full text-xs font-bold`}>
                      {appointments.length} records
                    </span>
                    {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  </div>
                </button>

                {/* Appointments under this doctor */}
                {isExpanded && (
                  <div className="px-5 pb-4">
                    {/* Sub-group by date within doctor */}
                    {uniqueDates.sort().reverse().map(date => {
                      const dateAppts = appointments.filter(a => a.appointmentDate === date);
                      return (
                        <div key={date} className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CalendarDays size={14} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-600">{formatDate(date)}</span>
                            <span className="text-xs text-slate-400">({dateAppts.length} patient{dateAppts.length > 1 ? 's' : ''})</span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {dateAppts.map(renderAppointmentCard)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== GROUP BY DATE ===== */
        <div className="space-y-4">
          {Object.entries(data.groupedByDate || {}).sort(([a], [b]) => b.localeCompare(a)).map(([date, appointments]) => {
            const sectionKey = `date_${date}`;
            const isExpanded = expandedSections[sectionKey];
            const uniqueDoctors = [...new Set(appointments.map(a => a.doctor || 'Unassigned'))];

            return (
              <div key={date} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Date Header */}
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                      <CalendarDays size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">{formatDate(date)}</h3>
                      <p className="text-xs text-slate-500">
                        {appointments.length} patient{appointments.length > 1 ? 's' : ''} • {uniqueDoctors.length} doctor{uniqueDoctors.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                      {appointments.length} records
                    </span>
                    {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  </div>
                </button>

                {/* Appointments grouped by doctor within date */}
                {isExpanded && (
                  <div className="px-5 pb-4">
                    {uniqueDoctors.map((docName, dIdx) => {
                      const color = getDoctorColor(dIdx);
                      const docAppts = appointments.filter(a => (a.doctor || 'Unassigned') === docName);
                      return (
                        <div key={docName} className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-5 h-5 ${color.dot} rounded-full`}></div>
                            <span className={`text-sm font-bold ${color.text}`}>Dr. {docName}</span>
                            <span className="text-xs text-slate-400">({docAppts.length} patient{docAppts.length > 1 ? 's' : ''})</span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {docAppts.map(renderAppointmentCard)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Patient History Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                  {(selectedPatient.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedPatient.name || 'Patient'}</h2>
                  <p className="text-sm text-slate-500">{selectedPatient.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedPatient(null); setPatientHistory(null); }}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-indigo-600" size={28} />
              </div>
            ) : patientHistory ? (
              <div className="p-5 space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-400 uppercase">Total Visits</p>
                    <p className="text-3xl font-bold text-indigo-700">{patientHistory.totalVisits}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-400 uppercase">Total Reports</p>
                    <p className="text-3xl font-bold text-emerald-700">{patientHistory.totalRecords}</p>
                  </div>
                </div>

                {/* Visit Timeline */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <History size={18} className="text-indigo-600" />
                    Visit Timeline
                  </h3>
                  {patientHistory.appointments?.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No visits recorded</p>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                      
                      <div className="space-y-4">
                        {patientHistory.appointments.map((appt) => (
                          <div key={appt._id} className="relative pl-12">
                            {/* Timeline dot */}
                            <div className={`absolute left-3.5 w-3 h-3 rounded-full ${
                              appt.status === 'COMPLETED' ? 'bg-blue-500' :
                              appt.status === 'CONFIRMED' ? 'bg-green-500' :
                              'bg-slate-300'
                            }`}></div>

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <Calendar size={13} className="text-blue-500" />
                                  <span className="font-bold text-sm text-slate-900">{appt.appointmentDate}</span>
                                  <Clock size={13} className="text-orange-500" />
                                  <span className="text-sm text-slate-600">{appt.appointmentTime}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  appt.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                  appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{appt.status}</span>
                              </div>
                              
                              {appt.doctor && (
                                <div className="flex items-center gap-1.5 text-sm text-purple-600 mb-1">
                                  <Stethoscope size={12} />
                                  <span>Dr. {appt.doctor}</span>
                                </div>
                              )}
                              
                              {appt.reason && (
                                <p className="text-sm text-slate-500 mt-1">
                                  <span className="font-medium">Reason:</span> {appt.reason}
                                </p>
                              )}

                              {appt.queueNumber && (
                                <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-bold">
                                  Queue #{appt.queueNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reports */}
                {patientHistory.records?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText size={18} className="text-emerald-600" />
                      Reports Sent ({patientHistory.records.length})
                    </h3>
                    <div className="space-y-2">
                      {patientHistory.records.map(record => (
                        <div
                          key={record._id}
                          className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl cursor-pointer hover:bg-emerald-100 transition"
                          onClick={() => setPreviewRecord(record)}
                        >
                          <div>
                            <div className="font-semibold text-emerald-800">{record.title}</div>
                            <div className="text-xs text-emerald-500 flex items-center gap-2">
                              <span>{record.type}</span>
                              {record.doctor && <span>• Dr. {record.doctor}</span>}
                              {record.date && <span>• {new Date(record.date).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <Eye size={16} className="text-emerald-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Record Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">{previewRecord.title}</h3>
                <p className="text-sm text-slate-500">{previewRecord.type} {previewRecord.doctor && `• Dr. ${previewRecord.doctor}`}</p>
              </div>
              <button onClick={() => setPreviewRecord(null)} className="p-2 hover:bg-slate-100 rounded-full transition">
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="p-5">
              {previewRecord.image ? (
                <img
                  src={previewRecord.image}
                  alt={previewRecord.title}
                  className="w-full rounded-xl border border-slate-200"
                />
              ) : (
                <div className="text-center py-8 text-slate-400">No image/document attached</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecordsManager;
