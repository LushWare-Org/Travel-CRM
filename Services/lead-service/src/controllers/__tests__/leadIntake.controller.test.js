import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mock Prisma (no real DB) ────────────────────────────────────────────────
const {
  mockLeadFindFirst,
  mockLeadFindUnique,
  mockLeadFindMany,
  mockLeadCount,
  mockLeadUpdate,
  mockLeadUpdateMany,
  mockLeadUpsert,
  mockLeadCreate,
  mockLeadCommLogFindMany,
  mockLeadCommLogCreateMany,
  mockLeadCommLogCreate,
  mockLeadRemarkCreate,
  mockLeadStatusHistoryCreate,
  mockLeadPackageSelectionCount,
  mockSettingsUpsert,
  mockSettingsUpdate,
  mockTransaction,
  mockGatekeeperInputs,
  mockLoadPrimarySelection,
} = vi.hoisted(() => ({
  mockLeadFindFirst: vi.fn(),
  mockLeadFindUnique: vi.fn(),
  mockLeadFindMany: vi.fn(),
  mockLeadCount: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockLeadUpdateMany: vi.fn(),
  mockLeadUpsert: vi.fn(),
  mockLeadCreate: vi.fn(),
  mockLeadCommLogFindMany: vi.fn(),
  mockLeadCommLogCreateMany: vi.fn(),
  mockLeadCommLogCreate: vi.fn(),
  mockLeadRemarkCreate: vi.fn(),
  mockLeadStatusHistoryCreate: vi.fn(),
  mockLeadPackageSelectionCount: vi.fn(),
  mockSettingsUpsert: vi.fn(),
  mockSettingsUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockGatekeeperInputs: vi.fn(),
  mockLoadPrimarySelection: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    lead: {
      findFirst: mockLeadFindFirst,
      findUnique: mockLeadFindUnique,
      findMany: mockLeadFindMany,
      count: mockLeadCount,
      update: mockLeadUpdate,
      updateMany: mockLeadUpdateMany,
      upsert: mockLeadUpsert,
      create: mockLeadCreate,
    },
    leadCommunicationLog: {
      findMany: mockLeadCommLogFindMany,
      createMany: mockLeadCommLogCreateMany,
      create: mockLeadCommLogCreate,
    },
    leadRemark: { create: mockLeadRemarkCreate },
    leadStatusHistory: { create: mockLeadStatusHistoryCreate },
    leadPackageSelection: { count: mockLeadPackageSelectionCount },
    settings: { upsert: mockSettingsUpsert, update: mockSettingsUpdate },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../services/gatekeeper.service.js', () => ({
  gatekeeperInputs: mockGatekeeperInputs,
  loadPrimarySelection: mockLoadPrimarySelection,
}));

vi.mock('../../services/notification.client.js', () => ({
  sendWhatsappText: vi.fn(async () => ({ success: true })),
}));

process.env.INTERNAL_EVENTS_TOKEN = 'test-internal-token';

const { default: app } = await import('../../app.js');

// The transaction callback is handed the same mock client so the intake
// controller's tx.* calls hit the same spies as the top-level prisma client.
const txClient = {
  lead: {
    findFirst: mockLeadFindFirst,
    findUnique: mockLeadFindUnique,
    findMany: mockLeadFindMany,
    count: mockLeadCount,
    update: mockLeadUpdate,
    upsert: mockLeadUpsert,
    create: mockLeadCreate,
  },
  leadCommunicationLog: {
    findMany: mockLeadCommLogFindMany,
    createMany: mockLeadCommLogCreateMany,
    create: mockLeadCommLogCreate,
  },
};

function userHeaders(overrides = {}) {
  return {
    'x-user-id': overrides.id || 'admin-1',
    'x-user-role': overrides.role || 'admin',
    'x-user-email': overrides.email || 'admin@test.com',
    'x-user-name': overrides.name || 'Test Admin',
    'x-user-permissions': JSON.stringify(overrides.permissions || []),
    'x-user-is-super-admin': String(overrides.isSuperAdmin ?? false),
  };
}

