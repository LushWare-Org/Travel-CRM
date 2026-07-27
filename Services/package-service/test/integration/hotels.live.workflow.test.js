import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env for LITEAPI_API_KEY
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Use real LiteAPI client — requires LITEAPI_API_KEY in env
beforeAll(() => {
  if (!process.env.LITEAPI_API_KEY) throw new Error('SKIP_SUITE: LITEAPI_API_KEY not set');
  console.log(`[live-workflow] Using real LiteAPI.`);
});

const { default: app } = await import('../../src/app.js');

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    hotelBooking: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../src/db/client.js', () => ({ default: mockPrisma }));

const prisma = mockPrisma;

function auth(overrides = {}) {
  return {
    'x-user-id': overrides.id || 'agent-1',
    'x-user-role': overrides.role || 'admin',
    'x-user-permissions': '[]',
    'x-user-is-super-admin': String(overrides.isSuperAdmin ?? false),
  };
}

const searchPayload = (() => {
  const checkin = new Date(); checkin.setDate(checkin.getDate() + 30);
  const checkout = new Date(); checkout.setDate(checkout.getDate() + 33);
  return {
    city: 'Colombo',
    checkin: checkin.toISOString().split('T')[0],
    checkout: checkout.toISOString().split('T')[0],
    occupancies: [{ adults: 1 }],
    currency: 'USD',
    guestNationality: 'LK',
    limit: 5,
  };
})();

