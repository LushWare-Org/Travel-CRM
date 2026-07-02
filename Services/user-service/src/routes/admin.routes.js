import express from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import {
  getDashboardStats, getAllUsers, getUserById, updateUserStatus, resetUserPassword,
  updateUser, deleteUser, updateAdminPermissions, getAdminPermissions,
  getAvailablePermissions, promoteSuperAdmin, demoteSuperAdmin, getSuperAdminInfo,
  listSuperAdmins, createStaff, getSettings, updateSettings,
} from '../controllers/admin.controller.js';

const router = express.Router();
router.use(requireAuth, authorize('admin', 'superAdmin'));

router.get('/stats', getDashboardStats);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/permissions/available', getAvailablePermissions);

router.route('/users').get(getAllUsers).post(createStaff);
router.route('/users/:id').get(getUserById).put(updateUser).delete(deleteUser);
router.patch('/users/:id/status', updateUserStatus);
router.post('/users/:id/reset-password', resetUserPassword);
router.route('/users/:id/permissions').get(getAdminPermissions).patch(updateAdminPermissions);

router.use(authorize('superAdmin'));
router.get('/super/info', getSuperAdminInfo);
router.get('/super/list', listSuperAdmins);
router.post('/super/promote', promoteSuperAdmin);
router.post('/super/demote', demoteSuperAdmin);

export default router;
