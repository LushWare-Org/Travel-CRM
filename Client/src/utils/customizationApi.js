import apiClient from './apiClient';

export const submitCustomizationRequest = async (payload = {}) => {
  const response = await apiClient.post('/customized-packages/website', payload);
  return response.data?.data || null;
};

export const fetchUserCustomizedPackages = async () => {
  const response = await apiClient.get('/customized-packages/my-requests');
  return response.data?.data || [];
};

export default {
  submitCustomizationRequest,
  fetchUserCustomizedPackages,
};



