import apiClient from './apiClient';

export const submitManualItineraryRequest = async (payload = {}) => {
  const response = await apiClient.post('/manual-itineraries/website', payload);
  return response.data?.data || null;
};

export const fetchUserManualItineraries = async () => {
  const response = await apiClient.get('/manual-itineraries/my-requests');
  return response.data?.data || [];
};

export default {
  submitManualItineraryRequest,
  fetchUserManualItineraries,
};