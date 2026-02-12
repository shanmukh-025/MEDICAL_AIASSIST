import React, { useState } from 'react';
import { Phone, Video, X, User, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import VideoCall from './VideoCall';

const CallHospital = ({ hospitalName, hospitalPhone, appointmentId, onClose }) => {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [roomId, setRoomId] = useState('');

  const handlePhoneCall = () => {
    if (!hospitalPhone) {
      toast.error('Hospital phone number not available');
      return;
    }
    
    // For mobile devices, this will trigger the phone dialer
    window.location.href = `tel:${hospitalPhone}`;
    toast.success('Opening phone dialer...');
  };

  const handleVideoConsultation = () => {
    // Generate unique room ID for this consultation
    const generatedRoomId = `consultation-${appointmentId || Date.now()}`;
    setRoomId(generatedRoomId);
    setShowVideoCall(true);
    
    // TODO: Send notification to hospital about the consultation request
    toast.success('Starting video consultation...');
  };

  if (showVideoCall) {
    return (
      <VideoCall
        roomId={roomId}
        userName={localStorage.getItem('userName') || 'Patient'}
        onEnd={() => {
          setShowVideoCall(false);
          onClose();
        }}
        type="consultation"
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Contact Hospital</h2>
              <p className="text-emerald-100 text-sm">{hospitalName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center mb-6">
            Choose how you'd like to connect with the hospital
          </p>

          {/* Video Consultation Button */}
          <button
            onClick={handleVideoConsultation}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <Video size={24} />
            </div>
            <div className="text-left">
              <div className="text-lg">Video Consultation</div>
              <div className="text-xs text-emerald-100">Connect face-to-face with doctor</div>
            </div>
          </button>

          {/* Voice Call Button */}
          <button
            onClick={handlePhoneCall}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <Phone size={24} />
            </div>
            <div className="text-left">
              <div className="text-lg">Voice Call</div>
              <div className="text-xs text-blue-100">
                {hospitalPhone || 'Phone number not available'}
              </div>
            </div>
          </button>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> For video consultation, ensure you have a stable internet connection and your camera/microphone permissions are enabled.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallHospital;
