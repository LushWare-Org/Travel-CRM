import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { search, price, book, listBookings, getBooking, cancelBooking } from '../controllers/flight.controller.js';
import { FLIGHT_AUTHORISED_ROLES } from '../constants/roles.js';

const router = Router();

router.use(requireAuth, authorize(...FLIGHT_AUTHORISED_ROLES));

router.post('/search', search);
router.post('/price', price);
router.post('/book', book);
router.get('/bookings', listBookings);
router.get('/bookings/:id', getBooking);
router.post('/bookings/:id/cancel', cancelBooking);

export default router;
