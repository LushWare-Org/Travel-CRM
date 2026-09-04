import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { ItineraryChatRequest, ItineraryChatResult } from '@travel-crm/contracts';

type ItineraryChatPayload = z.infer<typeof ItineraryChatRequest>;
export type ItineraryChatSlots = z.infer<typeof ItineraryChatResult>['slots'];

export const sendItineraryChatMessage = async (payload: ItineraryChatPayload) => {
  const body = ItineraryChatRequest.parse(payload);
  const response = await httpClient.post('/packages/itinerary-chat', body);
  return parseEnvelope(ItineraryChatResult, response.data, 'POST /packages/itinerary-chat').data;
};
