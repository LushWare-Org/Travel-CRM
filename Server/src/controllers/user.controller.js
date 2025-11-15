import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { APIFeatures, getPaginationData } from '../utils/apiFeatures.js';
import logger from '../config/logger.js';
import emailService from '../utils/emailService.js';

/**
 * @desc    Get all users with advanced filtering, sorting, and pagination
 * @route   GET /api/v1/users
 * @access  Private/Admin
 * @query   page, limit, sort, search, role, isActive, isEmailVerified, fields
 * @example GET /api/v1/users?page=1&limit=10&sort=-createdAt&role=admin&search=john&isActive=true
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  // Validate pagination
  if (page < 1 || limit < 1 || limit > 100) {
    return next(new AppError('Invalid pagination parameters', 400));
  }

  try {
    // Build filter object
    const filter = {};

    // Role filter
    if (req.query.role) {
      const validRoles = ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin'];
      if (!validRoles.includes(req.query.role)) {
        return next(new AppError(`Invalid role: ${req.query.role}`, 400));
      }
      filter.role = req.query.role;
    }

    // Active status filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Email verified filter
    if (req.query.isEmailVerified !== undefined) {
      filter.isEmailVerified = req.query.isEmailVerified === 'true';
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Build sort object
    let sortObj = {};
    if (req.query.sort) {
      const sortFields = req.query.sort.split(',');
      sortFields.forEach((field) => {
        if (field.startsWith('-')) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      });
    } else {
      sortObj = { createdAt: -1 }; // Default: newest first
    }

    // Build select object for field limiting
    let selectFields = '-__v -password'; // Exclude sensitive fields by default
    if (req.query.fields) {
      const requestedFields = req.query.fields.split(',');
      // Ensure password is never returned
      if (requestedFields.includes('password')) {
        return next(new AppError('Cannot select password field', 400));
      }
      selectFields = requestedFields.join(' ') + ' -password';
    }

    // Execute query with optimizations
    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .sort(sortObj)
        .select(selectFields)
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      User.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limit);

    logger.debug(`Retrieved ${users.length} users (page ${page}, total ${totalUsers})`);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          usersPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error(`Error retrieving users: ${error.message}`);
    return next(new AppError('Error retrieving users', 500));
  }
});

/**
 * @desc    Get single user by ID with authorization checks
 * @route   GET /api/v1/users/:id
 * @access  Private
 * @rules   Users can view their own profile, admins can view anyone
 */
export const getUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  try {
    const user = await User.findById(id).select('-__v');

    if (!user) {
      logger.warn(`User not found: ${id}`);
      return next(new AppError('User not found', 404));
    }

    // Authorization check: Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      logger.warn(`Unauthorized access attempt: ${req.user.email} tried to view user ${id}`);
      return next(new AppError('You can only view your own profile', 403));
    }

    logger.debug(`User retrieved: ${user.email}`);

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    logger.error(`Error retrieving user ${id}: ${error.message}`);
    return next(new AppError('Error retrieving user', 500));
  }
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
 * @desc    Create a new user with validation and audit logging
 * @route   POST /api/v1/users
 * @access  Private/Admin
 * @body    { name, email, phone, password, role }
 * @rules   Only admins can create users, email must be unique
 */
export const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn(`Duplicate email attempt: ${email}`);
      return next(new AppError('Email already in use', 400));
    }

    // Validate role
    const validRoles = ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin'];
    const userRole = role || 'customer';
    if (!validRoles.includes(userRole)) {
      return next(new AppError(`Invalid role: ${userRole}`, 400));
    }

    // Prevent non-admins from creating admin users
    if ((userRole === 'admin' || userRole === 'superAdmin') && req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      logger.warn(`Non-admin attempted to create admin/superAdmin user: ${req.user.email}`);
      return next(new AppError('Only admins can create admin users', 403));
    }

    // Create new user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone || undefined,
      password,
      role: userRole,
      createdBy: req.user.id,
      isEmailVerified: userRole !== 'customer', // Auto-verify non-customer users
      // Set temporary password flags for admin users
      isTempPassword: userRole === 'admin',
      mustChangePassword: userRole === 'admin',
    });

    // Generate JWT token for the new user
    const token = newUser.getSignedJwtToken();

    // 📧 Send invitation email with credentials
    try {
      await emailService.sendStaffCredentials(newUser, password, newUser.role);
      logger.info(`Invitation email sent to ${newUser.email}`);
    } catch (emailError) {
      logger.error(`Failed to send invitation email to ${newUser.email}: ${emailError.message}`);
      // Still return success as user is created, but include warning in response
      logger.warn(`User created but email delivery failed - admin should manually notify: ${newUser.email}`);
    }

    // Log the action
    logger.info(
      `User created successfully: ${newUser.email} (Role: ${newUser.role}) by ${req.user.email}`,
    );

    // Return minimal user data (without password)
    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          isActive: newUser.isActive,
          isEmailVerified: newUser.isEmailVerified,
          isTempPassword: newUser.isTempPassword,
          mustChangePassword: newUser.mustChangePassword,
          createdAt: newUser.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return next(new AppError(`Validation error: ${messages.join(', ')}`, 400));
    }

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new AppError(`A user with this ${field} already exists`, 400));
    }

    return next(new AppError('Error creating user', 500));
  }
});

