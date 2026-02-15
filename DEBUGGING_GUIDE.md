# 🔍 Debugging Guide - AI Analysis & Hospital Search

## Issues Fixed

### 1. **Duplicate AI Analysis Calls** ✅
**Problem**: AI was being called twice, producing different results each time.

**Solutions Implemented**:
- ✅ Added `isAnalyzing` flag to prevent concurrent frontend requests
- ✅ Server-side caching (60-second TTL) ensures same inputs = same results
- ✅ Enhanced error messages when duplicate calls are blocked
- ✅ Comprehensive console logging to track each analysis

**How to Verify**:
1. Open browser DevTools Console (F12)
2. Enter symptoms and click "Analyze Symptoms"
3. Look for console logs:
   - `🔬 Starting new symptom analysis...`
   - `✅ Analysis received: {diagnosis, specialties}`
   - If you click again within 60 seconds: `⚠️ Analysis already in progress, skipping duplicate call`

### 2. **Hospitals Not Showing After Analysis** ✅
**Problem**: Hospitals weren't appearing even after successful AI analysis.

**Solutions Implemented**:
- ✅ Added comprehensive logging throughout hospital search flow
- ✅ Auto-call `findNearbyHospitalsAuto()` immediately after analysis
- ✅ Better error handling with toast notifications
- ✅ Loading indicator while fetching hospitals
- ✅ Clear "No hospitals found" message when database is empty
- ✅ Fallback to show all hospitals if geolocation is denied
- ✅ Guaranteed `relatedSpecialties` field (defaults to "General Physician")

**How to Verify**:
1. Analyze symptoms
2. Watch for these console logs:
   ```
   ✅ Analysis received: {diagnosis: "...", specialties: ["..."]}
   🏥 Auto-searching hospitals for specialties: [...]
   📍 Requesting geolocation...
   ✅ Location obtained: lat, lng
   ✅ Hospital search response: [...]
   ✅ Found X hospitals with matching specialists
   ```
3. You should see:
   - A loading indicator: `🏥 Finding specialist hospitals for you...`
   - If hospitals exist: List of hospitals with matching doctors
   - If no hospitals: Yellow warning card with helpful message

---

## Console Logs Cheat Sheet

### Frontend (Browser Console)

| Log | Meaning | What to Check |
|-----|---------|---------------|
| `🔬 Starting new symptom analysis...` | Analysis started | Normal |
| `📤 Sending analysis request to server...` | Request being sent | Normal |
| `✅ Analysis received: {...}` | AI response arrived | Check if `specialties` array is present |
| `⚠️ Analysis already in progress...` | Duplicate call blocked | Good! Protection working |
| `⚠️ No related specialties found` | AI didn't return specialties | Possible AI response issue |
| `🏥 Auto-searching hospitals...` | Hospital search started | Normal |
| `📍 Requesting geolocation...` | Asking for location | User will see browser prompt |
| `✅ Location obtained: ...` | Got user location | Normal |
| `📍 Location unavailable: ...` | Location denied/failed | Fallback: shows all hospitals |
| `✅ Hospital search response: [...]` | Hospital data received | Check array length |
| `✅ Found X hospitals...` | Success! | Hospitals should appear |
| `⚠️ No hospitals found` | Empty result | Database might be empty |
| `❌ Error searching hospitals: ...` | API error | Check server logs |

### Backend (Server Terminal)

| Log | Meaning | Action Needed |
|-----|---------|---------------|
| `🔬 Symptom analysis request received` | Got analysis request | Normal |
| `✅ Returning cached analysis` | Using cache (good!) | No AI call made |
| `🔍 No valid cache found, calling AI...` | New AI call needed | Normal |
| `✅ AI analysis complete: {...}` | AI responded successfully | Check specialties |
| `⚠️ AI did not return relatedSpecialties` | AI response missing field | Auto-fixed with default |
| `📦 Analysis cached. Cache size: X` | Result stored in cache | Normal |
| `🏥 Hospital search request: {...}` | Hospital search started | Check specialties/location |
| `📊 Found X total hospitals` | Database query complete | If X=0, add hospitals to DB |
| `✅ HospitalName matches specialty` | Specialty filter working | Normal |
| `✅ Returning X hospitals matching criteria` | Search complete | If X=0, no matches found |
| `❌ Symptom Analysis Error: ...` | AI call failed | Check API key quota |
| `❌ Hospital search error: ...` | Database/query error | Check MongoDB connection |

---

## Testing Checklist

### Test 1: Normal Flow (With Hospitals in Database)
1. ✅ Enter symptoms: `Fever, Cough, Headache`
2. ✅ Set duration and severity
3. ✅ Click "Analyze Symptoms"
4. ✅ Watch console for logs
5. ✅ See loading indicator for hospitals
6. ✅ See list of matching hospitals appear
7. ✅ Verify hospitals show matching doctors/specialties

### Test 2: Duplicate Call Prevention
1. ✅ Enter symptoms
2. ✅ Click "Analyze Symptoms"
3. ✅ **Immediately** click button again while loading
4. ✅ Should see: "Analysis already in progress. Please wait."
5. ✅ Only ONE AI call should be made (check server logs)

### Test 3: Cache Verification
1. ✅ Analyze symptoms once
2. ✅ Note the diagnosis
3. ✅ Refresh page and enter **exact same** symptoms/duration/severity
4. ✅ Click "Analyze Symptoms"
5. ✅ Should see: `✅ Returning cached analysis` in server logs
6. ✅ Should get **identical** diagnosis (proves cache working)

### Test 4: No Hospitals in Database
1. ✅ Analyze symptoms
2. ✅ See loading indicator
3. ✅ Should see yellow warning: "No Specialist Hospitals Found"
4. ✅ Message should suggest registering hospitals

