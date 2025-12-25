import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const { name, email, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        // Save token
        localStorage.setItem('token', data.token);
        
        // --- FIX: Save Name so Home Page can display it ---
        localStorage.setItem('userName', name);
        
        toast.success("Account created successfully!");
        // Redirect to Home so they see the dashboard immediately
        navigate('/');
      } else {
        toast.error(data.msg || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <Heart size={32} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Join Village Medicine Assistant</p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          
          {/* Name Input */}
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="text" 
              name="name" 
              value={name} 
              onChange={onChange} 
              placeholder="Full Name" 
              className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              required 
            />
          </div>

          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="email" 
              name="email" 
              value={email} 
              onChange={onChange} 
              placeholder="Email Address" 
              className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              required 
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="password" 
              name="password" 
              value={password} 
              onChange={onChange} 
              placeholder="Password" 
              className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              required 
              minLength="6"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Sign Up <ArrowRight size={20} /></>}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm font-medium text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;