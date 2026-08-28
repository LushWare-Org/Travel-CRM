import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { correlationId, requestLogger } from './middleware/requestLogger.js';
import logger from './config/logger.js';

const app = express();

app.set('trust proxy', 1);

// Request ID + structured logging (replaces morgan). Runs first so every
// downstream middleware/proxy call has req.requestId and req.log available.
app.use(correlationId);
app.use(requestLogger);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.CLIENT_URL,
      process.env.MANAGEMENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3010',
      'https://lushtravelcloud.com',
      'https://www.lushtravelcloud.com',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(null, true); // allow mobile apps with no origin
  },
  credentials: true,
}));
app.use(cookieParser());

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
// Stricter than authLimiter: each request is a real, billed Gemini call, not a login attempt.
const aiItineraryPreviewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use(globalLimiter);

// ─── Service URLs ──────────────────────────────────────────────────────────────
const SERVICES = {
  auth:         process.env.AUTH_SERVICE_URL         || 'http://localhost:3001',
  user:         process.env.USER_SERVICE_URL          || 'http://localhost:3002',
  package:      process.env.PACKAGE_SERVICE_URL       || 'http://localhost:3003',
  lead:         process.env.LEAD_SERVICE_URL          || 'http://localhost:3004',
  booking:      process.env.BOOKING_SERVICE_URL       || 'http://localhost:3005',
  billing:      process.env.BILLING_SERVICE_URL       || 'http://localhost:3006',
  flight:       process.env.FLIGHT_SERVICE_URL        || 'http://localhost:3010',
  career:       process.env.CAREER_SERVICE_URL        || 'http://localhost:3007',
  notification: process.env.NOTIFICATION_SERVICE_URL  || 'http://localhost:3008',
  analytics:    process.env.ANALYTICS_SERVICE_URL     || 'http://localhost:3009',
};

// ─── Public routes (no JWT required) ──────────────────────────────────────────
const PUBLIC_PATTERNS = [
  // Auth
  [/^\/api\/v1\/auth\/(register|login|login-step[12]|resend-otp|forgot-password|reset-temp-password|verify-email)/, 'ALL'],
  [/^\/api\/v1\/auth\/reset-password\//, 'ALL'],
  // Public package browsing — explicit paths only; admin/AI sub-routes remain protected
  [/^\/api\/v1\/packages\/?(\?.*)?$/,           'GET'], // list
  [/^\/api\/v1\/packages\/featured\//,           'GET'], // featured
  [/^\/api\/v1\/packages\/stats\//,              'GET'], // stats
  [/^\/api\/v1\/packages\/search\//,             'GET'], // search
  [/^\/api\/v1\/packages\/category\//,           'GET'], // by category
  [/^\/api\/v1\/packages\/[^/]+\/?(\?.*)?$/,    'GET'], // single package view /:id
  [/^\/api\/v1\/reviews/, 'GET'],
  // Public forms
  [/^\/api\/v1\/bookings\/website$/, 'POST'],
  [/^\/api\/v1\/bookings\/recent$/, 'GET'],
  [/^\/api\/v1\/leads\/website-contact$/, 'POST'],
  [/^\/api\/v1\/customized-packages\/website$/, 'POST'],
  [/^\/api\/v1\/manual-itineraries\/website$/, 'POST'],
  [/^\/api\/v1\/packages\/generate-itinerary-preview$/, 'POST'],
  [/^\/api\/v1\/careers\/apply$/, 'POST'],
  [/^\/api\/v1\/vacancies\/?$/, 'GET'],
  [/^\/api\/v1\/vacancies\/admin\/all$/, 'GET'],
  // Upload public
  [/^\/api\/v1\/upload\/optimize$/, 'GET'],
  // Webhooks
  [/^\/api\/v1\/webhooks\//, 'ALL'],
  // View tracking (public token-based)
  [/\/viewed$/, 'POST'],
];

const isPublicRoute = (method, path) =>
  PUBLIC_PATTERNS.some(([re, m]) => re.test(path) && (m === 'ALL' || m === method));

// ─── JWT verification ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (isPublicRoute(req.method, req.path)) return next();

  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Forward user context to downstream services via headers
    req.headers['x-user-id']            = decoded.id;
    req.headers['x-user-role']          = decoded.role;
    req.headers['x-user-email']         = decoded.email;
    req.headers['x-user-name']          = decoded.name;
    req.headers['x-user-permissions']   = JSON.stringify(decoded.permissions || []);
    req.headers['x-user-is-super-admin'] = String(decoded.isSuperAdmin || false);
    // Strip client-supplied internal key to prevent privilege escalation
    delete req.headers['x-service-key'];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
});

// ─── Proxy factory ─────────────────────────────────────────────────────────────
// pathRewrite restores req.originalUrl because Express strips the mount prefix
// from req.url before passing control to the middleware (e.g. app.use('/api/v1/auth/login', ...)
// makes req.url === '/' inside the handler). Services expect the full path.
const proxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: (_path, req) => req.originalUrl,
  on: {
    proxyRes: (proxyRes) => {
      // Strip service-level CORS headers so the gateway's cors() middleware wins.
      // Services set their own Access-Control-Allow-Origin (often hardcoded to one
      // origin); leaving those headers in the proxied response would override the
      // gateway's correctly-reflected origin and block other allowed clients.
      delete proxyRes.headers['access-control-allow-origin'];
      delete proxyRes.headers['access-control-allow-credentials'];
      delete proxyRes.headers['access-control-allow-methods'];
      delete proxyRes.headers['access-control-allow-headers'];
    },
    error: (err, req, res) => {
      (req.log || logger).error({ err, target, requestId: req.requestId }, 'Proxy error');
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: 'Service temporarily unavailable' });
      }
    },
  },
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() })
);

