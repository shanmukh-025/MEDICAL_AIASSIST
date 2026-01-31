# 🏥 Hospital Appointment Approval Workflow - MedAssist AI

**Complete MERN Stack Implementation**  
A production-ready appointment approval system for rural healthcare management.

---

## 📋 Table of Contents
- [Features Implemented](#features-implemented)
- [Tech Stack](#tech-stack)
- [Architecture & Data Flow](#architecture--data-flow)
- [File Structure](#file-structure)
- [API Documentation](#api-documentation)
- [Setup & Installation](#setup--installation)
- [Testing Guide](#testing-guide)
- [Security Features](#security-features)

---

## ✅ Features Implemented

### Backend
- ✅ MongoDB models (Appointment, Notification, User with roles)
- ✅ JWT authentication with role-based access control
- ✅ Complete REST API for appointment workflow
- ✅ Real-time notifications via Socket.io
- ✅ Database notification storage
- ✅ Role-based middleware (`PATIENT` | `HOSPITAL` | `ADMIN`)

### Frontend
- ✅ Patient booking form with validation
- ✅ Hospital approval dashboard
- ✅ Real-time notification bell UI
- ✅ Color-coded status badges
- ✅ Toast notifications
- ✅ Responsive Tailwind CSS design
- ✅ Socket.io client integration

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io (real-time)
- JWT (auth)
- bcryptjs (password hashing)

**Frontend:**
- React 18 (Vite)
- Axios (API calls)
- Socket.io-client
- React Router
- Tailwind CSS
- Lucide React (icons)
- React Hot Toast

---

## 🏗️ Architecture & Data Flow

### 1. Appointment Creation Flow
```
Patient (Web)
   └─> POST /api/appointments
         └─> Backend validates role = PATIENT
               └─> Creates Appointment (status: PENDING)
                     └─> Creates Notification for Hospital
                           └─> Socket.io emits to Hospital user
                                 └─> Hospital receives real-time alert
```

### 2. Approval Flow
```
Hospital (Web)
   └─> PUT /api/appointments/:id/approve
         └─> Backend validates role = HOSPITAL
               └─> Updates Appointment (status: CONFIRMED)
                     └─> Creates Notification for Patient
                           └─> Socket.io emits to Patient
                                 └─> Patient receives confirmation
```

### 3. Rejection Flow
```
Hospital (Web)
   └─> PUT /api/appointments/:id/reject
         └─> Backend validates role = HOSPITAL
               └─> Updates Appointment (status: REJECTED, rejectionReason)
                     └─> Creates Notification for Patient
                           └─> Socket.io emits to Patient
                                 └─> Patient receives rejection notice
```

---

## 📁 File Structure

```
village-medicine-assistant/
├── server/
│   ├── models/
│   │   ├── User.js              # User schema with roles
│   │   ├── Appointment.js       # Appointment schema
│   │   └── Notification.js      # Notification schema
│   ├── routes/
│   │   ├── appointments.js      # Appointment CRUD + approve/reject
│   │   └── notifications.js     # Notification endpoints
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   └── roles.js            # Role-based access control
│   ├── seed.js                 # Test user seeder
│   └── server.js               # Express + Socket.io setup
│
└── src/
    ├── context/
    │   └── SocketContext.jsx   # Socket.io client provider
    ├── components/
    │   └── NotificationBell.jsx # Real-time notification UI
    ├── pages/
    │   ├── PatientAppointments.jsx  # Patient booking & list
    │   └── HospitalDashboard.jsx    # Hospital approval dashboard
    └── App.jsx                 # Router integration
```

---

## 📡 API Documentation

### **Authentication**
All endpoints require JWT token in header: `x-auth-token`

### **Appointment Endpoints**

#### 1. Create Appointment (Patient Only)
```http
POST /api/appointments
Headers: { "x-auth-token": "<JWT_TOKEN>" }
Body: {
  "hospitalId": "69595adac4e8cd156ef3fe01",  // Hospital user ID
  "doctor": "Dr. Smith",
  "appointmentDate": "2026-01-10",
  "appointmentTime": "10:30",
  "reason": "Routine checkup"
}
Response: { ...appointment object, status: "PENDING" }
```

#### 2. Get Patient Appointments
```http
GET /api/appointments/patient
Headers: { "x-auth-token": "<PATIENT_JWT>" }
Response: [ ...appointments ]
```

#### 3. Get Hospital Pending Appointments
```http
GET /api/appointments/hospital
Headers: { "x-auth-token": "<HOSPITAL_JWT>" }
Response: [ ...pending appointments with patient details ]
```

#### 4. Approve Appointment (Hospital Only)
```http
PUT /api/appointments/:id/approve
Headers: { "x-auth-token": "<HOSPITAL_JWT>" }
Response: { success: true, appt: {...} }
```

#### 5. Reject Appointment (Hospital Only)
```http
PUT /api/appointments/:id/reject
Headers: { "x-auth-token": "<HOSPITAL_JWT>" }
Body: { "reason": "Doctor unavailable" }
Response: { success: true, appt: {...} }
```

### **Notification Endpoints**

#### 1. Get User Notifications
```http
GET /api/notifications
Headers: { "x-auth-token": "<JWT>" }
Response: [ ...notifications ]
```

#### 2. Mark Notification as Read
```http
PUT /api/notifications/:id/read
Headers: { "x-auth-token": "<JWT>" }
Response: { ...updated notification }
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 16+
- MongoDB running locally or MongoDB Atlas

### Backend Setup
```bash
cd server
npm install
# Create .env file
echo "MONGO_URI=mongodb://localhost:27017/medassist" > .env
echo "JWT_SECRET=your_secret_key_here" >> .env
echo "PORT=5000" >> .env

# Seed test users
node seed.js

# Start server
npm start
```

### Frontend Setup
```bash
cd ..
npm install
# Create .env file
echo "VITE_API_BASE=http://localhost:5000" > .env

# Start frontend
npm run dev
```

### Access the App
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 🧪 Testing Guide

### Test Credentials (from seed.js)
```
PATIENT:
  Email: patient@test.com
  Password: password123
  ID: 69595ad9c4e8cd156ef3fdfe

HOSPITAL:
  Email: hospital@test.com
  Password: password123
  ID: 69595adac4e8cd156ef3fe01
```

### E2E Test Scenario

#### Step 1: Patient Books Appointment
1. Login as patient (`patient@test.com`)
2. Navigate to `/patient-appointments`
3. Fill form:
   - Hospital ID: `69595adac4e8cd156ef3fe01`
   - Doctor: "Dr. Test"
   - Date: tomorrow
   - Time: 10:00
   - Reason: "Fever"
4. Click "Request Appointment"
5. ✅ Toast: "Appointment requested"
6. ✅ Appointment appears with status **PENDING**

#### Step 2: Hospital Receives Notification
1. Open new browser window (or incognito)
2. Login as hospital (`hospital@test.com`)
3. ✅ Notification bell shows badge
4. ✅ Toast appears: "New appointment request from Test Patient..."
5. Navigate to `/hospital-dashboard`
6. ✅ Pending appointment visible

#### Step 3: Hospital Approves
1. Click **Approve** button
2. ✅ Toast: "Approved"
3. ✅ Appointment removed from pending list

#### Step 4: Patient Receives Confirmation
1. Switch back to patient window
2. ✅ Notification bell badge increases
3. ✅ Toast: "Your appointment on 2026-01-10 at 10:00 has been CONFIRMED."
4. Refresh `/patient-appointments`
5. ✅ Status changed to **CONFIRMED** (green badge)

#### Optional: Test Rejection
1. Book another appointment (as patient)
2. As hospital, click **Reject**
3. Enter reason: "Doctor on leave"
4. ✅ Patient sees **REJECTED** status with reason

---

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens expire after 1 hour
- Passwords hashed with bcryptjs (10 salt rounds)
- Role-based access control:
  - `PATIENT` can only book and view own appointments
  - `HOSPITAL` can only approve/reject appointments assigned to them
  - Unauthorized access returns `403 Forbidden`

### Data Validation
- Required fields enforced at schema level
- Date/time validation on frontend
- Input sanitization

### Best Practices
- CORS configured for allowed origins
- Environment variables for secrets
- No sensitive data in client responses

---

## 🎨 UI/UX Features

### Color-Coded Status
- 🟡 **PENDING**: Yellow badge
- 🟢 **CONFIRMED**: Green badge
- 🔴 **REJECTED**: Red badge

### Real-Time Updates
- Socket.io provides instant notifications
- No page refresh needed
- Notification bell with unread count

### Responsive Design
- Tailwind CSS utility classes
- Mobile-friendly layout
- Accessible UI components

---

## 📊 Database Schema

### User Model
```javascript
{
  name: String (required),
  email: String (unique, required),
  password: String (hashed, required),
  role: Enum ['PATIENT', 'HOSPITAL', 'ADMIN'] (default: PATIENT),
  contactEmail: String (optional),
  date: Date (default: now)
}
```

### Appointment Model
```javascript
{
  patientId: ObjectId (ref: User, required),
  hospitalId: ObjectId (ref: User),
  doctor: String,
  appointmentDate: String (required),
  appointmentTime: String (required),
  reason: String,
  status: Enum ['PENDING', 'CONFIRMED', 'REJECTED'] (default: PENDING),
  rejectionReason: String,
  createdAt: Date (default: now)
}
```

### Notification Model
```javascript
{
  userId: ObjectId (ref: User, required),
  message: String (required),
  type: String (default: 'APPOINTMENT'),
  isRead: Boolean (default: false),
  createdAt: Date (default: now)
}
```

---

## 🔧 Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/medassist
JWT_SECRET=your_super_secret_key
PORT=5000
```

### Frontend (.env)
```env
VITE_API_BASE=http://localhost:5000
```

---

## 🚨 Troubleshooting

### Port 5000 Already in Use
```bash
# Windows
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Socket.io Not Connecting
- Check CORS settings in `server/server.js`
- Verify `VITE_API_BASE` matches backend URL
- Check browser console for connection errors

### Notifications Not Appearing
- Ensure user is logged in (token exists)
- Check Socket.io connection in Network tab
- Verify user joined correct room (`user_<userId>`)

---

## 📝 Notes

- **Production Deployment**: Update CORS origins in `server.js`
- **Email Notifications**: Can integrate nodemailer (already scaffolded)
- **SMS Notifications**: Can integrate Twilio
- **Admin Panel**: Extend roles.js for admin audit logs

---

## 👨‍💻 Developer
Built with ❤️ for **MedAssist AI – Village Medicine Assistant**

**Tech Lead:** Senior Full-Stack Developer & System Architect
