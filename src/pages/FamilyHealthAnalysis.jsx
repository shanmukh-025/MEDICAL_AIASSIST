import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Brain, Users, Activity, Shield, AlertTriangle,
    CheckCircle, Lightbulb, Loader2, Info, ChevronRight,
    ClipboardList, Heart, Stethoscope
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const FamilyHealthAnalysis = () => {
    const navigate = useNavigate();
    const { lang } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [analysis, setAnalysis] = useState(null);

    const t = {
        header: lang === 'en' ? 'Family Genetic Analysis' : 'కుటుంబ జన్యు విశ్లేషణ',
        subHeader: lang === 'en' ? 'Hereditary Health Patterns & Risks' : 'వంశపారంపర్య ఆరోగ్య నమూనాలు & ప్రమాదాలు',
        noMembers: lang === 'en' ? 'No family members found. Please add members in the Family Profile first.' : 'కుటుంబ సభ్యులు కనిపించలేదు. దయచేసి ముందుగా ఫ్యామిలీ ప్రొఫైల్‌లో సభ్యులను చేర్చండి.',
        addMembers: lang === 'en' ? 'Go to Family Profile' : 'కుటుంబ ప్రొఫైల్‌కు వెళ్లండి',
        analyzeBtn: lang === 'en' ? 'Start Genetic Analysis' : 'జన్యు విశ్లేషణ ప్రారంభించండి',
        analyzing: lang === 'en' ? 'AI Analyzing Patterns...' : 'AI నమూనాలను విశ్లేషిస్తోంది...',
        resultsTitle: lang === 'en' ? 'Genetic Health Assessment' : 'జన్యు ఆరోగ్య అంచనా',
        riskLevels: {
            High: lang === 'en' ? 'High Risk' : 'అధిక ప్రమాదం',
            Medium: lang === 'en' ? 'Medium Risk' : 'మధ్యస్థ ప్రమాదం',
            Low: lang === 'en' ? 'Low Risk' : 'తక్కువ ప్రమాదం'
        },
        sections: {
            patterns: lang === 'en' ? 'Genetic Patterns' : 'జన్యు నమూనాలు',
            common: lang === 'en' ? 'Common Family Conditions' : 'సాధారణ కుటుంబ సమస్యలు',
            recommendations: lang === 'en' ? 'Personalized Advice' : 'వ్యక్తిగతీకరించిన సలహా',
            screening: lang === 'en' ? 'Recommended Screenings' : 'సిఫార్సు చేయబడిన స్క్రీనింగ్‌లు',
            lifestyle: lang === 'en' ? 'Lifestyle Modifications' : 'జీవనశైలి మార్పులు',
            risks: lang === 'en' ? 'Risk Factor Analysis' : 'ప్రమాదకారక విశ్లేషణ'
        }
    };

    useEffect(() => {
        fetchFamilyMembers();
    }, []);

    const fetchFamilyMembers = async () => {
        try {
            const response = await fetch(`${API}/api/family`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            const data = await response.json();
            if (response.ok) {
                setFamilyMembers(data);
            } else {
                toast.error('Failed to fetch family members');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const startAnalysis = async () => {
        if (familyMembers.length === 0) {
            toast.error(t.noMembers);
            return;
        }

        setAnalyzing(true);
        try {
            const response = await fetch(`${API}/api/ai/analyze-family-health`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    familyMembers,
                    language: lang
                })
            });

            const data = await response.json();
            if (response.ok) {
                setAnalysis(data);
                toast.success('Analysis complete!');
            } else {
                toast.error(data.message || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Error during AI analysis');
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-emerald-600 text-white p-6 rounded-b-[40px] shadow-lg sticky top-0 z-30">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-emerald-100 hover:text-white transition mb-4">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Brain size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{t.header}</h1>
                            <p className="text-emerald-100 text-sm opacity-90">{t.subHeader}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-8">
                {!analysis ? (
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                            <Users size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                            {familyMembers.length} {lang === 'en' ? 'Family Members Detected' : 'కుటుంబ సభ్యులు గుర్తించబడ్డారు'}
                        </h2>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                            {lang === 'en'
                                ? 'Our AI will scan your family records to identify potential hereditary health patterns and provide preventive advice.'
                                : 'మీ కుటుంబ ఆరోగ్య రికార్డులను స్కాన్ చేసి, వంశపారంపర్య ఆరోగ్య లక్షణాలను గుర్తించడంలో మా AI సహాయపడుతుంది.'}
                        </p>

                        {familyMembers.length > 0 ? (
                            <button
                                onClick={startAnalysis}
                                disabled={analyzing}
                                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition flex items-center justify-center gap-3 disabled:opacity-70"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        {t.analyzing}
                                    </>
                                ) : (
                                    <>
                                        <Activity size={20} />
                                        {t.analyzeBtn}
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-red-500 text-sm font-medium">{t.noMembers}</p>
                                <button
                                    onClick={() => navigate('/family')}
                                    className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                                >
                                    {t.addMembers}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-5">
                        {/* Analysis Dashboard */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-800">{t.resultsTitle}</h2>
                            <button
                                onClick={() => setAnalysis(null)}
                                className="text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl"
                            >
                                Re-Analyze
                            </button>
                        </div>

                        {/* Genetic Patterns */}
                        <div className="grid gap-4">
                            {analysis.geneticPatterns?.map((pattern, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative group hover:shadow-md transition">
                                    <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${pattern.inheritanceRisk === 'High' ? 'bg-red-100 text-red-600' :
                                            pattern.inheritanceRisk === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                        {t.riskLevels[pattern.inheritanceRisk] || pattern.inheritanceRisk}
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-2xl ${pattern.inheritanceRisk === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">{pattern.condition}</h3>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {pattern.affectedMembers?.map((m, i) => (
                                                    <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-bold">
                                                        {m}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{pattern.explanation}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Common Conditions */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <ClipboardList className="text-purple-600" size={20} />
                                    {t.sections.common}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.commonConditions?.map((c, i) => (
                                        <span key={i} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-purple-100">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Screening Tests */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Stethoscope className="text-blue-600" size={20} />
                                    {t.sections.screening}
                                </h3>
                                <ul className="space-y-3">
                                    {analysis.screeningTests?.map((test, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            {test}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Risk Factors */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 md:col-span-2">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Shield className="text-orange-600" size={20} />
                                    {t.sections.risks}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {analysis.riskFactors?.map((risk, i) => (
                                        <div key={i} className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-sm text-slate-800">{risk.factor}</h4>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${risk.severity === 'High' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                                                    }`}>
                                                    {risk.severity}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 italic">
                                                <span className="font-bold text-orange-600">Prevention:</span> {risk.prevention}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Personal Recommendations */}
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[40px] shadow-lg text-white md:col-span-2 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <h3 className="font-bold text-xl mb-6 flex items-center gap-2 relative z-10">
                                    <Lightbulb size={24} />
                                    {t.sections.recommendations}
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    {analysis.recommendations?.map((rec, i) => (
                                        <div key={i} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-black text-[10px] uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full">
                                                        {rec.forMember}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${rec.priority === 'High' ? 'text-orange-200' : 'text-emerald-100'
                                                        }`}>
                                                        {rec.priority} Priority
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium">{rec.suggestion}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Lifestyle Advice */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 md:col-span-2">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Heart className="text-pink-600" size={20} />
                                    {t.sections.lifestyle}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {analysis.lifestyleAdvice?.map((advice, i) => (
                                        <div key={i} className="flex flex-col items-center text-center gap-2 p-3 bg-pink-50 rounded-2xl border border-pink-100">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-pink-500 shadow-sm">
                                                <Info size={16} />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-700">{advice}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="bg-slate-900 text-slate-400 p-6 rounded-3xl text-xs space-y-2">
                            <p className="font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                <Info size={14} /> Medical Disclaimer
                            </p>
                            <p>This AI-generated analysis is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Genetic patterns identified are based on family history provided and may not capture full clinical reality.</p>
                            <p>Always consult with a qualified healthcare professional or genetic counselor before making health decisions or initiating specialized screenings.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FamilyHealthAnalysis;
