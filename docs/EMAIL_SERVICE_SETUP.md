# Email Service Setup Guide

## Overview
The email service uses **Nodemailer** with Gmail SMTP for sending emails (invitations, password resets, etc.).

---

## Step 1: Check Current Email Configuration

### Current Status
- ✅ Email service code is ready (`emailService.js`)
- ✅ Email methods are available (`sendStaffCredentials`, `sendPasswordReset`, etc.)
- ⚠️ Email configuration not yet set up
- ❌ Gmail credentials not configured in `.env`

### Current `.env` Email Settings (NEED TO UPDATE)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-dev-email@gmail.com
EMAIL_PASSWORD=your-dev-app-password
EMAIL_FROM=Trip Sky Way Dev <dev-noreply@tripskyway.com>
```

---

## Step 2: Choose Email Provider

### Option A: Gmail (Recommended for Development) ✅
- **Pros:** Free, easy setup, good for testing
- **Cons:** Has rate limits, requires App Password
- **Setup time:** 5-10 minutes

### Option B: SendGrid (For Production) 
- **Pros:** Reliable, great deliverability, high volume
- **Cons:** Requires paid account
- **Setup time:** 10-15 minutes

### Option C: AWS SES
- **Pros:** Part of AWS ecosystem, pay-as-you-go
- **Cons:** Complex setup
- **Setup time:** 15-30 minutes

**We'll use Gmail for now (easiest for development)**

---

## Step 3: Gmail Setup (App Password Method)

### 3.1 Enable 2FA on Gmail Account

1. Go to: https://myaccount.google.com/security
2. Scroll down to "How you sign in to Google"
3. Click "2-Step Verification"
4. Follow the steps to enable it
5. You'll need your phone to verify

### 3.2 Generate App Password

1. After 2FA is enabled, go to: https://myaccount.google.com/apppasswords
2. Select:
   - **App:** Mail
   - **Device:** Windows PC (or your device)
3. Google will generate a **16-character password**
4. Copy this password - **you'll only see it once**

**Example:** `abcd efgh ijkl mnop`

### 3.3 Update `.env` File

Open `Server/.env` and update these lines:

```env
# Email Configuration (Nodemailer) - Gmail SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=Trip Sky Way <your-gmail-email@gmail.com>
```

**Replace:**
- `your-gmail-email@gmail.com` - Your actual Gmail address
- `abcd efgh ijkl mnop` - The 16-character app password (with or without spaces)

**Example:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=john.doe@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=Trip Sky Way <john.doe@gmail.com>
```

---

## Step 4: Check Email Config File

### Verify `Server/src/config/email.js` Exists

Create it if it doesn't exist:

```javascript
// Server/src/config/email.js

export default {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // Convert string to boolean
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM || 'noreply@tripskyway.com',
};
```

---

## Step 5: Update User Controller to Send Email

### 5.1 Open `Server/src/controllers/user.controller.js`

Find the `createUser` function (around line 180).

### 5.2 Add Email Import at Top

```javascript
// Add this with other imports at the top of the file
import emailService from '../utils/emailService.js';
```

### 5.3 Add Email Sending After User Creation

Find this section (around line 220):

```javascript
// Create new user
const newUser = await User.create({
  name: name.trim(),
  email: email.toLowerCase(),
  phone: phone || undefined,
  password,
  role: userRole,
  createdBy: req.user.id,
  isEmailVerified: userRole !== 'customer', // Auto-verify non-customer users
});

// Generate JWT token for the new user
const token = newUser.getSignedJwtToken();

// Log the action
logger.info(
  `User created successfully: ${newUser.email} (Role: ${newUser.role}) by ${req.user.email}`,
);
```

Replace it with:

```javascript
// Create new user
const newUser = await User.create({
  name: name.trim(),
  email: email.toLowerCase(),
  phone: phone || undefined,
  password,
  role: userRole,
  createdBy: req.user.id,
  isEmailVerified: userRole !== 'customer', // Auto-verify non-customer users
});

// Generate JWT token for the new user
const token = newUser.getSignedJwtToken();

// 📧 Send invitation email with credentials
try {
  await emailService.sendStaffCredentials(newUser, password, newUser.role);
  logger.info(`Invitation email sent to ${newUser.email}`);
} catch (emailError) {
  logger.warn(`Failed to send invitation email to ${newUser.email}: ${emailError.message}`);
  // Don't fail the request if email fails - user is still created
}

// Log the action
logger.info(
  `User created successfully: ${newUser.email} (Role: ${newUser.role}) by ${req.user.email}`,
);
```

---

## Step 6: Test Email Service

### 6.1 Restart Server

