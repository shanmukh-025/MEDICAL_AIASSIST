
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, X, PhoneIncoming } from 'lucide-react';
import toast from 'react-hot-toast';
import webrtcService from '../services/webrtc';

const AudioCall = ({ recipientId, recipientName, isIncoming = false, onClose, socket }) => {
    const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'connecting');
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [busyMessage, setBusyMessage] = useState(null);

    // ... refs ...
    const localAudioRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const timerRef = useRef(null);
    const isEndingCall = useRef(false); // Prevent infinite loop when ending call
    const startingCallRef = useRef(false); // Prevent double invocation

    useEffect(() => {
        // Ensure WebRTC service has socket
        if (socket && !webrtcService.socket) {
            console.warn('⚠️ WebRTC Service missing socket! Recovering...');
            webrtcService.initialize(socket);
        }

        // Setup WebRTC callbacks
        webrtcService.setOnRemoteStream((stream) => {
            console.log('🎧 Remote stream received in AudioCall component!', stream);

            if (remoteAudioRef.current) {
                console.log('🔊 Attaching stream to React Audio Element');
                remoteAudioRef.current.srcObject = stream;
                remoteAudioRef.current.muted = false; // Ensure unmuted
                remoteAudioRef.current.volume = 1.0;
                remoteAudioRef.current.play()
                    .then(() => console.log('✅ React Audio Element playing'))
                    .catch(e => console.error('❌ Error playing React audio:', e));
            }

            // Fallback JS Audio Player (bypass React)
            try {
                console.log('🔊 Creating Fallback JS Audio Player');
                const fallbackAudio = new Audio();
                fallbackAudio.srcObject = stream;
                fallbackAudio.muted = false;
                fallbackAudio.volume = 1.0;
                fallbackAudio.play()
                    .then(() => console.log('✅ Fallback Audio Player playing'))
                    .catch(e => console.error('❌ Error playing fallback audio:', e));
            } catch (e) {
                console.error('Fallback audio creation failed', e);
            }

            setCallStatus('connected');
            startTimer();
        });

        webrtcService.setOnCallEnded(() => {
            handleEndCall(false); // Don't emit back since we received the end signal
        });

        // Handle hospital busy signal
        webrtcService.setOnCallBusy(({ message }) => {
            console.log('🔴 Hospital busy:', message);
            setCallStatus('busy');
            setBusyMessage(message || 'Hospital is currently on another call. Please try again later.');
            toast.error('Hospital is on another call', { icon: '📞', duration: 5000 });
            // Auto-close after 4 seconds
            setTimeout(() => {
                if (onClose) onClose();
            }, 4000);
        });

        // Also listen directly on socket for busy signal
        const handleBusy = ({ message }) => {
            console.log('🔴 Direct socket busy signal:', message);
            setCallStatus('busy');
            setBusyMessage(message || 'Hospital is currently on another call. Please try again later.');
            toast.error('Hospital is on another call', { icon: '📞', duration: 5000 });
            setTimeout(() => {
                if (onClose) onClose();
            }, 4000);
        };
        if (socket) {
            socket.on('call:busy', handleBusy);
        }

        // Monitor ICE state and Remote Track Status - REMOVED for Production

        // Audio Level Visualization Logic
        // Check for Audio Context Fallback (Vital for playback reliability)
        let audioContext, remoteNode, source;
        const audioCheckInterval = setInterval(() => {
            // Ensure audio plays via Web Audio API if HTML element fails
            if (remoteAudioRef.current?.srcObject?.active && !audioContext) {
                try {
                    console.log("🔊 Initializing Web Audio API Fallback");
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    source = audioContext.createMediaStreamSource(remoteAudioRef.current.srcObject);
                    source.connect(audioContext.destination); // Direct output to speakers

                    // Resume if suspended
                    if (audioContext.state === 'suspended') {
                        audioContext.resume();
                    }
                } catch (e) { console.error("Audio Context Error", e); }
            } else if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }, 1000);

        // Auto-start call if outgoing
        if (!isIncoming) {
            startCall();
        }

        return () => {
            clearInterval(audioCheckInterval);
            if (audioContext) audioContext.close();
            if (socket) socket.off('call:busy', handleBusy);
            webrtcService.endCall();
            stopTimer();
        };
    }, []);

    // ... (lines 38-133)

    const handleEndCall = (emitEvent = true) => {
        // Prevent infinite loop
        if (isEndingCall.current) return;
        isEndingCall.current = true;

        // Notify the other party that call has ended
        if (emitEvent && webrtcService.socket && recipientId) {
            webrtcService.socket.emit('call:end', {
                to: recipientId
            });
            console.log('📴 Sent call end to:', recipientId);
        }

        webrtcService.endCall();
        stopTimer();
        toast.success('Call ended');
        if (onClose) onClose();
    };

    const startCall = async () => {
        if (startingCallRef.current) return;
        startingCallRef.current = true;

        try {
            // REAL WebRTC Calling
            console.log('🎤 Requesting microphone access...');

            // Add a small delay for UI to settle
            await new Promise(resolve => setTimeout(resolve, 500));

            // Pass actual caller name and userId
            const userName = localStorage.getItem('userName') || 'Patient';
            const localStream = await webrtcService.startCall(recipientId, 'audio', userName);

            if (localAudioRef.current) {
                localAudioRef.current.srcObject = localStream;
                localAudioRef.current.muted = true; // Mute local audio to prevent feedback
            }

            console.log('✅ Local stream obtained, waiting for answer...');
            toast.success('📞 Calling...');

            // Socket listeners for call events
            if (webrtcService.socket) {
                webrtcService.socket.once('call:answer', () => {
                    console.log('✅ Hospital answered');
                    setCallStatus('connected');
                    startTimer();
                    toast.success('✅ Call connected!');
                });

                webrtcService.socket.once('call:rejected', () => {
                    console.log('❌ Call rejected by recipient');
                    toast.error(`${recipientName || 'Recipient'} rejected the call`);
                    onClose();
                });

                webrtcService.socket.once('call:end', () => {
                    console.log('📴 Hospital ended the call');
                    toast('Call ended by hospital', { icon: '📴' });
                    stopTimer();
                    onClose();
                });
            }

        } catch (error) {
            console.error('Error starting call:', error);

            let errorMessage = 'Failed to start call.';
            if (error.name === 'NotAllowedError') errorMessage = 'Microphone permission denied. Please allow access.';
            else if (error.name === 'NotFoundError') errorMessage = 'No microphone found on this device.';
            else if (error.name === 'NotReadableError') errorMessage = 'Microphone is busy or not readable.';
            else errorMessage = `Call Error: ${error.message} `;

            toast.error(errorMessage);
            onClose();
        } finally {
            startingCallRef.current = false;
        }
    };

    const answerCall = async () => {
        try {
            setCallStatus('connecting');

            // REAL WebRTC Answer
            console.log('🎤 Answering call...');
            const localStream = await webrtcService.answerCall();

            if (localAudioRef.current) {
                localAudioRef.current.srcObject = localStream;
                localAudioRef.current.muted = true; // Mute local audio
            }

            setCallStatus('connected');
            startTimer();
            toast.success('✅ Call connected!');
        } catch (error) {
            console.error('Error answering call:', error);
            toast.error('Failed to answer call. Please check microphone permissions.');
            onClose();
        }
    };



    const toggleMute = () => {
        const enabled = webrtcService.toggleAudio();
        setIsMuted(!enabled);
    };

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[2000] p-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl w-full max-w-md p-8 text-white">
                {/* Close button */}
                <button
                    onClick={handleEndCall}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition"
                >
                    <X size={24} />
                </button>

                {/* Demo Mode Badge */}
                <div className="absolute top-4 left-4 bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                    🎭 DEMO MODE
                </div>

                {/* Caller Info */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Phone size={48} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{recipientName}</h2>
                    <p className="text-white/80 text-lg">
                        {callStatus === 'incoming' && 'Incoming Call'}
                        {callStatus === 'connecting' && 'Connecting...'}
                        {callStatus === 'connected' && formatDuration(callDuration)}
                        {callStatus === 'busy' && 'Line Busy'}
                    </p>
                </div>

                {/* Busy Message Banner */}
                {callStatus === 'busy' && (
                    <div className="mb-6 bg-red-500/20 border border-red-400/50 rounded-xl p-4 text-center animate-pulse">
                        <PhoneIncoming size={32} className="mx-auto mb-2 text-red-200" />
                        <p className="text-white font-semibold text-lg">Hospital is on another call</p>
                        <p className="text-white/70 text-sm mt-1">{busyMessage}</p>
                        <p className="text-white/50 text-xs mt-2">This window will close automatically...</p>
                    </div>
                )}

                {/* Call Controls */}
                <div className="flex justify-center gap-6 mb-6">
                    {/* Mute Button */}
                    {callStatus === 'connected' && (
                        <button
                            onClick={toggleMute}
                            className={`p - 4 rounded - full transition ${isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                                } `}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                    )}

                    {/* End Call Button */}
                    <button
                        onClick={handleEndCall}
                        className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition"
                    >
                        <PhoneOff size={24} />
                    </button>
                </div>

                {/* Answer/Reject for incoming calls */}
                {callStatus === 'incoming' && (
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                // Send reject event back to caller (patient)
                                if (webrtcService.socket && recipientId) {
                                    webrtcService.socket.emit('call:rejected', {
                                        to: recipientId
                                    });
                                    console.log('📤 Sent rejection to:', recipientId);
                                }
                                toast.error('Call rejected');
                                onClose();
                            }}
                            className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition"
                        >
                            Reject
                        </button>
                        <button
                            onClick={answerCall}
                            className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-semibold transition"
                        >
                            Answer
                        </button>
                    </div>
                )}

                {/* Status Info */}
                {callStatus === 'connected' && (
                    <div className="mt-4 bg-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-white/80 animate-pulse">
                            🟢 Audio Connected. Tap Mute if needed.
                        </p>
                    </div>
                )}

                {/* Hidden audio elements */}
                <audio ref={localAudioRef} autoPlay playsInline muted />
                <audio ref={remoteAudioRef} autoPlay playsInline controls className="absolute bottom-0 left-0 w-full opacity-50 h-8" />

                {/* Debug element removed */}
            </div>
        </div>

    );
};

export default AudioCall;
