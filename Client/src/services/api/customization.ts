import httpClient from '../http/client';

export const submitCustomizationRequest = async (payload: Record<string, unknown> = {}) => {
  const response = await httpClient.post('/customized-packages/website', payload);
  return response.data?.data || null;
};

export const fetchUserCustomizedPackages = async () => {
  const response = await httpClient.get('/customized-packages/my-requests');
  return response.data?.data || [];
};
