import httpClient from '../http/client';

interface ProfilePayload {
  name: string;
  email: string;
  phone: string;
}

export const updateProfile = async (payload: ProfilePayload) => {
  const response = await httpClient.put('/users/profile', payload);
  return response.data;
};
