import AppError from '../utils/appError.js';

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
  if (!req.user) return next(new AppError('Not authorized', 401));
  next();
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authorized', 401));
  if (req.user.isSuperAdmin || roles.includes(req.user.role)) return next();
  next(new AppError(`Role '${req.user.role}' is not authorized`, 403));
};

// Additive, salesRep-only gate: authorize() already lets salesRep through the
// role check above; this narrows it further by permission-string so a
// salesRep without `manage_packages` still gets a clean 403. Admin/staff are
// untouched — this middleware only inspects role === 'salesRep'.
export const requirePackagePermissionForSalesRep = (req, res, next) => {
  if (req.user?.role !== 'salesRep') return next();
  if (req.user.isSuperAdmin || req.user.permissions?.includes('manage_packages')) return next();
  next(new AppError('You do not have permission to manage packages', 403));
};
