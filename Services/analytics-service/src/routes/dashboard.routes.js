import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/', requireAuth, authorize('admin', 'salesRep'), getDashboardStats);
router.get('/stats', requireAuth, authorize('admin', 'salesRep'), getDashboardStats);

export default router;
