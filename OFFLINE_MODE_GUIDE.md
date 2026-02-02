## 🌐 Offline Mode Testing Guide

### How to Test Offline Features:

1. **Initial Load (Online)**
   - Open the app while connected to internet
   - Navigate to:
     - Health Records - view your records
     - Family Profile - view family members  
     - Appointments - view appointments
   - All data is automatically cached in IndexedDB

2. **Go Offline**
   - Open DevTools (F12)
   - Go to Network tab
   - Change "No throttling" to "Offline"
   - OR disable your WiFi/network

3. **Test Offline Features**

   ✅ **Works Offline:**
   - View Health Records (cached data)
   - View Family Members (cached data)
   - View Appointments (cached data)
   - MediBot First Aid Tips (10 conditions):
     - Fever
     - Headache
     - Cough & Cold
     - Stomach pain
     - Diarrhea
     - Cuts & wounds
     - Burns
     - Sprains
     - Snake bite (emergency)
     - Dehydration

   ❌ **Requires Internet:**
   - Add new health records
   - Add new family members
   - Book new appointments
   - AI medical chat (full Gemini AI)
   - Upload documents

4. **Offline Indicators**
   - Bottom banner: "You are Offline - App is running in offline mode"
   - Page headers show: "📦 Viewing offline data"
   - Toast notifications: "📱 Viewing offline appointments"

5. **Test MediBot Offline**
   - Go to First Aid (MediBot)
   - Try these queries offline:
     - "I have fever"
     - "headache remedy"
     - "what to do for snake bite"
     - "stomach pain treatment"
   - MediBot will respond with offline first aid tips!

### Technical Details:

**Storage:**
- IndexedDB database: `MediVillageDB`
- Stores: healthRecords, appointments, familyMembers, apiCache
- Cache duration: 24-48 hours

**Offline Strategy:**
- NetworkFirst for API calls
- Falls back to IndexedDB when offline
- Automatic cache updates when online

**File Locations:**
- Offline storage: `src/utils/offlineStorage.js`
- API wrapper: `src/utils/apiWrapper.js`
- First aid database: `src/data/offlineFirstAid.js`
