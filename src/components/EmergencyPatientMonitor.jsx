import React, { useState, useEffect, useCallback } from 'react';
import { 
  Heart, Thermometer, Wind, Activity, Brain, AlertTriangle, 
  Clock, FileText, Pill, Plus, X, Save, RefreshCw, 
  TrendingUp, TrendingDown, Minus, CheckCircle, AlertOctagon
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const EmergencyPatientMonitor = ({ appointmentId, onClose, onMonitoringEnd }) => {
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Vital signs form
  const [vitalsForm, setVitalsForm] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    painLevel: 5,
    consciousnessLevel: 'Alert',
    notes: ''
  });
  
  // Note form
  const [noteText, setNoteText] = useState('');
  
  // Intervention form
  const [interventionForm, setInterventionForm] = useState({
    intervention: '',
    result: ''
  });

  // Active tab
  const [activeTab, setActiveTab] = useState('vitals');

  const fetchMonitoringData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/api/emergency-monitoring/status/${appointmentId}`,
        { headers: { 'x-auth-token': token } }
      );
      setMonitoringData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
      toast.error('Failed to load monitoring data');
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

  // Handle vital signs submission
  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/emergency-monitoring/vitals/${appointmentId}`,
        vitalsForm,
        { headers: { 'x-auth-token': token } }
      );
      
      toast.success(res.data.isCritical ? '⚠️ Critical vitals recorded!' : 'Vital signs recorded');
      
      // Reset form
      setVitalsForm({
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        heartRate: '',
        temperature: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        painLevel: 5,
        consciousnessLevel: 'Alert',
        notes: ''
      });
      
      fetchMonitoringData();
    } catch (err) {
      console.error('Failed to record vitals:', err);
      toast.error(err.response?.data?.msg || 'Failed to record vital signs');
    } finally {
      setSaving(false);
    }
  };

  // Handle note submission
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/emergency-monitoring/notes/${appointmentId}`,
        { note: noteText },
        { headers: { 'x-auth-token': token } }
      );
      
      toast.success('Note added');
      setNoteText('');
      fetchMonitoringData();
    } catch (err) {
      console.error('Failed to add note:', err);
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  // Handle intervention submission
  const handleInterventionSubmit = async (e) => {
    e.preventDefault();
    if (!interventionForm.intervention.trim()) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/emergency-monitoring/intervention/${appointmentId}`,
        interventionForm,
        { headers: { 'x-auth-token': token } }
      );
      
      toast.success('Intervention recorded');
      setInterventionForm({ intervention: '', result: '' });
      fetchMonitoringData();
    } catch (err) {
      console.error('Failed to record intervention:', err);
      toast.error('Failed to record intervention');
    } finally {
      setSaving(false);
    }
  };

  // Handle end monitoring
  const handleEndMonitoring = async () => {
    const outcome = window.prompt('Enter outcome (e.g., Admitted, Discharged, Transferred):');
    if (!outcome) return;
    
    const notes = window.prompt('Enter final notes (optional):');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/emergency-monitoring/end/${appointmentId}`,
        { outcome, notes },
        { headers: { 'x-auth-token': token } }
      );
      
      toast.success('Monitoring ended');
      if (onMonitoringEnd) onMonitoringEnd();
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to end monitoring:', err);
      toast.error('Failed to end monitoring');
    }
  };

  // Get vital sign status color
  const getVitalStatus = (value, type) => {
    const ranges = {
      bloodPressureSystolic: { low: 90, high: 180 },
      bloodPressureDiastolic: { low: 60, high: 120 },
      heartRate: { low: 50, high: 120 },
      temperature: { low: 36, high: 39.5 },
      respiratoryRate: { low: 12, high: 30 },
      oxygenSaturation: { low: 92, high: 100 }
    };
    
    const range = ranges[type];
    if (!range) return 'text-slate-600';
    
    if (value < range.low || value > range.high) return 'text-red-600';
    return 'text-emerald-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const { appointment, monitoring, latestVitals } = monitoringData || {};

  return (
    <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 border-b border-red-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Activity size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">Emergency Patient Monitor</h2>
              <p className="text-sm text-red-700">
                Queue #{appointment?.queueNumber} - {appointment?.patientName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMonitoringData}
              className="p-2 bg-white border border-red-200 rounded-lg hover:bg-red-50"
              title="Refresh"
            >
              <RefreshCw size={18} className="text-red-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white border border-red-200 rounded-lg hover:bg-red-50"
            >
              <X size={18} className="text-red-600" />
            </button>
          </div>
        </div>
        
        {/* Status badges */}
        <div className="flex items-center gap-3 mt-3">
          {monitoring?.isCritical && (
            <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold flex items-center gap-1">
              <AlertTriangle size={12} /> CRITICAL
            </span>
          )}
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1">
            <Clock size={12} /> {monitoring?.durationMinutes || 0} min
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
            {monitoring?.vitalSignsCount || 0} vitals recorded
          </span>
        </div>
      </div>

      {/* Quick Info */}
      <div className="p-4 bg-slate-50 border-b border-slate-100">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Chief Complaint</p>
            <p className="text-sm font-semibold text-slate-800">{monitoring?.chiefComplaint || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Allergies</p>
            <p className="text-sm font-semibold text-slate-800">{monitoring?.allergies || 'None'}</p>
          </div>
        </div>
      </div>

      {/* Latest Vitals Display */}
      {latestVitals && (
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Latest Vitals</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <VitalCard 
              icon={<Heart size={16} />}
              label="BP"
              value={`${latestVitals.bloodPressureSystolic || '-'}/${latestVitals.bloodPressureDiastolic || '-'}`}
              unit="mmHg"
              status={getVitalStatus(latestVitals.bloodPressureSystolic, 'bloodPressureSystolic')}
            />
            <VitalCard 
              icon={<Activity size={16} />}
              label="Heart Rate"
              value={latestVitals.heartRate || '-'}
              unit="bpm"
              status={getVitalStatus(latestVitals.heartRate, 'heartRate')}
            />
            <VitalCard 
              icon={<Thermometer size={16} />}
              label="Temp"
              value={latestVitals.temperature || '-'}
              unit="°C"
              status={getVitalStatus(latestVitals.temperature, 'temperature')}
            />
            <VitalCard 
              icon={<Wind size={16} />}
              label="Resp"
              value={latestVitals.respiratoryRate || '-'}
              unit="/min"
              status={getVitalStatus(latestVitals.respiratoryRate, 'respiratoryRate')}
            />
            <VitalCard 
              icon={<Brain size={16} />}
              label="SpO2"
              value={latestVitals.oxygenSaturation || '-'}
              unit="%"
              status={getVitalStatus(latestVitals.oxygenSaturation, 'oxygenSaturation')}
            />
            <VitalCard 
              icon={<AlertOctagon size={16} />}
              label="Pain"
              value={latestVitals.painLevel ?? '-'}
              unit="/10"
              status={latestVitals.painLevel >= 7 ? 'text-red-600' : latestVitals.painLevel >= 4 ? 'text-orange-600' : 'text-emerald-600'}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('vitals')}
          className={`flex-1 py-3 text-sm font-bold transition ${
            activeTab === 'vitals' 
              ? 'text-red-600 border-b-2 border-red-600 bg-red-50' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Heart size={14} className="inline mr-1" /> Record Vitals
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-3 text-sm font-bold transition ${
            activeTab === 'notes' 
              ? 'text-red-600 border-b-2 border-red-600 bg-red-50' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <FileText size={14} className="inline mr-1" /> Notes ({monitoring?.notesCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('interventions')}
          className={`flex-1 py-3 text-sm font-bold transition ${
            activeTab === 'interventions' 
              ? 'text-red-600 border-b-2 border-red-600 bg-red-50' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Pill size={14} className="inline mr-1" /> Interventions ({monitoring?.interventionsCount || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'vitals' && (
          <form onSubmit={handleVitalsSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BP Systolic</label>
                <input
                  type="number"
                  value={vitalsForm.bloodPressureSystolic}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureSystolic: e.target.value })}
                  placeholder="120"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BP Diastolic</label>
                <input
                  type="number"
                  value={vitalsForm.bloodPressureDiastolic}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureDiastolic: e.target.value })}
                  placeholder="80"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Heart Rate</label>
                <input
                  type="number"
                  value={vitalsForm.heartRate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: e.target.value })}
                  placeholder="72"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vitalsForm.temperature}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                  placeholder="37.0"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Resp Rate</label>
                <input
                  type="number"
                  value={vitalsForm.respiratoryRate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })}
                  placeholder="16"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  value={vitalsForm.oxygenSaturation}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturation: e.target.value })}
                  placeholder="98"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pain Level (0-10)</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={vitalsForm.painLevel}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, painLevel: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-center text-sm font-bold text-slate-700">{vitalsForm.painLevel}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Consciousness</label>
                <select
                  value={vitalsForm.consciousnessLevel}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, consciousnessLevel: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Alert">Alert</option>
                  <option value="Voice">Voice</option>
                  <option value="Pain">Pain</option>
                  <option value="Unresponsive">Unresponsive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
              <textarea
                value={vitalsForm.notes}
                onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                placeholder="Additional observations..."
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Record Vitals
                </>
              )}
            </button>
          </form>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            <form onSubmit={handleNoteSubmit}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a clinical note..."
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={saving || !noteText.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>
              </div>
            </form>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {monitoring?.monitoringNotes?.length > 0 ? (
                monitoring.monitoringNotes.map((note, index) => (
                  <div key={index} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-600">{note.addedBy}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(note.addedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800">{note.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-4">No notes yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'interventions' && (
          <div className="space-y-4">
            <form onSubmit={handleInterventionSubmit}>
              <div className="space-y-2">
                <input
                  type="text"
                  value={interventionForm.intervention}
                  onChange={(e) => setInterventionForm({ ...interventionForm, intervention: e.target.value })}
                  placeholder="Intervention performed (e.g., IV Fluids, Oxygen..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="text"
                  value={interventionForm.result}
                  onChange={(e) => setInterventionForm({ ...interventionForm, result: e.target.value })}
                  placeholder="Result (optional)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={saving || !interventionForm.intervention.trim()}
                  className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Intervention
                </button>
              </div>
            </form>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {monitoring?.interventions?.length > 0 ? (
                monitoring.interventions.map((intervention, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-blue-800">{intervention.intervention}</span>
                      <span className="text-xs text-blue-400">
                        {new Date(intervention.time).toLocaleTimeString()}
                      </span>
                    </div>
                    {intervention.result && (
                      <p className="text-sm text-blue-600">{intervention.result}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-4">No interventions recorded</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <button
          onClick={handleEndMonitoring}
          className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 flex items-center justify-center gap-2"
        >
          <CheckCircle size={18} /> End Monitoring & Complete
        </button>
      </div>
    </div>
  );
};

// Vital Card Component
const VitalCard = ({ icon, label, value, unit, status }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
    <div className={`flex items-center justify-center mb-1 ${status}`}>
      {icon}
    </div>
    <p className="text-xs text-slate-500 font-bold uppercase">{label}</p>
    <p className={`text-lg font-bold ${status}`}>{value}</p>
    <p className="text-xs text-slate-400">{unit}</p>
  </div>
);

export default EmergencyPatientMonitor;

