import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle, Calendar, Clock, User, Loader2, AlertTriangle, Check, Trash2, Edit2, Phone, MapPin, Users, Briefcase, Heart, Save, Plus, X as CloseIcon } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PROFILE'); // PROFILE, PENDING, CONFIRMED, COMPLETED
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const token = localStorage.getItem('token');

  useEffect(() => { 
    fetchAppointments(); 
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/api/hospitals/profile`, { headers: { 'x-auth-token': token } });
      setProfile(res.data);
      setEditData(res.data);
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

  const filteredAppointments = appointments.filter(a => a.status === activeTab);
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
  const totalAppointments = appointments.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{profile?.name || 'Hospital'}</h1>
              <p className="text-sm text-slate-500">Admin Dashboard</p>
            </div>
          </div>
          {profile && (
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                {totalAppointments} Total
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'PROFILE' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Heart size={16} /> Profile
          </button>
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pending {pendingCount > 0 && <span className="bg-yellow-600 text-white px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('CONFIRMED')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Confirmed {confirmedCount > 0 && <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs">{confirmedCount}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Completed {completedCount > 0 && <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">{completedCount}</span>}
          </button>
        </div>

        {/* Content */}
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
                            onChange={(e) => setEditData({...editData, address: e.target.value})} 
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
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.address || 'Not set'}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone</label>
                      {editMode ? (
                        <input value={editData.phone || ''} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="+1 234 567 8900" />
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.phone || 'Not set'}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Emergency</label>
                      {editMode ? (
                        <input value={editData.emergencyContact || ''} onChange={(e) => setEditData({...editData, emergencyContact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="+1 234 567 8911" />
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.emergencyContact || 'Not set'}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Working Hours</label>
                    {editMode ? (
                      <input value={editData.workingHours || ''} onChange={(e) => setEditData({...editData, workingHours: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="09:00 AM - 09:00 PM" />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-700">{profile.workingHours}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">About</label>
                    {editMode ? (
                      <textarea value={editData.about || ''} onChange={(e) => setEditData({...editData, about: e.target.value})} rows="3" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl" placeholder="Brief description about your hospital..." />
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
        {activeTab !== 'PROFILE' && (
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
                        <span className="font-bold text-slate-900 text-lg">{p.patientId?.name || 'Patient'}</span>
                      </div>
                      <div className="text-sm text-slate-500 ml-6">{p.patientId?.email}</div>
                      {p.reason && <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg ml-6">{p.reason}</div>}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase ${
                      p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
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

                  {p.status === 'CONFIRMED' && (
                    <button onClick={() => complete(p._id)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition">
                      <Check size={18} /> Complete Visit
                    </button>
                  )}

                  {p.status === 'COMPLETED' && (
                    <button onClick={() => deleteAppointment(p._id)} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:bg-red-700 transition">
                      <Trash2 size={18} /> Delete Record
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default HospitalDashboard;
