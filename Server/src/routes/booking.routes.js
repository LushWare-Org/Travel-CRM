import express from 'express';
import { createBooking, getMyBookings, getBooking } from '../controllers/booking.controller.js';

const router = express.Router();

// Booking routes
router.post('/', createBooking);
router.get('/me', getMyBookings);
router.get('/:id', getBooking);

export default router;
