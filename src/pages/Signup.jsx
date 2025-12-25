import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, User, ArrowRight, Loader2, Home } from 'lucide-react';
import toast from 'react-hot-toast';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await signup(formData.name, formData.email, formData.password);
    
    if (result.success) {
        toast.success("Account Created! 🎉");
        navigate('/'); 
    } else {
        toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative">
      
      {/* Floating Home Button */}
      <Link to="/" className="absolute top-6 left-6 p-3 bg-white rounded-full shadow-sm text-slate-400 hover:text-indigo-600 transition-colors">
        <Home size={20} />
      </Link>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-10 duration-500">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
            
            <div className="relative z-10">
                <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-lg border border-white/20">
                    <User className="text-white" size={36} />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Join Us</h2>
                <p className="text-indigo-100 text-sm mt-2 font-medium">Create your health profile today.</p>
            </div>
        </div>

        {/* Form Section */}
        <div className="p-8 pt-10">
            <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <User className="text-slate-400" size={20}/>
                        <input 
                            required 
                            type="text" 
                            className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400" 
                            placeholder="John Doe" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <Mail className="text-slate-400" size={20}/>
                        <input 
                            required 
                            type="email" 
                            className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400" 
                            placeholder="you@example.com" 
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Create Password</label>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <Lock className="text-slate-400" size={20}/>
                        <input 
                            required 
                            type="password" 
                            className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400" 
                            placeholder="••••••••" 
                            value={formData.password} 
                            onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        />
                    </div>
                </div>

                <button 
                    disabled={loading} 
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-all hover:bg-indigo-700 flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <>Get Started <ArrowRight size={20} /></>}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                    Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">Sign In</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;