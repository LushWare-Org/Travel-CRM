# Email OTP Authentication Implementation - Complete Guide

## ✅ Implementation Summary

Email OTP (One-Time Password) authentication has been successfully implemented for the admin panel. Admins and super admins must now verify their identity with an OTP code sent to their email before gaining access.

---

## 🎯 Features Implemented

### 1. **Backend - OTP Infrastructure**

#### User Model Updates ([user.model.js](Server/src/models/user.model.js))
- **OTP Fields Added:**
  - `isOtpEnabled` (Boolean) - Enable/disable OTP for user (default: true for admins)
  - `otpCode` (String) - Hashed OTP code
  - `otpExpire` (Date) - OTP expiration timestamp
  - `otpAttempts` (Number) - Failed attempt counter
  - `otpAttemptsResetAt` (Date) - Attempt reset timestamp
  - `lastOtpSentAt` (Date) - Last OTP send timestamp
  - `isOtpVerified` (Boolean) - Whether OTP is verified for current session
  - `otpMethod` (String) - Delivery method (email/sms/authenticator)

#### OTP Service ([otpService.js](Server/src/utils/otpService.js))
- `generateOtpCode()` - Creates 6-digit random OTP
- `hashOtp()` - Securely hashes OTP for storage
- `verifyOtp()` - Compares entered OTP with stored hash
- `isOtpExpired()` - Checks if OTP has expired
- `getOtpTimeRemaining()` - Returns minutes left before expiry
- `isOtpAttemptsExceeded()` - Enforces attempt limits (max 3)
- `checkResendCooldown()` - Prevents OTP spam (30-second cooldown)
- `logOtpActivity()` - Security audit logging

#### Email Service Updates ([emailService.js](Server/src/utils/emailService.js))
- `sendOtpCode(user, otpCode)` - Sends 6-digit OTP via email with professional template
- `sendOtpVerificationSuccess(user)` - Sends success notification after OTP verification

#### API Endpoints ([auth.routes.js](Server/src/routes/auth.routes.js))
```javascript
POST   /api/v1/auth/send-otp              // Send OTP to email
POST   /api/v1/auth/verify-otp            // Verify OTP, return JWT
POST   /api/v1/auth/resend-otp            // Resend OTP (rate-limited)
```

#### Authentication Flow Modification ([auth.controller.js](Server/src/controllers/auth.controller.js))
- Updated `login()` endpoint:
  - Checks if user is admin/superAdmin and has OTP enabled
  - Generates OTP and sends via email
  - Returns `requiresOtp: true` flag instead of JWT token
  - Non-admin users bypass OTP and login directly
- New `sendOtp()` endpoint - Request OTP code
- New `verifyOtp()` endpoint - Verify code and return JWT
- New `resendOtp()` endpoint - Resend with cooldown protection

---

### 2. **Frontend - OTP Verification UI**

#### OTPVerification Component ([OTPVerification.jsx](Management/src/pages/OTPVerification.jsx))
**Features:**
- ✅ 6-digit input fields with auto-advance
- ✅ Paste support (intelligently extracts digits)
- ✅ Keyboard navigation (arrows, backspace, Tab)
- ✅ 10-minute countdown timer
- ✅ Visual expiry warning (red text when <1 min)
- ✅ Resend button with 30-second cooldown
- ✅ Failed attempt handling
- ✅ Professional UI matching admin panel design
- ✅ Security messaging and tips

**User Flow:**
```
1. User enters email + password on Login page
2. Backend checks credentials → Valid
3. If admin/superAdmin → Generate OTP → Send email
4. Return requiresOtp flag to frontend
5. Redirect to OTPVerification page
6. User receives OTP in email (example: 123456)
7. User enters 6 digits in OTP input fields
8. Frontend sends OTP to /verify-otp endpoint
9. Backend verifies OTP → Valid → Return JWT token
10. Frontend stores token and user data
11. Redirect to dashboard
```

#### Login Page Updates ([Login.jsx](Management/src/pages/Login.jsx))
- Added `otp-required` result handling
- Redirects to OTPVerification with email state
- Maintains existing password-reset-required flow

#### Auth Context Updates ([AuthContext.jsx](Management/src/contexts/AuthContext.jsx))
- Enhanced `login()` function to handle three scenarios:
  1. **Token directly provided** (from OTP verification) - Direct login
  2. **OTP required response** - Return 'otp-required' flag
  3. **Password reset required** - Existing flow preserved
