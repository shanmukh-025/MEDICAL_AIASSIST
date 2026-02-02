# Google Sign-In Setup Guide

## ✅ Features Implemented:

1. **Google OAuth Sign-In/Sign-Up** - One-click authentication with Google
2. **Remember Me Checkbox** - Save login info for automatic login
3. **Auto-Login** - Automatically logs in user when app opens (if enabled)
4. **Token Verification** - Validates saved tokens on app load

---

## 🔧 Setup Instructions:

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen (add your app name)
6. Set Application type: **Web application**
7. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - Your production URL
8. Add authorized redirect URIs:
   - `http://localhost:5173`
   - Your production URL
9. Copy the **Client ID**

### 2. Update Environment Variables

**Frontend (.env):**
```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
VITE_API_BASE=http://localhost:5000
VITE_GEMINI_API_KEY=your-gemini-key
```

**Backend (server/.env):**
```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/village-medicine
```

### 3. Install Dependencies (Already Done)

Frontend:
```bash
npm install @react-oauth/google
```

Backend:
```bash
cd server
npm install google-auth-library
```

---

## 🎯 How It Works:

### Google Sign-In Flow:

1. User clicks "Sign in with Google" button
2. Google OAuth popup appears
3. User selects Google account
4. Backend verifies Google token
5. Creates new user or logs in existing user
6. Returns JWT token
7. User is logged in!

### Auto-Login Flow:

1. User checks "Remember me & auto-login"
2. Saves `autoLogin: true` in localStorage
3. Next time app loads:
   - Checks for `autoLogin` flag
   - Verifies saved token with backend
   - If valid, auto-logs in user
   - If invalid, clears saved data

### Remember Me Features:

- ✅ Saves login state across browser sessions
- ✅ Validates token on app load
- ✅ Auto-login on app restart
- ✅ Works with both Google and email/password login
- ✅ Secure token verification

---

## 🧪 Testing:

### Test Google Sign-In:

1. Start backend: `cd server && npm start`
2. Start frontend: `npm run dev`
3. Go to http://localhost:5173/login
4. Click "Sign in with Google"
5. Select Google account
6. Should redirect to home page

### Test Remember Me:

1. Login with email/password
2. Check "Remember me & auto-login"
3. Close browser completely
4. Reopen and go to app
5. Should auto-login without credentials

### Test Auto-Logout on Invalid Token:

1. Login and enable auto-login
2. Manually edit localStorage token to invalid value
3. Refresh page
4. Should clear auto-login and redirect to login

---

## 📁 Modified Files:

**Backend:**
- `server/routes/auth.js` - Added Google OAuth route + verify endpoint
- `server/models/User.js` - Added googleId and photoUrl fields

**Frontend:**
- `src/main.jsx` - Added GoogleOAuthProvider wrapper
- `src/pages/Login.jsx` - Added Google button + Remember Me checkbox
- `src/pages/Register.jsx` - Added Google sign-up button
- `src/context/AuthContext.jsx` - Added auto-login logic

---

## 🔒 Security Notes:

- Tokens are verified on every auto-login attempt
- Invalid tokens automatically clear saved data
- Google tokens are verified server-side
- JWT secrets should be strong and unique
- HTTPS recommended for production

---

## 🚀 Production Deployment:

1. Add production URLs to Google OAuth settings
2. Update .env files with production values
3. Use HTTPS for secure authentication
4. Set strong JWT_SECRET
5. Configure CORS properly
