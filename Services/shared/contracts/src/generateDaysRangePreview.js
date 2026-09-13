import { z } from 'zod';
import { ManualItineraryDay } from './manualItinerary.js';

// Multi-day (sub-range) AI generation (docs/designs/granular-ai-itinerary-generation.md).
// dayNumbers need not be contiguous or head-anchored (e.g. filling gaps left
// by out-of-order manual deletes) — the server maps returned days positionally
// onto this exact list rather than trusting model-numbered output.
export const GenerateDaysRangePreviewRequest = z.object({
  destination: z.string().min(1).max(255),
  dayNumbers: z.array(z.number().int().min(1).max(30)).min(1).max(30),
  totalDuration: z.number().int().min(1).max(30),
  travelers: z.number().int().min(1).max(50).optional(),
  budget: z.string().max(100).optional(),
  preferences: z.string().max(1000).optional(),
  existingDays: z.array(ManualItineraryDay).max(30).optional(),
});

// No `.min(1)` — on a partial shortfall the server omits unfilled slots
// rather than padding them, so an empty array is a valid (if degenerate) result.
export const GenerateDaysRangePreviewResult = z.object({
  days: z.array(ManualItineraryDay),
});
