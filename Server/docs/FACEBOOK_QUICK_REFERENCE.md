# Facebook Integration - Quick Reference Guide

## 🚀 Quick Setup Checklist

### 1. Add to `.env` File

Open `Server/.env` and add these lines:

```env
# Facebook Lead Ads Integration
FACEBOOK_APP_SECRET=REPLACE_WITH_YOUR_APP_SECRET
FACEBOOK_PAGE_ACCESS_TOKEN=REPLACE_WITH_YOUR_PAGE_TOKEN
FACEBOOK_VERIFY_TOKEN=REPLACE_WITH_RANDOM_STRING
FACEBOOK_APP_ID=REPLACE_WITH_YOUR_APP_ID
AUTO_ASSIGN_FACEBOOK_LEADS=true
```

---

## 📍 Where to Get Each Value

### `FACEBOOK_APP_SECRET`
**Location:** https://developers.facebook.com/apps/{your-app-id}/settings/basic/
1. Go to Facebook Developers
2. Select your app
3. Settings > Basic
4. Find "App Secret"
5. Click "Show" and copy
6. **REPLACE:** `REPLACE_WITH_YOUR_APP_SECRET`

---

### `FACEBOOK_PAGE_ACCESS_TOKEN`
**Location:** https://developers.facebook.com/tools/explorer/
1. Go to Graph API Explorer
2. Select your app
3. Generate token with permissions: `leads_retrieval`, `pages_read_engagement`
4. Exchange for long-lived token (see full guide)
5. **REPLACE:** `REPLACE_WITH_YOUR_PAGE_TOKEN`

---

### `FACEBOOK_VERIFY_TOKEN`
**Generate a random string:**
```bash
# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use online generator: https://www.random.org/strings/
```
**REPLACE:** `REPLACE_WITH_RANDOM_STRING` with your generated string

---

### `FACEBOOK_APP_ID`
**Location:** https://developers.facebook.com/apps/{your-app-id}/settings/basic/
1. Same page as App Secret
2. Copy "App ID"
3. **REPLACE:** `REPLACE_WITH_YOUR_APP_ID`

---

## 🔗 Webhook URL

Your webhook endpoint will be:
```
https://yourdomain.com/api/v1/webhooks/facebook
```

**For local testing (ngrok):**
```
https://abc123.ngrok.io/api/v1/webhooks/facebook
```

---

## ✅ What to Replace

| In File | Replace This | With This |
|---------|-------------|-----------|
| `.env` | `REPLACE_WITH_YOUR_APP_SECRET` | Your Facebook App Secret |
| `.env` | `REPLACE_WITH_YOUR_PAGE_TOKEN` | Your Page Access Token |
| `.env` | `REPLACE_WITH_RANDOM_STRING` | Your generated verify token |
| `.env` | `REPLACE_WITH_YOUR_APP_ID` | Your Facebook App ID |
| Facebook Webhook Settings | Webhook URL | `https://yourdomain.com/api/v1/webhooks/facebook` |
| Facebook Webhook Settings | Verify Token | Same as `FACEBOOK_VERIFY_TOKEN` in `.env` |

---

## 🧪 Test After Setup

1. **Test Webhook Verification:**
   - Facebook will automatically verify when you add webhook
   - Check server logs: Should see "Facebook webhook verified successfully"

2. **Test Lead Processing:**
   - Submit a test Lead Ad form
   - Check server logs: Should see "Created new lead from Facebook"
   - Check database: New lead should appear

---

## 📚 Full Documentation

See `Server/docs/FACEBOOK_INTEGRATION_SETUP.md` for complete setup instructions.

---

## ⚠️ Important Notes

- **Never commit `.env` file** to version control
- **Keep tokens secure** - don't share them
- **Tokens expire** - Page Access Token expires in ~60 days
- **HTTPS required** - Production webhook must use HTTPS
- **Test first** - Always test in development before production


