import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import {
  getAllSalesReps,
  getSalesRepById,
  createSalesRep,
  updateSalesRep,
  deleteSalesRep,
  getSalesRepStats,
  toggleSalesRepStatus,
  resetSalesRepPassword,
  getSalesRepPerformance,
  updateSalesRepCommission,
  getOnlineSalesReps,
} from '../controllers/salesRep.controller.js';
import {
  createSalesRepSchema,
  updateSalesRepSchema,
  updateCommissionSchema,
  salesRepQuerySchema,
  salesRepIdSchema,
  toggleStatusSchema,
} from '../validators/salesRep.validator.js';

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Admin only routes
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/sales-reps
 * @desc    Get all sales representatives with filtering, sorting, and pagination
 * @query   page, limit, sort, search, status, isActive, fields
 * @access  Private/Admin
 */
router.get('/', validateRequest(salesRepQuerySchema, 'query'), getAllSalesReps);

/**
 * @route   POST /api/v1/sales-reps
 * @desc    Create a new sales representative
 * @body    { name, email, phone, commissionRate }
 * @access  Private/Admin
 */
router.post('/', validateRequest(createSalesRepSchema), createSalesRep);

/**
 * @route   GET /api/v1/sales-reps/stats
 * @desc    Get sales representatives statistics
 * @access  Private/Admin
 */
router.get('/stats', getSalesRepStats);

/**
 * @route   GET /api/v1/sales-reps/online-status
 * @desc    Get online status of all sales representatives
 * @access  Private/Admin
 */
router.get('/online-status', getOnlineSalesReps);

/**
 * @route   GET /api/v1/sales-reps/:id
 * @desc    Get single sales representative by ID
 * @access  Private/Admin
 */
router.get('/:id', validateRequest(salesRepIdSchema, 'params'), getSalesRepById);

/**
 * @route   GET /api/v1/sales-reps/:id/performance
 * @desc    Get sales representative performance metrics
 * @access  Private/Admin
 */
router.get('/:id/performance', validateRequest(salesRepIdSchema, 'params'), getSalesRepPerformance);

/**
 * @route   PUT /api/v1/sales-reps/:id
 * @desc    Update sales representative details
 * @body    { name, email, phone, commissionRate }
 * @access  Private/Admin
 */
router.put('/:id', validateRequest(salesRepIdSchema, 'params'), validateRequest(updateSalesRepSchema), updateSalesRep);

/**
 * @route   PATCH /api/v1/sales-reps/:id/commission
 * @desc    Update sales representative commission rate
 * @body    { commissionRate }
 * @access  Private/Admin
 */
router.patch('/:id/commission', validateRequest(salesRepIdSchema, 'params'), validateRequest(updateCommissionSchema), updateSalesRepCommission);

/**
 * @route   PATCH /api/v1/sales-reps/:id/toggle-status
 * @desc    Toggle sales representative active status
 * @body    { isActive }
 * @access  Private/Admin
 */
router.patch('/:id/toggle-status', validateRequest(salesRepIdSchema, 'params'), validateRequest(toggleStatusSchema), toggleSalesRepStatus);

/**
 * @route   POST /api/v1/sales-reps/:id/reset-password
 * @desc    Force password reset for sales representative
 * @access  Private/Admin
 */
router.post('/:id/reset-password', validateRequest(salesRepIdSchema, 'params'), resetSalesRepPassword);

/**
 * @route   DELETE /api/v1/sales-reps/:id
 * @desc    Delete sales representative permanently
 * @access  Private/Admin
 */
router.delete('/:id', validateRequest(salesRepIdSchema, 'params'), deleteSalesRep);

export default router;
