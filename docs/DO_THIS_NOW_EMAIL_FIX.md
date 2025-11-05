# 🎯 EMAIL SERVICE FIX - DO THIS NOW

## The Problem
✗ Emails not sending when creating admin users  
✗ No error messages showing why  
✗ Can't debug the issue  

## The Solution (3 Easy Steps)

---

## STEP 1: Get Gmail App Password ⏱️ 2 minutes

### Only if using Gmail:
1. Go to: https://myaccount.google.com/apppasswords
2. If 2FA isn't enabled, do it first at: https://myaccount.google.com/security
3. Select "Mail" and "Windows Computer"
4. Google generates a 16-character password like: `abcd efgh ijkl mnop`
5. Copy it (without the spaces)

**For other email providers:** See `Server/docs/EMAIL_SERVICE_TROUBLESHOOTING.md`

---

## STEP 2: Update Your `.env` File ⏱️ 1 minute

**Location:** `Server/.env`

```env
# Email Configuration (Nodemailer) - Gmail Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=Trip Sky Way <your-email@gmail.com>
```

**IMPORTANT:**
- Replace `your-email@gmail.com` with YOUR email
- Replace `abcdefghijklmnop` with the 16-char password from Step 1
- Remove the spaces from the password
- Use regular password if NOT using Gmail
- Never share this file!

---

## STEP 3: Restart Server ⏱️ 30 seconds

Open PowerShell and run:

```powershell
# Kill the running server
Get-Process node | Stop-Process -Force

# Go to Server folder
cd Server

# Start it again
npm start
```

---

## 🎉 Verify It Works

When the server starts, look for this message:

```
✅ Email service configured: smtp.gmail.com:587 (Secure: false)
Email service connected successfully
```

If you see it → **You're done!** ✅

If you see a warning → **Check which env variable is missing**

---

## Test It

1. Go to Management app
2. Create a new admin user
3. Check your email inbox
4. You should see the welcome email

---

## If It Still Doesn't Work

### Check the error message in logs:

```powershell
# View last 20 error lines
Get-Content "Server/logs/error.log" -Tail 20
```

### Common errors and fixes:

| Error | Fix |
|-------|-----|
| `Invalid login` or `5.7.8` | You're using regular Gmail password. Use the 16-char app password from Step 1 |
| `EAUTH` | Wrong EMAIL_USER or EMAIL_PASSWORD |
| `ENOTFOUND` | Wrong EMAIL_HOST. Use: `smtp.gmail.com` |
| `incomplete` | Missing an env variable. Check .env file |
| `ETIMEDOUT` | Try changing EMAIL_SECURE to `true` and EMAIL_PORT to `465` |

### Need more help?

See: `Server/docs/EMAIL_SERVICE_TROUBLESHOOTING.md`

---

## ⏱️ Total Time: ~5 Minutes

- Get password: 2 min
- Update .env: 1 min  
- Restart: 30 sec
- Verify: 30 sec
- Test: 1 min

**Done!** 🎉

---

## Key Files You Need

- `.env` - Add your email password here
- `Server/logs/error.log` - Check if something goes wrong
- `Server/docs/EMAIL_SERVICE_TROUBLESHOOTING.md` - Full troubleshooting guide

---

## Don't Forget

✅ Use APP-SPECIFIC PASSWORD for Gmail (not your regular password)  
✅ Remove spaces from the 16-char password  
✅ Restart the server after changing .env  
✅ Check startup logs for confirmation  
✅ Test by creating a new admin user  

---

**That's it! Email sending should now work.** ✅

If you have any issues, all error messages are now visible in the server logs with helpful information about what went wrong.
