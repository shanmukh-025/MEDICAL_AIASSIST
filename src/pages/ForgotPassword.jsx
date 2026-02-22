import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, ArrowLeft, Heart, CheckCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
                toast.success("Reset link sent!");
            } else {
                toast.error(data.message || "Something went wrong");
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
            <Link to="/login" className="absolute top-6 left-6 p-3 bg-white rounded-full shadow-sm text-slate-400 hover:text-emerald-600 transition-colors">
                <ArrowLeft size={20} />
            </Link>

            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center relative">
                    <div className="relative z-10">
                        <div className="bg-white/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-lg">
                            <Lock size={40} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Forgot Password?</h2>
                        <p className="text-emerald-100 text-sm mt-2 font-medium">No worries, we'll help you reset it.</p>
                    </div>
                </div>

                <div className="p-8 pt-10">
                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                                    <Mail className="text-slate-400" size={20} />
                                    <input
                                        required
                                        type="email"
                                        className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400"
                                        placeholder="user@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" /> : <>Send Reset Link <ArrowRight size={20} /></>}
                            </button>

                            <div className="text-center">
                                <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors">
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                <CheckCircle size={40} className="text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-800">Email Sent!</h3>
                                <p className="text-slate-500">
                                    We've sent a password reset link to <span className="font-bold text-slate-700">{email}</span>.
                                    Please check your inbox (and spam folder).
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-100"
                                >
                                    <ArrowLeft size={18} /> Back to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
