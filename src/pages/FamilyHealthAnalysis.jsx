import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Activity, AlertTriangle, CheckCircle, 
  Heart, Shield, Dna, TrendingUp, FileText, Loader2, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const FamilyHealthAnalysis = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  
  // Translations
  const t = {
    header: lang === 'en' ? 'Family Health Analysis' : 'కుటుంబ ఆరోగ్య విశ్లేషణ',
    subHeader: lang === 'en' ? 'Genetic Pattern Detection' : 'జన్యు నమూనా గుర్తింపు',
    
    loading: lang === 'en' ? 'Loading family data...' : 'కుటుంబ డేటా లోడ్ అవుతోంది...',
    noFamily: lang === 'en' ? 'No family members added' : 'కుటుంబ సభ్యులు జోడించబడలేదు',
    addFamily: lang === 'en' ? 'Add Family Members' : 'కుటుంబ సభ్యులను జోడించండి',
    analyzeBtn: lang === 'en' ? 'Analyze Family Health' : 'కుటుంబ ఆరోగ్యాన్ని విశ్లేషించండి',
    analyzing: lang === 'en' ? 'Analyzing...' : 'విశ్లేషిస్తోంది...',
    
    // Family Members
    members: lang === 'en' ? 'Family Members' : 'కుటుంబ సభ్యులు',
    member: lang === 'en' ? 'Member' : 'సభ్యుడు',
    age: lang === 'en' ? 'Age' : 'వయస్సు',
    conditions: lang === 'en' ? 'Health Conditions' : 'ఆరోగ్య పరిస్థితులు',
    allergies: lang === 'en' ? 'Allergies' : 'అలెర్జీలు',
    years: lang === 'en' ? 'years' : 'సంవత్సరాలు',
    
    // Results
    geneticPatterns: lang === 'en' ? 'Genetic Patterns Detected' : 'జన్యు నమూనాలు గుర్తించబడ్డాయి',
    inheritanceRisk: lang === 'en' ? 'Inheritance Risk' : 'వంశపారంపర్య ప్రమాదం',
    affectedMembers: lang === 'en' ? 'Affected Members' : 'ప్రభావిత సభ్యులు',
    explanation: lang === 'en' ? 'Explanation' : 'వివరణ',
    
    commonConditions: lang === 'en' ? 'Common Family Conditions' : 'సాధారణ కుటుంబ పరిస్థితులు',
    recommendations: lang === 'en' ? 'Personalized Recommendations' : 'వ్యక్తిగత సిఫార్సులు',
    forMember: lang === 'en' ? 'For' : 'కోసం',
    priority: lang === 'en' ? 'Priority' : 'ప్రాధాన్యత',
    
    screeningTests: lang === 'en' ? 'Recommended Screening Tests' : 'సిఫార్సు చేయబడిన స్క్రీనింగ్ పరీక్షలు',
    lifestyleAdvice: lang === 'en' ? 'Lifestyle Advice' : 'జీవనశైలి సలహా',
    riskFactors: lang === 'en' ? 'Risk Factors' : 'రిస్క్ కారకాలు',
    prevention: lang === 'en' ? 'Prevention' : 'నివారణ',
    severity: lang === 'en' ? 'Severity' : 'తీవ్రత',
    
    // Risk Levels
    high: lang === 'en' ? 'High' : 'అధికం',
    medium: lang === 'en' ? 'Medium' : 'మధ్యస్థ',
    low: lang === 'en' ? 'Low' : 'తక్కువ',
    
    // Actions
    newAnalysis: lang === 'en' ? 'New Analysis' : 'కొత్త విశ్లేషణ',
    symptomAnalysis: lang === 'en' ? 'Individual Symptom Analysis' : 'వ్యక్తిగత లక్షణ విశ్లేషణ',
    
    // Errors
    analysisFailed: lang === 'en' ? 'Analysis failed. Please try again.' : 'విశ్లేషణ విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    noData: lang === 'en' ? 'Insufficient family health data for analysis' : 'విశ్లేషణ కోసం తగినంత కుటుంబ ఆరోగ్య డేటా లేదు',
  };
  
 const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  
  // Fetch family members
  useEffect(() => {
    fetchFamilyMembers();
  }, []);
  
  const fetchFamilyMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/family`, {
        headers: { 'x-auth-token': token }
      });
      setFamilyMembers(response.data);
    } catch (error) {
      console.error('Failed to load family members:', error);
      toast.error('Failed to load family data');
    } finally {
      setLoading(false);
    }
  };
  
  // Analyze family health
  const analyzeFamilyHealth = async () => {
    if (familyMembers.length === 0) {
      toast.error(t.noData);
      return;
    }
    
    setAnalyzing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/ai/analyze-family-health`,
        {
          familyMembers,
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
      setAnalyzing(false);
    }
  };
  
  // Get risk color
  const getRiskColor = (risk) => {
    const level = risk?.toLowerCase();
    if (level === 'low') return 'text-green-600 bg-green-50 border-green-200';
    if (level === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (level === 'high') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-purple-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
          >
            <ArrowLeft size={20}/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Dna className="text-purple-600" size={24} />
              {t.header}
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.subHeader}</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {!analysis ? (
          <>
            {/* Family Members List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Users className="text-purple-600" size={20} />
                  {t.members} ({familyMembers.length})
                </h2>
                <button 
                  onClick={() => navigate('/family')}
                  className="text-purple-600 font-bold text-sm hover:underline"
                >
                  {t.addFamily}
                </button>
              </div>
              
              {familyMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="text-slate-300 mx-auto mb-4" size={48} />
                  <p className="text-slate-500 font-medium mb-4">{t.noFamily}</p>
                  <button 
                    onClick={() => navigate('/family')}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition"
                  >
                    {t.addFamily}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {familyMembers.map((member) => (
                    <div 
                      key={member._id}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-200 text-purple-700 rounded-full p-2">
                            <User size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{member.name}</h3>
                            <p className="text-sm text-slate-600">
                              {member.relationship}
                              {member.age && ` • ${member.age} ${t.years}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {member.chronicConditions && member.chronicConditions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">{t.conditions}:</p>
                          <div className="flex flex-wrap gap-2">
                            {member.chronicConditions.map((condition, index) => (
                              <span 
                                key={index}
                                className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-medium"
                              >
                                {condition}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {member.allergies && member.allergies.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">{t.allergies}:</p>
                          <div className="flex flex-wrap gap-2">
                            {member.allergies.map((allergy, index) => (
                              <span 
                                key={index}
                                className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-xs font-medium"
                              >
                                {allergy}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Analyze Button */}
            {familyMembers.length > 0 && (
              <button 
                onClick={analyzeFamilyHealth}
                disabled={analyzing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t.analyzing}
                  </>
                ) : (
                  <>
                    <Dna size={20} />
                    {t.analyzeBtn}
                  </>
                )}
              </button>
            )}
            
            {/* Individual Analysis Link */}
            <button 
              onClick={() => navigate('/symptom-analysis')}
              className="w-full bg-white text-purple-600 py-4 rounded-xl font-bold border-2 border-purple-200 hover:bg-purple-50 transition flex items-center justify-center gap-2"
            >
              <Activity size={20} />
              {t.symptomAnalysis}
            </button>
          </>
        ) : (
          <>
            {/* Genetic Patterns */}
            {analysis.geneticPatterns && analysis.geneticPatterns.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h2 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
                  <Dna className="text-purple-600" size={24} />
                  {t.geneticPatterns}
                </h2>
                
                <div className="space-y-4">
                  {analysis.geneticPatterns.map((pattern, index) => (
                    <div 
                      key={index}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg text-slate-900">{pattern.condition}</h3>
                        <div className={`px-3 py-1 rounded-xl font-bold text-sm border-2 ${getRiskColor(pattern.inheritanceRisk)}`}>
                          {pattern.inheritanceRisk}
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <p className="text-xs font-bold text-slate-600 uppercase mb-1">{t.affectedMembers}:</p>
                        <div className="flex flex-wrap gap-2">
                          {pattern.affectedMembers.map((member, idx) => (
                            <span 
                              key={idx}
                              className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg text-sm font-medium"
                            >
                              {member}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-slate-700 leading-relaxed">{pattern.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Common Conditions */}
            {analysis.commonConditions && analysis.commonConditions.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                  <Activity className="text-blue-600" size={20} />
                  {t.commonConditions}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.commonConditions.map((condition, index) => (
                    <span 
                      key={index}
                      className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl font-medium"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Personalized Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={20} />
                  {t.recommendations}
                </h3>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <div 
                      key={index}
                      className="bg-slate-50 p-4 rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-bold text-slate-900">{t.forMember}: {rec.forMember}</span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getRiskColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-slate-700">{rec.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Screening Tests */}
            {analysis.screeningTests && analysis.screeningTests.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="text-indigo-600" size={20} />
                  {t.screeningTests}
                </h3>
                <ul className="space-y-2">
                  {analysis.screeningTests.map((test, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle className="text-indigo-500 mt-1 flex-shrink-0" size={16} />
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Lifestyle Advice */}
            {analysis.lifestyleAdvice && analysis.lifestyleAdvice.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                  <Heart className="text-pink-600" size={20} />
                  {t.lifestyleAdvice}
                </h3>
                <ul className="space-y-2">
                  {analysis.lifestyleAdvice.map((advice, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-700">
                      <Heart className="text-pink-500 mt-1 flex-shrink-0" size={16} />
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Risk Factors */}
            {analysis.riskFactors && analysis.riskFactors.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="text-orange-600" size={20} />
                  {t.riskFactors}
                </h3>
                <div className="space-y-3">
                  {analysis.riskFactors.map((risk, index) => (
                    <div 
                      key={index}
                      className="border-2 border-orange-200 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-slate-900">{risk.factor}</h4>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getRiskColor(risk.severity)}`}>
                          {risk.severity}
                        </span>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs font-bold text-orange-800 uppercase mb-1">{t.prevention}:</p>
                        <p className="text-slate-700">{risk.prevention}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => setAnalysis(null)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition"
              >
                {t.newAnalysis}
              </button>
              <button 
                onClick={() => navigate('/symptom-analysis')}
                className="flex-1 bg-white text-purple-600 py-4 rounded-xl font-bold border-2 border-purple-200 hover:bg-purple-50 transition"
              >
                {t.symptomAnalysis}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FamilyHealthAnalysis;
