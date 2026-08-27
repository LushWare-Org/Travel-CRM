import httpClient from '../http/client';

export const submitContactForm = async (payload: Record<string, unknown>) => {
  const response = await httpClient.post('/leads/website-contact', payload);
  return response.data;
};
