import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetIdTokenClient = vi.fn();
vi.mock('google-auth-library', () => ({
  GoogleAuth: class {
    getIdTokenClient(...args) { return mockGetIdTokenClient(...args); }
  },
}));

const { domainAuthHeader } = await import('../cloudRunAuth.js');

// One distinct URL per test on purpose: the module caches a token client per
// base URL (minting one per call would be wasteful), so sharing a URL would
// make later tests observe the first test's client.
const LEAD = 'https://dev-lead-service-abc-el.a.run.app';
const BILLING = 'https://dev-billing-service-abc-el.a.run.app';
const USER = 'https://dev-user-service-abc-el.a.run.app';

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.K_SERVICE;
});

afterEach(() => {
  delete process.env.K_SERVICE;
});

describe('domainAuthHeader', () => {
  it('mints nothing off Cloud Run, so local runs never touch the metadata server', async () => {
    const headers = await domainAuthHeader('http://localhost:3004');

    expect(headers).toEqual({});
    expect(mockGetIdTokenClient).not.toHaveBeenCalled();
  });

  it('returns the Bearer token for the target service when running on Cloud Run', async () => {
    process.env.K_SERVICE = 'dev-voice-service';
    mockGetIdTokenClient.mockResolvedValue({
      getRequestHeaders: async () => ({ Authorization: 'Bearer test-token' }),
    });

    const headers = await domainAuthHeader(LEAD);

    expect(headers).toEqual({ Authorization: 'Bearer test-token' });
    expect(mockGetIdTokenClient).toHaveBeenCalledWith(LEAD);
  });

  it('reads the WHATWG Headers shape gaxios 7 returns, not just a plain object', async () => {
    // Index access on that object yields undefined, which undici serializes as the
    // literal string "undefined" — Cloud Run then rejects with "lacked OIDC
    // mandated 'Bearer' prefix", a 403 with no useful server-side error.
    process.env.K_SERVICE = 'dev-voice-service';
    mockGetIdTokenClient.mockResolvedValue({
      getRequestHeaders: async () => ({
        get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer whatwg-token' : null),
      }),
    });

    const headers = await domainAuthHeader(BILLING);

    expect(headers).toEqual({ Authorization: 'Bearer whatwg-token' });
  });

  it('fails loudly when no token can be minted rather than calling without one', async () => {
    process.env.K_SERVICE = 'dev-voice-service';
    mockGetIdTokenClient.mockResolvedValue({ getRequestHeaders: async () => ({}) });

    await expect(domainAuthHeader(USER)).rejects.toThrow(/Could not mint a Cloud Run ID token/);
  });
});
