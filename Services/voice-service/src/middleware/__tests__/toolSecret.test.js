import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireToolSecret } from '../toolSecret.js';

const SECRET = 'shared-tool-secret';
const originalSecret = process.env.RETELL_TOOL_SECRET;
const originalFallback = process.env.RETELL_WEBHOOK_SECRET;

function req(secretHeader) {
  return { path: '/fn/search_packages', log: { warn: vi.fn(), error: vi.fn() }, get: () => secretHeader };
}

beforeEach(() => {
  process.env.RETELL_TOOL_SECRET = SECRET;
  delete process.env.RETELL_WEBHOOK_SECRET;
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.RETELL_TOOL_SECRET;
  else process.env.RETELL_TOOL_SECRET = originalSecret;
  if (originalFallback === undefined) delete process.env.RETELL_WEBHOOK_SECRET;
  else process.env.RETELL_WEBHOOK_SECRET = originalFallback;
});

describe('requireToolSecret', () => {
  it('calls next with no error when the header matches', () => {
    const next = vi.fn();
    requireToolSecret(req(SECRET), {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a missing header with 401', () => {
    const next = vi.fn();
    requireToolSecret(req(undefined), {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rejects a wrong secret with 401', () => {
    const next = vi.fn();
    requireToolSecret(req('wrong-secret'), {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rejects a secret of a different length without throwing', () => {
    const next = vi.fn();
    requireToolSecret(req('short'), {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('falls back to RETELL_WEBHOOK_SECRET when RETELL_TOOL_SECRET is unset', () => {
    delete process.env.RETELL_TOOL_SECRET;
    process.env.RETELL_WEBHOOK_SECRET = 'fallback-secret';
    const next = vi.fn();
    requireToolSecret(req('fallback-secret'), {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects with 503 when neither secret is configured', () => {
    delete process.env.RETELL_TOOL_SECRET;
    const next = vi.fn();
    requireToolSecret(req(SECRET), {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(503);
  });
});
