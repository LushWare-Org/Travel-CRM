import crypto from 'crypto';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

// Generate temporary password
const generateTempPassword = () => crypto.randomBytes(8).toString('hex'); // 16 character hex string

/**
 * Check if admin has permission to manage a specific role
 * @param {Object} requestingAdmin - The admin making the request
 * @param {String} targetRole - The role being managed (admin, vendor, salesRep)
 * @throws {AppError} If admin lacks permission
 */
const checkAdminPermissionForRole = (requestingAdmin, targetRole) => {
  // SuperAdmin has all permissions
  if (requestingAdmin.role === 'superAdmin') {
    return;
  }

  // If admin has granular permissions, check them
  if (requestingAdmin.role === 'admin' && requestingAdmin.permissions && requestingAdmin.permissions.length > 0) {
    const permissionMap = {
      admin: 'manage_admins',
      vendor: 'manage_vendors',
      salesRep: 'manage_sales_reps',
      customer: 'manage_users',
    };

    const requiredPermission = permissionMap[targetRole];
    if (requiredPermission && !requestingAdmin.permissions.includes(requiredPermission)) {
      logger.warn(
        `Unauthorized action attempt: ${requestingAdmin.email} lacks '${requiredPermission}' permission to manage ${targetRole}`,
      );
      throw new AppError(
        `You do not have permission to manage ${targetRole} accounts. Required permission: ${requiredPermission}`,
        403,
      );
    }
  }
};

// @desc    Create sales rep or vendor (admin only)
// @route   POST /api/v1/admin/users
// @access  Private/Admin
export const createStaff = asyncHandler(async (req, res, next) => {
  const {
    name, email, phone, role, permissions,
  } = req.body;

  // Validate role
  if (!['salesRep', 'vendor', 'admin'].includes(role)) {
    throw new AppError('Invalid role. Only salesRep, vendor, and admin can be created through this endpoint', 400);
  }

  // PERMISSION CHECK: Enforce granular permissions for admins
  checkAdminPermissionForRole(req.user, role);

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Generate temporary password
  const tempPassword = generateTempPassword();

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password: tempPassword,
    role,
    permissions: role === 'admin' && permissions ? permissions : [], // Only apply permissions to admins
    isTempPassword: true,
    mustChangePassword: true,
    isEmailVerified: true, // Staff accounts are pre-verified
    createdBy: req.user.id,
  });

  try {
    // Send credentials email
    await emailService.sendStaffCredentials(user, tempPassword, role);

    logger.info(`${role} created by admin: ${user.email}`);

    res.status(201).json({
      status: 'success',
      message: `${role === 'salesRep' ? 'Sales Representative' : role === 'vendor' ? 'Vendor' : 'Administrator'} created successfully. Login credentials sent to their email.`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          permissions: user.permissions,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    // If email fails, still return success but log the error
    logger.error(`Failed to send credentials email: ${err.message}`);

    res.status(201).json({
      status: 'success',
      message: `${role === 'salesRep' ? 'Sales Representative' : role === 'vendor' ? 'Vendor' : 'Administrator'} created successfully, but failed to send email. Please provide credentials manually.`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          permissions: user.permissions,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        temporaryPassword: tempPassword, // Only show if email failed
      },
    });
  }
});

// @desc    Get all users (admin only)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const {
    role, isActive, search, page = 1, limit = 10,
  } = req.query;

  const query = {};

  // PERMISSION-BASED FILTERING: If admin has granular permissions, filter by accessible roles
  if (req.user.role === 'admin' && req.user.permissions && req.user.permissions.length > 0) {
    const accessibleRoles = [];
    if (req.user.permissions.includes('manage_users')) accessibleRoles.push('customer');
    if (req.user.permissions.includes('manage_sales_reps')) accessibleRoles.push('salesRep');
    if (req.user.permissions.includes('manage_vendors')) accessibleRoles.push('vendor');
    if (req.user.permissions.includes('manage_admins')) accessibleRoles.push('admin');

    // If admin has no permissions, return empty list
    if (accessibleRoles.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          users: [],
          pagination: {
            total: 0,
            page: parseInt(page, 10),
            pages: 0,
            limit: parseInt(limit, 10),
          },
        },
      });
    }

    // Only allow filtering by accessible roles
    if (role && !accessibleRoles.includes(role)) {
      return res.status(403).json({
        status: 'error',
        message: `You do not have permission to view ${role} users`,
      });
    }

    query.role = role || { $in: accessibleRoles };
  } else if (role) {
    // SuperAdmin can filter by any role
    query.role = role;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const users = await User.find(query)
    .select('name email phone role isActive createdAt lastLogin permissions createdBy')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .populate('createdBy', 'name email');

  const total = await User.countDocuments(query);

  res.status(200).json({
    status: 'success',
    data: {
      users,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        limit: parseInt(limit, 10),
      },
    },
  });
});

