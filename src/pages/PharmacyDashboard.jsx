import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Pill, User, Clock, CheckCircle, Loader2, LogOut, Menu, Search, Filter, Phone, Mail, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const PharmacyDashboard = () => {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const { socket } = useSocket();
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, COMPLETED
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!user || user.role !== 'PHARMACY') {
            navigate('/login');
            return;
        }
        fetchPrescriptions();
    }, [user]);

    useEffect(() => {
        if (socket) {
            socket.on('new_prescription', () => {
                toast.success('💊 New prescription received!');
                fetchPrescriptions();
            });
            return () => socket.off('new_prescription');
        }
    }, [socket]);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/api/prescriptions/pharmacy`, {
                headers: { 'x-auth-token': token }
            });
            setPrescriptions(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load prescriptions');
        } finally {
            setLoading(false);
        }
    };

    const dispensePrescription = async (id) => {
        try {
            await axios.put(`${API}/api/prescriptions/${id}/dispense`, {}, {
                headers: { 'x-auth-token': token }
            });
            toast.success('✅ Medicines Dispensed');
            fetchPrescriptions();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const filteredPrescriptions = prescriptions.filter(p => {
        const matchesSearch = (p.patientId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.patientId?.phone || '').includes(searchTerm);
        const matchesTab = p.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const pendingCount = prescriptions.filter(p => p.status === 'PENDING').length;
    const completedCount = prescriptions.filter(p => p.status === 'DISPENSED').length;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg sticky top-0 z-20">
                <div className="px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Pill size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{user?.name}</h1>
                            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Pharmacy Dashboard</p>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold text-sm transition">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>

            <div className="p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Search & Tabs */}
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                                <button
                                    onClick={() => setActiveTab('PENDING')}
                                    className={`flex-1 md:w-40 py-3 rounded-xl font-black text-sm transition ${activeTab === 'PENDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Pending ({pendingCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab('DISPENSED')}
                                    className={`flex-1 md:w-40 py-3 rounded-xl font-black text-sm transition ${activeTab === 'DISPENSED' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Completed ({completedCount})
                                </button>
                            </div>

                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search patient name or phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {activeTab === 'PENDING' ? <Clock className="text-blue-600" /> : <CheckCircle className="text-emerald-600" />}
                        {activeTab === 'PENDING' ? "Pending Prescriptions" : "Dispensing History"}
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-blue-600" size={40} />
                        </div>
                    ) : filteredPrescriptions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <Pill className="mx-auto text-slate-200 mb-4" size={64} />
                            <p className="text-slate-500 font-bold">No {activeTab.toLowerCase()} prescriptions found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredPrescriptions.map(p => (
                                <div key={p._id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition group">
                                    <div className={`px-6 py-4 flex justify-between items-center border-b border-slate-100 ${p.status === 'PENDING' ? 'bg-slate-50' : 'bg-emerald-50/30'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${p.status === 'PENDING' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                                {(p.patientId?.name || 'P')[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800">{p.patientId?.name || 'Unknown Patient'}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {p.status === 'PENDING' ? 'Added' : 'Dispensed'}: {new Date(p.updatedAt || p.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Patient Phone</span>
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                    <Phone size={14} className="text-blue-500" /> {p.patientId?.phone || 'No phone'}
                                                </div>
                                            </div>
                                            <div className="flex flex-col text-right items-end">
                                                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Prescribed By</span>
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                    Dr. {p.doctorName} <User size={14} className="text-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                                <Pill size={14} className="text-blue-500" /> Medicines Details
                                            </h4>
                                            <div className="space-y-4">
                                                {p.medicines.map((m, i) => (
                                                    <div key={i} className="flex justify-between items-start text-sm border-b border-white pb-3 last:border-0 last:pb-0">
                                                        <div className="flex-1">
                                                            <p className="font-bold text-slate-800 text-base">{m.name}</p>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                <span className="px-2 py-0.5 bg-white rounded text-[10px] font-bold text-blue-600 border border-blue-50">{m.dosage}</span>
                                                                <span className="px-2 py-0.5 bg-white rounded text-[10px] font-bold text-blue-600 border border-blue-50">{m.frequency}</span>
                                                                <span className="px-2 py-0.5 bg-white rounded text-[10px] font-bold text-blue-600 border border-blue-50">{m.duration} Days</span>
                                                            </div>
                                                            {m.instructions?.notes && (
                                                                <p className="text-[11px] text-slate-500 italic mt-2 bg-white p-2 rounded-lg border border-slate-100">
                                                                    " {m.instructions.notes} "
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-[10px] font-black px-2 py-0.5 rounded ${m.instructions?.beforeFood ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {m.instructions?.beforeFood ? 'BEFORE FOOD' : 'AFTER FOOD'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {p.status === 'PENDING' && (
                                            <button
                                                onClick={() => dispensePrescription(p._id)}
                                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={18} /> Mark as Dispensed
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PharmacyDashboard;
