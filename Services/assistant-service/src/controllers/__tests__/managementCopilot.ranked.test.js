import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { ManagementDeterministicResult } from '@travel-crm/contracts';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    managementLastSeen: { findUnique: vi.fn(), upsert: vi.fn() },
    insightState: { findMany: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
    insightDecision: { createMany: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));

vi.mock('../../db/client.js', () => ({ default: mockPrisma }));
vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: vi.fn(),
  isAIConfigured: () => true,
}));

const { default: app } = await import('../../app.js');

// The ranked view, through the real route, the real engine, the real pipeline and
// the real response contract. Only the downstream service is stubbed.
//
// The contract assertion at the end is the important one: these schemas are
// `.strict()`, so a field the service adds and the contract does not declare is
// rejected by every client. That happened during this work and was caught here.

const authHeaders = {
  'x-user-id': 'rep-1',
  'x-user-role': 'admin',
  'x-user-permissions': '[]',
  'x-user-is-super-admin': 'true',
};

const DAY = 86_400_000;
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * DAY).toISOString();

const lead = (index, overrides = {}) => ({
  id: `lead-${index}`,
  name: `Synthetic ${index}`,
  lifecycleStatus: 'NEW',
  assignedToId: 'rep-1',
  destination: 'Bali',
  source: 'website',
  platform: 'web',
  budget: 1000 + index,
  createdAt: THIRTY_DAYS_AGO,
  updatedAt: THIRTY_DAYS_AGO,
  ...overrides,
});

// 30 unowned leads (a warning rule, capped by diversity), the rest owned, all
// thirty days stale (a second warning rule), and one destination repeated past
// the grouping threshold (an info rule the severity floor should exclude).
const LEADS = [
  ...Array.from({ length: 30 }, (_, i) => lead(i, { assignedToId: null })),
  ...Array.from({ length: 30 }, (_, i) => lead(100 + i)),
];

const stubLeads = () => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ success: true, data: LEADS, pagination: { total: LEADS.length } })),
    }),
  );
};

let realFetch;

beforeEach(() => {
  process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
  process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'leads';
  process.env.LEAD_SERVICE_URL = 'http://lead.test';
  mockPrisma.managementLastSeen.findUnique.mockReset();
  mockPrisma.managementLastSeen.findUnique.mockResolvedValue(null);
  mockPrisma.insightState.findMany.mockReset();
  mockPrisma.insightState.findMany.mockResolvedValue([]);
  mockPrisma.insightState.createMany.mockReset();
  mockPrisma.insightState.createMany.mockResolvedValue({ count: 3 });
  mockPrisma.insightDecision.createMany.mockReset();
  mockPrisma.insightDecision.createMany.mockResolvedValue({ count: 3 });
  mockPrisma.$executeRaw.mockReset();
  mockPrisma.$executeRaw.mockResolvedValue(3);
  realFetch = globalThis.fetch;
  stubLeads();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.MANAGEMENT_COPILOT_ENABLED;
  delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  delete process.env.LEAD_SERVICE_URL;
});

const turn = () =>
  request(app)
    .post('/api/v1/assistant/management/turn')
    .set(authHeaders)
    .send({ mode: 'deterministic', page: { key: 'leads', scope: {}, since: '7_days' } });

