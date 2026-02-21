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

    const filteredPrescriptions = prescriptions.filter(p =>
        p.patientId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientId?.phone?.includes(searchTerm)
    );

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
                    {/* Stats & Search */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Pending</p>
                                    <p className="text-xl font-black text-slate-800">{prescriptions.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search patient name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> Pending Prescriptions
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-blue-600" size={40} />
                        </div>
                    ) : filteredPrescriptions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <Pill className="mx-auto text-slate-200 mb-4" size={64} />
                            <p className="text-slate-500 font-bold">No pending prescriptions found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredPrescriptions.map(p => (
                                <div key={p._id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition group">
                                    <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {p.patientId?.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{p.patientId?.name}</h3>
                                                <p className="text-xs text-slate-500 font-medium">Received {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(p.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full uppercase">Pending</span>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-blue-500" /> {p.patientId?.phone || 'No phone'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-blue-500" /> Dr. {p.doctorName}
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 rounded-2xl p-4">
                                            <h4 className="text-xs font-black text-blue-800 uppercase mb-3 flex items-center gap-2">
                                                <Pill size={14} /> Prescribed Medicines
                                            </h4>
                                            <div className="space-y-3">
                                                {p.medicines.map((m, i) => (
                                                    <div key={i} className="flex justify-between items-start text-sm">
                                                        <div className="flex-1">
                                                            <p className="font-bold text-slate-800">{m.name}</p>
                                                            <p className="text-xs text-slate-500 italic mt-0.5">
                                                                {m.dosage} • {m.frequency} • {m.duration} days
                                                                {m.instructions?.beforeFood ? ' • Before food' : ' • After food'}
                                                            </p>
                                                            {m.instructions?.notes && (
                                                                <p className="text-[10px] text-blue-600 mt-1 font-medium bg-white/50 px-2 py-0.5 rounded-lg inline-block">
                                                                    Note: {m.instructions.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {p.specialInstructions && (
                                            <div className="text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Doctor's Instructions</p>
                                                {p.specialInstructions}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => dispensePrescription(p._id)}
                                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Mark as Dispensed
                                        </button>
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
