import crypto from 'crypto';

/**
 * Verifies Meta's `X-Hub-Signature-256` header (HMAC-SHA256 over the raw
 * request body) with a constant-time comparison. Shared by every Meta
 * webhook in this service (Facebook Lead Ads, WhatsApp Cloud API) so there's
 * one place that gets the crypto right.
 */
export function verifyWebhookSignature(signature, rawBody, appSecret) {
  if (!signature || !rawBody || !appSecret) return false;

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
