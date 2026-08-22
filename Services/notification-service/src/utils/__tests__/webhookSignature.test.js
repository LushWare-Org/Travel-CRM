import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature } from '../webhookSignature.js';

const APP_SECRET = 'test-app-secret';
const RAW_BODY = Buffer.from(JSON.stringify({ entry: [{ id: '1' }] }));

function sign(body, secret) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifyWebhookSignature', () => {
  it('accepts a signature computed over the exact raw body with the right secret', () => {
    expect(verifyWebhookSignature(sign(RAW_BODY, APP_SECRET), RAW_BODY, APP_SECRET)).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    expect(verifyWebhookSignature(sign(RAW_BODY, 'wrong-secret'), RAW_BODY, APP_SECRET)).toBe(false);
  });

  it('rejects a signature computed over a different body (catches JSON.stringify re-serialization drift)', () => {
    const otherBody = Buffer.from(JSON.stringify({ entry: [{ id: '2' }] }));
    expect(verifyWebhookSignature(sign(otherBody, APP_SECRET), RAW_BODY, APP_SECRET)).toBe(false);
  });

  it('returns false when the signature header is missing', () => {
    expect(verifyWebhookSignature(null, RAW_BODY, APP_SECRET)).toBe(false);
  });

  it('returns false when the raw body is missing', () => {
    expect(verifyWebhookSignature(sign(RAW_BODY, APP_SECRET), undefined, APP_SECRET)).toBe(false);
  });

  it('returns false without throwing when the signature has a different length than expected (timingSafeEqual guard)', () => {
    expect(verifyWebhookSignature('sha256=short', RAW_BODY, APP_SECRET)).toBe(false);
  });
});