- Maintains backward compatibility with non-admin users

#### App Routing ([App.jsx](Management/src/App.jsx))
- Added OTPVerification route
- Accessible at `/otp-verification`
- Displayed between login and authenticated routes

---

## 🔐 Security Features

### Rate Limiting & Protection
- **OTP Expiry**: 10 minutes
- **Failed Attempts**: Max 3, then blocked
- **Resend Cooldown**: 30 seconds between resends
- **Email Rate Limiting**: Prevents spam attacks

### Data Protection
- ✅ OTP codes hashed using SHA-256 before storage
- ✅ Never stored in plain text in database
- ✅ OTP cleared immediately after verification
- ✅ Attempt counter reset on successful generation
- ✅ Activity logging for security audits

### User Experience Security
- ✅ Email partially masked (e.g., "us...@example.com")
- ✅ Clear expiry timer visible
- ✅ "Never share OTP" security messaging
- ✅ Back-to-login option
- ✅ Toast notifications for user feedback

---

## 📧 Email Template

Professional HTML email sent when OTP is generated:

```
Subject: Your Login Verification Code - Trip Sky Way

Content includes:
- 6-digit OTP prominently displayed
- 10-minute expiry notice
- Security warning (never share)
- Troubleshooting tips
- Trip Sky Way branding
- Company information footer
```

---

## 🚀 How to Use / Test

### Admin Login Flow
1. **Navigate to Admin Portal**: `http://localhost:5174/login`
2. **Enter Credentials**:
   - Email: `admin@tripskyway.com`
   - Password: `Admin@123456`
3. **Check Email**: Look for OTP code (development: check console logs or email service)
4. **Enter OTP**: Type 6-digit code in verification page
5. **Access Dashboard**: After verification, logged in successfully

### OTP Code During Development
**In development mode**, the OTP is logged to:
- Server console
- Email service logs
- Can be manually intercepted for testing

**For testing without email setup**, modify `auth.controller.js` temporarily:
```javascript
// Add console log in sendOtp function:
console.log('Generated OTP:', otpCode); // Log plain text temporarily
```

### Environment Variables
No new environment variables needed. Existing email configuration is used:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

---

## 📋 API Documentation

### 1. Send OTP
```javascript
POST /api/v1/auth/send-otp
Content-Type: application/json

Body:
{
  "email": "admin@example.com"
}

Response (200):
{
  "status": "success",
  "message": "OTP code sent to your email. It will expire in 10 minutes.",
  "data": {
    "email": "admin@example.com",
    "otpMethod": "email",
    "expiresIn": "10 minutes"
  }
}
```

### 2. Login (with OTP trigger)
```javascript
POST /api/v1/auth/login
Content-Type: application/json

Body:
{
  "email": "admin@example.com",
  "password": "Admin@123456"
}

Response (200) - OTP Required:
{
  "status": "success",
  "message": "OTP code sent to your email. Please verify to complete login.",
  "data": {
    "requiresOtp": true,
    "email": "admin@example.com",
    "otpMethod": "email",
    "expiresIn": "10 minutes",
    "userId": "12345..."
  }
}

Response (200) - OTP Not Required (non-admin):
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": { ... }
  }
}
```

### 3. Verify OTP
```javascript
POST /api/v1/auth/verify-otp
Content-Type: application/json

Body:
{
  "email": "admin@example.com",
  "otpCode": "123456"
}

Response (200) Success:
{
  "status": "success",
  "message": "OTP verified successfully. Login completed.",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}

Response (401) Invalid OTP:
{
  "status": "error",
  "message": "Invalid OTP code"
}

Response (429) Too Many Attempts:
{
  "status": "error",
  "message": "Too many failed attempts. Please request a new OTP code."
}
```

### 4. Resend OTP
```javascript
POST /api/v1/auth/resend-otp
Content-Type: application/json

Body:
{
  "email": "admin@example.com"
}

Response (200):
{
  "status": "success",
  "message": "New OTP code sent to your email. It will expire in 10 minutes.",
  "data": {
    "email": "admin@example.com",
    "expiresIn": "10 minutes"
  }
}

Response (429) Cooldown:
{
  "status": "error",
  "message": "Please wait 15 seconds before requesting another OTP"
}
```

---

## 🔄 Current Login Flow Comparison

### Before (Non-Admin Users)
```
Email + Password → JWT Token → Dashboard
```

