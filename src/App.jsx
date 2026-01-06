import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext'; 
import { SocketProvider } from './context/SocketContext';

// Components
import PrivateRoute from './components/PrivateRoute';
import OfflineIndicator from './components/OfflineIndicator'; // Import the offline banner

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Wellness from './pages/Wellness';
import FirstAid from './pages/FirstAid';
import HealthRecords from './pages/HealthRecords';
import Reminders from './pages/Reminders';
import Scan from './pages/Scan';
import Tracker from './pages/Tracker'; // For Analytics
import Appointments from './pages/Appointments';
import Result from './pages/Result';
import Doctors from './pages/Doctors';
import PatientAppointments from './pages/PatientAppointments';
import HospitalDashboard from './pages/HospitalDashboard';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SocketProvider>
          <Router>
            <div className="App min-h-screen bg-slate-50">
              {/* Global Toaster for Notifications */}
              <Toaster position="top-center" />
              
              {/* Offline Indicator - Shows when internet is lost */}
              <OfflineIndicator /> 
              
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protect the root/dashboard route */}
                <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
                
                {/* Protected Routes (Require Login) */}
                <Route path="/wellness" element={<PrivateRoute><Wellness /></PrivateRoute>} />
                <Route path="/first-aid" element={<PrivateRoute><FirstAid /></PrivateRoute>} />
                <Route path="/records" element={<PrivateRoute><HealthRecords /></PrivateRoute>} />
                <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
                <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
                <Route path="/analytics" element={<PrivateRoute><Tracker /></PrivateRoute>} />
                <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
                <Route path="/patient-appointments" element={<PrivateRoute><PatientAppointments /></PrivateRoute>} />
                <Route path="/hospital-dashboard" element={<PrivateRoute><HospitalDashboard /></PrivateRoute>} />
                <Route path="/result/:medicineName" element={<PrivateRoute><Result /></PrivateRoute>} />
                <Route path="/doctors" element={<PrivateRoute><Doctors /></PrivateRoute>} />
              </Routes>
            </div>
          </Router>
        </SocketProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;