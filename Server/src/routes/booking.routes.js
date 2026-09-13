import express from 'express';
import { createWebsiteBooking, getUserBookings, getRecentBookings } from '../controllers/booking.controller.js';
import { protect } from '../middleware/auth.js';
import { formLimiter } from '../config/rateLimiter.js';

const router = express.Router();

// Public booking endpoint for website enquiries
router.post('/website', formLimiter, createWebsiteBooking);
router.get('/user', protect, getUserBookings);
router.get('/recent', getRecentBookings);

export default router;
