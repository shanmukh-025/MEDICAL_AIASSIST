import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const FirstAid = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Store the auto-detected model name here
  const [activeModel, setActiveModel] = useState(null); 

  // Dynamic Greeting
  const initialMsg = lang === 'en' 
    ? "Hello! I am your Village Medical Assistant. How can I help you?" 
    : "నమస్కారం! నేను మీ గ్రామ వైద్య సహాయకుడిని. నేను మీకు ఎలా సహాయపడగలను?";

  const [messages, setMessages] = useState([{ role: 'bot', text: initialMsg }]);
  
  // API History (Strict Google Format)
  const [apiHistory, setApiHistory] = useState([
    {
      role: "user",
      parts: [{ text: "You are MediBot, a village medical assistant. You ONLY answer medical and health-related questions. If someone asks non-medical questions (like sports, entertainment, general knowledge, etc.), politely decline and ask them to ask medical questions only. Provide simple, safe medical advice. If symptoms are severe, tell them to see a doctor immediately." }]
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
        { role: "user", parts: [{ text: "You are MediBot, a village medical assistant. You ONLY answer medical and health-related questions. If someone asks non-medical questions (like sports, entertainment, general knowledge, etc.), politely decline and ask them to ask medical questions only. Provide simple, safe medical advice. If symptoms are severe, tell them to see a doctor immediately." }] },
        { role: "model", parts: [{ text: "Understood. I will only answer medical and health-related questions and politely decline non-medical queries." }] }
     ]);
  }, [lang]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    setLoading(true);

    // Update UI
    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    try {
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
        <button onClick={() => window.location.reload()} className="text-slate-400 hover:text-emerald-600 p-2">
            <RefreshCw size={18} />
        </button>
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
                {msg.text}
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
            placeholder={lang === 'en' ? 'Type here...' : 'ఇక్కడ టైప్ చేయండి...'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-medium"
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg shadow-emerald-100"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstAid;