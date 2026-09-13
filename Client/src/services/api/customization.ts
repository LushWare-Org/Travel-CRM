import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { WebsiteCustomizationRequest, WebsiteCustomizationResult, CustomizedPackageSummary } from '@travel-crm/contracts';

type CustomizationPayload = z.infer<typeof WebsiteCustomizationRequest>;

export const submitCustomizationRequest = async (payload: CustomizationPayload) => {
  const body = WebsiteCustomizationRequest.parse(payload);
  const response = await httpClient.post('/customized-packages/website', body);
  return parseEnvelope(WebsiteCustomizationResult, response.data, 'POST /customized-packages/website').data;
};

export const fetchUserCustomizedPackages = async () => {
  const response = await httpClient.get('/customized-packages/my-requests');
  return parseEnvelope(z.array(CustomizedPackageSummary), response.data, 'GET /customized-packages/my-requests').data;
};