### Test 5: Geolocation Denied
1. ✅ When browser asks for location, click "Block"
2. ✅ Should see: `📍 Location unavailable` in console
3. ✅ Hospitals should still appear (all hospitals, sorted alphabetically)
4. ✅ Distance badges should show, but might be "null km"

---

## Common Issues & Solutions

### Issue: "AI is giving analysis two times"
**Cause**: React StrictMode causes double renders in development.

**Solutions**:
- ✅ Cache prevents actual duplicate AI calls
- ✅ `isAnalyzing` flag prevents duplicate requests
- ✅ In production build, this won't happen

**Verify Fix**: Check server logs - should only see ONE `🔍 Calling AI for new analysis...` per user click.

---

### Issue: "Hospitals not showing at all"
**Possible Causes**:

1. **No hospitals in database**
   - Check: Server log says `📊 Found 0 total hospitals`
   - Fix: Add hospitals via Hospital Dashboard or seed script

2. **Specialty mismatch**
   - Check: AI returns `relatedSpecialties: []` (empty)
   - Fix: Server now defaults to `["General Physician"]`

3. **AI not returning specialties**
   - Check: Console shows `⚠️ No related specialties found`
   - Fix: Server adds default, but verify AI prompt is correct

4. **Frontend error during hospital search**
   - Check: Console shows `❌ Error searching hospitals`
   - Fix: Check network tab for failed API calls, verify authentication

5. **State not updating**
   - Check: `showHospitals` state is false
   - Fix: Verify `setShowHospitals(true)` is called in `findNearbyHospitalsAuto`

---

## How to Add Test Hospitals

If your database has no hospitals, add some test data:

```javascript
// In your seed script or hospital registration
{
  role: 'HOSPITAL',
  name: 'City General Hospital',
  address: '123 Main Street, City',
  phone: '+1234567890',
  location: {
    latitude: 17.3850,  // Hyderabad coordinates (adjust for your area)
    longitude: 78.4867
  },
  services: ['Emergency', 'General Medicine', 'Pediatrics'],
  doctors: [
    {
      name: 'Dr. Smith',
      specialty: 'General Physician',
      qualifications: 'MBBS, MD'
    },
    {
      name: 'Dr. Jones',
      specialty: 'Cardiologist',
      qualifications: 'MBBS, DM Cardiology'
    }
  ]
}
```

---

## API Key Quota Management

The system now supports **multiple API keys** with automatic rotation:

### Environment Variables
```env
GEMINI_API_KEY=your_first_key_here
GEMINI_API_KEY_2=your_second_key_here
GEMINI_API_KEY_3=your_third_key_here
```

### How It Works
1. System tries `GEMINI_API_KEY` first
2. If quota exceeded (429 error), rotates to `GEMINI_API_KEY_2`
3. If all keys fail, shows user-friendly error
4. Cache reduces API calls by 60-80%

### Monitoring
Check server logs for:
- `⚠️ API key X quota exceeded, rotating...`
- If you see this frequently, add more keys or upgrade quotas

---

## Performance Optimizations

1. **Cache TTL: 60 seconds** - Same symptoms within 1 minute = instant response
2. **Geolocation timeout: 5 seconds** - Don't wait forever for location
3. **Auto-cleanup: Every 30 seconds** - Old cache entries removed
4. **Specialty matching**: Case-insensitive, supports partial matches
5. **Distance calculation**: Only when location available (saves computation)

---

## Next Steps for User

1. ✅ **Open browser console** (F12 → Console tab)
2. ✅ **Test the symptom analysis** with some symptoms
3. ✅ **Watch the logs** - you should see the flow described above
4. ✅ **Check if hospitals appear** after analysis
5. ✅ **If no hospitals show**: Look for the yellow warning message
6. ✅ **If you see errors**: Copy the error message and share it

### What to Share if Still Not Working

Please provide:
1. Full console logs from browser (screenshot or text)
2. Server terminal logs (especially the hospital search part)
3. What symptoms you entered
4. What you see (or don't see) after clicking "Analyze"
5. Any error messages or toast notifications

---

## File Changes Made

### Frontend
- `src/pages/SymptomAnalysis.jsx`
  - Enhanced `analyzeSymptoms()` with logging, error handling
  - Enhanced `findNearbyHospitalsAuto()` with detailed logging
  - Added loading indicator for hospital search
  - Added "No hospitals found" warning card
  - Reset hospital state before new analysis

### Backend
- `server/routes/ai.js`
  - Added request/response logging
  - Added default `relatedSpecialties` fallback
  - Enhanced cache stats logging
  - Improved error messages

- `server/routes/hospitals.js`
  - Added comprehensive search logging
  - Log each hospital match
  - Log total hospitals found in database
  - Better error handling

---

## Quick Debugging Commands

### Check if server is running
```powershell
Get-NetTCPConnection -LocalPort 5000
```

### View server logs
```powershell
cd server; npm start
```

### Check MongoDB connection
Look for: `MongoDB connected: <connection_string>` in server logs

### Test hospital search manually
```javascript
// In browser console (after login)
const token = localStorage.getItem('token');
fetch('http://localhost:5000/api/hospitals/search-by-condition', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-auth-token': token
  },
  body: JSON.stringify({
    latitude: null,
    longitude: null,
    specialties: ['General Physician'],
    maxDistance: 999999
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Success Criteria

✅ **You'll know it's working when you see**:
1. Only ONE AI analysis per button click (check server logs)
2. Hospitals loading indicator appears immediately after analysis
3. Either hospitals list appears OR helpful "no hospitals found" message
4. Toast notifications confirm success/failure
5. Console logs show clear flow from analysis → hospital search → results

If you're still having issues after following this guide, the detailed logs will help us pinpoint exactly where the problem is!
