import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockLeadFindUnique,
  mockLeadUpdate,
  mockPricingUpdate,
  mockIsItineraryPristine,
  mockReplaceLeadItineraryFromPackage,
} = vi.hoisted(() => ({
  mockLeadFindUnique: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockPricingUpdate: vi.fn(),
  mockIsItineraryPristine: vi.fn(),
  mockReplaceLeadItineraryFromPackage: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    lead: { findUnique: mockLeadFindUnique, update: mockLeadUpdate },
    leadPricing: { update: mockPricingUpdate },
  },
}));

vi.mock('../../services/lead-draft.service.js', () => ({
  copyPackageToLead: vi.fn(),
  isItineraryPristine: mockIsItineraryPristine,
  replaceLeadItineraryFromPackage: mockReplaceLeadItineraryFromPackage,
}));

import { updateLead } from '../lead.controller.js';

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
