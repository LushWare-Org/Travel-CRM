import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockFlightClient } from '../../clients/mock.client.js';
import { buildFlightOffer, buildSearchRequest, buildBookingRequest, buildTraveler } from '../../../test/factories/flight.js';

// ── Mock prisma (DB only — no travelport mocking needed!) ───────────
vi.mock('../../db/client.js', () => ({
  default: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    flightBooking: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const {
  search,
  price,
  book,
  listBookings,
  getBooking,
  cancelBooking,
} = await import('../../controllers/flight.controller.js');

const prisma = (await import('../../db/client.js')).default;

// ── Helpers ──────────────────────────────────────────────────────────
function mockReq(overrides = {}) {
  return {
    user: { id: 'agent-1', role: 'admin', isSuperAdmin: false },
    body: {},
    params: {},
    query: {},
    flightClient: new MockFlightClient(),
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function spyOnClient(req, method) {
  const spy = vi.spyOn(req.flightClient, method);
  return spy;
}

// ── Tests ────────────────────────────────────────────────────────────
describe('search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return flight offers when search succeeds', async () => {
    const req = mockReq({ body: buildSearchRequest() });
    const res = mockRes();
    const searchSpy = spyOnClient(req, 'searchFlights');

    await search(req, res, vi.fn());

    expect(res.json).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(res.json.mock.calls[0][0].data).toHaveLength(5);
    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'CMB',
        destination: 'DXB',
        departureDate: '2026-08-01',
        adults: 1,
      }),
    );
  });

  it('should default adults to 1, children/infants to 0', async () => {
    const req = mockReq({
      body: { origin: 'LHR', destination: 'JFK', departureDate: '2026-09-01' },
    });
    const res = mockRes();
    const searchSpy = spyOnClient(req, 'searchFlights');

    await search(req, res, vi.fn());

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ adults: 1, children: 0, infants: 0 }),
    );
  });

  it('should throw when origin is missing', async () => {
    const req = mockReq({
      body: { destination: 'DXB', departureDate: '2026-08-01' },
    });
    const next = vi.fn();

    await search(req, mockRes(), next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toContain('origin');
  });
});

describe('price', () => {
  it('should return pricing result', async () => {
    const req = mockReq({ body: { offerId: 'OFFER-1' } });
    const res = mockRes();

    await price(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { offerId: 'OFFER-1', revalidated: true, priceChanged: false },
    });
  });

  it('should throw when offerId is missing', async () => {
    const req = mockReq({ body: {} });
    const next = vi.fn();

    await price(req, mockRes(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });
});

describe('book', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a booking and return 201', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$executeRaw.mockResolvedValue(undefined);

    const fakeBooking = {
      id: 'booking-1',
      pnr: 'MOCKXXXX',
      status: 'confirmed',
      totalAmount: 260,
      segments: [{ sequence: 1, origin: 'CMB', destination: 'DXB' }],
      travelers: [{ type: 'adult', firstName: 'John', lastName: 'Doe' }],
    };
    prisma.flightBooking.create.mockResolvedValue(fakeBooking);

    const payload = buildBookingRequest();
    const req = mockReq({ body: payload });
    const res = mockRes();
    const createOrderSpy = spyOnClient(req, 'createOrder');

    await book(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: fakeBooking,
    });
    expect(createOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: payload.offer.offerId,
        travelers: payload.travelers,
        contact: payload.contact,
      }),
    );
  });

  it('should throw when no travelers are provided', async () => {
    const req = mockReq({
      body: { offer: { offerId: 'X' }, travelers: [], contact: { email: 'a@b.com' } },
    });
    const next = vi.fn();

    await book(req, mockRes(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toContain('traveler');
  });

  it('should throw when contact email is missing', async () => {
    const req = mockReq({
      body: {
        offer: { offerId: 'X' },
        travelers: [buildTraveler()],
        contact: { name: 'John' },
      },
    });
    const next = vi.fn();

    await book(req, mockRes(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toContain('email');
  });
});

describe('listBookings', () => {
  it('should return bookings for admin (no scoping)', async () => {
    const fakeBookings = [
      { id: 'b1', pnr: 'PNR1', status: 'confirmed', segments: [], travelers: [] },
    ];
    prisma.flightBooking.findMany.mockResolvedValue(fakeBookings);

    const req = mockReq({ user: { id: 'admin-1', role: 'admin', isSuperAdmin: false } });
    const res = mockRes();

    await listBookings(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeBookings });
    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('should scope bookings to the sales rep', async () => {
    prisma.flightBooking.findMany.mockResolvedValue([]);

    const req = mockReq({ user: { id: 'rep-5', role: 'salesRep', isSuperAdmin: false } });
    const res = mockRes();

    await listBookings(req, res, vi.fn());

    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: 'rep-5' } }),
    );
  });

  it('should not scope bookings for superAdmin even with salesRep role', async () => {
    prisma.flightBooking.findMany.mockResolvedValue([]);

    const req = mockReq({ user: { id: 'sa-1', role: 'salesRep', isSuperAdmin: true } });
    const res = mockRes();

    await listBookings(req, res, vi.fn());

    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('should filter by status when provided', async () => {
    prisma.flightBooking.findMany.mockResolvedValue([]);
    const req = mockReq({
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
      query: { status: 'cancelled' },
    });
    const res = mockRes();

    await listBookings(req, res, vi.fn());

    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'cancelled' } }),
    );
  });
});

