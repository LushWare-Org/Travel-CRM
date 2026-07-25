import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildFlightOffer, buildSearchRequest, buildBookingRequest, buildTraveler } from '../../../test/factories/flight.js';

// ── Module-level mocks ───────────────────────────────────────────────
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

const mockTravelport = {
  searchFlights: vi.fn(),
  priceOffer: vi.fn(),
  createOrder: vi.fn(),
  cancelOrder: vi.fn(),
  getOrder: vi.fn(),
};

vi.mock('../../services/travelport.service.js', () => mockTravelport);

// Must import controller AFTER mocks are hoisted
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
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// ── Tests ────────────────────────────────────────────────────────────
describe('search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return flight offers when search succeeds', async () => {
    const offers = [buildFlightOffer(), buildFlightOffer()];
    mockTravelport.searchFlights.mockResolvedValue(offers);

    const req = mockReq({ body: buildSearchRequest() });
    const res = mockRes();
    const next = vi.fn();

    await search(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: offers,
    });
    expect(mockTravelport.searchFlights).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'CMB',
        destination: 'DXB',
        departureDate: '2026-08-01',
        adults: 1,
      }),
    );
  });

  it('should default adults to 1, children/infants to 0', async () => {
    mockTravelport.searchFlights.mockResolvedValue([]);
    const req = mockReq({
      body: { origin: 'LHR', destination: 'JFK', departureDate: '2026-09-01' },
    });
    const res = mockRes();

    await search(req, res, vi.fn());

    expect(mockTravelport.searchFlights).toHaveBeenCalledWith(
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
    mockTravelport.priceOffer.mockResolvedValue({
      offerId: 'OFFER-1',
      revalidated: true,
      priceChanged: false,
    });

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

  const fakeUser = { id: 'cust-1', name: 'John', email: 'john@test.com', phone: null };

  it('should create a booking and return 201', async () => {
    // Mock customer lookup — returns null (new customer)
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$executeRaw.mockResolvedValue(undefined);
    // Mock travelport createOrder
    mockTravelport.createOrder.mockResolvedValue({
      pnr: 'ABC123',
      travelportOrderId: 'ORDER-1',
      status: 'confirmed',
      ticketingDeadline: '2026-08-02T00:00:00Z',
    });
    // Mock prisma flightBooking.create
    const fakeBooking = {
      id: 'booking-1',
      pnr: 'ABC123',
      status: 'confirmed',
      totalAmount: 260,
      segments: [{ sequence: 1, origin: 'CMB', destination: 'DXB' }],
      travelers: [{ type: 'adult', firstName: 'John', lastName: 'Doe' }],
    };
    prisma.flightBooking.create.mockResolvedValue(fakeBooking);

    const payload = buildBookingRequest();
    const req = mockReq({ body: payload });
    const res = mockRes();

    await book(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: fakeBooking,
    });
    expect(mockTravelport.createOrder).toHaveBeenCalledWith(
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
  it('should return bookings for admin', async () => {
    const fakeBookings = [
      { id: 'b1', pnr: 'PNR1', status: 'confirmed', segments: [], travelers: [] },
    ];
    prisma.flightBooking.findMany.mockResolvedValue(fakeBookings);

    const req = mockReq({ user: { id: 'admin-1', role: 'admin', isSuperAdmin: false } });
    const res = mockRes();

    await listBookings(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeBookings });
    // Admin sees all bookings (no createdById filter)
    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        include: { segments: true, travelers: true },
      }),
    );
  });

  it('should scope bookings to the sales rep', async () => {
    prisma.flightBooking.findMany.mockResolvedValue([]);

    const req = mockReq({ user: { id: 'rep-5', role: 'salesRep', isSuperAdmin: false } });
    const res = mockRes();

    await listBookings(req, res, vi.fn());

    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdById: 'rep-5' },
      }),
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
  it('should cancel and update the booking', async () => {
    const booking = {
      id: 'b1',
      pnr: 'PNR1',
      status: 'confirmed',
      travelportOrderId: 'ORDER-1',
    };
    prisma.flightBooking.findFirst.mockResolvedValue(booking);
    mockTravelport.cancelOrder.mockResolvedValue({ status: 'cancelled' });

    const updated = { ...booking, status: 'cancelled', cancelledAt: new Date().toISOString() };
    prisma.flightBooking.update.mockResolvedValue(updated);

    const req = mockReq({
      params: { id: 'b1' },
      body: { reason: 'Customer request' },
      user: { id: 'a', role: 'admin', isSuperAdmin: false },
    });
    const res = mockRes();

    await cancelBooking(req, res, vi.fn());

    expect(mockTravelport.cancelOrder).toHaveBeenCalledWith('ORDER-1');
    expect(prisma.flightBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({ status: 'cancelled' }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
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
    mockTravelport.createOrder.mockResolvedValue({
      pnr: 'PNR', travelportOrderId: 'ORD', status: 'confirmed',
      ticketingDeadline: '2026-08-02T00:00:00Z',
    });
    prisma.flightBooking.create.mockResolvedValue({
      id: 'b1', pnr: 'PNR', status: 'confirmed', segments: [], travelers: [],
    });

    const payload = buildBookingRequest({
      contact: { name: 'Existing User', email: 'EXISTING@test.com', phone: null },
    });
    const req = mockReq({ body: payload });
    const res = mockRes();

    await book(req, res, vi.fn());

    // Should find user, not create a new one
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should create customer when email not found', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$executeRaw.mockResolvedValue(undefined);
    mockTravelport.createOrder.mockResolvedValue({
      pnr: 'PNR', travelportOrderId: 'ORD', status: 'confirmed',
      ticketingDeadline: '2026-08-02T00:00:00Z',
    });
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
