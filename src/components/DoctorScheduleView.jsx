import React, { useState, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Grid3X3, List, Clock,
  User, Bell, CheckCircle, XCircle, AlertTriangle, Loader2,
  UserCircle, Stethoscope, Phone, Mail
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Generate time slot label from 24h hour
const slotLabel = (h) => {
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:00 ${ampm}`;
};

// Default time slots from 8:00 AM to 6:00 PM
const DEFAULT_TIME_SLOTS = [];
for (let h = 8; h <= 18; h++) {
  DEFAULT_TIME_SLOTS.push({ hour: h, label: slotLabel(h), key: `${String(h).padStart(2, '0')}:00` });
}

// Pastel colors for doctor columns
const DOCTOR_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-400' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', accent: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-400' },
];

const STATUS_STYLES = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'Pending' },
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'Confirmed' },
  CHECKED_IN: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Checked In' },
  IN_PROGRESS: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: 'In Progress' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'Completed' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Cancelled' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Rejected' },
};

// Parse appointment time to hour (e.g., "09:30 AM" -> 9, "02:00 PM" -> 14)
const parseTimeToHour = (timeStr) => {
  if (!timeStr) return 9;
  // Handle "HH:MM" format
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return parseInt(match24[1]);
  // Handle "HH:MM AM/PM" format
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h;
  }
  return 9;
};

const DoctorScheduleView = ({ appointments, doctors, notifications, onApprove, onReject, onComplete, onSendReminder }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [showNotifications, setShowNotifications] = useState(true);

  // Navigate dates
  const changeDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => setSelectedDate(new Date().toISOString().split('T')[0]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Format date for display
  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [selectedDate]);

  // Get unique doctor names — merge profile doctors + appointment doctor names
  const doctorList = useMemo(() => {
    const profileDoctors = (doctors || []).map(d => ({
      name: d.name,
      specialty: d.specialty || '',
      qualification: d.qualification || '',
    }));

    // Find any doctor names from appointments not in profile
    const profileNames = new Set(profileDoctors.map(d => d.name.toLowerCase()));
    const extraDoctors = [];
    (appointments || []).forEach(a => {
      if (a.doctor && !profileNames.has(a.doctor.toLowerCase())) {
        profileNames.add(a.doctor.toLowerCase());
        extraDoctors.push({ name: a.doctor, specialty: '', qualification: '' });
      }
    });

    const all = [...profileDoctors, ...extraDoctors];
    // If no doctors at all, add a default
    if (all.length === 0) {
      all.push({ name: 'Dr. Duty Medical Officer', specialty: 'General', qualification: '' });
    }
    return all;
  }, [doctors, appointments]);

  // Filter appointments for selected date
  const dayAppointments = useMemo(() => {
    return (appointments || []).filter(a =>
      a.appointmentDate === selectedDate &&
      !['REJECTED', 'CANCELLED'].includes(a.status)
    );
  }, [appointments, selectedDate]);

  // Build time slots dynamically — include default 8AM-6PM range plus any hours with actual appointments
  const TIME_SLOTS = useMemo(() => {
    const hoursSet = new Set(DEFAULT_TIME_SLOTS.map(s => s.hour));
    dayAppointments.forEach(a => {
      const h = parseTimeToHour(a.appointmentTime);
      hoursSet.add(h);
    });
    const sorted = Array.from(hoursSet).sort((a, b) => a - b);
    return sorted.map(h => ({ hour: h, label: slotLabel(h), key: `${String(h).padStart(2, '0')}:00` }));
  }, [dayAppointments]);

  // Group appointments by doctor
  const appointmentsByDoctor = useMemo(() => {
    const map = {};
    doctorList.forEach(d => { map[d.name] = []; });

    dayAppointments.forEach(a => {
      const docName = a.doctor || doctorList[0]?.name || 'Unassigned';
      if (!map[docName]) map[docName] = [];
      map[docName].push(a);
    });

    // Sort each doctor's appointments by time
    Object.keys(map).forEach(doc => {
      map[doc].sort((a, b) => parseTimeToHour(a.appointmentTime) - parseTimeToHour(b.appointmentTime));
    });

    return map;
  }, [dayAppointments, doctorList]);

  // Get appointment at a specific time slot for a doctor
  const getAppointmentsAtSlot = (doctorName, slotHour) => {
    const docAppts = appointmentsByDoctor[doctorName] || [];
    return docAppts.filter(a => parseTimeToHour(a.appointmentTime) === slotHour);
  };

  // Pending notifications (most recent first)
  const recentNotifications = useMemo(() => {
    return (notifications || []).slice(0, 15);
  }, [notifications]);

  // Count stats
  const stats = useMemo(() => {
    const pending = dayAppointments.filter(a => a.status === 'PENDING').length;
    const confirmed = dayAppointments.filter(a => ['CONFIRMED', 'CHECKED_IN'].includes(a.status)).length;
    const inProgress = dayAppointments.filter(a => a.status === 'IN_PROGRESS').length;
    const completed = dayAppointments.filter(a => a.status === 'COMPLETED').length;
    return { total: dayAppointments.length, pending, confirmed, inProgress, completed };
  }, [dayAppointments]);

  return (
    <div className="flex gap-0 lg:gap-4">
      {/* Main Schedule Area */}
      <div className={`flex-1 min-w-0 ${showNotifications ? '' : ''}`}>
        {/* Top Bar — Date Navigation + View Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Date Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition ${isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Today
              </button>
              <div className="flex items-center bg-slate-100 rounded-xl">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-200 rounded-l-xl transition">
                  <ChevronLeft size={18} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent px-2 py-1.5 text-sm font-bold text-slate-800 outline-none w-[140px]"
                />
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-200 rounded-r-xl transition">
                  <ChevronRight size={18} />
                </button>
              </div>
              <span className="text-sm text-slate-500 hidden md:inline">{formattedDate}</span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Stats Pills */}
              <div className="hidden md:flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-bold">{stats.pending} Pending</span>
                <span className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold">{stats.confirmed} Confirmed</span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">{stats.completed} Done</span>
              </div>
              {/* View Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                  title="Grid View"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>
              {/* Notification Toggle */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 rounded-xl transition ${showNotifications ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Bell size={16} />
                {recentNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {Math.min(recentNotifications.length, 9)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Doctor Profiles Row */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${doctorList.length}, minmax(180px, 1fr))` }}>
            {/* Empty corner cell */}
            <div className="p-3 border-b border-r border-slate-200 bg-slate-50"></div>
            {/* Doctor Headers */}
            {doctorList.map((doc, i) => {
              const color = DOCTOR_COLORS[i % DOCTOR_COLORS.length];
              const docApptCount = (appointmentsByDoctor[doc.name] || []).length;
              return (
                <div key={doc.name} className={`p-4 border-b border-r border-slate-200 ${color.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${color.accent} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                      {doc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{doc.name}</h3>
                      <p className={`text-xs font-medium ${color.text} truncate`}>{doc.specialty || 'General'}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.light} ${color.text}`}>
                      {docApptCount} patient{docApptCount !== 1 ? 's' : ''} today
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Grid or List */}
        {viewMode === 'grid' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${doctorList.length}, minmax(180px, 1fr))` }}>
              {TIME_SLOTS.map((slot) => (
                <React.Fragment key={slot.key}>
                  {/* Time Label */}
                  <div className="px-3 py-4 border-b border-r border-slate-100 bg-slate-50 text-xs font-bold text-slate-400 sticky left-0 z-10">
                    {slot.label}
                  </div>
                  {/* Doctor cells for this time slot */}
                  {doctorList.map((doc, di) => {
                    const slotAppts = getAppointmentsAtSlot(doc.name, slot.hour);
                    const color = DOCTOR_COLORS[di % DOCTOR_COLORS.length];
                    return (
                      <div key={`${doc.name}-${slot.key}`} className="border-b border-r border-slate-100 p-1 min-h-[60px] relative group hover:bg-slate-50/50 transition">
                        {slotAppts.map((appt) => {
                          const statusStyle = STATUS_STYLES[appt.status] || STATUS_STYLES.PENDING;
                          return (
                            <div
                              key={appt._id}
                              className={`${color.bg} border-l-4 ${color.border} rounded-lg p-2 mb-1 cursor-pointer hover:shadow-md transition-all group/card`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 text-xs truncate">
                                    {appt.patientName || appt.patientId?.name || 'Patient'}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">{appt.reason || 'Consultation'}</p>
                                </div>
                                <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                  {statusStyle.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                <Clock size={10} />
                                <span>{appt.appointmentTime}</span>
                                {appt.queueNumber && (
                                  <span className="ml-auto bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold text-[9px]">
                                    Q#{appt.queueNumber}
                                  </span>
                                )}
                              </div>
                              {/* Quick Actions */}
                              {appt.status === 'PENDING' && (
                                <div className="flex gap-1 mt-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onApprove(appt._id); }}
                                    className="flex-1 text-[10px] font-bold bg-green-500 text-white py-1 rounded text-center hover:bg-green-600 transition"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onReject(appt._id); }}
                                    className="flex-1 text-[10px] font-bold bg-red-500 text-white py-1 rounded text-center hover:bg-red-600 transition"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onSendReminder(appt._id, appt.patientName || appt.patientId?.name || 'Patient'); }}
                                    className="text-[10px] font-bold bg-emerald-100 text-emerald-600 py-1 px-2 rounded hover:bg-emerald-200 transition"
                                    title="Send reminder"
                                  >
                                    <Bell size={12} />
                                  </button>
                                </div>
                              )}
                              {['CONFIRMED', 'CHECKED_IN'].includes(appt.status) && (
                                <div className="flex gap-1 mt-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onComplete(appt._id); }}
                                    className="flex-1 text-[10px] font-bold bg-blue-500 text-white py-1 rounded text-center hover:bg-blue-600 transition"
                                  >
                                    Complete
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onSendReminder(appt._id, appt.patientName || appt.patientId?.name || 'Patient'); }}
                                    className="text-[10px] font-bold bg-emerald-100 text-emerald-600 py-1 px-2 rounded hover:bg-emerald-200 transition"
                                    title="Send reminder"
                                  >
                                    <Bell size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          /* List View — grouped by doctor */
          <div className="space-y-4">
            {doctorList.map((doc, di) => {
              const color = DOCTOR_COLORS[di % DOCTOR_COLORS.length];
              const docAppts = appointmentsByDoctor[doc.name] || [];
              return (
                <div key={doc.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Doctor Header */}
                  <div className={`${color.bg} px-5 py-4 border-b ${color.border} flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-full ${color.accent} flex items-center justify-center text-white font-bold text-sm`}>
                      {doc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{doc.name}</h3>
                      <p className={`text-xs font-medium ${color.text}`}>{doc.specialty || 'General'}</p>
                    </div>
                    <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${color.light} ${color.text}`}>
                      {docAppts.length} patient{docAppts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Appointments List */}
                  {docAppts.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">No appointments</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {docAppts.map(appt => {
                        const statusStyle = STATUS_STYLES[appt.status] || STATUS_STYLES.PENDING;
                        return (
                          <div key={appt._id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition">
                            {/* Time */}
                            <div className="w-20 text-right">
                              <span className="text-sm font-bold text-slate-600">{appt.appointmentTime}</span>
                            </div>
                            {/* Color line */}
                            <div className={`w-1 h-10 rounded-full ${color.accent}`}></div>
                            {/* Patient info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">
                                {appt.patientName || appt.patientId?.name || 'Patient'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{appt.reason || 'Consultation'}</p>
                            </div>
                            {/* Status */}
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} shrink-0`}>
                              {statusStyle.label}
                            </span>
                            {/* Queue */}
                            {appt.queueNumber && (
                              <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg shrink-0">
                                Q#{appt.queueNumber}
                              </span>
                            )}
                            {/* Actions */}
                            <div className="flex gap-1.5 shrink-0">
                              {appt.status === 'PENDING' && (
                                <>
                                  <button onClick={() => onApprove(appt._id)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition" title="Accept">
                                    <CheckCircle size={16} />
                                  </button>
                                  <button onClick={() => onReject(appt._id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition" title="Decline">
                                    <XCircle size={16} />
                                  </button>
                                  <button onClick={() => onSendReminder(appt._id, appt.patientName || appt.patientId?.name || 'Patient')} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition" title="Send reminder">
                                    <Bell size={16} />
                                  </button>
                                </>
                              )}
                              {['CONFIRMED', 'CHECKED_IN'].includes(appt.status) && (
                                <>
                                  <button onClick={() => onComplete(appt._id)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition" title="Complete">
                                    <CheckCircle size={16} />
                                  </button>
                                  <button onClick={() => onSendReminder(appt._id, appt.patientName || appt.patientId?.name || 'Patient')} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition" title="Send reminder">
                                    <Bell size={16} />
                                  </button>
                                </>
                              )}
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
      </div>

      {/* Notification Panel — Right Sidebar */}
      {showNotifications && (
        <div className="hidden lg:block w-80 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-24" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Bell size={16} className="text-blue-600" />
                Notifications
              </h3>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                {recentNotifications.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  <Bell size={24} className="mx-auto mb-2 opacity-40" />
                  No notifications
                </div>
              ) : (
                recentNotifications.map((n, i) => {
                  // Detect notification type from message content
                  const isNewAppt = n.message?.toLowerCase().includes('new appointment') || n.message?.toLowerCase().includes('booked');
                  const isCancelled = n.message?.toLowerCase().includes('cancelled');
                  const isAccepted = n.message?.toLowerCase().includes('accepted') || n.message?.toLowerCase().includes('confirmed');

                  // Extract patient name if present
                  const nameMatch = n.message?.match(/from\s+(.+?)(?:\s+on|\s+has|\.|$)/i);
                  const patientName = nameMatch ? nameMatch[1] : null;

                  // Extract date/time
                  const dateMatch = n.message?.match(/on\s+(\d{4}-\d{2}-\d{2})/);
                  const timeMatch = n.message?.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);

                  return (
                    <div key={n._id || i} className={`p-4 hover:bg-slate-50 transition ${!n.read ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isCancelled ? 'bg-red-100 text-red-500' :
                          isNewAppt ? 'bg-blue-100 text-blue-500' :
                          isAccepted ? 'bg-green-100 text-green-500' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {isCancelled ? <XCircle size={14} /> :
                           isNewAppt ? <Calendar size={14} /> :
                           isAccepted ? <CheckCircle size={14} /> :
                           <Bell size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          {isNewAppt && (
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-blue-600">New Appointment Request</span>
                              {/* Accept/Decline buttons for new appointments */}
                            </div>
                          )}
                          <p className="text-sm text-slate-700 leading-snug">
                            {patientName && <span className="font-bold text-slate-900">{patientName}</span>}
                            {patientName ? ` — ${n.message.replace(new RegExp(`.*?${patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), '').trim()}` : n.message}
                          </p>
                          {(dateMatch || timeMatch) && (
                            <div className="flex items-center gap-3 mt-1.5">
                              {dateMatch && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <Calendar size={10} /> {dateMatch[1]}
                                </span>
                              )}
                              {timeMatch && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <Clock size={10} /> {timeMatch[1]}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorScheduleView;
