import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockLeadFindUnique,
  mockLeadFindFirst,
  mockLeadFindMany,
  mockLeadUpdate,
  mockLeadCreate,
  mockLeadRemarkCreate,
  mockSettingsUpsert,
  mockSettingsUpdate,
  mockSelectionCount,
  mockTransaction,
  mockGatekeeperInputs,
  mockLoadPrimarySelection,
} = vi.hoisted(() => ({
  mockLeadFindUnique: vi.fn(),
  mockLeadFindFirst: vi.fn(),
  mockLeadFindMany: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockLeadCreate: vi.fn(),
  mockLeadRemarkCreate: vi.fn(),
  mockSettingsUpsert: vi.fn(),
  mockSettingsUpdate: vi.fn(),
  mockSelectionCount: vi.fn(),
  mockTransaction: vi.fn(),
  mockGatekeeperInputs: vi.fn(),
  mockLoadPrimarySelection: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    lead: {
      findUnique: mockLeadFindUnique, findFirst: mockLeadFindFirst, findMany: mockLeadFindMany,
      update: mockLeadUpdate, create: mockLeadCreate,
    },
    leadRemark: { create: mockLeadRemarkCreate },
    settings: { upsert: mockSettingsUpsert, update: mockSettingsUpdate },
    leadPackageSelection: { count: mockSelectionCount },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../services/gatekeeper.service.js', () => ({
  gatekeeperInputs: mockGatekeeperInputs,
  loadPrimarySelection: mockLoadPrimarySelection,
}));

import {
  updateLead, createLead, draftLead, assignLead, unassignLead,
  getLeadsByStatus, searchLeads, handleFacebookLeadEvent,
} from '../lead.controller.js';

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
    mockSettingsUpsert.mockReset().mockResolvedValue({ assignmentMode: 'manual' });
    mockSettingsUpdate.mockReset();
    mockTransaction.mockReset().mockImplementation(async (fn) => fn({
      lead: { create: mockLeadCreate, update: mockLeadUpdate, findUnique: mockLeadFindUnique },
      settings: { upsert: mockSettingsUpsert, update: mockSettingsUpdate },
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

describe('createLead — auto-assignment (round robin)', () => {
  const txLead = { create: mockLeadCreate, update: mockLeadUpdate, findUnique: mockLeadFindUnique };
  const txSettings = { upsert: mockSettingsUpsert, update: mockSettingsUpdate };

  beforeEach(() => {
    mockLeadCreate.mockReset();
    mockLeadUpdate.mockReset();
    mockLeadFindUnique.mockReset();
    mockSettingsUpsert.mockReset();
    mockSettingsUpdate.mockReset();
    mockTransaction.mockReset().mockImplementation(async (fn) => fn({ lead: txLead, settings: txSettings }));
    mockLeadCreate.mockResolvedValue({ id: 'lead-1', packageSelections: [] });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', packageSelections: [] });
  });

  it('assigns the rep at the current roundRobinIndex and increments it, for an admin-created lead with no assignee', async () => {
    mockSettingsUpsert.mockResolvedValue({
      id: 'settings-1', assignmentMode: 'auto', autoStrategy: 'round_robin',
      enabledSalesRepIds: ['rep-a', 'rep-b'], roundRobinIndex: 1,
    });

    const { req, res, next } = buildReqRes({ body: { name: 'Jane Doe' } });
    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assignedToId: 'rep-b', assignmentMode: 'auto' }),
    }));
    expect(mockSettingsUpdate).toHaveBeenCalledWith({
      where: { id: 'settings-1' },
      data: { roundRobinIndex: { increment: 1 } },
    });
  });

  it('does not auto-assign when Settings.assignmentMode is manual', async () => {
    mockSettingsUpsert.mockResolvedValue({
      id: 'settings-1', assignmentMode: 'manual', autoStrategy: 'round_robin',
      enabledSalesRepIds: ['rep-a', 'rep-b'], roundRobinIndex: 0,
    });

    const { req, res, next } = buildReqRes({ body: { name: 'Jane Doe' } });
    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assignedToId: null }),
    }));
    expect(mockSettingsUpdate).not.toHaveBeenCalled();
  });

  it('does not auto-assign when the creating user is a salesRep — the lead self-assigns instead', async () => {
    mockSettingsUpsert.mockResolvedValue({
      id: 'settings-1', assignmentMode: 'auto', autoStrategy: 'round_robin',
      enabledSalesRepIds: ['rep-a', 'rep-b'], roundRobinIndex: 0,
    });
    const salesRepUser = { id: 'rep-self', role: 'salesRep', isSuperAdmin: false, permissions: ['manage_leads'] };

    const { req, res, next } = buildReqRes({ body: { name: 'Jane Doe' }, user: salesRepUser });
    await createLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assignedToId: 'rep-self', assignmentMode: 'manual' }),
    }));
    expect(mockSettingsUpsert).not.toHaveBeenCalled();
  });
});

