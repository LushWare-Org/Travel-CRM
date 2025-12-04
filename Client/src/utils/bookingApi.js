import apiClient from './apiClient';

export const submitBookingRequest = async (payload = {}) => {
  const response = await apiClient.post('/bookings/website', payload);
  return response.data?.data || null;
};

export const fetchUserBookings = async () => {
  const response = await apiClient.get('/bookings/user');
  return response.data?.data || [];
};

export const fetchRecentBookings = async (limit = 10) => {
  const response = await apiClient.get(`/bookings/recent?limit=${limit}`);
  return response.data?.data || [];
};
