import crypto from 'crypto';
import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

/**
 * Sales Representative Controller
 * Handles all sales rep management operations following industry best practices
 */

/**
 * @desc    Get all sales representatives with advanced filtering, sorting, and pagination
 * @route   GET /api/v1/sales-reps
 * @access  Private/Admin
 * @query   page, limit, sort, search, isActive, fields
 */
export const getAllSalesReps = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  // Validate pagination
  if (page < 1 || limit < 1 || limit > 100) {
    return next(new AppError('Invalid pagination parameters', 400));
  }

  try {
    // Build filter object
    const filter = { role: 'salesRep' }; // Only get sales reps

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
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
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
    let selectFields;
    if (req.query.fields) {
      const fields = req.query.fields.split(',').map(f => f.trim());
      selectFields = fields.join(' ') + ' lastLogin'; // Include lastLogin with custom fields
    } else {
      // Use inclusion fields instead of exclusion to include lastLogin
      selectFields = 'name email phone phoneCountry role isActive isEmailVerified commissionRate targetLeads createdAt lastLogin';
    }

    // Execute query with optimizations
    const skip = (page - 1) * limit;

    const [salesReps, totalSalesReps] = await Promise.all([
      User.find(filter)
        .sort(sortObj)
        .select(selectFields)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Enrich sales reps data with lead metrics
    const enrichedSalesReps = await Promise.all(
      salesReps.map(async (rep) => {
        // Count leads assigned to this sales rep
        const leadsAssigned = await Lead.countDocuments({ assignedTo: rep._id });
        
        // Count converted leads (status = 'converted')
        const leadsConverted = await Lead.countDocuments({
          assignedTo: rep._id,
          status: 'converted',
        });

        // Get last login date
        const lastLogin = rep.lastLogin ? new Date(rep.lastLogin).toISOString().split('T')[0] : null;

        return {
          ...rep,
          id: rep._id,
          leadsAssigned,
          leadsConverted,
          status: rep.isActive ? 'active' : 'inactive',
          accountStatus: rep.isEmailVerified ? (rep.mustChangePassword ? 'pending_password_reset' : 'verified') : 'pending_email_verification',
          lastLogin,
        };
      }),
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalSalesReps / limit);

    logger.debug(
      `Retrieved ${enrichedSalesReps.length} sales reps (page ${page}, total ${totalSalesReps})`,
    );

    res.status(200).json({
      status: 'success',
      data: {
        salesReps: enrichedSalesReps,
        pagination: {
          currentPage: page,
          totalPages,
          totalSalesReps,
          repsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error(`Error retrieving sales reps: ${error.message}`);
    return next(new AppError('Error retrieving sales representatives', 500));
  }
});

/**
 * @desc    Get single sales rep by ID with authorization checks
 * @route   GET /api/v1/sales-reps/:id
 * @access  Private/Admin
 */
export const getSalesRepById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid sales rep ID format', 400));
  }

  try {
    const salesRep = await User.findById(id)
      .select('-__v -password')
      .where('role').equals('salesRep');

    if (!salesRep) {
      return next(new AppError('Sales representative not found', 404));
    }

    logger.debug(`Sales rep retrieved: ${salesRep.email}`);

    res.status(200).json({
      status: 'success',
      data: salesRep,
    });
  } catch (error) {
    logger.error(`Error retrieving sales rep ${id}: ${error.message}`);
    return next(new AppError('Error retrieving sales representative', 500));
  }
});

/**
 * @desc    Create a new sales representative with validation and audit logging
 * @route   POST /api/v1/sales-reps
 * @access  Private/Admin
 * @body    { name, email, phone, commissionRate }
 */
export const createSalesRep = asyncHandler(async (req, res, next) => {
  const { name, email, phone, commissionRate = 10 } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn(`Duplicate email attempt for sales rep: ${email}`);
      return next(new AppError('Email already in use', 400));
    }

    // Validate commission rate
    if (commissionRate < 0 || commissionRate > 100) {
      return next(new AppError('Commission rate must be between 0 and 100', 400));
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();

    // Create new sales rep
    const newSalesRep = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone,
      phoneCountry: req.body.phoneCountry || 'US',
      password: tempPassword,
      role: 'salesRep',
      permissions: ['manage_leads', 'view_billing'], // Sales reps can manage leads and view billing
      createdBy: req.user.id,
      isEmailVerified: true, // Auto-verify sales reps
      isTempPassword: true,
      mustChangePassword: true,
      isActive: true,
    });

    // Send invitation email
    try {
      await emailService.sendStaffCredentials(newSalesRep, tempPassword, 'salesRep');
      logger.info(`Sales rep created and invitation sent: ${newSalesRep.email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send invitation email to ${newSalesRep.email}: ${emailError.message}`,
      );
      // Continue even if email fails - account is created
    }

    // Log audit trail
    logger.info(
      `Sales representative created: ${newSalesRep.email} by ${req.user.email}`,
    );

    res.status(201).json({
      status: 'success',
      message: 'Sales representative created successfully. Invitation email sent.',
      data: {
        salesRep: {
          id: newSalesRep._id,
          name: newSalesRep.name,
          email: newSalesRep.email,
          phone: newSalesRep.phone,
          role: newSalesRep.role,
          isActive: newSalesRep.isActive,
          isEmailVerified: newSalesRep.isEmailVerified,
          isTempPassword: newSalesRep.isTempPassword,
          mustChangePassword: newSalesRep.mustChangePassword,
          createdAt: newSalesRep.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error(`Error creating sales rep: ${error.message}`);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map(err => err.message)
        .join(', ');
      return next(new AppError(`Validation error: ${messages}`, 400));
    }

    return next(new AppError('Error creating sales representative', 500));
  }
});

/**
 * @desc    Update sales rep details with field-level validation
 * @route   PUT /api/v1/sales-reps/:id
 * @access  Private/Admin
 * @body    { name, email, phone, commissionRate }
 */
export const updateSalesRep = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, commissionRate } = req.body;

  // Validate ID format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid sales rep ID format', 400));
  }

  try {
    // Check if sales rep exists
    let salesRep = await User.findById(id).where('role').equals('salesRep');

    if (!salesRep) {
      return next(new AppError('Sales representative not found', 404));
    }

    // Check if email is being changed and if it's unique
    if (email && email.toLowerCase() !== salesRep.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        logger.warn(`Duplicate email attempt during update: ${email}`);
        return next(new AppError('Email is already in use', 400));
      }
      salesRep.email = email.toLowerCase();
    }

    // Update allowed fields
    if (name) salesRep.name = name.trim();

    if (phone) {
      salesRep.phone = phone;
    }

    if (req.body.phoneCountry) {
      salesRep.phoneCountry = req.body.phoneCountry;
    }

    if (commissionRate !== undefined) {
      if (commissionRate < 0 || commissionRate > 100) {
        return next(new AppError('Commission rate must be between 0 and 100', 400));
      }
    }

    // Save updated sales rep
    await salesRep.save();

    logger.info(
      `Sales representative updated: ${salesRep.email} by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: 'Sales representative updated successfully',
      data: {
        salesRep: {
          id: salesRep._id,
          name: salesRep.name,
          email: salesRep.email,
          phone: salesRep.phone,
          isActive: salesRep.isActive,
          createdAt: salesRep.createdAt,
          updatedAt: salesRep.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error(`Error updating sales rep ${id}: ${error.message}`);
    return next(new AppError('Error updating sales representative', 500));
  }
});

/**
 * @desc    Update sales rep commission rate
 * @route   PATCH /api/v1/sales-reps/:id/commission
 * @access  Private/Admin
 * @body    { commissionRate }
 */
export const updateSalesRepCommission = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { commissionRate } = req.body;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid sales rep ID format', 400));
  }

  if (commissionRate < 0 || commissionRate > 100) {
    return next(new AppError('Commission rate must be between 0 and 100', 400));
  }

  try {
    const salesRep = await User.findByIdAndUpdate(
      id,
      { commissionRate },
      { new: true, runValidators: true },
    ).where('role').equals('salesRep');

    if (!salesRep) {
      return next(new AppError('Sales representative not found', 404));
    }

    logger.info(
      `Commission rate updated for ${salesRep.email} to ${commissionRate}% by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: 'Commission rate updated successfully',
      data: { commissionRate },
    });
  } catch (error) {
    logger.error(`Error updating commission for sales rep ${id}: ${error.message}`);
    return next(new AppError('Error updating commission rate', 500));
  }
});

