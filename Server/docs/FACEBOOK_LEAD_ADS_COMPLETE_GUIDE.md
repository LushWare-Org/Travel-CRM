# Facebook Lead Ads Integration - Complete Setup Guide

This guide covers everything you need to set up Facebook Lead Ads integration, from account creation to testing and deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Facebook Developer Account](#step-1-create-facebook-developer-account)
3. [Step 2: Create Facebook App](#step-2-create-facebook-app)
4. [Step 3: Get Facebook Credentials](#step-3-get-facebook-credentials)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Set Up Webhook](#step-5-set-up-webhook)
7. [Step 6: Create Lead Ad Form](#step-6-create-lead-ad-form)
8. [Step 7: Test the Integration](#step-7-test-the-integration)
9. [Step 8: Monitor and Troubleshoot](#step-8-monitor-and-troubleshoot)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ A Facebook Business Page
- ✅ A Facebook Business Manager account (recommended)
- ✅ Access to your server's `.env` file
- ✅ Your server deployed and accessible via HTTPS (for webhook)
- ✅ Node.js and npm installed on your server

---

## Step 1: Create Facebook Developer Account

### 1.1 Go to Facebook Developers

1. Open your browser and go to: **https://developers.facebook.com/**
2. Click **"Get Started"** or **"Log In"** (top right)
3. Log in with your Facebook account

### 1.2 Complete Developer Account Setup

1. If this is your first time, Facebook will ask you to:
   - **Verify your identity** (phone number or email)
   - **Accept Developer Terms**
   - **Complete your developer profile**

2. Follow the on-screen instructions to complete verification

**Note:** If you see "You can only complete this action in Accounts Center", go to **https://www.facebook.com/settings** and complete your account verification there first.

---

## Step 2: Create Facebook App

### 2.1 Create New App

1. Go to: **https://developers.facebook.com/apps/**
2. Click **"Create App"** button (top right)
3. You'll see a popup with app types:
   - Select **"Business"** (or **"Other"** if Business is not available)
   - Click **"Next"**

### 2.2 Fill App Details

1. **App Display Name:** Enter `Trip Sky Way Lead Integration` (or your preferred name)
2. **App Contact Email:** Enter your business email address
3. **Business Account:** Select your Business Manager account (if you have one)
   - If you don't have one, you can skip this or create it later
4. Click **"Create App"**

### 2.3 Complete App Setup

1. Facebook may ask you to add products to your app
2. Look for **"Lead Ads"** or **"Webhooks"** in the products list
3. If you don't see them immediately, don't worry - we'll add them later
4. Click **"Skip"** or **"Continue"** to proceed

---

## Step 3: Get Facebook Credentials

You need 4 credentials for the integration. Follow these steps carefully:

### 3.1 Get FACEBOOK_APP_ID

1. In your Facebook App dashboard, click **"Settings"** in the left sidebar
2. Click **"Basic"** (under Settings)
3. Find **"App ID"** at the top of the page
4. Copy the App ID (it's a long number like `123456789012345`)
5. **Save this** - you'll need it for your `.env` file

**Example:**
```
FACEBOOK_APP_ID=123456789012345
```

---

### 3.2 Get FACEBOOK_APP_SECRET

1. Still in **Settings > Basic**
2. Scroll down to find **"App Secret"** section
3. Click **"Show"** button next to App Secret
4. Facebook may ask you to re-enter your password
5. Copy the App Secret (long string of letters and numbers)
6. **Save this securely** - never share it publicly

**Example:**
```
FACEBOOK_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

⚠️ **Security Note:** Keep your App Secret private. If exposed, regenerate it immediately.

---

### 3.3 Generate FACEBOOK_PAGE_ACCESS_TOKEN

#### Option A: Using Graph API Explorer (Easiest)

1. Go to: **https://developers.facebook.com/tools/explorer/**
2. At the top, select your app from the **"Meta App"** dropdown
3. Click **"Generate Access Token"** button
4. A popup will appear - select these permissions:
   - ✅ `leads_retrieval`
   - ✅ `pages_read_engagement`
   - ✅ `pages_manage_metadata`
5. Click **"Generate Access Token"**
6. Authorize the app if prompted
7. Copy the token shown (starts with `EAAB...`)

**This is a short-lived token (expires in ~1 hour).** You need to exchange it for a long-lived token.

#### Exchange for Long-Lived Token

1. Open a new browser tab
2. In the address bar, paste this URL (replace the placeholders):

```
https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_TOKEN
```

3. Replace:
   - `YOUR_APP_ID` → Your App ID from Step 3.1
   - `YOUR_APP_SECRET` → Your App Secret from Step 3.2
   - `SHORT_TOKEN` → The token you just copied

4. Press **Enter** to navigate to the URL
5. You'll see JSON response like:
   ```json
   {
     "access_token": "EAABwzLixZCZB8BO5ZC...",
     "token_type": "bearer",
     "expires_in": 5183944
   }
   ```
6. Copy the `access_token` value (the long token)
7. **Save this** - this is your Page Access Token

**Example:**
```
FACEBOOK_PAGE_ACCESS_TOKEN=EAABwzLixZCZB8BO5ZC...
```

#### Option B: Using Facebook Business Settings (Alternative)

1. Go to: **https://business.facebook.com/settings/**
2. Click **"System Users"** in the left sidebar
3. Click **"Add"** to create a new system user
4. Give it a name like "Lead Integration Bot"
5. Click **"Generate New Token"**
6. Select your app and page
7. Select permissions: `leads_retrieval`, `pages_read_engagement`
8. Copy the generated token

---

### 3.4 Generate FACEBOOK_VERIFY_TOKEN

This is a random string you create yourself. Facebook will use it to verify your webhook.

#### Option A: Using PowerShell (Windows)

1. Open **PowerShell**
2. Run this command:
   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```
3. Copy the generated string

#### Option B: Using Node.js

1. Open terminal/command prompt
2. Run:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Copy the generated string

#### Option C: Using Online Generator

1. Go to: **https://www.random.org/strings/**
2. Set:
   - **Length:** 32
   - **Characters:** Letters and Numbers
3. Click **"Generate"**
4. Copy the generated string

**Example:**
```
FACEBOOK_VERIFY_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3
```

⚠️ **Important:** Save this token - you'll need it when setting up the webhook in Facebook.

---

## Step 4: Configure Environment Variables

### 4.1 Locate Your `.env` File

1. Navigate to your server directory: `Server/`
2. Open the `.env` file in a text editor
3. If you don't have a `.env` file, create one

### 4.2 Add Facebook Credentials

Add these lines to your `.env` file (replace with your actual values):

```env
# Facebook Lead Ads Integration
FACEBOOK_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
FACEBOOK_PAGE_ACCESS_TOKEN=EAABwzLixZCZB8BO5ZC...
FACEBOOK_VERIFY_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3
FACEBOOK_APP_ID=123456789012345
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

### 4.3 Replace Placeholder Values

Replace each placeholder with your actual credentials:

- `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` → Your **App Secret** (from Step 3.2)
- `EAABwzLixZCZB8BO5ZC...` → Your **Page Access Token** (from Step 3.3)
- `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3` → Your **Verify Token** (from Step 3.4)
- `123456789012345` → Your **App ID** (from Step 3.1)
- `true` → Keep as `true` to auto-assign leads, or `false` to disable

### 4.4 Save the File

1. Save the `.env` file
2. **Restart your server** for changes to take effect:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm start
   # or
   node server.js
   ```

---

## Step 5: Set Up Webhook

### 5.1 Get Your Webhook URL

Your webhook URL should be:
```
https://yourdomain.com/api/v1/webhooks/facebook
```

Replace `yourdomain.com` with your actual domain.

**Examples:**
- Production: `https://api.tripskyway.com/api/v1/webhooks/facebook`
- Staging: `https://staging.tripskyway.com/api/v1/webhooks/facebook`
- Local testing: Use ngrok (see Step 7.2)

### 5.2 Configure Webhook in Facebook

1. Go to: **https://developers.facebook.com/apps/**
2. Select your app
3. In the left sidebar, click **"Webhooks"** (under Products)
4. If you don't see "Webhooks", click **"Add Product"** and add **"Webhooks"**

5. Click **"Add New Subscription"** or **"Edit Subscription"**
6. Select **"Page"** as the object type
7. Click **"Subscribe to this object"**

8. Fill in the webhook details:
   - **Callback URL:** `https://yourdomain.com/api/v1/webhooks/facebook`
   - **Verify Token:** Enter your `FACEBOOK_VERIFY_TOKEN` (from Step 3.4)
   - **Subscription Fields:** Check these boxes:
     - ✅ `leadgen`

9. Click **"Verify and Save"**

10. Facebook will send a GET request to your webhook URL to verify it
11. If verification succeeds, you'll see a green checkmark ✅

### 5.3 Subscribe to Your Page

1. After webhook is verified, you need to subscribe to your Facebook Page
2. In the Webhooks section, find your webhook
3. Click **"Manage Subscription"**
4. Under **"Subscribed Pages"**, click **"Add Page"**
5. Select your Facebook Business Page
6. Authorize the app if prompted

---

## Step 6: Create Lead Ad Form

### 6.1 Create Lead Ad Campaign

1. Go to: **https://business.facebook.com/adsmanager/**
2. Click **"Create"** button
3. Select **"Lead generation"** as campaign objective
4. Follow the campaign setup wizard:
   - **Campaign Name:** e.g., "Trip Sky Way Lead Generation"
   - **Budget:** Set your daily or lifetime budget
   - **Audience:** Define your target audience
   - **Placements:** Choose where ads will appear

### 6.2 Create Lead Form

1. In the ad creation flow, you'll be asked to create a **Lead Form**
2. Click **"Create Form"** or **"Use Existing Form"**
3. Fill in form details:
   - **Form Name:** e.g., "Travel Inquiry Form"
   - **Headline:** e.g., "Get Your Dream Trip Quote"
   - **Description:** Brief description of what users will get

4. **Add Form Fields:**
   - ✅ Full Name (required)
   - ✅ Email (required)
   - ✅ Phone Number (required)
   - ✅ Destination (optional - custom field)
   - ✅ Travel Date (optional - custom field)
   - ✅ Number of Travelers (optional - custom field)
   - ✅ Budget (optional - custom field)
   - ✅ Message/Comments (optional - custom field)

5. **Privacy Policy:** Add link to your privacy policy
6. **Thank You Screen:** Customize the message users see after submitting
7. Click **"Finish"** to create the form

### 6.3 Publish Your Ad

1. Complete the ad creative (image/video, ad copy)
2. Review your campaign settings
3. Click **"Publish"** to launch your ad

---

## Step 7: Test the Integration

### 7.1 Test Webhook Verification (GET Request)

1. Make sure your server is running
2. Open a browser or use a tool like Postman
3. Send a GET request to your webhook URL with these query parameters:

```
GET https://yourdomain.com/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123
```

Replace:
- `yourdomain.com` → Your actual domain
- `YOUR_VERIFY_TOKEN` → Your verify token from `.env`

4. **Expected Response:** The server should return `test123` (the challenge value)
5. If you get `test123` back, webhook verification is working! ✅

### 7.2 Test with Local Development (Using ngrok)

If testing locally, use ngrok to expose your local server:

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or using npm:
   npm install -g ngrok
   ```

2. **Start your local server:**
   ```bash
   cd Server
   npm start
   # Server should be running on http://localhost:5000 (or your port)
   ```

3. **Start ngrok:**
   ```bash
   ngrok http 5000
   # Replace 5000 with your server port
   ```

4. **Copy the HTTPS URL** ngrok provides (e.g., `https://abc123.ngrok.io`)

5. **Use this URL for webhook:**
   ```
   https://abc123.ngrok.io/api/v1/webhooks/facebook
   ```

6. **Update webhook in Facebook** with the ngrok URL
7. **Test the webhook** (see Step 7.1)

⚠️ **Note:** ngrok URLs change each time you restart ngrok. For production, use a permanent domain.

### 7.3 Test Lead Submission

1. **Submit a test lead** through your Facebook Lead Ad:
   - Go to your Facebook Page
   - Find your lead ad
   - Click on it and fill out the form
   - Submit the form

2. **Check your server logs:**
   ```bash
   # In your server terminal, you should see:
   # "Facebook webhook verified successfully"
   # "Successfully processed Facebook lead: [leadgen_id]"
   # "Created new lead from Facebook: [lead_id]"
   ```

3. **Check your database:**
   - Go to your Lead Management system
   - Look for a new lead with source "social-media"
   - Verify the lead data matches what you submitted

4. **Check lead details:**
   - The lead should have:
     - Name, email, phone from the form
     - Source: "social-media"
     - Platform: "Social Media"
     - Tags: "Facebook Ad: [ad_name]"
     - Remarks with campaign and ad information

### 7.4 Test Duplicate Detection

1. **Submit the same lead again** (same email/phone)
2. **Check server logs:**
   - Should see: "Duplicate lead detected: [email/phone] - skipping creation"
3. **Check database:**
   - No new lead should be created
   - Existing lead should have a new remark about the duplicate submission

---

## Step 8: Monitor and Troubleshoot

### 8.1 Check Server Logs

Monitor your server logs for webhook activity:

```bash
# Look for these log messages:
# ✅ "Facebook webhook verified successfully"
# ✅ "Successfully processed Facebook lead: [id]"
# ✅ "Created new lead from Facebook: [id]"
# ⚠️ "Duplicate lead detected: [email] - skipping creation"
# ❌ "Error processing Facebook lead: [error]"
```

### 8.2 Check Facebook Webhook Logs

1. Go to: **https://developers.facebook.com/apps/**
2. Select your app
3. Click **"Webhooks"** in left sidebar
4. Click on your webhook subscription
5. View **"Recent Deliveries"** to see webhook requests and responses

### 8.3 Monitor Lead Creation

1. Check your Lead Management dashboard regularly
2. Filter leads by source: "social-media"
3. Verify lead data is complete and accurate
4. Check if auto-assignment is working (if enabled)

---

## Troubleshooting

### Issue 1: Webhook Verification Fails

**Symptoms:**
- Facebook shows "Webhook verification failed"
- GET request returns 403 error

**Solutions:**
1. ✅ Check that `FACEBOOK_VERIFY_TOKEN` in `.env` matches the token you entered in Facebook
2. ✅ Ensure your server is running and accessible
3. ✅ Verify the webhook URL is correct (HTTPS required)
4. ✅ Check server logs for error messages
5. ✅ Make sure the route is registered in `server.js`:
   ```javascript
   app.use(`/api/${API_VERSION}/webhooks`, webhookRoutes);
   ```

### Issue 2: Leads Not Being Created

**Symptoms:**
- Webhook is verified, but no leads appear in database

**Solutions:**
1. ✅ Check server logs for errors
2. ✅ Verify `FACEBOOK_PAGE_ACCESS_TOKEN` is valid and not expired
3. ✅ Check that the webhook is subscribed to the correct page
4. ✅ Verify the lead form fields match what the mapper expects
5. ✅ Check database connection
6. ✅ Ensure Lead model is properly configured

### Issue 3: Invalid Access Token Error

**Symptoms:**
- Server logs show "Facebook API Error: Invalid access token"

**Solutions:**
1. ✅ Regenerate Page Access Token (see Step 3.3)
2. ✅ Exchange short-lived token for long-lived token
3. ✅ Update `FACEBOOK_PAGE_ACCESS_TOKEN` in `.env`
4. ✅ Restart server after updating `.env`

### Issue 4: Webhook Signature Verification Fails

**Symptoms:**
- Server logs show "Webhook signature verification failed"

**Solutions:**
1. ✅ Verify `FACEBOOK_APP_SECRET` is correct in `.env`
2. ✅ Check that your server is receiving the raw request body
3. ✅ Ensure `X-Hub-Signature-256` header is being sent by Facebook
4. ✅ In development, signature verification may be skipped (check `NODE_ENV`)

### Issue 5: Duplicate Leads Being Created

**Symptoms:**
- Same lead appears multiple times in database

**Solutions:**
1. ✅ Check duplicate detection logic in `facebookLeadMapper.js`
2. ✅ Verify email/phone normalization is working
3. ✅ Check that `checkDuplicateLead` function is being called
4. ✅ Review server logs for duplicate detection messages

### Issue 6: Missing Lead Data

**Symptoms:**
- Lead is created but some fields are empty

**Solutions:**
1. ✅ Check Facebook form field names match mapper expectations
2. ✅ Review `facebookLeadMapper.js` to see which fields it looks for
3. ✅ Update mapper to match your Facebook form field names
4. ✅ Check Facebook Lead Ad form configuration

### Issue 7: Auto-Assignment Not Working

**Symptoms:**
- Leads are created but not assigned to sales reps

**Solutions:**
1. ✅ Verify `AUTO_ASSIGN_FACEBOOK_LEADS=true` in `.env`
2. ✅ Check that sales reps exist in the system
3. ✅ Verify assignment service is working
4. ✅ Check server logs for assignment errors

---

## Quick Reference

### Environment Variables Checklist

```env
✅ FACEBOOK_APP_SECRET=your_app_secret_here
✅ FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token_here
✅ FACEBOOK_VERIFY_TOKEN=your_verify_token_here
✅ FACEBOOK_APP_ID=your_app_id_here
✅ AUTO_ASSIGN_FACEBOOK_LEADS=true
```

### Webhook URL Format

```
https://yourdomain.com/api/v1/webhooks/facebook
```

### API Endpoints

- **GET** `/api/v1/webhooks/facebook` - Webhook verification
- **POST** `/api/v1/webhooks/facebook` - Receive lead data

### Important Files

- `Server/src/routes/webhook.routes.js` - Webhook routes
- `Server/src/controllers/facebookWebhook.controller.js` - Webhook controller
- `Server/src/services/facebook.service.js` - Facebook API service
- `Server/src/utils/facebookLeadMapper.js` - Lead data mapper
- `Server/src/server.js` - Server configuration (registers routes)

---

## Next Steps

After successful integration:

1. ✅ Monitor lead quality and conversion rates
2. ✅ Adjust Facebook form fields based on your needs
3. ✅ Optimize ad targeting and budget
4. ✅ Set up notifications for new leads (optional)
5. ✅ Create reports on Facebook lead performance

---

## Support

If you encounter issues not covered in this guide:

1. Check server logs for detailed error messages
2. Review Facebook Webhook documentation: https://developers.facebook.com/docs/graph-api/webhooks
3. Check Facebook Lead Ads documentation: https://www.facebook.com/business/help/402611946561330
4. Review your code implementation in the files listed above

---

## Security Best Practices

1. ✅ **Never commit `.env` file to version control**
2. ✅ **Keep App Secret secure** - regenerate if exposed
3. ✅ **Use HTTPS** for webhook URLs (required by Facebook)
4. ✅ **Verify webhook signatures** in production
5. ✅ **Rotate access tokens** periodically
6. ✅ **Monitor webhook logs** for suspicious activity
7. ✅ **Limit access** to Facebook Developer account

---

**Last Updated:** 2024
**Version:** 1.0

