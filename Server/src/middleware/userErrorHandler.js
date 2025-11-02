import logger from '../config/logger.js';

/**
 * Custom error class for user management operations
 */
export class UserManagementError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'UserManagementError';
  }
}

/**
 * User management specific error handler
 * Should be used in user controller methods
 */
export const handleUserError = (error, userId = 'unknown') => {
  logger.error(`User Management Error for user ${userId}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const message = `User with this ${field} already exists`;
    return new UserManagementError(message, 400, { field });
  }

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return new UserManagementError('Validation failed', 400, { errors });
  }

  // MongoDB cast error
  if (error.name === 'CastError') {
    return new UserManagementError('Invalid user ID format', 400);
  }

  return error;
};

/**
 * Enhanced global error handler for the application
 * Handles both general errors and user management specific errors
 */
export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Log error details
  logger.error(err.stack || err.message, {
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    statusCode,
  });

  // Handle specific error types
  // Duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    status = 'fail';
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    details = { field };
  }

  // Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    status = 'fail';
    message = 'Validation failed';
    details = {
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    };
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    status = 'fail';
    message = 'Invalid ID format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    status = 'fail';
    message = 'Invalid token. Please login again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    status = 'fail';
    message = 'Token expired. Please login again.';
  }

  // Send response
  res.status(statusCode).json({
    status,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Middleware to catch async errors in route handlers
 */
export const catchAsyncErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error wrapper for user-specific operations
 */
export const withUserErrorHandling = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    const handledError = handleUserError(error, req.params.id || req.user?.id);
    next(handledError);
  }
};

export default globalErrorHandler;
