import crypto from 'crypto';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import emailService from '../utils/emailService.js';
import logger from '../config/logger.js';

/**
 * Vendor Management Controller
 * Handles all vendor management operations following industry best practices
 * Manages third-party service providers (hotels, transport, activities, etc.)
 */

/**
 * @desc    Get all vendors with advanced filtering, sorting, and pagination
 * @route   GET /api/v1/vendors
 * @access  Private/Admin
 * @query   page, limit, sort, search, isActive, serviceType, fields
 */
export const getAllVendors = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  // Validate pagination
  if (page < 1 || limit < 1 || limit > 100) {
    return next(new AppError('Invalid pagination parameters', 400));
  }

  try {
    // Build filter object
    const filter = { role: 'vendor' }; // Only get vendors

    // Active status filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Email verified filter
    if (req.query.isEmailVerified !== undefined) {
      filter.isEmailVerified = req.query.isEmailVerified === 'true';
    }

    // Service type filter
    if (req.query.serviceType) {
      filter.serviceType = req.query.serviceType;
    }

    // Rating filter
    if (req.query.minRating) {
      filter.rating = { $gte: parseFloat(req.query.minRating) };
    }

    // Search functionality
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
        { businessName: { $regex: req.query.search, $options: 'i' } },
        { businessRegistrationNumber: { $regex: req.query.search, $options: 'i' } },
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
      const fields = req.query.fields.split(',').map(f => f.trim());
      selectFields = fields.join(' ');
    }

    // Execute query with optimizations
    const skip = (page - 1) * limit;

    const [vendors, totalVendors] = await Promise.all([
      User.find(filter)
        .sort(sortObj)
        .select(selectFields)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalVendors / limit);

    logger.debug(
      `Retrieved ${vendors.length} vendors (page ${page}, total ${totalVendors})`,
    );

    res.status(200).json({
      status: 'success',
      data: {
        vendors,
        pagination: {
          currentPage: page,
          totalPages,
          totalVendors,
          vendorsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error(`Error retrieving vendors: ${error.message}`);
    return next(new AppError('Error retrieving vendors', 500));
  }
});

/**
 * @desc    Get single vendor by ID with authorization checks
 * @route   GET /api/v1/vendors/:id
 * @access  Private/Admin
 */
export const getVendorById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  try {
    const vendor = await User.findById(id)
      .select('-__v -password')
      .where('role').equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    logger.debug(`Vendor retrieved: ${vendor.email}`);

    res.status(200).json({
      status: 'success',
      data: vendor,
    });
  } catch (error) {
    logger.error(`Error retrieving vendor ${id}: ${error.message}`);
    return next(new AppError('Error retrieving vendor', 500));
  }
});

/**
 * @desc    Create a new vendor with validation and audit logging
 * @route   POST /api/v1/vendors
 * @access  Private/Admin
 * @body    { name, email, phone, businessName, serviceType, businessRegistrationNumber, address, contactPerson }
 */