/**
 * @desc    Toggle sales rep active status (soft delete/archive)
 * @route   PATCH /api/v1/sales-reps/:id/toggle-status
 * @access  Private/Admin
 * @body    { isActive }
 */
export const toggleSalesRepStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid sales rep ID format', 400));
  }

  if (typeof isActive !== 'boolean') {
    return next(new AppError('isActive must be a boolean value', 400));
  }

  try {
    const salesRep = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true },
    ).where('role').equals('salesRep');

    if (!salesRep) {
      return next(new AppError('Sales representative not found', 404));
    }

    logger.info(
      `Sales rep status toggled: ${salesRep.email} - isActive: ${isActive} by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: `Sales representative ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive },
    });
  } catch (error) {
    logger.error(`Error toggling sales rep ${id} status: ${error.message}`);
    return next(new AppError('Error updating sales representative status', 500));
  }
});

/**
 * @desc    Force password reset for sales rep
 * @route   POST /api/v1/sales-reps/:id/reset-password
 * @access  Private/Admin
 */
export const resetSalesRepPassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid sales rep ID format', 400));
  }

  try {
    const salesRep = await User.findById(id).where('role').equals('salesRep');

    if (!salesRep) {
      return next(new AppError('Sales representative not found', 404));
    }

    // Generate new temporary password
    const tempPassword = generateTemporaryPassword();

    // Update password and flags
    salesRep.password = tempPassword;
    salesRep.isTempPassword = true;
    salesRep.mustChangePassword = true;
    await salesRep.save({ validateBeforeSave: false });

    // Send password reset email
    try {
      await emailService.sendPasswordReset(salesRep, tempPassword);
      logger.info(`Password reset email sent to ${salesRep.email} by ${req.user.email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send password reset email to ${salesRep.email}: ${emailError.message}`,
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent to sales representative',
      data: {
        email: salesRep.email,
        message: 'Temporary password has been sent to their email',
      },
    });
  } catch (error) {
    logger.error(`Error resetting password for sales rep ${id}: ${error.message}`);
    return next(new AppError('Error resetting password', 500));
  }
});

