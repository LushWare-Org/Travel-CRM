import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as paymentHistoryController from '../controllers/paymentHistory.controller.js';

const router = Router();

router.get('/', requireAuth, paymentHistoryController.getAllPaymentHistory);
router.get('/lead/:leadId', requireAuth, paymentHistoryController.getPaymentHistoryByLeadId);
router.get('/pdf/list', requireAuth, paymentHistoryController.downloadPaymentHistoryListPDF);
router.get('/:id/pdf', requireAuth, paymentHistoryController.downloadPaymentHistoryPDF);
router.get('/:id', requireAuth, paymentHistoryController.getPaymentHistoryById);

export default router;
