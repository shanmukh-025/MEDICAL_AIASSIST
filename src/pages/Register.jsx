import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2, Heart, MapPin, Building2, Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '../config'; // Import the Central Config
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PATIENT',
    address: '',
    latitude: '',
    longitude: ''
  });

  const { name, email, password, role, address, latitude, longitude } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userRole', data.user.role || 'PATIENT');
        localStorage.setItem('autoLogin', 'true'); // Auto-enable for Google sign-ups
        
        toast.success(`Welcome ${data.user.name}!`);
        navigate('/');
      } else {
        toast.error(data.error || 'Google sign-up failed');
      }
    } catch (err) {
      console.error('Google auth error:', err);
      toast.error('Failed to sign up with Google');
    }
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error('GPS not available on this device');
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        });
        toast.success('Location captured!');
        setGettingLocation(false);
      },
      (error) => {
        toast.error('Unable to get location');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const onSubmit = async e => {
    e.preventDefault();
    
    // Validate hospital requirements
    if (role === 'HOSPITAL') {
      if (!address || !latitude || !longitude) {
        toast.error('Hospitals must provide address and location');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const payload = { name, email, password, role };
      
      // Include location data for hospitals
      if (role === 'HOSPITAL') {
        payload.address = address;
        payload.location = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        };
      }
      
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userName', name);
        localStorage.setItem('userRole', role);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success("Account created successfully!");
        
        // Redirect based on role
        if (role === 'HOSPITAL') {
          navigate('/hospital-dashboard');
        } else {
          navigate('/');
        }
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
          
          {/* Role Selector */}
          <div className="relative">
            <Building2 className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <select
              name="role"
              value={role}
              onChange={onChange}
              className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition appearance-none"
              required
            >
              <option value="PATIENT">Patient / User</option>
              <option value="HOSPITAL">Hospital / Clinic</option>
            </select>
          </div>

          {/* Name Input */}
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="text" 
              name="name" 
              value={name} 
              onChange={onChange} 
              placeholder={role === 'HOSPITAL' ? 'Hospital/Clinic Name' : 'Full Name'}
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

          {/* Hospital-Specific Fields */}
          {role === 'HOSPITAL' && (
            <>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700">📍 Hospital Location Required</p>
              </div>

              {/* Address */}
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input 
                  type="text" 
                  name="address" 
                  value={address} 
                  onChange={onChange} 
                  placeholder="Full Address" 
                  className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  required={role === 'HOSPITAL'}
                />
              </div>

              {/* Location Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="number" 
                  step="any"
                  name="latitude" 
                  value={latitude} 
                  onChange={onChange} 
                  placeholder="Latitude" 
                  className="bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  required={role === 'HOSPITAL'}
                />
                <input 
                  type="number" 
                  step="any"
                  name="longitude" 
                  value={longitude} 
                  onChange={onChange} 
                  placeholder="Longitude" 
                  className="bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  required={role === 'HOSPITAL'}
                />
              </div>

              {/* Get Current Location Button */}
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition"
              >
                {gettingLocation ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <><Crosshair size={18} /> Use My Current Location</>
                )}
              </button>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Sign Up <ArrowRight size={20} /></>}
          </button>
        </form>

        {role === 'PATIENT' && (
          <>
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500 font-medium">Or sign up with</span>
                </div>
            </div>

            <div className="flex justify-center">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('Google sign-up failed')}
                    theme="outline"
                    size="large"
                    text="signup_with"
                    shape="rectangular"
                />
            </div>
          </>
        )}

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
