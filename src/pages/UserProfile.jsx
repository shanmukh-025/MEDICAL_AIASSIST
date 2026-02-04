import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, Save, User, Mail, Phone, MapPin, Calendar, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const UserProfile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    photo: null,
    gender: 'Male',
    bloodGroup: ''
  });
  const [previewUrl, setPreviewUrl] = useState(null);

  const t = {
    title: lang === 'en' ? 'My Profile' : 'నా ప్రొఫైల్',
    uploadPhoto: lang === 'en' ? 'Upload Photo' : 'ఫోటో అప్లోడ్ చేయండి',
    changePhoto: lang === 'en' ? 'Change Photo' : 'ఫోటో మార్చండి',
    name: lang === 'en' ? 'Full Name' : 'పూర్తి పేరు',
    email: lang === 'en' ? 'Email' : 'ఇమెయిల్',
    phone: lang === 'en' ? 'Phone Number' : 'ఫోన్ నంబర్',
    address: lang === 'en' ? 'Address' : 'చిరునామా',
    dob: lang === 'en' ? 'Date of Birth' : 'పుట్టిన తేదీ',
    gender: lang === 'en' ? 'Gender' : 'లింగం',
    bloodGroup: lang === 'en' ? 'Blood Group' : 'రక్త గ్రూపు',
    save: lang === 'en' ? 'Save Changes' : 'మార్పులను సేవ్ చేయండి',
    male: lang === 'en' ? 'Male' : 'పురుషుడు',
    female: lang === 'en' ? 'Female' : 'స్త్రీ',
    other: lang === 'en' ? 'Other' : 'ఇతర'
  };

  const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        if (data.photo) {
          setPreviewUrl(data.photo);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(lang === 'en' ? 'Image size should be less than 5MB' : 'చిత్రం పరిమాణం 5MB కంటే తక్కువగా ఉండాలి');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(lang === 'en' ? 'Please select an image file' : 'దయచేసి చిత్ర ఫైల్‌ను ఎంచుకోండి');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        uploadPhoto(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_URL}/api/auth/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({ ...prev, photo: data.photoUrl }));
        
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.photo = data.photoUrl;
        localStorage.setItem('user', JSON.stringify(user));
        
        toast.success(lang === 'en' ? 'Photo uploaded successfully!' : 'ఫోటో విజయవంతంగా అప్లోడ్ చేయబడింది!');
      } else {
        toast.error(lang === 'en' ? 'Failed to upload photo' : 'ఫోటో అప్లోడ్ చేయడంలో విఫలమైంది');
        setPreviewUrl(profile.photo); // Revert preview
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(lang === 'en' ? 'Failed to upload photo' : 'ఫోటో అప్లోడ్ చేయడంలో విఫలమైంది');
      setPreviewUrl(profile.photo); // Revert preview
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        Object.assign(user, data);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast.success(lang === 'en' ? 'Profile updated successfully!' : 'ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది!');
      } else {
        toast.error(lang === 'en' ? 'Failed to update profile' : 'ప్రొఫైల్ నవీకరణ విఫలమైంది');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(lang === 'en' ? 'Failed to update profile' : 'ప్రొఫైల్ నవీకరణ విఫలమైంది');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 pb-12 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')} 
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold">{t.title}</h1>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-6 -mt-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 border-4 border-white shadow-lg">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={48} className="text-purple-300" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Camera size={20} />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
            
            <p className="mt-4 text-sm text-gray-500 text-center">
              {previewUrl ? t.changePhoto : t.uploadPhoto}
              <br />
              <span className="text-xs">Max 5MB • JPG, PNG</span>
            </p>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.name}
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail size={16} className="inline mr-1" />
                {t.email}
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone size={16} className="inline mr-1" />
                {t.phone}
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                {t.dob}
              </label>
              <input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Gender & Blood Group Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.gender}
                </label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Male">{t.male}</option>
                  <option value="Female">{t.female}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.bloodGroup}
                </label>
                <select
                  value={profile.bloodGroup}
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin size={16} className="inline mr-1" />
                {t.address}
              </label>
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Save size={20} />
                  {t.save}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
