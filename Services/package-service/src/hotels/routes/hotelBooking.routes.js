import { Router } from 'express';
import { requireAuth, authorize } from '../../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  searchSchema, detailsSchema, bookSchema,
  cancelBookingSchema, listBookingsQuerySchema, bookingIdParamSchema,
  leadIdParamSchema, bookWithContextSchema,
} from '../../validators/hotel.schema.js';
import { search, getDetails, prebook, book, listBookings, getBooking, cancelBooking, bookWithContext, getHotelBookingsByLead } from '../controllers/hotelBooking.controller.js';
import { HOTEL_AUTHORISED_ROLES } from '../../constants/roles.js';

const router = Router();

router.use(requireAuth, authorize(...HOTEL_AUTHORISED_ROLES));

// Search & Book — validated
router.post('/search', validateBody(searchSchema), search);
router.post('/details', validateBody(detailsSchema), getDetails);
router.post('/prebook', prebook);
router.post('/book', validateBody(bookSchema), book);

// Booking management
router.get('/bookings', validateQuery(listBookingsQuerySchema), listBookings);
router.get('/bookings/by-lead/:leadId', validateParams(leadIdParamSchema), getHotelBookingsByLead);
router.get('/bookings/:id', validateParams(bookingIdParamSchema), getBooking);
router.post('/bookings/:id/cancel', validateParams(bookingIdParamSchema), validateBody(cancelBookingSchema), cancelBooking);

// Lead-scoped booking
router.post('/book-with-context', validateBody(bookWithContextSchema), bookWithContext);

export default router;