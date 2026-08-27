import httpClient from '../http/client';

export const submitBookingRequest = async (payload: Record<string, unknown> = {}) => {
  const response = await httpClient.post('/bookings/website', payload);
  return response.data?.data || null;
};

export const fetchUserBookings = async () => {
  const response = await httpClient.get('/bookings/user');
  return response.data?.data || [];
};

export const fetchRecentBookings = async (limit = 10) => {
  const response = await httpClient.get(`/bookings/recent?limit=${limit}`);
  return response.data?.data || [];
};
