import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    [, token] = req.headers.authorization.split(' ');
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new AppError('Not authorized to access this route', 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      throw new AppError('User not found', 404);
    }

    if (!req.user.isActive) {
      throw new AppError('Your account has been deactivated', 403);
    }

    // Check if user changed password after token was issued
    if (req.user.changedPasswordAfter(decoded.iat)) {
      throw new AppError('Password was recently changed. Please login again.', 401);
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please login again.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Your token has expired. Please login again.', 401);
    }
    // Re-throw AppError as-is
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Not authorized to access this route', 401);
  }
});

export function authorize(...roles) {
  return function authorizeRoles(req, res, next) {
    // SuperAdmin has access to all routes that require admin or higher
    if (req.user.role === 'superAdmin') {
      return next();
    }

    // For other roles, check if they're in the allowed roles
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `User role '${req.user.role}' is not authorized to access this route`,
        403,
      );
    }
    next();
  };
}