const salesRep = { id: 'rep-1', role: 'salesRep', permissions: [] };
const admin = { id: 'admin-1', role: 'admin', permissions: ['manage_leads'] };

const validBody = (overrides = {}) => ({
  channel: 'chatbot',
  sessionId: 'session-1',
  contact: { name: 'Jane', email: 'jane@test.com' },
  slots: { destination: 'Paris', duration: 5, travelers: 2, budget: '$2000', preferences: 'beach holiday' },
  transcript: [
    { id: 'm1', role: 'user', content: 'I want to go to Paris', at: '2026-09-04T00:00:00.000Z' },
    { id: 'm2', role: 'assistant', content: 'Great choice!', at: '2026-09-04T00:00:01.000Z' },
  ],
  ...overrides,
});

beforeEach(() => {
  mockLeadFindFirst.mockReset();
  mockLeadFindUnique.mockReset();
  mockLeadFindMany.mockReset();
  mockLeadCount.mockReset();
  mockLeadUpdate.mockReset();
  mockLeadUpdateMany.mockReset();
  mockLeadUpsert.mockReset();
  mockLeadCreate.mockReset();
  mockLeadCommLogFindMany.mockReset();
  mockLeadCommLogCreateMany.mockReset();
  mockLeadCommLogCreate.mockReset();
  mockLeadRemarkCreate.mockReset();
  mockLeadStatusHistoryCreate.mockReset().mockResolvedValue({ id: 'hist-1' });
  mockLeadPackageSelectionCount.mockReset();
  mockSettingsUpsert.mockReset();
  mockSettingsUpdate.mockReset();
  mockTransaction.mockReset().mockImplementation(async (fn) => fn(txClient));
  mockGatekeeperInputs.mockReset().mockReturnValue({
    sellSubtotal: 0, verifiedPaymentTotal: 0, depositAmount: 0, flightActualTotal: 0, hotelActualTotal: 0,
  });
  mockLoadPrimarySelection.mockReset().mockResolvedValue({ pricing: {}, costLines: [] });
});