describe('the deterministic response carries a ranked view', () => {
  it('stamps a ranking version', async () => {
    const res = await turn();

    expect(res.status).toBe(200);
    expect(res.body.rankingVersion).toBe('insight-ranking.v1');
  });

  it('returns a ranked list that is a subset of the unranked one', async () => {
    const res = await turn();

    expect(Array.isArray(res.body.ranked)).toBe(true);
    expect(res.body.ranked.length).toBeGreaterThan(0);
    expect(res.body.ranked.length).toBeLessThanOrEqual(res.body.insights.length);

    const unrankedKeys = new Set(res.body.insights.map((i) => i.key));
    for (const item of res.body.ranked) {
      expect(unrankedKeys.has(item.key)).toBe(true);
    }
  });

  it('orders by severity band and explains each placement', async () => {
    const res = await turn();
    const rank = { critical: 0, warning: 1, info: 2 };
    const bands = res.body.ranked.map((item) => rank[item.severity]);

    expect([...bands].sort((a, b) => a - b)).toEqual(bands);

    for (const item of res.body.ranked) {
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.components).toBeTypeOf('object');
      expect(item.key).toBeTruthy();
      expect(item.entityRef?.kind).toBeTruthy();
    }
  });

  it('keeps info out while a warning exists, which is the severity floor', async () => {
    const res = await turn();

    expect(res.body.ranked.some((item) => item.severity === 'warning')).toBe(true);
    expect(res.body.ranked.some((item) => item.severity === 'info')).toBe(false);
  });

  it('reports zero suppressed when nothing has been acknowledged', async () => {
    const res = await turn();

    expect(res.body.suppressedCount).toBe(0);
    expect(Array.isArray(res.body.suppressedCriticals)).toBe(true);
  });

  it('keeps an acknowledged insight quiet and counts it, rather than re-showing it', async () => {
    // One unassigned lead with prior acknowledgement for THIS insight. It must
    // leave the ranked list and appear in the count; everything else on the page
    // is unaffected.
    mockPrisma.insightState.findMany.mockResolvedValue([
      { insightKey: 'unassigned:record:lead-0', acknowledgedAt: new Date(), surfacedCount: 1 },
    ]);

    const res = await turn();

    expect(res.body.suppressedCount).toBeGreaterThan(0);
    expect(res.body.ranked.map((item) => item.key)).not.toContain('unassigned:record:lead-0');
    // Still present in the unranked list, because that list is unchanged while
    // the client half of this change is pending.
    expect(res.body.insights.map((item) => item.key)).toContain('unassigned:record:lead-0');
    expect(ManagementDeterministicResult.safeParse(res.body).success).toBe(true);
  });

  it('still shows everything when the suppression read fails, and writes nothing loudly', async () => {
    mockPrisma.insightState.findMany.mockRejectedValue(new Error('db down'));

    const res = await turn();

    // Fail open: a state read failure must never look like a quiet page.
    expect(res.status).toBe(200);
    expect(res.body.ranked.length).toBeGreaterThan(0);
    expect(res.body.suppressedCount).toBe(0);
  });

  it('records decisions without letting the write block or break the response', async () => {
    mockPrisma.insightDecision.createMany.mockRejectedValue(new Error('table locked'));
    mockPrisma.$executeRaw.mockRejectedValue(new Error('increment refused'));

    const res = await turn();

    expect(res.status).toBe(200);
    expect(res.body.ranked.length).toBeGreaterThan(0);
  });

  it('leaves the existing insights field intact, so a current client still renders', async () => {
    const res = await turn();

    expect(Array.isArray(res.body.insights)).toBe(true);
    expect(res.body.insights.length).toBeGreaterThanOrEqual(res.body.ranked.length);
    for (const insight of res.body.insights) {
      expect(insight.id).toBeTruthy();
      expect(insight.text).toBeTruthy();
      expect(insight.evidenceIds.length).toBeGreaterThan(0);
    }
  });

  it('produces a body the strict wire contract accepts', async () => {
    const res = await turn();
    const parsed = ManagementDeterministicResult.safeParse(res.body);

    // `.strict()` on the contract means any undeclared field fails here, which is
    // exactly the cross-package break this asserts against.
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
  });

  it('degrades to an empty ranked list when the source refuses, without crashing', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('{}') }),
    );

    const res = await turn();

    expect(res.status).toBe(200);
    expect(res.body.context.noAccess).toBe(true);
    expect(res.body.ranked).toEqual([]);
    expect(res.body.rankingVersion).toBe('insight-ranking.v1');
    expect(ManagementDeterministicResult.safeParse(res.body).success).toBe(true);
  });
});
