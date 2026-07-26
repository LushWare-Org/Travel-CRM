import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import {
  searchSchema, priceSchema, bookSchema,
  cancelBookingSchema, listBookingsQuerySchema, bookingIdParamSchema,
} from '../validators/flight.schema.js';
import {
  search, price, book, listBookings, getBooking, cancelBooking,
} from '../controllers/flight.controller.js';
import { FLIGHT_AUTHORISED_ROLES } from '../constants/roles.js';

const router = Router();

router.use(requireAuth, authorize(...FLIGHT_AUTHORISED_ROLES));

// ── Search & Book ─────────────────────────────────────────────────
router.post('/search', validateBody(searchSchema), search);
router.post('/price', validateBody(priceSchema), price);
router.post('/book', validateBody(bookSchema), book);

// ── Booking management ────────────────────────────────────────────
router.get('/bookings', validateQuery(listBookingsQuerySchema), listBookings);
router.get('/bookings/:id', validateParams(bookingIdParamSchema), getBooking);
router.post('/bookings/:id/cancel', validateParams(bookingIdParamSchema), validateBody(cancelBookingSchema), cancelBooking);

export default router;
