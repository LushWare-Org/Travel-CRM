import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../config/logger.js', () => ({ default: mockLogger }));

let submitLeadIntake;

const payload = {
  channel: 'chatbot',
  sessionId: 'session-1',
  contact: { email: 'traveler@example.com' },
  transcript: [{ id: 'm-1', role: 'user', content: 'I want Bali for 5 days', at: '2026-09-04T00:00:00.000Z' }],
};

beforeEach(async () => {
  vi.stubEnv('LEAD_SERVICE_URL', 'http://lead.internal:3004');
  vi.stubEnv('INTERNAL_EVENTS_TOKEN', 'internal-secret');
  vi.resetModules();
  ({ submitLeadIntake } = await import('../leadIntake.client.js'));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('submitLeadIntake', () => {
  it('POSTs the payload to the intake endpoint and returns { ok: true, ...lead } on a 2xx response', async () => {
    const fetchImpl = vi.fn(async (_url, _init) => ({
      ok: true,
      status: 200,
      json: async () => ({ leadId: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', created: true }),
    }));

    const result = await submitLeadIntake(payload, { fetchImpl });

    expect(result).toEqual({ ok: true, leadId: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', created: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://lead.internal:3004/api/v1/leads/internal/intake',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': 'internal-secret' },
        body: JSON.stringify(payload),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns { ok: false } without throwing on a non-2xx response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));

    const result = await submitLeadIntake(payload, { fetchImpl });

    expect(result).toEqual({ ok: false });
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('returns { ok: false } without throwing when the request times out', async () => {
    vi.useFakeTimers();
    const fetchImpl = (_url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted', 'AbortError')));
    });

    const assertion = submitLeadIntake(payload, { fetchImpl }).then((result) => {
      expect(result).toEqual({ ok: false });
    });

    await vi.advanceTimersByTimeAsync(2001);
    await assertion;
    vi.useRealTimers();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('returns { ok: false } on a network error without throwing', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('ECONNREFUSED'); });

    const result = await submitLeadIntake(payload, { fetchImpl });

    expect(result).toEqual({ ok: false });
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
