import apiClient from './apiClient';

export const submitContactForm = async (payload) => {
  const response = await apiClient.post('/leads/website-contact', payload);
  return response.data;
};

export default {
  submitContactForm,
};

