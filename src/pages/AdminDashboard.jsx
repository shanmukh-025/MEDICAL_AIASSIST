import React, { useEffect, useState } from 'react';
import { Users, Hospital, BarChart2, UserCog, Shield, Activity, Loader2, Trash2, Mail, Phone, MapPin, Search, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, hospitals: 0, doctors: 0, records: 0 });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/admin/stats`, {
        headers: { 'x-auth-token': token }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/admin/hospitals`, {
        headers: { 'x-auth-token': token }
      });
      console.log('🏥 Admin Dashboard: Fetched hospitals', res.data);
      if (Array.isArray(res.data)) {
        setHospitals(res.data);
      } else {
        console.error('Expected array for hospitals, got:', res.data);
        setHospitals([]);
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
      setError('Connection Error: Failed to load hospital records. Please check if the server is running.');
      toast.error('Network error while fetching hospitals');
    } finally {
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchHospitals()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleDeleteHospital = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}? This action cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/admin/hospitals/${id}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success(`${name} removed successfully`);
      setHospitals(hospitals.filter(h => h._id !== id));
      fetchStats(); // Update stats
    } catch (err) {
      toast.error('Failed to delete hospital');
    }
  };

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading Management Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <Shield className="w-10 h-10 text-blue-600" />
              Admin Portal
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic">Manage the future of rural healthcare</p>
          </div>
          <div className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-200 flex items-center gap-2">
            <Activity size={16} /> Real-time System Active
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="text-red-500" />
            <div className="flex-1">
              <p className="text-red-700 font-bold">{error}</p>
              <button onClick={() => window.location.reload()} className="text-red-600 text-xs font-black uppercase mt-1 hover:underline">Retry Connection</button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard icon={Users} color="blue" label="Total Patients" value={stats.users} />
          <StatCard icon={Hospital} color="emerald" label="Registered Hospitals" value={stats.hospitals} />
          <StatCard icon={UserCog} color="purple" label="Active Doctors" value={stats.doctors} />
          <StatCard icon={BarChart2} color="orange" label="Health Records" value={stats.records} />
        </div>

        {/* Hospital Management Section */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden mb-12">
          <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Hospital className="text-emerald-500" />
                Hospital Management
              </h2>
              <p className="text-slate-500 text-sm mt-1">Review and manage institutional access</p>
            </div>

            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-sm font-black text-slate-400 uppercase tracking-wider">Institution</th>
                  <th className="px-8 py-5 text-sm font-black text-slate-400 uppercase tracking-wider">Contact Details</th>
                  <th className="px-8 py-5 text-sm font-black text-slate-400 uppercase tracking-wider">Staff Count</th>
                  <th className="px-8 py-5 text-sm font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                          <AlertCircle size={32} />
                        </div>
                        <p className="text-slate-500 font-bold">No institutions found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((hospital) => (
                    <tr key={hospital._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center font-black text-lg border-2 border-white shadow-sm overflow-hidden">
                            {hospital.logo ? (
                              <img src={hospital.logo.startsWith('http') ? hospital.logo : `${API}${hospital.logo}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              hospital.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-800 text-lg leading-tight">{hospital.name}</div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1 font-bold">
                              <MapPin size={12} />
                              {hospital.address || 'Address not provided'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                            <Mail size={14} className="text-blue-500" />
                            {hospital.email}
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                            <Phone size={14} className="text-emerald-500" />
                            {hospital.phone || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-black border border-purple-100">
                            {hospital.doctors?.length || 0} Doctors
                          </div>
                          <div className="px-3 py-1 bg-sky-50 text-sky-600 rounded-lg text-xs font-black border border-sky-100">
                            {hospital.services?.length || 0} Services
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handleDeleteHospital(hospital._id, hospital.name)}
                          className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                          title="Remove Institution"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Guidelines */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <h2 className="text-3xl font-black mb-6 leading-tight">Platform Integrity & Security</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2">
                    <Shield size={24} className="text-blue-200" />
                    Strict Governance
                  </h3>
                  <p className="text-blue-50/80 text-sm leading-relaxed font-medium">
                    As an administrator, you have the power to remove institutions that violate platform terms or fail to meet subscription obligations.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2">
                    <HistoryIcon size={24} className="text-blue-200" />
                    Auto-Logging
                  </h3>
                  <p className="text-blue-50/80 text-sm leading-relaxed font-medium">
                    All administrative actions are recorded for transparency. Ensure deletions are justified by internal audit records.
                  </p>
                </div>
              </div>
            </div>
            <div className="w-64 h-64 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-3xl animate-pulse">
              <Shield size={120} className="text-white/20" />
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, color, label, value }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all border border-slate-100 p-8 flex flex-col items-center group cursor-default">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${colors[color]}`}>
        <Icon size={32} />
      </div>
      <div className="text-4xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-slate-400 mt-2 font-bold text-sm uppercase tracking-widest">{label}</div>
    </div>
  );
};

const HistoryIcon = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

export default AdminDashboard;