export const createVendor = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    phoneCountry,
    businessName,
    serviceType,
    businessRegistrationNumber,
    address,
    contactPerson,
    bankDetails,
    taxIdentificationNumber,
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn(`Duplicate email attempt for vendor: ${email}`);
      return next(new AppError('Email already in use', 400));
    }

    // Validate phone format - accept E.164 format (e.g., +94768952480)
    // E.164 format: +<country_code><number>, 1-3 digits for country code, 4-14 digits for number
    const e164Pattern = /^\+[1-9]\d{1,14}$/;
    if (!e164Pattern.test(phone)) {
      return next(new AppError('Phone must be in E.164 format (e.g., +94768952480)', 400));
    }

    // Check if business registration number already exists
    if (businessRegistrationNumber) {
      const existingBusiness = await User.findOne({
        businessRegistrationNumber,
        role: 'vendor'
      });
      if (existingBusiness) {
        return next(new AppError('Business registration number already exists', 400));
      }
    }

    // Validate service type
    const validServiceTypes = ['hotel', 'transport', 'activity', 'restaurant', 'guide', 'other'];
    if (serviceType && !validServiceTypes.includes(serviceType)) {
      return next(new AppError(`Service type must be one of: ${validServiceTypes.join(', ')}`, 400));
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();

    // Create new vendor with E.164 phone and country code
    const newVendor = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone, // Store E.164 format (e.g., +94768952480)
      phoneCountry: phoneCountry || 'US', // Store country code (e.g., 'LK')
      password: tempPassword,
      role: 'vendor',
      businessName: businessName?.trim(),
      serviceType: serviceType || 'other',
      businessRegistrationNumber,
      address,
      contactPerson,
      bankDetails,
      taxIdentificationNumber,
      createdBy: req.user.id,
      isEmailVerified: true, // Auto-verify vendors
      isTempPassword: true,
      mustChangePassword: true,
      isActive: true,
      rating: 0,
      totalBookings: 0,
      vendorStatus: 'verified', // Vendors are automatically verified (no business verification flow)
    });

    // Send invitation email
    try {
      await emailService.sendStaffCredentials(newVendor, tempPassword, 'vendor');
      logger.info(`Vendor created and invitation sent: ${newVendor.email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send invitation email to ${newVendor.email}: ${emailError.message}`,
      );
      // Continue even if email fails - account is created
    }

    // Log audit trail
    logger.info(
      `Vendor created: ${newVendor.email} (${businessName}) by ${req.user.email}`,
    );

    res.status(201).json({
      status: 'success',
      message: 'Vendor created successfully. Invitation email sent.',
      data: {
        vendor: {
          id: newVendor._id,
          name: newVendor.name,
          email: newVendor.email,
          phone: newVendor.phone,
          phoneCountry: newVendor.phoneCountry,
          businessName: newVendor.businessName,
          serviceType: newVendor.serviceType,
          businessRegistrationNumber: newVendor.businessRegistrationNumber,
          address: newVendor.address,
          contactPerson: newVendor.contactPerson,
          bankDetails: newVendor.bankDetails,
          taxIdentificationNumber: newVendor.taxIdentificationNumber,
          role: newVendor.role,
          isActive: newVendor.isActive,
          isEmailVerified: newVendor.isEmailVerified,
          isTempPassword: newVendor.isTempPassword,
          mustChangePassword: newVendor.mustChangePassword,
          vendorStatus: newVendor.vendorStatus,
          rating: newVendor.rating,
          createdAt: newVendor.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error(`Error creating vendor: ${error.message}`);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map(err => err.message)
        .join(', ');
      return next(new AppError(`Validation error: ${messages}`, 400));
    }

    return next(new AppError('Error creating vendor', 500));
  }
});

/**
 * @desc    Update vendor details with field-level validation
 * @route   PUT /api/v1/vendors/:id
 * @access  Private/Admin
 * @body    { name, email, phone, businessName, serviceType, address, contactPerson, bankDetails }
 */
