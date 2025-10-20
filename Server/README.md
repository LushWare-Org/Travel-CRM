# Trip Sky Way - Server API

Backend API for Trip Sky Way Travel Agency Management System

## 🚀 Features

- **Customer Management** - User authentication, profiles, and booking history
- **Package Management** - Travel package CRUD operations with itinerary builder
- **Lead Management** - Lead capture, tracking, and conversion pipeline
- **Booking System** - Complete booking flow with payment integration
- **Billing & Invoicing** - Invoice generation, payment tracking, and PDF export
- **Email/SMS Notifications** - Automated notifications for bookings and updates
- **Payment Integration** - Stripe and Razorpay support
- **Media Management** - Cloudinary integration for image uploads

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm >= 9.0.0

## 🛠️ Installation

1. Clone the repository
2. Navigate to Server directory
```bash
cd Server
```

3. Install dependencies
```bash
npm install
```

4. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start the development server
```bash
npm run dev
```

## 📁 Project Structure

```
Server/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   ├── services/        # Business logic
│   ├── validators/      # Request validators
│   └── server.js        # Entry point
├── tests/               # Test files
├── uploads/             # File uploads
├── logs/                # Application logs
├── .env.example         # Environment template
└── package.json
```

## � Documentation

For detailed documentation, see the [docs](./docs/) directory:

- **[📖 Main Documentation](./docs/README.md)** - Complete documentation index
- **[🏗️ Architecture](./docs/architecture/)** - System design and technical details
- **[🚀 Development](./docs/development/)** - Setup guides and development workflow
- **[📦 Deployment](./docs/deployment/)** - Production deployment guides

### Quick Links
- [Setup Guide](./docs/development/SETUP.md) - Get started quickly
- [System Architecture](./docs/architecture/ARCHITECTURE.md) - Technical overview
- [Development Roadmap](./docs/development/TODO.md) - What's next
- [Environment Security](./docs/development/ENVIRONMENT_SECURITY.md) - Security best practices

## �🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/forgot-password` - Password reset request
- `PUT /api/v1/auth/reset-password/:token` - Reset password

### Packages
- `GET /api/v1/packages` - Get all packages
- `GET /api/v1/packages/:id` - Get package details
- `POST /api/v1/packages` - Create package (Admin)
- `PUT /api/v1/packages/:id` - Update package (Admin)
- `DELETE /api/v1/packages/:id` - Delete package (Admin)

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - Get user bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `PATCH /api/v1/bookings/:id/cancel` - Cancel booking

### Leads
- `POST /api/v1/leads` - Create lead
- `GET /api/v1/leads` - Get all leads (Staff)
- `PUT /api/v1/leads/:id` - Update lead
- `PATCH /api/v1/leads/:id/assign` - Assign lead to staff

### Invoices
- `GET /api/v1/invoices/:id` - Get invoice
- `GET /api/v1/invoices/:id/pdf` - Download invoice PDF
- `POST /api/v1/invoices` - Generate invoice (Admin)

## 🧪 Testing

```bash
npm test
npm run test:watch
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues

## 🔒 Security

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet for security headers
- XSS protection
- MongoDB sanitization
- CORS configuration

## 📄 License

ISC