// @desc    Get user by ID (admin only)
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('createdBy', 'name email');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // PERMISSION CHECK: Verify access to user's role
  checkAdminPermissionForRole(req.user, user.role);

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// @desc    Update user status (activate/deactivate)
// @route   PATCH /api/v1/admin/users/:id/status
// @access  Private/Admin
export const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { isActive } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // PERMISSION CHECK: Verify access to user's role
  checkAdminPermissionForRole(req.user, user.role);

  // Prevent deactivating own account
  if (user._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  // Prevent deactivating other admins (unless current user is super admin)
  if (user.role === 'admin' && req.user.role !== 'superAdmin') {
    throw new AppError('Cannot deactivate admin accounts', 403);
  }

  // Prevent deactivating super admins
  if (user.role === 'superAdmin') {
    throw new AppError('Cannot deactivate super admin accounts', 403);
  }

  user.isActive = isActive;
  await user.save({ validateBeforeSave: false });

  logger.info(`User ${user.email} ${isActive ? 'activated' : 'deactivated'} by admin`);

  res.status(200).json({
    status: 'success',
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    },
  });
});

// @desc    Reset user password (admin only)
// @route   POST /api/v1/admin/users/:id/reset-password
// @access  Private/Admin
export const resetUserPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // PERMISSION CHECK: Verify access to user's role
  checkAdminPermissionForRole(req.user, user.role);

  // Prevent resetting other admin passwords (unless current user is super admin)
  if (user.role === 'admin' && user._id.toString() !== req.user.id.toString() && req.user.role !== 'superAdmin') {
    throw new AppError('Cannot reset other admin passwords', 403);
  }

  // Prevent resetting super admin passwords (only super admin themselves can reset)
  if (user.role === 'superAdmin' && user._id.toString() !== req.user.id.toString()) {
    throw new AppError('Only the super admin can reset their own password', 403);
  }

  // Generate new temporary password
  const tempPassword = generateTempPassword();

  user.password = tempPassword;
  user.isTempPassword = true;
  user.mustChangePassword = true;
  user.passwordChangedAt = Date.now();
  await user.save();

  try {
    // Send new credentials email
    await emailService.sendStaffCredentials(user, tempPassword, user.role);

    logger.info(`Password reset for user ${user.email} by admin`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. New credentials sent to user email.',
    });
  } catch (err) {
    logger.error(`Failed to send password reset email: ${err.message}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully, but failed to send email.',
      data: {
        temporaryPassword: tempPassword, // Only show if email failed
      },
    });
  }
});

// @desc    Update user details (admin only)
// @route   PUT /api/v1/admin/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res, next) => {
  const { name, phone, email } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // PERMISSION CHECK: Verify access to user's role
  checkAdminPermissionForRole(req.user, user.role);

  // Prevent updating admin details (except self or if current user is super admin)
  if (user.role === 'admin' && user._id.toString() !== req.user.id.toString() && req.user.role !== 'superAdmin') {
    throw new AppError('Cannot update other admin accounts', 403);
  }

  // Prevent updating superAdmin details (only superAdmin themselves can update)
  if (user.role === 'superAdmin' && user._id.toString() !== req.user.id.toString()) {
    throw new AppError('Only the super admin can update their own details', 403);
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email is already in use', 400);
    }
    user.email = email;
    user.isEmailVerified = false; // Require re-verification
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;

  await user.save();

  logger.info(`User ${user.email} updated by admin`);

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user,
    },
  });
});

// @desc    Delete user (admin only)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // PERMISSION CHECK: Verify access to user's role
  checkAdminPermissionForRole(req.user, user.role);

  // Prevent deleting own account
  if (user._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot delete your own account', 400);
  }

  // Prevent deleting other admins (unless current user is super admin)
  if (user.role === 'admin' && req.user.role !== 'superAdmin') {
    throw new AppError('Cannot delete admin accounts', 403);
  }

  // Prevent deleting superAdmins
  if (user.role === 'superAdmin') {
    throw new AppError('Super admin accounts cannot be deleted. Only super admins can demote themselves.', 403);
  }

  // Check if user has canBeDeleted flag set to false
  if (!user.canBeDeleted) {
    throw new AppError('This user account cannot be deleted', 403);
  }

  await user.deleteOne();

  logger.info(`User ${user.email} deleted by admin`);

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
    data: null,
  });
});

// @desc    Get dashboard statistics (admin only)
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const customerCount = await User.countDocuments({ role: 'customer' });
  const salesRepCount = await User.countDocuments({ role: 'salesRep' });
  const vendorCount = await User.countDocuments({ role: 'vendor' });
  const adminCount = await User.countDocuments({ role: 'admin' });
  const unverifiedEmails = await User.countDocuments({ isEmailVerified: false });

  // Get recent users (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        recentUsers,
        unverifiedEmails,
        usersByRole: {
          customer: customerCount,
          salesRep: salesRepCount,
          vendor: vendorCount,
          admin: adminCount,
        },
      },
    },
  });
});

// @desc    Update admin permissions
// @route   PATCH /api/v1/admin/users/:id/permissions
// @access  Private/Admin
export const updateAdminPermissions = asyncHandler(async (req, res, next) => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    throw new AppError('Permissions must be an array', 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Only admins can have permissions
  if (user.role !== 'admin') {
    throw new AppError('Permissions can only be assigned to admin users', 400);
  }

  // Prevent modifying own permissions
  if (user._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot modify your own permissions', 403);
  }

  // Only super admins can modify admin permissions
  if (req.user.role !== 'superAdmin') {
    throw new AppError('Only super admins can modify admin permissions', 403);
  }

  const validPermissions = [
    'manage_users',
    'manage_sales_reps',
    'manage_vendors',
    'manage_admins',
    'view_reports',
    'manage_billing',
    'system_settings',
    'audit_log',
  ];

  // Validate all permissions
  const invalidPermissions = permissions.filter((perm) => !validPermissions.includes(perm));
  if (invalidPermissions.length > 0) {
    throw new AppError(`Invalid permissions: ${invalidPermissions.join(', ')}`, 400);
  }

  user.permissions = permissions;
  await user.save({ validateBeforeSave: false });

  logger.info(`Admin permissions updated for ${user.email} by ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Admin permissions updated successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
    },
  });
});

