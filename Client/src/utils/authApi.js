import apiClient from './apiClient';

export const login = async ({ email, password }) => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};

export const register = async ({ name, email, phone, password, confirmPassword }) => {
  // Backend expects a pure 10-digit phone if provided
  const cleanedPhone = phone ? phone.replace(/\D/g, '') : undefined;

  const res = await apiClient.post('/auth/register', {
    name,
    email,
    phone: cleanedPhone,
    password,
    confirmPassword,
  });
  return res.data;
};