### After (Admin/SuperAdmin)
```
Email + Password → OTP Email Sent → OTP Verification Page →
Enter 6-digit Code → JWT Token → Dashboard
```

### After (Non-Admin Users) - Unchanged
```
Email + Password → JWT Token → Dashboard
(OTP bypass for better UX)
```

---

## ⚙️ Configuration Options

### To Disable OTP for Specific Admin
```javascript
// In database, set:
user.isOtpEnabled = false;
user.save();

// User will bypass OTP and login directly
```

### To Change OTP Expiry
**Edit [user.model.js](Server/src/models/user.model.js)**:
```javascript
// In generateOtpCode method:
this.otpExpire = Date.now() + 10 * 60 * 1000; // Change 10 to desired minutes
```

### To Change OTP Attempt Limit
**Edit [otpService.js](Server/src/utils/otpService.js)**:
```javascript
isOtpAttemptsExceeded(otpAttempts, maxAttempts = 3) {
  // Change 3 to desired limit
  return otpAttempts >= maxAttempts;
}
```

### To Change Resend Cooldown
**Edit [auth.controller.js](Server/src/controllers/auth.controller.js)**:
```javascript
const { canResend, remainingSeconds } = otpService.checkResendCooldown(user.lastOtpSentAt, 30);
// Change 30 to desired seconds
```

---

## 🧪 Testing Checklist

- [ ] Admin login with correct OTP
- [ ] Admin login with incorrect OTP (3x attempt limit)
- [ ] OTP expiry after 10 minutes
- [ ] Resend OTP with 30s cooldown
- [ ] Paste entire OTP code
- [ ] Type OTP digit by digit with auto-advance
- [ ] Navigate OTP fields with arrow keys
- [ ] Clear field with backspace
- [ ] Non-admin user bypasses OTP
- [ ] Back to login button works
- [ ] Email contains proper OTP code
- [ ] Session persists after OTP verification
- [ ] Logout clears OTP state

---

## 📝 Files Modified/Created

### Backend
- ✅ [user.model.js](Server/src/models/user.model.js) - Added OTP fields + methods
- ✅ [otpService.js](Server/src/utils/otpService.js) - NEW OTP utility service
- ✅ [emailService.js](Server/src/utils/emailService.js) - Added OTP email templates
- ✅ [auth.controller.js](Server/src/controllers/auth.controller.js) - Added OTP endpoints + login flow
- ✅ [auth.routes.js](Server/src/routes/auth.routes.js) - Added OTP routes

### Frontend
- ✅ [OTPVerification.jsx](Management/src/pages/OTPVerification.jsx) - NEW OTP verification page
- ✅ [Login.jsx](Management/src/pages/Login.jsx) - Updated login flow
- ✅ [AuthContext.jsx](Management/src/contexts/AuthContext.jsx) - Enhanced login function
- ✅ [App.jsx](Management/src/App.jsx) - Added OTP route

---

## 🚀 Next Steps (Optional Enhancements)

1. **SMS OTP** - Add Twilio integration for SMS delivery
2. **Authenticator App** - Add TOTP support (Google Authenticator)
3. **Backup Codes** - Generate 10 single-use codes for recovery
4. **2FA Settings Page** - Allow users to manage OTP preferences
5. **Remember Device** - Skip OTP on trusted devices
6. **OTP Activity Logs** - View login history and OTP attempts

---

## 🔍 Troubleshooting

### OTP Email Not Received
- Check EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env
- Verify Gmail app password is correct
- Check spam/junk folder
- Ensure nodemailer is installed: `npm install nodemailer`

### OTP Always Expires
- Verify system time is correct on server
- Check otpExpire timestamp is being set correctly
- Confirm 10-minute value in generateOtpCode method

### Token Not Working After OTP
- Clear browser cache
- Check localStorage for token presence
- Verify Authorization header is set in axios
- Check JWT_SECRET matches between frontend attempts

### Can't Find OTP Code During Testing
- Check server console logs
- Look for nodemailer transporter logs
- Temporarily add `console.log(otpCode)` in sendOtp function
- Use email service test inbox (Mailtrap) for development

---

## 📞 Support

For issues or questions about the OTP implementation:
1. Check the troubleshooting section above
2. Review server logs: `npm run dev` shows all API activity
3. Check browser console (F12) for frontend errors
4. Verify all database fields are properly saved: `db.users.findOne({ email: "admin@..." })`

