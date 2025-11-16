import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorStats,
  toggleVendorStatus,
  resetVendorPassword,
  getVendorPerformance,
  updateVendorStatus,
  updateVendorRating,
  getVendorsByServiceType,
} from '../controllers/vendor.controller.js';
import {
  createVendorSchema,
  updateVendorSchema,
  updateVendorStatusSchema,
  updateVendorRatingSchema,
  vendorQuerySchema,
  vendorIdSchema,
  toggleStatusSchema,
  serviceTypeParamSchema,
} from '../validators/vendor.validator.js';

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Admin only routes
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/vendors
 * @desc    Get all vendors with filtering, sorting, and pagination
 * @query   page, limit, sort, search, isActive, serviceType, minRating, fields
 * @access  Private/Admin
 */
router.get('/', validateRequest(vendorQuerySchema, 'query'), getAllVendors);

/**
 * @route   POST /api/v1/vendors
 * @desc    Create a new vendor
 * @body    { name, email, phone, businessName, serviceType, businessRegistrationNumber, address, contactPerson, bankDetails, taxIdentificationNumber }
 * @access  Private/Admin
 */
router.post('/', validateRequest(createVendorSchema), createVendor);

/**
 * @route   GET /api/v1/vendors/stats
 * @desc    Get vendor statistics
 * @access  Private/Admin
 */
router.get('/stats', getVendorStats);

/**
 * @route   GET /api/v1/vendors/by-service/:serviceType
 * @desc    Get vendors by service type (hotel, transport, activity, restaurant, guide, other)
 * @access  Private/Admin
 */
router.get('/by-service/:serviceType', validateRequest(serviceTypeParamSchema, 'params'), getVendorsByServiceType);

/**
 * @route   GET /api/v1/vendors/:id
 * @desc    Get single vendor by ID
 * @access  Private/Admin
 */
router.get('/:id', validateRequest(vendorIdSchema, 'params'), getVendorById);

/**
 * @route   GET /api/v1/vendors/:id/performance
 * @desc    Get vendor performance metrics
 * @access  Private/Admin
 */
router.get('/:id/performance', validateRequest(vendorIdSchema, 'params'), getVendorPerformance);

/**
 * @route   PUT /api/v1/vendors/:id
 * @desc    Update vendor details
 * @body    { name, email, phone, businessName, serviceType, address, contactPerson, bankDetails, taxIdentificationNumber, businessRegistrationNumber }
 * @access  Private/Admin
 */
router.put('/:id', validateRequest(vendorIdSchema, 'params'), validateRequest(updateVendorSchema), updateVendor);

/**
 * @route   PATCH /api/v1/vendors/:id/status
 * @desc    Update vendor verification status (pending_verification, verified, suspended, rejected)
 * @body    { vendorStatus }
 * @access  Private/Admin
 */
router.patch('/:id/status', validateRequest(vendorIdSchema, 'params'), validateRequest(updateVendorStatusSchema), updateVendorStatus);

/**
 * @route   PATCH /api/v1/vendors/:id/rating
 * @desc    Update vendor rating
 * @body    { rating }
 * @access  Private/Admin
 */
router.patch('/:id/rating', validateRequest(vendorIdSchema, 'params'), validateRequest(updateVendorRatingSchema), updateVendorRating);

/**
 * @route   PATCH /api/v1/vendors/:id/toggle-status
 * @desc    Toggle vendor active status
 * @body    { isActive }
 * @access  Private/Admin
 */
router.patch('/:id/toggle-status', validateRequest(vendorIdSchema, 'params'), validateRequest(toggleStatusSchema), toggleVendorStatus);

/**
 * @route   POST /api/v1/vendors/:id/reset-password
 * @desc    Force password reset for vendor
 * @access  Private/Admin
 */
router.post('/:id/reset-password', validateRequest(vendorIdSchema, 'params'), resetVendorPassword);

/**
 * @route   DELETE /api/v1/vendors/:id
 * @desc    Delete vendor permanently
 * @access  Private/Admin
 */
router.delete('/:id', validateRequest(vendorIdSchema, 'params'), deleteVendor);

export default router;
