import crypto from 'crypto';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

// Generate temporary password
const generateTempPassword = () => {
  return crypto.randomBytes(8).toString('hex'); // 16 character hex string
};

// @desc    Create sales rep or vendor (admin only)
// @route   POST /api/v1/admin/users
// @access  Private/Admin
export const createStaff = asyncHandler(async (req, res, next) => {
  const { name, email, phone, role } = req.body;

  // Validate role
  if (!['salesRep', 'vendor'].includes(role)) {
    throw new AppError('Invalid role. Only salesRep and vendor can be created through this endpoint', 400);
  }

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
      message: `${role === 'salesRep' ? 'Sales Representative' : 'Vendor'} created successfully. Login credentials sent to their email.`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
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
      message: `${role === 'salesRep' ? 'Sales Representative' : 'Vendor'} created successfully, but failed to send email. Please provide credentials manually.`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
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
  const { role, isActive, search, page = 1, limit = 10 } = req.query;

  const query = {};

  // Filter by role
  if (role) {
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
    .select('-password')
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

  // Prevent deactivating own account
  if (user._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  // Prevent deactivating other admins
  if (user.role === 'admin') {
    throw new AppError('Cannot deactivate admin accounts', 403);
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

  // Prevent resetting other admin passwords
  if (user.role === 'admin' && user._id.toString() !== req.user.id.toString()) {
    throw new AppError('Cannot reset other admin passwords', 403);
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

  // Prevent updating admin details (except self)
  if (user.role === 'admin' && user._id.toString() !== req.user.id.toString()) {
    throw new AppError('Cannot update other admin accounts', 403);
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

  // Prevent deleting own account
  if (user._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot delete your own account', 400);
  }

  // Prevent deleting other admins
  if (user.role === 'admin') {
    throw new AppError('Cannot delete admin accounts', 403);
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
