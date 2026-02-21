import React, { useEffect, useState } from 'react';
import { Users, Hospital, BarChart2, UserCog, Shield, Activity, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, hospitals: 0, doctors: 0, records: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/api/admin/stats`, {
          headers: { 'x-auth-token': token }
        });
        setStats(res.data);
      } catch (err) {
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Admin Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
            <Users className="w-10 h-10 text-blue-500 mb-2" />
            <div className="text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : stats.users}</div>
            <div className="text-slate-500 mt-1">Total Users</div>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
            <Hospital className="w-10 h-10 text-green-500 mb-2" />
            <div className="text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : stats.hospitals}</div>
            <div className="text-slate-500 mt-1">Total Hospitals</div>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
            <UserCog className="w-10 h-10 text-purple-500 mb-2" />
            <div className="text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : stats.doctors}</div>
            <div className="text-slate-500 mt-1">Total Doctors</div>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
            <BarChart2 className="w-10 h-10 text-orange-500 mb-2" />
            <div className="text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : stats.records}</div>
            <div className="text-slate-500 mt-1">Health Records</div>
          </div>
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="bg-white rounded-2xl shadow p-8 mt-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Platform Insights
          </h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-2">
            <li>Monitor user and hospital growth in real time.</li>
            <li>See total doctors and health records managed on the platform.</li>
            <li>Future: Add controls for platform-wide announcements, user management, and analytics.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
