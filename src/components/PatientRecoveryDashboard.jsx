import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Users, AlertTriangle, TrendingUp, TrendingDown, Minus,
  ChevronRight, ChevronLeft, Clock, Pill, Calendar, Heart,
  Eye, Bell, RefreshCw, Loader2, CheckCircle, XCircle, 
  Thermometer, ArrowLeft, FileText, MessageSquare, Phone,
  ChevronDown, ChevronUp, Star, BarChart3, Stethoscope, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const PatientRecoveryDashboard = ({ initialPlanData, onInitialDataConsumed }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [recoveryData, setRecoveryData] = useState(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false); // eslint-disable-line
  const [statusFilter, setStatusFilter] = useState('');
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatientForPlan, setSelectedPatientForPlan] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [treatmentForm, setTreatmentForm] = useState({
    appointmentId: '',
    patientId: '',
    patientName: '',
    doctorName: '',
    diagnosis: '',
    durationDays: 7,
    medicines: [{ name: '', dosage: '', frequency: 'twice', duration: 7, timings: [], instructions: { beforeFood: false, afterFood: true, notes: '' } }],
    symptomsToMonitor: [],
    followUpRequired: true,
    followUpDays: 14,
    followUpNotes: '',
    specialInstructions: '',
    initialSeverity: 5,
    newSymptom: ''
  });
  const token = localStorage.getItem('token');

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await axios.get(`${API_URL}/api/patient-monitoring/hospital/patients`, {
        headers: { 'x-auth-token': token },
        params
      });
      setPatients(res.data);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      toast.error('Failed to load patient monitoring data');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  const fetchRecoveryData = useCallback(async (planId) => {
    try {
      setRecoveryLoading(true);
      const res = await axios.get(`${API_URL}/api/patient-monitoring/hospital/patient/${planId}/recovery`, {
        headers: { 'x-auth-token': token }
      });
      setRecoveryData(res.data);
    } catch (err) {
      console.error('Failed to fetch recovery data:', err);
      toast.error('Failed to load recovery data');
    } finally {
      setRecoveryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle pre-fill from completed appointments
  useEffect(() => {
    if (initialPlanData && initialPlanData.patientId) {
      setSelectedPatientForPlan({
        _id: initialPlanData.patientId,
        name: initialPlanData.patientName || '',
        email: initialPlanData.patientEmail || '',
        phone: initialPlanData.patientPhone || ''
      });
      setTreatmentForm(f => ({
        ...f,
        patientId: initialPlanData.patientId,
        patientName: initialPlanData.patientName || '',
        appointmentId: initialPlanData.appointmentId || '',
        doctorName: initialPlanData.doctorName || '',
        diagnosis: initialPlanData.reason || ''
      }));
      setShowTreatmentForm(true);
      if (onInitialDataConsumed) onInitialDataConsumed();
    }
  }, [initialPlanData, onInitialDataConsumed]);

  // Search patients for manual plan creation
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingPatients(true);
        const res = await axios.get(`${API_URL}/api/patient-monitoring/hospital/search-patients`, {
          headers: { 'x-auth-token': token },
          params: { q: patientSearch }
        });
        setPatientResults(res.data);
      } catch {
        setPatientResults([]);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, token]);

  // Fetch completed appointments for selected patient
  const fetchPatientAppointments = useCallback(async (patientId) => {
    try {
      const res = await axios.get(`${API_URL}/api/patient-monitoring/hospital/patient-appointments/${patientId}`, {
        headers: { 'x-auth-token': token }
      });
      setPatientAppointments(res.data);
    } catch {
      setPatientAppointments([]);
    }
  }, [token]);

  const selectPatientForPlan = (patient) => {
    setSelectedPatientForPlan(patient);
    setTreatmentForm(f => ({ ...f, patientId: patient._id, patientName: patient.name }));
    setPatientSearch('');
    setPatientResults([]);
    fetchPatientAppointments(patient._id);
  };

  const selectAppointmentForPlan = (appt) => {
    setTreatmentForm(f => ({
      ...f,
      appointmentId: appt._id,
      doctorName: appt.doctor || f.doctorName,
      diagnosis: appt.reason || f.diagnosis
    }));
  };

  const handleViewRecovery = (plan) => {
    setSelectedPlan(plan);
    fetchRecoveryData(plan._id);
  };

  const handleRequestFollowUp = async (planId) => {
    try {
      const followUpDate = prompt('Enter follow-up date (YYYY-MM-DD):');
      if (!followUpDate) return;
      const notes = prompt('Notes for the patient (optional):') || '';

      await axios.put(
        `${API_URL}/api/patient-monitoring/hospital/plan/${planId}/request-followup`,
        { followUpDate, followUpNotes: notes },
        { headers: { 'x-auth-token': token } }
      );
      toast.success('Follow-up requested! Patient has been notified.');
      fetchPatients();
      if (selectedPlan?._id === planId) fetchRecoveryData(planId);
    } catch { 
      toast.error('Failed to request follow-up');
    }
  };

  const handleAddNotes = async (planId) => {
    const notes = prompt('Enter clinical notes:');
    if (!notes) return;
    try {
      await axios.put(
        `${API_URL}/api/patient-monitoring/hospital/plan/${planId}/add-notes`,
        { notes },
        { headers: { 'x-auth-token': token } }
      );
      toast.success('Notes updated');
      fetchPatients();
      if (selectedPlan?._id === planId) fetchRecoveryData(planId);
    } catch {
      toast.error('Failed to add notes');
    }
  };

  const submitTreatmentPlan = async () => {
    try {
      if (!treatmentForm.diagnosis || !treatmentForm.patientId) {
        toast.error('Diagnosis and patient are required');
        return;
      }

      await axios.post(
        `${API_URL}/api/patient-monitoring/treatment-plan`,
        treatmentForm,
        { headers: { 'x-auth-token': token } }
      );
      toast.success('Treatment plan created! Patient has been notified. 🎉');
      setShowTreatmentForm(false);
      resetTreatmentForm();
      fetchPatients();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to create treatment plan');
    }
  };

  const resetTreatmentForm = () => {
    setTreatmentForm({
      appointmentId: '',
      patientId: '',
      patientName: '',
      doctorName: '',
      diagnosis: '',
      durationDays: 7,
      medicines: [{ name: '', dosage: '', frequency: 'twice', duration: 7, timings: [], instructions: { beforeFood: false, afterFood: true, notes: '' } }],
      symptomsToMonitor: [],
      followUpRequired: true,
      followUpDays: 14,
      followUpNotes: '',
      specialInstructions: '',
      initialSeverity: 5,
      newSymptom: ''
    });
    setSelectedPatientForPlan(null);
    setPatientSearch('');
    setPatientResults([]);
    setPatientAppointments([]);
  };

  const getSeverityColor = (severity) => {
    if (severity <= 3) return 'text-green-600 bg-green-50 border-green-200';
    if (severity <= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (severity <= 7) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrendBadge = (trend) => {
    switch (trend) {
      case 'improving':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold"><TrendingDown size={12} /> Improving</span>;
      case 'worsening':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold"><TrendingUp size={12} /> Worsening</span>;
      case 'critical':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-bold"><AlertTriangle size={12} /> Critical</span>;
      default:
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold"><Minus size={12} /> Stable</span>;
    }
  };

  // ============ PATIENT LIST VIEW ============
  if (selectedPlan && recoveryData) {
    return renderDetailedRecovery();
  }

  function renderDetailedRecovery() {
    const { plan, recoveryLogs, severityTimeline, symptomBreakdown, stats, medicineComplianceData } = recoveryData;

    return (
      <div className="space-y-4">
        {/* Back Button */}
        <button
          onClick={() => { setSelectedPlan(null); setRecoveryData(null); }}
          className="flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition"
        >
          <ArrowLeft size={16} /> Back to Patient List
        </button>

        {/* Patient Info Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold">{plan.patientId?.name || 'Patient'}</h2>
              <p className="text-indigo-200 text-sm">📞 {plan.patientId?.phone || 'N/A'} • 📧 {plan.patientId?.email || 'N/A'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRequestFollowUp(plan._id)}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition flex items-center gap-1"
              >
                <Calendar size={14} /> Follow-up
              </button>
              <button
                onClick={() => handleAddNotes(plan._id)}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition flex items-center gap-1"
              >
                <FileText size={14} /> Notes
              </button>
            </div>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <p className="font-bold text-lg">{plan.diagnosis}</p>
            <p className="text-indigo-200 text-sm">Dr. {plan.doctorName} • Started {new Date(plan.startDate).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Alerts */}
        {stats.alerts.length > 0 && (
          <div className="space-y-2">
            {stats.alerts.map((alert, i) => (
              <div key={i} className={`flex items-center gap-2 p-3 rounded-xl border ${
                alert.type === 'critical' ? 'bg-red-50 border-red-300 text-red-800' :
                alert.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                'bg-blue-50 border-blue-300 text-blue-800'
              }`}>
                {alert.type === 'critical' ? <AlertTriangle size={16} /> : <AlertCircle size={16} />}
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard 
            label="Total Days" 
            value={`${stats.logsSubmitted}/${stats.totalDays}`}
            sub="logs submitted"
            icon={<Calendar size={18} className="text-indigo-500" />}
          />
          <StatCard 
            label="Avg Adherence" 
            value={`${stats.avgAdherence}%`}
            sub="medicine taken"
            icon={<Pill size={18} className={stats.avgAdherence >= 80 ? 'text-green-500' : 'text-red-500'} />}
            highlight={stats.avgAdherence < 70}
          />
          <StatCard 
            label="Avg Severity" 
            value={`${stats.avgSeverity}/10`}
            sub={`initial: ${stats.initialSeverity}/10`}
            icon={<Thermometer size={18} className="text-orange-500" />}
          />
          <StatCard 
            label="Missed Days" 
            value={stats.missedDays}
            sub="no check-in"
            icon={<XCircle size={18} className={stats.missedDays > 2 ? 'text-red-500' : 'text-slate-400'} />}
            highlight={stats.missedDays > 2}
          />
        </div>

        {/* Severity Chart */}
        {severityTimeline.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" /> Severity Over Time
            </h3>
            <div className="relative">
              {/* Y-axis labels */}
              <div className="flex">
                <div className="w-8 flex flex-col justify-between text-[10px] text-slate-400 pr-1 h-36">
                  <span>10</span>
                  <span>7</span>
                  <span>5</span>
                  <span>3</span>
                  <span>1</span>
                </div>
                <div className="flex-1">
                  {/* Grid lines */}
                  <div className="relative h-36 border-l border-b border-slate-200">
                    {[10, 7, 5, 3].map(v => (
                      <div key={v} className="absolute w-full border-t border-dashed border-slate-100" style={{ bottom: `${(v / 10) * 100}%` }} />
                    ))}
                    {/* Bars */}
                    <div className="flex items-end h-full gap-0.5 px-1">
                      {severityTimeline.map((point, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div
                            className={`w-full rounded-t transition-all min-h-[2px] ${
                              point.overallSeverity <= 3 ? 'bg-green-400' :
                              point.overallSeverity <= 5 ? 'bg-yellow-400' :
                              point.overallSeverity <= 7 ? 'bg-orange-400' :
                              'bg-red-400'
                            } ${point.needsAttention ? 'ring-2 ring-red-300' : ''}`}
                            style={{ height: `${(point.overallSeverity / 10) * 100}%` }}
                            title={`Day ${point.day}: Severity ${point.overallSeverity}/10${point.needsAttention ? ' ⚠️' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* X-axis labels */}
                  <div className="flex gap-0.5 px-1 mt-1">
                    {severityTimeline.map((point, i) => (
                      <div key={i} className="flex-1 text-center text-[9px] text-slate-400">
                        D{point.day}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Initial severity reference line label */}
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <div className="w-4 h-0.5 bg-indigo-400" />
                <span>Initial severity: {stats.initialSeverity}/10</span>
                {parseFloat(stats.avgSeverity) < stats.initialSeverity && (
                  <span className="text-green-600 font-bold ml-2">↓ Improving</span>
                )}
                {parseFloat(stats.avgSeverity) > stats.initialSeverity && (
                  <span className="text-red-600 font-bold ml-2">↑ Worsening</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Symptom Breakdown */}
        {Object.keys(symptomBreakdown).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Thermometer size={18} className="text-orange-500" /> Symptom-wise Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(symptomBreakdown).map(([symptom, data]) => {
                const latest = data[data.length - 1]?.severity || 0;
                const first = data[0]?.severity || 0;
                const trend = latest < first ? 'improving' : latest > first ? 'worsening' : 'stable';
                
                return (
                  <div key={symptom} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-700 text-sm capitalize">{symptom}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getSeverityColor(latest)}`}>
                          Now: {latest}/10
                        </span>
                        {getTrendBadge(trend)}
                      </div>
                    </div>
                    {/* Mini sparkline */}
                    <div className="flex items-end gap-0.5 h-8">
                      {data.map((d, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t ${
                            d.severity <= 3 ? 'bg-green-300' :
                            d.severity <= 6 ? 'bg-yellow-300' :
                            'bg-red-300'
                          }`}
                          style={{ height: `${(d.severity / 10) * 100}%` }}
                          title={`Day ${d.day}: ${d.severity}/10`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Medicine Adherence Over Time */}
        {severityTimeline.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Pill size={18} className="text-blue-500" /> Medicine Adherence
            </h3>
            <div className="flex items-end gap-1 h-20">
              {severityTimeline.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-slate-400">{point.adherence}%</span>
                  <div
                    className={`w-full rounded-t ${
                      point.adherence >= 80 ? 'bg-green-400' :
                      point.adherence >= 50 ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}
                    style={{ height: `${point.adherence}%` }}
                  />
                  <span className="text-[9px] text-slate-400">D{point.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-Time Medicine Compliance */}
        {medicineComplianceData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Pill size={18} className="text-green-600" /> Real-Time Medicine Tracking
            </h3>
            
            {/* Today's compliance bar */}
            <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-indigo-800">Today's Compliance</span>
                <span className={`text-sm font-bold ${
                  medicineComplianceData.todayCompliance >= 80 ? 'text-green-600' : 
                  medicineComplianceData.todayCompliance >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {medicineComplianceData.todayTaken}/{medicineComplianceData.todayExpected} doses ({medicineComplianceData.todayCompliance}%)
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    medicineComplianceData.todayCompliance >= 80 ? 'bg-green-500' : 
                    medicineComplianceData.todayCompliance >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${medicineComplianceData.todayCompliance}%` }}
                />
              </div>
            </div>

            {/* Overall compliance */}
            <div className="mb-3 p-3 bg-slate-50 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-slate-700">Overall Compliance</span>
                <span className={`text-sm font-bold ${
                  medicineComplianceData.overallCompliance >= 80 ? 'text-green-600' : 
                  medicineComplianceData.overallCompliance >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {medicineComplianceData.totalTakenDoses}/{medicineComplianceData.totalExpectedDoses} doses ({medicineComplianceData.overallCompliance}%)
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    medicineComplianceData.overallCompliance >= 80 ? 'bg-green-500' : 
                    medicineComplianceData.overallCompliance >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${medicineComplianceData.overallCompliance}%` }}
                />
              </div>
            </div>

            {/* Per-medicine breakdown */}
            <div className="space-y-2">
              {medicineComplianceData.medicines.map((med, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{med.name}</p>
                    <p className="text-xs text-slate-500">
                      {med.dosage} • {med.frequency} • Timings: {med.timings.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      med.takenToday >= med.timings.length ? 'text-green-600' : 
                      med.takenToday > 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {med.takenToday}/{med.timings.length} today
                    </p>
                    <p className="text-xs text-slate-400">{med.totalTaken} total doses taken</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recovery Logs List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" /> Daily Recovery Logs
          </h3>
          {recoveryLogs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Patient hasn't submitted any recovery logs yet.</p>
          ) : (
            <div className="space-y-2">
              {[...recoveryLogs].reverse().map((log) => (
                <DoctorLogEntry key={log._id} log={log} getSeverityColor={getSeverityColor} getTrendBadge={getTrendBadge} />
              ))}
            </div>
          )}
        </div>

        {/* Prescribed Medicines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Pill size={18} className="text-indigo-600" /> Prescribed Medicines
          </h3>
          <div className="space-y-2">
            {plan.medicines?.map((med, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{med.name}</p>
                  <p className="text-xs text-slate-500">
                    {med.dosage} • {med.frequency === 'once' ? 'Once' : med.frequency === 'twice' ? 'Twice' : med.frequency === 'thrice' ? 'Thrice' : 'Four times'} daily
                    • {med.duration} days
                    {med.instructions?.beforeFood ? ' • Before food' : ' • After food'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity size={22} className="text-indigo-600" /> Patient Recovery Monitor
          </h2>
          <p className="text-sm text-slate-500">Track patient symptoms, recovery & medicine adherence</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTreatmentForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Stethoscope size={16} /> New Treatment Plan
          </button>
          <button
            onClick={fetchPatients}
            className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition"
          >
            <RefreshCw size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'All', count: patients.length },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'FOLLOW_UP_NEEDED', label: 'Follow-up Needed' },
          { value: 'COMPLETED', label: 'Completed' }
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition ${
              statusFilter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert Patients Summary */}
      {(() => {
        const critical = patients.filter(p => p.overallTrend === 'worsening' || p.latestLog?.needsDoctorAttention);
        if (critical.length > 0) {
          return (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                <AlertTriangle size={18} /> {critical.length} Patient(s) Need Attention
              </h3>
              <div className="space-y-1">
                {critical.map(p => (
                  <button
                    key={p._id}
                    onClick={() => handleViewRecovery(p)}
                    className="w-full flex items-center justify-between bg-white rounded-xl p-2.5 border border-red-100 hover:border-red-300 transition"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 text-sm">{p.patientId?.name}</p>
                      <p className="text-xs text-red-600">{p.diagnosis} • Severity: {p.latestLog?.overallSeverity || '?'}/10</p>
                    </div>
                    <ChevronRight size={16} className="text-red-400" />
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Patient List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <Users className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="font-bold text-slate-600 mb-1">No Patients Being Monitored</h3>
          <p className="text-slate-400 text-sm mb-4">Create a treatment plan after completing an appointment to start monitoring a patient's recovery.</p>
          <button
            onClick={() => setShowTreatmentForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Create Treatment Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {patients.map(patient => (
            <PatientCard
              key={patient._id}
              patient={patient}
              getSeverityColor={getSeverityColor}
              getTrendBadge={getTrendBadge}
              onViewRecovery={handleViewRecovery}
              onRequestFollowUp={handleRequestFollowUp}
            />
          ))}
        </div>
      )}

      {/* Treatment Plan Creation Modal */}
      {showTreatmentForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Create Treatment Plan</h3>
              <button onClick={() => { setShowTreatmentForm(false); resetTreatmentForm(); }} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Patient</label>
                {selectedPatientForPlan ? (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {selectedPatientForPlan.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div>
                        <p className="font-bold text-indigo-800 text-sm">{selectedPatientForPlan.name}</p>
                        <p className="text-xs text-indigo-600">
                          {selectedPatientForPlan.email && <span>{selectedPatientForPlan.email}</span>}
                          {selectedPatientForPlan.phone && <span> • {selectedPatientForPlan.phone}</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPatientForPlan(null);
                        setTreatmentForm(f => ({ ...f, patientId: '', patientName: '', appointmentId: '' }));
                        setPatientAppointments([]);
                      }}
                      className="text-indigo-400 hover:text-indigo-600 p-1"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patient by name, email, or phone..."
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                      {searchingPatients && (
                        <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
                      )}
                    </div>
                    {patientResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {patientResults.map(p => (
                          <button
                            key={p._id}
                            onClick={() => selectPatientForPlan(p)}
                            className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 transition flex items-center gap-3 border-b border-slate-50 last:border-0"
                          >
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">
                              {p.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                              <p className="text-xs text-slate-500">{p.email}{p.phone ? ` • ${p.phone}` : ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {patientSearch.length >= 2 && !searchingPatients && patientResults.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center">
                        <p className="text-sm text-slate-500">No registered patients found for "{patientSearch}"</p>
                        <p className="text-xs text-slate-400 mt-1">Only patients registered on the app can be monitored</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Link to Appointment (shown after patient selected) */}
              {selectedPatientForPlan && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link to Appointment (Optional)</label>
                  {patientAppointments.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {patientAppointments.map(appt => (
                        <button
                          key={appt._id}
                          onClick={() => selectAppointmentForPlan(appt)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                            treatmentForm.appointmentId === appt._id
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-blue-500" />
                              <span className="font-semibold">{appt.appointmentDate}</span>
                              <Clock size={13} className="text-orange-500" />
                              <span>{appt.appointmentTime}</span>
                            </div>
                            {treatmentForm.appointmentId === appt._id && (
                              <CheckCircle size={16} className="text-indigo-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {appt.doctor && <span className="text-xs text-slate-500">Dr. {appt.doctor}</span>}
                            {appt.reason && <span className="text-xs text-slate-400">• {appt.reason}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">No completed appointments found for this patient</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Doctor Name</label>
                  <input
                    type="text"
                    placeholder="Dr. ..."
                    value={treatmentForm.doctorName}
                    onChange={e => setTreatmentForm(f => ({ ...f, doctorName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Diagnosis</label>
                  <input
                    type="text"
                    placeholder="e.g., Viral Fever"
                    value={treatmentForm.diagnosis}
                    onChange={e => setTreatmentForm(f => ({ ...f, diagnosis: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Duration & Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Treatment Duration (days)</label>
                  <input
                    type="number"
                    min="1" max="90"
                    value={treatmentForm.durationDays}
                    onChange={e => setTreatmentForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 7 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Initial Severity (1-10)</label>
                  <input
                    type="number"
                    min="1" max="10"
                    value={treatmentForm.initialSeverity}
                    onChange={e => setTreatmentForm(f => ({ ...f, initialSeverity: parseInt(e.target.value) || 5 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Medicines */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Prescribed Medicines</label>
                {treatmentForm.medicines.map((med, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 mb-2">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={med.name}
                        onChange={e => {
                          const newMeds = [...treatmentForm.medicines];
                          newMeds[i].name = e.target.value;
                          setTreatmentForm(f => ({ ...f, medicines: newMeds }));
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g., 500mg)"
                        value={med.dosage}
                        onChange={e => {
                          const newMeds = [...treatmentForm.medicines];
                          newMeds[i].dosage = e.target.value;
                          setTreatmentForm(f => ({ ...f, medicines: newMeds }));
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                      />
                      <select
                        value={med.frequency}
                        onChange={e => {
                          const newMeds = [...treatmentForm.medicines];
                          newMeds[i].frequency = e.target.value;
                          setTreatmentForm(f => ({ ...f, medicines: newMeds }));
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                      >
                        <option value="once">Once daily</option>
                        <option value="twice">Twice daily</option>
                        <option value="thrice">Thrice daily</option>
                        <option value="four-times">Four times daily</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={med.instructions.beforeFood}
                          onChange={e => {
                            const newMeds = [...treatmentForm.medicines];
                            newMeds[i].instructions.beforeFood = e.target.checked;
                            if (e.target.checked) newMeds[i].instructions.afterFood = false;
                            setTreatmentForm(f => ({ ...f, medicines: newMeds }));
                          }}
                        />
                        Before food
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={med.instructions.afterFood}
                          onChange={e => {
                            const newMeds = [...treatmentForm.medicines];
                            newMeds[i].instructions.afterFood = e.target.checked;
                            if (e.target.checked) newMeds[i].instructions.beforeFood = false;
                            setTreatmentForm(f => ({ ...f, medicines: newMeds }));
                          }}
                        />
                        After food
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={med.duration}
                        onChange={e => {
                          const newMeds = [...treatmentForm.medicines];
                          newMeds[i].duration = parseInt(e.target.value) || 7;
                          setTreatmentForm(f => ({ ...f, medicines: newMeds }));
                        }}
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-sm"
                        placeholder="Days"
                      />
                      <span className="text-slate-500">days</span>
                      {treatmentForm.medicines.length > 1 && (
                        <button
                          onClick={() => {
                            const newMeds = treatmentForm.medicines.filter((_, j) => j !== i);
                            setTreatmentForm(f => ({ ...f, medicines: newMeds }));
                          }}
                          className="ml-auto text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setTreatmentForm(f => ({
                    ...f,
                    medicines: [...f.medicines, { name: '', dosage: '', frequency: 'twice', duration: f.durationDays, timings: [], instructions: { beforeFood: false, afterFood: true, notes: '' } }]
                  }))}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-800"
                >
                  + Add Medicine
                </button>
              </div>

              {/* Symptoms to Monitor */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Symptoms to Monitor</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g., fever, headache"
                    value={treatmentForm.newSymptom}
                    onChange={e => setTreatmentForm(f => ({ ...f, newSymptom: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && treatmentForm.newSymptom.trim()) {
                        setTreatmentForm(f => ({
                          ...f,
                          symptomsToMonitor: [...f.symptomsToMonitor, f.newSymptom.trim()],
                          newSymptom: ''
                        }));
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (treatmentForm.newSymptom.trim()) {
                        setTreatmentForm(f => ({
                          ...f,
                          symptomsToMonitor: [...f.symptomsToMonitor, f.newSymptom.trim()],
                          newSymptom: ''
                        }));
                      }
                    }}
                    className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {treatmentForm.symptomsToMonitor.map((s, i) => (
                    <span key={i} className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      {s}
                      <button onClick={() => setTreatmentForm(f => ({ ...f, symptomsToMonitor: f.symptomsToMonitor.filter((_, j) => j !== i) }))} className="hover:text-indigo-900">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Follow-up */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={treatmentForm.followUpRequired}
                      onChange={e => setTreatmentForm(f => ({ ...f, followUpRequired: e.target.checked }))}
                    />
                    <span className="font-semibold text-slate-700">Follow-up Required</span>
                  </label>
                </div>
                {treatmentForm.followUpRequired && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Follow-up After (days)</label>
                    <input
                      type="number"
                      min="1"
                      value={treatmentForm.followUpDays}
                      onChange={e => setTreatmentForm(f => ({ ...f, followUpDays: parseInt(e.target.value) || 14 }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Special Instructions</label>
                <textarea
                  placeholder="Diet restrictions, exercise advice, warning signs to watch for..."
                  value={treatmentForm.specialInstructions}
                  onChange={e => setTreatmentForm(f => ({ ...f, specialInstructions: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none h-20"
                />
              </div>

              {/* Submit */}
              <button
                onClick={submitTreatmentPlan}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
              >
                Create Treatment Plan & Notify Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, sub, icon, highlight }) => (
  <div className={`bg-white rounded-2xl border p-3.5 ${highlight ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      {icon}
    </div>
    <p className={`text-xl font-bold ${highlight ? 'text-red-700' : 'text-slate-800'}`}>{value}</p>
    <p className="text-[11px] text-slate-400">{sub}</p>
  </div>
);

// Patient Card Component
const PatientCard = ({ patient, getTrendBadge, onViewRecovery, onRequestFollowUp }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
    {/* Header */}
    <div className="p-4 border-b border-slate-100">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            patient.overallTrend === 'improving' ? 'bg-green-500' :
            patient.overallTrend === 'worsening' ? 'bg-red-500 animate-pulse' :
            'bg-yellow-500'
          }`} />
          <h4 className="font-bold text-slate-800">{patient.patientId?.name || 'Patient'}</h4>
        </div>
        {getTrendBadge(patient.overallTrend)}
      </div>
      <p className="text-sm text-slate-600 font-medium">{patient.diagnosis}</p>
      <p className="text-xs text-slate-400">Dr. {patient.doctorName} • {new Date(patient.startDate).toLocaleDateString()}</p>
    </div>

    {/* Progress */}
    <div className="px-4 py-2.5">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Day {patient.daysElapsed}/{patient.totalDays}</span>
        <span>{patient.completionPercentage}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            patient.completionPercentage >= 100 ? 'bg-green-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${patient.completionPercentage}%` }}
        />
      </div>
    </div>

    {/* Stats */}
    <div className="px-4 py-2 grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-xs text-slate-500">Logs</p>
        <p className="font-bold text-slate-800 text-sm">{patient.logCount}/{patient.totalDays}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Adherence</p>
        <p className={`font-bold text-sm ${patient.avgAdherence >= 80 ? 'text-green-600' : patient.avgAdherence >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {patient.avgAdherence}%
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Severity</p>
        <p className={`font-bold text-sm ${
          patient.latestLog ? (patient.latestLog.overallSeverity <= 3 ? 'text-green-600' : patient.latestLog.overallSeverity <= 6 ? 'text-yellow-600' : 'text-red-600') : 'text-slate-400'
        }`}>
          {patient.latestLog?.overallSeverity || '-'}/10
        </p>
      </div>
    </div>

    {/* Latest update */}
    {patient.latestLog && (
      <div className="px-4 py-2 border-t border-slate-50">
        <p className="text-xs text-slate-400">
          Last update: {new Date(patient.latestLog.date).toLocaleDateString()} • Feeling: {patient.latestLog.overallFeeling?.replace('_', ' ')}
          {patient.latestLog.needsDoctorAttention && <span className="text-red-600 font-bold ml-1">⚠ Needs Attention</span>}
        </p>
      </div>
    )}

    {/* Actions */}
    <div className="px-4 pb-3 pt-1 flex gap-2">
      <button
        onClick={() => onViewRecovery(patient)}
        className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-1"
      >
        <Eye size={14} /> View Recovery
      </button>
      <button
        onClick={() => onRequestFollowUp(patient._id)}
        className="flex-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-100 transition flex items-center justify-center gap-1"
      >
        <Calendar size={14} /> Follow-up
      </button>
    </div>
  </div>
);

// Doctor Log Entry (expanded with full details)
const DoctorLogEntry = ({ log, getSeverityColor, getTrendBadge }) => {
  const [expanded, setExpanded] = useState(false);

  const feelingLabel = {
    'much_better': '😊 Much Better',
    'better': '🙂 Better',
    'same': '😐 Same',
    'worse': '😟 Worse',
    'much_worse': '😣 Much Worse'
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${log.needsDoctorAttention ? 'border-red-200 bg-red-50/30' : 'border-slate-100 bg-slate-50'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-100/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            log.needsDoctorAttention ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            D{log.dayNumber}
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
              {feelingLabel[log.overallFeeling] || log.overallFeeling}
              {getTrendBadge(log.trend)}
            </p>
            <p className="text-xs text-slate-400">{new Date(log.date).toLocaleDateString()} • Adherence: {log.medicineAdherence}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSeverityColor(log.overallSeverity)}`}>
            {log.overallSeverity}/10
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100/50">
          {/* Symptoms detail */}
          {log.symptoms?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-bold text-slate-500 mb-1">Symptoms Reported</p>
              <div className="space-y-1">
                {log.symptoms.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 capitalize">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${getSeverityColor(s.severity)}`}>
                      {s.severity}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medicines */}
          {log.medicinesTaken?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Medicines</p>
              <div className="space-y-1">
                {log.medicinesTaken.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{m.medicineName}</span>
                    {m.taken ? (
                      <span className="text-green-600 font-bold flex items-center gap-0.5"><CheckCircle size={12} /> Taken</span>
                    ) : (
                      <span className="text-red-600 font-bold flex items-center gap-0.5"><XCircle size={12} /> Skipped{m.skippedReason ? `: ${m.skippedReason}` : ''}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side effects */}
          {log.sideEffects?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-600 mb-1">⚠️ Side Effects</p>
              <div className="flex flex-wrap gap-1">
                {log.sideEffects.map((se, i) => (
                  <span key={i} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{se}</span>
                ))}
              </div>
            </div>
          )}

          {/* New symptoms */}
          {log.newSymptoms?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-600 mb-1">🆕 New Symptoms</p>
              <div className="flex flex-wrap gap-1">
                {log.newSymptoms.map((ns, i) => (
                  <span key={i} className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{ns}</span>
                ))}
              </div>
            </div>
          )}

          {/* Patient notes */}
          {log.patientNotes && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Patient Notes</p>
              <p className="text-xs text-slate-600 bg-white rounded-lg p-2 border border-slate-100">{log.patientNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientRecoveryDashboard;
