import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const FirstAid = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dynamic Initial Message based on Language
  const initialMsg = lang === 'en' 
    ? "Hello! I am your Village Medical Assistant. How can I help you?" 
    : "నమస్కారం! నేను మీ గ్రామ వైద్య సహాయకుడిని. నేను మీకు ఎలా సహాయపడగలను?";

  const [messages, setMessages] = useState([{ role: 'bot', text: initialMsg }]);

  // --- TRANSLATIONS ---
  const t = {
    title: lang === 'en' ? 'MediBot AI' : 'మెడి బాట్ (AI)',
    online: lang === 'en' ? 'Online' : 'ఆన్‌లైన్',
    thinking: lang === 'en' ? 'Thinking...' : 'ఆలోచిస్తోంది...',
    placeholder: lang === 'en' ? 'Type your health question...' : 'మీ ఆరోగ్య ప్రశ్నను ఇక్కడ టైప్ చేయండి...',
    send: lang === 'en' ? 'Send' : 'పంపు',
    clear: lang === 'en' ? 'Clear Chat' : 'చాట్ క్లియర్ చేయండి'
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update initial greeting if language changes (optional reset)
  useEffect(() => {
     setMessages(prev => {
         if(prev.length === 1 && prev[0].role === 'bot') {
             return [{ role: 'bot', text: initialMsg }];
         }
         return prev;
     });
  }, [lang]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ 
            message: input, 
            language: lang // Sends 'en' or 'te' to Backend
        }) 
      });

      const data = await res.json();
      const botMessage = { role: 'bot', text: data.reply };
      setMessages(prev => [...prev, botMessage]);

    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: lang === 'en' ? "Server Error." : "సర్వర్ లోపం." }]);
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
            <h1 className="font-bold text-lg text-slate-800">{t.title}</h1>
            <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {t.online}
            </p>
            </div>
        </div>
        <button onClick={() => setMessages([{ role: 'bot', text: initialMsg }])} className="text-slate-400 hover:text-emerald-600 p-2">
            <RefreshCw size={18} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-emerald-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={16} /> {t.thinking}
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
            placeholder={t.placeholder}
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