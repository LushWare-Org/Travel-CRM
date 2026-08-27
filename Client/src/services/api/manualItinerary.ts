import httpClient from '../http/client';

export const submitManualItineraryRequest = async (payload: Record<string, unknown> = {}) => {
  const response = await httpClient.post('/manual-itineraries/website', payload);
  return response.data?.data || null;
};

export const fetchUserManualItineraries = async () => {
  const response = await httpClient.get('/manual-itineraries/my-requests');
  return response.data?.data || [];
};
