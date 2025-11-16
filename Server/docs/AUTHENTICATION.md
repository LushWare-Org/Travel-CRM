# Authentication System Documentation

## Overview

The Trip Sky Way authentication system implements a role-based access control (RBAC) with four distinct user roles and secure authentication flows using industry best practices.

## User Roles

### 1. Admin
- **Single Instance**: Only one admin exists in the system
- **Capabilities**:
  - Create sales representatives and vendors
  - Manage all users (view, update, activate/deactivate)
  - Reset passwords for staff members
  - View dashboard statistics
  - Full system access

### 2. Sales Representatives (salesRep)
- **Created by**: Admin
- **Access**: Sales and customer management features
- **Initial Setup**: Receives temporary password via email
- **Must change password on first login**

### 3. Vendors
- **Created by**: Admin
- **Access**: Vendor-specific features and inventory management
- **Initial Setup**: Receives temporary password via email
- **Must change password on first login**

### 4. Customers
- **Self-Registration**: Can register through public registration form
- **Access**: Booking and customer-facing features
- **Verification**: Email verification required

## Authentication Features

### Security Best Practices Implemented

1. **Password Security**
   - Minimum 6 characters
   - Bcrypt hashing with configurable rounds (default: 12)
   - Temporary password system for staff
   - Password change tracking
   - Secure password reset flow

2. **Token-Based Authentication**
   - JWT (JSON Web Tokens)
   - HTTP-only cookies
   - Configurable expiration
   - Token invalidation on password change

3. **Rate Limiting**
   - Authentication endpoints protected
   - Prevents brute force attacks
   - Configurable limits

4. **Email Verification**
   - Customers must verify email
   - Staff accounts pre-verified
   - Resend verification option

5. **Account Security**
   - Account activation/deactivation
   - Session management
   - Password change enforcement
   - Last login tracking

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Register Customer
```
POST /api/v1/auth/register
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "isEmailVerified": false
    }
  }
}
```

#### Login
```
POST /api/v1/auth/login
```
**Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (Normal Login):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "mustChangePassword": false
    }
  }
}
```

**Response (Password Change Required):**
```json
{
  "status": "success",
  "message": "Password change required",
  "data": {
    "mustChangePassword": true,
    "userId": "user_id",
    "email": "john@example.com"
  }
}
```

#### Forgot Password
```
POST /api/v1/auth/forgot-password
```
**Body:**
```json
{
  "email": "john@example.com"
}
```

#### Reset Password
```
PUT /api/v1/auth/reset-password/:token
```
**Body:**
```json
{
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

#### Verify Email
```
GET /api/v1/auth/verify-email/:token
```

### Protected Endpoints (Authentication Required)

All protected endpoints require the `Authorization` header with Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

#### Get Current User
```
GET /api/v1/auth/me
```

#### Logout
```
POST /api/v1/auth/logout
```

#### Change Password
```
PUT /api/v1/auth/change-password
```
**Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456",
  "confirmPassword": "newPassword456"
}
```

#### Update Profile
```
PUT /api/v1/auth/profile
```
**Body:**
```json
{
  "name": "John Updated",
  "phone": "9876543210"
}
```

#### Resend Email Verification
```
POST /api/v1/auth/resend-verification
```

### Admin Endpoints (Admin Role Required)

#### Create Staff (Sales Rep or Vendor)
```
POST /api/v1/admin/users
```
**Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "1234567890",
  "role": "salesRep"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Sales Representative created successfully. Login credentials sent to their email.",
  "data": {
    "user": {
      "id": "user_id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "salesRep",
      "isActive": true
    }
  }
}
```

#### Get All Users
```
GET /api/v1/admin/users?role=salesRep&isActive=true&search=john&page=1&limit=10
```

**Query Parameters:**
- `role`: Filter by role (customer, salesRep, vendor, admin)
- `isActive`: Filter by status (true/false)
- `search`: Search by name or email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

#### Get User by ID
```
GET /api/v1/admin/users/:id
```