/**
 * @desc    Update user details with field-level authorization
 * @route   PUT /api/v1/users/:id
 * @access  Private
 * @body    { name, phone, role, isActive }
 * @rules   Users can update own profile (name, phone), admins can update any field
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, phone, role, isActive } = req.body;

  // Validate ID format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      logger.warn(`User not found for update: ${id}`);
      return next(new AppError('User not found', 404));
    }

    // Authorization check: Users can only update their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      logger.warn(
        `Unauthorized update attempt: ${req.user.email} tried to update user ${id}`,
      );
      return next(new AppError('You can only update your own profile', 403));
    }

    // Non-admins can only update name and phone
    if (req.user.role !== 'admin') {
      if (role || isActive !== undefined) {
        logger.warn(
          `Non-admin ${req.user.email} attempted to update protected fields for user ${id}`,
        );
        return next(new AppError('You can only update your name and phone', 403));
      }
    }

    // Update fields with validation
    if (name) {
      user.name = name.trim();
    }

    if (phone) {
      // Validate phone format
      if (!phone.match(/^[0-9]{10}$/)) {
        return next(new AppError('Invalid phone number format', 400));
      }
      user.phone = phone;
    }

    // Admin-only fields
    if (req.user.role === 'admin' || req.user.role === 'superAdmin') {
      if (role) {
        const validRoles = ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin'];
        if (!validRoles.includes(role)) {
          return next(new AppError(`Invalid role: ${role}`, 400));
        }
        user.role = role;
      }

      if (typeof isActive === 'boolean') {
        user.isActive = isActive;
      }
    }

    // Save the updated user
    await user.save();

    logger.info(`User updated successfully: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error(`Error updating user ${id}: ${error.message}`);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return next(new AppError(`Validation error: ${messages.join(', ')}`, 400));
    }

    return next(new AppError('Error updating user', 500));
  }
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
 * @desc    Permanently delete user from database
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 * @rules   Only admins can permanently delete users
 * @warning This operation is irreversible - data will be lost
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { confirmDelete } = req.query; // Changed from req.body to req.query

  // Validate ID format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  try {
    // Require confirmation for permanent deletion
    if (!confirmDelete || confirmDelete !== 'true') {
      return next(
        new AppError(
          'Permanent deletion requires confirmation. Set confirmDelete to true.',
          400,
        ),
      );
    }

    const user = await User.findById(id);

    if (!user) {
      logger.warn(`User not found for permanent deletion: ${id}`);
      return next(new AppError('User not found', 404));
    }

    // Prevent deletion of the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        logger.warn(
          `Attempted to delete the last admin user: ${user.email} by ${req.user.email}`,
        );
        return next(new AppError('Cannot delete the last admin user', 400));
      }
    }

    // Log the deletion before removing
    logger.warn(
      `User permanently deleted: ${user.email} by ${req.user.email} (Admin)`,
    );

    // Perform the permanent deletion
    await User.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'User permanently deleted successfully',
      data: {
        deletedUserId: id,
        deletedEmail: user.email,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error(`Error deleting user ${id}: ${error.message}`);
    return next(new AppError('Error deleting user', 500));
  }
});

/**
 * @desc    Toggle user active status (soft delete/archive)
 * @route   PATCH /api/v1/users/:id/toggle-status
 * @access  Private/Admin
 * @body    { isActive }
 * @rules   Admins can deactivate/reactivate users without data loss
 * @note    This is a soft delete - user data is preserved
 */
export const toggleUserStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { isActive } = req.body;

  // Validate ID format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  // Validate isActive is a boolean
  if (typeof isActive !== 'boolean') {
    return next(new AppError('isActive must be a boolean value', 400));
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      logger.warn(`User not found for status toggle: ${id}`);
      return next(new AppError('User not found', 404));
    }

    // Prevent deactivating the last admin
    if (!isActive && user.role === 'admin') {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        isActive: true,
      });
      if (activeAdminCount <= 1) {
        logger.warn(
          `Attempted to deactivate the last admin user: ${user.email} by ${req.user.email}`,
        );
        return next(new AppError('Cannot deactivate the last admin user', 400));
      }
    }

    // Record previous status
    const previousStatus = user.isActive;
    user.isActive = isActive;

    // Add a timestamp for status change
    if (!isActive) {
      user.deactivatedAt = Date.now();
    } else if (previousStatus === false) {
      // Clear deactivation timestamp on reactivation
      user.deactivatedAt = undefined;
    }

    await user.save();

    const action = isActive ? 'activated' : 'deactivated';
    logger.info(`User ${action} (archived): ${user.email} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: `User ${action} successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isActive: user.isActive,
          role: user.role,
          deactivatedAt: user.deactivatedAt,
          updatedAt: user.updatedAt,
        },
        action,
        archiveInfo: {
          isArchived: !isActive,
          archiveDate: isActive ? null : new Date(),
          dataPreserved: true,
          restorable: true,
        },
      },
    });
  } catch (error) {
    logger.error(`Error toggling user status for ${id}: ${error.message}`);
    return next(new AppError('Error toggling user status', 500));
  }
});

/**
 * @desc    Get users by role
 * @route   GET /api/v1/users/role/:role
 * @access  Private/Admin
 */
export const getUsersByRole = asyncHandler(async (req, res, next) => {
  const { role } = req.params;
  const validRoles = ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin'];

  if (!validRoles.includes(role)) {
    return next(new AppError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`, 400));
  }

  const apiFeatures = new APIFeatures(User.find({ role }), req.query)
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
  const validRoles = ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin'];

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
