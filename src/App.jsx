import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext'; 

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Wellness from './pages/Wellness';
import FirstAid from './pages/FirstAid';
import HealthRecords from './pages/HealthRecords';

// --- NEW IMPORTS (Based on your file names) ---
import Reminders from './pages/Reminders';
import Scan from './pages/Scan';
import Tracker from './pages/Tracker'; // For Analytics
import Appointments from './pages/Appointments';

// Components
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <div className="App">
            <Toaster position="top-center" />
            
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/wellness" element={<PrivateRoute><Wellness /></PrivateRoute>} />
              <Route path="/first-aid" element={<PrivateRoute><FirstAid /></PrivateRoute>} />
              <Route path="/records" element={<PrivateRoute><HealthRecords /></PrivateRoute>} />
              
              {/* --- NEW ROUTES CONNECTED --- */}
              <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
              <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
              <Route path="/analytics" element={<PrivateRoute><Tracker /></PrivateRoute>} />
              <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
            </Routes>
          </div>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;