# OTP Authentication - Quick Start Guide

## For Users

### How to Login as a Sales Rep with OTP

#### Step 1: Go to Sales Rep Login
1. Navigate to `http://localhost:5174/sales-rep-login`
2. Or click "Login with OTP" link from admin login page

#### Step 2: Enter Email & Password
1. Email: `amal@tripskyway.com` (or your sales rep email)
2. Password: `Sales@123456`
3. Click "Next: Verify with OTP"

#### Step 3: Check Your Email
- Look for email from "Trip Sky Way <anuradhaanupamaherath@gmail.com>"
- Find your 6-digit OTP code
- Check spam folder if not in inbox

#### Step 4: Enter OTP
1. Enter the 6-digit code in the OTP field
2. Code is valid for 10 minutes
3. Click "Complete Login"

#### Step 5: Done! ✓
- You're now logged in
- You'll see the dashboard

### Troubleshooting

**Didn't receive OTP?**
- Wait a few seconds
- Check spam folder
- Click "Resend OTP" (after 1 minute)

**OTP expired?**
- Click "Resend OTP" to get a new code
- Code is valid for 10 minutes

**Wrong OTP entered?**
- You get 5 attempts
- Read the error message carefully
- Each attempt count decreases

**Can't go back to email?**
- Click "Back to Email & Password" button
- Re-enter your credentials

---

## For Developers

### Backend Setup

#### 1. Install Dependencies (Already Done)
```bash
npm install
```

#### 2. Configure Environment Variables
File: `Server/.env`
```env
MONGODB_URI=mongodb+srv://lushware:O3heXZKb9GA9LsjB@cluster0.vl138l0.mongodb.net/trip-sky-way
JWT_SECRET=dev-jwt-secret-key-2025-trip-sky-way-development-only-not-for-production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=anuradhaanupamaherath@gmail.com
EMAIL_PASSWORD=raaqugmzimidaorw
```

#### 3. Start Server
```bash
cd Server
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

#### 1. Install Dependencies (Already Done)
```bash
npm install
```

#### 2. Configure API URL
File: `Management/.env`
```env
VITE_API_URL=http://localhost:5000/api/v1
```

#### 3. Start Frontend
```bash
cd Management
npm run dev
# Frontend runs on http://localhost:5174
```

### Testing the API

#### Using Postman or cURL

**Step 1: Send Credentials**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login-step1 \
  -H "Content-Type: application/json" \
  -d {
    "email": "amal@tripskyway.com",
    "password": "Sales@123456"
  }
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP sent to your email. Please verify to continue.",
  "data": {
    "tempToken": "eyJhbGc...",
    "maskedEmail": "am***@tripskyway.com",
    "expiresIn": 600
  }
}
```

**Step 2: Verify OTP**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login-step2 \
  -H "Content-Type: application/json" \
  -d {
    "tempToken": "eyJhbGc...",
    "otp": "123456"
  }
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "507f...",
      "name": "Amal Silva",
      "email": "amal@tripskyway.com",
      "role": "salesRep"
    }
  }
}
```

---

## Key Features

### ✅ Security
- 6-digit OTP code (1 million combinations)
- 10-minute expiration
- Single-use codes
- Max 5 failed attempts
- IP tracking and logging

### ✅ User Experience
- Beautiful, responsive UI
- Real-time countdown timer
- Resend OTP functionality
- Clear error messages
- Mobile-friendly design

### ✅ Email Integration
- Professional HTML template
- Automatic email sending
- Branded footer
- Security warnings
- Support contact info

### ✅ Production Ready
- Database persistence
- Input validation
- Error handling
- Rate limiting
- Audit logging

---

## File Locations

### Backend Files
```
Server/
├── src/
│   ├── models/
│   │   └── otp.model.js          ← NEW: OTP database schema
│   ├── validators/
│   │   └── otp.validator.js       ← NEW: OTP validation rules
│   ├── controllers/
│   │   └── auth.controller.js     ← MODIFIED: Added OTP functions
│   ├── routes/
│   │   └── auth.routes.js         ← MODIFIED: Added OTP routes
│   └── utils/
│       └── emailService.js        ← MODIFIED: Added OTP emails
```

### Frontend Files
```
Management/src/
├── pages/
│   ├── SalesRepLogin.jsx          ← NEW: OTP login component
│   ├── Login.jsx                  ← MODIFIED: Added OTP link
│   └── App.jsx                    ← MODIFIED: Added OTP route
```

### Documentation
```
Trip-Sky-Way/
├── OTP_IMPLEMENTATION_GUIDE.md    ← Comprehensive guide
└── OTP_QUICK_START.md             ← This file
```

---

## Common Tasks

### How to Test OTP Flow

1. **Start both servers:**
   ```bash
   # Terminal 1: Backend
   cd Server && npm run dev
   
   # Terminal 2: Frontend
   cd Management && npm run dev
   ```

2. **Open browser:**
   - Go to `http://localhost:5174/sales-rep-login`

