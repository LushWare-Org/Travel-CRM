import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger from '../../config/logger.js';

// ── Hoisted axios mock ───────────────────────────────────────────────
// One instance stands in for the authenticated GDS client (create), and a bare
// post stands in for the OAuth token exchange.
const { mockInstance, mockAxiosPost } = vi.hoisted(() => ({
  mockInstance: { post: vi.fn(), get: vi.fn() },
  mockAxiosPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockInstance),
    post: mockAxiosPost,
  },
}));

import { TravelportClient } from '../travelport.client.js';

// Travelport is a GDS: its errors carry operator-facing text and supplier
// vocabulary. None of that may reach a traveller, so every operation is checked
// for both the sentence shown and the text withheld.
describe('TravelportClient error sanitisation', () => {
  let client;

  const rawPayload = {
    Messages: [{ Text: 'GDS operator text: host unavailable for carrier' }],
    message: 'raw operator text',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TRAVELPORT_TOKEN_URL = 'https://token.test/oauth';
    process.env.TRAVELPORT_CLIENT_ID = 'cid';
    process.env.TRAVELPORT_CLIENT_SECRET = 'secret';
    process.env.TRAVELPORT_API_BASE_URL = 'https://api.travelport.test';
    mockAxiosPost.mockResolvedValue({ data: { access_token: 'tok', expires_in: 1800 } });
    client = new TravelportClient();
  });

  afterEach(() => {
    delete process.env.TRAVELPORT_TOKEN_URL;
    delete process.env.TRAVELPORT_CLIENT_ID;
    delete process.env.TRAVELPORT_CLIENT_SECRET;
    delete process.env.TRAVELPORT_API_BASE_URL;
    vi.restoreAllMocks();
  });

  const callFor = {
    search: () =>
      client.searchFlights({ origin: 'CMB', destination: 'DXB', departureDate: '2026-08-01' }),
    price: () => client.priceOffer('off_1'),
    book: () =>
      client.createOrder({
        offerId: 'off_1',
        travelers: [{ id: 't1' }],
        contact: { email: 'a@b.test' },
      }),
    retrieve: () => client.getOrder('tp-1'),
    cancel: () => client.cancelOrder('tp-1'),
  };

  async function failure(operation, status) {
    const err = Object.assign(new Error(`Request failed with status code ${status}`), {
      response: { status, data: rawPayload },
    });
    mockInstance.post.mockRejectedValue(err);
    mockInstance.get.mockRejectedValue(err);
    return callFor[operation]().catch((e) => e);
  }

  it('tells the user nothing about configuration when the provider is unset', async () => {
    delete process.env.TRAVELPORT_TOKEN_URL;

    const err = await callFor.search().catch((e) => e);

    expect(err.message).toBe('Flight search is temporarily unavailable. Please try again in a moment.');
    expect(err.message).not.toMatch(/TRAVELPORT_TOKEN_URL|CLIENT_ID|CLIENT_SECRET/);
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('PROVIDER_UNAVAILABLE');
  });

  it("does not surface the provider's OAuth error_description", async () => {
    mockAxiosPost.mockRejectedValue({
      response: { status: 401, data: { error_description: 'invalid_client: bad secret' } },
    });

    const err = await callFor.search().catch((e) => e);

    expect(err.message).toBe('Flight service is temporarily unavailable. Please try again in a moment.');
    expect(err.message).not.toMatch(/invalid_client|error_description/);
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('PROVIDER_UNAVAILABLE');
  });

  it.each([
    ['search', 422, 400, 'PROVIDER_REJECTED'],
    ['search', 503, 502, 'PROVIDER_UNAVAILABLE'],
    ['price', 404, 404, 'NOT_FOUND'],
    ['price', 500, 502, 'PROVIDER_UNAVAILABLE'],
    ['book', 400, 400, 'PROVIDER_REJECTED'],
    ['retrieve', 404, 404, 'NOT_FOUND'],
    ['retrieve', 500, 502, 'PROVIDER_UNAVAILABLE'],
    ['cancel', 409, 400, 'PROVIDER_REJECTED'],
  ])(
    '%s failing with provider status %i surfaces %i / %s',
    async (operation, providerStatus, statusCode, code) => {
      const err = await failure(operation, providerStatus);

      expect(err.statusCode).toBe(statusCode);
      expect(err.code).toBe(code);
      expect(err.message).not.toMatch(
        /Travelport|GDS operator text|raw operator text|Request failed with status code/,
      );
    },
  );

  it('maps a provider outage with no status to a retryable 502', async () => {
    mockInstance.post.mockRejectedValue(new Error('socket hang up'));
    mockInstance.get.mockRejectedValue(new Error('socket hang up'));

    const err = await callFor.search().catch((e) => e);

    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('PROVIDER_UNAVAILABLE');
    expect(err.message).not.toContain('socket hang up');
  });

  it('logs the GDS payload it refuses to show', async () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    await failure('search', 503);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'search', status: 503, data: rawPayload }),
      'Travelport API error details',
    );
    spy.mockRestore();
  });
});