describe('Live Hotel Booking — full REST API workflow', () => {
  beforeAll(() => vi.clearAllMocks());
  afterAll(() => vi.clearAllMocks());

  it('should complete the full booking lifecycle through the API', async () => {
    // ── 1. Search ────────────────────────────────────────────────────
    const searchRes = await request(app)
      .post('/api/v1/hotels/search')
      .set(auth())
      .send(searchPayload);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.length).toBeGreaterThan(0);

    const hotel = searchRes.body.data[0];
    expect(hotel).toHaveProperty('hotelId');
    expect(hotel.cheapestRate).toHaveProperty('offerId');
    expect(hotel.cheapestRate.totalAmount).toBeGreaterThan(0);

    const { hotelId } = hotel;
    const { offerId } = hotel.cheapestRate;

    console.log(`[live-workflow] Found: ${hotel.name}, ${hotel.cheapestRate.currency} ${hotel.cheapestRate.totalAmount}`);

    // ── 2. Prebook ───────────────────────────────────────────────────
    const prebookRes = await request(app)
      .post('/api/v1/hotels/prebook')
      .set(auth())
      .send({ offerId });

    expect(prebookRes.status).toBe(200);
    expect(prebookRes.body.success).toBe(true);
    expect(prebookRes.body.data).toHaveProperty('prebookId');
    expect(prebookRes.body.data.status).toBe('valid');

    const { prebookId } = prebookRes.body.data;
    console.log(`[live-workflow] Prebook: ${prebookId}`);

    // ── 3. Book ──────────────────────────────────────────────────────
    const bookingRecord = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      liteapiBookingId: 'live-book',
      hotelId,
      hotelName: hotel.name,
      hotelAddress: hotel.address || null,
      hotelImage: hotel.images?.[0] || null,
      checkin: new Date(searchPayload.checkin),
      checkout: new Date(searchPayload.checkout),
      currency: hotel.cheapestRate.currency,
      totalAmount: hotel.cheapestRate.totalAmount,
      status: 'confirmed',
      createdById: 'agent-1',
      guestInfo: [{ firstName: 'Test', lastName: 'User', title: 'Mr' }],
      roomDetails: hotel.cheapestRate,
      searchSnapshot: hotel,
      cancellationReason: null,
      cancelledAt: null,
      leadId: null,
      packageId: null,
      customizedPackageId: null,
      dayNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.hotelBooking.create.mockResolvedValue(bookingRecord);

    const bookRes = await request(app)
      .post('/api/v1/hotels/book')
      .set(auth())
      .send({
        prebookId,
        guests: [{ firstName: 'Test', lastName: 'User', title: 'Mr' }],
        contact: { name: 'Test User', email: 'test@example.com' },
        offer: { hotelId: hotel.hotelId, name: hotel.name, checkin: searchPayload.checkin, checkout: searchPayload.checkout },
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    expect(bookRes.body.data.status).toBe('confirmed');
    expect(bookRes.body.data).toHaveProperty('liteapiBookingId');

    const bookingId = bookRes.body.data.id;
    const liteapiBookingId = bookRes.body.data.liteapiBookingId;
    console.log(`[live-workflow] Booked: ${bookingId}, LiteAPI: ${liteapiBookingId}`);

    // ── 4. Get booking by ID ─────────────────────────────────────────
    prisma.hotelBooking.findFirst.mockResolvedValue(bookingRecord);

    const getRes = await request(app)
      .get(`/api/v1/hotels/bookings/${bookingId}`)
      .set(auth());

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(bookingId);
    expect(getRes.body.data.status).toBe('confirmed');

    // ── 5. List bookings ─────────────────────────────────────────────
    prisma.hotelBooking.findMany.mockResolvedValue([bookingRecord]);

    const listRes = await request(app)
      .get('/api/v1/hotels/bookings')
      .set(auth());

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    // ── 6. Cancel ────────────────────────────────────────────────────
    const cancelledRecord = { ...bookingRecord, status: 'cancelled', cancelledAt: new Date() };
    prisma.hotelBooking.findFirst.mockResolvedValue({ ...bookingRecord, status: 'confirmed', liteapiBookingId });
    prisma.hotelBooking.update.mockResolvedValue(cancelledRecord);

    const cancelRes = await request(app)
      .post(`/api/v1/hotels/bookings/${bookingId}/cancel`)
      .set(auth())
      .send({ reason: 'live test cancellation' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');
    console.log(`[live-workflow] Cancelled: ${bookingId}`);

    // ── 7. Verify cancellation ───────────────────────────────────────
    prisma.hotelBooking.findFirst.mockResolvedValue(cancelledRecord);

    const verifyRes = await request(app)
      .get(`/api/v1/hotels/bookings/${bookingId}`)
      .set(auth());

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('cancelled');
  }, 60_000);

  it('should book with lead context through the API', async () => {
    // Do a real search + prebook, then book with lead context
    const searchRes = await request(app)
      .post('/api/v1/hotels/search')
      .set(auth())
      .send(searchPayload);

    if (searchRes.body.data.length === 0) return;
    const { offerId } = searchRes.body.data[searchRes.body.data.length - 1].cheapestRate;

    const prebookRes = await request(app)
      .post('/api/v1/hotels/prebook')
      .set(auth())
      .send({ offerId });
    expect(prebookRes.status).toBe(200);
    const { prebookId } = prebookRes.body.data;

    const leadId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const bookingRecord = {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      liteapiBookingId: 'live-book-ctx',
      hotelId: 'hotel-1',
      hotelName: 'Test Hotel',
      status: 'confirmed',
      totalAmount: 250,
      currency: 'USD',
      createdById: 'agent-1',
      guestInfo: [{ firstName: 'Test', lastName: 'User' }],
      leadId,
      dayNumber: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.hotelBooking.create.mockResolvedValue(bookingRecord);

    const res = await request(app)
      .post('/api/v1/hotels/book-with-context')
      .set(auth())
      .send({
        prebookId,
        guests: [{ firstName: 'Test', lastName: 'User' }],
        contact: { email: 'agent@test.com' },
        offer: searchRes.body.data[searchRes.body.data.length - 1],
        leadId,
        dayNumber: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.leadId).toBe(leadId);
    expect(res.body.data.dayNumber).toBe(2);
  }, 30_000);

  it('should return 400 for missing offerId in prebook', async () => {
    const res = await request(app)
      .post('/api/v1/hotels/prebook')
      .set(auth())
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 401 without auth for all booking endpoints', async () => {
    const endpoints = [
      { method: 'post', path: '/api/v1/hotels/search', body: searchPayload },
      { method: 'post', path: '/api/v1/hotels/prebook', body: { offerId: 'x' } },
      { method: 'post', path: '/api/v1/hotels/book', body: { prebookId: 'x', guests: [{ firstName: 'T', lastName: 'U' }], contact: { email: 't@t.com' } } },
      { method: 'get', path: '/api/v1/hotels/bookings' },
      { method: 'get', path: '/api/v1/hotels/bookings/a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      { method: 'post', path: '/api/v1/hotels/bookings/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cancel', body: {} },
    ];

    for (const { method, path, body } of endpoints) {
      const res = await request(app)[method](path).send(body || {});
      expect(res.status, `${method.toUpperCase()} ${path} should require auth`).toBe(401);
    }
  });
});
