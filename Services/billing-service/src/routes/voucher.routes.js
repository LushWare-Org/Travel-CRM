import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as voucherController from '../controllers/voucher.controller.js';

const router = Router();

router.get('/', requireAuth, voucherController.getAllVouchers);
router.get('/lead/:leadId', requireAuth, voucherController.getVouchersByLeadId);
router.get('/:id/pdf', requireAuth, voucherController.downloadVoucherPDF);
router.get('/:id', requireAuth, voucherController.getVoucherById);
router.post('/', requireAuth, authorize('admin', 'salesRep'), voucherController.createVoucher);
router.put('/:id', requireAuth, authorize('admin', 'salesRep'), voucherController.updateVoucher);
router.delete('/:id', requireAuth, authorize('admin'), voucherController.deleteVoucher);
router.post('/:id/send', requireAuth, authorize('admin', 'salesRep'), voucherController.sendVoucher);
router.post('/:id/viewed', voucherController.markVoucherViewed);
router.post('/:id/confirm', requireAuth, voucherController.confirmVoucher);

export default router;
