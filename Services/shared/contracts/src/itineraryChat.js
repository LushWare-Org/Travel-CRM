import { z } from 'zod';
import { GenerateItineraryPreviewRequest } from './aiItineraryPreview.js';

export const ItineraryChatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

// All fields optional — a chat turn may know only some of what
// GenerateItineraryPreviewRequest eventually requires in full.
export const ItineraryChatSlots = GenerateItineraryPreviewRequest.partial();

export const ItineraryChatRequest = z.object({
  messages: z.array(ItineraryChatMessage).min(1).max(20),
  slots: ItineraryChatSlots.optional(),
});

export const ItineraryChatResult = z.object({
  reply: z.string().min(1),
  slots: ItineraryChatSlots,
  readyToGenerate: z.boolean(),
});
