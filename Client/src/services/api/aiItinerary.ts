import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { GenerateItineraryPreviewRequest, GenerateItineraryPreviewResult } from '@travel-crm/contracts';

type GenerateItineraryPreviewPayload = z.infer<typeof GenerateItineraryPreviewRequest>;

/** A single AI-generated itinerary day, shaped like the shared ManualItineraryDay contract. */
export type AIItineraryDay = z.infer<typeof GenerateItineraryPreviewResult>['days'][number];

export const generateItineraryPreview = async (payload: GenerateItineraryPreviewPayload) => {
  const body = GenerateItineraryPreviewRequest.parse(payload);
  const response = await httpClient.post('/packages/generate-itinerary-preview', body);
  return parseEnvelope(GenerateItineraryPreviewResult, response.data, 'POST /packages/generate-itinerary-preview').data;
};
