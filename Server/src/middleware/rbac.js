import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

/**
 * RBAC Permissions Matrix
 * Defines what each role can do
 */
const RBAC_PERMISSIONS = {
  admin: {
    user: ['create', 'read', 'update', 'delete', 'assign_role', 'toggle_status', 'view_stats'],
    all: true,
  },
  salesRep: {
    user: ['read'],
    profile: ['read', 'update'],
  },
  vendor: {
    user: ['read'],
    profile: ['read', 'update'],
  },
  customer: {
    profile: ['read', 'update'],
  },
};

/**
 * Check if a role has permission for an action on a resource
 */
const hasPermission = (role, resource, action) => {
  const rolePermissions = RBAC_PERMISSIONS[role];

  if (!rolePermissions) {
    return false;
  }

  if (rolePermissions.all) {
    return true;
  }

  const resourcePermissions = rolePermissions[resource];
  return resourcePermissions && resourcePermissions.includes(action);
};

/**
 * RBAC Middleware - Check if user has permission for specific action
 * @param {string} resource - The resource being accessed (e.g., 'user', 'profile')
 * @param {string} action - The action being performed (e.g., 'create', 'read', 'update')
 */
export const checkPermission = (resource, action) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const hasAccess = hasPermission(req.user.role, resource, action);

    if (!hasAccess) {
      logger.warn(`Unauthorized access attempt: User ${req.user.email} (${req.user.role}) tried to ${action} ${resource}`);
      throw new AppError(
        `User role '${req.user.role}' is not authorized to ${action} ${resource}`,
        403,
      );
    }

    logger.debug(`Permission granted: User ${req.user.email} can ${action} ${resource}`);
    next();
  });
};

/**
 * Restrict to specific roles
 * Usage: restrictToRoles('admin', 'salesRep')
 */
export const restrictToRoles = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Unauthorized role access attempt: User ${req.user.email} (${req.user.role}) attempted restricted route`,
      );
      throw new AppError(
        `This route is only accessible by: ${allowedRoles.join(', ')}`,
        403,
      );
    }

    next();
  });
};

/**
 * Restrict to admin only
 */
export const adminOnly = restrictToRoles('admin');

/**
 * Allow multiple roles
 */
export const allowRoles = (...roles) => restrictToRoles(...roles);

/**
 * Check if user can manage other users
 * Usually only admins can do this
 */
export const canManageUsers = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  // Only admins can manage users
  if (req.user.role !== 'admin') {
    logger.warn(
      `Unauthorized user management attempt: ${req.user.email} (${req.user.role})`,
    );
    throw new AppError('Only administrators can manage users', 403);
  }

  next();
});

/**
 * Check if user can access their own profile or if they're admin
 */
export const canAccessProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const targetUserId = req.params.id;
  const isAdmin = req.user.role === 'admin';
  const isOwnProfile = req.user.id === targetUserId;

  if (!isAdmin && !isOwnProfile) {
    logger.warn(
      `Unauthorized profile access attempt: ${req.user.email} tried to access user ${targetUserId}`,
    );
    throw new AppError('You can only access your own profile', 403);
  }

  next();
});

/**
 * Get all permissions for a specific role
 */
export const getRolePermissions = (role) => {
  return RBAC_PERMISSIONS[role] || null;
};

/**
 * Check if user can edit another user
 * Rules: Admin can edit anyone, users can only edit themselves
 */
export const canEditUser = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const targetUserId = req.params.id;
  const isAdmin = req.user.role === 'admin';
  const isOwnProfile = req.user.id === targetUserId;

  // Check if trying to update role or status (admin only)
  if ((req.body.role || req.body.isActive) && !isAdmin) {
    throw new AppError('Only administrators can modify role or status', 403);
  }

  // Check if trying to edit another user's profile
  if (!isAdmin && !isOwnProfile) {
    throw new AppError('You can only edit your own profile', 403);
  }

  next();
});

/**
 * RBAC Audit Middleware
 * Logs all user management operations
 */
export const auditUserActions = asyncHandler(async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (res.statusCode < 400) {
      const actionMap = {
        POST: 'created',
        PUT: 'updated',
        PATCH: 'patched',
        DELETE: 'deleted',
        GET: 'accessed',
      };

      logger.info(`User Management Audit: ${req.user?.email} (${req.user?.role}) ${actionMap[req.method]} ${req.path}`, {
        userId: req.user?.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      });
    }

    return originalJson.call(this, data);
  };

  next();
});

/**
 * Middleware to check if requesting user is trying to perform elevated actions
 */
export const preventPrivilegeEscalation = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  // Non-admin users cannot:
  // 1. Assign admin role
  // 2. Change another user's role
  // 3. Activate/deactivate users
  // 4. Delete users

  if (req.user.role !== 'admin') {
    const elevatedActions = ['role', 'isActive', 'toggle-status', 'assign_role'];
    const requestHasElevatedAction = elevatedActions.some(
      (action) => req.path.includes(action) || req.body[action],
    );

    if (requestHasElevatedAction) {
      logger.warn(
        `Privilege escalation attempt: ${req.user.email} (${req.user.role}) attempted elevated action on ${req.path}`,
      );
      throw new AppError('You do not have permission to perform this action', 403);
    }
  }

  next();
});

export default {
  checkPermission,
  restrictToRoles,
  adminOnly,
  allowRoles,
  canManageUsers,
  canAccessProfile,
  getRolePermissions,
  canEditUser,
  auditUserActions,
  preventPrivilegeEscalation,
  hasPermission,
};
