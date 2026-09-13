import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as creditNoteController from '../controllers/creditNote.controller.js';

const router = Router();

router.get('/stats', requireAuth, authorize('admin', 'salesRep'), creditNoteController.getCreditNoteStats);
router.get('/', requireAuth, creditNoteController.getAllCreditNotes);
router.get('/lead/:leadId', requireAuth, creditNoteController.getCreditNoteByLeadId);
router.get('/invoice/:invoiceId', requireAuth, creditNoteController.getCreditNoteByInvoiceId);
router.get('/:id', requireAuth, creditNoteController.getCreditNoteById);
router.post('/', requireAuth, authorize('admin', 'salesRep'), creditNoteController.createCreditNote);
router.put('/:id', requireAuth, authorize('admin'), creditNoteController.updateCreditNote);
router.put('/:id/issue', requireAuth, authorize('admin'), creditNoteController.issueCreditNote);
router.put('/:id/approve', requireAuth, authorize('admin'), creditNoteController.approveCreditNote);
router.put('/:id/reject', requireAuth, authorize('admin'), creditNoteController.rejectCreditNote);
router.put('/:id/apply', requireAuth, authorize('admin', 'salesRep'), creditNoteController.applyCreditNote);
router.put('/:id/refund', requireAuth, authorize('admin'), creditNoteController.processCreditNoteRefund);
router.post('/:id/voucher', requireAuth, authorize('admin', 'salesRep'), creditNoteController.generateVoucherFromCreditNote);
router.put('/:id/cancel', requireAuth, authorize('admin'), creditNoteController.cancelCreditNote);
router.post('/:id/send', requireAuth, authorize('admin', 'salesRep'), creditNoteController.sendCreditNote);

export default router;
