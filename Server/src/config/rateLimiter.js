import rateLimit from 'express-rate-limit';

// Rate limiting is DISABLED by default
// To enable rate limiting, set RATE_LIMIT_ENABLED=true in your .env file
// By default, all limiters will be no-op (no rate limiting applied)
const isRateLimitingDisabled =
  process.env.RATE_LIMIT_ENABLED !== 'true';

const noopMiddleware = (req, res, next) => next();

const createLimiter = (options) => (isRateLimitingDisabled ? noopMiddleware : rateLimit(options));

export const limiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // Limit each IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;
    const retryAfter = Math.ceil(windowMs / 1000); // Convert to seconds
    
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      message: `Too many requests from this IP. Limit: ${maxRequests} requests per ${Math.round(windowMs / 60000)} minutes. Please try again later.`,
      error: 'Rate limit exceeded',
      retryAfter: retryAfter, // seconds until retry is allowed
      limit: maxRequests,
      window: Math.round(windowMs / 60000), // window in minutes
    });
  },
});

export const authLimiter = createLimiter({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes (configurable via AUTH_RATE_LIMIT_WINDOW_MS)
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, 10) || 10, // Limit each IP to 10 login requests per windowMs (configurable via AUTH_RATE_LIMIT_MAX_ATTEMPTS)
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Only count failed login attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const windowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
    const maxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, 10) || 10;
    const windowMinutes = Math.round(windowMs / (60 * 1000));
    const retryAfter = Math.ceil(windowMs / 1000); // Convert to seconds
    
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      message: `Too many authentication attempts. Limit: ${maxAttempts} attempts per ${windowMinutes} minutes. Please try again after ${windowMinutes} minutes.`,
      error: 'Rate limit exceeded',
      retryAfter: retryAfter, // seconds until retry is allowed
      limit: maxAttempts,
      window: windowMinutes, // window in minutes
    });
  },
});

export const apiLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: 'Too many API requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retryAfter = 60; // 1 minute in seconds
    
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      message: 'Too many API requests. Limit: 60 requests per minute. Please slow down and try again in a minute.',
      error: 'Rate limit exceeded',
      retryAfter: retryAfter, // seconds until retry is allowed
      limit: 60,
      window: 1, // window in minutes
    });
  },
});
