import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FileText, Pill, Calendar, User, ArrowLeft, Loader2, Download, ExternalLink, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const PrescriptionList = () => {
    const navigate = useNavigate();
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/api/prescriptions/patient`, {
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

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-600 font-bold hover:text-slate-900 transition"
                >
                    <ArrowLeft size={20} /> Back
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">My Prescriptions</h1>
                        <p className="text-slate-500 font-medium">Digital prescriptions from your doctors</p>
                    </div>
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                        <FileText size={24} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-emerald-600" size={40} />
                    </div>
                ) : prescriptions.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <FileText className="mx-auto text-slate-200 mb-4" size={64} />
                        <p className="text-slate-500 font-bold">No prescriptions found yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {prescriptions.map((p) => (
                            <div key={p._id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">{p.diagnosis || 'General Consultation'}</h2>
                                        <p className="text-sm text-slate-500 font-bold">Dr. {p.doctorName} • {p.hospitalName || 'Health Center'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{new Date(p.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Pill size={14} /> Prescribed Medicines
                                    </h3>
                                    {p.medicines.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                                            <div>
                                                <p className="font-bold text-slate-800">{m.name} ({m.dosage})</p>
                                                <p className="text-xs text-slate-500">{m.frequency} • {m.duration} days {m.instructions?.beforeFood ? '• Before food' : '• After food'}</p>
                                            </div>
                                            <div className="text-xs font-bold text-emerald-600">
                                                {p.status === 'DISPENSED' ? 'Dispensed' : 'Pending'}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {p.specialInstructions && (
                                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Doctor's Advice</p>
                                        <p className="text-xs text-emerald-700 font-medium">{p.specialInstructions}</p>
                                    </div>
                                )}

                                {p.symptoms && p.symptoms.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {p.symptoms.map((s, idx) => (
                                            <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                <Activity size={10} /> {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrescriptionList;
