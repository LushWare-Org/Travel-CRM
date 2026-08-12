import { z } from 'zod';

// Matches the day objects built by lead-service's snapshotSelectionQuotation
// (Services/lead-service/src/services/lead-selection.service.js) from the
// lead's own itinerary copy. `activities`/`images` default to [] (not
// .nullable()) so older persisted Quotation.itineraryDays rows — saved before
// these fields existed — still parse without error on re-render.
export const ItineraryDay = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  locations: z.array(z.string()),
  meals: z.array(z.string()),
  activities: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        cost: z.number().nullable().optional(),
      }),
    )
    .optional()
    .default([]),
  // Only the first (cover) image per day is carried through — see the
  // multi-image rule documented at its call site in
  // snapshotSelectionQuotation() and quotationPDFGenerator.js's dayCard().
  images: z.array(z.string()).optional().default([]),
});
