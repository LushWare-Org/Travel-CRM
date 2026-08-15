import { z } from 'zod';

/**
 * Body for POST /vouchers/:id/send. `channel` picks the delivery medium;
 * `email`/`phone` optionally override the voucher snapshot's contact.
 */
export const sendVoucherSchema = z.object({
  channel: z.enum(['email', 'whatsapp']).default('email'),
  email: z.string().email().optional(),
  phone: z.string().trim().min(1).optional(),
});

const voucherLocationDateSchema = z.object({
  location: z.string().trim().optional(),
  hotelName: z.string().trim().optional(),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
});

const voucherMealPlanSchema = z.object({
  dayNumber: z.coerce.number().int().min(1),
  dayTitle: z.string().trim().optional(),
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
});

const voucherItinerarySummarySchema = z.object({
  dayNumber: z.coerce.number().int().min(1),
  title: z.string().trim().optional(),
  locations: z.array(z.string()).optional(),
  activities: z.array(z.string()).optional(),
  accommodationName: z.string().trim().optional(),
  accommodationType: z.string().trim().optional(),
});

const voucherFlightSegmentSchema = z.object({
  dayNumber: z.coerce.number().int().optional(),
  marketingCarrier: z.string().trim().optional(),
  flightNumber: z.string().trim().optional(),
  origin: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  departureAt: z.coerce.date().optional(),
  arrivalAt: z.coerce.date().optional(),
});

const voucherScalarsSchema = z.object({
  leadId: z.string().min(1, 'leadId is required'),
  packageId: z.string().trim().min(1).nullable().optional(),
  customizedPackageId: z.string().trim().min(1).nullable().optional(),
  customerName: z.string().trim().min(1, 'customerName is required'),
  customerEmail: z.string().trim().email('customerEmail must be a valid email'),
  customerPhone: z.string().trim().optional(),
  customerAddress: z.string().trim().optional(),
  packageDetails: z.record(z.any()).nullable().optional(),
  travelStartDate: z.coerce.date().optional(),
  travelEndDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  terms: z.array(z.string()).optional(),
  specialInstructions: z.string().optional(),
});

// Child-array fields are intentionally `.optional()` with no `.default([])`:
// updateVoucher's `if (field)` checks distinguish "omitted" (relation left
// untouched) from "present, even []" (relation replaced). A Zod default
// would silently wipe every relation on every partial update.
const voucherArraysSchema = z.object({
  locationDates: z.array(voucherLocationDateSchema).optional(),
  mealPlans: z.array(voucherMealPlanSchema).optional(),
  itinerarySummary: z.array(voucherItinerarySummarySchema).optional(),
  flightSegments: z.array(voucherFlightSegmentSchema).optional(),
});

/** Body for POST /vouchers. leadId/customerName/customerEmail are required. */
export const createVoucherSchema = voucherScalarsSchema.merge(voucherArraysSchema);

/**
 * Body for PUT /vouchers/:id. All scalars optional (partial patch); status
 * is allowed here (not on create — new vouchers always start `draft` via
 * Prisma's @default) so staff can still force a status change via PUT.
 */
export const updateVoucherSchema = voucherScalarsSchema.partial().merge(voucherArraysSchema).extend({
  status: z.enum(['draft', 'sent', 'viewed', 'confirmed', 'cancelled']).optional(),
});
