import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import {
  getAllUsers,
  getUser,
  getCurrentUserProfile,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  toggleUserStatus,
  getUsersByRole,
  assignUserRole,
  getUserStats,
} from '../controllers/user.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  updatePasswordSchema,
  assignRoleSchema,
  toggleStatusSchema,
  getRoleParamSchema,
  userQuerySchema,
  getUserIdSchema,
} from '../validators/user.validator.js';

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Get current user profile
router.get('/profile/me', getCurrentUserProfile);

// Admin only routes
router.use(authorize('admin'));

// User management routes
router.get('/stats', getUserStats);
router.get('/', validateRequest(userQuerySchema, 'query'), getAllUsers);
router.post('/', validateRequest(createUserSchema), createUser);

// Get users by role
router.get('/role/:role', validateRequest(getRoleParamSchema, 'params'), getUsersByRole);

// Individual user routes
router.get('/:id', validateRequest(getUserIdSchema, 'params'), getUser);
router.put('/:id', validateRequest(getUserIdSchema, 'params'), validateRequest(updateUserSchema), updateUser);
router.put('/:id/change-password', validateRequest(getUserIdSchema, 'params'), validateRequest(updatePasswordSchema), updateUserPassword);
router.delete('/:id', validateRequest(getUserIdSchema, 'params'), deleteUser);
router.patch('/:id/toggle-status', validateRequest(getUserIdSchema, 'params'), validateRequest(toggleStatusSchema), toggleUserStatus);
router.patch('/:id/role', validateRequest(getUserIdSchema, 'params'), validateRequest(assignRoleSchema), assignUserRole);

export default router;
