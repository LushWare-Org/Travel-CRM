import express from 'express';
import { getInvoiceByBooking, getMyInvoices } from '../controllers/invoice.controller.js';

const router = express.Router();

// Invoice routes
router.get('/me', getMyInvoices);
router.get('/:bookingId', getInvoiceByBooking);

export default router;
