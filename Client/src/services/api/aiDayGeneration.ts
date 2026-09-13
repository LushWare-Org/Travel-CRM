import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import {
  GenerateDayPreviewRequest,
  GenerateDayPreviewResult,
  GenerateDaysRangePreviewRequest,
  GenerateDaysRangePreviewResult,
} from '@travel-crm/contracts';

type GenerateDayPreviewPayload = z.infer<typeof GenerateDayPreviewRequest>;
type GenerateDaysRangePreviewPayload = z.infer<typeof GenerateDaysRangePreviewRequest>;

/** A single AI-generated day, shaped like the shared ManualItineraryDay contract. */
export type AIGeneratedDay = z.infer<typeof GenerateDayPreviewResult>['day'];

export const generateDayPreview = async (payload: GenerateDayPreviewPayload) => {
  const body = GenerateDayPreviewRequest.parse(payload);
  const response = await httpClient.post('/packages/generate-day-preview', body);
  return parseEnvelope(GenerateDayPreviewResult, response.data, 'POST /packages/generate-day-preview').data;
};

export const generateDaysRangePreview = async (payload: GenerateDaysRangePreviewPayload) => {
  const body = GenerateDaysRangePreviewRequest.parse(payload);
  const response = await httpClient.post('/packages/generate-days-preview', body);
  return parseEnvelope(GenerateDaysRangePreviewResult, response.data, 'POST /packages/generate-days-preview').data;
};
