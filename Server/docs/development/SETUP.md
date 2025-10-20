# Trip Sky Way - Server Setup Guide

## 📁 Complete Folder Structure

```
Server/
├── src/
│   ├── config/
│   │   ├── cloudinary.js      # Cloudinary configuration
│   │   ├── cors.js             # CORS settings
│   │   ├── email.js            # Email configuration
│   │   ├── logger.js           # Winston logger setup
│   │   └── rateLimiter.js      # Rate limiting config
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── lead.controller.js
│   │   └── package.controller.js
│   │   # TODO: Add more controllers as needed
│   │
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication
│   │   ├── errorHandler.js     # Global error handler
│   │   ├── notFound.js         # 404 handler
│   │   ├── upload.js           # Multer file upload
│   │   └── validator.js        # Request validation
│   │
│   ├── models/
│   │   ├── booking.model.js    # Booking schema
│   │   ├── invoice.model.js    # Invoice schema
│   │   ├── itinerary.model.js  # Itinerary schema
│   │   ├── lead.model.js       # Lead management schema
│   │   ├── package.model.js    # Travel package schema
│   │   └── user.model.js       # User/Auth schema
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── booking.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── invoice.routes.js
│   │   ├── itinerary.routes.js
│   │   ├── lead.routes.js
│   │   ├── notification.routes.js
│   │   ├── package.routes.js
│   │   ├── payment.routes.js
│   │   └── user.routes.js
│   │
│   ├── services/
│   │   └── booking.service.js
│   │   # Business logic layer
│   │
│   ├── utils/
│   │   ├── apiFeatures.js      # Query helpers (pagination, filter, sort)
│   │   ├── appError.js         # Custom error class
│   │   ├── asyncHandler.js     # Async wrapper
│   │   ├── emailService.js     # Email sending utility
│   │   └── pdfGenerator.js     # PDF generation (invoices, itineraries)
│   │
│   ├── validators/
│   │   └── auth.validator.js
│   │   # Request validation schemas
│   │
│   └── server.js               # Main application entry point
│
├── tests/                      # Test files
├── logs/                       # Application logs
├── uploads/                    # File uploads (local development)
│   ├── images/
│   ├── documents/
│   ├── invoices/
│   └── itineraries/
│
├── .env.example               # Environment variables template
├── .eslintrc.cjs              # ESLint configuration
├── .gitignore                 # Git ignore rules
├── jest.config.cjs            # Jest test configuration
├── package.json               # Dependencies and scripts
└── README.md                  # Documentation
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd Server
npm install
```

### 2. Environment Setup

```bash
# Copy the example environment file
copy .env.example .env

# Edit .env with your actual configuration
# - Database connection string
# - JWT secrets
# - Email credentials
# - Payment gateway keys
# - Cloudinary credentials
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows - if MongoDB is installed as a service, it should already be running
# Otherwise, start it manually from the MongoDB installation directory
```

### 4. Run the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📋 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Fix linting errors automatically

## 🔧 Environment Variables

Key environment variables to configure in `.env`:

### Required
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

### Optional (for full functionality)
- Email settings (Nodemailer)
- SMS settings (Twilio)
- Payment gateways (Stripe, Razorpay)
- Cloudinary for image uploads

## 🗄️ Database Models

The server includes 6 main database models:

1. **User** - Authentication and user management
2. **Package** - Travel packages with itineraries
3. **Booking** - Customer bookings
4. **Lead** - Lead management system
5. **Invoice** - Billing and invoicing
6. **Itinerary** - Day-wise travel itineraries

## 🔐 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet for security headers
- XSS protection
- MongoDB sanitization
- CORS configuration

## 📡 API Endpoints (v1)

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `PUT /auth/reset-password/:token` - Reset password

### Packages
- `GET /packages` - Get all packages (with filters)
- `GET /packages/:id` - Get single package
- `POST /packages` - Create package (Admin/Staff)
- `PUT /packages/:id` - Update package (Admin/Staff)
- `DELETE /packages/:id` - Delete package (Admin)

### Bookings
- `POST /bookings` - Create booking
- `GET /bookings` - Get user bookings
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/cancel` - Cancel booking

### Leads
- `POST /leads` - Create lead
- `GET /leads` - Get all leads (Staff/Admin)
- `PUT /leads/:id` - Update lead
- `PATCH /leads/:id/assign` - Assign lead to staff

### Invoices
- `GET /invoices/:id` - Get invoice
- `GET /invoices/:id/pdf` - Download invoice PDF
- `POST /invoices` - Generate invoice (Admin/Staff)

## 📝 Next Steps

### For Developers:

1. **Implement Controllers** - Add business logic in controller files
2. **Add Validators** - Create validation schemas for all routes
3. **Write Tests** - Add unit and integration tests
4. **Add Services** - Implement business logic layer
5. **Payment Integration** - Configure Stripe/Razorpay
6. **Email Templates** - Design email templates
7. **Documentation** - Add API documentation (Swagger/Postman)

### For Deployment:

1. Set up production MongoDB (MongoDB Atlas)
2. Configure production environment variables
3. Set up Cloudinary for production
4. Configure payment gateways
5. Set up email service (SendGrid, AWS SES, etc.)
6. Deploy to hosting platform (Heroku, AWS, DigitalOcean, etc.)

## 🤝 Integration with Frontend

The server is configured to work with:
- **Client** - Customer-facing website (Port 5173)
- **Management** - Admin/Staff dashboard (Port 5174)

CORS is configured to allow requests from these origins.

## 📞 Support

For issues or questions, contact the development team.

---

**Note:** This is the initial setup. Controllers need to be implemented for full functionality.
