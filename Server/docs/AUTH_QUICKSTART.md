# Authentication System - Quick Start Guide

## Overview

This authentication system provides secure, role-based access control for the Trip Sky Way travel agency management platform with four distinct user roles and industry-standard security practices.

## 🎯 User Roles

| Role | Access | Created By | Registration |
|------|--------|------------|--------------|
| **Customer** | Public features, bookings | Self-registration | Public form |
| **Sales Rep** | Sales management | Admin | Admin panel |
| **Vendor** | Vendor management | Admin | Admin panel |
| **Admin** | Full system access | System setup | One-time script |

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd Server
npm install
```

### 2. Configure Environment

Create a `.env` file in the Server directory:

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Bcrypt
BCRYPT_ROUNDS=12

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=Trip Sky Way <noreply@tripskyway.com>

# Client URL
CLIENT_URL=http://localhost:3000

# Admin Setup
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@tripskyway.com
ADMIN_PASSWORD=Admin@123456
ADMIN_PHONE=1234567890

# Database
MONGODB_URI=mongodb://localhost:27017/trip-sky-way

# Server
PORT=5000
NODE_ENV=development
API_VERSION=v1
```

### 3. Start MongoDB

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 4. Create Admin User

```bash
npm run create-admin
```

Expected output:
```
✅ Admin user created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: admin@tripskyway.com
Password: Admin@123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANT: Please change the admin password after first login!
```

### 5. Start Server

```bash
npm run dev
```

Server should start on `http://localhost:5000`

## 📋 Testing the System

### Test 1: Admin Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@tripskyway.com\",\"password\":\"Admin@123456\"}"
```

Save the token from the response for next steps.

### Test 2: Customer Registration

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"John Doe\",\"email\":\"john@example.com\",\"password\":\"Test@123\",\"confirmPassword\":\"Test@123\"}"
```

### Test 3: Create Sales Rep (Admin Only)

Replace `YOUR_ADMIN_TOKEN` with the token from Test 1:

```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"name\":\"Jane Smith\",\"email\":\"jane@example.com\",\"role\":\"salesRep\"}"
```

### Test 4: Get Dashboard Stats (Admin Only)

```bash
curl -X GET http://localhost:5000/api/v1/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🔑 Key Features

### Security Features
- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ HTTP-only cookies
- ✅ Rate limiting on auth endpoints
- ✅ Email verification for customers
- ✅ Temporary password system for staff
- ✅ Password change enforcement
- ✅ Token invalidation on password change
- ✅ XSS and NoSQL injection protection

### User Management
- ✅ Self-registration for customers
- ✅ Admin-created staff accounts
- ✅ Activate/deactivate users
- ✅ Password reset via email
- ✅ Profile updates
- ✅ Role-based access control

### Email Notifications
- ✅ Welcome emails
- ✅ Email verification
- ✅ Password reset links
- ✅ Staff credential emails
- ✅ Password change confirmations

## 🔐 Authentication Flows

### Customer Registration
1. Customer submits registration form
2. System creates account with `customer` role
3. Email verification sent
4. JWT token returned for immediate access
5. Customer should verify email (recommended but not enforced)

### Staff Creation (Admin)
1. Admin creates salesRep or vendor
2. System generates temporary password
3. Credentials sent via email
4. Staff member logs in
5. System requires password change
6. New password set, full access granted

### Login Process
1. User submits credentials
2. System validates email and password
3. Checks if account is active
4. Checks if password change required
5. Generates and returns JWT token
6. Token stored in HTTP-only cookie

## 📚 API Documentation

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Customer registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| PUT | `/api/v1/auth/reset-password/:token` | Reset password |
| GET | `/api/v1/auth/verify-email/:token` | Verify email |

### Protected Endpoints (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/logout` | Logout |
| PUT | `/api/v1/auth/change-password` | Change password |
| PUT | `/api/v1/auth/profile` | Update profile |
| POST | `/api/v1/auth/resend-verification` | Resend verification email |

