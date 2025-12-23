import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST before any other imports
dotenv.config({ path: join(__dirname, '../.env') });

import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import morgan from 'morgan';

// Import configurations
import corsOptions from './config/cors.js';
import { limiter } from './config/rateLimiter.js';
import logger from './config/logger.js';
import { dropReviewsIndexes } from './utils/indexManager.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import salesRepRoutes from './routes/salesRep.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import packageRoutes from './routes/package.routes.js';
import packageAIRoutes from './routes/packageAI.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import reviewRoutes from './routes/review.routes.js';
import leadRoutes from './routes/lead.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import itineraryRoutes from './routes/itinerary.routes.js';
import manualItineraryRoutes from './routes/manualItinerary.routes.js';
import customizedPackageRoutes from './routes/customizedPackage.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

// Billing Module Routes
import quotationRoutes from './routes/quotation.routes.js';
import paymentReceiptRoutes from './routes/paymentReceipt.routes.js';
import creditNoteRoutes from './routes/creditNote.routes.js';
import billingRoutes from './routes/billing.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import paymentHistoryRoutes from './routes/paymentHistory.routes.js';
import hotelSuggestionRoutes from './routes/hotelSuggestion.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import emailService from './utils/emailService.js';

const app = express();

// Trust proxy
app.set('trust proxy', 1);
app.set('request timeout', 45000);
// Enable query parser
app.set('query parser', 'extended');

// Middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // CORS
app.use(compression()); // Compress responses
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies - increased for large chart images
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(mongoSanitize()); // Sanitize data against NoSQL injection
app.use(xss()); // Prevent XSS attacks

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
app.use('/api', limiter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Test route to verify query parameters are working
app.get('/test-query', (req, res) => {
  res.status(200).json({
    message: 'Query parameters test',
    query: req.query,
    params: req.params,
    url: req.url
  });
});

// Favicon route (to prevent 404 errors)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/sales-reps`, salesRepRoutes);
app.use(`/api/${API_VERSION}/vendors`, vendorRoutes);
// Register AI routes BEFORE package routes to avoid route conflicts
// Static routes like /ai-status must come before parameterized routes like /:id
app.use(`/api/${API_VERSION}/packages`, packageAIRoutes);
app.use(`/api/${API_VERSION}/packages`, packageRoutes);
app.use(`/api/${API_VERSION}/bookings`, bookingRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/leads`, leadRoutes);
// Legacy route for backwards compatibility (if needed)
app.use(`/api/${API_VERSION}/invoices`, invoiceRoutes);
// Billing module route (preferred)
app.use(`/api/${API_VERSION}/billing/invoices`, invoiceRoutes);
app.use(`/api/${API_VERSION}/itineraries`, itineraryRoutes);
app.use(`/api/${API_VERSION}/manual-itineraries`, manualItineraryRoutes);
app.use(`/api/${API_VERSION}/customized-packages`, customizedPackageRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadRoutes);
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);

// Billing Module Routes
app.use(`/api/${API_VERSION}/billing/quotations`, quotationRoutes);
app.use(`/api/${API_VERSION}/billing/receipts`, paymentReceiptRoutes);
app.use(`/api/${API_VERSION}/billing/credit-notes`, creditNoteRoutes);
app.use(`/api/${API_VERSION}/billing/vouchers`, voucherRoutes);
app.use(`/api/${API_VERSION}/billing/payment-history`, paymentHistoryRoutes);
app.use(`/api/${API_VERSION}/billing`, billingRoutes);
app.use(`/api/${API_VERSION}/hotels`, hotelSuggestionRoutes);

// Webhook routes (public endpoints for external services)
app.use(`/api/${API_VERSION}/webhooks`, webhookRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    await dropReviewsIndexes();
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, async () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/${API_VERSION}`);
    
    // Verify email service after server starts
    await emailService.verifyConnection();
  });
  server.setTimeout(45000);
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  console.log('Shutting down server due to unhandled promise rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  console.log('Shutting down server due to uncaught exception');
  process.exit(1);
});

export default app;
