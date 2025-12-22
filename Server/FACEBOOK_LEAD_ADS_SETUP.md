# Facebook Lead Ads Integration - Complete Setup Guide

This guide covers the complete setup process for Facebook Lead Ads integration in both **localhost (development)** and **production (after hosting)** environments.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Localhost Setup (Development)](#localhost-setup-development)
5. [Production Setup (After Hosting)](#production-setup-after-hosting)
6. [Facebook Developer Console Configuration](#facebook-developer-console-configuration)
7. [Testing the Integration](#testing-the-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This integration allows your application to automatically receive and process leads from Facebook Lead Ads. When a user submits a lead form on Facebook, the data is sent to your server via webhook, and a new lead is created in your database.

**Key Features:**
- ✅ Real-time lead capture from Facebook ads
- ✅ Automatic lead creation in your system
- ✅ Duplicate detection (by email/phone)
- ✅ Auto-assignment to sales representatives
- ✅ Secure webhook verification
- ✅ Campaign and ad tracking

---

## Prerequisites

Before starting, ensure you have:

1. **Facebook Requirements:**
   - ✅ Facebook Developer account
   - ✅ Facebook Business Page
   - ✅ Facebook App created
   - ✅ Business Manager account (recommended)
   - ✅ Page accepted Facebook's Lead Generation Terms of Service

2. **Technical Requirements:**
   - ✅ Node.js installed
   - ✅ MongoDB running
   - ✅ Server application running
   - ✅ For localhost: ngrok or similar tunneling tool
   - ✅ For production: HTTPS-enabled domain

---

## Environment Configuration

### Required Environment Variables

Add these variables to your `.env` file:

```env
# Facebook Lead Ads Integration
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token_here
FACEBOOK_VERIFY_TOKEN=your_verify_token_here
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

### Where to Get These Values:

#### 1. FACEBOOK_APP_ID
- Go to: https://developers.facebook.com/apps/
- Select your app
- Go to **Settings → Basic**
- Copy the **App ID**
- Example: `1503695127396803`

#### 2. FACEBOOK_APP_SECRET
- Same page as App ID
- Click **Show** next to **App Secret**
- Re-enter your Facebook password if prompted
- Copy the secret
- Example: `c2c26a8bfa5128512da82fd798af8bac`

⚠️ **SECURITY WARNING:** Never commit this to version control. Keep it secret!

#### 3. FACEBOOK_PAGE_ACCESS_TOKEN

**Step A: Get Short-Lived Token**
1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app from "Meta App" dropdown
3. Click "Generate Access Token"
4. Grant permissions:
   - `leads_retrieval`
   - `pages_read_engagement`
   - `pages_manage_metadata`
5. Copy the token (starts with `EAAB...`)

**Step B: Exchange for Long-Lived Token**
1. Open browser and navigate to this URL (replace placeholders):

```
https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
```

2. Replace:
   - `YOUR_APP_ID` → Your App ID
   - `YOUR_APP_SECRET` → Your App Secret
   - `SHORT_LIVED_TOKEN` → Token from Step A

3. You'll get JSON response:
```json
{
  "access_token": "EAAVXmk3rQcMBQYK2QTCtau7Qn6...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

4. Copy the `access_token` value - this is your long-lived Page Access Token

#### 4. FACEBOOK_VERIFY_TOKEN

This is a random string YOU create. Facebook uses it to verify webhook requests.

**Generate using PowerShell (Windows):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Or use any random string generator:**
```
Example: softlytic_secure_token_2025
```

⚠️ **IMPORTANT:** Remember this token - you'll need it when configuring the webhook in Facebook.

#### 5. AUTO_ASSIGN_FACEBOOK_LEADS

Set to `true` to automatically assign leads to sales reps, or `false` to disable.

```env
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

---

## Localhost Setup (Development)

### Step 1: Configure .env File

1. Open `Server/.env`
2. Add Facebook credentials:

```env
# Facebook Lead Ads Integration (Development)
FACEBOOK_APP_ID=1503695127396803
FACEBOOK_APP_SECRET=c2c26a8bfa5128512da82fd798af8bac
FACEBOOK_PAGE_ACCESS_TOKEN=EAAVXmk3rQcMBQYK2QTCtau7Qn6JZCTM2dNZBl67WZCpUZBpZBMIZBKkM5cZAvN3aZA34q3uNq7zuInhOPeKNUtkRcjLZC6ZC3xjS0ejS97ZBhgQ9blaF8MtI0P8vk2pqJOVhtf4U692aLjdF5UqE0JXHZA9DnextNLw1azwvsB3p5NnKPhgYGKE1c5ca0SZBV6i61CT8jLEazMrcV
FACEBOOK_VERIFY_TOKEN=softlytic_secure_token_2025
AUTO_ASSIGN_FACEBOOK_LEADS=true

# Server Configuration
NODE_ENV=development
PORT=5000
```

### Step 2: Start Your Local Server

```bash
cd Server
npm install
npm start
```

Your server should be running at: `http://localhost:5000`

### Step 3: Expose Localhost with ngrok

Since Facebook webhooks require HTTPS and a public URL, use ngrok to expose your localhost:

**Install ngrok:**
```bash
# Download from: https://ngrok.com/download
# Or install via npm:
npm install -g ngrok
```

**Start ngrok:**
```bash
ngrok http 5000
```

**You'll see output like:**
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.0.0
Region                        United States (us)
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:5000
```

**Copy the HTTPS URL:** `https://abc123def456.ngrok.io`

⚠️ **NOTE:** This URL changes every time you restart ngrok (unless you have a paid plan with reserved domains).

### Step 4: Configure Facebook Webhook (Development)

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Click **"Webhooks"** in left sidebar
4. If not added, click **"Add Product"** and add **"Webhooks"**
5. Click **"Edit Subscription"** or **"Add New Subscription"**
6. Select **"Page"** as object type
7. Enter webhook details:
   - **Callback URL:** `https://abc123def456.ngrok.io/api/v1/webhooks/facebook`
   - **Verify Token:** `softlytic_secure_token_2025` (your verify token)
8. Click **"Verify and Save"**
9. Subscribe to field: ✅ **leadgen**
10. Subscribe to your page: Click **"Add Page"** → Select **"Softlytic"**

### Step 5: Test Localhost Integration

1. Check your server terminal - you should see:
   ```
   Facebook webhook verified successfully
   ```

2. Submit a test lead through your Facebook ad

3. Check server logs for:
   ```
   Successfully processed Facebook lead: [leadgen_id]
   Created new lead from Facebook: [lead_id]
   ```

---

## Production Setup (After Hosting)

### Step 1: Update .env File on Server

When you deploy to production, update your `.env` file:

```env
# Facebook Lead Ads Integration (Production)
FACEBOOK_APP_ID=1503695127396803
FACEBOOK_APP_SECRET=c2c26a8bfa5128512da82fd798af8bac
FACEBOOK_PAGE_ACCESS_TOKEN=EAAVXmk3rQcMBQYK2QTCtau7Qn6JZCTM2dNZBl67WZCpUZBpZBMIZBKkM5cZAvN3aZA34q3uNq7zuInhOPeKNUtkRcjLZC6ZC3xjS0ejS97ZBhgQ9blaF8MtI0P8vk2pqJOVhtf4U692aLjdF5UqE0JXHZA9DnextNLw1azwvsB3p5NnKPhgYGKE1c5ca0SZBV6i61CT8jLEazMrcV
FACEBOOK_VERIFY_TOKEN=softlytic_secure_token_2025
AUTO_ASSIGN_FACEBOOK_LEADS=true

# Server Configuration
NODE_ENV=production
PORT=5000
```

⚠️ **IMPORTANT CHANGES:**
- `NODE_ENV=production` (was `development`)
- All other values remain the same

### Step 2: Ensure HTTPS is Enabled

Facebook webhooks **require HTTPS**. Ensure your production server has:

- ✅ Valid SSL certificate (Let's Encrypt, Cloudflare, etc.)
- ✅ HTTPS enabled and working
- ✅ Redirect HTTP to HTTPS

**Test HTTPS:**
```bash
curl -I https://yourdomain.com
# Should return: HTTP/2 200
```

### Step 3: Update Facebook Webhook (Production)

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Click **"Webhooks"** → **"Edit Subscription"**
4. Update webhook URL:
   - **Callback URL:** `https://yourdomain.com/api/v1/webhooks/facebook`
   - **Verify Token:** `softlytic_secure_token_2025` (same as before)
5. Click **"Verify and Save"**

**Production URL Examples:**
- `https://api.tripskyway.com/api/v1/webhooks/facebook`
- `https://tripskyway.com/api/v1/webhooks/facebook`
- `https://server.tripskyway.com/api/v1/webhooks/facebook`

### Step 4: Restart Production Server

After updating `.env`:

```bash
# SSH into your server
ssh user@yourserver.com

# Navigate to server directory
cd /path/to/Trip-Sky-Way/Server

# Restart server (depending on your setup)
pm2 restart server
# or
systemctl restart trip-sky-way
# or
npm start
```

### Step 5: Test Production Integration

1. Submit a test lead through Facebook ad
2. Check server logs:
   ```bash
   # If using PM2:
   pm2 logs server
   
   # Or check log file:
   tail -f /var/log/trip-sky-way/server.log
   ```

3. Verify lead appears in your database:
   - Login to your admin dashboard
   - Go to Lead Management
   - Filter by source: "social-media"
   - Check for recent Facebook leads

---

## Facebook Developer Console Configuration

### Complete Webhook Setup Checklist

#### 1. Add Webhooks Product

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Left sidebar → Click **"Add Product"**
4. Find **"Webhooks"** → Click **"Set Up"**

#### 2. Configure Page Webhooks

1. Click **"Page"** webhook
2. Click **"Subscribe to this object"**
3. Enter details:
   - **Callback URL:** Your webhook URL
   - **Verify Token:** Your verify token from `.env`
4. Select subscription fields:
   - ✅ **leadgen** (required)
   - ✅ **page** (optional)
5. Click **"Verify and Save"**

#### 3. Subscribe to Your Page

1. After webhook verified, scroll to **"Subscribed Pages"**
2. Click **"Add Page"**
3. Select your page: **"Softlytic"**
4. Authorize if prompted
5. Ensure status shows: ✅ **Subscribed**

#### 4. Test Webhook Delivery

1. In Webhooks section, click **"Test"**
2. Select **"leadgen"** event
3. Click **"Send to My Server"**
4. Check response - should be: `200 OK`

---

## Testing the Integration

### Manual Webhook Verification Test

Test if your webhook endpoint is working:

**For Localhost:**
```bash
curl -X GET "http://localhost:5000/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=softlytic_secure_token_2025&hub.challenge=test123"

# Expected response: test123
```

**For Production:**
```bash
curl -X GET "https://yourdomain.com/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=softlytic_secure_token_2025&hub.challenge=test123"

# Expected response: test123
```

### End-to-End Test Flow

1. **Create/Publish Lead Ad**
   - Ensure ad is active
   - Lead form is configured correctly

2. **Submit Test Lead**
   - Click on your Facebook ad
   - Fill out the form with test data:
     - Name: Test User
     - Email: test@example.com
     - Phone: +1234567890
   - Submit the form

3. **Check Server Logs**
   ```bash
   # You should see:
   Facebook webhook received POST request
   Lead data: { leadgen_id: '...', ... }
   Successfully processed Facebook lead: [id]
   Created new lead from Facebook: [id]
   ```

4. **Verify in Database**
   - Login to admin dashboard
   - Navigate to Lead Management
   - Filter: Source = "social-media"
   - Find your test lead
   - Verify all data is correct:
     - Name, email, phone
     - Campaign info in tags/remarks
     - Assigned sales rep (if auto-assign enabled)

5. **Test Duplicate Detection**
   - Submit the same lead again (same email)
   - Check logs:
     ```
     Duplicate lead detected: test@example.com - skipping creation
     ```
   - Verify no duplicate created in database

---

## Troubleshooting

### Issue 1: Webhook Verification Fails

**Symptoms:**
- Facebook shows "Webhook verification failed"
- Status code 403 or 500

**Solutions:**

✅ **Check verify token matches:**
```bash
# In .env file:
FACEBOOK_VERIFY_TOKEN=softlytic_secure_token_2025

# In Facebook webhook settings:
Verify Token: softlytic_secure_token_2025
# Must match exactly!
```

✅ **Test webhook manually:**
```bash
# Replace with your URL and token:
curl "https://yourdomain.com/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=softlytic_secure_token_2025&hub.challenge=test123"

# Should return: test123
```

✅ **Check server is running:**
```bash
# Check if server is listening on port 5000:
netstat -ano | findstr :5000
# or on Linux:
netstat -tulpn | grep :5000
```

✅ **Check firewall/security groups:**
- Ensure port 5000 is open (or your production port)
- Allow incoming HTTPS traffic
- Check cloud provider security groups (AWS, Azure, etc.)

---

### Issue 2: Leads Not Being Created

**Symptoms:**
- Webhook verified successfully
- Leads submitted but don't appear in database

**Solutions:**

✅ **Check server logs:**
```bash
# Look for error messages:
tail -f server.log | grep -i "facebook\|lead\|error"
```

✅ **Verify page access token is valid:**
```bash
# Test token with Facebook API:
curl "https://graph.facebook.com/me?access_token=YOUR_PAGE_ACCESS_TOKEN"

# Should return page information, not error
```

✅ **Check webhook is subscribed to correct page:**
1. Go to: https://developers.facebook.com/apps/
2. Your app → Webhooks
3. Verify "Softlytic" page is listed under subscribed pages

✅ **Check database connection:**
```bash
# Test MongoDB connection:
mongo --eval "db.stats()"
# Should show database statistics
```

✅ **Review webhook POST data:**
- Add more logging to `facebookWebhook.controller.js`
- Log the incoming request body
- Verify field names match mapper expectations

---

### Issue 3: Invalid Access Token Error

**Symptoms:**
- Error: "Invalid OAuth access token"
- Error: "The access token has expired"

**Solutions:**

✅ **Regenerate long-lived token:**
1. Get new short-lived token from Graph API Explorer
2. Exchange for long-lived token (see [Environment Configuration](#environment-configuration))
3. Update `.env` file
4. Restart server

✅ **Check token expiration:**
```bash
# Debug token:
curl "https://graph.facebook.com/debug_token?input_token=YOUR_TOKEN&access_token=YOUR_APP_ID|YOUR_APP_SECRET"

# Response includes "expires_at" timestamp
```

✅ **Use permanent system user token (recommended for production):**
1. Go to: https://business.facebook.com/settings/
2. Click "System Users" (under Users)
3. Create new system user
4. Generate token with required permissions
5. This token doesn't expire!

---

### Issue 4: HTTPS Required Error

**Symptoms:**
- Facebook webhook configuration fails
- Error: "The URL couldn't be validated. Callback verification failed..."

**Solutions:**

✅ **Localhost (Development):**
- Use ngrok or similar tool
- Ensure using HTTPS URL from ngrok
- Example: `https://abc123.ngrok.io/api/v1/webhooks/facebook`

✅ **Production:**
- Install SSL certificate
- Enable HTTPS on your server
- Test: `curl -I https://yourdomain.com`
- Should return: `HTTP/2 200`

✅ **Let's Encrypt (Free SSL):**
```bash
# Install certbot:
sudo apt-get install certbot

# Get certificate:
sudo certbot certonly --standalone -d yourdomain.com

# Configure your server to use the certificate
```

---

### Issue 5: Webhook Signature Verification Fails

**Symptoms:**
- Server logs: "Invalid signature"
- Webhook requests rejected

**Solutions:**

✅ **Verify APP_SECRET is correct:**
```env
# In .env:
FACEBOOK_APP_SECRET=c2c26a8bfa5128512da82fd798af8bac

# Must match the secret in Facebook Developer Console
```

✅ **Check signature verification code:**
- Verify `X-Hub-Signature-256` header is being read
- Ensure raw request body is used (not parsed JSON)
- Check HMAC-SHA256 implementation

✅ **Temporarily disable in development:**
```javascript
// In facebookWebhook.controller.js:
// Only for testing - re-enable for production!
if (process.env.NODE_ENV === 'development') {
  // Skip signature verification
}
```

---

### Issue 6: Duplicate Leads Being Created

**Symptoms:**
- Same person appears multiple times in database
- Duplicate detection not working

**Solutions:**

✅ **Check duplicate detection logic:**
```javascript
// In facebookLeadMapper.js or service:
// Ensure checking both email AND phone
const existingLead = await Lead.findOne({
  $or: [
    { email: normalizedEmail },
    { phone: normalizedPhone }
  ]
});
```

✅ **Verify normalization:**
- Emails should be lowercase and trimmed
- Phone numbers should be stripped of formatting
- Example: `+1 (234) 567-8900` → `12345678900`

✅ **Check indexes:**
```bash
# In MongoDB:
db.leads.getIndexes()

# Ensure email and phone have indexes for faster lookup
```

---

### Issue 7: ngrok URL Changes (Localhost)

**Symptoms:**
- Webhook stops working after restarting ngrok
- New ngrok URL each time

**Solutions:**

✅ **Use ngrok reserved domain (paid plan):**
```bash
ngrok http 5000 --domain=your-reserved-domain.ngrok.io
```

✅ **Use alternative with static URL:**
- localtunnel: `lt --port 5000`
- serveo: `ssh -R 80:localhost:5000 serveo.net`

✅ **For frequent testing:**
1. Keep ngrok running continuously
2. Use tmux/screen to persist terminal session
3. Update Facebook webhook URL each time ngrok restarts

---

## Environment Variables Comparison

### Development (.env for localhost):

```env
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/trip-sky-way

# Facebook
FACEBOOK_APP_ID=1503695127396803
FACEBOOK_APP_SECRET=c2c26a8bfa5128512da82fd798af8bac
FACEBOOK_PAGE_ACCESS_TOKEN=EAAVXmk3rQcMBQYK2QTCtau7Qn6...
FACEBOOK_VERIFY_TOKEN=softlytic_secure_token_2025
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

### Production (.env after hosting):

```env
NODE_ENV=production
PORT=5000

# MongoDB (Production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trip-sky-way

# Facebook (Same as development)
FACEBOOK_APP_ID=1503695127396803
FACEBOOK_APP_SECRET=c2c26a8bfa5128512da82fd798af8bac
FACEBOOK_PAGE_ACCESS_TOKEN=EAAVXmk3rQcMBQYK2QTCtau7Qn6...
FACEBOOK_VERIFY_TOKEN=softlytic_secure_token_2025
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

**Key Differences:**
- `NODE_ENV`: `development` → `production`
- `MONGODB_URI`: Local → Cloud (MongoDB Atlas)
- Facebook credentials: **Same in both environments**

---

## File Structure

```
Server/
├── .env                                 # Environment variables (NEVER commit!)
├── .env.example                         # Template for .env
├── server.js                            # Main server file
└── src/
    ├── routes/
    │   └── webhook.routes.js            # Webhook routes
    ├── controllers/
    │   └── facebookWebhook.controller.js # Webhook handler
    ├── services/
    │   └── facebook.service.js          # Facebook API service
    └── utils/
        └── facebookLeadMapper.js        # Lead data mapper
```

---

## API Endpoints

### GET /api/v1/webhooks/facebook
**Purpose:** Webhook verification (called by Facebook)

**Query Parameters:**
- `hub.mode`: Should be "subscribe"
- `hub.verify_token`: Your verify token
- `hub.challenge`: Random string to return

**Response:**
- Returns the challenge value if verification succeeds
- Returns 403 if verify token doesn't match

**Example:**
```bash
curl "https://yourdomain.com/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=softlytic_secure_token_2025&hub.challenge=test123"

# Response: test123
```

---

### POST /api/v1/webhooks/facebook
**Purpose:** Receive lead data from Facebook

**Headers:**
- `X-Hub-Signature-256`: HMAC signature for verification

**Body:**
```json
{
  "object": "page",
  "entry": [
    {
      "id": "PAGE_ID",
      "time": 1234567890,
      "changes": [
        {
          "value": {
            "ad_id": "120237213757010434",
            "form_id": "FORM_ID",
            "leadgen_id": "LEAD_ID",
            "created_time": 1234567890,
            "page_id": "PAGE_ID"
          },
          "field": "leadgen"
        }
      ]
    }
  ]
}
```

**Response:**
- `200 OK`: Lead processed successfully
- `400 Bad Request`: Invalid request
- `500 Internal Server Error`: Processing error

---

## Security Best Practices

### 1. Environment Variables
```bash
# ✅ DO:
- Store credentials in .env file
- Add .env to .gitignore
- Use environment-specific values
- Rotate tokens periodically

# ❌ DON'T:
- Commit .env to version control
- Share credentials publicly
- Hardcode credentials in code
- Use same .env for all environments
```

### 2. Access Tokens
```bash
# ✅ DO:
- Use long-lived tokens (60+ days)
- Store tokens securely
- Use system user tokens for production
- Monitor token expiration

# ❌ DON'T:
- Use short-lived tokens in production
- Share tokens publicly
- Log tokens in console/files
- Commit tokens to git
```

### 3. Webhook Security
```bash
# ✅ DO:
- Verify X-Hub-Signature-256 header
- Use HTTPS (required)
- Validate request origin
- Rate limit webhook endpoint
- Log suspicious activity

# ❌ DON'T:
- Accept HTTP requests
- Skip signature verification
- Expose webhook URL publicly
- Process invalid requests
```

### 4. Production Deployment
```bash
# ✅ DO:
- Use NODE_ENV=production
- Enable all security features
- Monitor logs regularly
- Set up error tracking (Sentry, etc.)
- Use process manager (PM2)

# ❌ DON'T:
- Run as root user
- Expose error details to clients
- Disable security features
- Ignore webhook failures
```

---

## Monitoring and Logs

### Server Logs to Monitor

```bash
# Successful webhook verification:
✅ "Facebook webhook verified successfully"

# Successful lead processing:
✅ "Successfully processed Facebook lead: [leadgen_id]"
✅ "Created new lead from Facebook: [lead_id]"

# Duplicate detection:
⚠️ "Duplicate lead detected: [email] - skipping creation"

# Errors to watch for:
❌ "Error processing Facebook lead: [error]"
❌ "Invalid signature"
❌ "Facebook API Error: [error]"
```

### Facebook Webhook Logs

1. Go to: https://developers.facebook.com/apps/
2. Your app → Webhooks
3. Click on webhook subscription
4. View **"Recent Deliveries"**
5. Check:
   - Status codes (should be 200)
   - Response times
   - Error messages

---

## Quick Reference Commands

### Start Server (Development)
```bash
cd Server
npm install
npm start
```

### Start with ngrok (Localhost)
```bash
# Terminal 1:
cd Server
npm start

# Terminal 2:
ngrok http 5000
```

### Deploy to Production
```bash
# SSH to server:
ssh user@yourserver.com

# Pull latest code:
cd /path/to/Trip-Sky-Way
git pull origin main

# Install dependencies:
cd Server
npm install --production

# Restart server:
pm2 restart server
# or
npm start
```

### Check Server Status
```bash
# PM2:
pm2 status
pm2 logs server

# Direct:
curl http://localhost:5000/health
```

### Test Webhook
```bash
# Localhost:
curl "http://localhost:5000/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=softlytic_secure_token_2025&hub.challenge=test123"

# Production:
curl "https://yourdomain.com/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=softlytic_secure_token_2025&hub.challenge=test123"
```

---

## Support and Resources

### Documentation
- Facebook Webhooks: https://developers.facebook.com/docs/graph-api/webhooks
- Lead Ads API: https://developers.facebook.com/docs/marketing-api/guides/lead-ads
- Graph API Explorer: https://developers.facebook.com/tools/explorer/

### Tools
- Facebook Developer Console: https://developers.facebook.com/apps/
- Business Manager: https://business.facebook.com/
- ngrok: https://ngrok.com/
- Postman: https://www.postman.com/

---

## Changelog

### Version 1.0 (December 2025)
- Initial release
- Localhost and production setup
- Complete troubleshooting guide
- Security best practices

---

## License

This integration is part of the Trip Sky Way application.

---

**Last Updated:** December 22, 2025  
**Maintained by:** Development Team  
**Contact:** ashanekanayakeat@gmail.com
