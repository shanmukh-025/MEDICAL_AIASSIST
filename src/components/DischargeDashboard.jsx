import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Eye, CheckCircle, XCircle, Clock,
  AlertTriangle, ArrowLeft, X, RefreshCw, Send, Shield,
  Heart, Activity, Pill, Calendar, Clipboard, User,
  Stethoscope, Thermometer, ChevronDown, ChevronUp, Edit2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700'
};

const CONDITION_STYLES = {
  IMPROVED: 'text-green-600',
  STABLE: 'text-blue-600',
  UNCHANGED: 'text-gray-600',
  DETERIORATED: 'text-orange-600',
  CRITICAL: 'text-red-600',
  EXPIRED: 'text-gray-900',
  LAMA: 'text-yellow-600',
  ABSCONDED: 'text-red-500'
};

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
    {status?.replace(/_/g, ' ')}
  </span>
);

// ================================================
// CREATE DISCHARGE MODAL
// ================================================
const CreateDischargeModal = ({ show, onClose, onCreated }) => {
  const [form, setForm] = useState({
    patientId: '',
    chiefComplaint: '',
    admissionType: 'OPD',
    admissionDiagnosis: '',
    treatmentSummary: '',
    conditionAtDischarge: 'IMPROVED',
    dischargeType: 'NORMAL',
    dischargingDoctor: { name: '', specialization: '', registrationNumber: '' },
    medications: [],
    followUp: { required: false, date: '', doctor: '', instructions: '' },
    instructions: { diet: '', activity: '', warningSignsToWatch: [], generalInstructions: '' },
    vitalsAtDischarge: { bloodPressure: '', heartRate: '', temperature: '', oxygenSaturation: '' }
  });
  const [patientSearch, setPatientSearch] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  // Medication sub-form
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', duration: '', route: 'ORAL', instructions: '' });

  useEffect(() => {
    if (patientSearch.length < 2 || form.patientId) {
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/billing/search-patients`, {
          params: { q: patientSearch },
          headers: { 'x-auth-token': token }
        });
        setFilteredPatients(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error('Patient search failed:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, form.patientId]);

  const updateForm = (field, value) => setForm({ ...form, [field]: value });
  const updateNested = (parent, field, value) => setForm({ ...form, [parent]: { ...form[parent], [field]: value } });

  const addMedication = () => {
    if (!newMed.name) return toast.error('Medication name is required');
    setForm({ ...form, medications: [...form.medications, { ...newMed }] });
    setNewMed({ name: '', dosage: '', frequency: '', duration: '', route: 'ORAL', instructions: '' });
  };

  const removeMedication = (idx) => {
    setForm({ ...form, medications: form.medications.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId) return toast.error('Select a patient');
    if (!form.chiefComplaint) return toast.error('Chief complaint is required');
    if (!form.dischargingDoctor.name) return toast.error('Discharging doctor name is required');

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/discharge`, form, {
        headers: { 'x-auth-token': token }
      });
      toast.success(`Discharge ${res.data.dischargeNumber} created!`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to create discharge');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  const sections = [
    { key: 'basic', label: 'Basic Info', icon: User },
    { key: 'clinical', label: 'Clinical', icon: Stethoscope },
    { key: 'medications', label: 'Medications', icon: Pill },
    { key: 'vitals', label: 'Vitals', icon: Activity },
    { key: 'instructions', label: 'Instructions', icon: Clipboard },
    { key: 'followup', label: 'Follow-up', icon: Calendar }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Create Discharge Summary
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
          {sections.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                activeSection === s.key ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              <s.icon className="w-3 h-3" /> {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Basic Info */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                <div className="relative">
                  <input type="text" value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); updateForm('patientId', ''); }}
                    placeholder="Type at least 2 characters to search..."
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${form.patientId ? 'border-green-400 bg-green-50' : ''}`} />
                  {searchingPatients && (
                    <div className="absolute right-3 top-2.5">
                      <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                    </div>
                  )}
                </div>
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? filteredPatients.map(p => (
                      <button key={p._id} type="button"
                        onClick={() => { updateForm('patientId', p._id); setPatientSearch(p.name); setShowDropdown(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm border-b last:border-b-0">
                        <span className="font-medium">{p.name}</span>
                        {p.phone && <span className="text-gray-400 ml-2">({p.phone})</span>}
                        {p.email && <span className="text-gray-400 ml-2 text-xs">{p.email}</span>}
                      </button>
                    )) : (
                      <p className="px-3 py-2 text-sm text-gray-500">No patients found for "{patientSearch}"</p>
                    )}
                  </div>
                )}
                {form.patientId && <p className="text-xs text-green-600 mt-1">✓ Patient selected</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admission Type</label>
                  <select value={form.admissionType} onChange={e => updateForm('admissionType', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="OPD">OPD</option>
                    <option value="IPD">IPD</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="DAY_CARE">Day Care</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition at Discharge</label>
                  <select value={form.conditionAtDischarge} onChange={e => updateForm('conditionAtDischarge', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="IMPROVED">Improved</option>
                    <option value="STABLE">Stable</option>
                    <option value="UNCHANGED">Unchanged</option>
                    <option value="DETERIORATED">Deteriorated</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="LAMA">Left AMA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint *</label>
                <textarea value={form.chiefComplaint} onChange={e => updateForm('chiefComplaint', e.target.value)}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name *</label>
                  <input type="text" value={form.dischargingDoctor.name}
                    onChange={e => updateNested('dischargingDoctor', 'name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input type="text" value={form.dischargingDoctor.specialization}
                    onChange={e => updateNested('dischargingDoctor', 'specialization', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reg. Number</label>
                  <input type="text" value={form.dischargingDoctor.registrationNumber}
                    onChange={e => updateNested('dischargingDoctor', 'registrationNumber', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Clinical */}
          {activeSection === 'clinical' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admission Diagnosis</label>
                <textarea value={form.admissionDiagnosis} onChange={e => updateForm('admissionDiagnosis', e.target.value)}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Summary</label>
                <textarea value={form.treatmentSummary} onChange={e => updateForm('treatmentSummary', e.target.value)}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Describe the treatment given during the stay..." />
              </div>
            </div>
          )}

          {/* Medications */}
          {activeSection === 'medications' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border space-y-3">
                <p className="text-sm font-medium text-gray-700">Add Discharge Medication</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                    placeholder="Medicine name *" className="px-2 py-1.5 border rounded text-sm" />
                  <input type="text" value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                    placeholder="Dosage (e.g., 500mg)" className="px-2 py-1.5 border rounded text-sm" />
                  <input type="text" value={newMed.frequency} onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                    placeholder="Frequency (e.g., twice daily)" className="px-2 py-1.5 border rounded text-sm" />
                  <input type="text" value={newMed.duration} onChange={e => setNewMed({ ...newMed, duration: e.target.value })}
                    placeholder="Duration (e.g., 7 days)" className="px-2 py-1.5 border rounded text-sm" />
                </div>
                <div className="flex gap-2">
                  <select value={newMed.route} onChange={e => setNewMed({ ...newMed, route: e.target.value })}
                    className="px-2 py-1.5 border rounded text-sm">
                    <option value="ORAL">Oral</option>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="TOPICAL">Topical</option>
                    <option value="INHALATION">Inhalation</option>
                  </select>
                  <input type="text" value={newMed.instructions} onChange={e => setNewMed({ ...newMed, instructions: e.target.value })}
                    placeholder="Special instructions" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                  <button type="button" onClick={addMedication}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>

              {form.medications.length > 0 && (
                <div className="space-y-2">
                  {form.medications.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{med.name} <span className="text-gray-400">({med.route})</span></p>
                        <p className="text-xs text-gray-500">{med.dosage} · {med.frequency} · {med.duration}</p>
                      </div>
                      <button type="button" onClick={() => removeMedication(idx)} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vitals */}
          {activeSection === 'vitals' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Blood Pressure</label>
                <input type="text" value={form.vitalsAtDischarge.bloodPressure}
                  onChange={e => updateNested('vitalsAtDischarge', 'bloodPressure', e.target.value)}
                  placeholder="120/80 mmHg" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heart Rate (bpm)</label>
                <input type="number" value={form.vitalsAtDischarge.heartRate || ''}
                  onChange={e => updateNested('vitalsAtDischarge', 'heartRate', parseInt(e.target.value) || '')}
                  placeholder="72" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temperature (°F)</label>
                <input type="number" step="0.1" value={form.vitalsAtDischarge.temperature || ''}
                  onChange={e => updateNested('vitalsAtDischarge', 'temperature', parseFloat(e.target.value) || '')}
                  placeholder="98.6" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SpO2 (%)</label>
                <input type="number" value={form.vitalsAtDischarge.oxygenSaturation || ''}
                  onChange={e => updateNested('vitalsAtDischarge', 'oxygenSaturation', parseInt(e.target.value) || '')}
                  placeholder="98" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          )}

          {/* Instructions */}
          {activeSection === 'instructions' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diet Instructions</label>
                <textarea value={form.instructions.diet} onChange={e => updateNested('instructions', 'diet', e.target.value)}
                  rows={2} placeholder="Dietary guidelines..." className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Restrictions</label>
                <textarea value={form.instructions.activity} onChange={e => updateNested('instructions', 'activity', e.target.value)}
                  rows={2} placeholder="Activity level, restrictions..." className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">General Instructions</label>
                <textarea value={form.instructions.generalInstructions} onChange={e => updateNested('instructions', 'generalInstructions', e.target.value)}
                  rows={3} placeholder="General care instructions for the patient..." className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          )}

          {/* Follow-up */}
          {activeSection === 'followup' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.followUp.required}
                  onChange={e => updateNested('followUp', 'required', e.target.checked)}
                  className="rounded text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Follow-up Required</span>
              </label>
              {form.followUp.required && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                    <input type="date" value={form.followUp.date}
                      onChange={e => updateNested('followUp', 'date', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Doctor</label>
                    <input type="text" value={form.followUp.doctor}
                      onChange={e => updateNested('followUp', 'doctor', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Instructions</label>
                    <textarea value={form.followUp.instructions}
                      onChange={e => updateNested('followUp', 'instructions', e.target.value)}
                      rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Create Discharge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================================
// DISCHARGE DETAIL VIEW
// ================================================
const DischargeDetailView = ({ dischargeId, onBack }) => {
  const [discharge, setDischarge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [dischargeId]);

  const fetchDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/discharge/${dischargeId}`, {
        headers: { 'x-auth-token': token }
      });
      setDischarge(res.data);
    } catch (err) {
      toast.error('Failed to load discharge details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/discharge/${dischargeId}/submit`, {}, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Discharge submitted for approval');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to submit');
    }
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/discharge/${dischargeId}/approve`, {}, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Discharge approved!');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to approve');
    }
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/discharge/${dischargeId}/complete`, {}, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Discharge completed!');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to complete');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-indigo-600" /></div>;
  if (!discharge) return <p className="text-center text-gray-500 py-8">Discharge not found</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          {discharge.status === 'DRAFT' && (
            <button onClick={handleSubmit}
              className="px-3 py-1.5 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-1">
              <Send className="w-3 h-3" /> Submit for Approval
            </button>
          )}
          {(discharge.status === 'PENDING_APPROVAL' || discharge.status === 'DRAFT') && (
            <button onClick={handleApprove}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Approve
            </button>
          )}
          {discharge.status === 'APPROVED' && (
            <button onClick={handleComplete}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Complete
            </button>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{discharge.dischargeNumber}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {discharge.admissionType} · Discharged {new Date(discharge.dischargeDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${CONDITION_STYLES[discharge.conditionAtDischarge] || 'text-gray-600'}`}>
              {discharge.conditionAtDischarge}
            </span>
            <StatusBadge status={discharge.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-gray-500">Patient</p>
            <p className="font-medium">{discharge.patientSnapshot?.name}</p>
            <p className="text-xs text-gray-400">{discharge.patientSnapshot?.phone}</p>
          </div>
          <div>
            <p className="text-gray-500">Discharging Doctor</p>
            <p className="font-medium">{discharge.dischargingDoctor?.name || 'N/A'}</p>
            <p className="text-xs text-gray-400">{discharge.dischargingDoctor?.specialization}</p>
          </div>
        </div>
      </div>

      {/* Chief Complaint & Treatment */}
      <div className="bg-white rounded-xl border p-5 shadow-sm space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
          <Stethoscope className="w-4 h-4" /> Clinical Summary
        </h4>
        <div>
          <p className="text-xs text-gray-500 font-medium">Chief Complaint</p>
          <p className="text-sm text-gray-800">{discharge.chiefComplaint}</p>
        </div>
        {discharge.admissionDiagnosis && (
          <div>
            <p className="text-xs text-gray-500 font-medium">Admission Diagnosis</p>
            <p className="text-sm text-gray-800">{discharge.admissionDiagnosis}</p>
          </div>
        )}
        {discharge.treatmentSummary && (
          <div>
            <p className="text-xs text-gray-500 font-medium">Treatment Summary</p>
            <p className="text-sm text-gray-800">{discharge.treatmentSummary}</p>
          </div>
        )}
      </div>

      {/* Vitals at Discharge */}
      {discharge.vitalsAtDischarge && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-3">
            <Activity className="w-4 h-4" /> Vitals at Discharge
          </h4>
          <div className="grid grid-cols-4 gap-3">
            {discharge.vitalsAtDischarge.bloodPressure && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">BP</p>
                <p className="text-sm font-semibold">{discharge.vitalsAtDischarge.bloodPressure}</p>
              </div>
            )}
            {discharge.vitalsAtDischarge.heartRate && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">HR</p>
                <p className="text-sm font-semibold">{discharge.vitalsAtDischarge.heartRate} bpm</p>
              </div>
            )}
            {discharge.vitalsAtDischarge.temperature && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Temp</p>
                <p className="text-sm font-semibold">{discharge.vitalsAtDischarge.temperature}°F</p>
              </div>
            )}
            {discharge.vitalsAtDischarge.oxygenSaturation && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">SpO2</p>
                <p className="text-sm font-semibold">{discharge.vitalsAtDischarge.oxygenSaturation}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medications */}
      {discharge.medications?.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-3">
            <Pill className="w-4 h-4" /> Discharge Medications ({discharge.medications.length})
          </h4>
          <div className="space-y-2">
            {discharge.medications.map((med, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{med.name}</p>
                  <p className="text-xs text-gray-500">
                    {[med.dosage, med.frequency, med.duration, med.route].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {med.instructions && <p className="text-xs text-gray-400 max-w-[200px] truncate">{med.instructions}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {discharge.instructions && (
        <div className="bg-white rounded-xl border p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            <Clipboard className="w-4 h-4" /> Patient Instructions
          </h4>
          {discharge.instructions.diet && (
            <div><p className="text-xs text-gray-500 font-medium">Diet</p><p className="text-sm">{discharge.instructions.diet}</p></div>
          )}
          {discharge.instructions.activity && (
            <div><p className="text-xs text-gray-500 font-medium">Activity</p><p className="text-sm">{discharge.instructions.activity}</p></div>
          )}
          {discharge.instructions.generalInstructions && (
            <div><p className="text-xs text-gray-500 font-medium">General</p><p className="text-sm">{discharge.instructions.generalInstructions}</p></div>
          )}
        </div>
      )}

      {/* Follow-up */}
      {discharge.followUp?.required && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-1 mb-2">
            <Calendar className="w-4 h-4" /> Follow-up Scheduled
          </h4>
          <div className="text-sm text-indigo-700">
            {discharge.followUp.date && <p>Date: {new Date(discharge.followUp.date).toLocaleDateString()}</p>}
            {discharge.followUp.doctor && <p>Doctor: {discharge.followUp.doctor}</p>}
            {discharge.followUp.instructions && <p className="mt-1 text-xs">{discharge.followUp.instructions}</p>}
          </div>
        </div>
      )}

      {/* Linked Bill */}
      {discharge.billId && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Linked Bill</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-blue-600">{discharge.billId.billNumber}</p>
              <p className="text-xs text-gray-500">Total: ₹{discharge.billId.grandTotal?.toFixed(2)}</p>
            </div>
            <StatusBadge status={discharge.billId.status} />
          </div>
          {!discharge.isBillSettled && discharge.billId.balanceDue > 0 && (
            <p className="text-xs text-red-600 mt-2 font-semibold">
              ⚠ Outstanding balance: ₹{discharge.billId.balanceDue?.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ================================================
// MAIN COMPONENT
// ================================================
const DischargeDashboard = () => {
  const [view, setView] = useState('list');
  const [discharges, setDischarges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', search: '' });

  const fetchDischarges = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);

      const res = await axios.get(`${API_URL}/api/discharge/hospital?${params}`, {
        headers: { 'x-auth-token': token }
      });
      setDischarges(res.data.discharges || []);
    } catch (err) {
      console.error('Failed to fetch discharges:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDischarges();
  }, []);

  useEffect(() => {
    fetchDischarges();
  }, [filter]);

  if (view === 'detail' && selectedId) {
    return (
      <DischargeDetailView
        dischargeId={selectedId}
        onBack={() => { setView('list'); setSelectedId(null); fetchDischarges(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
              placeholder="Search discharges..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm text-gray-600">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> New Discharge
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : discharges.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No discharge summaries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {discharges.map(d => (
            <div key={d._id}
              onClick={() => { setSelectedId(d._id); setView('detail'); }}
              className="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{d.patientSnapshot?.name || d.patientId?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">
                      {d.dischargeNumber} · {d.admissionType} · {new Date(d.dischargeDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${CONDITION_STYLES[d.conditionAtDischarge] || 'text-gray-500'}`}>
                    {d.conditionAtDischarge}
                  </span>
                  <StatusBadge status={d.status} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 truncate">
                {d.chiefComplaint}
              </p>
              {d.billId && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-gray-400">Bill:</span>
                  <span className="font-mono text-blue-600">{d.billId.billNumber}</span>
                  <StatusBadge status={d.billId.status} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateDischargeModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchDischarges()}
      />
    </div>
  );
};

export default DischargeDashboard;
