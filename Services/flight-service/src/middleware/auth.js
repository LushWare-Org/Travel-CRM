import AppError from '../utils/appError.js';
import { UNAUTHORIZED, FORBIDDEN } from '../constants/httpStatus.js';
import { NOT_AUTHORIZED, ROLE_NOT_AUTHORIZED } from '../constants/errorMessages.js';

export const extractUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.user = {
      id: userId,
      role: req.headers['x-user-role'],
      email: req.headers['x-user-email'],
      name: req.headers['x-user-name'],
      permissions: JSON.parse(req.headers['x-user-permissions'] || '[]'),
      isSuperAdmin: req.headers['x-user-is-super-admin'] === 'true',
    };
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) return next(new AppError(NOT_AUTHORIZED, UNAUTHORIZED));
  next();
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError(NOT_AUTHORIZED, UNAUTHORIZED));
  if (req.user.isSuperAdmin || roles.includes(req.user.role)) return next();
  next(new AppError(ROLE_NOT_AUTHORIZED(req.user.role), FORBIDDEN));
};