describe('POST /api/v1/leads/internal/intake', () => {
  it('creates a PENDING_VERIFICATION chatbot lead when no session match exists', async () => {
    mockLeadFindUnique.mockResolvedValue(null);
    mockLeadUpsert.mockResolvedValue({ id: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION' });
    mockLeadCommLogFindMany.mockResolvedValue([]);
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { leadId: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', created: true } });

    const [option] = mockLeadUpsert.mock.calls[0];
    expect(option.where).toEqual({
      intakeChannel_intakeSessionId: { intakeChannel: 'chatbot', intakeSessionId: 'session-1' },
    });
    expect(option.create).toEqual(expect.objectContaining({
      source: 'chatbot',
      platform: 'Chatbot_Wizard',
      lifecycleStatus: 'PENDING_VERIFICATION',
      destination: 'Paris',
      numberOfTravelers: 2,
      budget: '$2000',
      intakeChannel: 'chatbot',
      intakeSessionId: 'session-1',
    }));
    // Never auto-assign a PENDING_VERIFICATION lead.
    expect(option.create.assignedToId).toBeUndefined();
    expect(option.create.assignedById).toBeUndefined();

    // Every transcript message becomes a communication-log row.
    expect(mockLeadCommLogCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ leadId: 'lead-1', type: 'message', externalMessageId: 'm1', notes: 'I want to go to Paris' }),
        expect.objectContaining({ leadId: 'lead-1', type: 'message', externalMessageId: 'm2', notes: 'Great choice!' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('merges slots and appends only new-by-id messages on a still-PENDING repeat call in the same session', async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-1',
      lifecycleStatus: 'PENDING_VERIFICATION',
      destination: 'Nice',
      message: 'Existing note',
      travelDate: null,
      endDate: null,
    });
    mockLeadUpsert.mockResolvedValue({ id: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION' });
    mockLeadCommLogFindMany.mockResolvedValue([{ externalMessageId: 'm1' }]); // m1 already logged
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { leadId: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', created: false } });

    const [option] = mockLeadUpsert.mock.calls[0];
    expect(option.update).toEqual(expect.objectContaining({
      destination: 'Paris',
      numberOfTravelers: 2,
      budget: '$2000',
    }));
    // Duration/preferences have no Lead column — they are folded into `message`.
    const mergedMessage = option.update.message;
    expect(mergedMessage).toContain('Trip duration: 5 days');
    expect(mergedMessage).toContain('Preferences');
    expect(mergedMessage).toContain('Existing note');
    expect(mockLeadCommLogCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ leadId: 'lead-1', type: 'message', externalMessageId: 'm2', notes: 'Great choice!', byId: null })],
      skipDuplicates: true,
    }));
  });

  it('does not duplicate the duration/preferences fold across repeat turns for the same still-PENDING lead', async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-1',
      lifecycleStatus: 'PENDING_VERIFICATION',
      destination: 'Nice',
      message: 'Trip duration: 5 days; Preferences: beach holiday',
      travelDate: null,
      endDate: null,
    });
    mockLeadUpsert.mockResolvedValue({ id: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION' });
    mockLeadCommLogFindMany.mockResolvedValue([]);
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody());

    expect(res.status).toBe(200);
    const [option] = mockLeadUpsert.mock.calls[0];
    // Same duration/preferences as already stored — must not be appended again.
    expect(option.update.message).toBe('Trip duration: 5 days; Preferences: beach holiday');
  });

  it('folds selectedPackageId into the message so it is never silently dropped', async () => {
    mockLeadFindUnique.mockResolvedValue(null);
    mockLeadUpsert.mockResolvedValue({ id: 'lead-pkg', lifecycleStatus: 'PENDING_VERIFICATION' });
    mockLeadCommLogFindMany.mockResolvedValue([]);
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody({ selectedPackageId: 'b0000000-0000-4000-8000-000000000001' }));

    expect(res.status).toBe(200);
    const [option] = mockLeadUpsert.mock.calls[0];
    expect(option.create.message).toContain('Selected package: b0000000-0000-4000-8000-000000000001');
  });

  it('appends transcript only (no scalar change) when the same-session lead has already left PENDING_VERIFICATION', async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-9',
      lifecycleStatus: 'NEW',
      assignedToId: 'rep-2',
      destination: 'Rome',
      message: 'claimed',
    });
    mockLeadCommLogFindMany.mockResolvedValue([]);
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody({ sessionId: 'session-1', slots: { destination: 'Maldives' } }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { leadId: 'lead-9', lifecycleStatus: 'NEW', created: false } });
    expect(mockLeadUpsert).not.toHaveBeenCalled();
    expect(mockLeadCommLogCreateMany).toHaveBeenCalled();
    // The requested destination was NOT written to any scalar field.
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('never merges into a different lead matched only by contact — no cross-session dedupe-by-contact exists (security)', async () => {
    // Regression guard for the removed IDOR: contact is fully attacker-
    // controlled from the public wizard-turn endpoint, so intake must never
    // look up or merge into a Lead by email/phone/whatsapp alone. Only the
    // caller's own (channel, sessionId) key may resolve an existing Lead.
    mockLeadFindUnique.mockResolvedValue(null);
    mockLeadUpsert.mockResolvedValue({ id: 'lead-new', lifecycleStatus: 'PENDING_VERIFICATION' });
    mockLeadCommLogFindMany.mockResolvedValue([]);
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody({ sessionId: 'attacker-session', contact: { email: 'victim@test.com' } }));

    expect(res.status).toBe(200);
    expect(res.body.data.leadId).toBe('lead-new');
    // No lookup by contact ever happens — findFirst is never called at all.
    expect(mockLeadFindFirst).not.toHaveBeenCalled();
    expect(mockLeadUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { intakeChannel_intakeSessionId: { intakeChannel: 'chatbot', intakeSessionId: 'attacker-session' } },
    }));
  });

  it('converges two near-simultaneous first calls for a brand-new (channel, sessionId) onto one lead', async () => {
    // Simulate the race window: both calls see no pre-existing session row.
    mockLeadFindUnique.mockResolvedValue(null);
    mockLeadUpsert.mockResolvedValue({ id: 'lead-10', lifecycleStatus: 'PENDING_VERIFICATION' });
    mockLeadCommLogFindMany.mockResolvedValue([]);
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 2 });

    const first = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody());
    const second = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Both converge on the same row via upsert — no P2002, no second lead.
    expect(first.body.data.leadId).toBe('lead-10');
    expect(second.body.data.leadId).toBe('lead-10');
    expect(mockLeadUpsert).toHaveBeenCalledTimes(2);
  });

  it('rejects the request when x-internal-token is missing or wrong with 401', async () => {
    const missing = await request(app)
      .post('/api/v1/leads/internal/intake')
      .send(validBody());
    const wrong = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', 'not-the-token')
      .send(validBody());

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(mockLeadFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a malformed payload (empty transcript) with 400', async () => {
    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody({ transcript: [] }));

    expect(res.status).toBe(400);
    expect(mockLeadFindUnique).not.toHaveBeenCalled();
    expect(mockLeadUpsert).not.toHaveBeenCalled();
  });

  it('dedupes by phone when contact has no email', async () => {
    mockLeadFindUnique.mockResolvedValue(null);
    mockLeadUpsert.mockResolvedValue({ id: 'lead-phone', lifecycleStatus: 'PENDING_VERIFICATION' });
    mockLeadCommLogFindMany.mockResolvedValue([]);
    mockLeadCommLogCreateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/v1/leads/internal/intake')
      .set('x-internal-token', process.env.INTERNAL_EVENTS_TOKEN)
      .send(validBody({ contact: { phone: '+960 555 0200' } }));

    expect(res.status).toBe(200);
    const [option] = mockLeadUpsert.mock.calls[0];
    // Digits-only normalization, matching handleFacebookLeadEvent's convention.
    expect(option.create.phone).toBe('9605550200');
  });
});

