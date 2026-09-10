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

  it('reports a schema mismatch as a page that could not be loaded', () => {
    const raw = { status: 'success', data: { name: 'Jane', email: 'not-an-email' } };
    expect(() => parseEnvelope(UserSchema, raw, 'GET /users/me')).toThrow(
      "We couldn't load that page. Please refresh and try again.",
    );
  });

  it('reports a malformed envelope the same way', () => {
    expect(() => parseEnvelope(UserSchema, 'not-an-envelope', 'GET /users/me')).toThrow(
      "We couldn't load that page. Please refresh and try again.",
    );
  });

  it('reports a non-success envelope with no message as a failed request', () => {
    const raw = { data: { name: 'Jane', email: 'jane@example.com' } };
    expect(() => parseEnvelope(UserSchema, raw, 'GET /users/me')).toThrow(
      "We couldn't complete that request. Please try again.",
    );
  });

  it('never names the endpoint in what a visitor reads', () => {
    // The endpoint stays in the console.error above each throw, where a developer
    // can act on it; it is not the visitor's business or vocabulary.
    const cases: Array<[unknown, string]> = [
      ['not-an-envelope', 'GET /users/me'],
      [{ data: {} }, 'GET /users/me'],
      [{ status: 'success', data: { name: 'Jane', email: 'bad' } }, 'GET /users/me'],
    ];

    for (const [raw, endpoint] of cases) {
      let thrown: Error | undefined;
      try {
        parseEnvelope(UserSchema, raw, endpoint);
      } catch (err) {
        thrown = err as Error;
      }

      expect(thrown).toBeDefined();
      expect(thrown?.message).not.toContain(endpoint);
      expect((thrown as Error & { code?: string }).code).toBe('INTERNAL');
    }
  });
});