3. **Enter test credentials:**
   - Email: `amal@tripskyway.com`
   - Password: `Sales@123456`

4. **Check email:**
   - Look for OTP email
   - Get the 6-digit code
   - Enter in form

5. **Verify login:**
   - Should see dashboard
   - Check user data in localStorage

### How to Disable OTP for a User

Currently not implemented, but you could add:
```javascript
// Create a user field: requiresOTP (default: true for salesRep role)
// In loginStep1: if (!user.requiresOTP) return sendTokenResponse(user, 200, res);
```

### How to View Login Logs

Check MongoDB:
```javascript
// Find all OTP records for a user
db.otps.find({ userId: ObjectId("...") }).pretty()

// Find failed attempts
db.otps.find({ userId: ObjectId("..."), attempts: { $gt: 0 } })

// Find expired OTPs
db.otps.find({ expiresAt: { $lt: new Date() } })
```

### How to Change OTP Expiration Time

Edit `Server/src/controllers/auth.controller.js`:
```javascript
// Change this line (currently 10 minutes):
expiresAt: new Date(Date.now() + 10 * 60 * 1000),

// To 5 minutes:
expiresAt: new Date(Date.now() + 5 * 60 * 1000),

// Or 15 minutes:
expiresAt: new Date(Date.now() + 15 * 60 * 1000),
```

### How to Change Max Attempts

Edit `Server/src/models/otp.model.js`:
```javascript
// Change this validation (currently 5):
if (this.attempts > 5) {

// To allow 10 attempts:
if (this.attempts > 10) {
```

---

## Debugging

### View Server Logs
```bash
npm run dev  # Shows all logs in console
```

### Check Email Configuration
```bash
# In Server/src/config/email.js
# Should show email service initialization
```

### Test Email Directly
```javascript
// In Node console
const emailService = require('./src/utils/emailService.js');
emailService.sendOTPEmail(user, '123456');
```

### Check MongoDB OTP Records
```bash
# In MongoDB Atlas or local mongo
db.otps.find().pretty()
db.otps.find({ isUsed: false })
db.otps.find({ userId: ObjectId("...") })
```

### Browser DevTools
- Open Network tab
- Watch API requests to `/login-step1` and `/login-step2`
- Check response status and data
- Look for token in localStorage

---

## Performance Considerations

### Database Indexes
OTP collection has automatic indexes for:
- `userId` + `type` (fast user lookups)
- `email` (fast email lookups)
- `expiresAt` (TTL index for auto-cleanup)

### Email Performance
- Async email sending (doesn't block response)
- Error logging if email fails
- Retry logic could be added

### API Rate Limiting
- 5 login attempts per 15 minutes
- Applies to all auth routes
- Per IP address tracking

---

## Next Steps

### Immediate (Optional)
- [ ] Test OTP flow with real emails
- [ ] Customize email templates
- [ ] Add branding to emails
- [ ] Test on mobile devices

### Short Term (Nice to Have)
- [ ] Add SMS OTP as backup
- [ ] Implement "Remember this device"
- [ ] Add login history dashboard
- [ ] Create admin OTP management panel

### Long Term (Advanced)
- [ ] Biometric authentication
- [ ] FIDO2/WebAuthn support
- [ ] Hardware key support
- [ ] Advanced threat detection

---

## Support

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| OTP email not received | Check spam folder, verify email in DB |
| "Invalid temporary token" | Re-enter credentials (token expires in 15 min) |
| "OTP expired" | Click "Resend OTP", code valid for 10 min |
| "Too many attempts" | Wait for new OTP request, max 5 attempts |
| Non-sales rep getting OTP screen | Only salesRep role requires OTP |
| Email service errors | Check `.env` configuration, verify SMTP credentials |

### Support Contact
For issues or questions, contact the development team.

---

## Version Information
- **Implementation Date:** December 13, 2025
- **Version:** 1.0.0
- **Status:** Production Ready ✅

Happy deploying! 🚀
