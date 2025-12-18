# Testing Guide - OTP Login Fix

## ✅ All Test Scenarios

### Scenario 1: Sales Rep Using Regular Login (OLD WAY - Now Fixed)

**Steps:**
1. Navigate to `http://localhost:5174/login`
2. Enter:
   - Email: `amal@tripskyway.com`
   - Password: `Sales@123456`
3. Click "Sign In"

**Expected Behavior:**
- ✅ Backend validates credentials
- ✅ Backend detects role = 'salesRep'
- ✅ Backend generates and sends OTP
- ✅ Frontend receives `requiresOTP: true` in response
- ✅ User automatically redirected to `/sales-rep-login-otp`
- ✅ OTP verification page appears
- ✅ "We've sent a 6-digit code to am***@tripskyway.com"
- ✅ User checks email for OTP
- ✅ User enters OTP
- ✅ User logs in successfully ✓

**What Changed:**
Before: Sales rep could login directly (WRONG ❌)
After: Sales rep MUST verify OTP (CORRECT ✅)

---

### Scenario 2: Sales Rep Using Direct OTP Form

**Steps:**
1. Navigate to `http://localhost:5174/sales-rep-login`
2. Enter:
   - Email: `amal@tripskyway.com`
   - Password: `Sales@123456`
3. Click "Next: Verify with OTP"
4. Check email for OTP
5. Enter OTP code
6. Click "Complete Login"

**Expected Behavior:**
- ✅ Same OTP flow as Scenario 1
- ✅ Alternative entry point
- ✅ More explicit OTP experience
- ✅ User logs in successfully ✓

---

### Scenario 3: Admin Using Regular Login

**Steps:**
1. Navigate to `http://localhost:5174/login`
2. Enter:
   - Email: `admin@tripskyway.com`
   - Password: `Admin@123456`
3. Click "Sign In"

**Expected Behavior:**
- ✅ Backend validates credentials
- ✅ Backend detects role = 'admin'
- ✅ Backend skips OTP (not a sales rep)
- ✅ User logs in directly without OTP
- ✅ Dashboard appears immediately ✓

**What Should NOT Change:**
- Admin login should work as before
- No OTP required for admins

---

### Scenario 4: Vendor Using Regular Login

**Steps:**
1. Navigate to `http://localhost:5174/login`
2. Enter vendor credentials
3. Click "Sign In"

**Expected Behavior:**
- ✅ Backend validates credentials
- ✅ Backend detects role = 'vendor'
- ✅ Backend skips OTP (not a sales rep)
- ✅ User logs in directly
- ✅ Dashboard appears ✓

---

### Scenario 5: Invalid OTP Entry

**Starting Point:** OTP verification page

**Steps:**
1. Receive OTP via email
2. Enter wrong code (e.g., "000000")
3. Click "Complete Login"

**Expected Behavior:**
- ❌ Error message: "Invalid OTP"
- ❌ Shows attempt count: "(4 attempts remaining)"
- ✅ User can try again
- ✅ OTP code still valid

**After 5 Wrong Attempts:**
- ❌ Error: "Too many failed attempts"
- ❌ User redirected to `/login`
- ❌ OTP session cleared
- ✅ User must start over

---

### Scenario 6: OTP Expiration

**Starting Point:** OTP verification page (waiting)

**Steps:**
1. Wait 10 minutes without entering OTP
2. Timer shows "0:00"
3. Try to submit

**Expected Behavior:**
- ❌ Message: "OTP expired"
- ✅ "Resend OTP" button becomes active
- ✅ Click "Resend OTP"
- ✅ New OTP sent
- ✅ Timer resets to 10:00
- ✅ User can retry

---

### Scenario 7: Resend OTP

**Starting Point:** OTP verification page

**Steps:**
1. Resend button available after 60 seconds
2. Click "Resend OTP"
3. Wait 60 seconds
4. Click "Resend OTP" again

**Expected Behavior:**
- 0-60 seconds: "Resend in Xs" (disabled)
- 60+ seconds: "Resend OTP" (enabled)
- ✅ New OTP sent to email
- ✅ Timer resets to 10:00
- ✅ Attempt counter resets
- ✅ Can try up to 5 times with new OTP

---

### Scenario 8: Back Button Navigation

**Starting Point:** OTP verification page

