import express from 'express';
import {
  createStaff,
  getAllUsers,
  getUserById,
  updateUserStatus,
  resetUserPassword,
  updateUser,
  deleteUser,
  getDashboardStats,
  updateAdminPermissions,
  getAdminPermissions,
  getAvailablePermissions,
  promoteSuperAdmin,
  demoteSuperAdmin,
  getSuperAdminInfo,
  listSuperAdmins,
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { 
  createStaffSchema, 
  updateUserStatusSchema, 
  updateProfileSchema,
  updatePermissionsSchema,
  promoteSuperAdminSchema,
  demoteSuperAdminSchema,
} from '../validators/auth.validator.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'superAdmin'));

// Dashboard stats
router.get('/stats', getDashboardStats);

// Settings (assignment config)
router.get('/settings', getSettings);
router.put('/settings', validate(updateSettingsSchema), updateSettings);

// Permissions
router.get('/permissions/available', getAvailablePermissions);

// User management
router.route('/users')
  .get(getAllUsers)
  .post(validate(createStaffSchema), createStaff);

router.route('/users/:id')
  .get(getUserById)
  .put(validate(updateProfileSchema), updateUser)
  .delete(deleteUser);

router.patch('/users/:id/status', validate(updateUserStatusSchema), updateUserStatus);
router.post('/users/:id/reset-password', resetUserPassword);

// Admin permissions management
router.route('/users/:id/permissions')
  .get(getAdminPermissions)
  .patch(validate(updatePermissionsSchema), updateAdminPermissions);

// ============================================
// SUPER ADMIN MANAGEMENT ROUTES
// ============================================
// Only superAdmin can access these routes
router.use(authorize('superAdmin'));

// Get current superAdmin info
router.get('/super/info', getSuperAdminInfo);

// List all superAdmins
router.get('/super/list', listSuperAdmins);

// Promote admin to superAdmin
router.post('/super/promote', validate(promoteSuperAdminSchema), promoteSuperAdmin);

// Demote superAdmin to admin
router.post('/super/demote', validate(demoteSuperAdminSchema), demoteSuperAdmin);

export default router;
