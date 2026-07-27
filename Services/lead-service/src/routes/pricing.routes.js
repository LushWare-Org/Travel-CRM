import { Router } from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import { calculatePricing, applyPricing } from '../controllers/pricing.controller.js';

const router = Router({ mergeParams: true });
router.use(extractUser, requireAuth, authorize('admin', 'salesRep'));

router.post('/calculate', calculatePricing);
router.post('/apply', applyPricing);

export default router;
