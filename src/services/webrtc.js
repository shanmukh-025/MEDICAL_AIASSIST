// WebRTC Service for Audio and Video Calling
// Handles peer-to-peer connections for patient-hospital communication

class WebRTCService {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.socket = null;
        this.iceCandidateQueue = []; // Queue for candidates arriving before PeerConnection is ready

        // ICE servers for NAT traversal (free STUN servers)
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
    }

    // Initialize WebRTC with socket connection
    initialize(socket) {
        this.socket = socket;
        this.setupSocketListeners();
    }

    // Setup socket event listeners for signaling
    setupSocketListeners() {
        if (!this.socket) return;

        // Handle incoming call offer
        this.socket.on('call:offer', async ({ offer, from, callType }) => {
            console.log('Received call offer from:', from);
            if (this.onIncomingCall) {
                this.onIncomingCall({ from, callType });
            }
            // Store offer for when user accepts
            this.pendingOffer = { offer, from, callType };
        });

        // Handle call answer
        this.socket.on('call:answer', async ({ answer }) => {
            console.log('Received call answer');
            if (this.peerConnection) {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        // Handle ICE candidates
        this.socket.on('call:ice-candidate', async ({ candidate }) => {
            console.log('Received ICE candidate');
            if (this.peerConnection) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            } else {
                console.log('⚠️ PeerConnection not ready, queuing ICE candidate');
                this.iceCandidateQueue.push(candidate);
            }
        });

        // Handle call end
        this.socket.on('call:end', () => {
            console.log('Call ended by remote peer');
            this.endCall();
            if (this.onCallEnded) {
                this.onCallEnded();
            }
        });
    }

    // Start a call (audio or video)
    async startCall(recipientId, callType = 'audio') {
        this.iceCandidateQueue = []; // Reset queue
        try {
            // Get user media based on call type
            const constraints = callType === 'video'
                ? { video: true, audio: true }
                : { video: false, audio: true };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Create peer connection
            this.peerConnection = new RTCPeerConnection(this.iceServers);

            // Add local stream tracks to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && this.socket) {
                    this.socket.emit('call:ice-candidate', {
                        to: recipientId,
                        candidate: event.candidate
                    });
                }
            };

            // Log ICE connection state changes
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('🔄 ICE Connection State Change:', this.peerConnection.iceConnectionState);
            };

            this.peerConnection.onconnectionstatechange = () => {
                console.log('🔄 Connection State Change:', this.peerConnection.connectionState);
            };

            // Verify local tracks
            const audioTracks = this.localStream.getAudioTracks();
            console.log(`🎤 Local Audio Tracks: ${audioTracks.length}`, audioTracks[0]?.label);
            if (audioTracks.length > 0) {
                console.log('🎤 Audio Track Enabled:', audioTracks[0].enabled);
            } else {
                console.warn('⚠️ NO LOCAL AUDIO TRACKS FOUND!');
            }

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('🎧 Received remote track:', event.track.kind);
                if (event.streams && event.streams[0]) {
                    console.log('🌊 Remote stream found with id:', event.streams[0].id);
                    this.remoteStream = event.streams[0];
                    if (this.onRemoteStream) {
                        this.onRemoteStream(this.remoteStream);
                    }
                } else {
                    console.warn('⚠️ Remote track received but no stream found! Creating new stream...');
                    const inboundStream = new MediaStream();
                    inboundStream.addTrack(event.track);
                    this.remoteStream = inboundStream;
                    if (this.onRemoteStream) {
                        this.onRemoteStream(this.remoteStream);
                    }
                }
            };

            // Create and send offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: callType === 'video'
            });
            await this.peerConnection.setLocalDescription(offer);

            this.socket.emit('call:offer', {
                to: recipientId,
                offer: offer,
                callType: callType
            });

            return this.localStream;
        } catch (error) {
            console.error('Error starting call:', error);
            throw error;
        }
    }

    // Answer an incoming call
    async answerCall() {
        try {
            if (!this.pendingOffer) {
                throw new Error('No pending call to answer');
            }

            const { offer, from, callType } = this.pendingOffer;

            // Get user media
            const constraints = callType === 'video'
                ? { video: true, audio: true }
                : { video: false, audio: true };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Create peer connection
            this.peerConnection = new RTCPeerConnection(this.iceServers);

            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Process queued ICE candidates
            while (this.iceCandidateQueue.length > 0) {
                const candidate = this.iceCandidateQueue.shift();
                try {
                    console.log('Processing queued ICE candidate');
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('Error adding queued ice candidate', e);
                }
            }

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && this.socket) {
                    this.socket.emit('call:ice-candidate', {
                        to: from,
                        candidate: event.candidate
                    });
                }
            };

            // Log ICE connection state changes
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('🔄 Answerer ICE Connection State Change:', this.peerConnection.iceConnectionState);
            };

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('🎧 Answerer received remote track:', event.track.kind);
                if (event.streams && event.streams[0]) {
                    console.log('🌊 Remote stream found with id:', event.streams[0].id);
                    this.remoteStream = event.streams[0];
                    if (this.onRemoteStream) {
                        this.onRemoteStream(this.remoteStream);
                    }
                } else {
                    console.warn('⚠️ Remote track received but no stream found! Creating new stream...');
                    const inboundStream = new MediaStream();
                    inboundStream.addTrack(event.track);
                    this.remoteStream = inboundStream;
                    if (this.onRemoteStream) {
                        this.onRemoteStream(this.remoteStream);
                    }
                }
            };

            // Set remote description and create answer
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: callType === 'video'
            });
            await this.peerConnection.setLocalDescription(answer);

            // Send answer
            this.socket.emit('call:answer', {
                to: from,
                answer: answer
            });

            this.pendingOffer = null;
            return this.localStream;
        } catch (error) {
            console.error('Error answering call:', error);
            throw error;
        }
    }

    // Reject an incoming call
    rejectCall() {
        if (this.pendingOffer && this.socket) {
            this.socket.emit('call:reject', {
                to: this.pendingOffer.from
            });
            this.pendingOffer = null;
        }
    }

    // End the current call
    endCall() {
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.remoteStream = null;
    }

    // Toggle audio mute
    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    }

    // Toggle video
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return false;
    }

    // Set callbacks
    setOnIncomingCall(callback) {
        this.onIncomingCall = callback;
    }

    setOnRemoteStream(callback) {
        this.onRemoteStream = callback;
    }

    setOnCallEnded(callback) {
        this.onCallEnded = callback;
    }
}

// Export singleton instance
export const webrtcService = new WebRTCService();
export default webrtcService;
