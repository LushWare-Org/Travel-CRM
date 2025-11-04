# Email Service Troubleshooting Guide

## Issues Found and Fixed

### ✅ Issue 1: Missing Email Service Connection Verification
**Problem:** The email transporter was created but never verified to be working.

**Fix:** Added `verifyConnection()` method that tests the SMTP connection on startup and logs the result.

### ✅ Issue 2: Silent Email Failures
**Problem:** When email sending failed during admin creation, errors were logged as warnings and silently ignored.

**Fix:** 
- Improved error handling to log with `error()` level instead of `warn()`
- Added detailed error information including SMTP response codes
- Better logging to admin about email delivery failures

### ✅ Issue 3: Incomplete Configuration Validation
**Problem:** No early validation of email configuration variables.

**Fix:** Added startup configuration validation in `email.js` that:
- Checks all required env variables
- Logs which ones are missing
- Informs admin at server startup if email won't work

---

## Gmail SMTP Setup (Most Common Issue)

If you're using Gmail, follow these steps:

### Step 1: Enable 2-Factor Authentication
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled

### Step 2: Create an App Password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer" (or your device)
3. Google will generate a 16-character password
4. Copy this password (without spaces)

### Step 3: Update Your `.env` File
```env
# Email Configuration (Nodemailer) - Gmail Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx    # Your 16-character app password (without spaces)
EMAIL_FROM=Trip Sky Way <your-email@gmail.com>
```

⚠️ **IMPORTANT:** 
- Do NOT use your regular Gmail password
- Use the 16-character app password generated in Step 2
- Remove spaces from the app password if present
- Never commit `.env` to version control

### Step 4: Verify Configuration
When you restart the server, you should see in logs:
```
✅ Email service configured: smtp.gmail.com:587 (Secure: false)
Email service connected successfully
```

If you see warnings instead, check which variables are missing.

---

## For Other Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=Trip Sky Way <your-email@outlook.com>
```

### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your-sendgrid-api-key
EMAIL_FROM=Trip Sky Way <your-email@sendgrid.com>
```

### AWS SES
```env
EMAIL_HOST=email-smtp.region.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-ses-username
EMAIL_PASSWORD=your-ses-password
EMAIL_FROM=Trip Sky Way <your-verified-email@domain.com>
```

---

## Testing Email Functionality

### Manual Test Endpoint
Create a test endpoint to verify email works:

```javascript
// Add to your routes for testing
router.post('/test-email', async (req, res) => {
  try {
    const testUser = {
      name: 'Test User',
      email: 'your-email@gmail.com' // Change this
    };
    
    await emailService.sendStaffCredentials(
      testUser, 
      'testpassword123', 
      'admin'
    );
    
    res.json({ status: 'Email sent successfully' });
  } catch (error) {
    res.status(500).json({ 
      status: 'Email failed', 
      error: error.message 
    });
  }
});
```

### Check Server Logs
When creating an admin, check the server logs for:

**SUCCESS:**
```json
{
  "level": "info",
  "message": "Invitation email sent to admin@example.com",
  "timestamp": "2025-11-03 10:30:45"
}
```

**FAILURE:**
```json
{
  "level": "error",
  "message": "Failed to send invitation email to admin@example.com: Invalid login",
  "code": "EAUTH",
  "response": "535 5.7.8 Username and password not accepted"
}
```

---

## Common Error Codes

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `EAUTH` | Invalid credentials | Check EMAIL_USER and EMAIL_PASSWORD |
| `EHOSTUNREACH` | Can't reach SMTP server | Check EMAIL_HOST and EMAIL_PORT |
| `ETIMEDOUT` | Connection timeout | Check firewall/network, try EMAIL_SECURE=true |
| `ECONNREFUSED` | Connection refused | Verify EMAIL_HOST and EMAIL_PORT |
| `535 5.7.8` (Gmail) | Invalid password | Use app-specific password, not regular password |

---

## Debugging Steps

1. **Restart the server** and watch startup logs for configuration validation
2. **Check logs/** folder:
   - `logs/error.log` - Email error details
   - `logs/combined.log` - All activity including successful sends
3. **Monitor browser console** when creating admin - check for error messages
4. **Test with a valid recipient email** you can access
5. **Check Gmail security notifications** - Google may be blocking the connection

---

## Admin Notification When Email Fails

If email fails but the admin is still created, you should:
1. Check the error logs
2. Fix the email configuration
3. Manually notify the admin of their password
4. Test sending another email

The system will attempt to send the email, and if it fails:
- The error is logged with details
- The admin user is still created successfully
- You can retry sending the welcome email later

---

## After Configuration

1. Restart the server
2. Check logs for "Email service configured" message
3. Create a new admin user
4. Check if welcome email is received
5. If not received, check error logs for specific error message

For issues, check the logs in `Server/logs/error.log` and `Server/logs/combined.log`.
