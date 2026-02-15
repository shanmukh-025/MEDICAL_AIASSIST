import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import AudioCall from './AudioCall';
import webrtcService from '../services/webrtc';

const IncomingCallGlobal = () => {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    if (!socket || userRole === 'HOSPITAL') return; // Only for patients

    // Listen for incoming calls
    const handleIncomingCall = ({ from, callType, callerName }) => {
      console.log('📞 PATIENT: Incoming call detected!', { from, callType, callerName });
      setIncomingCall({ from, callType, name: callerName || 'Hospital' });
    };

    // Set up WebRTC incoming call handler
    webrtcService.setOnIncomingCall(handleIncomingCall);

    // Also listen on socket directly
    socket.on('call:offer', handleIncomingCall);

    return () => {
      socket.off('call:offer', handleIncomingCall);
    };
  }, [socket, userRole]);

  if (!incomingCall || userRole === 'HOSPITAL') return null;

  return (
    <AudioCall
      recipientId={incomingCall.from}
      recipientName={incomingCall.name}
      isIncoming={true}
      socket={socket}
      onClose={() => setIncomingCall(null)}
    />
  );
};

export default IncomingCallGlobal;
