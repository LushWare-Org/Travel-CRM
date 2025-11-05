# What You'll See in the Logs - Email Service Fix

## When Email Service is Working Correctly ✅

### Server Startup Logs
```
[INFO] MongoDB Connected: ac-wkl8uzy-shard-00-01.vl138l0.mongodb.net
[INFO] Server running in development mode on port 5000

✅ Email service configured: smtp.gmail.com:587 (Secure: false)
[INFO] Email service connected successfully
```

### When Creating Admin User - Success
```json
{
  "level": "info",
  "message": "User created successfully: admin@example.com (Role: admin) by superadmin@example.com",
  "timestamp": "2025-11-03 10:30:45"
}

{
  "level": "info",
  "message": "Invitation email sent to admin@example.com",
  "timestamp": "2025-11-03 10:30:46"
}
```

Admin receives email ✅

---

## When Email Configuration is Missing ⚠️

### Server Startup Logs
```
[INFO] MongoDB Connected: ac-wkl8uzy-shard-00-01.vl138l0.mongodb.net
[INFO] Server running in development mode on port 5000

⚠️  Email configuration incomplete. These env variables are required:
  - EMAIL_PASSWORD (app-specific password for Gmail)
Email sending will not work until these are configured.
```

### When Creating Admin User - Silent Failure
```json
{
  "level": "info",
  "message": "User created successfully: admin@example.com (Role: admin) by superadmin@example.com",
  "timestamp": "2025-11-03 10:30:45"
}

{
  "level": "error",
  "message": "Failed to send invitation email to admin@example.com: Email configuration is incomplete. Check EMAIL_HOST, EMAIL_PORT, and EMAIL_FROM in .env",
  "timestamp": "2025-11-03 10:30:46"
}

{
  "level": "warn",
  "message": "User created but email delivery failed - admin should manually notify: admin@example.com",
  "timestamp": "2025-11-03 10:30:46"
}
```

Admin created ✓ but no email received ❌

**Solution:** Check your `.env` and add missing EMAIL_PASSWORD

---

## When Gmail Password is Wrong ❌

### Server Startup Logs
```
[INFO] MongoDB Connected: ac-wkl8uzy-shard-00-01.vl138l0.mongodb.net
[INFO] Server running in development mode on port 5000

✅ Email service configured: smtp.gmail.com:587 (Secure: false)

{
  "level": "error",
  "message": "Email service verification failed: Invalid login",
  "code": "EAUTH",
  "response": "535 5.7.8 Username and password not accepted"
}
```

### When Creating Admin User - Auth Error
```json
{
  "level": "info",
  "message": "User created successfully: admin@example.com (Role: admin) by superadmin@example.com",
  "timestamp": "2025-11-03 10:30:45"
}

{
  "level": "error",
  "message": "Failed to send invitation email to admin@example.com: Invalid login",
  "code": "EAUTH",
  "response": "535 5.7.8 Username and password not accepted",
  "timestamp": "2025-11-03 10:30:46"
}

{
  "level": "warn",
  "message": "User created but email delivery failed - admin should manually notify: admin@example.com",
  "timestamp": "2025-11-03 10:30:46"
}
```

**Solution:** Use app-specific password for Gmail, not regular password. Get it from [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

---

## When SMTP Host is Unreachable ❌

### Server Startup Logs
```
[INFO] MongoDB Connected: ac-wkl8uzy-shard-00-01.vl138l0.mongodb.net
[INFO] Server running in development mode on port 5000

✅ Email service configured: wrong-host.example.com:587 (Secure: false)

{
  "level": "error",
  "message": "Email service verification failed: getaddrinfo ENOTFOUND wrong-host.example.com",
  "code": "ENOTFOUND",
  "response": "System error"
}
```

### When Creating Admin - Connection Error
```json
{
  "level": "error",
  "message": "Failed to send invitation email to admin@example.com: getaddrinfo ENOTFOUND wrong-host.example.com",
  "code": "ENOTFOUND",
  "response": "System error",
  "timestamp": "2025-11-03 10:30:46"
}
```

**Solution:** Check EMAIL_HOST value. For Gmail, it should be: `smtp.gmail.com`

---

## When Connection Times Out ⏱️

### Server Startup Logs
```
[INFO] MongoDB Connected: ac-wkl8uzy-shard-00-01.vl138l0.mongodb.net
[INFO] Server running in development mode on port 5000

✅ Email service configured: smtp.gmail.com:465 (Secure: true)

{
  "level": "error",
  "message": "Email service verification failed: connect ETIMEDOUT",
  "code": "ETIMEDOUT",
  "response": "Connection timeout"
}
```

**Solution:** Try changing EMAIL_SECURE and EMAIL_PORT:
- For insecure: EMAIL_PORT=587, EMAIL_SECURE=false
- For secure: EMAIL_PORT=465, EMAIL_SECURE=true

---

## Where to Find Error Logs

### Log Files
- **Error log:** `Server/logs/error.log`
- **Combined log:** `Server/logs/combined.log`
- **Console:** When running with `npm start`

### View Recent Errors
```powershell
# Last 50 errors
Get-Content "Server/logs/error.log" -Tail 50

# Last 100 lines of combined log
Get-Content "Server/logs/combined.log" -Tail 100

# Watch logs in real-time
Get-Content "Server/logs/error.log" -Wait -Tail 10
```

---

## Quick Diagnosis Flowchart

```
Create Admin
    ↓
Does admin appear in database? → NO: Connection issue
    ↓ YES
    ↓
Did email arrive? → YES: Everything works ✅
    ↓ NO
    ↓
Check Server/logs/error.log for:
    ↓
    ├─→ "Invalid login" / "5.7.8" → Use app-specific password
    ├─→ "EAUTH" → Wrong EMAIL_USER or EMAIL_PASSWORD
    ├─→ "ENOTFOUND" → Wrong EMAIL_HOST
    ├─→ "ETIMEDOUT" → Network issue or wrong port
    ├─→ "incomplete" → Missing .env variables
    └─→ Other error → See TROUBLESHOOTING_GUIDE.md
```

---

## Testing Email Manually

### Create Test Endpoint
Add to your routes:
```javascript
// Test route - DELETE after testing!
router.post('/test-email', async (req, res) => {
  try {
    const testUser = { name: 'Test', email: 'your-email@gmail.com' };
    await emailService.sendStaffCredentials(testUser, 'test123', 'admin');
    res.json({ status: 'Email sent' });
  } catch (error) {
    res.status(500).json({ status: 'Failed', error: error.message });
  }
});
```

### Test It
```powershell
curl -X POST http://localhost:5000/api/v1/test-email
```

### Check Response
- Success: `{ "status": "Email sent" }`
- Failure: `{ "status": "Failed", "error": "Invalid login" }`

---

## Summary Table

| Scenario | Startup Message | User Created | Email Sent | Action |
|----------|-----------------|-------------|-----------|--------|
| ✅ Working | ✅ Service configured | ✓ | ✓ | None - working! |
| ⚠️ Config missing | ⚠️ Incomplete config | ✓ | ✗ | Add missing .env vars |
| ❌ Wrong password | ✅ Configured | ✓ | ✗ | Use app password for Gmail |
| ❌ Wrong host | ✅ Configured | ✓ | ✗ | Check EMAIL_HOST value |
| ❌ Connection timeout | ❌ Verification failed | ✓ | ✗ | Check EMAIL_PORT/SECURE |

---

**Pro Tip:** Always check the startup logs first - they tell you if email will work before any send attempts!
