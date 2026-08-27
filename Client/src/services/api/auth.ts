import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { LoginRequest, RegisterRequest, AuthResult } from '@travel-crm/contracts';
import type { z } from 'zod';

type LoginPayload = z.infer<typeof LoginRequest>;
type RegisterPayload = z.infer<typeof RegisterRequest>;

export const login = async (payload: LoginPayload) => {
  const body = LoginRequest.parse(payload);
  const response = await httpClient.post('/auth/login', body);
  return parseEnvelope(AuthResult, response.data, 'POST /auth/login').data;
};

export const register = async (payload: RegisterPayload) => {
  // Backend expects a pure 10-digit phone if provided
  const cleanedPhone = payload.phone ? payload.phone.replace(/\D/g, '') : undefined;
  const body = RegisterRequest.parse({ ...payload, phone: cleanedPhone });
  const response = await httpClient.post('/auth/register', body);
  return parseEnvelope(AuthResult, response.data, 'POST /auth/register').data;
};