describe('POST /api/v1/leads/:id/claim', () => {
  it('lets a salesRep claim an unassigned PENDING_VERIFICATION lead and move it to NEW', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', assignedToId: null })
      .mockResolvedValueOnce({ id: 'lead-1', lifecycleStatus: 'NEW', assignedToId: 'rep-1' });
    mockLeadUpdateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/v1/leads/lead-1/claim')
      .set(userHeaders(salesRep));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 'lead-1', lifecycleStatus: 'NEW', assignedToId: 'rep-1' } });
    expect(mockLeadUpdateMany).toHaveBeenCalledWith({
      where: { id: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION' },
      data: { assignedToId: 'rep-1', assignedById: 'rep-1', assignmentMode: 'manual', lifecycleStatus: 'NEW' },
    });
    expect(mockLeadStatusHistoryCreate).toHaveBeenCalledWith({
      data: { leadId: 'lead-1', status: 'NEW', actor: 'USER', changedById: 'rep-1', notes: 'Claimed from PENDING_VERIFICATION' },
    });
  });

  it('rejects claiming a lead that is not PENDING_VERIFICATION', async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-2', lifecycleStatus: 'NEW', assignedToId: 'rep-2' });

    const res = await request(app)
      .post('/api/v1/leads/lead-2/claim')
      .set(userHeaders(salesRep));

    expect(res.status).toBe(409);
    expect(mockLeadUpdateMany).not.toHaveBeenCalled();
  });

  it('returns 404 when the lead does not exist', async () => {
    mockLeadFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/leads/nope/claim')
      .set(userHeaders(salesRep));

    expect(res.status).toBe(404);
  });

  it('rejects a caller with no recognized role (authz denied)', async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', assignedToId: null });

    const res = await request(app)
      .post('/api/v1/leads/lead-1/claim')
      .set(userHeaders({ role: 'staff' }));

    expect(res.status).toBe(403);
    expect(mockLeadFindUnique).not.toHaveBeenCalled();
    expect(mockLeadUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects with 401 when no user headers are present at all', async () => {
    const res = await request(app).post('/api/v1/leads/lead-1/claim');

    expect(res.status).toBe(401);
    expect(mockLeadUpdateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when two salesReps race to claim the same lead concurrently', async () => {
    // findUnique still sees PENDING_VERIFICATION (check-then-act window), but
    // the atomic updateMany's WHERE clause loses the race — count: 0 means
    // another request already flipped the status first.
    mockLeadFindUnique.mockResolvedValue({ id: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', assignedToId: null });
    mockLeadUpdateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/v1/leads/lead-1/claim')
      .set(userHeaders(salesRep));

    expect(res.status).toBe(409);
  });
});

describe('getLeads / getLead PENDING_VERIFICATION carve-outs', () => {
  it('lets a salesRep list PENDING_VERIFICATION leads without the assignedToId filter', async () => {
    mockLeadFindMany.mockResolvedValue([]);
    mockLeadCount.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/leads')
      .set(userHeaders(salesRep))
      .query({ lifecycleStatus: 'PENDING_VERIFICATION' });

    expect(res.status).toBe(200);
    const where = mockLeadFindMany.mock.calls[0][0].where;
    expect(where.AND).not.toContainEqual({ assignedToId: 'rep-1' });
    expect(where.AND).toContainEqual({ lifecycleStatus: 'PENDING_VERIFICATION' });
  });

  it('still scopes a salesRep to their own leads for any non-PENDING status', async () => {
    mockLeadFindMany.mockResolvedValue([]);
    mockLeadCount.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/leads')
      .set(userHeaders(salesRep))
      .query({ status: 'NEW' });

    expect(res.status).toBe(200);
    const where = mockLeadFindMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ assignedToId: 'rep-1' });
    expect(where.AND).toContainEqual({ lifecycleStatus: 'NEW' });
  });

  it('filters by a comma-separated source list', async () => {
    mockLeadFindMany.mockResolvedValue([]);
    mockLeadCount.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/leads')
      .set(userHeaders(admin))
      .query({ source: 'chatbot,website' });

    expect(res.status).toBe(200);
    const where = mockLeadFindMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ source: { in: ['chatbot', 'website'] } });
  });

  it('filters by a comma-separated platform list', async () => {
    mockLeadFindMany.mockResolvedValue([]);
    mockLeadCount.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/leads')
      .set(userHeaders(admin))
      .query({ platform: 'Chatbot_Wizard' });

    expect(res.status).toBe(200);
    const where = mockLeadFindMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ platform: { in: ['Chatbot_Wizard'] } });
  });

  it('lets a salesRep view a PENDING_VERIFICATION lead assigned to someone else', async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-1',
      lifecycleStatus: 'PENDING_VERIFICATION',
      assignedToId: 'rep-9',
      packageSelections: [],
    });

    const res = await request(app)
      .get('/api/v1/leads/lead-1')
      .set(userHeaders(salesRep));

    expect(res.status).toBe(200);
  });

  it('still 403s a salesRep viewing an unassigned non-PENDING lead', async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-1',
      lifecycleStatus: 'NEW',
      assignedToId: null,
      packageSelections: [],
    });

    const res = await request(app)
      .get('/api/v1/leads/lead-1')
      .set(userHeaders(salesRep));

    expect(res.status).toBe(403);
  });
});

describe('admin rejecting a PENDING_VERIFICATION lead via the state machine', () => {
  it('still 400s a transition to CLOSED_LOST without a lostReason', async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-1',
      lifecycleStatus: 'PENDING_VERIFICATION',
      assignedToId: null,
      numberOfTravelers: 2,
    });

    const res = await request(app)
      .put('/api/v1/leads/lead-1')
      .set(userHeaders(admin))
      .send({ lifecycleStatus: 'CLOSED_LOST' });

    expect(res.status).toBe(400);
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('allows a transition to CLOSED_LOST with a lostReason', async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: 'lead-1',
      lifecycleStatus: 'PENDING_VERIFICATION',
      assignedToId: null,
      numberOfTravelers: 2,
    });
    mockLeadUpdate.mockResolvedValue({
      id: 'lead-1', lifecycleStatus: 'CLOSED_LOST', assignedToId: null, lostReason: 'Budget',
    });

    const res = await request(app)
      .put('/api/v1/leads/lead-1')
      .set(userHeaders(admin))
      .send({ lifecycleStatus: 'CLOSED_LOST', lostReason: 'Budget' });

    expect(res.status).toBe(200);
  });
});
