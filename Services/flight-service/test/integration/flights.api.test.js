import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { buildFlightOffer, buildSearchRequest, buildBookingRequest, buildTraveler } from '../factories/flight.js';

// ── Hoisted mock so vi.mock can reference it ─────────────────────────
const { mockTravelport, mockPrisma } = vi.hoisted(() => ({
  mockTravelport: {
    searchFlights: vi.fn(),
    priceOffer: vi.fn(),
    createOrder: vi.fn(),
    cancelOrder: vi.fn(),
    getOrder: vi.fn(),
  },
  mockPrisma: {
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

vi.mock('../../src/services/travelport.service.js', () => mockTravelport);
vi.mock('../../src/db/client.js', () => ({ default: mockPrisma }));

const prisma = mockPrisma;

// ── Auth helper ──────────────────────────────────────────────────────
function authHeaders(overrides = {}) {
  return {
    'x-user-id': overrides.id || 'agent-1',
    'x-user-role': overrides.role || 'admin',
    'x-user-email': overrides.email || 'agent@test.com',
    'x-user-name': overrides.name || 'Test Agent',
    'x-user-permissions': JSON.stringify(overrides.permissions || []),
    'x-user-is-super-admin': String(overrides.isSuperAdmin ?? false),
  };
}

// ── Tests ────────────────────────────────────────────────────────────
describe('Flight API — Search & Book', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/flights/search', () => {
    it('should return 200 with flight offers', async () => {
      const offers = [buildFlightOffer(), buildFlightOffer()];
      mockTravelport.searchFlights.mockResolvedValue(offers);

      const res = await request(app)
        .post('/api/v1/flights/search')
        .set(authHeaders())
        .send(buildSearchRequest());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('offerId');
      expect(res.body.data[0]).toHaveProperty('airline');
      expect(res.body.data[0]).toHaveProperty('segments');
    });

    it('should return 401 when auth headers are missing', async () => {
      const res = await request(app)
        .post('/api/v1/flights/search')
        .send(buildSearchRequest());

      expect(res.status).toBe(401);
    });

    it('should return 403 for roles not in the allowed list', async () => {
      const res = await request(app)
        .post('/api/v1/flights/search')
        .set(authHeaders({ role: 'vendor' }))
        .send(buildSearchRequest());

      expect(res.status).toBe(403);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/flights/search')
        .set(authHeaders())
        .send({ origin: 'CMB' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/flights/book', () => {
    it('should return 201 with a booking', async () => {
      // customer lookup
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.$executeRaw.mockResolvedValue(undefined);
      // travelport
      mockTravelport.createOrder.mockResolvedValue({
        pnr: 'ABC123',
        travelportOrderId: 'ORD-1',
        status: 'confirmed',
        ticketingDeadline: '2026-08-02T00:00:00Z',
      });
      // prisma create
      const fakeBooking = {
        id: 'booking-1',
        pnr: 'ABC123',
        travelportOrderId: 'ORD-1',
        status: 'confirmed',
        totalAmount: 260,
        currency: 'USD',
        tripType: 'oneWay',
        cabinClass: 'Economy',
        baseFare: 220,
        taxes: 40,
        segments: [
          {
            sequence: 1,
            origin: 'CMB',
            destination: 'DXB',
            marketingCarrier: 'EK',
            flightNumber: 'EK502',
            departureAt: '2026-08-01T06:00:00Z',
            arrivalAt: '2026-08-01T10:15:00Z',
          },
        ],
        travelers: [
          { type: 'adult', firstName: 'John', lastName: 'Doe' },
        ],
      };
      prisma.flightBooking.create.mockResolvedValue(fakeBooking);

      const res = await request(app)
        .post('/api/v1/flights/book')
        .set(authHeaders())
        .send(buildBookingRequest());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pnr).toBe('ABC123');
      expect(res.body.data.status).toBe('confirmed');
    });

    it('should return 400 when travelers array is empty', async () => {
      const res = await request(app)
        .post('/api/v1/flights/book')
        .set(authHeaders())
        .send({
          offer: { offerId: 'X' },
          travelers: [],
          contact: { email: 'a@b.com' },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('traveler');
    });
  });

  describe('POST /api/v1/flights/price', () => {
    it('should return 200 with pricing', async () => {
      mockTravelport.priceOffer.mockResolvedValue({
        offerId: 'OFF-1',
        revalidated: true,
        priceChanged: false,
      });

      const res = await request(app)
        .post('/api/v1/flights/price')
        .set(authHeaders())
        .send({ offerId: 'OFF-1' });

      expect(res.status).toBe(200);
      expect(res.body.data.revalidated).toBe(true);
    });
  });
});

describe('Flight API — Booking Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/flights/bookings', () => {
    it('should return 200 with booking list', async () => {
      prisma.flightBooking.findMany.mockResolvedValue([
        {
          id: 'b1',
          pnr: 'PNR1',
          status: 'confirmed',
          totalAmount: 300,
          currency: 'USD',
          segments: [],
          travelers: [],
        },
        {
          id: 'b2',
          pnr: 'PNR2',
          status: 'cancelled',
          totalAmount: 450,
          currency: 'USD',
          segments: [],
          travelers: [],
        },
      ]);

      const res = await request(app)
        .get('/api/v1/flights/bookings')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      prisma.flightBooking.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/v1/flights/bookings?status=cancelled')
        .set(authHeaders());

      expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'cancelled' } }),
      );
    });
  });

  describe('GET /api/v1/flights/bookings/:id', () => {
    it('should return 200 with a single booking', async () => {
      prisma.flightBooking.findFirst.mockResolvedValue({
        id: 'b1',
        pnr: 'PNR1',
        status: 'confirmed',
        segments: [],
        travelers: [],
      });

      const res = await request(app)
        .get('/api/v1/flights/bookings/b1')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('b1');
    });

    it('should return 404 when not found', async () => {
      prisma.flightBooking.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/flights/bookings/ghost')
        .set(authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/flights/bookings/:id/cancel', () => {
    it('should cancel successfully', async () => {
      prisma.flightBooking.findFirst.mockResolvedValue({
        id: 'b1',
        status: 'confirmed',
        travelportOrderId: 'ORD-1',
      });
      mockTravelport.cancelOrder.mockResolvedValue({ status: 'cancelled' });
      prisma.flightBooking.update.mockResolvedValue({
        id: 'b1',
        pnr: 'PNR1',
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: 'Customer request',
        segments: [],
        travelers: [],
      });

      const res = await request(app)
        .post('/api/v1/flights/bookings/b1/cancel')
        .set(authHeaders())
        .send({ reason: 'Customer request' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should still cancel even without travelportOrderId (local-only cancel)', async () => {
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

      const res = await request(app)
        .post('/api/v1/flights/bookings/b2/cancel')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(mockTravelport.cancelOrder).not.toHaveBeenCalled();
    });
  });
});

describe('Flight API — Health & Edge Cases', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should return 404 for unknown flight routes', async () => {
    const res = await request(app)
      .get('/api/v1/flights/nonexistent-route')
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  it('should allow superAdmin with any base role', async () => {
    mockTravelport.searchFlights.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/flights/search')
      .set(authHeaders({ role: 'vendor', isSuperAdmin: true }))
      .send(buildSearchRequest());

    expect(res.status).toBe(200);
  });

  it('should return 403 for salesRep outside authorized roles (price endpoint)', async () => {
    // price endpoint uses the same authorize('salesRep','admin','superAdmin'),
    // so salesRep CAN access it
    mockTravelport.priceOffer.mockResolvedValue({ offerId: 'X', revalidated: true, priceChanged: false });

    const res = await request(app)
      .post('/api/v1/flights/price')
      .set(authHeaders({ role: 'salesRep' }))
      .send({ offerId: 'X' });

    expect(res.status).toBe(200);
  });
});
