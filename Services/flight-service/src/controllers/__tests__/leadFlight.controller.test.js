import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockFlightClient } from '../../clients/mock.client.js';
import { buildFlightOffer, buildBookingRequest, buildTraveler } from '../../../test/factories/flight.js';

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
  bookForLead,
  getByLead,
  getItineraryFlights,
  getOptionalFlights,
  linkToDay,
} = await import('../../controllers/leadFlight.controller.js');

const prisma = (await import('../../db/client.js')).default;

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

function buildBooking(overrides = {}) {
  return {
    id: 'bf-1',
    pnr: 'MOCK-ABC123',
    travelportOrderId: 'ord-1',
    createdById: 'agent-1',
    customerId: 'cust-1',
    tripType: 'oneWay',
    cabinClass: 'Economy',
    currency: 'USD',
    baseFare: 300,
    taxes: 50,
    totalAmount: 350,
    status: 'confirmed',
    searchSnapshot: {},
    leadId: null,
    packageId: null,
    dayNumber: null,
    flightType: 'itinerary',
    segments: [
      { sequence: 1, marketingCarrier: 'EK', flightNumber: 'EK501', origin: 'CMB', destination: 'DXB', departureAt: '2026-08-01T08:00:00Z', arrivalAt: '2026-08-01T12:00:00Z', durationMinutes: 240, stops: 0 },
    ],
    travelers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('bookForLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a flight booking with lead context fields', async () => {
    const req = mockReq({
      body: {
        offer: buildFlightOffer(),
        tripType: 'oneWay',
        travelers: [buildTraveler()],
        contact: { name: 'Test', email: 'test@test.com' },
        leadId: 'lead-123',
        dayNumber: 3,
        flightType: 'itinerary',
      },
    });
    const res = mockRes();

    prisma.$queryRaw.mockResolvedValue([{ id: 'cust-x', name: 'Test', email: 'test@test.com' }]);
    prisma.flightBooking.create.mockResolvedValue(buildBooking({ leadId: 'lead-123', dayNumber: 3 }));

    await bookForLead(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ leadId: 'lead-123', dayNumber: 3 }),
    }));
  });

  it('defaults flightType to itinerary when not provided', async () => {
    const req = mockReq({
      body: {
        offer: buildFlightOffer(),
        tripType: 'oneWay',
        travelers: [buildTraveler()],
        contact: { name: 'Test', email: 'test@test.com' },
        leadId: 'lead-456',
      },
    });
    const res = mockRes();

    prisma.$queryRaw.mockResolvedValue([{ id: 'cust-x', name: 'Test', email: 'test@test.com' }]);
    prisma.flightBooking.create.mockResolvedValue(buildBooking({ leadId: 'lead-456', flightType: 'itinerary' }));

    await bookForLead(req, res);

    expect(prisma.flightBooking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-456',
          flightType: 'itinerary',
        }),
      }),
    );
  });
});

describe('getByLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns flight bookings scoped to a lead', async () => {
    const req = mockReq({ params: { leadId: 'lead-123' } });
    const res = mockRes();

    prisma.flightBooking.findMany.mockResolvedValue([
      buildBooking({ leadId: 'lead-123', dayNumber: 1 }),
      buildBooking({ leadId: 'lead-123', dayNumber: 3, id: 'bf-2' }),
    ]);

    await getByLead(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({ leadId: 'lead-123' }),
      ]),
    }));
    expect(res.json.mock.calls[0][0].data.length).toBe(2);
  });
});

describe('getItineraryFlights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only itinerary-type flights for a lead', async () => {
    const req = mockReq({ params: { leadId: 'lead-123' } });
    const res = mockRes();

    prisma.flightBooking.findMany.mockResolvedValue([
      buildBooking({ leadId: 'lead-123', dayNumber: 1, flightType: 'itinerary' }),
    ]);

    await getItineraryFlights(req, res);

    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ leadId: 'lead-123', flightType: 'itinerary' }),
      }),
    );
  });
});

describe('getOptionalFlights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only optional-type flights for a lead', async () => {
    const req = mockReq({ params: { leadId: 'lead-123' } });
    const res = mockRes();

    prisma.flightBooking.findMany.mockResolvedValue([
      buildBooking({ leadId: 'lead-123', flightType: 'optional' }),
    ]);

    await getOptionalFlights(req, res);

    expect(prisma.flightBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ leadId: 'lead-123', flightType: 'optional' }),
      }),
    );
  });
});

describe('linkToDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links an existing booking to a lead and day', async () => {
    const req = mockReq({
      params: { id: 'bf-1' },
      body: { leadId: 'lead-789', dayNumber: 2, flightType: 'itinerary' },
    });
    const res = mockRes();

    prisma.flightBooking.findFirst.mockResolvedValue(buildBooking({ id: 'bf-1' }));
    prisma.flightBooking.update.mockResolvedValue(
      buildBooking({ id: 'bf-1', leadId: 'lead-789', dayNumber: 2 }),
    );

    await linkToDay(req, res);

    expect(prisma.flightBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-789',
          dayNumber: 2,
          flightType: 'itinerary',
        }),
      }),
    );
  });

  it('throws when booking does not exist', async () => {
    const req = mockReq({
      params: { id: 'missing-id' },
      body: { leadId: 'lead-789' },
    });
    const res = mockRes();

    prisma.flightBooking.findFirst.mockResolvedValue(null);

    await expect(linkToDay(req, res)).rejects.toThrow('Flight booking not found');
  });
});