/**
 * @desc    Get sales rep statistics
 * @route   GET /api/v1/sales-reps/stats
 * @access  Private/Admin
 */
export const getSalesRepStats = asyncHandler(async (req, res, next) => {
  try {
    const totalSalesReps = await User.countDocuments({ role: 'salesRep' });
    const activeSalesReps = await User.countDocuments({
      role: 'salesRep',
      isActive: true,
    });
    const inactiveSalesReps = await User.countDocuments({
      role: 'salesRep',
      isActive: false,
    });
    const verifiedSalesReps = await User.countDocuments({
      role: 'salesRep',
      isEmailVerified: true,
    });

    // Get total leads assigned to all sales reps
    const leadStats = await Lead.aggregate([
      { $match: { assignedTo: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          convertedLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
          },
        },
      },
    ]);

    const totalLeads = leadStats[0]?.totalLeads || 0;
    const convertedLeads = leadStats[0]?.convertedLeads || 0;

    res.status(200).json({
      status: 'success',
      data: {
        total: totalSalesReps,
        active: activeSalesReps,
        inactive: inactiveSalesReps,
        verified: verifiedSalesReps,
        totalLeads,
        convertedLeads,
        conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    logger.error(`Error retrieving sales rep stats: ${error.message}`);
    return next(new AppError('Error retrieving statistics', 500));
  }
});

/**
 * @desc    Get sales rep performance metrics
 * @route   GET /api/v1/sales-reps/:id/performance
 * @access  Private/Admin
 * @note    This will be enhanced when Lead and Booking models are integrated
 */
export const getSalesRepPerformance = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid sales rep ID format', 400));
  }

  try {
    const salesRep = await User.findById(id).where('role').equals('salesRep');

    if (!salesRep) {
      return next(new AppError('Sales representative not found', 404));
    }

    // TODO: Integrate with Lead and Booking models to calculate
    // - leadsAssigned
    // - leadsConverted
    // - conversionRate
    // - totalEarnings
    // - bookingDetails

    res.status(200).json({
      status: 'success',
      message: 'Performance metrics feature coming soon',
      data: {
        salesRepId: id,
        email: salesRep.email,
        commissionRate: salesRep.commissionRate || 10,
        // Performance metrics will be populated once Lead/Booking integration is complete
      },
    });
  } catch (error) {
    logger.error(`Error retrieving sales rep performance: ${error.message}`);
    return next(new AppError('Error retrieving performance metrics', 500));
  }
});

/**
 * @desc    Permanently delete sales rep from database
 * @route   DELETE /api/v1/sales-reps/:id
 * @access  Private/Admin
 * @warning This operation is irreversible - data will be lost
 */
export const deleteSalesRep = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid sales rep ID format', 400));
  }

  try {
    const salesRep = await User.findByIdAndDelete(id)
      .where('role')
      .equals('salesRep');

    if (!salesRep) {
      return next(new AppError('Sales representative not found', 404));
    }

    logger.warn(
      `Sales representative permanently deleted: ${salesRep.email} by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: 'Sales representative deleted permanently',
      data: null,
    });
  } catch (error) {
    logger.error(`Error deleting sales rep ${id}: ${error.message}`);
    return next(new AppError('Error deleting sales representative', 500));
  }
});

/**
 * Utility function to generate secure temporary password
 * @returns {string} 12-character temporary password with mixed case, numbers, and symbols
 */
function generateTemporaryPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';

  // Ensure at least one of each type for password strength
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill rest randomly to make 12 characters
  for (let i = password.length; i < 12; i += 1) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password to avoid predictability
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