// @desc    Get admin permissions
// @route   GET /api/v1/admin/users/:id/permissions
// @access  Private/Admin
export const getAdminPermissions = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('name email role permissions');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role !== 'admin') {
    throw new AppError('Only admin users have permissions', 400);
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      },
    },
  });
});

// @desc    Get all available permissions
// @route   GET /api/v1/admin/permissions/available
// @access  Private/Admin
export const getAvailablePermissions = asyncHandler(async (req, res, next) => {
  const availablePermissions = [
    { id: 'manage_users', label: 'Manage Website Users', category: 'Users', description: 'Create, edit, and manage customer accounts' },
    { id: 'manage_sales_reps', label: 'Manage Sales Reps', category: 'Staff', description: 'Manage sales representatives and their assignments' },
    { id: 'manage_vendors', label: 'Manage Vendors', category: 'Partners', description: 'Manage vendor partnerships and services' },
    { id: 'manage_admins', label: 'Manage Admins', category: 'System', description: 'Create and manage administrator accounts' },
    { id: 'view_reports', label: 'View Reports', category: 'Analytics', description: 'Access business reports and analytics' },
    { id: 'manage_billing', label: 'Manage Billing', category: 'Finance', description: 'Handle billing and payment operations' },
    { id: 'system_settings', label: 'System Settings', category: 'System', description: 'Configure system-wide settings' },
    { id: 'audit_log', label: 'View Audit Logs', category: 'System', description: 'View system audit logs and activity' },
  ];

  res.status(200).json({
    status: 'success',
    data: {
      permissions: availablePermissions,
    },
  });
});

// ============================================
// SUPER ADMIN MANAGEMENT ENDPOINTS
// ============================================