#### Update User
```
PUT /api/v1/admin/users/:id
```
**Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phone": "9876543210"
}
```

#### Update User Status (Activate/Deactivate)
```
PATCH /api/v1/admin/users/:id/status
```
**Body:**
```json
{
  "isActive": false
}
```

#### Reset User Password
```
POST /api/v1/admin/users/:id/reset-password
```

#### Delete User
```
DELETE /api/v1/admin/users/:id
```

#### Get Dashboard Statistics
```
GET /api/v1/admin/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "totalUsers": 150,
      "activeUsers": 145,
      "inactiveUsers": 5,
      "recentUsers": 12,
      "unverifiedEmails": 8,
      "usersByRole": {
        "customer": 130,
        "salesRep": 15,
        "vendor": 4,
        "admin": 1
      }
    }
  }
}
```

## Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_min_32_characters
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Bcrypt Configuration
BCRYPT_ROUNDS=12

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=Trip Sky Way <noreply@tripskyway.com>

# Client URL (for email links)
CLIENT_URL=http://localhost:3000

# Admin Configuration (for initial setup)
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

## Initial Setup

### 1. Install Dependencies
```bash
cd Server
npm install
```

### 2. Configure Environment
Create a `.env` file in the Server directory with the required environment variables.

### 3. Create Admin User
```bash
npm run create-admin
```

This will create the initial admin user with credentials specified in your `.env` file.

### 4. Start Server
```bash
npm run dev
```

## Authentication Flow

### Customer Registration Flow
1. Customer fills registration form
2. System validates input
3. Password is hashed
4. User account created with `customer` role
5. Email verification token generated
6. Verification email sent
7. JWT token returned for immediate access
8. Customer can use system but should verify email

### Staff Creation Flow (Admin)
1. Admin logs in
2. Admin creates salesRep or vendor via admin panel
3. System generates temporary password
4. User account created with `isTempPassword: true` and `mustChangePassword: true`
5. Email with credentials sent to staff member
6. Staff member attempts first login
7. System detects `mustChangePassword` flag
8. Staff member required to change password
9. After password change, full access granted

### Login Flow
1. User submits credentials
2. System validates credentials
3. System checks account status (active/inactive)
4. System checks if password change required
5. If password change required, return special response
6. Otherwise, generate JWT token
7. Update last login timestamp
8. Return token and user data

### Password Reset Flow
1. User requests password reset
2. Reset token generated and stored (hashed)
3. Reset email sent with link
4. User clicks link (valid for 10 minutes)
5. User submits new password
6. Password updated and token cleared
7. User redirected to login

## Security Considerations

### Password Policies
- Minimum 6 characters
- Consider implementing additional complexity requirements
- Temporary passwords must be changed on first login
- Password history can be implemented to prevent reuse

### Token Management
- Tokens stored in HTTP-only cookies
- Tokens expire after configured duration
- Tokens invalidated on password change
- Implement token refresh mechanism for better UX

### Email Security
- Use app-specific passwords for Gmail
- Consider using dedicated email service (SendGrid, Mailgun)
- Implement email rate limiting
- Use HTTPS for all email links

### Account Protection
- Rate limiting on authentication endpoints
- Account lockout after failed attempts (future enhancement)
- Two-factor authentication (future enhancement)
- Session management and logout from all devices (future enhancement)

## Error Handling

All authentication endpoints return standardized error responses:

```json
{
  "status": "fail",
  "message": "Error message here",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request / Validation Error
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Testing

### Test Admin Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tripskyway.com",
    "password": "Admin@123456"
  }'
```

### Test Customer Registration
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "customer@test.com",
    "password": "Test@123456",
    "confirmPassword": "Test@123456"
  }'
```

### Test Create Sales Rep (requires admin token)
```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Test Sales Rep",
    "email": "salesrep@test.com",
    "role": "salesRep"
  }'
```

## Maintenance

### Regular Tasks
- Monitor failed login attempts
- Review inactive accounts
- Update password policies as needed
- Rotate JWT secret periodically
- Review and update rate limits

### Troubleshooting

**Issue: Email not sending**
- Check EMAIL_* environment variables
- Verify SMTP credentials
- Check firewall/network restrictions
- Review email service logs

**Issue: Token validation fails**
- Verify JWT_SECRET is consistent
- Check token expiration settings
- Ensure token is properly included in requests

**Issue: Password reset not working**
- Check email delivery
- Verify token expiration settings
- Check CLIENT_URL is correct

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - SMS or authenticator app
   - Backup codes

2. **Social Login**
   - Google OAuth
   - Facebook Login
   - Apple Sign In

3. **Advanced Security**
   - Account lockout policy
   - IP-based restrictions
   - Device fingerprinting
   - Security questions

4. **Session Management**
   - View active sessions
   - Logout from all devices
   - Session history

5. **Password Policies**
   - Password complexity requirements
   - Password expiration
   - Password history
   - Common password detection

6. **Audit Logging**
   - Login history
   - Password changes
   - Permission changes
   - Admin actions

## Support

For issues or questions:
- Check server logs: `Server/logs/`
- Review error responses
- Contact system administrator
- Review this documentation

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**Maintained By**: Trip Sky Way Development Team
