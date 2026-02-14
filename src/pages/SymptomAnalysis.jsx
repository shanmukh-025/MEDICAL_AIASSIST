import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Activity, AlertCircle, CheckCircle, Brain, 
  Stethoscope, TrendingUp, AlertTriangle, Shield, 
  Heart, Thermometer, Plus, X, Loader2, Users, Calendar,
  TrendingDown, Save, History as HistoryIcon, LineChart, Download, Bell, BellOff, Lightbulb
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const SymptomAnalysis = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  
  // Translations
  const t = {
    header: lang === 'en' ? 'AI Symptom Analysis' : 'AI లక్షణ విశ్లేషణ',
    subHeader: lang === 'en' ? 'Intelligent Disease Prediction' : 'తెలివైన వ్యాధి అంచనా',
    
    // Input Form
    symptomsLabel: lang === 'en' ? 'What symptoms are you experiencing?' : 'మీరు ఏ లక్షణాలను అనుభవిస్తున్నారు?',
    addSymptom: lang === 'en' ? 'Add Symptom' : 'లక్షణాన్ని జోడించండి',
    duration: lang === 'en' ? 'How long have you had these symptoms?' : 'ఈ లక్షణాలు ఎంతకాలం నుండి ఉన్నాయి?',
    severity: lang === 'en' ? 'Severity Level' : 'తీవ్రత స్థాయి',
    age: lang === 'en' ? 'Age' : 'వయస్సు',
    gender: lang === 'en' ? 'Gender' : 'లింగం',
    male: lang === 'en' ? 'Male' : 'పురుషుడు',
    female: lang === 'en' ? 'Female' : 'స్త్రీ',
    other: lang === 'en' ? 'Other' : 'ఇతర',
    existingConditions: lang === 'en' ? 'Existing Medical Conditions (Optional)' : 'ఇప్పటికే ఉన్న వైద్య పరిస్థితులు (ఐచ్ఛికం)',
    analyzeBtn: lang === 'en' ? 'Analyze Symptoms' : 'లక్షణాలను విశ్లేషించండి',
    analyzing: lang === 'en' ? 'Analyzing...' : 'విశ్లేషిస్తోంది...',
    
    // Common Symptoms
    commonSymptoms: lang === 'en' ? 'Common Symptoms' : 'సాధారణ లక్షణాలు',
    fever: lang === 'en' ? 'Fever' : 'జ్వరం',
    cough: lang === 'en' ? 'Cough' : 'దగ్గు',
    headache: lang === 'en' ? 'Headache' : 'తలనొప్పి',
    fatigue: lang === 'en' ? 'Fatigue' : 'అలసట',
    nausea: lang === 'en' ? 'Nausea' : 'వికారం',
    bodyPain: lang === 'en' ? 'Body Pain' : 'శరీర నొప్పి',
    soreThroat: lang === 'en' ? 'Sore Throat' : 'గొంతు నొప్పి',
    dizziness: lang === 'en' ? 'Dizziness' : 'తల తిరగడం',
    
    // Duration Options
    hours: lang === 'en' ? 'Few Hours' : 'కొన్ని గంటలు',
    day: lang === 'en' ? '1 Day' : '1 రోజు',
    days: lang === 'en' ? '2-3 Days' : '2-3 రోజులు',
    week: lang === 'en' ? '1 Week' : '1 వారం',
    weeks: lang === 'en' ? '2+ Weeks' : '2+ వారాలు',
    
    // Results
    diagnosis: lang === 'en' ? 'Primary Diagnosis' : 'ప్రాథమిక నిర్ధారణ',
    confidence: lang === 'en' ? 'Confidence' : 'విశ్వాసం',
    description: lang === 'en' ? 'Description' : 'వర్ణన',
    causes: lang === 'en' ? 'Possible Causes' : 'సాధ్యమైన కారణాలు',
    recommendations: lang === 'en' ? 'Recommendations' : 'సిఫార్సులు',
    homeRemedies: lang === 'en' ? 'Home Remedies' : 'ఇంటి నివారణలు',
    prevention: lang === 'en' ? 'Prevention' : 'నివారణ',
    urgency: lang === 'en' ? 'Urgency Level' : 'అత్యవసర స్థాయి',
    alternatives: lang === 'en' ? 'Alternative Diagnoses' : 'ప్రత్యామ్నాయ నిర్ధారణలు',
    whenToSeeDoctor: lang === 'en' ? 'When to See a Doctor' : 'వైద్యుడిని ఎప్పుడు చూడాలి',
    
    // Urgency Levels
    low: lang === 'en' ? 'Low' : 'తక్కువ',
    medium: lang === 'en' ? 'Medium' : 'మధ్యస్థ',
    high: lang === 'en' ? 'High' : 'అధికం',
    critical: lang === 'en' ? 'Critical' : 'క్లిష్టమైన',
    
    // Errors
    noSymptoms: lang === 'en' ? 'Please add at least one symptom' : 'దయచేసి కనీసం ఒక లక్షణాన్ని జోడించండి',
    analysisFailed: lang === 'en' ? 'Analysis failed. Please try again.' : 'విశ్లేషణ విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    
    // Actions
    newAnalysis: lang === 'en' ? 'New Analysis' : 'కొత్త విశ్లేషణ',
    viewFamily: lang === 'en' ? 'Family Health Analysis' : 'కుటుంబ ఆరోగ్య విశ్లేషణ',
    
    // Tracking Features
    trackFor: lang === 'en' ? 'Track For' : 'ట్రాక్ కోసం',
    myself: lang === 'en' ? 'Myself' : 'నా కోసం',
    saveLog: lang === 'en' ? 'Save to Log' : 'లాగ్‌లో సేవ్ చేయండి',
    viewHistory: lang === 'en' ? 'View History' : 'చరిత్రను చూడండి',
    symptomHistory: lang === 'en' ? 'Symptom History' : 'లక్షణ చరిత్ర',
    trendAnalysis: lang === 'en' ? 'Trend Analysis' : 'ట్రెండ్ విశ్లేషణ',
    notes: lang === 'en' ? 'Notes (Optional)' : 'గమనికలు (ఐచ్ఛికం)',
    saved: lang === 'en' ? 'Symptom saved to log!' : 'లక్షణం లాగ్‌లో సేవ్ చేయబడింది!',
    trend: lang === 'en' ? 'Trend' : 'ట్రెండ్',
    improving: lang === 'en' ? 'Improving' : 'మెరుగుపడుతోంది',
    worsening: lang === 'en' ? 'Worsening' : 'చెడిపోతోంది',
    stable: lang === 'en' ? 'Stable' : 'స్థిరంగా ఉంది',
    recurring: lang === 'en' ? 'Recurring' : 'మళ్లీ వస్తోంది',
    noHistory: lang === 'en' ? 'No symptom history found' : 'లక్షణ చరిత్ర కనిపించలేదు',
    lastLogged: lang === 'en' ? 'Last Logged' : 'చివరిగా లాగ్ చేసింది',
    viewTrends: lang === 'en' ? 'View Trends' : 'ట్రెండ్లను చూడండి',
    backToEntry: lang === 'en' ? 'Back to Entry' : 'ఎంట్రీకి తిరిగి వెళ్ళండి',
    
    // New: Visualizations & Export
    severityChart: lang === 'en' ? 'Severity Over Time' : 'కాలక్రమంలో తీవ్రత',
    exportPDF: lang === 'en' ? 'Export as PDF' : 'PDF గా ఎగుమతి చేయండి',
    exporting: lang === 'en' ? 'Generating PDF...' : 'PDF రూపొందిస్తోంది...',
    pdfGenerated: lang === 'en' ? 'PDF Downloaded!' : 'PDF డౌన్‌లోడ్ చేయబడింది!',
    
    // New: Reminders
    reminderTitle: lang === 'en' ? 'Symptom Log Reminder' : 'లక్షణ లాగ్ రిమైండర్',
    reminderMsg: lang === 'en' ? "You haven't logged symptoms in" : 'మీరు లాగ్ చేయలేదు',
    daysCount: lang === 'en' ? 'days' : 'రోజులు',
    logNow: lang === 'en' ? 'Log Now' : 'ఇప్పుడు లాగ్ చేయండి',
    dismiss: lang === 'en' ? 'Dismiss' : 'రద్దు చేయండి',
    
    // NEW: Health Episode tracking
    conditionName: lang === 'en' ? 'Condition/Episode Name' : 'వ్యాధి/గోని పేరు',
    conditionOptional: lang === 'en' ? '(Optional - helps track separate health issues)' : '(ఐచ్ఛికం - వేరు ఆరోగ్య సమస్యలను ట్ర్యాక్ చేయడంలో సహాయపడుతుంది)',
    conditionPlaceholder: lang === 'en' ? 'e.g., "Flu Feb 2026", "Knee Injury", "Migraine"' : 'ఉదా: "ఫ్లూ ఫిబ్ర 2026", "మొలకాలు గాయం"',
    
    // NEW: Next Step Recommendations
    nextStepRecommendations: lang === 'en' ? 'Next Step Recommendations' : 'తదుపరి అడుగు సిఫార్సులు',
    homeCareTips: lang === 'en' ? 'Home Care Tips' : 'ఇంటి సంరక్షణ చిట్కాలు',
    visitDoctor: lang === 'en' ? 'Visit Doctor' : 'వైద్యుడిని సందర్శించండి',
    emergencyAction: lang === 'en' ? 'Emergency Action' : 'అత్యవసర చర్య',
    findNearbyHospitals: lang === 'en' ? 'Find Nearby Hospitals' : 'సమీప ఆసుపత్రులను కనుగొనండి',
    filterByCondition: lang === 'en' ? 'Filter by Condition' : 'వ్యాధి ద్వారా ఫిల్టర్ చేయండి',
    allConditions: lang === 'en' ? 'All Conditions' : 'అన్ని వ్యాధులు',
    noConditionName: lang === 'en' ? 'No Condition Name' : 'వ్యాధి పేరు లేదు',
  };
  
  // Default common symptoms list
  const defaultCommonSymptoms = [
    { en: 'Fever', te: 'జ్వరం' },
    { en: 'Cough', te: 'దగ్గు' },
    { en: 'Headache', te: 'తలనొప్పి' },
    { en: 'Fatigue', te: 'అలసట' },
    { en: 'Nausea', te: 'వికారం' },
    { en: 'Body Pain', te: 'శరీర నొప్పి' },
    { en: 'Sore Throat', te: 'గొంతు నొప్పి' },
    { en: 'Dizziness', te: 'తల తిరగడం' },
    { en: 'Chest Pain', te: 'ఛాతీ నొప్పి' },
    { en: 'Shortness of Breath', te: 'శ్వాస ఆడకపోవడం' },
    { en: 'Vomiting', te: 'వాంతులు' },
    { en: 'Diarrhea', te: 'విరేచనాలు' },
  ];
  
  // Common symptoms list (dynamic - learns from user input)
  const [commonSymptomsList, setCommonSymptomsList] = useState(() => {
    const saved = localStorage.getItem('customSymptomsList');
    return saved ? JSON.parse(saved) : defaultCommonSymptoms;
  });
  
  // State
  const [symptoms, setSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState(5);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [existingConditions, setExistingConditions] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // NEW: Tracking features
  const [viewMode, setViewMode] = useState('entry'); // 'entry' or 'history'
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('self'); // 'self' or family member ID
  const [notes, setNotes] = useState('');
  const [conditionName, setConditionName] = useState(''); // NEW: Group related symptoms by health episode
  const [symptomHistory, setSymptomHistory] = useState([]);
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // NEW: Multi-day analysis
  const [selectedDayRange, setSelectedDayRange] = useState(null);
  const [multiDayAnalysis, setMultiDayAnalysis] = useState(null);
  const [loadingMultiDay, setLoadingMultiDay] = useState(false);
  
  // NEW: Condition filter
  const [selectedCondition, setSelectedCondition] = useState('all'); // 'all' or condition name
  
  // NEW: Visualizations & Export
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // NEW: Reminders
  const [showReminder, setShowReminder] = useState(false);
  const [daysSinceLastLog, setDaysSinceLastLog] = useState(0);
  
  // NEW: Nearby Hospitals
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);
  
  // Fetch family members on mount
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API}/api/family`,
          { headers: { 'x-auth-token': token } }
        );
        setFamilyMembers(response.data);
        
        // Check if there's a person parameter in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const personParam = urlParams.get('person');
        if (personParam && response.data.some(m => m._id === personParam)) {
          setSelectedPerson(personParam);
          toast.success(`Tracking symptoms for ${response.data.find(m => m._id === personParam)?.name}`);
        }
      } catch (error) {
        console.error('Error fetching family members:', error);
      }
    };
    
    fetchFamilyMembers();
  }, []);
  
  // Fetch symptom history when viewing history
  useEffect(() => {
    if (viewMode === 'history') {
      fetchSymptomHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedPerson]);

  // NEW: Check for reminder
  useEffect(() => {
    const checkLastLog = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API}/api/health/symptoms/history?days=7`,
          { headers: { 'x-auth-token': token } }
        );
        
        if (response.data.length === 0) {
          // No logs ever
          setShowReminder(true);
          setDaysSinceLastLog(999);
        } else {
          const lastLog = response.data[0];
          const lastLogDate = new Date(lastLog.loggedAt);
          const today = new Date();
          const diffTime = Math.abs(today - lastLogDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setDaysSinceLastLog(diffDays);
          if (diffDays >= 3) {
            setShowReminder(true);
          }
        }
      } catch (error) {
        console.error('Error checking last log:', error);
      }
    };
    
    checkLastLog();
  }, []);
  
  // Add symptom
  const addSymptom = (symptom) => {
    const symptomText = lang === 'en' ? symptom.en : symptom.te;
    if (!symptoms.includes(symptomText)) {
      setSymptoms([...symptoms, symptomText]);
      toast.success(`${symptomText} added`);
    }
  };
  
  // Add custom symptom
  const addCustomSymptom = () => {
    const trimmedSymptom = customSymptom.trim();
    if (!trimmedSymptom) return;
    
    if (!symptoms.includes(trimmedSymptom)) {
      setSymptoms([...symptoms, trimmedSymptom]);
      
      // Add to common symptoms list if it doesn't exist
      const existsInCommon = commonSymptomsList.some(
        symptom => symptom.en.toLowerCase() === trimmedSymptom.toLowerCase() || 
                   symptom.te === trimmedSymptom
      );
      
      if (!existsInCommon) {
        const newSymptomEntry = { en: trimmedSymptom, te: trimmedSymptom };
        const updatedList = [...commonSymptomsList, newSymptomEntry];
        setCommonSymptomsList(updatedList);
        
        // Save to localStorage
        localStorage.setItem('customSymptomsList', JSON.stringify(updatedList));
        
        toast.success(`${trimmedSymptom} added and saved to common symptoms`);
      } else {
        toast.success('Symptom added');
      }
      
      setCustomSymptom('');
    }
  };
  
  // Remove symptom
  const removeSymptom = (symptom) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };
  
  // Analyze symptoms
  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) {
      toast.error(t.noSymptoms);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/ai/analyze-symptoms`,
        {
          symptoms,
          duration: duration || 'Not specified',
          severity: parseInt(severity),
          age: age || null,
          gender: gender || null,
          existingConditions: existingConditions || null,
          language: lang
        },
        { headers: { 'x-auth-token': token } }
      );
      
      setAnalysis(response.data);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(t.analysisFailed);
    } finally {
      setLoading(false);
    }
  };
  
  // Analyze specific entry directly
  const analyzeEntry = async (log) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/ai/analyze-symptoms`,
        {
          symptoms: log.symptoms,
          duration: log.duration || 'Not specified',
          severity: parseInt(log.severity),
          age: age || null,
          gender: gender || null,
          existingConditions: existingConditions || null,
          language: lang
        },
        { headers: { 'x-auth-token': token } }
      );
      
      setAnalysis(response.data);
      toast.success('Analysis complete!');
      
      // Switch to entry view to show results
      setViewMode('entry');
      
      // Scroll to show analysis
      setTimeout(() => {
        const analysisSection = document.getElementById('analysis-results');
        if (analysisSection) {
          analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to analyze this entry';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Select day range without analyzing
  const selectDayRange = (days) => {
    setSelectedDayRange(days);
    setMultiDayAnalysis(null); // Clear previous analysis
  };
  
  // Analyze multiple days of symptom logs
  const analyzeMultipleDays = async () => {
    if (!selectedDayRange) return;
    
    setLoadingMultiDay(true);
    const days = selectedDayRange;
    
    try {
      // Filter logs from the last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      let filteredLogs = symptomHistory.filter(log => 
        new Date(log.loggedAt) >= cutoffDate
      );
      
      // Further filter by condition if selected
      if (selectedCondition !== 'all') {
        filteredLogs = filteredLogs.filter(log => {
          if (selectedCondition === 'none') {
            return !log.conditionName || log.conditionName === '';
          }
          return log.conditionName === selectedCondition;
        });
      }
      
      console.log(`Analyzing last ${days} days:`, {
        totalHistory: symptomHistory.length,
        filteredLogs: filteredLogs.length,
        selectedCondition,
        cutoffDate: cutoffDate.toISOString()
      });
      
      if (filteredLogs.length === 0) {
        const conditionMsg = selectedCondition !== 'all' 
          ? ` for "${selectedCondition === 'none' ? 'No Condition Name' : selectedCondition}"`
          : '';
        toast.error(`No symptom logs found in the last ${days} day${days > 1 ? 's' : ''}${conditionMsg}`);
        setLoadingMultiDay(false);
        setSelectedDayRange(null);
        return;
      }
      
      // Get person name
      let personName = 'yourself';
      if (selectedPerson !== 'self') {
        const member = familyMembers.find(m => m._id === selectedPerson);
        if (member) personName = member.name;
      }
      
      const token = localStorage.getItem('token');
      console.log('Sending multi-day analysis request:', {
        endpoint: `${API}/api/ai/analyze-symptom-trends`,
        logsCount: filteredLogs.length,
        days,
        personName
      });
      
      const response = await axios.post(
        `${API}/api/ai/analyze-symptom-trends`,
        {
          symptomHistory: filteredLogs,
          personName,
          dayRange: days
        },
        { headers: { 'x-auth-token': token } }
      );
      
      console.log('Multi-day analysis response:', response.data);
      
      setMultiDayAnalysis(response.data);
      toast.success(`Analyzed ${filteredLogs.length} log${filteredLogs.length > 1 ? 's' : ''} from last ${days} day${days > 1 ? 's' : ''}`);
      
      // Scroll to show analysis
      setTimeout(() => {
        const multiDaySection = document.getElementById('multi-day-analysis');
        if (multiDaySection) {
          multiDaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Multi-day analysis error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to analyze symptom trends. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoadingMultiDay(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setSymptoms([]);
    setCustomSymptom('');
    setDuration('');
    setSeverity(5);
    setAge('');
    setGender('');
    setExistingConditions('');
    setNotes('');
    setConditionName('');
    setAnalysis(null);
    setShowHospitals(false);
    setNearbyHospitals([]);
  };
  
  // NEW: Find nearby hospitals for condition
  const findNearbyHospitals = async () => {
    setLoadingHospitals(true);
    setShowHospitals(true);
    
    try {
      // Get user's location first
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          // Extract specialties from AI analysis
          const specialties = analysis?.relatedSpecialties || [];
          
          // Search hospitals
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API}/api/hospitals/search-by-condition`,
            {
              latitude: location.latitude,
              longitude: location.longitude,
              specialties: specialties,
              maxDistance: 50 // 50 km radius
            },
            { headers: { 'x-auth-token': token } }
          );
          
          setNearbyHospitals(response.data);
          
          if (response.data.length === 0) {
            toast.info('No hospitals found within 50km radius');
          } else {
            toast.success(`Found ${response.data.length} nearby hospital(s)`);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to get your location. Please enable location access.');
        }
      );
    } catch (error) {
      console.error('Error finding hospitals:', error);
      toast.error('Failed to find nearby hospitals');
    } finally {
      setLoadingHospitals(false);
    }
  };
  
  // Get urgency color
  const getUrgencyColor = (urgency) => {
    const level = urgency?.toLowerCase();
    if (level === 'low') return 'text-green-600 bg-green-50 border-green-200';
    if (level === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (level === 'high') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (level === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };
  
  // NEW: Save symptom log
  const saveSymptomLog = async () => {
    if (symptoms.length === 0) {
      toast.error(t.noSymptoms);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/health/symptoms/log`,
        {
          familyMemberId: selectedPerson === 'self' ? null : selectedPerson,
          symptoms,
          severity: parseInt(severity),
          duration: duration || 'Not specified',
          notes,
          conditionName: conditionName || null,
          aiAnalysis: analysis || {}
        },
        { headers: { 'x-auth-token': token } }
      );
      
      toast.success(t.saved);
      resetForm();
    } catch (error) {
      console.error('Error saving symptom log:', error);
      toast.error('Failed to save log');
    }
  };
  
  // NEW: Fetch symptom history
  const fetchSymptomHistory = async () => {
    setLoadingHistory(true);
    setTrendAnalysis(null);
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = selectedPerson === 'self' 
        ? `${API}/api/health/symptoms/history?days=30`
        : `${API}/api/health/symptoms/member/${selectedPerson}?days=30`;
      
      const response = await axios.get(endpoint, {
        headers: { 'x-auth-token': token }
      });
      
      setSymptomHistory(response.data);
      
      // If there's history, analyze trends
      if (response.data.length > 1) {
        analyzeTrends(response.data);
      }
    } catch (error) {
      console.error('Error fetching symptom history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // NEW: Analyze symptom trends
  const analyzeTrends = async (history) => {
    try {
      const token = localStorage.getItem('token');
      const personName = selectedPerson === 'self' 
        ? 'yourself' 
        : familyMembers.find(m => m._id === selectedPerson)?.name || 'this person';
      
      const response = await axios.post(
        `${API}/api/ai/analyze-symptom-trends`,
        {
          symptomHistory: history,
          personName
        },
        { headers: { 'x-auth-token': token } }
      );
      
      setTrendAnalysis(response.data);
    } catch (error) {
      console.error('Error analyzing trends:', error);
    }
  };
  
  // NEW: Prepare chart data
  const prepareChartData = () => {
    if (!symptomHistory || symptomHistory.length === 0) return [];
    
    return symptomHistory
      .slice()
      .reverse() // Show chronological order (oldest to newest)
      .map(log => ({
        date: new Date(log.loggedAt).toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        severity: log.severity,
        symptoms: log.symptoms.join(', ')
      }));
  };
  
  // NEW: Export to PDF
  // Export individual analysis to PDF
  const exportAnalysisToPDF = async () => {
    if (!analysis) return;
    
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      const personName = selectedPerson === 'self' 
        ? 'Your' 
        : familyMembers.find(m => m._id === selectedPerson)?.name + "'s" || 'Patient';
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text('AI Symptom Analysis Report', 14, 20);
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text(`Patient: ${personName.replace(/'/g, '')}`, 14, 34);
      
      // Primary Diagnosis
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Primary Diagnosis', 14, 45);
      
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text(analysis.primaryDiagnosis, 14, 52);
      
      // Urgency & Confidence
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Urgency Level: ${analysis.urgencyLevel}`, 14, 59);
      doc.text(`Confidence: ${analysis.confidence}`, 14, 65);
      
      // Description
      doc.setFontSize(11);
      doc.setTextColor(0);
      const desc = doc.splitTextToSize(analysis.description, 180);
      doc.text(desc, 14, 75);
      
      let yPos = 75 + (desc.length * 5) + 10;
      
      // Possible Causes
      if (analysis.possibleCauses && analysis.possibleCauses.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Possible Causes', 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setTextColor(60);
        analysis.possibleCauses.forEach((cause) => {
          const causeText = doc.splitTextToSize(`• ${cause}`, 175);
          doc.text(causeText, 18, yPos);
          yPos += causeText.length * 5;
        });
        yPos += 5;
      }
      
      // Recommendations
      if (analysis.recommendations && analysis.recommendations.length > 0 && yPos < 250) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Recommendations', 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setTextColor(60);
        analysis.recommendations.forEach((rec) => {
          if (yPos < 270) {
            const recText = doc.splitTextToSize(`• ${rec}`, 175);
            doc.text(recText, 18, yPos);
            yPos += recText.length * 5;
          }
        });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'Generated by Village Medicine Assistant - AI Analysis',
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
      doc.text(
        'Please consult a healthcare professional for accurate diagnosis',
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 6,
        { align: 'center' }
      );
      
      const fileName = `AI_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPDF(false);
    }
  };
  
  // Export multi-day analysis to PDF
  const exportMultiDayToPDF = async () => {
    if (!multiDayAnalysis) return;
    
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      const personName = selectedPerson === 'self' 
        ? 'Your' 
        : familyMembers.find(m => m._id === selectedPerson)?.name + "'s" || 'Patient';
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text(`${selectedDayRange}-Day Trend Analysis`, 14, 20);
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text(`Patient: ${personName.replace(/'/g, '')}`, 14, 34);
      
      let yPos = 45;
      
      // Summary
      if (multiDayAnalysis.summary) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Summary', 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setTextColor(60);
        const summary = doc.splitTextToSize(multiDayAnalysis.summary, 180);
        doc.text(summary, 14, yPos);
        yPos += summary.length * 5 + 8;
      }
      
      // Trend Status
      if (yPos < 260) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Trend Status', 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        const trendColor = multiDayAnalysis.trend === 'improving' ? [34, 197, 94] :
                           multiDayAnalysis.trend === 'worsening' ? [239, 68, 68] :
                           multiDayAnalysis.trend === 'stable' ? [59, 130, 246] : [251, 146, 60];
        doc.setTextColor(...trendColor);
        doc.text(`Trend: ${multiDayAnalysis.trend.toUpperCase()} (${multiDayAnalysis.trendConfidence}% confidence)`, 14, yPos);
        yPos += 6;
        
        doc.setTextColor(0);
        doc.text(`Current Diagnosis: ${multiDayAnalysis.currentDiagnosis}`, 14, yPos);
        yPos += 6;
        doc.text(`Urgency Level: ${multiDayAnalysis.urgencyLevel}`, 14, yPos);
        yPos += 10;
      }
      
      // Insights
      if (multiDayAnalysis.insights && multiDayAnalysis.insights.length > 0 && yPos < 240) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Key Insights', 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setTextColor(60);
        multiDayAnalysis.insights.forEach((insight) => {
          if (yPos < 260) {
            const insightText = doc.splitTextToSize(`• ${insight}`, 175);
            doc.text(insightText, 18, yPos);
            yPos += insightText.length * 5;
          }
        });
        yPos += 5;
      }
      
      // Recommendations
      if (multiDayAnalysis.recommendations && multiDayAnalysis.recommendations.length > 0 && yPos < 240) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Recommendations', 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setTextColor(60);
        multiDayAnalysis.recommendations.forEach((rec) => {
          if (yPos < 270) {
            const recText = doc.splitTextToSize(`• ${rec}`, 175);
            doc.text(recText, 18, yPos);
            yPos += recText.length * 5;
          }
        });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'Generated by Village Medicine Assistant - AI Trend Analysis',
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
      doc.text(
        'Please consult a healthcare professional for accurate diagnosis',
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 6,
        { align: 'center' }
      );
      
      const fileName = `${selectedDayRange}Day_Trend_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPDF(false);
    }
  };
  
  const exportToPDF = async () => {
    setExportingPDF(true);
    
    try {
      const doc = new jsPDF();
      const personName = selectedPerson === 'self' 
        ? 'Your' 
        : familyMembers.find(m => m._id === selectedPerson)?.name + "'s" || 'Patient';
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235); // Blue
      doc.text(`${personName} Symptom History`, 14, 20);
      
      // Date range
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Trend analysis summary (if available)
      if (trendAnalysis) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Trend Analysis Summary', 14, 40);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const trendColor = trendAnalysis.trend === 'improving' ? [34, 197, 94] :
                           trendAnalysis.trend === 'worsening' ? [239, 68, 68] :
                           trendAnalysis.trend === 'stable' ? [59, 130, 246] : [251, 146, 60];
        doc.setTextColor(...trendColor);
        doc.text(`Trend: ${trendAnalysis.trend.toUpperCase()} (${trendAnalysis.trendConfidence}% confidence)`, 14, 48);
        
        doc.setTextColor(0);
        doc.text(`Current Status: ${trendAnalysis.currentDiagnosis}`, 14, 55);
        doc.text(`Urgency Level: ${trendAnalysis.urgencyLevel}`, 14, 62);
      }
      
      // Symptom history table
      const tableStartY = trendAnalysis ? 75 : 40;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Symptom Logs', 14, tableStartY);
      
      const tableData = symptomHistory.map(log => [
        new Date(log.loggedAt).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        log.symptoms.join(', '),
        `${log.severity}/10`,
        log.duration && log.duration !== 'Not specified' ? log.duration : '-',
        log.notes || '-'
      ]);
      
      doc.autoTable({
        startY: tableStartY + 5,
        head: [['Date & Time', 'Symptoms', 'Severity', 'Duration', 'Notes']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [37, 99, 235],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 60 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 45 }
        },
        didDrawPage: function() {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            'Generated by Village Medicine Assistant',
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      });
      
      // Add recommendations if available
      if (trendAnalysis && trendAnalysis.recommendations) {
        const finalY = doc.lastAutoTable.finalY + 10;
        
        if (finalY + 40 < doc.internal.pageSize.height) {
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text('Recommendations', 14, finalY);
          
          doc.setFontSize(9);
          doc.setTextColor(60);
          trendAnalysis.recommendations.forEach((rec, idx) => {
            const yPos = finalY + 8 + (idx * 6);
            if (yPos < doc.internal.pageSize.height - 20) {
              doc.text(`• ${rec}`, 18, yPos);
            }
          });
        }
      }
      
      // Save PDF
      const fileName = `${personName.replace(/'/g, '')}_Symptom_History_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success(t.pdfGenerated);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPDF(false);
    }
  };
  
  // NEW: Get trend color
  const getTrendColor = (trend) => {
    const t = trend?.toLowerCase();
    if (t === 'improving') return 'text-green-600 bg-green-50 border-green-200';
    if (t === 'worsening') return 'text-red-600 bg-red-50 border-red-200';
    if (t === 'stable') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (t === 'recurring') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };
  
  // NEW: Get trend icon
  const getTrendIcon = (trend) => {
    const t = trend?.toLowerCase();
    if (t === 'improving') return <TrendingDown className="text-green-600" size={20} />;
    if (t === 'worsening') return <TrendingUp className="text-red-600" size={20} />;
    if (t === 'stable') return <Activity className="text-blue-600" size={20} />;
    if (t === 'recurring') return <AlertTriangle className="text-orange-600" size={20} />;
    return <Activity size={20} />;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
          >
            <ArrowLeft size={20}/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Brain className="text-blue-600" size={24} />
              {t.header}
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.subHeader}</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Reminder Banner */}
        {showReminder && viewMode === 'entry' && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-3xl shadow-lg p-5 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-4">
              <Bell size={28} className="animate-bounce" />
              <div>
                <h3 className="font-bold text-lg">{t.reminderTitle}</h3>
                <p className="text-sm opacity-90">
                  {daysSinceLastLog === 999 
                    ? (lang === 'en' ? "You haven't logged any symptoms yet!" : 'మీరు ఇంకా ఏ లక్షణాలను లాగ్ చేయలేదు!')
                    : `${t.reminderMsg} ${daysSinceLastLog} ${t.daysCount}!`
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReminder(false)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-medium transition flex items-center gap-2"
              >
                <BellOff size={16} />
                {t.dismiss}
              </button>
            </div>
          </div>
        )}
        
        {/* View Mode Toggle & Person Selector */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('entry')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  viewMode === 'entry'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity size={16} />
                {t.newAnalysis}
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  viewMode === 'history'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HistoryIcon size={16} />
                {t.viewHistory}
              </button>
            </div>
            
            {/* Person Selector */}
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase">{t.trackFor}</label>
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="bg-slate-50 border-2 border-slate-200 px-4 py-2 rounded-xl font-medium outline-none focus:border-blue-500 transition"
              >
                <option value="self">👤 {t.myself}</option>
                {familyMembers.map(member => (
                  <option key={member._id} value={member._id}>
                    👥 {member.name} ({member.relationship}) - Age {member.age}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Currently Tracking Card */}
        {selectedPerson !== 'self' && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-3xl shadow-lg p-5">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-full">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-medium opacity-90">
                  {lang === 'en' ? 'Currently Tracking' : 'ప్రస్తుతం ట్రాక్ చేస్తోంది'}
                </p>
                <h3 className="text-xl font-bold">
                  {familyMembers.find(m => m._id === selectedPerson)?.name || 'Family Member'}
                </h3>
                <p className="text-sm opacity-90">
                  {familyMembers.find(m => m._id === selectedPerson)?.relationship} • {' '}
                  {lang === 'en' ? 'Age' : 'వయస్సు'} {familyMembers.find(m => m._id === selectedPerson)?.age}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content - Entry Mode (Input Form) */}
        {viewMode === 'entry' && !analysis && (
          <div className="space-y-6">
            {/* Symptoms Input */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="text-blue-600" size={20} />
                {t.symptomsLabel}
              </h2>
              
              {/* Selected Symptoms */}
              {symptoms.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {symptoms.map((symptom, index) => (
                    <div 
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-2 rounded-xl flex items-center gap-2 font-medium text-sm"
                    >
                      {symptom}
                      <button onClick={() => removeSymptom(symptom)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Custom Symptom Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSymptom()}
                  placeholder={t.addSymptom}
                  className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition"
                />
                <button 
                  onClick={addCustomSymptom}
                  className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              {/* Common Symptoms */}
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">{t.commonSymptoms}</p>
                <div className="flex flex-wrap gap-2">
                  {commonSymptomsList.map((symptom, index) => (
                    <button
                      key={index}
                      onClick={() => addSymptom(symptom)}
                      className="bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 px-3 py-2 rounded-xl text-sm font-medium transition"
                    >
                      {lang === 'en' ? symptom.en : symptom.te}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
              {/* Severity */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase mb-2 flex items-center gap-2">
                  <TrendingUp size={16} className="text-slate-500" />
                  {t.severity}: {severity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{t.low}</span>
                  <span>{t.medium}</span>
                  <span>{t.high}</span>
                </div>
              </div>
              
              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase mb-2 block">{t.age}</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase mb-2 block">{t.gender}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Select</option>
                    <option value="Male">{t.male}</option>
                    <option value="Female">{t.female}</option>
                    <option value="Other">{t.other}</option>
                  </select>
                </div>
              </div>
              
              {/* Existing Conditions */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase mb-2 block">{t.existingConditions}</label>
                <input
                  type="text"
                  value={existingConditions}
                  onChange={(e) => setExistingConditions(e.target.value)}
                  placeholder="Diabetes, Hypertension, etc."
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition"
                />
              </div>
              
              {/* Condition/Episode Name */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase mb-2 block">
                  {t.conditionName} 
                  <span className="text-slate-500 font-normal ml-2 text-xs normal-case">{t.conditionOptional}</span>
                </label>
                <input
                  type="text"
                  value={conditionName}
                  onChange={(e) => setConditionName(e.target.value)}
                  placeholder={t.conditionPlaceholder}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition"
                />
                <p className="text-xs text-slate-500 mt-1 italic">
                  💡 {lang === 'en' 
                    ? 'Helps separate different health issues (e.g., knee pain vs flu)' 
                    : 'వివిధ ఆరోగ్య సమస్యలను వేరు చేయడానికి సహాయపడుతుంది'}
                </p>
              </div>
              
              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase mb-2 block">{t.notes}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={lang === 'en' ? 'Any additional details about symptoms...' : 'లక్షణాల గురించి అదనపు వివరాలు...'}
                  rows="3"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition resize-none"
                />
              </div>
            </div>
            
            {/* Analyze Button */}
            <button 
              onClick={analyzeSymptoms}
              disabled={loading || symptoms.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <Stethoscope size={20} />
                  {t.analyzeBtn}
                </>
              )}
            </button>
            
            {/* Save to Log Button */}
            <button 
              onClick={saveSymptomLog}
              disabled={symptoms.length === 0}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {t.saveLog}
            </button>
            
            {/* Family Analysis Link */}
            <button 
              onClick={() => navigate('/family-health-analysis')}
              className="w-full bg-white text-purple-600 py-4 rounded-xl font-bold border-2 border-purple-200 hover:bg-purple-50 transition flex items-center justify-center gap-2"
            >
              <Users size={20} />
              {t.viewFamily}
            </button>
          </div>
        )}
        
        {/* Main Content - Entry Mode with Analysis Results */}
        {viewMode === 'entry' && analysis && (
          <>
            {/* Export PDF Button */}
            <div className="mb-4">
              <button
                onClick={exportAnalysisToPDF}
                disabled={exportingPDF}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-2xl font-bold text-base hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {exportingPDF ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {lang === 'en' ? 'Generating PDF...' : 'PDF రూపొందిస్తోంది...'}
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    {lang === 'en' ? 'Export Analysis as PDF (Share with Doctor)' : 'PDF గా ఎగుమతి చేయండి (వైద్యుడితో భాగస్వామ్యం చేయండి)'}
                  </>
                )}
              </button>
            </div>
            
            {/* Analysis Results */}
            <div id="analysis-results" className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold text-2xl text-slate-900">{analysis.primaryDiagnosis}</h2>
                  <p className="text-sm text-slate-500 mt-1">{t.diagnosis}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl font-bold text-sm border-2 ${getUrgencyColor(analysis.urgencyLevel)}`}>
                  {analysis.urgencyLevel}
                </div>
              </div>
              
              {/* Confidence */}
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase">{t.confidence}: </span>
                <span className="font-bold text-blue-600">{analysis.confidence}</span>
              </div>
              
              {/* Description */}
              <div className="bg-blue-50 p-4 rounded-xl mb-4">
                <p className="text-slate-700 leading-relaxed">{analysis.description}</p>
              </div>
            </div>
            
            {/* Possible Causes */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                <AlertCircle className="text-orange-600" size={20} />
                {t.causes}
              </h3>
              <ul className="space-y-2">
                {analysis.possibleCauses?.map((cause, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Recommendations */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                {t.recommendations}
              </h3>
              <ul className="space-y-2">
                {analysis.recommendations?.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={16} />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Home Remedies */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                <Heart className="text-pink-600" size={20} />
                {t.homeRemedies}
              </h3>
              <ul className="space-y-2">
                {analysis.homeRemedies?.map((remedy, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <Heart className="text-pink-500 mt-1 flex-shrink-0" size={16} />
                    <span>{remedy}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* When to See Doctor */}
            <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6">
              <h3 className="font-bold text-lg text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={20} />
                {t.whenToSeeDoctor}
              </h3>
              <p className="text-red-800 leading-relaxed">{analysis.whenToSeeDoctor}</p>
            </div>
            
            {/* Preventive Measures */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="text-blue-600" size={20} />
                {t.prevention}
              </h3>
              <ul className="space-y-2">
                {analysis.preventiveMeasures?.map((measure, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <Shield className="text-blue-500 mt-1 flex-shrink-0" size={16} />
                    <span>{measure}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Next Step Recommendations */}
            {analysis.nextStepRecommendations && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl shadow-sm border-2 border-indigo-200 p-6">
                <h3 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="text-indigo-600" size={24} />
                  {t.nextStepRecommendations}
                </h3>
                
                <div className="space-y-4">
                  {/* Home Care Tips */}
                  {analysis.nextStepRecommendations.homeCareTips && (
                    <div className="bg-white rounded-2xl p-5 border border-green-200">
                      <h4 className="font-bold text-md text-green-900 mb-3 flex items-center gap-2">
                        <Heart className="text-green-600" size={20} />
                        {t.homeCareTips}
                      </h4>
                      <ul className="space-y-2">
                        {analysis.nextStepRecommendations.homeCareTips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-slate-700">
                            <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={16} />
                            <span className="text-sm">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Visit Doctor */}
                  {analysis.nextStepRecommendations.visitDoctor && (
                    <div className="bg-white rounded-2xl p-5 border border-blue-200">
                      <h4 className="font-bold text-md text-blue-900 mb-3 flex items-center gap-2">
                        <Stethoscope className="text-blue-600" size={20} />
                        {t.visitDoctor}
                      </h4>
                      <p className="text-slate-700 text-sm leading-relaxed">
                        {analysis.nextStepRecommendations.visitDoctor}
                      </p>
                    </div>
                  )}
                  
                  {/* Emergency Action */}
                  {analysis.nextStepRecommendations.emergencyAction && (
                    <div className="bg-red-50 rounded-2xl p-5 border-2 border-red-300">
                      <h4 className="font-bold text-md text-red-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="text-red-600" size={20} />
                        {t.emergencyAction}
                      </h4>
                      <p className="text-red-800 text-sm leading-relaxed font-medium">
                        {analysis.nextStepRecommendations.emergencyAction}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Alternative Diagnoses */}
            {analysis.alternativeDiagnoses && analysis.alternativeDiagnoses.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                  <Activity className="text-purple-600" size={20} />
                  {t.alternatives}
                </h3>
                <div className="space-y-3">
                  {analysis.alternativeDiagnoses.map((alt, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                      <span className="font-medium text-slate-700">{alt.condition}</span>
                      <span className="text-purple-600 font-bold text-sm">{alt.probability}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={resetForm}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition"
              >
                {t.newAnalysis}
              </button>
              <button 
                onClick={() => navigate('/family-health-analysis')}
                className="flex-1 bg-white text-purple-600 py-4 rounded-xl font-bold border-2 border-purple-200 hover:bg-purple-50 transition"
              >
                {t.viewFamily}
              </button>
            </div>
            
            {/* Find Nearby Hospitals Button */}
            <button
              onClick={findNearbyHospitals}
              disabled={loadingHospitals}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {loadingHospitals ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {lang === 'en' ? 'Finding Hospitals...' : 'ఆసుపత్రులను కనుగొంటోంది...'}
                </>
              ) : (
                <>
                  <Activity size={20} />
                  {t.findNearbyHospitals}
                </>
              )}
            </button>
            
            {/* Nearby Hospitals List */}
            {showHospitals && nearbyHospitals.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                  <Activity className="text-emerald-600" size={20} />
                  {lang === 'en' ? 'Nearby Hospitals for Treatment' : 'చికిత్స కోసం సమీప ఆసుపత్రులు'}
                  <span className="ml-auto text-sm text-slate-500">
                    ({nearbyHospitals.length} {lang === 'en' ? 'found' : 'కనుగొనబడింది'})
                  </span>
                </h3>
                
                <div className="space-y-4">
                  {nearbyHospitals.map((result) => (
                    <div 
                      key={result.hospital._id} 
                      className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-slate-900">{result.hospital.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{result.hospital.address}</p>
                        </div>
                        <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {result.distance} km
                        </div>
                      </div>
                      
                      {result.hospital.phone && (
                        <div className="flex items-center gap-2 text-slate-700 text-sm mb-2">
                          <Activity size={16} className="text-emerald-600" />
                          <a href={`tel:${result.hospital.phone}`} className="hover:text-emerald-600 font-medium">
                            {result.hospital.phone}
                          </a>
                        </div>
                      )}
                      
                      {result.hospital.services && result.hospital.services.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {result.hospital.services.slice(0, 3).map((service, idx) => (
                            <span 
                              key={idx} 
                              className="bg-white px-3 py-1 rounded-full text-xs font-medium text-emerald-700 border border-emerald-200"
                            >
                              {service}
                            </span>
                          ))}
                          {result.hospital.services.length > 3 && (
                            <span className="text-xs text-slate-500 px-2 py-1">
                              +{result.hospital.services.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      {result.hospital.workingHours && (
                        <div className="text-xs text-slate-600 mt-2">
                          {lang === 'en' ? 'Hours:' : 'గంటలు:'} {result.hospital.workingHours}
                        </div>
                      )}
                      
                      <div className="mt-3 flex gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${result.hospital.location.latitude},${result.hospital.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-xl text-sm font-bold hover:bg-emerald-700 transition text-center"
                        >
                          {lang === 'en' ? 'Get Directions' : 'దిశలను పొందండి'}
                        </a>
                        {result.hospital.phone && (
                          <a
                            href={`tel:${result.hospital.phone}`}
                            className="flex-1 bg-white text-emerald-600 py-2 px-4 rounded-xl text-sm font-bold border-2 border-emerald-200 hover:bg-emerald-50 transition text-center"
                          >
                            {lang === 'en' ? 'Call Now' : 'ఇప్పుడు కాల్ చేయండి'}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* History View Mode */}
        {viewMode === 'history' && (
          <>
            {loadingHistory ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={40} />
                <p className="text-slate-600">Loading symptom history...</p>
              </div>
            ) : symptomHistory.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
                <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-600 font-medium">{t.noHistory}</p>
                <button
                  onClick={() => setViewMode('entry')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  {t.backToEntry}
                </button>
              </div>
            ) : (
              <>
                {/* Condition Filter */}
                {(() => {
                  // Get unique condition names from history
                  const uniqueConditions = [...new Set(
                    symptomHistory
                      .map(log => log.conditionName)
                      .filter(name => name && name.trim() !== '')
                  )];
                  
                  const hasConditions = uniqueConditions.length > 0;
                  const hasUnnamed = symptomHistory.some(log => !log.conditionName || log.conditionName.trim() === '');
                  
                  if (hasConditions) {
                    return (
                      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 mb-6">
                        <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">
                          {t.filterByCondition}
                        </label>
                        <select
                          value={selectedCondition}
                          onChange={(e) => {
                            setSelectedCondition(e.target.value);
                            setMultiDayAnalysis(null); // Clear analysis when filter changes
                          }}
                          className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition font-medium"
                        >
                          <option value="all">{t.allConditions}</option>
                          {hasUnnamed && <option value="none">{t.noConditionName}</option>}
                          {uniqueConditions.map((condition, idx) => (
                            <option key={idx} value={condition}>{condition}</option>
                          ))}
                        </select>
                        {selectedCondition !== 'all' && (
                          <p className="text-xs text-indigo-600 mt-2 font-medium">
                            \u2714 Showing only: {selectedCondition === 'none' ? t.noConditionName : selectedCondition}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Multi-Day Analysis Selector */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl shadow-sm border border-indigo-200 p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="text-indigo-600" size={24} />
                    <h2 className="font-bold text-xl text-slate-900">
                      {lang === 'en' ? 'Multi-Day Analysis' : 'బహుళ-దినాల విశ్లేషణ'}
                    </h2>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    {lang === 'en' 
                      ? 'Analyze symptom trends across multiple days to identify patterns and get comprehensive AI insights.'
                      : 'నమూనాలను గుర్తించడానికి మరియు సమగ్ర AI అంతర్దృష్టులను పొందడానికి అనేక రోజుల్లో లక్షణ పోకడలను విశ్లేషించండి.'}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[1, 3, 5, 7, 10, 14, 30].map(days => (
                      <button
                        key={days}
                        onClick={() => selectDayRange(days)}
                        disabled={loadingMultiDay}
                        className={`px-4 py-3 rounded-xl font-bold text-sm transition ${
                          selectedDayRange === days
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="text-2xl font-black">{days}</div>
                        <div className="text-xs opacity-80">
                          {days === 1 ? (lang === 'en' ? 'Day' : 'రోజు') : (lang === 'en' ? 'Days' : 'రోజులు')}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* AI Analysis Button */}
                  {selectedDayRange && (
                    <div className="mt-4">
                      <button
                        onClick={analyzeMultipleDays}
                        disabled={loadingMultiDay}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-2xl font-bold text-base hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        {loadingMultiDay ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            {lang === 'en' ? 'Analyzing...' : 'విశ్లేషిస్తోంది...'}
                          </>
                        ) : (
                          <>
                            <Brain size={20} />
                            {lang === 'en' 
                              ? `Get AI Analysis for Last ${selectedDayRange} Day${selectedDayRange > 1 ? 's' : ''}`
                              : `చివరి ${selectedDayRange} ${selectedDayRange === 1 ? 'రోజు' : 'రోజుల'} కోసం AI విశ్లేషణ పొందండి`}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Multi-Day Analysis Results */}
                {multiDayAnalysis && (
                  <div id="multi-day-analysis" className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl shadow-sm border border-blue-200 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="text-blue-600" size={24} />
                      <h2 className="font-bold text-xl text-slate-900">
                        {lang === 'en' 
                          ? `${selectedDayRange}-Day Trend Analysis` 
                          : `${selectedDayRange}-రోజుల పోకడ విశ్లేషణ`}
                      </h2>
                    </div>
                    
                    {/* Export PDF Button */}
                    <div className="mb-4">
                      <button
                        onClick={exportMultiDayToPDF}
                        disabled={exportingPDF}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-2xl font-bold text-base hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        {exportingPDF ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            {lang === 'en' ? 'Generating PDF...' : 'PDF రూపొందిస్తోంది...'}
                          </>
                        ) : (
                          <>
                            <Download size={20} />
                            {lang === 'en' ? 'Export Trend Analysis as PDF (Share with Doctor)' : 'PDF గా ఎగుమతి చేయండి (వైద్యుడితో భాగస్వామ్యం చేయండి)'}
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Summary of Logs */}
                    {multiDayAnalysis.summary && (
                      <div className="bg-white rounded-2xl p-4 mb-4 border-l-4 border-blue-500">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <Calendar className="text-blue-600" size={18} />
                          {lang === 'en' ? `${selectedDayRange}-Day Summary` : `${selectedDayRange}-రోజుల సారాంశం`}
                        </h3>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {multiDayAnalysis.summary}
                        </p>
                      </div>
                    )}
                    
                    {/* Clinical Assumptions */}
                    {multiDayAnalysis.assumptions && multiDayAnalysis.assumptions.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 mb-4 border-2 border-purple-200">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <Brain className="text-purple-600" size={18} />
                          {lang === 'en' ? 'Clinical Assumptions' : 'క్లినికల్ ఊహలు'}
                        </h3>
                        <ul className="space-y-2">
                          {multiDayAnalysis.assumptions.map((assumption, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                                {index + 1}
                              </div>
                              <span className="leading-relaxed">{assumption}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Trend & Current Diagnosis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className={`border-2 rounded-2xl p-4 ${getTrendColor(multiDayAnalysis.trend)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {getTrendIcon(multiDayAnalysis.trend)}
                          <span className="text-sm font-bold uppercase tracking-wide">{t.trend}</span>
                        </div>
                        <p className="text-2xl font-bold mb-1 capitalize">{multiDayAnalysis.trend}</p>
                        <p className="text-sm opacity-90">{multiDayAnalysis.pattern?.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-white/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-current rounded-full"
                              style={{ width: `${multiDayAnalysis.trendConfidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{multiDayAnalysis.trendConfidence}%</span>
                        </div>
                      </div>
                      
                      <div className="border-2 rounded-2xl p-4 bg-white">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="text-purple-600" size={20} />
                          <span className="text-sm font-bold uppercase tracking-wide text-slate-600">Current Status</span>
                        </div>
                        <p className="text-lg font-bold text-slate-900 mb-1">{multiDayAnalysis.currentDiagnosis}</p>
                        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${getUrgencyColor(multiDayAnalysis.urgencyLevel)}`}>
                          <AlertCircle size={14} />
                          <span className="text-xs font-bold uppercase">{multiDayAnalysis.urgencyLevel}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Insights */}
                    {multiDayAnalysis.insights && multiDayAnalysis.insights.length > 0 && (
                      <div className="bg-white rounded-2xl p-4 mb-4">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <Lightbulb className="text-yellow-600" size={18} />
                          {lang === 'en' ? 'Key Insights' : 'ముఖ్య అంతర్దృష్టులు'}
                        </h3>
                        <ul className="space-y-2">
                          {multiDayAnalysis.insights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                                {index + 1}
                              </div>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Recommendations */}
                    {multiDayAnalysis.recommendations && multiDayAnalysis.recommendations.length > 0 && (
                      <div className="bg-white rounded-2xl p-4">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <CheckCircle className="text-green-600" size={18} />
                          {lang === 'en' ? 'Recommendations' : 'సిఫార్సులు'}
                        </h3>
                        <ul className="space-y-2">
                          {multiDayAnalysis.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                              <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Trend Analysis */}
                {trendAnalysis && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl shadow-sm border border-blue-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <LineChart className="text-blue-600" size={24} />
                      <h2 className="font-bold text-xl text-slate-900">{t.trendAnalysis}</h2>
                    </div>
                    
                    {/* Trend & Current Diagnosis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className={`border-2 rounded-2xl p-4 ${getTrendColor(trendAnalysis.trend)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {getTrendIcon(trendAnalysis.trend)}
                          <span className="text-sm font-bold uppercase tracking-wide">{t.trend}</span>
                        </div>
                        <p className="text-2xl font-bold mb-1">{trendAnalysis.trend}</p>
                        <p className="text-sm opacity-90">{trendAnalysis.pattern?.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-white/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-current rounded-full"
                              style={{ width: `${trendAnalysis.trendConfidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{trendAnalysis.trendConfidence}%</span>
                        </div>
                      </div>
                      
                      <div className="border-2 rounded-2xl p-4 bg-white">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="text-purple-600" size={20} />
                          <span className="text-sm font-bold uppercase tracking-wide text-slate-600">Current Status</span>
                        </div>
                        <p className="text-lg font-bold text-slate-900 mb-1">{trendAnalysis.currentDiagnosis}</p>
                        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${getUrgencyColor(trendAnalysis.urgencyLevel)}`}>
                          <AlertCircle size={14} />
                          <span className="text-xs font-bold uppercase">{trendAnalysis.urgencyLevel}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Insights */}
                    {trendAnalysis.insights && trendAnalysis.insights.length > 0 && (
                      <div className="bg-white rounded-2xl p-4 mb-4">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <Brain size={18} className="text-blue-600" />
                          Key Insights
                        </h3>
                        <ul className="space-y-2">
                          {trendAnalysis.insights.map((insight, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-slate-700">
                              <span className="text-blue-600 font-bold">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Recommendations */}
                    {trendAnalysis.recommendations && trendAnalysis.recommendations.length > 0 && (
                      <div className="bg-white rounded-2xl p-4 mb-4">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <CheckCircle size={18} className="text-green-600" />
                          Recommendations
                        </h3>
                        <ul className="space-y-2">
                          {trendAnalysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-slate-700">
                              <span className="text-green-600 font-bold">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Warning Signs */}
                    {trendAnalysis.warningSignsToWatch && trendAnalysis.warningSignsToWatch.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                        <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                          <AlertTriangle size={18} className="text-red-600" />
                          Warning Signs to Watch
                        </h3>
                        <ul className="space-y-2">
                          {trendAnalysis.warningSignsToWatch.map((sign, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-red-800">
                              <span className="text-red-600 font-bold">⚠</span>
                              <span>{sign}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-sm font-medium text-red-900 bg-white p-3 rounded-xl">
                          {trendAnalysis.whenToSeekHelp}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Severity Chart */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                      <LineChart className="text-blue-600" size={24} />
                      {t.severityChart}
                    </h2>
                    <button
                      onClick={exportToPDF}
                      disabled={exportingPDF}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {exportingPDF ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          {t.exporting}
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          {t.exportPDF}
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prepareChartData()}>
                        <defs>
                          <linearGradient id="colorSeverity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          angle={-25}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          domain={[0, 10]}
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          label={{ value: 'Severity', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value) => [
                            `${value}/10`,
                            'Severity'
                          ]}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              return `${label}\nSymptoms: ${payload[0].payload.symptoms}`;
                            }
                            return label;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="severity" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fill="url(#colorSeverity)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Low (1-3)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>Medium (4-6)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>High (7-10)</span>
                    </div>
                  </div>
                </div>
                
                {/* Symptom History Timeline */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  {(() => {
                    // Filter symptom history based on selected condition
                    const filteredHistory = selectedCondition === 'all' 
                      ? symptomHistory
                      : symptomHistory.filter(log => {
                          if (selectedCondition === 'none') {
                            return !log.conditionName || log.conditionName.trim() === '';
                          }
                          return log.conditionName === selectedCondition;
                        });
                    
                    return (
                      <>
                        <h2 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
                          <Calendar className="text-purple-600" size={24} />
                          {t.symptomHistory} ({filteredHistory.length} {filteredHistory.length === symptomHistory.length ? 'entries' : `of ${symptomHistory.length} entries`})
                        </h2>
                        
                        <div className="space-y-4">
                          {filteredHistory.map((log, idx) => {
                      const date = new Date(log.loggedAt);
                      const isRecent = idx === 0;
                      
                      return (
                        <div 
                          key={log._id} 
                          className={`border-l-4 pl-4 py-3 ${
                            isRecent ? 'border-blue-500 bg-blue-50 rounded-r-xl pr-4' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {date.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {isRecent && <span className="ml-2 text-xs text-blue-600">({t.lastLogged})</span>}
                              </p>
                              {log.duration && log.duration !== 'Not specified' && (
                                <p className="text-xs text-slate-500">{log.duration}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Thermometer size={14} className="text-slate-400" />
                              <span className={`text-sm font-bold ${
                                log.severity >= 7 ? 'text-red-600' :
                                log.severity >= 5 ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {log.severity}/10
                              </span>
                            </div>
                          </div>
                          
                          {/* Condition Name Badge */}
                          {log.conditionName && (
                            <div className="mb-3">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300 rounded-full text-xs font-bold text-indigo-700">
                                <Activity size={12} />
                                {log.conditionName}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2 mb-2">
                            {log.symptoms.map((symptom, sIdx) => (
                              <span 
                                key={sIdx}
                                className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700"
                              >
                                {symptom}
                              </span>
                            ))}
                          </div>
                          
                          {log.notes && (
                            <p className="text-sm text-slate-600 italic mt-2">"{log.notes}"</p>
                          )}
                          
                          {log.aiAnalysis?.primaryDiagnosis && (
                            <div className="mt-2 text-xs text-slate-500">
                              AI: {log.aiAnalysis.primaryDiagnosis}
                            </div>
                          )}
                          
                          {/* Analyze This Entry Button */}
                          <button
                            onClick={() => analyzeEntry(log)}
                            disabled={loading}
                            className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? (
                              <><Loader2 className="animate-spin" size={16} /> Analyzing...</>
                            ) : (
                              <><Stethoscope size={16} /> {lang === 'en' ? 'Analyze This Entry' : 'ఈ ఎంట్రీని విశ్లేషించండి'}</>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setViewMode('entry')}
                    className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition"
                  >
                    {t.backToEntry}
                  </button>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SymptomAnalysis;
