import { z } from 'zod';
import { moneyField } from './money.js';

// .passthrough(): BookingModal.tsx's exact submitted field set wasn't
// fully enumerated when this schema was authored. Fields below are the
// ones known to be required; extra fields the form sends pass through
// untouched rather than being silently stripped/rejected. Prefer adding
// named fields here over relying on passthrough long-term.
export const WebsiteBookingRequest = z
  .object({
    packageId: z.string(),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    travelers: z.number().int().min(1).optional(),
    travelDate: z.string().optional(),
    endDate: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export const WebsiteBookingResult = z
  .object({
    bookingId: z.string().optional(),
  })
  .passthrough();

export const UserBooking = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    package: z
      .object({
        _id: z.string().optional(),
        id: z.string().optional(),
        name: z.string().optional(),
        destination: z.string().optional(),
        images: z.array(z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    packageName: z.string().optional(),
    destination: z.string().optional(),
    totalAmount: moneyField.optional(),
    travelDate: z.string().nullable().optional(),
    numberOfTravelers: z.number().optional(),
    paymentStatus: z.string().optional(),
    bookingStatus: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();
