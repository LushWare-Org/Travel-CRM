# Environment Variables - Authentication System

This file lists all required environment variables for the authentication system to work properly.

## Required Variables

### JWT (JSON Web Token) Configuration
```env
# Secret key for signing JWT tokens (minimum 32 characters recommended)
JWT_SECRET=your_very_long_and_secure_secret_key_min_32_chars

# Token expiration time (examples: 1h, 7d, 30d)
JWT_EXPIRES_IN=7d

# Cookie expiration in days
JWT_COOKIE_EXPIRES_IN=7
```

### Bcrypt Configuration
```env
# Number of rounds for bcrypt hashing (10-12 recommended for production)
BCRYPT_ROUNDS=12
```

### Email Configuration
```env
# SMTP Server Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Email Authentication
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# From Address
EMAIL_FROM=Trip Sky Way <noreply@tripskyway.com>
```

### Client Configuration
```env
# Frontend URL (for email links)
CLIENT_URL=http://localhost:3000
```

### Admin Configuration
```env
# Initial Admin User Details (used by create-admin script)
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@tripskyway.com
ADMIN_PASSWORD=Admin@123456
ADMIN_PHONE=1234567890
```

### Database
```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/trip-sky-way
```

### Server Configuration
```env
# Server Port
PORT=5000

# Environment (development, production, test)
NODE_ENV=development

# API Version
API_VERSION=v1
```

## Example .env File

Create a `.env` file in the Server directory with the following content:

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_that_should_be_at_least_32_characters_long
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Bcrypt Configuration
BCRYPT_ROUNDS=12

# Email Configuration (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=Trip Sky Way <noreply@tripskyway.com>

# Client URL
CLIENT_URL=http://localhost:3000

# Admin Configuration
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@tripskyway.com
ADMIN_PASSWORD=Admin@123456
ADMIN_PHONE=1234567890

# Database
MONGODB_URI=mongodb://localhost:27017/trip-sky-way

# Server Configuration
PORT=5000
NODE_ENV=development
API_VERSION=v1
```

## Gmail App Password Setup

If you're using Gmail for sending emails:

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to Security > 2-Step Verification > App passwords
4. Generate a new app password for "Mail"
5. Use this generated password for `EMAIL_PASSWORD`

## Security Notes

⚠️ **IMPORTANT SECURITY REMINDERS:**

1. **Never commit `.env` file to version control**
   - Add `.env` to `.gitignore`
   
2. **Use strong, unique values in production**
   - Generate strong `JWT_SECRET` (minimum 32 characters)
   - Use secure admin password
   
3. **Different secrets for different environments**
   - Development, staging, and production should have different secrets
   
4. **Rotate secrets periodically**
   - Change `JWT_SECRET` periodically (will invalidate all tokens)
   - Update email passwords if compromised
   
5. **Use environment-specific configurations**
   - Different `CLIENT_URL` for dev/staging/prod
   - Different database connections
   
6. **Protect production credentials**
   - Use environment variable services (AWS Secrets Manager, etc.)
   - Limit access to production `.env` files

## Validation

Run this command to check if all required environment variables are set:

```bash
node -e "const required = ['JWT_SECRET', 'JWT_EXPIRES_IN', 'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD', 'MONGODB_URI']; required.forEach(v => { if (!process.env[v]) console.error('Missing:', v); });"
```

## Troubleshooting

### JWT_SECRET not set
- Set a strong, random string (minimum 32 characters)
- You can generate one using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Email not working
- Verify `EMAIL_HOST`, `EMAIL_PORT`, and `EMAIL_SECURE` match your SMTP provider
- For Gmail, ensure you're using an app-specific password
- Check if your SMTP provider requires additional configuration

### Token expiration issues
- Ensure `JWT_EXPIRES_IN` and `JWT_COOKIE_EXPIRES_IN` are in sync
- Format: '1h', '7d', '30d' (h=hours, d=days)

### Database connection fails
- Verify `MONGODB_URI` is correct
- Ensure MongoDB is running
- Check network/firewall settings

---

**Note**: This file contains sensitive configuration information. Keep it secure and never share it publicly.
