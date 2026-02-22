import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    ArrowLeft, CheckCircle, XCircle, Calendar, Clock, User,
    Loader2, Check, Phone, FileText, LogOut, Menu, Activity, Stethoscope, Pill, Plus, X, AlignLeft, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import AudioCall from '../components/AudioCall';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('TODAY'); // TODAY, PENDING, COMPLETED
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const token = localStorage.getItem('token');
    const { socket } = useSocket();
    const [showIncomingCall, setShowIncomingCall] = useState(false);
    const [incomingCallData, setIncomingCallData] = useState(null);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [prescriptionForm, setPrescriptionForm] = useState({
        diagnosis: '',
        pharmacyId: '',
        medicines: [{ name: '', dosage: '', frequency: 'twice', duration: 5, instructions: { beforeFood: false, afterFood: true, notes: '' } }],
        specialInstructions: '',
        symptoms: []
    });
    const [newSymptom, setNewSymptom] = useState('');
    const [hospitalPharmacies, setHospitalPharmacies] = useState([]);
    const [selectedDateFilter, setSelectedDateFilter] = useState(new Date().toLocaleDateString('en-CA'));

    const initiateCall = (patientId, patientName) => {
        if (!socket) {
            toast.error('Connection not ready. Try again.');
            return;
        }
        setIncomingCallData({
            from: patientId,
            name: patientName,
            isOutgoing: true
        });
        setShowIncomingCall(true);
    };

    useEffect(() => {
        if (!user || user.role !== 'DOCTOR') {
            navigate('/login');
            return;
        }
        fetchAppointments();
        fetchHospitalPharmacies();
    }, [user]);

    const fetchHospitalPharmacies = async () => {
        if (!user) return;
        try {
            console.log('🏥 Fetching hospital pharmacies...');
            const res = await axios.get(`${API}/api/hospitals/profile`, {
                headers: { 'x-auth-token': token }
            });
            console.log('🏥 Hospital Profile Response:', res.data);
            // Extract registered pharmacies from hospital profile
            if (res.data && res.data.pharmacies) {
                const registered = res.data.pharmacies.filter(p => p.isRegistered && p.userId);
                console.log('💊 Registered & Linked Pharmacies:', registered);
                setHospitalPharmacies(registered);
            }
        } catch (err) {
            console.error('❌ Failed to fetch pharmacies:', err);
        }
    };

    // Socket for calls
    useEffect(() => {
        if (socket && user) {
            const doctorRoomId = `user_${user.id}`;
            socket.emit('join', doctorRoomId);

            if (user.hospitalId) {
                const hospitalRoomId = `hospital_${user.hospitalId}`;
                socket.emit('join', hospitalRoomId);
                console.log('👨‍⚕️ Doctor joined hospital room:', hospitalRoomId);
            }

            const handleCallOffer = ({ from, callType, callerName }) => {
                setIncomingCallData({ from, callType, name: callerName || 'Patient' });
                setShowIncomingCall(true);
                toast.success(`📞 Incoming call from ${callerName || 'patient'}!`);
            };

            socket.on('call:offer', handleCallOffer);

            const handleQueueUpdate = () => {
                console.log('🔄 Queue updated, re-fetching...');
                fetchAppointments();
            };
            socket.on('queueUpdated', handleQueueUpdate);

            return () => {
                socket.off('call:offer', handleCallOffer);
                socket.off('queueUpdated', handleQueueUpdate);
            };
        }
    }, [socket, user]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            // We'll need a new endpoint for this
            const res = await axios.get(`${API}/api/appointments/doctor`, {
                headers: { 'x-auth-token': token }
            });
            setAppointments(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const approve = async (id) => {
        try {
            await axios.put(`${API}/api/appointments/${id}/approve`, {}, { headers: { 'x-auth-token': token } });
            toast.success('✅ Approved');
            fetchAppointments();
        } catch (err) {
            toast.error('Failed');
        }
    };

    const complete = async (id) => {
        try {
            await axios.put(`${API}/api/appointments/${id}/complete`, {}, { headers: { 'x-auth-token': token } });
            toast.success('✅ Visit Completed');
            fetchAppointments();
        } catch (err) {
            toast.error('Failed');
        }
    };

    const submitPrescription = async () => {
        try {
            if (!prescriptionForm.diagnosis || prescriptionForm.medicines.some(m => !m.name || !m.dosage)) {
                toast.error('Please fill in diagnosis and medicine details');
                return;
            }

            if (hospitalPharmacies.length > 0 && !prescriptionForm.pharmacyId) {
                toast.error('⚠️ Please select a target pharmacy from the dropdown.');
                return;
            }

            console.log('💊 Target Pharmacy ID:', prescriptionForm.pharmacyId);

            const pId = selectedAppt.patientId?._id || selectedAppt.patientId;
            if (!pId) {
                toast.error('Could not identify patient. Please refresh.');
                return;
            }

            const data = {
                patientId: pId,
                appointmentId: selectedAppt._id,
                diagnosis: prescriptionForm.diagnosis,
                medicines: prescriptionForm.medicines,
                specialInstructions: prescriptionForm.specialInstructions,
                symptoms: prescriptionForm.symptoms,
                pharmacyId: prescriptionForm.pharmacyId
            };

            console.log('🚀 Sending prescription:', data);

            const res = await axios.post(`${API}/api/prescriptions`, data, {
                headers: { 'x-auth-token': token }
            });

            console.log('✅ Prescription Response:', res.data);
            toast.success('🚀 Prescription sent to Patient & Pharmacy');
            setShowPrescriptionModal(false);
            resetPrescriptionForm();
        } catch (err) {
            const errMsg = err.response?.data?.msg || err.message || 'Failed to send prescription';
            toast.error(errMsg, { duration: 6000 });
        }
    };

    const resetPrescriptionForm = () => {
        setPrescriptionForm({
            diagnosis: '',
            pharmacyId: '',
            medicines: [{ name: '', dosage: '', frequency: 'twice', duration: 5, instructions: { beforeFood: false, afterFood: true, notes: '' } }],
            specialInstructions: '',
            symptoms: []
        });
        setNewSymptom('');
    };

    const addMedicine = () => {
        setPrescriptionForm(prev => ({
            ...prev,
            medicines: [...prev.medicines, { name: '', dosage: '', frequency: 'twice', duration: 5, instructions: { beforeFood: false, afterFood: true, notes: '' } }]
        }));
    };

    const removeMedicine = (index) => {
        if (prescriptionForm.medicines.length > 1) {
            const newMeds = prescriptionForm.medicines.filter((_, i) => i !== index);
            setPrescriptionForm(prev => ({ ...prev, medicines: newMeds }));
        }
    };

    const addSymptom = () => {
        if (newSymptom.trim()) {
            setPrescriptionForm(prev => ({
                ...prev,
                symptoms: [...prev.symptoms, newSymptom.trim()]
            }));
            setNewSymptom('');
        }
    };

    const removeSymptom = (index) => {
        const newSymptoms = prescriptionForm.symptoms.filter((_, i) => i !== index);
        setPrescriptionForm(prev => ({ ...prev, symptoms: newSymptoms }));
    };

    // Use local date for "Today" filter, not UTC
    const today = new Date().toLocaleDateString('en-CA');

    const filteredAppointments = appointments.filter(a => {
        if (activeTab === 'TODAY') return a.appointmentDate === today && a.status !== 'COMPLETED' && a.status !== 'REJECTED';
        if (activeTab === 'PENDING') return a.status === 'PENDING';
        if (activeTab === 'COMPLETED') return a.status === 'COMPLETED';
        if (activeTab === 'SCHEDULING') return a.appointmentDate === selectedDateFilter;
        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarVisible(!sidebarVisible)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Dr. {user?.name}</h1>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Doctor Dashboard</p>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 text-red-600 font-bold text-sm">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>

            <div className="flex">
                {/* Sidebar */}
                {sidebarVisible && (
                    <div className="w-64 bg-white border-r border-slate-200 min-h-screen p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('TODAY')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'TODAY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Activity size={18} /> Today's Patients
                        </button>
                        <button
                            onClick={() => setActiveTab('PENDING')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'PENDING' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Clock size={18} /> Pending Requests
                        </button>
                        <button
                            onClick={() => setActiveTab('COMPLETED')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'COMPLETED' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <CheckCircle size={18} /> Completed
                        </button>
                        <button
                            onClick={() => setActiveTab('SCHEDULING')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'SCHEDULING' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Calendar size={18} /> Scheduling
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 p-6">
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">
                                {activeTab === 'TODAY' ? "Today's Schedule" :
                                    activeTab === 'PENDING' ? "Pending Requests" :
                                        activeTab === 'SCHEDULING' ? "Daily Schedule" : "Waitlist History"}
                            </h2>
                            {activeTab === 'SCHEDULING' && (
                                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200">
                                    <Calendar size={16} className="text-slate-400" />
                                    <input
                                        type="date"
                                        className="text-sm font-bold bg-transparent outline-none"
                                        value={selectedDateFilter}
                                        onChange={(e) => setSelectedDateFilter(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                                <p className="text-slate-500 font-medium">No appointments found for this section.</p>
                            </div>
                        ) : (
                            filteredAppointments.map(appt => (
                                <div key={appt._id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 transition hover:shadow-md">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xl">
                                                {(appt.patientId?.name || appt.patientName || 'P')[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">{appt.patientId?.name || appt.patientName}</h3>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                                                    <span className="flex items-center gap-1 text-slate-700"><Clock size={12} className="text-emerald-500" /> {appt.appointmentTime}</span>
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {appt.appointmentDate}</span>
                                                    {(appt.patientId?.phone || appt.phone) && <span className="flex items-center gap-1"><Phone size={12} /> {appt.patientId?.phone || appt.phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${appt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                                appt.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {appt.status}
                                        </div>
                                    </div>

                                    {appt.reason && (
                                        <div className="mt-4 bg-slate-50 p-3 rounded-xl text-sm text-slate-700 border border-slate-100">
                                            <span className="font-bold text-slate-500 mr-2">REASON:</span> {appt.reason}
                                        </div>
                                    )}

                                    <div className="mt-6 flex gap-3">
                                        {appt.status === 'PENDING' && (
                                            <button onClick={() => approve(appt._id)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition">
                                                Approve Appointment
                                            </button>
                                        )}
                                        {(appt.status === 'CONFIRMED' || appt.status === 'CHECKED_IN') && (
                                            <button onClick={() => complete(appt._id)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition">
                                                Mark as Completed
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedAppt(appt);
                                                setShowPrescriptionModal(true);
                                            }}
                                            className="flex-1 bg-white text-emerald-700 border border-emerald-200 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                                        >
                                            <FileText size={18} />
                                            Write Prescription
                                        </button>
                                        <button
                                            onClick={() => initiateCall(appt.patientId?._id || appt.patientId, appt.patientName || 'Patient')}
                                            className="px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 py-3 rounded-xl font-bold text-sm hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                                            title="Call for Revisit"
                                        >
                                            <Phone size={18} />
                                            <span className="hidden sm:inline">Call</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {showIncomingCall && incomingCallData && (
                <AudioCall
                    recipientId={incomingCallData.from}
                    recipientName={incomingCallData.name}
                    isIncoming={!incomingCallData.isOutgoing}
                    socket={socket}
                    onClose={() => { setShowIncomingCall(false); setIncomingCallData(null); }}
                />
            )}

            {/* Prescription Modal */}
            {showPrescriptionModal && selectedAppt && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                                    <Stethoscope size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Write Prescription</h3>
                                    <p className="text-xs font-bold text-emerald-600 uppercase">Patient: {selectedAppt.patientName || selectedAppt.patientId?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPrescriptionModal(false)} className="p-2 hover:bg-white rounded-full transition text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Pharmacy Selection Section */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Send To Pharmacy <span className="text-red-500">*</span>
                                </label>
                                {hospitalPharmacies.length > 0 ? (
                                    <div className="relative">
                                        <Pill className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <select
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition appearance-none"
                                            value={prescriptionForm.pharmacyId}
                                            required
                                            onChange={e => setPrescriptionForm({ ...prescriptionForm, pharmacyId: e.target.value })}
                                        >
                                            <option value="">-- Select Target Pharmacy --</option>
                                            {hospitalPharmacies.map(p => (
                                                <option key={p.userId} value={p.userId}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs font-bold flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        No registered pharmacies found for this hospital.
                                        Please add them in Hospital Dashboard.
                                    </div>
                                )}
                            </div>

                            {/* Diagnosis Section */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Diagnosis / Condition</label>
                                <div className="relative">
                                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input
                                        type="text"
                                        placeholder="e.g. Viral Fever, Hypertension..."
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition"
                                        value={prescriptionForm.diagnosis}
                                        onChange={e => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Medicines Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Prescribed Medicines</label>
                                    <button
                                        onClick={addMedicine}
                                        className="text-xs font-black text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition"
                                    >
                                        <Plus size={14} /> Add Medicine
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {prescriptionForm.medicines.map((med, i) => (
                                        <div key={i} className="bg-slate-50 rounded-3xl p-5 border border-slate-100 relative group animate-in slide-in-from-top-2">
                                            {prescriptionForm.medicines.length > 1 && (
                                                <button
                                                    onClick={() => removeMedicine(i)}
                                                    className="absolute -top-2 -right-2 bg-white text-red-500 shadow-md p-1.5 rounded-full hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Medicine name"
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500"
                                                        value={med.name}
                                                        onChange={e => {
                                                            const newMeds = [...prescriptionForm.medicines];
                                                            newMeds[i].name = e.target.value;
                                                            setPrescriptionForm({ ...prescriptionForm, medicines: newMeds });
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Dosage (e.g. 500mg)"
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500"
                                                        value={med.dosage}
                                                        onChange={e => {
                                                            const newMeds = [...prescriptionForm.medicines];
                                                            newMeds[i].dosage = e.target.value;
                                                            setPrescriptionForm({ ...prescriptionForm, medicines: newMeds });
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                                <select
                                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                                                    value={med.frequency}
                                                    onChange={e => {
                                                        const newMeds = [...prescriptionForm.medicines];
                                                        newMeds[i].frequency = e.target.value;
                                                        setPrescriptionForm({ ...prescriptionForm, medicines: newMeds });
                                                    }}
                                                >
                                                    <option value="once">Once daily</option>
                                                    <option value="twice">Twice daily</option>
                                                    <option value="thrice">Thrice daily</option>
                                                    <option value="four-times">Four times daily</option>
                                                </select>

                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl">
                                                    <input
                                                        type="number"
                                                        className="w-10 text-center font-bold text-sm focus:outline-none"
                                                        value={med.duration}
                                                        onChange={e => {
                                                            const newMeds = [...prescriptionForm.medicines];
                                                            newMeds[i].duration = parseInt(e.target.value) || 0;
                                                            setPrescriptionForm({ ...prescriptionForm, medicines: newMeds });
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Days</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 mt-4">
                                                <label className="flex items-center gap-2 cursor-pointer group/check">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition ${med.instructions.beforeFood ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200 group-hover/check:border-emerald-400'}`}>
                                                        {med.instructions.beforeFood && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={med.instructions.beforeFood}
                                                        onChange={e => {
                                                            const newMeds = [...prescriptionForm.medicines];
                                                            newMeds[i].instructions.beforeFood = e.target.checked;
                                                            if (e.target.checked) newMeds[i].instructions.afterFood = false;
                                                            setPrescriptionForm({ ...prescriptionForm, medicines: newMeds });
                                                        }}
                                                    />
                                                    <span className="text-xs font-bold text-slate-600">Before food</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer group/check">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition ${med.instructions.afterFood ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200 group-hover/check:border-emerald-400'}`}>
                                                        {med.instructions.afterFood && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={med.instructions.afterFood}
                                                        onChange={e => {
                                                            const newMeds = [...prescriptionForm.medicines];
                                                            newMeds[i].instructions.afterFood = e.target.checked;
                                                            if (e.target.checked) newMeds[i].instructions.beforeFood = false;
                                                            setPrescriptionForm({ ...prescriptionForm, medicines: newMeds });
                                                        }}
                                                    />
                                                    <span className="text-xs font-bold text-slate-600">After food</span>
                                                </label>
                                            </div>

                                            <div className="mt-3">
                                                <input
                                                    type="text"
                                                    placeholder="Custom instructions (e.g. only if pain, avoid with milk)..."
                                                    className="w-full px-4 py-2 border border-slate-100 rounded-xl text-[11px] font-medium italic text-slate-600 focus:outline-none focus:border-emerald-300"
                                                    value={med.instructions.notes || ''}
                                                    onChange={e => {
                                                        const newMeds = [...prescriptionForm.medicines];
                                                        newMeds[i].instructions.notes = e.target.value;
                                                        setPrescriptionForm({ ...prescriptionForm, medicines: newMeds });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Symptoms to Monitor Section */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Symptoms to Monitor</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        placeholder="Add symptom (e.g. Fever, Nausea)"
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition"
                                        value={newSymptom}
                                        onChange={e => setNewSymptom(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && addSymptom()}
                                    />
                                    <button
                                        onClick={addSymptom}
                                        className="bg-emerald-600 text-white px-4 rounded-2xl hover:bg-emerald-700 transition"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {prescriptionForm.symptoms.map((s, idx) => (
                                        <div key={idx} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
                                            {s}
                                            <button onClick={() => removeSymptom(idx)}><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Special Instructions Section */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Special Instructions</label>
                                <textarea
                                    placeholder="Enter any additional advice, diet restrictions, or warning signs..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition min-h-[100px]"
                                    value={prescriptionForm.specialInstructions}
                                    onChange={e => setPrescriptionForm({ ...prescriptionForm, specialInstructions: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex gap-3">
                            <button
                                onClick={() => setShowPrescriptionModal(false)}
                                className="flex-1 bg-white text-slate-600 py-4 rounded-2xl font-black text-sm border border-slate-200 hover:bg-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitPrescription}
                                className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Pill size={18} /> Send Prescription
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
