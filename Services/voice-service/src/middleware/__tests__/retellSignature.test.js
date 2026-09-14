import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { symmetric } from 'retell-sdk/lib/webhook_auth.js';
import { verifyRetellSignature, requireRetellSignature } from '../retellSignature.js';

const SECRET = 'key_test_secret';
const BODY = JSON.stringify({ event: 'call_analyzed', call: { call_id: 'abc' } });
const raw = Buffer.from(BODY);

const signNow = (body = BODY, secret = SECRET) => symmetric.sign(body, secret);

describe('verifyRetellSignature', () => {
  it('accepts a signature produced by Retell’s own signer', async () => {
    expect(await verifyRetellSignature(raw, await signNow(), SECRET)).toBe(true);
  });

  it('accepts a raw body passed as a string rather than a Buffer', async () => {
    expect(await verifyRetellSignature(BODY, await signNow(), SECRET)).toBe(true);
  });

  it('rejects a signature made with a different secret', async () => {
    expect(await verifyRetellSignature(raw, await signNow(BODY, 'other_key'), SECRET)).toBe(false);
  });

  it('rejects a valid signature replayed against a tampered body', async () => {
    const sig = await signNow();
    expect(await verifyRetellSignature(Buffer.from('{"event":"tampered"}'), sig, SECRET)).toBe(false);
  });

  it('rejects a signature older than the five-minute replay window', async () => {
    const stale = await symmetric.sign(BODY, SECRET, Date.now() - 6 * 60 * 1000);
    expect(await verifyRetellSignature(raw, stale, SECRET)).toBe(false);
  });

  it('accepts a signature inside the replay window', async () => {
    const recent = await symmetric.sign(BODY, SECRET, Date.now() - 60 * 1000);
    expect(await verifyRetellSignature(raw, recent, SECRET)).toBe(true);
  });

  it('rejects a bare hex digest, which is not Retell’s format', async () => {
    expect(await verifyRetellSignature(raw, 'a'.repeat(64), SECRET)).toBe(false);
  });

  it('rejects a malformed signature instead of throwing', async () => {
    expect(await verifyRetellSignature(raw, 'not-a-signature', SECRET)).toBe(false);
  });

  it('rejects a missing signature', async () => {
    expect(await verifyRetellSignature(raw, undefined, SECRET)).toBe(false);
  });

  it('rejects a missing raw body', async () => {
    expect(await verifyRetellSignature(undefined, await signNow(), SECRET)).toBe(false);
  });

  it('rejects when no secret is configured', async () => {
    expect(await verifyRetellSignature(raw, await signNow(), undefined)).toBe(false);
  });
});

describe('requireRetellSignature', () => {
  const originalEnv = process.env.RETELL_WEBHOOK_SECRET;
  let req; let next;

  beforeEach(async () => {
    process.env.RETELL_WEBHOOK_SECRET = SECRET;
    next = vi.fn();
    const sig = await signNow();
    req = {
      rawBody: raw,
      path: '/post-call',
      log: { warn: vi.fn(), error: vi.fn() },
      get: vi.fn(() => sig),
    };
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.RETELL_WEBHOOK_SECRET;
    else process.env.RETELL_WEBHOOK_SECRET = originalEnv;
  });

  it('calls next with no error for a valid signature', async () => {
    await requireRetellSignature(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects an invalid signature with status 401', async () => {
    req.get = vi.fn(() => 'v=123,d=' + 'a'.repeat(64));
    await requireRetellSignature(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rejects with 503 when the secret is not configured', async () => {
    delete process.env.RETELL_WEBHOOK_SECRET;
    await requireRetellSignature(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(503);
  });

  it('rejects an unsigned request even outside production', async () => {
    process.env.NODE_ENV = 'development';
    req.get = vi.fn(() => undefined);
    await requireRetellSignature(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});