export const updateVendor = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    phoneCountry,
    businessName,
    serviceType,
    address,
    contactPerson,
    bankDetails,
    taxIdentificationNumber,
    businessRegistrationNumber,
  } = req.body;

  // Validate ID format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  try {
    // Check if vendor exists
    let vendor = await User.findById(id).where('role').equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // Check if email is being changed and if it's unique
    if (email && email.toLowerCase() !== vendor.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        logger.warn(`Duplicate email attempt during update: ${email}`);
        return next(new AppError('Email is already in use', 400));
      }
      vendor.email = email.toLowerCase();
    }

    // Check if business registration number is being changed
    if (businessRegistrationNumber && businessRegistrationNumber !== vendor.businessRegistrationNumber) {
      const existingBusiness = await User.findOne({
        businessRegistrationNumber,
        role: 'vendor',
        _id: { $ne: id },
      });
      if (existingBusiness) {
        return next(new AppError('Business registration number already exists', 400));
      }
      vendor.businessRegistrationNumber = businessRegistrationNumber;
    }

    // Update allowed fields
    if (name) vendor.name = name.trim();
    if (businessName) vendor.businessName = businessName.trim();

    if (phone) {
      // Validate phone format - accept E.164 format (e.g., +94768952480)
      const e164Pattern = /^\+[1-9]\d{1,14}$/;
      if (!e164Pattern.test(phone)) {
        return next(new AppError('Phone must be in E.164 format (e.g., +94768952480)', 400));
      }
      vendor.phone = phone; // Store E.164 format
      vendor.phoneCountry = phoneCountry || vendor.phoneCountry || 'US'; // Update country code
    }

    if (serviceType) {
      const validServiceTypes = ['hotel', 'transport', 'activity', 'restaurant', 'guide', 'other'];
      if (!validServiceTypes.includes(serviceType)) {
        return next(new AppError(`Service type must be one of: ${validServiceTypes.join(', ')}`, 400));
      }
      vendor.serviceType = serviceType;
    }

    if (address) vendor.address = address;
    if (contactPerson) vendor.contactPerson = contactPerson;
    if (bankDetails) vendor.bankDetails = bankDetails;
    if (taxIdentificationNumber) vendor.taxIdentificationNumber = taxIdentificationNumber;

    // Save updated vendor
    await vendor.save();

    logger.info(
      `Vendor updated: ${vendor.email} (${vendor.businessName}) by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: 'Vendor updated successfully',
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          phoneCountry: vendor.phoneCountry,
          businessName: vendor.businessName,
          serviceType: vendor.serviceType,
          businessRegistrationNumber: vendor.businessRegistrationNumber,
          address: vendor.address,
          contactPerson: vendor.contactPerson,
          bankDetails: vendor.bankDetails,
          taxIdentificationNumber: vendor.taxIdentificationNumber,
          isActive: vendor.isActive,
          vendorStatus: vendor.vendorStatus,
          rating: vendor.rating,
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error(`Error updating vendor ${id}: ${error.message}`);
    return next(new AppError('Error updating vendor', 500));
  }
});

/**
 * @desc    Update vendor status (pending_verification, verified, suspended, rejected)
 * @route   PATCH /api/v1/vendors/:id/status
 * @access  Private/Admin
 * @body    { vendorStatus }
 */
export const updateVendorStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { vendorStatus } = req.body;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  const validStatuses = ['pending_verification', 'verified', 'suspended', 'rejected'];
  if (!validStatuses.includes(vendorStatus)) {
    return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
  }

  try {
    const vendor = await User.findByIdAndUpdate(
      id,
      { vendorStatus },
      { new: true, runValidators: true },
    ).where('role').equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // Send notification email to vendor
    try {
      await emailService.sendVendorStatusUpdate(vendor, vendorStatus);
    } catch (emailError) {
      logger.error(`Failed to send status update email: ${emailError.message}`);
    }

    logger.info(
      `Vendor status updated: ${vendor.email} - status: ${vendorStatus} by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: `Vendor status updated to ${vendorStatus}`,
      data: { vendorStatus },
    });
  } catch (error) {
    logger.error(`Error updating vendor status ${id}: ${error.message}`);
    return next(new AppError('Error updating vendor status', 500));
  }
});

/**
 * @desc    Update vendor rating
 * @route   PATCH /api/v1/vendors/:id/rating
 * @access  Private/Admin
 * @body    { rating }
 */
