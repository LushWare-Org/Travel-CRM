import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { WebsiteManualItineraryRequest, WebsiteManualItineraryResult, ManualItinerarySummary } from '@travel-crm/contracts';

type ManualItineraryPayload = z.infer<typeof WebsiteManualItineraryRequest>;

export const submitManualItineraryRequest = async (payload: ManualItineraryPayload) => {
  const body = WebsiteManualItineraryRequest.parse(payload);
  const response = await httpClient.post('/manual-itineraries/website', body);
  return parseEnvelope(WebsiteManualItineraryResult, response.data, 'POST /manual-itineraries/website').data;
};

export const fetchUserManualItineraries = async () => {
  const response = await httpClient.get('/manual-itineraries/my-requests');
  return parseEnvelope(z.array(ManualItinerarySummary), response.data, 'GET /manual-itineraries/my-requests').data;
};
