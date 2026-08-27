import httpClient from '../http/client';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export const login = async ({ email, password }: LoginPayload) => {
  const res = await httpClient.post('/auth/login', { email, password });
  return res.data;
};

export const register = async ({ name, email, phone, password, confirmPassword }: RegisterPayload) => {
  // Backend expects a pure 10-digit phone if provided
  const cleanedPhone = phone ? phone.replace(/\D/g, '') : undefined;

  const res = await httpClient.post('/auth/register', {
    name,
    email,
    phone: cleanedPhone,
    password,
    confirmPassword,
  });
  return res.data;
};
