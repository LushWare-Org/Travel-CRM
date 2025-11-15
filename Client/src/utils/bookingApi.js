import apiClient from './apiClient';

export const submitBookingRequest = async (payload = {}) => {
  const response = await apiClient.post('/bookings/website', payload);
  return response.data?.data || null;
};


