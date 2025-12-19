# Facebook Lead Ads Integration Setup Guide

This guide explains how to set up and configure Facebook Lead Ads integration for Trip Sky Way.

## 📋 Prerequisites

1. Facebook Business Account
2. Facebook Page (for your business)
3. Facebook App (created in Facebook Developers)
4. Facebook Lead Ad Form (created in Ads Manager)

---

## 🔑 Environment Variables

Add these variables to your `Server/.env` file:

```env
# ============================================
# FACEBOOK LEAD ADS INTEGRATION
# ============================================

# Facebook App Secret (from Facebook App Dashboard > Settings > Basic)
# REPLACE THIS: Get from https://developers.facebook.com/apps/{your-app-id}/settings/basic/
FACEBOOK_APP_SECRET=YOUR_APP_SECRET_HERE

# Facebook Page Access Token (Long-lived token)
# REPLACE THIS: Generate from Graph API Explorer or use token exchange
# See instructions below for generating this token
FACEBOOK_PAGE_ACCESS_TOKEN=YOUR_PAGE_ACCESS_TOKEN_HERE

# Facebook Verify Token (Custom token you create for webhook verification)
# REPLACE THIS: Create a secure random string (e.g., use: openssl rand -hex 32)
FACEBOOK_VERIFY_TOKEN=YOUR_CUSTOM_VERIFY_TOKEN_HERE

# Facebook App ID (Optional - for reference)
# REPLACE THIS: Get from https://developers.facebook.com/apps/{your-app-id}/settings/basic/
FACEBOOK_APP_ID=YOUR_APP_ID_HERE

# Auto-assign Facebook leads to sales reps (true/false)
# Set to 'true' if you want leads automatically assigned
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

---

## 🔧 Step-by-Step Setup

### Step 1: Get Facebook App Secret

1. Go to: https://developers.facebook.com/apps/
2. Select your app (or create one if you haven't)
3. Go to **Settings > Basic**
4. Find **App Secret** section
5. Click **Show** and copy the secret
6. **REPLACE** `YOUR_APP_SECRET_HERE` in `.env` file

**⚠️ Important:** Keep this secret secure! Never commit it to version control.

---

### Step 2: Generate Facebook Page Access Token

#### Option A: Using Graph API Explorer (Easiest)

1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app from the dropdown
3. Click **Generate Access Token**
4. Grant permissions:
   - `leads_retrieval`
   - `pages_read_engagement`
   - `pages_manage_metadata`
5. Copy the short-lived token (expires in ~1 hour)

#### Option B: Exchange for Long-Lived Token

1. After getting short-lived token, use this API call:
   ```
   GET https://graph.facebook.com/v18.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={YOUR_APP_ID}&
     client_secret={YOUR_APP_SECRET}&
     fb_exchange_token={SHORT_LIVED_TOKEN}
   ```

2. Copy the `access_token` from response
3. **REPLACE** `YOUR_PAGE_ACCESS_TOKEN_HERE` in `.env` file

**Note:** Long-lived tokens expire in ~60 days. You'll need to refresh them periodically.

---

### Step 3: Create Verify Token

1. Generate a secure random string:
   ```bash
   # On Linux/Mac:
   openssl rand -hex 32
   
   # Or use Node.js:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Copy the generated string
3. **REPLACE** `YOUR_CUSTOM_VERIFY_TOKEN_HERE` in `.env` file

**Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

---

### Step 4: Get Facebook App ID (Optional)

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Go to **Settings > Basic**
4. Copy **App ID**
5. **REPLACE** `YOUR_APP_ID_HERE` in `.env` file (optional, for reference)

---

### Step 5: Configure Facebook Webhook

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Go to **Webhooks** section (in left sidebar)
4. Click **Add Subscription**
5. Select **leadgen** as the object
6. Enter your webhook URL:
   ```
   https://yourdomain.com/api/v1/webhooks/facebook
   ```
   **For local testing:** Use ngrok or similar:
   ```
   https://your-ngrok-url.ngrok.io/api/v1/webhooks/facebook
   ```
7. Enter your **Verify Token** (same as `FACEBOOK_VERIFY_TOKEN` in `.env`)
8. Click **Verify and Save**

---

### Step 6: Subscribe to Your Page

1. In the **Webhooks** section, find your webhook subscription
2. Click **Add Subscription** or **Edit Subscription**
3. Select your Facebook Page
4. Subscribe to **leadgen** events
5. Save

