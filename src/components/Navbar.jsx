import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Menu, X, LogOut, FileText, Activity, MessageCircle, User } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useBranding } from '../context/BrandingContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { branding, refreshBranding } = useBranding();
  const token = localStorage.getItem('token');
  const [isOpen, setIsOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Load user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserPhoto(user.photo);
    setUserName(user.name || 'User');
    
    // Refresh branding on mount
    if (refreshBranding) {
      refreshBranding();
    }
  }, []);
  
  // Listen for branding updates
  useEffect(() => {
    const handleBrandingUpdate = () => {
      if (refreshBranding) {
        refreshBranding();
      }
    };
    
    window.addEventListener('storage', handleBrandingUpdate);
    return () => window.removeEventListener('storage', handleBrandingUpdate);
  }, [refreshBranding]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    setIsOpen(false);
  };

  const navClass = (path) => 
    `flex items-center gap-2 px-4 py-2 rounded-xl transition font-bold text-sm ${
      location.pathname === path 
      ? "bg-emerald-50 text-emerald-600" 
      : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
    }`;

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            {branding.logo ? (
              <img 
                src={branding.logo} 
                alt={branding.hospitalName || branding.appName}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
                <Heart size={20} fill="currentColor" />
              </div>
            )}
            <span className="font-bold text-slate-800 text-lg">
              {branding.hospitalName || branding.appName}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/" className={navClass('/')}>Home</Link>
            {token && (
              <>
                <Link to="/wellness" className={navClass('/wellness')}><Activity size={16}/> Wellness</Link>
                <Link to="/first-aid" className={navClass('/first-aid')}><MessageCircle size={16}/> Chatbot</Link>
                <Link to="/records" className={navClass('/records')}><FileText size={16}/> Records</Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {token && <NotificationBell />}
            {token ? (
              <>
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-xs uppercase border px-4 py-2 rounded-lg">
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">Login</Link>
            )}
          </div>
          
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-slate-600"><Menu/></button>
        </div>
      </div>
      
      {isOpen && (
        <div className="md:hidden bg-white border-t p-4 space-y-2">
            <Link to="/" className="block py-2">Home</Link>
            {token && <Link to="/wellness" className="block py-2">Wellness</Link>}
            {token && <Link to="/records" className="block py-2">Records</Link>}
            {token && <button onClick={handleLogout} className="block py-2 text-red-500">Logout</button>}
        </div>
      )}
    </nav>
  );
};

export default Navbar;