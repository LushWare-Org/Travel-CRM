import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiFeatures from '../utils/apiFeatures.js';
import logger from '../config/logger.js';

/**
 * @desc    Get all users with filtering, sorting, and pagination
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const apiFeatures = new ApiFeatures(User.find(), req.query)
    .filter()
    .sort()
    .paginate();

  const users = await apiFeatures.query;

  // Get total count for pagination
  const totalUsers = await User.countDocuments();

  res.status(200).json({
    status: 'success',
    results: users.length,
    total: totalUsers,
    data: users,
  });
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private
 */
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/users/profile/me
 * @access  Private
 */
export const getCurrentUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

/**
 * @desc    Create a new user
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
export const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  // Check if user already exists
  let user = await User.findOne({ email });
  if (user) {
    return next(new AppError('Email already in use', 400));
  }

  // Create new user
  user = await User.create({
    name,
    email,
    phone,
    password,
    role: role || 'customer',
    createdBy: req.user.id,
    isEmailVerified: role !== 'customer', // Auto-verify non-customer users
  });

  // Generate JWT token
  const token = user.getSignedJwtToken();

  logger.info(`User created successfully: ${user.email} (Role: ${user.role})`);

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    },
  });
});

/**
 * @desc    Update user details
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  const { name, phone, role, isActive } = req.body;

  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Update allowed fields
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (role && req.user.role === 'admin') user.role = role;
  if (typeof isActive === 'boolean' && req.user.role === 'admin') user.isActive = isActive;

  await user.save();

  logger.info(`User updated successfully: ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: user,
  });
});

/**
 * @desc    Update user password
 * @route   PUT /api/v1/users/:id/change-password
 * @access  Private
 */
export const updateUserPassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.params.id).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if current password matches
  const isPasswordMatch = await user.matchPassword(currentPassword);

  if (!isPasswordMatch) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Update password
  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  user.mustChangePassword = false;
  await user.save();

  logger.info(`Password updated for user: ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
  });
});

/**
 * @desc    Delete user (soft delete)
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Soft delete by setting isActive to false
  user.isActive = false;
  await user.save();

  logger.info(`User deleted (deactivated): ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
  });
});

/**
 * @desc    Toggle user active status
 * @route   PATCH /api/v1/users/:id/toggle-status
 * @access  Private/Admin
 */
export const toggleUserStatus = asyncHandler(async (req, res, next) => {
  const { isActive } = req.body;

  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.isActive = isActive;
  await user.save();

  const statusMessage = isActive ? 'activated' : 'deactivated';
  logger.info(`User ${statusMessage}: ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: `User ${statusMessage} successfully`,
    data: {
      id: user._id,
      email: user.email,
      isActive: user.isActive,
    },
  });
});

/**
 * @desc    Get users by role
 * @route   GET /api/v1/users/role/:role
 * @access  Private/Admin
 */
export const getUsersByRole = asyncHandler(async (req, res, next) => {
  const { role } = req.params;
  const validRoles = ['customer', 'salesRep', 'vendor', 'admin'];

  if (!validRoles.includes(role)) {
    return next(new AppError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`, 400));
  }

  const apiFeatures = new ApiFeatures(User.find({ role }), req.query)
    .filter()
    .sort()
    .paginate();

  const users = await apiFeatures.query;
  const totalUsers = await User.countDocuments({ role });

  res.status(200).json({
    status: 'success',
    results: users.length,
    total: totalUsers,
    role,
    data: users,
  });
});

/**
 * @desc    Assign or update user role
 * @route   PATCH /api/v1/users/:id/role
 * @access  Private/Admin
 */
export const assignUserRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  const validRoles = ['customer', 'salesRep', 'vendor', 'admin'];

  if (!validRoles.includes(role)) {
    return next(new AppError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`, 400));
  }

  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  logger.info(`User role updated: ${user.email} (${oldRole} -> ${role})`);

  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully',
    data: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc    Get user statistics (dashboard)
 * @route   GET /api/v1/users/stats
 * @access  Private/Admin
 */
export const getUserStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const inactiveUsers = await User.countDocuments({ isActive: false });

  const usersByRole = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
  ]);

  const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

  res.status(200).json({
    status: 'success',
    data: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      verified: verifiedUsers,
      byRole: usersByRole,
    },
  });
});