describe('assignLead / unassignLead — authorization and consistency', () => {
  const adminOrSalesRep = (overrides) => ({ id: 'actor-1', role: 'salesRep', isSuperAdmin: false, permissions: [], ...overrides });

  beforeEach(() => {
    mockLeadFindUnique.mockReset();
    mockLeadUpdate.mockReset();
  });

  it('rejects a salesRep without the manage_leads permission from assigning a lead', async () => {
    const { req, res, next } = buildReqRes({ user: adminOrSalesRep({ permissions: [] }), body: { assignedTo: 'rep-b' } });
    await assignLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('allows a salesRep with the manage_leads permission to assign a lead', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture());
    mockLeadUpdate.mockResolvedValue(leadFixture({ assignedToId: 'rep-b' }));

    const { req, res, next } = buildReqRes({ user: adminOrSalesRep({ permissions: ['manage_leads'] }), body: { assignedTo: 'rep-b' } });
    await assignLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assignedToId: 'rep-b', assignmentMode: 'manual' }),
    }));
  });

  it('resets assignmentMode to manual when unassigning a lead', async () => {
    mockLeadFindUnique.mockResolvedValue(leadFixture({ assignmentMode: 'auto' }));
    mockLeadUpdate.mockResolvedValue(leadFixture({ assignedToId: null, assignmentMode: 'manual' }));

    const { req, res, next } = buildReqRes({ user: adminUser });
    await unassignLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { assignedToId: null, assignedById: 'user-1', assignmentMode: 'manual' },
    }));
  });

  it('returns a clean 404 instead of throwing when unassigning a lead that does not exist', async () => {
    mockLeadFindUnique.mockResolvedValue(null);

    const { req, res, next } = buildReqRes({ user: adminUser });
    await unassignLead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });
});

describe('getLeadsByStatus / searchLeads — ownership scoping', () => {
  const salesRepUser = { id: 'rep-1', role: 'salesRep', isSuperAdmin: false, permissions: [] };

  beforeEach(() => {
    mockLeadFindMany.mockReset().mockResolvedValue([]);
  });

  it('scopes getLeadsByStatus to the caller’s own leads when role is salesRep', async () => {
    const req = { params: { status: 'NEW' }, query: {}, user: salesRepUser };
    const res = { json: vi.fn() };
    await getLeadsByStatus(req, res, vi.fn());

    expect(mockLeadFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ lifecycleStatus: 'NEW' }, { assignedToId: 'rep-1' }] },
    }));
  });

  it('returns leads for the given status across all reps when role is admin', async () => {
    const req = { params: { status: 'NEW' }, query: {}, user: adminUser };
    const res = { json: vi.fn() };
    await getLeadsByStatus(req, res, vi.fn());

    expect(mockLeadFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ lifecycleStatus: 'NEW' }] },
    }));
  });

  it('scopes searchLeads to the caller’s own leads when role is salesRep', async () => {
    const req = { query: { query: 'jane' }, user: salesRepUser };
    const res = { json: vi.fn() };
    await searchLeads(req, res, vi.fn());

    const calledWhere = mockLeadFindMany.mock.calls[0][0].where;
    expect(calledWhere.AND).toContainEqual({ assignedToId: 'rep-1' });
  });

  it('does not scope searchLeads when role is admin', async () => {
    const req = { query: { query: 'jane' }, user: adminUser };
    const res = { json: vi.fn() };
    await searchLeads(req, res, vi.fn());

    const calledWhere = mockLeadFindMany.mock.calls[0][0].where;
    expect(calledWhere.AND).toHaveLength(1);
  });
});

describe('handleFacebookLeadEvent', () => {
  const txLead = { create: mockLeadCreate };
  const txSettings = { upsert: mockSettingsUpsert, update: mockSettingsUpdate };

  beforeEach(() => {
    mockLeadFindFirst.mockReset();
    mockLeadCreate.mockReset();
    mockLeadRemarkCreate.mockReset();
    mockSettingsUpsert.mockReset().mockResolvedValue({ assignmentMode: 'manual' });
    mockSettingsUpdate.mockReset();
    mockTransaction.mockReset().mockImplementation(async (fn) => fn({ lead: txLead, settings: txSettings }));
  });

  it('creates a lead from a Facebook lead payload when no duplicate exists', async () => {
    mockLeadFindFirst.mockResolvedValue(null);
    mockLeadCreate.mockResolvedValue({ id: 'lead-new', assignedToId: null });

    const req = { body: { leadgenId: 'fb-1', name: 'Jane', email: 'jane@test.com', phone: '123' } };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    await handleFacebookLeadEvent(req, res, vi.fn());

    expect(mockLeadCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'jane@test.com', source: 'social_media', platform: 'Social_Media' }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ leadId: 'lead-new', duplicate: false }),
    }));
  });

  it('appends a remark to the existing lead instead of creating a duplicate', async () => {
    mockLeadFindFirst.mockResolvedValue({ id: 'lead-existing' });

    const req = { body: { leadgenId: 'fb-2', name: 'Jane', email: 'jane@test.com' } };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    await handleFacebookLeadEvent(req, res, vi.fn());

    expect(mockLeadCreate).not.toHaveBeenCalled();
    expect(mockLeadRemarkCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ leadId: 'lead-existing' }),
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: { leadId: 'lead-existing', duplicate: true },
    }));
  });

  it('rejects a payload with neither email nor phone', async () => {
    const req = { body: { leadgenId: 'fb-3', name: 'Jane' } };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();
    await handleFacebookLeadEvent(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(mockLeadFindFirst).not.toHaveBeenCalled();
  });
});
