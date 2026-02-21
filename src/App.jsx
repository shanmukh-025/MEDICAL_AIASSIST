import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import { BrandingProvider } from './context/BrandingContext';

// Components
import PrivateRoute from './components/PrivateRoute';
import OfflineIndicator from './components/OfflineIndicator'; // Import the offline banner
import PWAInstallPrompt from './components/PWAInstallPrompt'; // PWA install prompt
import VoiceAssistant from './components/VoiceAssistant'; // Voice assistant
import IncomingCallGlobal from './components/IncomingCallGlobal'; // Global incoming call handler
import PushNotificationPrompt from './components/PushNotificationPrompt'; // Push notification prompt

// Pages
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Wellness from './pages/Wellness';
import FirstAid from './pages/FirstAid';
import HealthRecords from './pages/HealthRecords';
import Reminders from './pages/Reminders';
import Scan from './pages/Scan';
import Appointments from './pages/Appointments';
import Result from './pages/Result';
import Doctors from './pages/Doctors';
import PatientAppointments from './pages/PatientAppointments';
import HospitalDashboard from './pages/HospitalDashboard';
import FamilyProfile from './pages/FamilyProfile';
import UserProfile from './pages/UserProfile';
import HospitalBranding from './pages/HospitalBranding';
import QueueDashboard from './pages/QueueDashboard';
import SymptomAnalysis from './pages/SymptomAnalysis'; // AI Symptom Analysis

import PatientRecoveryTracker from './pages/PatientRecoveryTracker'; // Patient Recovery Monitoring
import PatientBilling from './pages/PatientBilling'; // Patient Billing & Discharge View
import AdminDashboard from './pages/AdminDashboard';

// Conditional Voice Assistant - only show when authenticated
const ConditionalVoiceAssistant = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Don't show on login/register/landing pages
  const publicPaths = ['/', '/login', '/register'];
  if (publicPaths.includes(location.pathname) || !user) {
    return null;
  }

  return <VoiceAssistant />;
};

const CREATOR_EMAILS = ['shanmukhasai250@gmail.com', 'varunmeruga@gmail.com']; // Change to your actual email
const isCreator = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user && user.email && CREATOR_EMAILS.includes(user.email.toLowerCase());
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrandingProvider>
          <SocketProvider>
            <Router>
              <div className="App min-h-screen bg-slate-50">
                {/* Global Toaster for Notifications */}
                <Toaster position="top-center" />

                {/* Offline Indicator - Shows when internet is lost */}
                <OfflineIndicator />

                {/* PWA Install Prompt */}
                <PWAInstallPrompt />

                {/* Voice Assistant - Only show when authenticated */}
                <ConditionalVoiceAssistant />

                {/* Global Incoming Call Handler - For patients receiving calls from hospitals */}
                <IncomingCallGlobal />

                {/* Push Notification Prompt - Shows when user hasn't enabled push yet */}
                <PushNotificationPrompt />

                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Admin Dashboard Route */}
                  <Route path="/admin-dashboard" element={
                    (isCreator() || (JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN'))
                      ? <AdminDashboard />
                      : <Navigate to="/login" />
                  } />

                  {/* Protected Dashboard Route */}
                  <Route path="/dashboard" element={<PrivateRoute><Home /></PrivateRoute>} />

                  {/* Protected Routes (Require Login) */}
                  <Route path="/wellness" element={<PrivateRoute><Wellness /></PrivateRoute>} />
                  <Route path="/first-aid" element={<PrivateRoute><FirstAid /></PrivateRoute>} />
                  <Route path="/records" element={<PrivateRoute><HealthRecords /></PrivateRoute>} />
                  <Route path="/family" element={<PrivateRoute><FamilyProfile /></PrivateRoute>} />
                  <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
                  <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
                  <Route path="/analytics" element={<Navigate to="/symptom-analysis" replace />} />
                  <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
                  <Route path="/patient-appointments" element={<PrivateRoute><PatientAppointments /></PrivateRoute>} />
                  <Route path="/queue-dashboard" element={<PrivateRoute><QueueDashboard /></PrivateRoute>} />
                  <Route path="/hospital-dashboard" element={<PrivateRoute><HospitalDashboard /></PrivateRoute>} />
                  <Route path="/hospital-branding" element={<PrivateRoute><HospitalBranding /></PrivateRoute>} />
                  <Route path="/result/:medicineName" element={<PrivateRoute><Result /></PrivateRoute>} />
                  <Route path="/doctors" element={<PrivateRoute><Doctors /></PrivateRoute>} />
                  <Route path="/symptom-analysis" element={<PrivateRoute><SymptomAnalysis /></PrivateRoute>} />

                  <Route path="/recovery-tracker" element={<PrivateRoute><PatientRecoveryTracker /></PrivateRoute>} />
                  <Route path="/my-bills" element={<PrivateRoute><PatientBilling /></PrivateRoute>} />
                </Routes>
              </div>
            </Router>
          </SocketProvider>
        </BrandingProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;