# Facebook Lead Ads Integration - Implementation Summary

## ✅ What Was Implemented

### 1. **Backend Files Created**

#### `Server/src/services/facebook.service.js`
- Handles Facebook Graph API calls
- Verifies webhook signatures
- Extracts field values from Facebook lead data
- Formats phone numbers

#### `Server/src/utils/facebookLeadMapper.js`
- Maps Facebook lead data to your Lead model format
- Handles custom field mapping
- Checks for duplicate leads (within 24 hours)
- Parses dates and numbers

#### `Server/src/controllers/facebookWebhook.controller.js`
- `verifyWebhook()` - Handles GET requests for webhook verification
- `handleLeadWebhook()` - Handles POST requests when leads are generated
- Processes leads and creates Lead documents in database
- Auto-assigns sales reps (if configured)

#### `Server/src/routes/webhook.routes.js`
- Defines webhook routes
- No authentication required (Facebook calls directly)
- Security via signature verification

#### `Server/src/server.js` (Updated)
- Added webhook routes registration
- Route: `/api/v1/webhooks/facebook`

---

### 2. **Dependencies Installed**

- ✅ `axios` - For making HTTP requests to Facebook Graph API

---

### 3. **Documentation Created**

- ✅ `Server/docs/FACEBOOK_INTEGRATION_SETUP.md` - Complete setup guide
- ✅ `Server/docs/FACEBOOK_QUICK_REFERENCE.md` - Quick reference for values to replace

---

## 🔧 What You Need to Do

### Step 1: Add Environment Variables

Open `Server/.env` and add these lines at the end:

```env
# ============================================
# FACEBOOK LEAD ADS INTEGRATION
# ============================================
FACEBOOK_APP_SECRET=YOUR_APP_SECRET_HERE
FACEBOOK_PAGE_ACCESS_TOKEN=YOUR_PAGE_ACCESS_TOKEN_HERE
FACEBOOK_VERIFY_TOKEN=YOUR_CUSTOM_VERIFY_TOKEN_HERE
FACEBOOK_APP_ID=YOUR_APP_ID_HERE
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

**Replace the placeholders:**
- `YOUR_APP_SECRET_HERE` → Get from Facebook App Dashboard
- `YOUR_PAGE_ACCESS_TOKEN_HERE` → Generate from Graph API Explorer
- `YOUR_CUSTOM_VERIFY_TOKEN_HERE` → Generate random string
- `YOUR_APP_ID_HERE` → Get from Facebook App Dashboard

---

### Step 2: Configure Facebook Webhook

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Go to **Webhooks** section
4. Click **Add Subscription**
5. Select **leadgen** object
6. Enter webhook URL: `https://yourdomain.com/api/v1/webhooks/facebook`
7. Enter Verify Token: (same as `FACEBOOK_VERIFY_TOKEN` in `.env`)
8. Click **Verify and Save**
9. Subscribe to your Facebook Page

---

### Step 3: Test

1. Restart your server
2. Submit a test Lead Ad form
3. Check server logs for success messages
4. Verify lead appears in database

---

## 📋 Files Modified

1. ✅ `Server/src/server.js` - Added webhook routes
2. ✅ `Server/package.json` - Added axios dependency

---

## 📋 Files Created

1. ✅ `Server/src/services/facebook.service.js`
2. ✅ `Server/src/utils/facebookLeadMapper.js`
3. ✅ `Server/src/controllers/facebookWebhook.controller.js`
4. ✅ `Server/src/routes/webhook.routes.js`
5. ✅ `Server/docs/FACEBOOK_INTEGRATION_SETUP.md`
6. ✅ `Server/docs/FACEBOOK_QUICK_REFERENCE.md`

---

## 🔗 API Endpoints

### Webhook Verification (GET)
```
GET /api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```
- Called by Facebook to verify webhook
- Returns challenge token if verification succeeds

### Webhook Lead Processing (POST)
```
POST /api/v1/webhooks/facebook
```
- Called by Facebook when a lead is generated
- Processes lead and creates Lead document
- Returns 200 OK to Facebook

---

## 🎯 How It Works

1. **User submits Facebook Lead Ad form**
2. **Facebook sends webhook POST** to your endpoint
3. **Backend verifies signature** (security check)
4. **Extracts leadgen_id** from webhook payload
5. **Calls Facebook Graph API** to get full lead data
6. **Maps Facebook fields** to your Lead model
7. **Checks for duplicates** (same email/phone within 24h)
8. **Creates Lead document** in database
9. **Auto-assigns sales rep** (if configured)
10. **Returns 200 OK** to Facebook

---

## 🔒 Security Features

- ✅ Webhook signature verification (HMAC SHA256)
- ✅ Verify token validation
- ✅ Duplicate lead detection
- ✅ Error handling and logging
- ✅ No authentication required (Facebook calls directly)

---

## 📊 Lead Field Mapping

Facebook form fields automatically map to Lead model:

| Facebook Field | Lead Model Field |
|---------------|------------------|
| `full_name` | `name` |
| `email` | `email` |
| `phone_number` | `phone` |
| `destination` | `destination` |
| `travel_date` | `travelDate` |
| `number_of_travelers` | `numberOfTravelers` |
| `budget` | `budget` |
| `message` | `message` |
| `city` | `city` |

**Source:** Always set to `'social-media'`
**Platform:** Always set to `'Social Media'`
**Status:** Always set to `'new'`

---

## 🐛 Troubleshooting

### Webhook not receiving data?
- Check webhook URL is accessible
- Verify token matches in Facebook and `.env`
- Check server logs for errors

### Leads not being created?
- Check `FACEBOOK_PAGE_ACCESS_TOKEN` is valid
- Verify webhook is subscribed to your Page
- Check lead has at least email OR phone

### Duplicate leads?
- System checks duplicates within 24 hours
- If same person submits multiple times, only first creates lead
- Subsequent submissions add remarks to existing lead

---

## 📞 Next Steps

1. ✅ Add environment variables to `.env`
2. ✅ Configure Facebook webhook
3. ✅ Test with a sample lead
4. ✅ Monitor server logs
5. ✅ Verify leads appear in database

---

**Ready to go!** Just add your Facebook credentials to `.env` and configure the webhook.


