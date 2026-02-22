import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error("Passwords do not match");
        }
        if (password.length < 6) {
            return toast.error("Password must be at least 6 characters");
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                toast.success("Password reset successfully!");
                setTimeout(() => navigate('/login'), 3000);
            } else {
                toast.error(data.message || "Invalid or expired token");
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
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center relative">
                    <div className="relative z-10">
                        <div className="bg-white/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-lg">
                            <Lock size={40} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Set New Password</h2>
                        <p className="text-emerald-100 text-sm mt-2 font-medium">Almost there! Enter your new password below.</p>
                    </div>
                </div>

                <div className="p-8 pt-10">
                    {!success ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                                    <Lock className="text-slate-400" size={20} />
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-emerald-600">
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                                    <Lock className="text-slate-400" size={20} />
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        className="flex-1 bg-transparent outline-none text-slate-700 font-bold placeholder-slate-400"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" /> : <>Reset Password <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                <CheckCircle size={40} className="text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-800">Success!</h3>
                                <p className="text-slate-500">Your password has been updated. Redirecting to login...</p>
                            </div>
                            <div className="pt-4">
                                <Link to="/login" className="text-emerald-600 font-bold hover:text-emerald-700 underline">
                                    Click here if you are not redirected
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