---

## 🧪 Testing the Integration

### Test Webhook Verification

1. Facebook will automatically send a GET request to verify your webhook
2. Check your server logs - you should see: `Facebook webhook verified successfully`
3. If verification fails, check:
   - `FACEBOOK_VERIFY_TOKEN` matches what you entered in Facebook
   - Webhook URL is accessible
   - Server is running

### Test Lead Processing

1. Create a test Lead Ad in Facebook Ads Manager
2. Submit the form yourself (or use Facebook's test tool)
3. Check your server logs for:
   - `Successfully processed Facebook lead: {leadgen_id}`
   - `Created new lead from Facebook: {lead_id}`
4. Check your database - a new lead should be created

---

## 📝 Facebook Lead Form Field Mapping

Your Facebook Lead Ad form fields will be automatically mapped to Lead model fields:

| Facebook Field Name | Lead Model Field | Notes |
|-------------------|-----------------|-------|
| `full_name` | `name` | Required |
| `email` or `email_address` | `email` | Required |
| `phone_number` or `phone` | `phone` | Required |
| `city` or `location` | `city` | Optional |
| `destination` or `travel_destination` | `destination` | Optional |
| `travel_date` or `departure_date` | `travelDate` | Optional |
| `number_of_travelers` or `travelers` | `numberOfTravelers` | Optional |
| `budget` or `budget_range` | `budget` | Optional |
| `message` or `comments` | `message` | Optional |

**Custom Fields:** You can add custom fields to your Facebook form. The mapper will try to find them automatically. If you use custom field names, you may need to update `facebookLeadMapper.js`.

---

## 🔍 Troubleshooting

### Webhook Verification Fails

- **Check:** `FACEBOOK_VERIFY_TOKEN` in `.env` matches the token in Facebook webhook settings
- **Check:** Webhook URL is accessible (not behind firewall)
- **Check:** Server logs for error messages

### Leads Not Being Created

- **Check:** `FACEBOOK_PAGE_ACCESS_TOKEN` is valid and not expired
- **Check:** Webhook is subscribed to your Page
- **Check:** Server logs for error messages
- **Check:** Lead has at least email OR phone number

### Duplicate Leads

- The system automatically checks for duplicates within 24 hours
- If same email/phone submits form multiple times, only first submission creates a lead
- Subsequent submissions add remarks to existing lead

### Token Expired

- Long-lived tokens expire in ~60 days
- Generate a new token using Step 2 instructions
- Update `FACEBOOK_PAGE_ACCESS_TOKEN` in `.env`
- Restart your server

---

## 🔒 Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Keep App Secret secure** - Anyone with this can access your Facebook data
3. **Use HTTPS** - Webhook URL must be HTTPS in production
4. **Verify signatures** - Webhook signature verification is enabled in production
5. **Rotate tokens** - Periodically refresh access tokens

---

## 📊 Monitoring

Check your server logs for:
- `Facebook webhook verified successfully` - Webhook setup working
- `Successfully processed Facebook lead` - Lead processing working
- `Created new lead from Facebook` - Lead saved to database
- Error messages - Indicate what needs to be fixed

---

## 🚀 Production Deployment

Before going live:

1. ✅ All environment variables set in production `.env`
2. ✅ Webhook URL updated to production domain
3. ✅ HTTPS enabled (required by Facebook)
4. ✅ Webhook verified in Facebook dashboard
5. ✅ Test lead submission works
6. ✅ Monitor logs for first few days

---

## 📞 Support

If you encounter issues:

1. Check server logs for error messages
2. Verify all environment variables are set correctly
3. Test webhook verification separately
4. Check Facebook App Dashboard for any errors
5. Review Facebook Lead Ads documentation: https://developers.facebook.com/docs/marketing-api/leadgen/

---

## ✅ Checklist

- [ ] Facebook App created
- [ ] App Secret copied to `.env`
- [ ] Page Access Token generated and added to `.env`
- [ ] Verify Token created and added to `.env`
- [ ] Webhook URL configured in Facebook
- [ ] Webhook verified successfully
- [ ] Page subscribed to webhook
- [ ] Test lead submitted and processed
- [ ] Lead appears in database
- [ ] Production environment variables set
- [ ] HTTPS enabled for production webhook URL

---

**Last Updated:** 2024
**Version:** 1.0


