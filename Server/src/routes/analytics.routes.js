import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getLeadAnalyticsOverview, getBillingAnalyticsOverview } from '../controllers/analytics.controller.js';

const router = express.Router();

// Lead analytics overview
router.get('/leads/overview', protect, authorize('admin', 'salesRep'), getLeadAnalyticsOverview);
router.get('/billing/overview', protect, authorize('admin', 'salesRep'), getBillingAnalyticsOverview);

export default router;


