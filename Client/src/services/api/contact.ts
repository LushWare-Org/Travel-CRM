import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { WebsiteContactRequest, WebsiteContactResult } from '@travel-crm/contracts';

type ContactPayload = z.infer<typeof WebsiteContactRequest>;

export const submitContactForm = async (payload: ContactPayload) => {
  const body = WebsiteContactRequest.parse(payload);
  const response = await httpClient.post('/leads/website-contact', body);
  return parseEnvelope(WebsiteContactResult, response.data, 'POST /leads/website-contact').data;
};
