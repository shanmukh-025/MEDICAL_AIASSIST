import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle, Calendar, Clock, User, Loader2, AlertTriangle, Check, Trash2, Edit2, Phone, MapPin, Users, Briefcase, Heart, Save, Plus, X as CloseIcon, Upload, FileText, Building2, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import HospitalQueueManagement from '../components/HospitalQueueManagement';
import DoctorScheduleView from '../components/DoctorScheduleView';
import AudioCall from '../components/AudioCall';
import PatientRecordsManager from '../components/PatientRecordsManager';
import CallHistory from '../components/CallHistory';
import webrtcService from '../services/webrtc';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SCHEDULING'); // SCHEDULING, QUEUE, PROFILE, PENDING, CONFIRMED, COMPLETED
  const [notifications, setNotifications] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [reportForm, setReportForm] = useState({ title: '', doctor: '', type: 'Lab Report', image: '' });
  const [uploadingReport, setUploadingReport] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef(null);
  const token = localStorage.getItem('token');
  const { socket } = useSocket();
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    fetchAppointments();
    fetchProfile();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/api/notifications`, { headers: { 'x-auth-token': token } });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Initialize WebRTC for incoming calls
  useEffect(() => {
    console.log('🔍 WebRTC Init Check:', {
      hasSocket: !!socket,
      hasProfile: !!profile,
      profileId: profile?._id
    });

    if (socket && profile) {
      // Join hospital's socket room to receive calls
      const hospitalRoomId = `hospital_${profile._id}`;
      socket.emit('join', hospitalRoomId);
      console.log('🏥 Hospital joined room:', hospitalRoomId);

      webrtcService.initialize(socket);

      // Handle incoming calls from patients via WebRTC service
      webrtcService.setOnIncomingCall(({ from, callType }) => {
        console.log('📞 Incoming call from patient (WebRTC):', from);
        setIncomingCallData({ from, callType, name: 'Patient' });
        setShowIncomingCall(true);
        toast.success('📞 Incoming call from patient!');
      });

      // ALSO listen directly to socket for demo mode
      const handleCallOffer = ({ from, callType, offer, callerName, callerUserId }) => {
        console.log('📢 HOSPITAL: Call offer event fired!');
        console.log('📞 Direct socket call received!', { from, callType, offer, callerName, callerUserId });
        console.log('📍 Setting state: showIncomingCall=true');
        setIncomingCallData({ from, callType, name: callerName || 'Patient', callerUserId });
        setShowIncomingCall(true);
        toast.success(`📞 Incoming call from ${callerName || 'patient'}!`);
      };

      socket.on('call:offer', handleCallOffer);
      console.log('✅ Hospital listener registered for call:offer');

      // Listen for real-time notifications & queue updates
      const handleNotification = () => { fetchNotifications(); };
      const handleQueueUpdated = () => { fetchAppointments(); fetchNotifications(); };
      socket.on('notification', handleNotification);
      socket.on('queueUpdated', handleQueueUpdated);

      // Cleanup
      return () => {
        console.log('🧹 Removing hospital call:offer listener');
        socket.off('call:offer', handleCallOffer);
        socket.off('notification', handleNotification);
        socket.off('queueUpdated', handleQueueUpdated);
      };
    } else {
      console.log('⏳ Waiting for socket and profile...');
    }
  }, [socket, profile]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/api/hospitals/profile`, { headers: { 'x-auth-token': token } });
      setProfile(res.data);
      setEditData(res.data);

      // Properly construct logo URL
      if (res.data.logo) {
        const logoUrl = res.data.logo.startsWith('http')
          ? res.data.logo
          : `${API}${res.data.logo}`;
        console.log('Logo URL:', logoUrl);
        setLogoPreview(logoUrl);
      } else {
        setLogoPreview(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/appointments/hospital`, { headers: { 'x-auth-token': token } });
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointments');
    } finally { setLoading(false); }
  };

  const saveProfile = async () => {
    try {
      await axios.put(`${API}/api/hospitals/profile`, editData, { headers: { 'x-auth-token': token } });
      toast.success('✅ Profile Updated');
      fetchProfile();
      setEditMode(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    }
  };

  const addDoctor = () => {
    setEditData({
      ...editData,
      doctors: [...(editData.doctors || []), { name: '', specialty: '', qualification: '', experience: '' }]
    });
  };

  const removeDoctor = (index) => {
    const newDoctors = editData.doctors.filter((_, i) => i !== index);
    setEditData({ ...editData, doctors: newDoctors });
  };

  const updateDoctor = (index, field, value) => {
    const newDoctors = [...editData.doctors];
    newDoctors[index][field] = value;
    setEditData({ ...editData, doctors: newDoctors });
  };

  const addService = () => {
    const newService = prompt('Enter service name:');
    if (newService) {
      setEditData({
        ...editData,
        services: [...(editData.services || []), newService]
      });
    }
  };

  const removeService = (index) => {
    const newServices = editData.services.filter((_, i) => i !== index);
    setEditData({ ...editData, services: newServices });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }

    toast.loading('Detecting location...', { id: 'location' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          setEditData({
            ...editData,
            address: address,
            location: { latitude, longitude }
          });

          toast.success('📍 Location detected!', { id: 'location' });
        } catch (error) {
          console.error('Geocoding error:', error);
          setEditData({
            ...editData,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            location: { latitude, longitude }
          });
          toast.success('📍 Location detected!', { id: 'location' });
        }
      },
      (error) => {
        toast.error('Failed to detect location. Please enable location access.', { id: 'location' });
        console.error(error);
      }
    );
  };

  // Geocode address to get coordinates when manually typed
  const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 3) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setEditData(prev => ({
          ...prev,
          location: { 
            latitude: parseFloat(lat), 
            longitude: parseFloat(lon) 
          }
        }));
        console.log('✅ Auto-geocoded address:', address, '→', lat, lon);
      } else {
        console.warn('⚠️ Could not geocode address:', address);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleLogoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo should be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Upload logo
    try {
      setUploadingLogo(true);
      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);

      console.log('📤 Uploading logo to:', `${API}/api/hospitals/upload-logo`);

      const response = await axios.post(
        `${API}/api/hospitals/upload-logo`,
        formDataUpload,
        { headers: { 'x-auth-token': token } }
      );

      console.log('📥 Server response:', response.data);

      if (response.data.logoUrl) {
        // Use the full URL from response, don't prepend API again
        const logoUrl = response.data.logoUrl.startsWith('http')
          ? response.data.logoUrl
          : `${API}${response.data.logoUrl}`;

        console.log('🖼️ Constructed logo URL:', logoUrl);
        console.log('🔗 Testing URL accessibility...');

        // Test if URL is accessible
        fetch(logoUrl)
          .then(res => {
            console.log('✅ URL is accessible, status:', res.status);
            if (!res.ok) {
              console.error('❌ URL returned error status:', res.status);
            }
          })
          .catch(err => {
            console.error('❌ URL is NOT accessible:', err);
          });

        setLogoPreview(logoUrl);
        setEditData({ ...editData, logo: logoUrl });
        toast.success('Logo uploaded successfully!');

        // Save the logo URL to profile immediately
        await axios.put(`${API}/api/hospitals/profile`,
          { ...editData, logo: logoUrl },
          { headers: { 'x-auth-token': token } }
        );

        fetchProfile(); // Refresh profile
      } else {
        console.error('❌ No logoUrl in response:', response.data);
        toast.error('Upload failed - no URL returned');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.msg || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const approve = async (id) => {
    toast.custom((to) => (
      <div className="bg-white p-6 rounded-3xl shadow-2xl border max-w-md">
        <h3 className="font-bold text-lg mb-3 text-emerald-700">Approve Appointment</h3>
        <textarea id="approval-message" placeholder="Optional suggestions for patient..." className="w-full p-3 border rounded-xl mb-3" rows="3" />
        <div className="flex gap-3">
          <button onClick={() => {
            const message = document.getElementById('approval-message').value;
            axios.put(`${API}/api/appointments/${id}/approve`, { message }, { headers: { 'x-auth-token': token } })
              .then(() => { toast.success('✅ Approved'); fetchAppointments(); toast.dismiss(to.id); })
              .catch(() => toast.error('Failed'));
          }} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold">Confirm Approve</button>
          <button onClick={() => toast.dismiss(to.id)} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const complete = async (id) => {
    try {
      await axios.put(`${API}/api/appointments/${id}/complete`, {}, { headers: { 'x-auth-token': token } });
      toast.success('✅ Visit Completed');
      fetchAppointments();
    } catch (err) { console.error(err); toast.error('Failed'); }
  };

  const sendReminder = async (appointmentId, patientName) => {
    try {
      const res = await axios.post(
        `${API}/api/appointments/${appointmentId}/send-reminder`,
        { patientLocation: null },
        { headers: { 'x-auth-token': token } }
      );
      toast.success(
        `🔔 Reminder sent to ${patientName}!\n${res.data.queuePosition} patients ahead`,
        { duration: 5000 }
      );
    } catch (err) {
      console.error('Reminder error:', err);
      toast.error(err.response?.data?.msg || 'Failed to send reminder');
    }
  };

  const deleteAppointment = async (id) => {
    toast.custom((to) => (
      <div className="bg-white p-6 rounded-3xl shadow-2xl border max-w-md">
        <h3 className="font-bold text-lg mb-3 text-slate-900">Delete Visit Record?</h3>
        <p className="text-sm text-slate-600 mb-4">This will permanently remove this completed visit from your records.</p>
        <div className="flex gap-3">
          <button onClick={() => {
            axios.delete(`${API}/api/appointments/${id}`, { headers: { 'x-auth-token': token } })
              .then(() => { toast.success('🗑️ Deleted'); fetchAppointments(); toast.dismiss(to.id); })
              .catch(() => toast.error('Failed to delete'));
          }} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Delete</button>
          <button onClick={() => toast.dismiss(to.id)} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const reject = async (id) => {
    toast.custom((to) => (
      <div className="bg-white p-6 rounded-3xl shadow-2xl border max-w-md">
        <h3 className="font-bold text-lg mb-3">Reject Appointment</h3>
        <textarea id="rejection-reason" placeholder="Optional reason..." className="w-full p-3 border rounded-xl mb-3" rows="3" />
        <div className="flex gap-3">
          <button onClick={() => {
            const reason = document.getElementById('rejection-reason').value;
            axios.put(`${API}/api/appointments/${id}/reject`, { reason }, { headers: { 'x-auth-token': token } })
              .then(() => { toast.success('❌ Rejected'); fetchAppointments(); toast.dismiss(to.id); })
              .catch(() => toast.error('Failed'));
          }} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Confirm Reject</button>
          <button onClick={() => toast.dismiss(to.id)} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const openReportModal = (appointment) => {
    setSelectedAppointment(appointment);
    setReportForm({
      title: '',
      doctor: appointment.doctor || '',
      type: 'Lab Report',
      image: ''
    });
    setShowReportModal(true);
  };

  const handleReportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8000000) {
        toast.error("File too large (Max 8MB)");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setReportForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const sendTestReport = async () => {
    if (!reportForm.title || !reportForm.image) {
      toast.error('Please provide title and upload image');
      return;
    }

    setUploadingReport(true);
    try {
      const res = await axios.post(
        `${API}/api/records/send-to-patient`,
        {
          patientId: selectedAppointment.patientId._id,
          title: reportForm.title,
          doctor: reportForm.doctor,
          type: reportForm.type,
          date: new Date(),
          image: reportForm.image,
          appointmentId: selectedAppointment._id
        },
        { headers: { 'x-auth-token': token } }
      );

      if (res.data.success) {
        toast.success('✅ Test report sent to patient!');
        setShowReportModal(false);
        setReportForm({ title: '', doctor: '', type: 'Lab Report', image: '' });
        setSelectedAppointment(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send report');
    } finally {
      setUploadingReport(false);
    }
  };

  const filteredAppointments = appointments.filter(a => {
    if (activeTab === 'CONFIRMED') {
      return a.status === 'CONFIRMED' || a.status === 'CHECKED_IN';
    }
    return a.status === activeTab;
  });
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'CHECKED_IN').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
  const totalAppointments = appointments.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={() => setSidebarVisible(!sidebarVisible)} 
              className="bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition text-slate-700"
              title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{profile?.name || 'Hospital'}</h1>
              <p className="text-sm text-slate-500">Admin Dashboard</p>
            </div>
          </div>
          {profile && (
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                {totalAppointments} Total
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    logout();
                    navigate('/login');
                    toast.success('Logged out successfully');
                  }
                }}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-semibold text-sm transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Vertical Sidebar Navigation */}
        {sidebarVisible && (
          <div className="w-72 bg-white border-r border-slate-200 min-h-screen sticky top-[73px] self-start transition-all duration-300 ease-in-out">
            <div className="p-4 space-y-2">
              <button
              onClick={() => setActiveTab('SCHEDULING')}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3 ${
                activeTab === 'SCHEDULING' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Calendar size={20} />
              <span>Scheduling</span>
            </button>
            
            <button
              onClick={() => setActiveTab('QUEUE')}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3 ${
                activeTab === 'QUEUE' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Users size={20} />
              <span>Queue Management</span>
            </button>
            
            <button
              onClick={() => setActiveTab('PROFILE')}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3 ${
                activeTab === 'PROFILE' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Heart size={20} />
              <span>Profile</span>
            </button>
            
            <button
              onClick={() => setActiveTab('RECORDS')}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3 ${
                activeTab === 'RECORDS' 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText size={20} />
              <span>Patient Records</span>
            </button>

            <button
              onClick={() => setActiveTab('CALL_HISTORY')}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3 ${
                activeTab === 'CALL_HISTORY' 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Phone size={20} />
              <span>Call History</span>
            </button>

            <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase px-4 mb-2">Appointments</p>
              
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-between ${
                  activeTab === 'PENDING' 
                    ? 'bg-yellow-50 text-yellow-800 border-2 border-yellow-300' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock size={20} />
                  <span>Pending</span>
                </div>
                {pendingCount > 0 && (
                  <span className="bg-yellow-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('CONFIRMED')}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-between ${
                  activeTab === 'CONFIRMED' 
                    ? 'bg-green-50 text-green-800 border-2 border-green-300' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} />
                  <span>Confirmed</span>
                </div>
                {confirmedCount > 0 && (
                  <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    {confirmedCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-between ${
                  activeTab === 'COMPLETED' 
                    ? 'bg-blue-50 text-blue-800 border-2 border-blue-300' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Check size={20} />
                  <span>Completed</span>
                </div>
                {completedCount > 0 && (
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    {completedCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {/* Content */}
        {activeTab === 'SCHEDULING' && (
          <DoctorScheduleView
            appointments={appointments}
            doctors={profile?.doctors || []}
            notifications={notifications}
            onApprove={approve}
            onReject={reject}
            onComplete={complete}
            onSendReminder={sendReminder}
          />
        )}

        {activeTab === 'QUEUE' && (
          <HospitalQueueManagement />
        )}

        {activeTab === 'RECORDS' && (
          <PatientRecordsManager />
        )}

        {activeTab === 'CALL_HISTORY' && (
          <CallHistory 
            onCallPatient={({ userId, name }) => {
              if (!socket) {
                toast.error('Not connected. Please refresh.');
                return;
              }
              setIncomingCallData(null);
              setShowIncomingCall(false);
              // Start an outgoing call to the patient
              setIncomingCallData({ from: `user_${userId}`, callType: 'audio', name, isOutgoing: true });
              setShowIncomingCall(true);
            }}
          />
        )}

        {activeTab === 'PROFILE' && profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Hospital Information</h2>
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition">
                      <Edit2 size={16} /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={saveProfile} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition">
                        <Save size={16} /> Save
                      </button>
                      <button onClick={() => { setEditMode(false); setEditData(profile); }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Logo Upload Section - in edit mode */}
                  {editMode && (
                    <div className="mb-4 pb-4 border-b border-slate-200">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Hospital Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center relative">
                          {uploadingLogo && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                          {logoPreview ? (
                            <img
                              key={logoPreview}
                              src={logoPreview}
                              alt="Logo"
                              className="w-full h-full object-contain p-2"
                              onLoad={() => {
                                console.log('✅ Logo loaded successfully:', logoPreview);
                              }}
                              onError={(e) => {
                                console.error('❌ Logo failed to load:', logoPreview);
                                e.target.onerror = null; // Prevent infinite loop
                              }}
                            />
                          ) : (
                            <div className="text-center">
                              <Building2 size={48} className="text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-400">No logo uploaded</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                          >
                            {uploadingLogo ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload size={16} />
                                Upload Logo
                              </>
                            )}
                          </button>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoSelect}
                            className="hidden"
                          />
                          <p className="text-xs text-gray-500 mt-2">PNG or SVG recommended • Max 2MB</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo Display in View Mode */}
                  {!editMode && logoPreview && (
                    <div className="mb-4 pb-4 border-b border-slate-200">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Hospital Logo</label>
                      <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        <img
                          key={logoPreview}
                          src={logoPreview}
                          alt="Logo"
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            console.error('❌ Logo failed to load in view mode:', logoPreview);
                            e.target.onerror = null;
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Hospital Name</label>
                    <div className="bg-slate-50 p-3 rounded-xl font-bold text-slate-900">{profile.name}</div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Address</label>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={editData.address || ''}
                            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                            onBlur={(e) => geocodeAddress(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl"
                            placeholder="Enter address or detect location"
                          />
                          <button
                            onClick={detectLocation}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition whitespace-nowrap"
                          >
                            <MapPin size={16} /> Detect Location
                          </button>
                        </div>
                        {editData.location?.latitude && editData.location?.longitude && (
                          <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-2">
                            <CheckCircle size={14} />
                            <span>GPS: {editData.location.latitude.toFixed(6)}, {editData.location.longitude.toFixed(6)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.address || 'Not set'}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone</label>
                      {editMode ? (
                        <input value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="+1 234 567 8900" />
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.phone || 'Not set'}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Emergency</label>
                      {editMode ? (
                        <input value={editData.emergencyContact || ''} onChange={(e) => setEditData({ ...editData, emergencyContact: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="+1 234 567 8911" />
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.emergencyContact || 'Not set'}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Working Hours</label>
                    {editMode ? (
                      <input value={editData.workingHours || ''} onChange={(e) => setEditData({ ...editData, workingHours: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="09:00 AM - 09:00 PM" />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.workingHours}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">About</label>
                    {editMode ? (
                      <textarea value={editData.about || ''} onChange={(e) => setEditData({ ...editData, about: e.target.value })} rows="3" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="Brief description about your hospital..." />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.about || 'No description available'}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Doctors Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-emerald-600" /> Medical Staff
                  </h2>
                  {editMode && (
                    <button onClick={addDoctor} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1">
                      <Plus size={16} /> Add Doctor
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {(editMode ? editData.doctors : profile.doctors)?.length > 0 ? (
                    (editMode ? editData.doctors : profile.doctors).map((doc, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {editMode ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <input value={doc.name} onChange={(e) => updateDoctor(i, 'name', e.target.value)} placeholder="Doctor Name" className="flex-1 p-2 border rounded-lg text-sm font-bold" />
                              <button onClick={() => removeDoctor(i)} className="ml-2 text-red-600 p-2 hover:bg-red-50 rounded-lg">
                                <CloseIcon size={16} />
                              </button>
                            </div>
                            <input value={doc.specialty} onChange={(e) => updateDoctor(i, 'specialty', e.target.value)} placeholder="Specialty" className="w-full p-2 border rounded-lg text-sm" />
                            <input value={doc.qualification} onChange={(e) => updateDoctor(i, 'qualification', e.target.value)} placeholder="Qualification" className="w-full p-2 border rounded-lg text-sm" />
                            <input value={doc.experience} onChange={(e) => updateDoctor(i, 'experience', e.target.value)} placeholder="Experience" className="w-full p-2 border rounded-lg text-sm" />
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900">{doc.name}</div>
                            <div className="text-sm text-emerald-600 font-medium">{doc.specialty}</div>
                            <div className="text-xs text-slate-500 mt-1">{doc.qualification}</div>
                            {doc.experience && <div className="text-xs text-slate-500">{doc.experience} experience</div>}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Users size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No doctors added yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Services & Stats */}
            <div className="space-y-6">
              {/* Stats Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-4">Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100">Total Appointments</span>
                    <span className="text-2xl font-bold">{totalAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100">Pending</span>
                    <span className="text-xl font-bold">{pendingCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100">Confirmed</span>
                    <span className="text-xl font-bold">{confirmedCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100">Completed</span>
                    <span className="text-xl font-bold">{completedCount}</span>
                  </div>
                </div>
              </div>

              {/* Services Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase size={18} className="text-emerald-600" /> Services
                  </h3>
                  {editMode && (
                    <button onClick={addService} className="text-emerald-600 font-bold text-sm">
                      <Plus size={18} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {(editMode ? editData.services : profile.services)?.length > 0 ? (
                    (editMode ? editData.services : profile.services).map((service, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                        <span className="text-sm text-slate-700">• {service}</span>
                        {editMode && (
                          <button onClick={() => removeService(i)} className="text-red-600">
                            <CloseIcon size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      No services listed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab Content */}
        {!['PROFILE', 'SCHEDULING', 'QUEUE', 'RECORDS', 'CALL_HISTORY'].includes(activeTab) && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
                  <div className="bg-slate-100 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle size={32} className="text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-500">No {activeTab.toLowerCase()} appointments</p>
                </div>
              )}
              {filteredAppointments.map(p => (
                <div key={p._id} className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User size={18} className="text-emerald-600" />
                        <span className="font-bold text-slate-900 text-lg">{p.patientName || p.patientId?.name || 'Patient'}</span>
                        {p.queueNumber && (
                          <span className="bg-emerald-600 text-white px-2 py-1 rounded-lg text-xs font-bold ml-2">
                            Queue #{p.queueNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 ml-6">{p.patientId?.email}</div>
                      {p.reason && <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg ml-6">{p.reason}</div>}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase ${p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      p.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="font-bold">{p.appointmentDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-orange-500" />
                      <span className="font-bold">{p.appointmentTime}</span>
                    </div>
                  </div>

                  {/* Action Buttons Based on Status */}
                  {p.status === 'PENDING' && (
                    <div className="flex gap-3">
                      <button onClick={() => approve(p._id)} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:bg-green-700 transition">
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button onClick={() => reject(p._id)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:bg-red-700 transition">
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  )}

                  {(p.status === 'CONFIRMED' || p.status === 'CHECKED_IN') && (
                    <button onClick={() => complete(p._id)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition">
                      <Check size={18} /> Complete Visit
                    </button>
                  )}

                  {p.status === 'COMPLETED' && (
                    <div className="flex gap-3">
                      <button onClick={() => openReportModal(p)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition">
                        <Upload size={18} /> Send Test Report
                      </button>
                      <button onClick={() => deleteAppointment(p._id)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:bg-red-700 transition">
                        <Trash2 size={18} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
        </div>
      </div>

      {/* Test Report Upload Modal */}
      {showReportModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="text-emerald-600" size={24} />
                Send Test Report
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-xl">
              <div className="text-sm text-slate-500">Patient</div>
              <div className="font-bold text-slate-900">{selectedAppointment.patientName || selectedAppointment.patientId?.name}</div>
              <div className="text-xs text-slate-500">{selectedAppointment.patientId?.email}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Report Title *</label>
                <input
                  type="text"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  placeholder="e.g., Blood Test Results"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Doctor Name</label>
                <input
                  type="text"
                  value={reportForm.doctor}
                  onChange={(e) => setReportForm({ ...reportForm, doctor: e.target.value })}
                  placeholder="Doctor name"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Report Type</label>
                <select
                  value={reportForm.type}
                  onChange={(e) => setReportForm({ ...reportForm, type: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="Lab Report">Lab Report</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="Blood Test">Blood Test</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Upload Report Image/PDF *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReportFile}
                  className="w-full p-3 border border-slate-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {reportForm.image && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle size={16} /> File uploaded successfully
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={sendTestReport}
                disabled={uploadingReport || !reportForm.title || !reportForm.image}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {uploadingReport ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Upload size={18} /> Send Report
                  </>
                )}
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                disabled={uploadingReport}
                className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming/Outgoing Call */}
      {showIncomingCall && incomingCallData && (
        <AudioCall
          recipientId={incomingCallData.from}
          recipientName={incomingCallData.name}
          isIncoming={!incomingCallData.isOutgoing}
          socket={socket}
          onClose={() => {
            setShowIncomingCall(false);
            setIncomingCallData(null);
          }}
        />
      )}
    </div>
  );
};

export default HospitalDashboard;
