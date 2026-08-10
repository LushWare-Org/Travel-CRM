import { z } from 'zod';

// Matches the day objects built by lead-service's snapshotSelectionQuotation
// (Services/lead-service/src/services/lead-selection.service.js) from a
// package's itinerary blueprint.
export const ItineraryDay = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  locations: z.array(z.string()),
  meals: z.array(z.string()),
});
