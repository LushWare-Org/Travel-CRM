import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// Looser than z.string().uuid(): accepts any UUID-shaped string rather than
// enforcing RFC 4122 v1-5 version/variant nibbles. Seed data hand-crafts
// readable IDs (e.g. d0000000-0000-0000-0000-00000000000c) that are valid
// Prisma primary keys — Prisma stores id/foreign-key columns as plain
// strings with no format constraint — but fail the strict v1-5 check.
const UUID_SHAPE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const crossServiceId = (message = 'Invalid ID') => z.string().regex(UUID_SHAPE_RE, message);

const occupancy = z.object({
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(9).default(0),
});

/** POST /hotels/search */
export const searchSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(1).max(100).default(10).optional(),
  radiusUnit: z.enum(['km', 'mi']).default('km').optional(),
  checkin: dateString,
  checkout: dateString,
  currency: z.string().length(3).default('USD').optional(),
  guestNationality: z.string().length(2).default('US').optional(),
  occupancies: z.array(occupancy).min(1).default([{ adults: 1, children: 0 }]),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  iataCode: z.string().length(3).optional(),
});

/** POST /hotels/details — body or query */
export const detailsSchema = z.object({
  hotelId: z.string().min(1, 'hotelId is required'),
});

/** POST /hotels/prebook */
export const prebookSchema = z.object({
  offerId: z.string().min(1, 'offerId is required'),
});

/** POST /hotels/book */
export const bookSchema = z.object({
  prebookId: z.string().min(1, 'prebookId is required'),
  guests: z.array(z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    title: z.enum(['Mr', 'Mrs', 'Ms', 'Miss']).optional(),
  })).min(1, 'At least one guest is required'),
  contact: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid contact email'),
    phone: z.string().optional(),
  }),
  offer: z.object({}).passthrough().optional(),
});

/** POST /hotels/bookings/:id/cancel */
export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

/** GET /hotels/bookings — query */
export const listBookingsQuerySchema = z.object({
  status: z.enum(['confirmed', 'pending', 'cancelled', 'failed']).optional(),
});

/** Route params with UUID */
export const bookingIdParamSchema = z.object({
  id: crossServiceId('Invalid booking ID'),
});

/** Route params — leadId */
export const leadIdParamSchema = z.object({
  leadId: crossServiceId('Invalid lead ID'),
});

/** POST /hotels/book-with-context — same as book but with lead context */
export const bookWithContextSchema = bookSchema.extend({
  leadId: crossServiceId().optional(),
  packageId: crossServiceId().optional(),
  customizedPackageId: crossServiceId().optional(),
  dayNumber: z.coerce.number().int().positive().optional(),
});