import { z } from 'zod';
import { ManualItineraryDay } from './manualItinerary.js';

export const GenerateItineraryPreviewRequest = z.object({
  destination: z.string().min(1).max(255),
  duration: z.number().int().min(1).max(30),
  travelers: z.number().int().min(1).max(50).optional(),
  budget: z.string().max(100).optional(),
  preferences: z.string().max(1000).optional(),
});

export const GenerateItineraryPreviewResult = z.object({
  days: z.array(ManualItineraryDay).min(1),
});
