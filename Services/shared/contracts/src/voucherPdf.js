import { z } from 'zod';

// Narrow schema for the fields billing-service's generateVoucherPDF
// (Services/billing-service/src/utils/voucherPDFGenerator.js) actually
// dereferences off a persisted Voucher row (with its locationDates/
// mealPlans/itinerarySummary/flightSegments relations included).
// .passthrough() so unrelated Voucher columns (leadId, packageId,
// timestamps, ...) aren't rejected.
export const VoucherForPdf = z
  .object({
    voucherNumber: z.string(),
    status: z.string(),
    travelStartDate: z.coerce.date().nullable().optional(),
    travelEndDate: z.coerce.date().nullable().optional(),
    specialInstructions: z.string().nullable().optional(),

    customerName: z.string(),
    customerEmail: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),

    packageDetails: z
      .object({
        name: z.string().optional(),
        destination: z.string().optional(),
        duration: z.number().optional(),
        inclusions: z.array(z.string()).optional(),
        exclusions: z.array(z.string()).optional(),
      })
      .passthrough()
      .nullable()
      .optional(),

    locationDates: z
      .array(
        z
          .object({
            location: z.string().nullable().optional(),
            hotelName: z.string().nullable().optional(),
            checkIn: z.coerce.date().nullable().optional(),
            checkOut: z.coerce.date().nullable().optional(),
          })
          .passthrough(),
      )
      .optional(),

    mealPlans: z
      .array(
        z
          .object({
            dayNumber: z.number(),
            breakfast: z.boolean(),
            lunch: z.boolean(),
            dinner: z.boolean(),
          })
          .passthrough(),
      )
      .optional(),

    itinerarySummary: z
      .array(
        z
          .object({
            dayNumber: z.number(),
            title: z.string().nullable().optional(),
            locations: z.array(z.string()).optional(),
            activities: z.array(z.string()).optional(),
            accommodationName: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .optional(),

    flightSegments: z
      .array(
        z
          .object({
            dayNumber: z.number().nullable().optional(),
            marketingCarrier: z.string().nullable().optional(),
            flightNumber: z.string().nullable().optional(),
            origin: z.string().nullable().optional(),
            destination: z.string().nullable().optional(),
            departureAt: z.coerce.date().nullable().optional(),
            arrivalAt: z.coerce.date().nullable().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();
