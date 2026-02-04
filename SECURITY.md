# Security Guidelines

## Environment Variables

**NEVER commit sensitive keys to git!** All sensitive information should be stored in `.env` files which are excluded from version control.

### Required Environment Variables

#### Server (.env in server/)
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# API Keys
GEMINI_API_KEY=your_gemini_api_key

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### Generating VAPID Keys

Push notifications require VAPID keys. Generate them using:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BF...
Private Key: Dg...
```

Add these to your `server/.env` file.

### Setup Instructions

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

2. Fill in all required values in both `.env` files

3. **Never commit** `.env` files to git

4. Keep your API keys and secrets secure

### If Keys Are Exposed

If you accidentally commit sensitive keys:

1. **Immediately rotate/regenerate all exposed keys**:
   - Change MongoDB password
   - Generate new JWT secret
   - Generate new VAPID keys
   - Revoke and create new API keys

2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch server/.env" \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. Force push to remote (⚠️ use with caution):
   ```bash
   git push origin --force --all
   ```

## Deployment

For production deployments (Render, Vercel, etc.):

1. Add all environment variables through the hosting platform's dashboard
2. Never use the example values in production
3. Use strong, randomly generated secrets
4. Enable HTTPS/SSL for all connections
5. Regularly rotate credentials

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.
