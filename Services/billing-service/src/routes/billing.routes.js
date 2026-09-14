import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as billingController from '../controllers/billing.controller.js';

const router = Router();

const internalTokenAuth = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_EVENTS_TOKEN) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};
// Voice agent's "resend the document" action — tells it WHICH already-sent
// document (across all four types) to resend, with no figures in the
// response. Registered before requireAuth below so it stays internal-only.
router.get('/internal/leads/:leadId/latest-document', internalTokenAuth, billingController.getLatestSentDocumentForVoice);

router.get('/dashboard', requireAuth, authorize('admin', 'salesRep'), billingController.getDashboardStats);
router.get('/summary/lead/:leadId', requireAuth, billingController.getLeadBillingSummary);
router.get('/reports/financial', requireAuth, authorize('admin'), billingController.getFinancialReports);
router.get('/reports/aging', requireAuth, authorize('admin'), billingController.getAgingReport);
router.get('/reports/payment-methods', requireAuth, authorize('admin'), billingController.getPaymentMethodBreakdown);
router.get('/reports/revenue-trends', requireAuth, authorize('admin'), billingController.getRevenueTrends);
router.get('/reports/top-customers', requireAuth, authorize('admin'), billingController.getTopCustomers);
router.get('/export', requireAuth, authorize('admin'), billingController.exportBillingData);

export default router;
