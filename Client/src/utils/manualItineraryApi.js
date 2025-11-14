import apiClient from './apiClient';

export const submitManualItineraryRequest = async (payload = {}) => {
  const response = await apiClient.post('/manual-itineraries/website', payload);
  return response.data?.data || null;
};

export default {
  submitManualItineraryRequest,
};

