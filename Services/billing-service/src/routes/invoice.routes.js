import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as invoiceController from '../controllers/invoice.controller.js';

const router = Router();

router.get('/stats', requireAuth, authorize('admin', 'salesRep'), invoiceController.getInvoiceStats);
router.get('/overdue', requireAuth, authorize('admin', 'salesRep'), invoiceController.getOverdueInvoices);
router.get('/', requireAuth, invoiceController.getAllInvoices);
router.get('/lead/:leadId', requireAuth, invoiceController.getInvoiceByLeadId);
router.get('/:id/pdf', requireAuth, invoiceController.downloadInvoicePDF);
router.get('/:id', requireAuth, invoiceController.getInvoiceById);
router.post('/', requireAuth, authorize('admin', 'salesRep'), invoiceController.createInvoice);
router.put('/:id', requireAuth, authorize('admin', 'salesRep'), invoiceController.updateInvoice);
router.put('/:id/cancel', requireAuth, authorize('admin'), invoiceController.cancelInvoice);
router.post('/:id/send', requireAuth, authorize('admin', 'salesRep'), invoiceController.sendInvoice);
router.post('/:id/viewed', invoiceController.markInvoiceViewed);
router.post('/:id/remind', requireAuth, authorize('admin', 'salesRep'), invoiceController.sendPaymentReminder);

export default router;
