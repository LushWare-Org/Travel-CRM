import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock('../../utils/cloudRunAuth.js', () => ({
  domainAuthHeader: vi.fn().mockResolvedValue({ Authorization: 'Bearer test-token' }),
}));

const { submitWebsiteBooking } = await import('../bookingRequest.js');

const PAYLOAD = {
  packageId: 'p-japan',
  email: 'ana@example.com',
  travelDate: '2027-03-14',
  travelers: 2,
};

const respondWith = (status, body = {}) => {
  fetchMock.mockResolvedValue({
    status,
    json: async () => body,
  });
};

beforeEach(() => {
  fetchMock.mockReset();
  // Stubbed per test, not once at module scope: the afterEach below restores
  // globals, so a module-scope stub would be gone by the second test and the
  // suite would quietly start calling the real network.
  vi.stubGlobal('fetch', fetchMock);
  process.env.BOOKING_SERVICE_URL = 'http://booking.test:3005';
});

afterEach(() => {
  delete process.env.BOOKING_SERVICE_URL;
  vi.unstubAllGlobals();
});

describe('submitWebsiteBooking', () => {
  it('posts the request to the booking service and returns the id it reports', async () => {
    respondWith(201, { success: true, data: { bookingId: 'bk-1', leadId: 'lead-1' } });

    const result = await submitWebsiteBooking(PAYLOAD);

    expect(result).toEqual({ ok: true, bookingId: 'bk-1' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://booking.test:3005/api/v1/bookings/website');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(PAYLOAD);
    expect(options.headers.Authorization).toBe('Bearer test-token');
    // A followed redirect would re-send the Authorization header to whatever
    // origin the target names.
    expect(options.redirect).toBe('error');
  });

  it('succeeds without an id, because the booking exists either way', async () => {
    respondWith(201, { success: true, data: {} });

    await expect(submitWebsiteBooking(PAYLOAD)).resolves.toEqual({ ok: true, bookingId: null });
  });

  it('separates a rejected payload from an unreachable service', async () => {
    // The distinction is the whole reason this does not reuse the GET helper:
    // one is the visitor's to fix, the other is not.
    respondWith(400, { message: 'A valid travelDate is required' });
    await expect(submitWebsiteBooking(PAYLOAD)).resolves.toEqual({ ok: false, reason: 'rejected' });

    respondWith(403);
    await expect(submitWebsiteBooking(PAYLOAD)).resolves.toEqual({ ok: false, reason: 'not_authorized' });

    respondWith(500);
    await expect(submitWebsiteBooking(PAYLOAD)).resolves.toEqual({ ok: false, reason: 'unavailable' });

    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(submitWebsiteBooking(PAYLOAD)).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('refuses a payload that does not match the contract without calling the service', async () => {
    // Our own refusal, logged as ours — not a 400 the visitor would be told was
    // their mistake.
    await expect(submitWebsiteBooking({ ...PAYLOAD, email: 'not-an-email' })).resolves.toEqual({
      ok: false,
      reason: 'rejected',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
