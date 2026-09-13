import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as paymentReceiptController from '../controllers/paymentReceipt.controller.js';

const router = Router();

router.get('/stats', requireAuth, authorize('admin', 'salesRep'), paymentReceiptController.getPaymentReceiptStats);
router.get('/', requireAuth, paymentReceiptController.getAllPaymentReceipts);
router.get('/lead/:leadId', requireAuth, paymentReceiptController.getPaymentReceiptsByLeadId);
router.get('/invoice/:invoiceId', requireAuth, paymentReceiptController.getPaymentReceiptsByInvoiceId);
router.get('/:id/pdf', requireAuth, paymentReceiptController.downloadPaymentReceiptPDF);
router.get('/:id', requireAuth, paymentReceiptController.getPaymentReceiptById);
router.post('/', requireAuth, authorize('admin', 'salesRep'), paymentReceiptController.createPaymentReceipt);
router.put('/:id', requireAuth, authorize('admin'), paymentReceiptController.updatePaymentReceipt);
router.put('/:id/cancel', requireAuth, authorize('admin'), paymentReceiptController.cancelPaymentReceipt);
router.put('/:id/verify', requireAuth, authorize('admin'), paymentReceiptController.verifyPaymentReceipt);
router.put('/:id/reconcile', requireAuth, authorize('admin'), paymentReceiptController.reconcilePaymentReceipt);
router.post('/:id/send', requireAuth, authorize('admin', 'salesRep'), paymentReceiptController.sendPaymentReceipt);

export default router;
