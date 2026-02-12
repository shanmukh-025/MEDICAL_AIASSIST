import React, { useEffect, useMemo } from 'react';
import { X, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';

const VideoCall = ({ 
  roomId, 
  userName, 
  onEnd, 
  type = 'consultation' // 'consultation' or 'call'
}) => {
  // Compute the meeting URL directly using useMemo
  const meetingUrl = useMemo(() => {
    const sanitizedRoomId = roomId.replace(/[^a-zA-Z0-9-_]/g, '');
    const sanitizedUserName = (userName || 'Guest').replace(/[^a-zA-Z0-9-_ ]/g, '');
    
    const jitsiDomain = 'meet.jit.si';
    return `https://${jitsiDomain}/${sanitizedRoomId}?userInfo.displayName=${encodeURIComponent(sanitizedUserName)}#config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
  }, [roomId, userName]);

  useEffect(() => {
    toast.success(type === 'consultation' ? 'Joining consultation...' : 'Connecting call...');
  }, [type]);

  const handleEndCall = () => {
    toast.success(type === 'consultation' ? 'Consultation ended' : 'Call ended');
    onEnd();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">
            {type === 'consultation' ? '🩺 Video Consultation' : '📞 Video Call'}
          </h2>
          <p className="text-sm text-emerald-100">Room: {roomId}</p>
        </div>
        <button
          onClick={handleEndCall}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <PhoneOff size={18} />
          End Call
        </button>
      </div>

      {/* Video Container - Using iframe for Jitsi Meet */}
      <div className="flex-1 relative">
        {meetingUrl ? (
          <iframe
            src={meetingUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Video Call"
          ></iframe>
        ) : (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-500 border-solid mx-auto mb-4"></div>
              <p className="text-lg">Preparing video call...</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 text-white p-3 text-center text-sm">
        <p>
          Share room code <strong className="text-emerald-400">{roomId}</strong> with others to join this call
        </p>
      </div>
    </div>
  );
};

export default VideoCall;
