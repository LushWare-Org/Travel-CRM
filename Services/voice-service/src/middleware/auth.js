import AppError from '../utils/appError.js';

export const extractUser = (req, res, next) => {
  const id = req.headers['x-user-id'];
  if (id) {
    let permissions = [];
    try {
      permissions = JSON.parse(req.headers['x-user-permissions'] || '[]');
    } catch {
      permissions = [];
    }
    req.user = {
      id,
      role: req.headers['x-user-role'],
      email: req.headers['x-user-email'],
      name: req.headers['x-user-name'],
      permissions,
      isSuperAdmin: req.headers['x-user-is-super-admin'] === 'true',
    };
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user?.id) return next(new AppError('Authentication required', 401));
  next();
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return next(new AppError('Forbidden', 403));
  next();
};
