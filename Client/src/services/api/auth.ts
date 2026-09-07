import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';
import { LoginRequest, RegisterRequest, AuthResult } from '@travel-crm/contracts';
import { z } from 'zod';

type LoginPayload = z.infer<typeof LoginRequest>;
type RegisterPayload = z.infer<typeof RegisterRequest>;


const EmptyResponse = z.undefined();
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

export const requestPasswordReset = async (email: string) => {
  const response = await httpClient.post('/auth/forgot-password', {
    email: z.string().trim().email().parse(email),
  });
  return parseEnvelope(
    EmptyResponse,
    response.data,
    'POST /auth/forgot-password',
  ).message ?? 'If an account exists with this email, a password reset link will be sent.';
};

export const resetPassword = async (token: string, password: string) => {
  const resetToken = z.string().min(1, 'Reset token is required').parse(token);
  const body = {
    password: z.string().min(8, 'Password must be at least 8 characters').parse(password),
  };
  const response = await httpClient.put(
    `/auth/reset-password/${encodeURIComponent(resetToken)}`,
    body,
  );
  return parseEnvelope(
    AuthResult,
    response.data,
    'PUT /auth/reset-password/:token',
  ).data;
};

