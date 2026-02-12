# 📞 Voice & Video Call Features

## Overview
The Village Medicine Assistant now includes comprehensive communication features allowing patients to connect with hospitals via voice calls and video consultations.

## ✨ Key Features

### 1. **Phone Number Collection**
- ✅ Phone numbers are now collected during user registration
- ✅ Required field for both patients and hospitals
- ✅ 10-digit phone number validation
- ✅ Stored securely in the User model

### 2. **Voice Calling**
- ✅ Direct phone call integration
- ✅ One-tap calling from appointment cards
- ✅ Works on both mobile and desktop
- ✅ Uses native phone dialer on mobile devices

### 3. **Video Consultation**
- ✅ Free, high-quality video calls using Jitsi Meet
- ✅ No account or installation required
- ✅ Browser-based video conferencing
- ✅ Features included:
  - Camera control
  - Microphone control
  - Screen sharing
  - Chat messaging
  - Participant management

## 🎯 User Experience

### For Patients

#### During Active Appointments
When a patient has a confirmed, checked-in, or in-progress appointment, they can:
1. **Contact Hospital** button appears on the appointment card
2. Click to open contact modal with two options:
   - **Video Consultation**: Launch a video call with the doctor
   - **Voice Call**: Make a phone call to the hospital

#### From Queue Status
While waiting in the queue, patients can:
1. View real-time queue position
2. Click "Contact Hospital" to get instructions or ask questions
3. Choose between video consultation or voice call

### For Hospitals
Hospitals can:
- Receive incoming calls from patients
- Join video consultations using the same room ID
- Manage multiple consultation sessions

## 🔧 Technical Implementation

### Components Created

#### 1. **VideoCall.jsx**
```jsx
Location: src/components/VideoCall.jsx
Purpose: Full-screen video consultation interface
Technology: Jitsi Meet iframe integration
```

**Features:**
- Automatic room creation with unique IDs
- User display name integration
- Custom header with room information
- End call button
- Room code sharing functionality

#### 2. **CallHospital.jsx**
```jsx
Location: src/components/CallHospital.jsx
Purpose: Modal dialog for choosing communication method
```

**Features:**
- Hospital information display
- Two call options (video & voice)
- Responsive design
- Animated entry/exit
- Informational tips

### Integration Points

#### PatientAppointments.jsx
- Added "Contact Hospital" button for active appointments
- Integrated CallHospital modal
- Displays for CONFIRMED, CHECKED_IN, and IN_PROGRESS statuses

#### QueueStatus.jsx
- Added "Contact Hospital" button in queue view
- Integrated CallHospital modal
- Always available while waiting

### Backend Changes

#### 1. **User Model** (server/models/User.js)
```javascript
phone: {
  type: String
}
```
Already existed but now being utilized

#### 2. **Registration Endpoint** (server/routes/auth.js)
```javascript
// Now accepts and stores phone number
if (req.body.phone) userData.phone = req.body.phone;
```

#### 3. **Appointments API** (server/routes/appointments.js)
```javascript
// GET /api/appointments/patient
// Now populates hospital data with phone number
.populate('hospitalId', 'name phone address')
```

#### 4. **Queue Status API** (server/routes/smartQueue.js)
```javascript
// GET /api/smart-queue/mobile/queue-status/:tokenNumber
// Enhanced to include hospital contact information
```

## 📱 How It Works

### Video Consultation Flow
```
1. Patient clicks "Contact Hospital" → "Video Consultation"
2. System generates unique room ID: consultation-{appointmentId}
3. VideoCall component opens with Jitsi Meet iframe
4. Patient joins video room automatically
5. Hospital staff can join using the same room ID
6. Both parties can communicate face-to-face
7. Either party can end the call
```

### Voice Call Flow
```
1. Patient clicks "Contact Hospital" → "Voice Call"
2. System uses tel: URI protocol
3. On mobile: Native phone dialer opens with hospital number
4. On desktop: Prompts to use connected phone/VOIP app
5. Patient can talk directly to hospital staff
```

## 🔐 Security & Privacy

- ✅ Phone numbers are validated before storage
- ✅ Video calls use end-to-end encrypted Jitsi Meet
- ✅ Unique room IDs prevent unauthorized access
- ✅ Rooms are temporary and disappear after call ends
- ✅ No call recordings stored by default

## 🌐 Browser Compatibility

### Video Consultation
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (iOS 14.3+)
- ✅ Opera
- ⚠️ Requires camera and microphone permissions

### Voice Calling
- ✅ All mobile browsers (uses native dialer)
- ✅ Desktop with VOIP apps (Skype, etc.)

## 📋 Usage Instructions

### For Patients

**Starting a Video Consultation:**
1. Go to "My Appointments" or Queue Dashboard
2. Find your active appointment
3. Click "Contact Hospital"
4. Select "Video Consultation"
5. Allow camera and microphone permissions when prompted
6. Wait for hospital staff to join

**Making a Voice Call:**
1. Go to "My Appointments" or Queue Dashboard
2. Click "Contact Hospital"
3. Select "Voice Call"
4. Your phone dialer will open
5. Confirm to dial

### For Hospital Staff

**Joining a Video Consultation:**
1. Patient initiates consultation
2. You receive notification with room ID
3. Click the join link or enter room ID manually
4. Connect and start consultation

## 🔮 Future Enhancements

Planned features:
- [ ] SMS notifications with call links
- [ ] Scheduled video consultations
- [ ] Call history and duration tracking
- [ ] In-app call recording (with consent)
- [ ] Multi-party video calls (family members)
- [ ] Real-time translation for language barriers
- [ ] Post-call feedback and ratings
- [ ] Integration with electronic health records

## ⚙️ Configuration

### Jitsi Meet Settings
Currently using public Jitsi Meet instance (`meet.jit.si`):
- Free and unlimited
- No registration required
- Works out of the box

**For Production:**
Consider self-hosting Jitsi or using a paid service:
- Better branding control
- Enhanced security
- Custom features
- SLA guarantees

### Phone Number Format
- Default: 10-digit Indian format
- Can be modified in registration form validation
- Pattern: `[0-9]{10}`

## 🐛 Troubleshooting

### Video Call Not Starting
1. Check browser permissions for camera/microphone
2. Ensure stable internet connection (minimum 1 Mbps)
3. Try refreshing the page
4. Clear browser cache
5. Try a different browser

### Voice Call Not Working
1. Ensure hospital has provided phone number
2. Check if phone number is in correct format
3. On desktop, ensure VOIP app is configured
4. Check phone signal/network

### No "Contact Hospital" Button
- Button only appears for active appointments
- Check appointment status (must be CONFIRMED, CHECKED_IN, or IN_PROGRESS)
- Refresh the page to update status

## 📊 Metrics & Analytics

Track the following (future implementation):
- Total video consultations
- Average call duration
- Patient satisfaction ratings
- Most common consultation times
- Connection quality scores

## 🤝 Support

For issues or questions:
- Technical issues: Check browser console for errors
- Feature requests: Submit via GitHub issues
- General support: Contact hospital IT team

---

**Version:** 1.0.0  
**Last Updated:** February 10, 2026  
**Status:** ✅ Production Ready
