import { z } from 'zod';
import { moneyField } from './money.js';

// Confirmed against BookingModal.tsx's actual submitted payload
// (PackageDetailsContainer.test.tsx) and booking-service's
// createWebsiteBooking controller: `name` is optional client- and
// server-side (backend defaults to 'Website Traveler' when absent) — do
// not tighten it back to required without re-checking both sides.
export const WebsiteBookingRequest = z.object({
  packageId: z.string(),
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  travelers: z.number().int().min(1).optional(),
  travelDate: z.string().optional(),
  endDate: z.string().optional(),
  message: z.string().optional(),
});

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
