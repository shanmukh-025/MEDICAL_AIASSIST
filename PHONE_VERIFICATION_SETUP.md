# 🔐 Phone Number Verification with Firebase

## Overview
The Village Medicine Assistant now includes phone number verification using Firebase Authentication. This ensures that all phone numbers belong to the actual users, preventing fake registrations and improving security.

## 🎯 Features

### ✅ What's Implemented
- **OTP-based phone verification** during registration
- **Firebase Authentication** integration (free tier: 10,000 verifications/month)
- **Real-time OTP delivery** via SMS
- **60-second resend timer** with resend option
- **6-digit OTP input** with auto-focus and auto-verify
- **Verification status tracking** in database
- **Indian phone format** (+91 country code)
- **reCAPTCHA integration** for bot prevention

## 📋 Prerequisites

Before setting up phone verification, you need:
1. A Google/Firebase account (free)
2. A Firebase project
3. Access to Firebase Console

## 🔧 Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `village-medicine-assistant`
4. Enable Google Analytics (optional)
5. Click "Create Project"

### Step 2: Enable Phone Authentication

1. In Firebase Console, go to **Authentication** → **Get Started**
2. Click **Sign-in method** tab
3. Click **Phone** provider
4. Toggle **Enable** switch
5. Click **Save**

### Step 3: Register Your Web App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web icon** (</>)
4. Enter app nickname: `Village Medicine Web`
5. Click **Register app**
6. Copy the configuration object (you'll need this next)

### Step 4: Configure Environment Variables

1. Create a `.env` file in the project root:

```bash
# Frontend - Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

2. Replace values with your Firebase config from Step 3

**Example:**
```bash
VITE_FIREBASE_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
VITE_FIREBASE_AUTH_DOMAIN=village-medicine-abc123.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=village-medicine-abc123
VITE_FIREBASE_STORAGE_BUCKET=village-medicine-abc123.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Step 5: Add Authorized Domains

1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (already there)
   - Your production domain (e.g., `medicineapp.com`)
   - Any other domains where you'll host the app

### Step 6: Install Dependencies

```bash
npm install
```

This will install Firebase SDK (already added to package.json: `"firebase": "^11.1.0"`)

### Step 7: Test the Setup

1. Start the development server:
```bash
npm run dev
```

2. Go to registration page
3. Fill in the form with a real phone number
4. Click "Sign Up"
5. You should receive an OTP via SMS
6. Enter the OTP to complete registration

## 🔥 Firebase Console Configuration

### Enable App Check (Recommended for Production)

Prevents abuse and ensures only your app can access Firebase:

1. Go to **App Check** in Firebase Console
2. Click **Get Started**
3. Select **reCAPTCHA Enterprise** (free tier available)
4. Register your site
5. Enable enforcement for Phone Authentication

### SMS Quota Management

**Free Tier Limits:**
- **10,000 verifications/month** (free)
- **50 SMS per day per phone number**
- **10 SMS per hour per phone number**

**Monitor Usage:**
1. Go to **Authentication** → **Usage** tab
2. View SMS sent count
3. Set up billing alerts if needed

**Increase Quota:**
- Upgrade to Blaze (Pay-as-you-go) plan
- No commitment, only pay for what you use
- Rates: ~$0.01-0.05 per SMS (varies by country)

### Test Phone Numbers (Development)

For testing without SMS costs:

1. Go to **Authentication** → **Sign-in method** → **Phone**
2. Scroll to **Phone numbers for testing**
3. Add test numbers and codes:
   - Phone: `+91 9999999999`
   - Code: `123456`

Now you can test with this number without receiving actual SMS!

## 📱 How It Works

### User Registration Flow

```
1. User fills registration form → enters phone number
2. User clicks "Sign Up" button
3. Frontend validates phone (10 digits)
4. OTP modal opens
5. Firebase sends OTP via SMS to phone
6. User receives SMS with 6-digit code
7. User enters OTP in the modal
8. Firebase verifies the OTP
9. If valid:
   - Backend creates account with phoneVerified: true
   - User is logged in and redirected
10. If invalid:
   - Error message shown
   - User can retry or request new OTP
```

### Security Features

- ✅ **reCAPTCHA** prevents bot submissions
- ✅ **Rate limiting** prevents spam (Firebase enforced)
- ✅ **One-time codes** expire after use
- ✅ **60-second cooldown** between resends
- ✅ **Verification UID** stored to prevent reuse
- ✅ **Timestamp tracking** for audit trails

## 🔒 Security Best Practices

### 1. Protect Your Firebase Config

**DO:**
- ✅ Use environment variables
- ✅ Add `.env` to `.gitignore`
- ✅ Use different projects for dev/prod

**DON'T:**
- ❌ Commit Firebase keys to GitHub
- ❌ Share `.env` file publicly
- ❌ Use production keys in development

### 2. Enable App Check

Prevents unauthorized access to your Firebase project:
```bash
# In production, enable App Check enforcement
# This ensures only your verified app can use Firebase
```

### 3. Set Security Rules

In Firebase Console → **Authentication** → **Settings**:
- Enable **Email enumeration protection**
- Set **Password policy** (if using email auth)
- Configure **Authorized domains** properly

## 🐛 Troubleshooting

### Issue: "Firebase config not found"

**Solution:**
```bash
# Ensure .env file exists with correct variables
# Restart dev server after adding .env
npm run dev
```

### Issue: "SMS not received"

**Possible causes:**
1. Phone number format wrong (must be +91XXXXXXXXXX)
2. Firebase quota exceeded
3. Phone carrier blocking automated SMS
4. Firebase project not fully set up

**Solutions:**
1. Check phone format in console logs
2. Check Firebase Console → Authentication → Usage
3. Try different phone number
4. Use test phone numbers during development

### Issue: "reCAPTCHA failed"

**Solutions:**
1. Check if domain is authorized in Firebase Console
2. Clear browser cache and cookies
3. Disable browser extensions (adblockers)
4. Try incognito mode

### Issue: "auth/quota-exceeded"

**Solutions:**
1. Wait 24 hours (daily quota resets)
2. Upgrade to Blaze plan for higher quota
3. Use test phone numbers for development

### Issue: "auth/too-many-requests"

**Solution:**
```
This phone has received too many OTPs.
Wait 1 hour or use a different phone number.
```

## 📊 Monitoring & Analytics

### Track Verification Success Rate

Add these metrics to your analytics:

```javascript
// In your codebase
analytics.logEvent('phone_verification_started');
analytics.logEvent('phone_verification_succeeded');
analytics.logEvent('phone_verification_failed', { reason });
```

### Monitor in Firebase Console

1. **Authentication → Usage**
   - Total verifications
   - Success rate
   - Failed attempts

2. **Analytics → Events**
   - Custom events tracking
   - User conversion funnel

## 💰 Cost Estimation

### Free Tier (Perfect for Development & Small Apps)
- **10,000 phone verifications/month**: FREE
- **Test phone numbers**: Unlimited FREE

### Blaze Plan (Production)
Pricing varies by country. India rates:
- **SMS**: ~₹0.50-2.00 per message
- **Monthly cost for 1000 users**: ~₹500-2000

**Cost optimization tips:**
1. Use test numbers during development
2. Implement retry limits
3. Cache verification results
4. Use email fallback for failed SMS

## 🚀 Production Deployment

### Pre-launch Checklist

- [ ] Firebase project created
- [ ] Phone authentication enabled
- [ ] Environment variables configured
- [ ] Authorized domains added
- [ ] App Check enabled
- [ ] SMS quota sufficient
- [ ] Test numbers added for QA
- [ ] Error handling tested
- [ ] Rate limiting verified
- [ ] Analytics tracking enabled

### Deployment Steps

1. Build production app:
```bash
npm run build
```

2. Add production domain to Firebase:
   - Go to **Authentication → Settings → Authorized domains**
   - Add your domain (e.g., `yourdomain.com`)

3. Update environment variables on hosting platform:
   - Vercel/Netlify: Add VITE_FIREBASE_* variables
   - Use production Firebase config (not dev config!)

4. Test on production domain:
   - Register with real phone
   - Verify OTP delivery works
   - Check verification status in database

## 🔮 Future Enhancements

Planned features:
- [ ] WhatsApp OTP as alternative
- [ ] Voice call OTP for accessibility
- [ ] Multi-language SMS templates
- [ ] Re-verification for sensitive actions
- [ ] Phone number change with old-number verification
- [ ] SMS delivery status tracking
- [ ] Custom SMS templates
- [ ] International phone support

## 📞 Support

### Firebase Issues
- [Firebase Documentation](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firebase Status](https://status.firebase.google.com/)
- [Firebase Support](https://firebase.google.com/support)

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `auth/invalid-phone-number` | Invalid format | Use +91XXXXXXXXXX |
| `auth/invalid-verification-code` | Wrong OTP | Re-enter correct code |
| `auth/code-expired` | OTP expired | Request new OTP |
| `auth/too-many-requests` | Rate limit hit | Wait 1 hour |
| `auth/quota-exceeded` | Daily limit reached | Upgrade plan or wait 24h |

## 📝 Important Notes

### For Developers

1. **Never commit `.env` file** - Always use `.env.example` as template
2. **Use test numbers** during development to save SMS quota
3. **Monitor Firebase usage** to avoid surprise costs
4. **Implement fallback** for SMS delivery failures
5. **Log verification attempts** for debugging

### For Users

1. **SMS may take 1-2 minutes** during peak hours
2. **Check spam folder** if using email notifications
3. **Ensure phone number is correct** before submitting
4. **Keep phone signal strong** for SMS delivery
5. **Contact support** if OTP not received after 5 minutes

---

**Version:** 1.0.0  
**Last Updated:** February 10, 2026  
**Status:** ✅ Production Ready  
**Free Tier:** 10,000 verifications/month
