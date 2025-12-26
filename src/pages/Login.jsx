import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, Loader2, ArrowLeft, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);

            // --- FIX: Save Name from backend or use Email as fallback ---
            if (data.user && data.user.name) {
                localStorage.setItem('userName', data.user.name);
            } else {
                // If backend doesn't send name, use the part before '@' in email
                const fallbackName = formData.email.split('@')[0];
                localStorage.setItem('userName', fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));
            }

            toast.success("Welcome back!");
            navigate('/'); 
        } else {
            toast.error(data.msg || "Invalid credentials");
        }
    } catch (err) {
        console.error(err);
        toast.error("Server connection failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative">
      <Link to="/" className="absolute top-6 left-6 p-3 bg-white rounded-full shadow-sm text-slate-400 hover:text-emerald-600 transition-colors">
        <ArrowLeft size={20} />
      </Link>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center relative">
            <div className="relative z-10">
                <div className="bg-white/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-lg">
                    <Heart className="text-white" size={40} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                <p className="text-emerald-100 text-sm mt-2 font-medium">Your Health Assistant is ready.</p>
            </div>
        </div>

        <div className="p-8 pt-10">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                        <Mail className="text-slate-400" size={20}/>
                        <input required type="email" className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400" placeholder="user@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                        <Lock className="text-slate-400" size={20}/>
                        <input required type="password" className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>
                </div>

                <button disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : <>Sign In <ArrowRight size={20} /></>}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                    Don't have an account? <Link to="/register" className="text-emerald-600 font-bold hover:text-emerald-700">Create Account</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;