```powershell
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

### 6.2 Create a Test Admin

1. Open Management dashboard
2. Go to Admin Management
3. Click "Add Admin"
4. Fill in form:
   - Name: Test Admin
   - Email: **your-gmail-email@gmail.com** (your real Gmail)
   - Phone: 5551234567
5. Click "Create & Send Invitation"

### 6.3 Check Gmail

1. Go to your Gmail inbox
2. Look for email from: **Trip Sky Way <your-email@gmail.com>**
3. Subject: **Welcome to Trip Sky Way - Your Admin Account**
4. Should contain:
   - Login credentials
   - Temporary password
   - Login link

### 6.4 Check Server Logs

In terminal, you should see:
```
info: Invitation email sent to test-email@gmail.com
```

---

## Step 7: Troubleshooting

### Email Not Sending?

#### Error: "Invalid login"
**Solution:** 
- Check email and password are correct in `.env`
- Verify you used the 16-character App Password (not regular Gmail password)
- Make sure 2FA is enabled

#### Error: "SMTP Error 535"
**Solution:**
- Gmail rejected the password
- Generate a new App Password and try again

#### Error: "Failed to resolve SMTP host"
**Solution:**
- Check `EMAIL_HOST=smtp.gmail.com` (no typos)
- Check internet connection

#### Email appears in Sent but not in recipient inbox
**Solution:**
- Check spam folder
- Verify recipient email is correct
- Wait a few seconds (Gmail can be slow)

### Test With Console

Add this to test email sending directly:

```javascript
// In user.controller.js or a test route
import emailService from '../utils/emailService.js';

// Test email
try {
  await emailService.sendEmail({
    to: 'test@gmail.com',
    subject: 'Test Email',
    html: '<h1>Hello</h1><p>This is a test</p>'
  });
  console.log('✅ Email sent successfully');
} catch (error) {
  console.error('❌ Email failed:', error.message);
}
```

---

## Step 8: Production Setup (Gmail Limitations)

### Gmail Limits
- Max 500 emails/day
- Max 500 recipients/day
- Not suitable for production

### For Production, Use SendGrid or AWS SES

#### Option A: SendGrid (Recommended)
1. Sign up: https://sendgrid.com
2. Get API key
3. Update `Server/src/config/email.js`:

```javascript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default {
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
};
```

#### Option B: AWS SES
Similar setup with AWS credentials

---

## Step 9: Email Service Methods Available

### 1. sendStaffCredentials (For New Admin/Staff)
```javascript
await emailService.sendStaffCredentials(user, tempPassword, role);
// Sends: Welcome email with login credentials
```

### 2. sendPasswordReset (For Password Recovery)
```javascript
await emailService.sendPasswordReset(user, resetToken);
// Sends: Password reset link
```

### 3. sendEmailVerification (For Email Verification)
```javascript
await emailService.sendEmailVerification(user, verificationToken);
// Sends: Email verification link
```

### 4. sendPasswordChanged (For Password Change Confirmation)
```javascript
await emailService.sendPasswordChanged(user);
// Sends: Password changed notification
```

### 5. sendWelcomeEmail (For New Users)
```javascript
await emailService.sendWelcomeEmail(user);
// Sends: Welcome message
```

---

## Checklist

### Setup Email Service
- [ ] Gmail account with 2FA enabled
- [ ] App Password generated from Google
- [ ] `.env` file updated with Gmail credentials
- [ ] `Server/src/config/email.js` created/verified
- [ ] `emailService` import added to `user.controller.js`
- [ ] Email sending code added to `createUser()` function
- [ ] Server restarted
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)

### Testing
- [ ] Create admin and verify email received
- [ ] Check email contains correct password
- [ ] Check email has login link
- [ ] Verify server logs show "Email sent"

---

## Complete Example: Full Setup

### `.env` File
```env
# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=admin@example.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=Trip Sky Way <admin@example.com>
```

### `Server/src/config/email.js`
```javascript
export default {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM || 'noreply@tripskyway.com',
};
```

### `Server/src/controllers/user.controller.js` (createUser function)
```javascript
import emailService from '../utils/emailService.js';

export const createUser = asyncHandler(async (req, res, next) => {
  // ... existing validation code ...

  // Create new user
  const newUser = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    phone: phone || undefined,
    password,
    role: userRole,
    createdBy: req.user.id,
    isEmailVerified: userRole !== 'customer',
  });

  // Generate JWT token
  const token = newUser.getSignedJwtToken();

  // 📧 Send invitation email
  try {
    await emailService.sendStaffCredentials(newUser, password, newUser.role);
    logger.info(`Invitation email sent to ${newUser.email}`);
  } catch (emailError) {
    logger.warn(`Failed to send email: ${emailError.message}`);
  }

  // Log and respond
  logger.info(`User created: ${newUser.email} by ${req.user.email}`);

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isActive: newUser.isActive,
        isEmailVerified: newUser.isEmailVerified,
        createdAt: newUser.createdAt,
      },
      token,
    },
  });
});
```

---

## Summary

**Total Setup Time:** 10-15 minutes

1. ✅ Enable Gmail 2FA (2 min)
2. ✅ Generate App Password (1 min)
3. ✅ Update `.env` file (1 min)
4. ✅ Create email config file (1 min)
5. ✅ Add email import (1 min)
6. ✅ Add email sending code (2 min)
7. ✅ Restart server (1 min)
8. ✅ Test email (2 min)

After setup, admins will automatically receive invitation emails when created! 🎉

---

## Need Help?

If you encounter issues:
1. Check server logs for error messages
2. Verify `.env` file is saved
3. Restart server (sometimes needed for `.env` changes)
4. Check Gmail spam folder
5. Verify 2FA is enabled and App Password is correct
