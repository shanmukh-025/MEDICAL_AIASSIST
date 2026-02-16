import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, ArrowLeft, RefreshCw, AlertTriangle, Mic, MicOff, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/apiWrapper';
import { searchOfflineTips } from '../data/offlineFirstAid';

const FirstAid = () => {
  // Function to convert markdown-style formatting to HTML
  const parseMarkdown = (text) => {
    let parsed = text
      // Bold: **text** to <strong>text</strong>
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* to <em>text</em>
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br/>');
    return parsed;
  };
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  
  // Store the auto-detected model name here
  const [activeModel, setActiveModel] = useState(null); 

  // Dynamic Greeting
  const initialMsg = lang === 'en' 
    ? "Hello! I am your Medical Assistant. How can I help you?" 
    : "నమస్కారం! నేను మీ వైద్య సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను?";

  const [messages, setMessages] = useState([{ role: 'bot', text: initialMsg }]);
  
  // API History (Strict Google Format)
  const [apiHistory, setApiHistory] = useState([
    {
      role: "user",
      parts: [{ text: "You are MediBot, a helpful medical assistant. You ONLY answer medical and health-related questions. If someone asks non-medical questions (like sports, entertainment, general knowledge, etc.), politely decline and ask them to ask medical questions only. Provide simple, safe medical advice. If symptoms are severe, tell them to see a doctor immediately." }]
    },
    {
      role: "model",
      parts: [{ text: "Understood. I will only answer medical and health-related questions and politely decline non-medical queries." }]
    }
  ]);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // 1. AUTO-DETECT MODEL ON LOAD (The Fix)
  useEffect(() => {
    const findWorkingModel = async () => {
        if (!apiKey) return;
        try {
            // Ask Google what models are available
            const req = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await req.json();
            
            // Find the first one that supports 'generateContent'
            const validModel = data.models?.find(m => 
                m.supportedGenerationMethods?.includes("generateContent") &&
                m.name.includes("gemini")
            );

            if (validModel) {
                console.log("Chat using model:", validModel.name);
                setActiveModel(validModel.name);
            } else {
                console.error("No Gemini models found.");
            }
        } catch (e) {
            console.error("Model Detection Failed:", e);
        }
    };
    findWorkingModel();
  }, [apiKey]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Reset chat if language changes
  useEffect(() => {
     setMessages([{ role: 'bot', text: initialMsg }]);
     setApiHistory([
        { role: "user", parts: [{ text: "You are MediBot, a helpful medical assistant. You ONLY answer medical and health-related questions. If someone asks non-medical questions (like sports, entertainment, general knowledge, etc.), politely decline and ask them to ask medical questions only. Provide simple, safe medical advice. If symptoms are severe, tell them to see a doctor immediately." }] },
        { role: "model", parts: [{ text: "Understood. I will only answer medical and health-related questions and politely decline non-medical queries." }] }
     ]);
     
     // Speak initial greeting
     if (autoSpeak) {
       speakText(initialMsg);
     }
  }, [lang]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      // Set language based on current language setting
      recognitionRef.current.lang = lang === 'te' ? 'te-IN' : 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopSpeaking();
    };
  }, [lang]);

  // Text-to-Speech Function
  const speakText = (text) => {
    if (!autoSpeak) return;
    
    // Stop any ongoing speech
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'te' ? 'te-IN' : 'en-US';
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  // Stop Speaking
  const stopSpeaking = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  // Toggle Voice Input
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(lang === 'en' 
        ? 'Voice input not supported in this browser. Please use Chrome or Edge.' 
        : 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ సపోర్ట్ చేయబడదు. దయచేసి Chrome లేదా Edge ఉపయోగించండి.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Update language before starting
      recognitionRef.current.lang = lang === 'te' ? 'te-IN' : 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Toggle Auto-Speak
  const toggleAutoSpeak = () => {
    setAutoSpeak(!autoSpeak);
    if (!autoSpeak === false) {
      stopSpeaking();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    setLoading(true);

    // Update UI
    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    // NSFW Content Filter
    const inappropriatePatterns = [
      /\bsex\b/i,
      /\bmasturbat/i,
      /\bporn/i,
      /\berotic/i,
      /\bxxx\b/i,
      /\badult content/i,
      /\bintercourse\b/i,
      /\borgasm/i,
      /\blibido\b/i,
      /\barousal\b/i,
      /\bsexual pleasure/i,
      /\bsexy\b/i,
      /\bnude/i,
      /\bnaked/i,
      /\bviagra\b/i,
      /\berectile\b/i
    ];

    const legitimateMedicalPatterns = [
      /sexually transmitted/i,
      /\bstd\b/i,
      /\bsti\b/i,
      /reproductive health/i,
      /menstrual/i,
      /pregnancy/i,
      /contracepti/i,
      /birth control/i,
      /gynecolog/i,
      /urology/i,
      /testicular/i,
      /ovarian/i,
      /prostate/i,
      /cervical/i,
      /sexual health screening/i,
      /hiv/i,
      /aids\b/i,
      /gonorrhea/i,
      /syphilis/i,
      /chlamydia/i,
      /herpes/i
    ];

    const hasInappropriateContent = inappropriatePatterns.some(pattern => pattern.test(userText));
    const hasLegitimateMedicalContext = legitimateMedicalPatterns.some(pattern => pattern.test(userText));

    if (hasInappropriateContent && !hasLegitimateMedicalContext) {
      const rejectionMessage = lang === 'te'
        ? 'క్షమించండి, నేను అనుచితమైన లేదా పరిణతి చెందిన కంటెంట్‌కు సమాధానం ఇవ్వలేను. నేను ఒక వైద్య సహాయకుడిని మాత్రమే. దయచేసి ఆరోగ్య సంబంధిత ప్రశ్నలు మాత్రమే అడగండి.'
        : 'I\'m sorry, I cannot respond to inappropriate or adult content. I am a medical assistant designed to help with health-related questions only. Please ask about symptoms, treatments, or general health concerns.';
      
      setMessages(prev => [...prev, { role: 'bot', text: rejectionMessage }]);
      setLoading(false);
      
      if (autoSpeak) {
        speakText(rejectionMessage);
      }
      
      return;
    }

    try {
      // Check if offline
      if (!navigator.onLine) {
        // Try offline first aid tips
        const offlineTip = searchOfflineTips(userText, lang);
        
        if (offlineTip) {
          const response = `📱 **${offlineTip.title}** (Offline Mode)\n\n**Symptoms:** ${offlineTip.symptoms}\n\n**Remedy:**\n${offlineTip.remedy}\n\n**Prevention:** ${offlineTip.prevention}\n\n⚠️ This is offline guidance. For serious conditions, please see a doctor when possible.`;
          
          setMessages(prev => [...prev, { role: 'bot', text: response }]);
          
          if (autoSpeak) {
            speakText(response);
          }
          
          setLoading(false);
          return;
        }
        
        const offlineMsg = lang === 'en' 
          ? "⚠️ You are offline. AI Assistant requires internet.\n\nI can help with basic first aid offline:\n• Fever\n• Headache\n• Cough & Cold\n• Stomach pain\n• Diarrhea\n• Cuts & wounds\n• Burns\n• Sprains\n• Snake bite (emergency)\n• Dehydration\n\nType your symptom above!" 
          : "⚠️ మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. AI సహాయకుడికి ఇంటర్నెట్ కావాలి.\n\nనేను ఆఫ్‌లైన్‌లో ప్రాథమిక చికిత్సలో సహాయపడగలను:\n• జ్వరం\n• తలనొప్పి\n• దగ్గు మరియు జలుబు\n• కడుపు నొప్పి\n• విరేచనాలు\n• కోతలు మరియు గాయాలు\n• కాలిన గాయాలు\n• బెణుకులు\n• పాము కాటు (అత్యవసరం)\n• నిర్జలీకరణం\n\nమీ లక్షణాన్ని పైన టైప్ చేయండి!";
        
        setMessages(prev => [...prev, { role: 'bot', text: offlineMsg, isError: true }]);
        setLoading(false);
        return;
      }

      if (!apiKey) throw new Error("API Key Missing");
      if (!activeModel) throw new Error("Initializing AI... Please try again in 2 seconds.");

      // Prepare History
      const newHistory = [
        ...apiHistory,
        { role: "user", parts: [{ text: `Answer in ${lang === 'te' ? 'Telugu' : 'English'}: ${userText}` }] }
      ];

      // DIRECT FETCH using the DETECTED MODEL
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${activeModel}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: newHistory })
        }
      );

      const data = await response.json();

      if (data.error) throw new Error(data.error.message);

      const botText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!botText) throw new Error("No response.");

      // Update UI
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);

      // Update History
      setApiHistory([
        ...newHistory,
        { role: "model", parts: [{ text: botText }] }
      ]);

      // Speak the response
      if (autoSpeak) {
        speakText(botText);
      }

    } catch (err) {
      console.error("Chat Error:", err);
      let msg = lang === 'en' ? "Connection Error." : "కనెక్షన్ లోపం.";
      if (err.message.includes("Initializing")) msg = "Please wait, AI is loading...";
      
      setMessages(prev => [...prev, { role: 'bot', text: msg, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={20} className="text-slate-600"/>
            </button>
            <div>
            <h1 className="font-bold text-lg text-slate-800">{lang === 'en' ? 'MediBot' : 'మెడి బాట్'}</h1>
            <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {activeModel ? (lang === 'en' ? 'Online' : 'ఆన్‌లైన్') : 'Connecting...'}
            </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={toggleAutoSpeak}
              className={`p-2 rounded-full transition ${autoSpeak ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
              title={autoSpeak ? 'Voice responses ON' : 'Voice responses OFF'}
            >
              {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={() => window.location.reload()} className="text-slate-400 hover:text-emerald-600 p-2">
                <RefreshCw size={18} />
            </button>
        </div>
      </div>

      {/* Voice Feature Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 px-4 py-2 border-b border-blue-100">
        <p className="text-xs text-center text-slate-600">
          <span className="font-bold text-blue-600">🎤 {lang === 'en' ? 'Voice Enabled!' : 'వాయిస్ సౌలభ్యం!'}</span>
          {' '}
          {lang === 'en' 
            ? 'Speak your symptoms in your language - MediBot will respond in voice + text!' 
            : 'మీ భాషలో లక్షణాలు చెప్పండి - మెడిబాట్ వాయిస్ + టెక్స్ట్‌లో స్పందిస్తుంది!'}
        </p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200'}`}>
                {msg.role === 'user' ? <User size={16} /> : <img src="/logo2.jpeg" alt="MediBot" className="w-full h-full rounded-full object-cover" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.isError 
                    ? 'bg-red-50 text-red-600 border border-red-100' 
                    : msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}>
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={16} /> {lang === 'en' ? 'Thinking...' : 'ఆలోచిస్తోంది...'}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === 'en' ? 'Type or speak your symptoms...' : 'మీ లక్షణాలను టైప్ చేయండి లేదా మాట్లాడండి...'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-medium"
          />
          <button 
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-xl transition shadow-lg ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title={lang === 'en' ? 'Voice Input' : 'వాయిస్ ఇన్‌పుట్'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg shadow-emerald-100"
          >
            <Send size={20} />
          </button>
        </form>
        {isListening && (
          <div className="mt-2 text-center">
            <p className="text-sm text-blue-600 font-medium animate-pulse">
              🎤 {lang === 'en' ? 'Listening...' : 'వింటోంది...'}
            </p>
          </div>
        )}
        {isSpeaking && (
          <div className="mt-2 text-center">
            <button 
              onClick={stopSpeaking}
              className="text-sm text-emerald-600 font-medium hover:underline"
            >
              🔊 {lang === 'en' ? 'Speaking... (Click to stop)' : 'మాట్లాడుతోంది... (ఆపడానికి క్లిక్ చేయండి)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirstAid;