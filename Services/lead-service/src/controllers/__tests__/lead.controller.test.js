import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockLeadFindUnique,
  mockLeadUpdate,
  mockLeadCreate,
  mockSettingsFindFirst,
  mockPricingUpdate,
  mockIsItineraryPristine,
  mockReplaceLeadItineraryFromPackage,
  mockCopyPackageToLead,
  mockOptionalFlightCreate,
  mockOptionalFlightFindMany,
  mockOptionalFlightFindUnique,
  mockOptionalFlightDelete,
  mockCostLineCreate,
  mockCostLineDeleteMany,
  mockTransaction,
} = vi.hoisted(() => ({
  mockLeadFindUnique: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockLeadCreate: vi.fn(),
  mockSettingsFindFirst: vi.fn(),
  mockPricingUpdate: vi.fn(),
  mockIsItineraryPristine: vi.fn(),
  mockReplaceLeadItineraryFromPackage: vi.fn(),
  mockCopyPackageToLead: vi.fn(),
  mockOptionalFlightCreate: vi.fn(),
  mockOptionalFlightFindMany: vi.fn(),
  mockOptionalFlightFindUnique: vi.fn(),
  mockOptionalFlightDelete: vi.fn(),
  mockCostLineCreate: vi.fn(),
  mockCostLineDeleteMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    lead: { findUnique: mockLeadFindUnique, update: mockLeadUpdate, create: mockLeadCreate },
    settings: { findFirst: mockSettingsFindFirst },
    leadPricing: { update: mockPricingUpdate },
    leadOptionalFlight: {
      create: mockOptionalFlightCreate,
      findMany: mockOptionalFlightFindMany,
      findUnique: mockOptionalFlightFindUnique,
      delete: mockOptionalFlightDelete,
    },
    leadCostLine: { create: mockCostLineCreate, deleteMany: mockCostLineDeleteMany },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../services/lead-draft.service.js', () => ({
  copyPackageToLead: mockCopyPackageToLead,
  isItineraryPristine: mockIsItineraryPristine,
  replaceLeadItineraryFromPackage: mockReplaceLeadItineraryFromPackage,
}));

import { updateLead, createLead, draftLead, addOptionalFlight, listOptionalFlights, deleteOptionalFlight } from '../lead.controller.js';

const PKG_A = '11111111-1111-1111-1111-111111111111';
const PKG_B = '22222222-2222-2222-2222-222222222222';

const leadFixture = (overrides = {}) => ({
  id: 'lead-1',
  packageId: PKG_A,
  sourcePackageId: PKG_A,
  packageName: 'Original Package',
  lifecycleStatus: 'DRAFTING',
  numberOfTravelers: 2,
  travelDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-10'),
  assignedToId: 'user-1',
  lostReason: null,
  pricing: { id: 'pricing-1', marginType: null, marginValue: 0 },
  costLines: [],
  _count: { itineraryDays: 1 },
  ...overrides,
});

const adminUser = { id: 'user-1', role: 'admin', isSuperAdmin: false, permissions: ['manage_leads'] };

function buildReqRes({ leadId = 'lead-1', body = {}, user = adminUser } = {}) {
  const req = { params: { id: leadId }, body, user };
  const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
  const next = vi.fn();
  return { req, res, next };
}

describe('updateLead — package switching', () => {
  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockLeadUpdate.mockReset();
    mockPricingUpdate.mockReset();
    mockIsItineraryPristine.mockReset();
    mockReplaceLeadItineraryFromPackage.mockReset();

    mockLeadUpdate.mockResolvedValue(leadFixture({ packageId: PKG_B }));
    mockPricingUpdate.mockResolvedValue({});
    mockReplaceLeadItineraryFromPackage.mockResolvedValue({ id: 'lead-1' });
  });

  it('replaces the itinerary when switching packages on a pristine DRAFTING lead', async () => {
    const lead = leadFixture();
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(true);

    const { req, res, next } = buildReqRes({
      body: { packageId: PKG_B, packageName: 'New Package', pricing: { marginType: null, marginValue: 0 } },
    });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockIsItineraryPristine).toHaveBeenCalledWith(lead);
    expect(mockReplaceLeadItineraryFromPackage).toHaveBeenCalledWith({ leadId: 'lead-1', packageId: PKG_B });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('does not replace the itinerary when it was manually customized', async () => {
    const lead = leadFixture({ sourcePackageId: null });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(false);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).not.toHaveBeenCalled();
    // Package reference still updates as a plain scalar field.
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ packageId: PKG_B }),
    }));
  });

  it('populates the itinerary from the package when the lead has none yet, even without a matching sourcePackageId', async () => {
    const lead = leadFixture({ packageId: null, sourcePackageId: null, _count: { itineraryDays: 0 } });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(false);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_A } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).toHaveBeenCalledWith({ leadId: 'lead-1', packageId: PKG_A });
  });

  it('does not populate the itinerary from an empty lead when the packageId is unchanged', async () => {
    const lead = leadFixture({ packageId: PKG_A, sourcePackageId: null, _count: { itineraryDays: 0 } });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(false);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_A } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).not.toHaveBeenCalled();
  });

  it('does not call isItineraryPristine or replace when packageId is unchanged', async () => {
    const lead = leadFixture();
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_A, name: 'Renamed' } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockIsItineraryPristine).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).not.toHaveBeenCalled();
  });

  it('recomputes pricing after a pristine swap even without an explicit pricing payload', async () => {
    const lead = leadFixture();
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(true);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).toHaveBeenCalled();
    expect(mockPricingUpdate).toHaveBeenCalled();
  });

  it('rejects a package change once the lead is QUOTED', async () => {
    const lead = leadFixture({ lifecycleStatus: 'QUOTED' });
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B } });

    await updateLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/package/i) }));
    expect(mockReplaceLeadItineraryFromPackage).not.toHaveBeenCalled();
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('rejects a package change while in REVISION — must move back to DRAFTING first', async () => {
    const lead = leadFixture({ lifecycleStatus: 'REVISION' });
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B } });

    await updateLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/package/i) }));
  });

  it('rejects travel date changes once quoted', async () => {
    const lead = leadFixture({ lifecycleStatus: 'QUOTED' });
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes({ body: { travelDate: '2026-03-01' } });

    await updateLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/travel dates/i) }));
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('does not replace the itinerary when the lead is flagged isManualItinerary, even if pristine', async () => {
    const lead = leadFixture({ isManualItinerary: true });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(true);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).not.toHaveBeenCalled();
    // A manual lead never actually gets a package reference — the invariant
    // guard forces it back to null regardless of what was sent.
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ packageId: null, packageName: null }),
    }));
  });

  it('does not replace the itinerary when the lead has no days yet but is flagged isManualItinerary', async () => {
    const lead = leadFixture({ isManualItinerary: true, _count: { itineraryDays: 0 } });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(false);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).not.toHaveBeenCalled();
  });

  it('skips the replace when isManualItinerary is flipped to true in the same request as a package switch', async () => {
    const lead = leadFixture({ isManualItinerary: false });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(true);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B, isManualItinerary: true } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).not.toHaveBeenCalled();
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ packageId: null, packageName: null, isManualItinerary: true }),
    }));
  });

  it('still replaces the itinerary when isManualItinerary is explicitly false on a pristine switch', async () => {
    const lead = leadFixture({ isManualItinerary: true });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(true);

    const { req, res, next } = buildReqRes({ body: { packageId: PKG_B, isManualItinerary: false } });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReplaceLeadItineraryFromPackage).toHaveBeenCalledWith({ leadId: 'lead-1', packageId: PKG_B });
  });

  it('forces packageId/packageName to null when isManualItinerary is sent true, even alongside a packageId switch', async () => {
    const lead = leadFixture({ isManualItinerary: false });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(true);

    const { req, res, next } = buildReqRes({
      body: { packageId: PKG_B, packageName: 'New Package', isManualItinerary: true },
    });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isManualItinerary: true, packageId: null, packageName: null }),
    }));
  });

  it('allows package + date changes while DRAFTING', async () => {
    const lead = leadFixture({ lifecycleStatus: 'DRAFTING' });
    mockLeadFindUnique.mockResolvedValue(lead);
    mockIsItineraryPristine.mockReturnValue(false);

    const { req, res, next } = buildReqRes({
      body: { packageId: PKG_B, travelDate: '2026-03-01', endDate: '2026-03-10' },
    });

    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('createLead — isManualItinerary', () => {
  beforeEach(() => {
    mockLeadCreate.mockReset();
    mockSettingsFindFirst.mockReset().mockResolvedValue(null);
  });

  it('persists isManualItinerary: true from the request body', async () => {
    mockLeadCreate.mockResolvedValue(leadFixture({ isManualItinerary: true }));

    const { req, res, next } = buildReqRes({
      body: { name: 'Jane Doe', isManualItinerary: true },
    });

    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isManualItinerary: true }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('defaults isManualItinerary to false when omitted', async () => {
    mockLeadCreate.mockResolvedValue(leadFixture({ isManualItinerary: false }));

    const { req, res, next } = buildReqRes({ body: { name: 'Jane Doe' } });

    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isManualItinerary: false }),
    }));
  });

  it('forces packageId/packageName to null when isManualItinerary is true, even if a packageId was also sent', async () => {
    mockLeadCreate.mockResolvedValue(leadFixture({ isManualItinerary: true, packageId: null }));

    const { req, res, next } = buildReqRes({
      body: { name: 'Jane Doe', isManualItinerary: true, packageId: PKG_A, packageName: 'Sri Lanka Explorer' },
    });

    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isManualItinerary: true, packageId: null, packageName: null }),
    }));
  });

  it('keeps the sent packageId/packageName when isManualItinerary is false', async () => {
    mockLeadCreate.mockResolvedValue(leadFixture({ isManualItinerary: false, packageId: PKG_A }));

    const { req, res, next } = buildReqRes({
      body: { name: 'Jane Doe', packageId: PKG_A, packageName: 'Sri Lanka Explorer' },
    });

    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ packageId: PKG_A, packageName: 'Sri Lanka Explorer' }),
    }));
  });
});

describe('draftLead — isManualItinerary', () => {
  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockLeadUpdate.mockReset();
    mockCopyPackageToLead.mockReset().mockResolvedValue({});
    mockLeadUpdate.mockResolvedValue(leadFixture({ lifecycleStatus: 'DRAFTING' }));
  });

  it('copies the package blueprint when the lead is not flagged manual', async () => {
    const lead = leadFixture({ lifecycleStatus: 'NEW', isManualItinerary: false, costLines: [] });
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes();

    await draftLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCopyPackageToLead).toHaveBeenCalledWith({ leadId: 'lead-1', packageId: PKG_A });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('skips copying the package blueprint when the lead is flagged manual', async () => {
    const lead = leadFixture({ lifecycleStatus: 'NEW', isManualItinerary: true, costLines: [] });
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes();

    await draftLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCopyPackageToLead).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('does not throw for a manual lead with no packageId at all', async () => {
    const lead = leadFixture({ lifecycleStatus: 'NEW', isManualItinerary: true, packageId: null, sourcePackageId: null, costLines: [] });
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes();

    await draftLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCopyPackageToLead).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('still rejects a non-manual lead with no packageId', async () => {
    const lead = leadFixture({ lifecycleStatus: 'NEW', isManualItinerary: false, packageId: null, sourcePackageId: null, costLines: [] });
    mockLeadFindUnique.mockResolvedValue(lead);

    const { req, res, next } = buildReqRes();

    await draftLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/no package selected/i) }));
    expect(mockCopyPackageToLead).not.toHaveBeenCalled();
  });
});

describe('addOptionalFlight', () => {
  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockOptionalFlightCreate.mockReset();
    mockCostLineCreate.mockReset();
    mockPricingUpdate.mockReset();

    mockLeadFindUnique.mockResolvedValue(leadFixture({ costLines: [] }));
    mockCostLineCreate.mockResolvedValue({});
    mockPricingUpdate.mockResolvedValue({});
  });

  it('rejects a body with no flightType', async () => {
    const { req, res, next } = buildReqRes({ body: { origin: 'CMB', destination: 'DXB' } });

    await addOptionalFlight(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/flightType/i) }));
    expect(mockOptionalFlightCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown flightType', async () => {
    const { req, res, next } = buildReqRes({ body: { flightType: 'SIDEWAYS' } });

    await addOptionalFlight(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockOptionalFlightCreate).not.toHaveBeenCalled();
  });

  it('persists cabinClass, departureTime and airlinePreference alongside origin/destination', async () => {
    mockOptionalFlightCreate.mockResolvedValue({ id: 'flight-1', flightType: 'TO_START' });

    const { req, res, next } = buildReqRes({
      body: {
        flightType: 'TO_START',
        origin: 'CMB',
        destination: 'DXB',
        cabinClass: 'Business',
        departureTime: 'morning',
        airlinePreference: 'EK',
      },
    });

    await addOptionalFlight(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockOptionalFlightCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        flightType: 'TO_START',
        origin: 'CMB',
        destination: 'DXB',
        cabinClass: 'Business',
        departureTime: 'morning',
        airlinePreference: 'EK',
      }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('defaults cabinClass/departureTime/airlinePreference to null when omitted', async () => {
    mockOptionalFlightCreate.mockResolvedValue({ id: 'flight-1', flightType: 'RETURN_HOME' });

    const { req, res, next } = buildReqRes({ body: { flightType: 'RETURN_HOME' } });

    await addOptionalFlight(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockOptionalFlightCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        cabinClass: null,
        departureTime: null,
        airlinePreference: null,
      }),
    }));
  });

  it('creates a linked MANUAL cost line and recomputes pricing', async () => {
    mockOptionalFlightCreate.mockResolvedValue({ id: 'flight-1', flightType: 'TO_START' });

    const { req, res, next } = buildReqRes({ body: { flightType: 'TO_START', origin: 'CMB', destination: 'DXB' } });

    await addOptionalFlight(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCostLineCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source: 'MANUAL', optionalFlightId: 'flight-1', category: 'transportation' }),
    }));
    expect(mockPricingUpdate).toHaveBeenCalled();
  });
});

describe('listOptionalFlights', () => {
  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockOptionalFlightFindMany.mockReset();
  });

  it('returns flights for the lead ordered by createdAt', async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1' });
    mockOptionalFlightFindMany.mockResolvedValue([{ id: 'flight-1' }, { id: 'flight-2' }]);

    const { req, res, next } = buildReqRes();

    await listOptionalFlights(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockOptionalFlightFindMany).toHaveBeenCalledWith({
      where: { leadId: 'lead-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'flight-1' }, { id: 'flight-2' }] });
  });

  it('404s when the lead does not exist', async () => {
    mockLeadFindUnique.mockResolvedValue(null);

    const { req, res, next } = buildReqRes();

    await listOptionalFlights(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/not found/i) }));
  });
});

describe('deleteOptionalFlight', () => {
  beforeEach(() => {
    mockOptionalFlightFindUnique.mockReset();
    mockTransaction.mockReset().mockResolvedValue([]);
    mockCostLineDeleteMany.mockReset();
    mockOptionalFlightDelete.mockReset();
    mockLeadFindUnique.mockReset().mockResolvedValue(leadFixture({ costLines: [] }));
    mockPricingUpdate.mockReset().mockResolvedValue({});
  });

  it('removes the linked cost line and the flight, then recomputes pricing', async () => {
    mockOptionalFlightFindUnique.mockResolvedValue({ id: 'flight-1', leadId: 'lead-1' });

    const { req, res, next } = buildReqRes({ leadId: 'lead-1' });
    req.params.flightId = 'flight-1';

    await deleteOptionalFlight(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockPricingUpdate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });

  it('404s when the flight does not belong to this lead', async () => {
    mockOptionalFlightFindUnique.mockResolvedValue({ id: 'flight-1', leadId: 'some-other-lead' });

    const { req, res, next } = buildReqRes({ leadId: 'lead-1' });
    req.params.flightId = 'flight-1';

    await deleteOptionalFlight(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/not found/i) }));
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('404s when the flight does not exist at all', async () => {
    mockOptionalFlightFindUnique.mockResolvedValue(null);

    const { req, res, next } = buildReqRes({ leadId: 'lead-1' });
    req.params.flightId = 'nope';

    await deleteOptionalFlight(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/not found/i) }));
  });
});
