import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseEnvelope } from '../envelope';

const UserSchema = z.object({ name: z.string(), email: z.string().email() });

describe('parseEnvelope', () => {
  it('returns .data for a valid { success: true, data } envelope', () => {
    const raw = { success: true, data: { name: 'Jane', email: 'jane@example.com' } };
    const result = parseEnvelope(UserSchema, raw, 'GET /users/me');
    expect(result.data).toEqual({ name: 'Jane', email: 'jane@example.com' });
  });

  it('returns .data for a valid { status: "success", data } envelope (dual-convention normalization)', () => {
    const raw = { status: 'success', data: { name: 'Jane', email: 'jane@example.com' } };
    const result = parseEnvelope(UserSchema, raw, 'GET /users/me');
    expect(result.data).toEqual({ name: 'Jane', email: 'jane@example.com' });
  });

  it('throws the backend message for { success: false, message }', () => {
    const raw = { success: false, message: 'Invalid credentials' };
    expect(() => parseEnvelope(UserSchema, raw, 'POST /auth/login')).toThrow('Invalid credentials');
  });

  it('throws a validation-specific message when data fails the schema, for either convention', () => {
    const raw = { status: 'success', data: { name: 'Jane', email: 'not-an-email' } };
    expect(() => parseEnvelope(UserSchema, raw, 'GET /users/me')).toThrow(/Unexpected response shape/);
  });

  it('throws on a malformed envelope (not an object)', () => {
    expect(() => parseEnvelope(UserSchema, 'not-an-envelope', 'GET /users/me')).toThrow(/Malformed response envelope/);
  });

  it('throws a generic message when neither success nor status indicates success', () => {
    const raw = { data: { name: 'Jane', email: 'jane@example.com' } };
    expect(() => parseEnvelope(UserSchema, raw, 'GET /users/me')).toThrow(/did not succeed/);
  });
});
