import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { search, price, book, listBookings, getBooking, cancelBooking } from '../controllers/flight.controller.js';

const router = Router();

router.use(requireAuth, authorize('salesRep', 'admin', 'superAdmin'));

router.post('/search', search);
router.post('/price', price);
router.post('/book', book);
router.get('/bookings', listBookings);
router.get('/bookings/:id', getBooking);
router.post('/bookings/:id/cancel', cancelBooking);

export default router;