// ─── Route table ───────────────────────────────────────────────────────────────
const V1 = '/api/v1';

// Auth — apply authLimiter to sensitive auth routes
app.use(`${V1}/auth/login`,          authLimiter, proxy(SERVICES.auth));
app.use(`${V1}/auth/login-step1`,    authLimiter, proxy(SERVICES.auth));
app.use(`${V1}/auth/login-step2`,    authLimiter, proxy(SERVICES.auth));
app.use(`${V1}/auth/resend-otp`,     authLimiter, proxy(SERVICES.auth));
app.use(`${V1}/auth/register`,       authLimiter, proxy(SERVICES.auth));
app.use(`${V1}/auth/forgot-password`,authLimiter, proxy(SERVICES.auth));
app.use(`${V1}/auth`,                proxy(SERVICES.auth));

// User management → user-service
app.use(`${V1}/users`,      proxy(SERVICES.user));
app.use(`${V1}/admin`,      proxy(SERVICES.user));
app.use(`${V1}/sales-reps`, proxy(SERVICES.user));
app.use(`${V1}/vendors`,    proxy(SERVICES.user));

// Packages → package-service
app.use(`${V1}/packages/generate-itinerary-preview`, aiItineraryPreviewLimiter, proxy(SERVICES.package));
app.use(`${V1}/packages`,    proxy(SERVICES.package));
app.use(`${V1}/reviews`,     proxy(SERVICES.package));
app.use(`${V1}/places`,      proxy(SERVICES.package));
app.use(`${V1}/activities`,  proxy(SERVICES.package));
app.use(`${V1}/hotels`,      proxy(SERVICES.package));
app.use(`${V1}/upload`,      proxy(SERVICES.package));

// Leads → lead-service
app.use(`${V1}/leads`, proxy(SERVICES.lead));
app.use(`${V1}/customized-packages`, proxy(SERVICES.lead));
app.use(`${V1}/manual-itineraries`, proxy(SERVICES.lead));

// Bookings → booking-service
app.use(`${V1}/bookings`, proxy(SERVICES.booking));

// Flights (Travelport) → flight-service
app.use(`${V1}/flights`, proxy(SERVICES.flight));

// Billing → billing-service
app.use(`${V1}/billing`,   proxy(SERVICES.billing));
app.use(`${V1}/invoices`,  proxy(SERVICES.billing));
app.use(`${V1}/payments`,  proxy(SERVICES.billing));

// Careers → career-service
app.use(`${V1}/careers`,   proxy(SERVICES.career));
app.use(`${V1}/vacancies`, proxy(SERVICES.career));

// Webhooks & notifications → notification-service
app.use(`${V1}/webhooks`,      proxy(SERVICES.notification));
app.use(`${V1}/notifications`, proxy(SERVICES.notification));

// Analytics & dashboard → analytics-service
app.use(`${V1}/analytics`, proxy(SERVICES.analytics));
app.use(`${V1}/dashboard`, proxy(SERVICES.analytics));

// ─── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'gateway started');
});

export default app;
