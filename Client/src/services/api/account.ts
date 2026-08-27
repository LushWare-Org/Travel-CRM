import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { ProfileUpdateRequest, ProfileUpdateResult } from '@travel-crm/contracts';
import type { z } from 'zod';

type ProfilePayload = z.infer<typeof ProfileUpdateRequest>;

export const updateProfile = async (payload: ProfilePayload) => {
  const body = ProfileUpdateRequest.parse(payload);
  const response = await httpClient.put('/users/profile', body);
  return parseEnvelope(ProfileUpdateResult, response.data, 'PUT /users/profile').data;
};