**Steps:**
1. Click "Back to Email & Password"

**Expected Behavior:**
- ✅ Redirected to `/login`
- ✅ OTP session cleared from localStorage
- ✅ Can re-enter credentials
- ✅ New OTP generated on next attempt

---

### Scenario 9: Direct URL Access to OTP Page (Without Session)

**Steps:**
1. Navigate directly to `http://localhost:5174/sales-rep-login-otp`
2. WITHOUT going through login first

**Expected Behavior:**
- ❌ No temporary token in localStorage
- ❌ Component detects missing data
- ❌ Auto-redirects to `/login`
- ✅ User cannot access OTP page without proper session

---

## 📊 Behavior Comparison Matrix

| User Role | Entry Point | OTP Required? | Behavior |
|-----------|-------------|---------------|----------|
| Sales Rep | `/login` | YES | Redirects to OTP page |
| Sales Rep | `/sales-rep-login` | YES | Shows OTP after credentials |
| Admin | `/login` | NO | Direct login |
| Vendor | `/login` | NO | Direct login |
| Any | `/sales-rep-login-otp` (no session) | - | Redirects to `/login` |

---

## 🔍 What to Check in Browser DevTools

### Network Tab
```
1. POST /auth/login
   Request: { email, password }
   Response: { requiresOTP: true, tempToken, maskedEmail }

2. POST /auth/resend-otp
   Request: { tempToken }
   Response: { maskedEmail, expiresIn }

3. POST /auth/login-step2
   Request: { tempToken, otp }
   Response: { token, user }
```

### LocalStorage Tab
```
After credentials submit (if sales rep):
  - otpTempToken: "eyJ..."
  - otpMaskedEmail: "am***@tripskyway.com"

After OTP submit (successful):
  - token: "eyJ..."
  - user: "{...user object...}"
  - otpTempToken: (cleared)
  - otpMaskedEmail: (cleared)
```

### Console Tab
```
No errors should appear during:
- Login flow
- OTP submission
- Navigation
```

---

## 🎯 Expected Email Content

### OTP Email
```
From: Trip Sky Way <anuradhaanupamaherath@gmail.com>
Subject: Your Trip Sky Way Login OTP Code

Dear Amal,

Your one-time password (OTP) for logging in is:

[123456]  ← 6-digit code

⏱️ Valid for 10 minutes

⚠️ Important:
- Never share this OTP with anyone
- We will never ask for it via email or phone
- If you didn't request this, ignore this email
```

---

## ✅ Checklist Before Deployment

- [ ] Test Scenario 1: Sales rep regular login with OTP
- [ ] Test Scenario 2: Sales rep direct OTP form
- [ ] Test Scenario 3: Admin login (no OTP)
- [ ] Test Scenario 4: Vendor login (no OTP)
- [ ] Test Scenario 5: Invalid OTP attempts
- [ ] Test Scenario 6: OTP expiration
- [ ] Test Scenario 7: Resend OTP
- [ ] Test Scenario 8: Back navigation
- [ ] Test Scenario 9: Direct URL access without session
- [ ] Check Network tab in DevTools
- [ ] Check localStorage updates
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Test on different browsers
- [ ] Verify email delivery
- [ ] Check all error messages are clear
- [ ] Verify timer countdown
- [ ] Test resend cooldown

---

## 🐛 Troubleshooting

| Issue | Check | Fix |
|-------|-------|-----|
| OTP not received | Check spam folder | Verify email configuration in .env |
| "Invalid temporary token" | Token expired (15 min) | Clear localStorage, login again |
| Cannot click Resend button | Within 60-sec cooldown | Wait for timer |
| OTP screen shows blank email | Missing localStorage | Use proper login flow |
| Direct URL access fails | No temp token | Access via `/login` first |
| Attempt counter not showing | Less than 1 failure | Try wrong OTP first |
| Page refresh breaks flow | Session lost | Stores in localStorage, should work |
| Backend not sending OTP | Email config | Check .env email settings |

---

## 📝 Notes

- All tests should be done with both test sales reps:
  - amal@tripskyway.com
  - kamal@tripskyway.com
  - nimal@tripskyway.com
- Clear localStorage between tests for clean state
- Check server logs for any errors
- Monitor email delivery
- Test with both fast and slow networks

---

**Status:** ✅ Ready for Testing
