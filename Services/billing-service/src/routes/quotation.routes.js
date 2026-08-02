import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as quotationController from '../controllers/quotation.controller.js';

const router = Router();

router.get('/stats', requireAuth, authorize('admin', 'salesRep'), quotationController.getQuotationStats);
router.get('/', requireAuth, quotationController.getAllQuotations);
router.get('/lead/:leadId', requireAuth, quotationController.getQuotationsByLeadId);
router.get('/:id/pdf', requireAuth, quotationController.downloadQuotationPDF);
router.get('/:id', requireAuth, quotationController.getQuotationById);
router.post('/', requireAuth, authorize('admin', 'salesRep'), quotationController.createQuotation);
router.post('/from-lead', requireAuth, authorize('admin', 'salesRep'), quotationController.createQuotationFromLead);
router.put('/:id', requireAuth, authorize('admin', 'salesRep'), quotationController.updateQuotation);
router.delete('/:id', requireAuth, authorize('admin'), quotationController.deleteQuotation);
router.post('/:id/send', requireAuth, authorize('admin', 'salesRep'), quotationController.sendQuotation);
router.post('/:id/viewed', quotationController.markQuotationViewed);
router.post('/:id/accept', requireAuth, quotationController.acceptQuotation);
router.post('/:id/reject', requireAuth, quotationController.rejectQuotation);
router.post('/:id/convert', requireAuth, authorize('admin', 'salesRep'), quotationController.convertQuotationToInvoice);

export default router;
