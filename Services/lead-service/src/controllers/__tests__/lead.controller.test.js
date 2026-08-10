import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockLeadFindUnique,
  mockLeadUpdate,
  mockLeadCreate,
  mockSettingsFindFirst,
  mockSelectionCount,
  mockTransaction,
  mockGatekeeperInputs,
  mockLoadPrimarySelection,
} = vi.hoisted(() => ({
  mockLeadFindUnique: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockLeadCreate: vi.fn(),
  mockSettingsFindFirst: vi.fn(),
  mockSelectionCount: vi.fn(),
  mockTransaction: vi.fn(),
  mockGatekeeperInputs: vi.fn(),
  mockLoadPrimarySelection: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    lead: { findUnique: mockLeadFindUnique, update: mockLeadUpdate, create: mockLeadCreate },
    settings: { findFirst: mockSettingsFindFirst },
    leadPackageSelection: { count: mockSelectionCount },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../services/gatekeeper.service.js', () => ({
  gatekeeperInputs: mockGatekeeperInputs,
  loadPrimarySelection: mockLoadPrimarySelection,
}));

import { updateLead, createLead, draftLead } from '../lead.controller.js';

const PKG_A = '11111111-1111-1111-1111-111111111111';

const leadFixture = (overrides = {}) => ({
  id: 'lead-1',
  lifecycleStatus: 'DRAFTING',
  numberOfTravelers: 2,
  travelDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-10'),
  assignedToId: 'user-1',
  lostReason: null,
  primarySelectionId: 'sel-1',
  ...overrides,
});

const adminUser = { id: 'user-1', role: 'admin', isSuperAdmin: false, permissions: ['manage_leads'] };

function buildReqRes({ leadId = 'lead-1', body = {}, user = adminUser } = {}) {
  const req = { params: { id: leadId }, body, user };
  const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
  const next = vi.fn();
  return { req, res, next };
}

describe('createLead — initial package selection', () => {
  beforeEach(() => {
    mockLeadCreate.mockReset();
    mockLeadUpdate.mockReset();
    mockLeadFindUnique.mockReset();
    mockSettingsFindFirst.mockReset().mockResolvedValue(null);
    mockTransaction.mockReset().mockImplementation(async (fn) => fn({
      lead: { create: mockLeadCreate, update: mockLeadUpdate, findUnique: mockLeadFindUnique },
    }));
  });

  it('creates a real-package selection and points primarySelectionId at it', async () => {
    mockLeadCreate.mockResolvedValue({ id: 'lead-1', packageSelections: [{ id: 'sel-1', packageId: PKG_A }] });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', packageSelections: [{ id: 'sel-1', packageId: PKG_A }] });

    const { req, res, next } = buildReqRes({ body: { name: 'Jane Doe', packageId: PKG_A, packageName: 'Pkg A' } });
    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        packageSelections: { create: [{ isManual: false, packageId: PKG_A, packageName: 'Pkg A' }] },
      }),
    }));
    expect(mockLeadUpdate).toHaveBeenCalledWith({ where: { id: 'lead-1' }, data: { primarySelectionId: 'sel-1' } });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('creates a manual selection and ignores any packageId sent alongside it', async () => {
    mockLeadCreate.mockResolvedValue({ id: 'lead-1', packageSelections: [{ id: 'sel-1', isManual: true }] });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', packageSelections: [{ id: 'sel-1', isManual: true }] });

    const { req, res, next } = buildReqRes({
      body: { name: 'Jane Doe', isManualItinerary: true, packageId: PKG_A, packageName: 'Pkg A' },
    });
    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        packageSelections: { create: [{ isManual: true, packageId: null, packageName: null }] },
      }),
    }));
  });

  it('creates a lead with no package selection when neither packageId nor isManualItinerary is given', async () => {
    mockLeadCreate.mockResolvedValue({ id: 'lead-1', packageSelections: [] });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', packageSelections: [] });

    const { req, res, next } = buildReqRes({ body: { name: 'Jane Doe' } });
    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const createCall = mockLeadCreate.mock.calls[0][0];
    expect(createCall.data.packageSelections).toBeUndefined();
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });
});

describe('updateLead — lifecycle transitions', () => {
  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockLeadUpdate.mockReset();
    mockGatekeeperInputs.mockReset().mockReturnValue({
      sellSubtotal: 0, verifiedPaymentTotal: 0, depositAmount: 0, flightActualTotal: 0, hotelActualTotal: 0,
    });
    mockLoadPrimarySelection.mockReset().mockResolvedValue({ pricing: {}, costLines: [] });
    mockLeadUpdate.mockResolvedValue(leadFixture());
  });

  it('rejects setting lifecycleStatus to QUOTED directly — must use the per-selection quote endpoint', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'DRAFTING' }));

    const { req, res, next } = buildReqRes({ body: { lifecycleStatus: 'QUOTED' } });
    await updateLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/packages\/:selectionId\/quote/) }));
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('allows a lead-level transition to CLOSED_LOST with a reason', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'DRAFTING' }));

    const { req, res, next } = buildReqRes({ body: { lifecycleStatus: 'CLOSED_LOST', lostReason: 'Budget' } });
    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lifecycleStatus: 'CLOSED_LOST', lostReason: 'Budget' }),
    }));
  });

  it('rejects CLOSED_LOST without a reason', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'DRAFTING' }));

    const { req, res, next } = buildReqRes({ body: { lifecycleStatus: 'CLOSED_LOST' } });
    await updateLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/lostReason/i) }));
  });

  it('rejects travel date changes once quoted', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'QUOTED' }));

    const { req, res, next } = buildReqRes({ body: { travelDate: '2026-03-01' } });
    await updateLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/travel dates/i) }));
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('rejects traveler count changes once quoted', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'QUOTED', numberOfTravelers: 2 }));

    const { req, res, next } = buildReqRes({ body: { numberOfTravelers: 4 } });
    await updateLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/numberOfTravelers/i) }));
  });

  it('allows plain contact-field edits with no lifecycle change', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture());

    const { req, res, next } = buildReqRes({ body: { name: 'Renamed Lead' } });
    await updateLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Renamed Lead' }),
    }));
  });
});

describe('draftLead', () => {
  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockLeadUpdate.mockReset();
    mockSelectionCount.mockReset();
    mockLoadPrimarySelection.mockReset().mockResolvedValue({ pricing: {}, costLines: [] });
    mockGatekeeperInputs.mockReset().mockReturnValue({
      sellSubtotal: 0, verifiedPaymentTotal: 0, depositAmount: 0, flightActualTotal: 0, hotelActualTotal: 0,
    });
    mockLeadUpdate.mockResolvedValue(leadFixture({ lifecycleStatus: 'DRAFTING' }));
  });

  it('rejects a lead with no package selections', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'NEW' }));
    mockSelectionCount.mockResolvedValue(0);

    const { req, res, next } = buildReqRes();
    await draftLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/no package selected/i) }));
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('moves to DRAFTING without eagerly copying anything, once a selection exists', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ lifecycleStatus: 'NEW' }));
    mockSelectionCount.mockResolvedValue(1);

    const { req, res, next } = buildReqRes();
    await draftLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: expect.objectContaining({ lifecycleStatus: 'DRAFTING' }),
    }));
  });
});