export const updateVendorRating = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  if (rating < 0 || rating > 5) {
    return next(new AppError('Rating must be between 0 and 5', 400));
  }

  try {
    const vendor = await User.findByIdAndUpdate(
      id,
      { rating },
      { new: true, runValidators: true },
    ).where('role').equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    logger.info(
      `Rating updated for ${vendor.email} to ${rating} by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: 'Vendor rating updated successfully',
      data: { rating },
    });
  } catch (error) {
    logger.error(`Error updating rating for vendor ${id}: ${error.message}`);
    return next(new AppError('Error updating vendor rating', 500));
  }
});

/**
 * @desc    Toggle vendor active status (soft delete/archive)
 * @route   PATCH /api/v1/vendors/:id/toggle-status
 * @access  Private/Admin
 * @body    { isActive }
 */
export const toggleVendorStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  if (typeof isActive !== 'boolean') {
    return next(new AppError('isActive must be a boolean value', 400));
  }

  try {
    const vendor = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true },
    ).where('role').equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    logger.info(
      `Vendor status toggled: ${vendor.email} - isActive: ${isActive} by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: `Vendor ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive },
    });
  } catch (error) {
    logger.error(`Error toggling vendor ${id} status: ${error.message}`);
    return next(new AppError('Error updating vendor status', 500));
  }
});

/**
 * @desc    Force password reset for vendor
 * @route   POST /api/v1/vendors/:id/reset-password
 * @access  Private/Admin
 */
export const resetVendorPassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  try {
    const vendor = await User.findById(id).where('role').equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // Generate new temporary password
    const tempPassword = generateTemporaryPassword();

    // Update password and flags
    vendor.password = tempPassword;
    vendor.isTempPassword = true;
    vendor.mustChangePassword = true;
    await vendor.save({ validateBeforeSave: false });

    // Send password reset email
    try {
      await emailService.sendStaffCredentials(vendor, tempPassword, 'vendor');
      logger.info(`Password reset email sent to ${vendor.email} by ${req.user.email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send password reset email to ${vendor.email}: ${emailError.message}`,
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent to vendor',
      data: {
        email: vendor.email,
        message: 'Temporary password has been sent to their email',
      },
    });
  } catch (error) {
    logger.error(`Error resetting password for vendor ${id}: ${error.message}`);
    return next(new AppError('Error resetting password', 500));
  }
});

/**
 * @desc    Get vendor statistics
 * @route   GET /api/v1/vendors/stats
 * @access  Private/Admin
 */
export const getVendorStats = asyncHandler(async (req, res, next) => {
  try {
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const activeVendors = await User.countDocuments({
      role: 'vendor',
      isActive: true,
    });
    const inactiveVendors = await User.countDocuments({
      role: 'vendor',
      isActive: false,
    });
    const verifiedVendors = await User.countDocuments({
      role: 'vendor',
      vendorStatus: 'verified',
    });
    const pendingVerification = await User.countDocuments({
      role: 'vendor',
      vendorStatus: 'pending_verification',
    });
    const suspendedVendors = await User.countDocuments({
      role: 'vendor',
      vendorStatus: 'suspended',
    });

    // Get vendor count by service type
    const vendorsByServiceType = await User.aggregate([
      { $match: { role: 'vendor' } },
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total: totalVendors,
        active: activeVendors,
        inactive: inactiveVendors,
        verified: verifiedVendors,
        pendingVerification,
        suspended: suspendedVendors,
        byServiceType: vendorsByServiceType,
      },
    });
  } catch (error) {
    logger.error(`Error retrieving vendor stats: ${error.message}`);
    return next(new AppError('Error retrieving statistics', 500));
  }
});

/**
 * @desc    Get vendor performance metrics
 * @route   GET /api/v1/vendors/:id/performance
 * @access  Private/Admin
 * @note    This will be enhanced when Booking and Package models are integrated
 */
export const getVendorPerformance = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  try {
    const vendor = await User.findById(id).where('role').equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // TODO: Integrate with Booking and Package models to calculate
    // - totalBookings
    // - totalRevenue
    // - averageRating
    // - responseTime
    // - cancellationRate
    // - completionRate

    res.status(200).json({
      status: 'success',
      message: 'Performance metrics feature coming soon',
      data: {
        vendorId: id,
        email: vendor.email,
        businessName: vendor.businessName,
        serviceType: vendor.serviceType,
        rating: vendor.rating || 0,
        totalBookings: vendor.totalBookings || 0,
        // Performance metrics will be populated once Booking/Package integration is complete
      },
    });
  } catch (error) {
    logger.error(`Error retrieving vendor performance: ${error.message}`);
    return next(new AppError('Error retrieving performance metrics', 500));
  }
});

/**
 * @desc    Permanently delete vendor from database
 * @route   DELETE /api/v1/vendors/:id
 * @access  Private/Admin
 * @warning This operation is irreversible - data will be lost
 */
export const deleteVendor = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid vendor ID format', 400));
  }

  try {
    const vendor = await User.findByIdAndDelete(id)
      .where('role')
      .equals('vendor');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    logger.warn(
      `Vendor permanently deleted: ${vendor.email} (${vendor.businessName}) by ${req.user.email}`,
    );

    res.status(200).json({
      status: 'success',
      message: 'Vendor deleted permanently',
      data: null,
    });
  } catch (error) {
    logger.error(`Error deleting vendor ${id}: ${error.message}`);
    return next(new AppError('Error deleting vendor', 500));
  }
});

/**
 * @desc    Get vendors by service type
 * @route   GET /api/v1/vendors/by-service/:serviceType
 * @access  Private/Admin
 */
export const getVendorsByServiceType = asyncHandler(async (req, res, next) => {
  const { serviceType } = req.params;

  const validServiceTypes = ['hotel', 'transport', 'activity', 'restaurant', 'guide', 'other'];
  if (!validServiceTypes.includes(serviceType)) {
    return next(new AppError(`Invalid service type. Must be one of: ${validServiceTypes.join(', ')}`, 400));
  }

  try {
    const vendors = await User.find({
      role: 'vendor',
      serviceType,
      isActive: true,
    })
      .select('-__v -password')
      .sort({ rating: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        serviceType,
        count: vendors.length,
        vendors,
      },
    });
  } catch (error) {
    logger.error(`Error retrieving vendors by service type: ${error.message}`);
    return next(new AppError('Error retrieving vendors', 500));
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
