import rateLimit from 'express-rate-limit';

const isRateLimitingDisabled =
  process.env.RATE_LIMIT_ENABLED === 'false' || process.env.NODE_ENV === 'development';

const noopMiddleware = (req, res, next) => next();

const createLimiter = (options) => (isRateLimitingDisabled ? noopMiddleware : rateLimit(options));

export const limiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // Limit each IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: 'Rate limit exceeded',
    });
  },
});

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes.',
      error: 'Rate limit exceeded',
    });
  },
});

export const apiLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: 'Too many API requests, please slow down.',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many API requests, please slow down.',
      error: 'Rate limit exceeded',
    });
  },
});
