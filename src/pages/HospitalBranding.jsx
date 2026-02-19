import React, { useState, useRef } from 'react';
import { ArrowLeft, Save, Upload, Palette, Building2, RefreshCw, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import toast from 'react-hot-toast';

const HospitalBranding = () => {
  const navigate = useNavigate();
  const { branding, updateBranding } = useBranding();
  const [loading, setLoading] = useState(false);
  const logoInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    logo: branding.logo || null,
    primaryColor: branding.primaryColor || '#059669',
    secondaryColor: branding.secondaryColor || '#10b981',
    accentColor: branding.accentColor || '#34d399',
    upiId: branding.upiId || '',
    accountName: branding.accountName || ''
  });
  
  const [logoPreview, setLogoPreview] = useState(branding.logo);

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
      setLoading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);
      
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

      const response = await fetch(
        `${API_BASE}/api/hospitals/${branding.hospitalId}/logo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formDataUpload
        }
      );

      if (response.ok) {
        const data = await response.json();
        const logoUrl = data.logo.startsWith('http') ? data.logo : `${API_BASE}${data.logo}`;
        
        setFormData(prev => ({ ...prev, logo: logoUrl }));
        setLogoPreview(logoUrl);
        toast.success('Logo uploaded successfully!');
      } else {
        const error = await response.json();
        toast.error(error.msg || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const success = await updateBranding(formData);
      
      if (success) {
        toast.success('Branding updated successfully!');
        // Reload to apply changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Failed to update branding');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update branding');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    setFormData({
      logo: null,
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      accentColor: '#34d399',
      upiId: '',
      accountName: ''
    });
    setLogoPreview(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 pb-12 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">White-Label Branding</h1>
              <p className="text-blue-100 text-sm">Customize the app with your hospital's branding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Logo Upload */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                Hospital Logo
              </h2>
              
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Hospital Logo" 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Building2 size={48} className="text-gray-300" />
                  )}
                </div>
                
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <Upload size={18} />
                    Upload Logo
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    PNG or SVG recommended • Max 2MB
                  </p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Color Customization */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Palette size={20} className="text-blue-600" />
                Brand Colors
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="mt-6 p-6 rounded-xl border-2 border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Preview</p>
                <div className="flex gap-3">
                  <div 
                    className="flex-1 h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    Primary
                  </div>
                  <div 
                    className="flex-1 h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: formData.secondaryColor }}
                  >
                    Secondary
                  </div>
                  <div 
                    className="flex-1 h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: formData.accentColor }}
                  >
                    Accent
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Smartphone className="text-green-600" size={24} />
                Payment Settings
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Patients will use this UPI ID to pay bills directly through UPI apps like Google Pay, PhonePe, and Paytm.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hospital UPI ID
                  </label>
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="hospital@hdfc  or  hospital@ybl"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g. abchospital@hdfcbank · citycare@ybl · medclinic@paytm</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account / Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Name that appears in UPI app"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                {formData.upiId && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-800">
                    <Smartphone size={16} />
                    <span>Patients will pay to <strong>{formData.upiId}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetToDefault}
                className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Reset
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default HospitalBranding;