describe('getBooking', () => {
  it('should return a booking by ID', async () => {
    const fakeBooking = { id: 'b1', pnr: 'PNR1', segments: [], travelers: [] };
    prisma.flightBooking.findFirst.mockResolvedValue(fakeBooking);

    const req = mockReq({
      params: { id: 'b1' },
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
    });
    const res = mockRes();

    await getBooking(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeBooking });
  });

  it('should throw 404 when booking not found', async () => {
    prisma.flightBooking.findFirst.mockResolvedValue(null);

    const req = mockReq({
      params: { id: 'nonexistent' },
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
    });
    const next = vi.fn();

    await getBooking(req, mockRes(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});

describe('cancelBooking', () => {
  it('should cancel via the flight client and update the booking', async () => {
    const booking = {
      id: 'b1',
      pnr: 'PNR1',
      status: 'confirmed',
      travelportOrderId: 'ORDER-1',
    };
    prisma.flightBooking.findFirst.mockResolvedValue(booking);

    const updated = { ...booking, status: 'cancelled', cancelledAt: new Date().toISOString() };
    prisma.flightBooking.update.mockResolvedValue(updated);

    const req = mockReq({
      params: { id: 'b1' },
      body: { reason: 'Customer request' },
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
    });
    const res = mockRes();
    const cancelSpy = spyOnClient(req, 'cancelOrder');

    await cancelBooking(req, res, vi.fn());

    expect(cancelSpy).toHaveBeenCalledWith('ORDER-1');
    expect(prisma.flightBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({ status: 'cancelled' }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('should cancel locally when no travelportOrderId', async () => {
    prisma.flightBooking.findFirst.mockResolvedValue({
      id: 'b2',
      status: 'pending',
      travelportOrderId: null,
    });
    prisma.flightBooking.update.mockResolvedValue({
      id: 'b2',
      status: 'cancelled',
      segments: [],
      travelers: [],
    });

    const req = mockReq({
      params: { id: 'b2' },
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
    });
    const res = mockRes();
    const cancelSpy = spyOnClient(req, 'cancelOrder');

    await cancelBooking(req, res, vi.fn());

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(cancelSpy).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('should throw 400 when booking is already cancelled', async () => {
    prisma.flightBooking.findFirst.mockResolvedValue({
      id: 'b1',
      status: 'cancelled',
    });

    const req = mockReq({
      params: { id: 'b1' },
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
    });
    const next = vi.fn();

    await cancelBooking(req, mockRes(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toContain('already cancelled');
  });

  it('should throw 404 when booking not found', async () => {
    prisma.flightBooking.findFirst.mockResolvedValue(null);

    const req = mockReq({
      params: { id: 'ghost' },
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
    });
    const next = vi.fn();

    await cancelBooking(req, mockRes(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});

describe('book — customer find-or-create logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find existing customer by email and reuse it', async () => {
    const user = { id: 'u1', name: 'Existing User', email: 'existing@test.com', phone: null };
    prisma.$queryRaw.mockResolvedValue([user]);
    prisma.$executeRaw.mockResolvedValue(undefined);
    prisma.flightBooking.create.mockResolvedValue({
      id: 'b1', pnr: 'PNR', status: 'confirmed', segments: [], travelers: [],
    });

    const payload = buildBookingRequest({
      contact: { name: 'Existing User', email: 'EXISTING@test.com', phone: null },
    });
    const req = mockReq({ body: payload });
    const res = mockRes();

    await book(req, res, vi.fn());

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should create customer when email not found', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$executeRaw.mockResolvedValue(undefined);
    prisma.flightBooking.create.mockResolvedValue({
      id: 'b1', pnr: 'PNR', status: 'confirmed', segments: [], travelers: [],
    });

    const payload = buildBookingRequest({
      contact: { name: 'New User', email: 'new@test.com', phone: null },
    });
    const req = mockReq({ body: payload });
    const res = mockRes();

    await book(req, res, vi.fn());

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
