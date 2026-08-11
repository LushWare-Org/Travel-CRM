import express from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import {
  getDashboardStats, getAllUsers, getUserById, updateUserStatus, resetUserPassword,
  updateUser, deleteUser, updateAdminPermissions, getAdminPermissions,
  getAvailablePermissions, promoteSuperAdmin, demoteSuperAdmin, getSuperAdminInfo,
  listSuperAdmins, createStaff, getSettings, updateSettings, getInternalOrganizationSettings,
} from '../controllers/admin.controller.js';

const router = express.Router();

// Service-to-service (token-authenticated, not user auth) — must be registered
// before the requireAuth/authorize gate below. Consumed by billing-service for
// quotation/invoice generation; never reached through the gateway since callers
// hit user-service's own port directly (see Services/billing-service/src/config/orgSettings.js).
router.get('/internal/organization-settings', (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}, getInternalOrganizationSettings);

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
