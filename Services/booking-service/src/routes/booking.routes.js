import { Router } from 'express';
import { createWebsiteBooking, getUserBookings, getRecentBookings } from '../controllers/booking.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/website', createWebsiteBooking);
router.get('/user', requireAuth, getUserBookings);
router.get('/recent', getRecentBookings);

export default router;