### Admin Endpoints (Requires Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/users` | Create sales rep or vendor |
| GET | `/api/v1/admin/users` | Get all users (with filters) |
| GET | `/api/v1/admin/users/:id` | Get user by ID |
| PUT | `/api/v1/admin/users/:id` | Update user |
| DELETE | `/api/v1/admin/users/:id` | Delete user |
| PATCH | `/api/v1/admin/users/:id/status` | Activate/deactivate user |
| POST | `/api/v1/admin/users/:id/reset-password` | Reset user password |
| GET | `/api/v1/admin/stats` | Get dashboard statistics |

## 🛠️ Common Operations

### Change Admin Password

1. Login as admin
2. Call change password endpoint:

```bash
curl -X PUT http://localhost:5000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"currentPassword\":\"Admin@123456\",\"newPassword\":\"NewSecure@Pass123\",\"confirmPassword\":\"NewSecure@Pass123\"}"
```

### Create Multiple Staff Members

Use a loop or script to create multiple users:

```bash
# Create sales reps
for email in sales1@example.com sales2@example.com; do
  curl -X POST http://localhost:5000/api/v1/admin/users \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d "{\"name\":\"Sales Rep\",\"email\":\"$email\",\"role\":\"salesRep\"}"
done
```

### Deactivate User

```bash
curl -X PATCH http://localhost:5000/api/v1/admin/users/USER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"isActive\":false}"
```

## 🐛 Troubleshooting

### Issue: Admin creation fails

**Solution:**
```bash
# Check if admin already exists
# Delete existing admin (if needed) from MongoDB
# Run create-admin script again
npm run create-admin
```

### Issue: Email not sending

**Solutions:**
1. Verify EMAIL_* variables in .env
2. For Gmail:
   - Enable 2-Step Verification
   - Generate App Password
   - Use App Password in EMAIL_PASSWORD
3. Check logs: `Server/logs/`

### Issue: Token validation fails

**Solutions:**
1. Ensure JWT_SECRET is set
2. Check token in Authorization header: `Bearer <token>`
3. Token may have expired (check JWT_EXPIRES_IN)
4. Clear cookies and login again

### Issue: Cannot create staff members

**Solutions:**
1. Ensure you're logged in as admin
2. Check Authorization header is set
3. Verify role is either 'salesRep' or 'vendor'
4. Check admin token hasn't expired

## 📖 Additional Documentation

- **Full API Documentation**: `docs/AUTHENTICATION.md`
- **Environment Variables**: `docs/ENVIRONMENT_VARIABLES.md`
- **Security Best Practices**: See AUTHENTICATION.md

## 🔒 Security Recommendations

### Development
- ✅ Use strong JWT_SECRET (32+ characters)
- ✅ Keep .env file out of version control
- ✅ Use HTTPS in production
- ✅ Enable CORS only for trusted origins

### Production
- ✅ Use environment variables service (AWS Secrets Manager, etc.)
- ✅ Enable rate limiting (already configured)
- ✅ Implement monitoring and alerts
- ✅ Regular security audits
- ✅ Keep dependencies updated
- ✅ Use strong admin credentials
- ✅ Implement 2FA (future enhancement)

## 📝 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Start Dev Server | `npm run dev` | Start with nodemon |
| Start Production | `npm start` | Start without nodemon |
| Create Admin | `npm run create-admin` | Create initial admin user |
| Run Tests | `npm test` | Run Jest tests |
| Lint Code | `npm run lint` | Check code style |

## 🎓 Learning Resources

### Key Technologies Used
- **Express.js**: Web framework
- **JWT**: Token-based authentication
- **Bcrypt**: Password hashing
- **Joi**: Request validation
- **Nodemailer**: Email service
- **Mongoose**: MongoDB ODM

### Recommended Reading
- [JWT.io](https://jwt.io/) - Understanding JWT
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 🤝 Support

For issues or questions:
1. Check server logs: `Server/logs/`
2. Review error responses
3. Check documentation files
4. Contact development team

## 📋 Checklist for Production

- [ ] Change default admin credentials
- [ ] Set strong JWT_SECRET
- [ ] Configure production email service
- [ ] Enable HTTPS
- [ ] Set up proper CORS
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Regular backups
- [ ] Security audit
- [ ] Load testing

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**Status**: Production Ready ✅