// @desc    Promote admin to super admin (superAdmin only)
// @route   POST /api/v1/admin/super/promote
// @access  Private/SuperAdmin
export const promoteSuperAdmin = asyncHandler(async (req, res, next) => {
  const { userId, email } = req.body;

  // Find user to promote
  let userToPromote = null;
  if (userId) {
    userToPromote = await User.findById(userId);
  } else if (email) {
    userToPromote = await User.findOne({ email: email.toLowerCase() });
  }

  if (!userToPromote) {
    throw new AppError('User not found', 404);
  }

  // Can only promote admins to superAdmin
  if (userToPromote.role !== 'admin') {
    throw new AppError('Only admin users can be promoted to super admin', 400);
  }

  // Check if already a superAdmin
  if (userToPromote.role === 'superAdmin') {
    throw new AppError('User is already a super admin', 400);
  }

  // Update user to superAdmin
  userToPromote.role = 'superAdmin';
  userToPromote.isSuperAdmin = true;
  userToPromote.canBeDeleted = false;
  // SuperAdmins automatically get all permissions
  userToPromote.permissions = [
    'manage_users',
    'manage_sales_reps',
    'manage_vendors',
    'manage_admins',
    'view_reports',
    'manage_billing',
    'system_settings',
    'audit_log',
  ];

  await userToPromote.save();

  logger.info(`User ${userToPromote.email} promoted to super admin by ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: `${userToPromote.name} has been promoted to Super Admin with all permissions`,
    data: {
      user: {
        id: userToPromote._id,
        name: userToPromote.name,
        email: userToPromote.email,
        role: userToPromote.role,
        isSuperAdmin: userToPromote.isSuperAdmin,
        permissions: userToPromote.permissions,
      },
    },
  });
});

// @desc    Demote super admin to admin (superAdmin only)
// @route   POST /api/v1/admin/super/demote
// @access  Private/SuperAdmin
export const demoteSuperAdmin = asyncHandler(async (req, res, next) => {
  const { userId, newRole = 'admin' } = req.body;

  const userToDemote = await User.findById(userId);

  if (!userToDemote) {
    throw new AppError('User not found', 404);
  }

  // Can only demote superAdmins
  if (userToDemote.role !== 'superAdmin') {
    throw new AppError('Only super admin users can be demoted', 400);
  }

  // Prevent demoting yourself
  if (userToDemote._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot demote yourself. Please contact another super admin.', 400);
  }

  // Update user role
  userToDemote.role = newRole;
  userToDemote.isSuperAdmin = false;
  userToDemote.canBeDeleted = true;
  // Clear permissions for non-admin roles
  userToDemote.permissions = newRole === 'admin' ? [] : [];

  await userToDemote.save();

  logger.info(`User ${userToDemote.email} demoted from super admin to ${newRole} by ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: `${userToDemote.name} has been demoted to ${newRole}`,
    data: {
      user: {
        id: userToDemote._id,
        name: userToDemote.name,
        email: userToDemote.email,
        role: userToDemote.role,
        isSuperAdmin: userToDemote.isSuperAdmin,
        permissions: userToDemote.permissions,
      },
    },
  });
});

// @desc    Get super admin info (current super admin)
// @route   GET /api/v1/admin/super/info
// @access  Private/SuperAdmin
export const getSuperAdminInfo = asyncHandler(async (req, res, next) => {
  // Verify that the current user is a superAdmin
  if (req.user.role !== 'superAdmin') {
    throw new AppError('Only super admin can access this information', 403);
  }

  const superAdmins = await User.find({ role: 'superAdmin' }).select(
    'id name email phone isSuperAdmin createdAt lastLogin isActive',
  );

  res.status(200).json({
    status: 'success',
    data: {
      currentUser: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isSuperAdmin: req.user.isSuperAdmin,
        permissions: req.user.permissions,
      },
      allSuperAdmins: superAdmins,
    },
  });
});

// @desc    Get super admin count and list
// @route   GET /api/v1/admin/super/list
// @access  Private/SuperAdmin
export const listSuperAdmins = asyncHandler(async (req, res, next) => {
  const superAdmins = await User.find({ role: 'superAdmin' })
    .select('name email phone isActive createdAt lastLogin')
    .sort({ createdAt: 1 });

  res.status(200).json({
    status: 'success',
    data: {
      count: superAdmins.length,
      superAdmins,
    },
  });
});
