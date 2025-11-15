import apiClient from './apiClient';

export const submitCustomizationRequest = async (payload = {}) => {
  const response = await apiClient.post('/customized-packages/website', payload);
  return response.data?.data || null;
};

export default {
  submitCustomizationRequest,
};



