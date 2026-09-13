import { z } from 'zod';
import { ManualItineraryDay } from './manualItinerary.js';

// Per-day AI generation (docs/designs/granular-ai-itinerary-generation.md).
// existingDays carries the trip's other days as prompt context so the model
// avoids duplicating already-planned locations/activities; the target
// dayNumber is filtered out server-side even if the caller includes it.
export const GenerateDayPreviewRequest = z.object({
  destination: z.string().min(1).max(255),
  dayNumber: z.number().int().min(1).max(30),
  totalDuration: z.number().int().min(1).max(30),
  travelers: z.number().int().min(1).max(50).optional(),
  budget: z.string().max(100).optional(),
  preferences: z.string().max(1000).optional(),
  existingDays: z.array(ManualItineraryDay).max(30).optional(),
});

export const GenerateDayPreviewResult = z.object({
  day: ManualItineraryDay,
});
