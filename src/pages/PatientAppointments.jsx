import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Clock, User, FileText, Send, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const PatientAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ hospitalName: '', doctor: '', appointmentDate: '', appointmentTime: '', reason: '' });

  const token = localStorage.getItem('token');

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/appointments/patient`, { headers: { 'x-auth-token': token } });
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointments');
    } finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/appointments`, form, { headers: { 'x-auth-token': token } });
      toast.success('✅ Appointment requested');
      setForm({ hospitalName: '', doctor: '', appointmentDate: '', appointmentTime: '', reason: '' });
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error('❌ Booking failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition text-slate-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Book Appointment</h1>
      </div>

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
            <input value={form.doctor} onChange={e => setForm({ ...form, doctor: e.target.value })} placeholder="Doctor Name (optional)" className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input required value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} type="date" className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
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
          {appointments.map(a => (
            <div key={a._id} className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-slate-900">{a.doctor || 'Doctor'}</div>
                  <div className="text-sm text-slate-500">{a.reason}</div>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${a.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : a.status === 'CONFIRMED' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                  {a.status}
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
              {a.rejectionReason && <div className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">Reason: {a.rejectionReason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;
