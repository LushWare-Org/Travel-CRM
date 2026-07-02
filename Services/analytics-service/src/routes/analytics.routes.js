import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();

router.get('/leads/overview', requireAuth, authorize('admin', 'salesRep'), analyticsController.getLeadAnalyticsOverview);
router.post('/leads/export-pdf', requireAuth, authorize('admin', 'salesRep'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/billing/overview', requireAuth, authorize('admin', 'salesRep'), analyticsController.getBillingAnalyticsOverview);
router.post('/billing/export-pdf', requireAuth, authorize('admin', 'salesRep'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/packages/overview', requireAuth, authorize('admin', 'salesRep'), analyticsController.getPackageAnalyticsOverview);
router.post('/packages/export-pdf', requireAuth, authorize('admin', 'salesRep'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/users/overview', requireAuth, authorize('admin'), analyticsController.getUserAnalyticsOverview);
router.post('/users/export-pdf', requireAuth, authorize('admin'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/website/overview', requireAuth, authorize('admin', 'salesRep'), analyticsController.getWebsiteAnalyticsOverview);
router.post('/website/export-pdf', requireAuth, authorize('admin', 'salesRep'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/salesreps/me/performance', requireAuth, authorize('salesRep'), analyticsController.getSalesRepPersonalPerformance);

export default router;
