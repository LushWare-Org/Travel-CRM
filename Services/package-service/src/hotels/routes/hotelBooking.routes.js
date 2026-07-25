import { Router } from 'express';
import { requireAuth, authorize } from '../../middleware/auth.js';
import { search, getDetails, prebook, book, listBookings, getBooking, cancelBooking } from '../controllers/hotelBooking.controller.js';

const router = Router();

// All hotel booking routes require auth
router.use(requireAuth, authorize('salesRep', 'admin', 'superAdmin'));

// Search & Book
router.post('/search', search);
router.post('/details', getDetails);
router.post('/prebook', prebook);
router.post('/book', book);

// Booking management
router.get('/bookings', listBookings);
router.get('/bookings/:id', getBooking);
router.post('/bookings/:id/cancel', cancelBooking);

export default router;
