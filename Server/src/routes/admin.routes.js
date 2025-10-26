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
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { createStaffSchema, updateUserStatusSchema, updateProfileSchema } from '../validators/auth.validator.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard stats
router.get('/stats', getDashboardStats);

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

export default router;
