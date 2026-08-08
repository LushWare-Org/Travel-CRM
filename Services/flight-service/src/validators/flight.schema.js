import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════
//  Reusable fragments
// ═══════════════════════════════════════════════════════════════════

const iataCode = z.string().length(3, 'Must be 3-letter IATA code').regex(/^[A-Z]{3}$/, 'Must be uppercase IATA code');

// Looser than z.string().uuid(): accepts any UUID-shaped string rather than
// enforcing RFC 4122 v1-5 version/variant nibbles. Seed data hand-crafts
// readable IDs (e.g. d0000000-0000-0000-0000-00000000000c) that are valid
// Prisma primary keys — Prisma stores id/foreign-key columns as plain
// strings with no format constraint — but fail the strict v1-5 check.
const UUID_SHAPE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const crossServiceId = (message = 'Invalid ID') => z.string().regex(UUID_SHAPE_RE, message);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const cabinClass = z.enum(['Economy', 'Premium Economy', 'Business', 'First']);

const tripType = z.enum(['oneWay', 'roundTrip']);

const travelerType = z.enum(['adult', 'child', 'infant']);

const traveler = z.object({
  type: travelerType,
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Miss']).optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  gender: z.enum(['M', 'F']).optional(),
  passportNumber: z.string().max(12).nullable().optional(),
  passportExpiry: dateString.nullable().optional(),
  nationality: z.string().length(2, 'Must be 2-letter country code').nullable().optional(),
  frequentFlyerNumber: z.string().nullable().optional(),
});

// ═══════════════════════════════════════════════════════════════════
//  Request schemas
// ═══════════════════════════════════════════════════════════════════

/** POST /flights/search */
export const searchSchema = z.object({
  origin: iataCode,
  destination: iataCode,
  departureDate: dateString,
  returnDate: dateString.optional(),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  children: z.coerce.number().int().min(0).max(9).default(0),
  infants: z.coerce.number().int().min(0).max(4).default(0),
  cabinClass: cabinClass.default('Economy'),
  tripType: tripType.default('oneWay'),
}).refine(
  (d) => d.origin !== d.destination,
  { message: 'Origin and destination must be different', path: ['destination'] },
);

/** POST /flights/price */
export const priceSchema = z.object({
  offerId: z.string().min(1, 'offerId is required'),
});

/** POST /flights/book */
export const bookSchema = z.object({
  offer: z.object({
    offerId: z.string().min(1, 'offer.offerId is required'),
  }).passthrough(), // allow extra offer fields through
  tripType: tripType.default('oneWay'),
  travelers: z.array(traveler).min(1, 'At least one traveler is required'),
  contact: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid contact email'),
    phone: z.string().optional(),
  }),
});

/** POST /flights/bookings/:id/cancel */
export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

/** GET /flights/bookings — query params */
export const listBookingsQuerySchema = z.object({
  status: z.enum(['quoted', 'pending', 'confirmed', 'ticketed', 'cancelled', 'failed']).optional(),
});

/** Route params with UUID */
export const bookingIdParamSchema = z.object({
  id: crossServiceId('Invalid booking ID'),
});

/** Route params — leadId */
export const leadIdParamSchema = z.object({
  leadId: crossServiceId('Invalid lead ID'),
});

/** POST /flights/book-for-lead — same as book but with lead context */
export const leadBookSchema = bookSchema.extend({
  leadId: crossServiceId().optional(),
  packageId: crossServiceId().optional(),
  customizedPackageId: crossServiceId().optional(),
  dayNumber: z.coerce.number().int().positive().optional(),
  flightType: z.enum(['itinerary', 'optional']).default('itinerary'),
});

/** PATCH /flights/bookings/:id/link-day */
export const linkDaySchema = z.object({
  leadId: crossServiceId().optional(),
  dayNumber: z.coerce.number().int().positive().optional(),
  flightType: z.enum(['itinerary', 'optional']).optional(),
});
