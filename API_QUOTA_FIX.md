# 🔧 API Quota Exceeded - Fix Guide

## 🚨 Problem
You're seeing "API quota exceeded" errors when using AI features (symptom analysis, chat, etc.)

## ✅ Solutions (Choose One)

### **Solution 1: Wait for Reset** ⏰
Google Gemini API quotas reset automatically:
- **Per-minute limit**: 15 requests (resets every minute)
- **Daily limit**: Varies by tier (resets at midnight Pacific Time)

**Action**: Wait 15-60 minutes and try again.

---

### **Solution 2: Get a New API Key** 🔑 (RECOMMENDED)

1. **Go to Google AI Studio**:
   - Visit: https://makersuite.google.com/app/apikey
   - Sign in with your Google account

2. **Create a New API Key**:
   - Click "Create API Key"
   - Select a Google Cloud project (or create new one)
   - Copy the key

3. **Update Your `.env` File**:
   ```bash
   # In server folder, create/edit .env file
   cd server
   code .env
   ```

   Add:
   ```dotenv
   GEMINI_API_KEY=AIza...your_new_key_here
   ```

4. **Restart Your Server**:
   ```bash
   # Kill the current server (Ctrl+C)
   # Then restart:
   npm start
   ```

---

### **Solution 3: Use Multiple API Keys** 🔄 (BEST FOR PRODUCTION)

The system now supports **automatic key rotation**!

1. **Create 2-3 API Keys** from Google AI Studio
2. **Add them to `.env`**:
   ```dotenv
   GEMINI_API_KEY=AIza...your_first_key
   GEMINI_API_KEY_2=AIza...your_second_key
   GEMINI_API_KEY_3=AIza...your_third_key
   ```

3. **The system will automatically**:
   - Switch to the next key when one hits quota
   - Cycle through all available keys
   - Reset failure counts periodically

---

### **Solution 4: Upgrade to Paid Tier** 💰

For unlimited usage:
1. Go to: https://console.cloud.google.com/
2. Select your project
3. Enable billing
4. Upgrade to **Gemini API Pro** tier

**Pricing**: Usually free tier is sufficient for testing.

---

## 🔍 How to Check Your Current Quota

Visit: https://aistudio.google.com/app/apikey
- View your API keys
- See usage statistics
- Monitor quota limits

---

## 🛡️ Prevention Tips

1. **Use Caching**: The app now caches AI responses (already implemented)
2. **Rate Limiting**: Don't spam the AI analysis button
3. **Test Mode**: Use test data during development
4. **Multiple Keys**: Always have 2-3 backup keys

---

## 🔧 New Features Added

I've enhanced your `server/routes/ai.js` with:

✅ **Automatic API key rotation**
✅ **Retry logic with exponential backoff**
✅ **Better error messages**
✅ **Failure tracking per key**

The system will now automatically switch between your API keys when one hits the quota limit.

---

## 📝 Quick Test

After adding a new key:

```bash
# Restart server
cd server
npm start
```

Then try the symptom analysis feature again. You should see in server logs:
```
✅ Connected to: gemini-1.5-flash
```

If quota is hit:
```
⚠️ API key 0 quota exceeded, rotating to next key...
🔄 Retrying with alternate API key (attempt 1)...
```

---

## ❓ Still Having Issues?

1. **Check server logs** for detailed error messages
2. **Verify API key** is valid (copy/paste carefully, no spaces)
3. **Check Google Cloud Console** for API enablement
4. **Try a different Google account** to create new keys

---

**Need more help?** Check the Gemini API docs: https://ai.google.dev/docs
