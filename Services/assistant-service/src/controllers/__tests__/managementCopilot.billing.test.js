import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import request from 'supertest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { managementLastSeen: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

vi.mock('../../db/client.js', () => ({ default: mockPrisma }));

const { default: app } = await import('../../app.js');

// Server-boundary smoke for the first non-lead page. Goes through the real
// route, the real registry, the real engine and the real response contract with
// only the downstream service stubbed — so it catches wiring mistakes that unit
// tests on the engine cannot (an unregistered adapter, a scope the controller
// never reaches, a response the contract rejects).

const authHeaders = {
  'x-user-id': 'rep-1',
  'x-user-role': 'admin',
  'x-user-permissions': '[]',
  'x-user-is-super-admin': 'false',
};

const billingTurn = {
  mode: 'deterministic',
  page: { key: 'billing', scope: {}, since: '7_days' },
};

const BASE = 'http://billing.test';

function overdueInvoice(id, overrides = {}) {
  return {
    id,
    invoiceNumber: `INV-${id}`,
    status: 'sent',
    paymentStatus: 'unpaid',
    totalAmount: 5_000,
    paidAmount: 0,
    outstandingAmount: 5_000,
    dueDate: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    sentAt: new Date(Date.now() - 100 * 86_400_000).toISOString(),
    viewedAt: null,
    remindersSent: 4,
    updatedAt: new Date(Date.now() - 100 * 86_400_000).toISOString(),
    customerEmail: 'sam@acme.test',
    leadId: 'lead-1',
    currency: 'USD',
    ...overrides,
  };
}

let realFetch;

beforeEach(() => {
  process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
  process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'leads,billing';
  process.env.BILLING_SERVICE_URL = BASE;
  mockPrisma.managementLastSeen.findUnique.mockReset();
  mockPrisma.managementLastSeen.findUnique.mockResolvedValue(null);
  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.MANAGEMENT_COPILOT_ENABLED;
  delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  delete process.env.BILLING_SERVICE_URL;
});

describe('billing deterministic briefing through the real route', () => {
  it('returns a grounded briefing for an overdue invoice', async () => {
    globalThis.fetch = vi.fn((url) => {
      const body = url.includes('/invoices')
        ? { success: true, count: 1, total: 1, data: [overdueInvoice('inv-1')] }
        : { success: true, count: 0, total: 0, data: [] };
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(body)),
      });
    });

    const res = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send(billingTurn);

    expect(res.status).toBe(200);
    expect(res.body.context.pageKey).toBe('billing');
    expect(res.body.context.scopeLabel).toBe('Billing');
    expect(res.body.context.noAccess).toBe(false);
    expect(res.body.unavailableSources).toEqual([]);
    expect(res.body.notAuthorizedSources).toEqual([]);

    // The overdue rule fires, and every insight it returns is cited.
    expect(res.body.insights.length).toBeGreaterThan(0);
    for (const insight of res.body.insights) {
      expect(insight.evidenceIds.length).toBeGreaterThan(0);
      expect(insight.section).toBeTruthy();
      expect(insight.severity).toBeTruthy();
    }

    // The deterministic phase ships its sources, so the cold-open evidence
    // action has metadata to render and the client has a real record count for
    // its empty state instead of a hardcoded zero.
    expect(Array.isArray(res.body.sources)).toBe(true);
    const baseline = res.body.sources.find((s) => s.id === 'billing:source:invoices:recordCount');
    expect(baseline).toBeTruthy();
    expect(baseline.capturedValue).toBe(1);
    // And every cited insight id resolves to a shipped source.
    const shipped = new Set(res.body.sources.map((s) => s.id));
    for (const insight of res.body.insights) {
      for (const id of insight.evidenceIds) expect(shipped.has(id)).toBe(true);
    }
  });

  it('reports the sources as attempted when the downstream returns 403', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('{}') }));

    const res = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send(billingTurn);

    expect(res.status).toBe(200);
    // Both sources denied and no evidence at all — the only shape that should
    // read as no-access.
    expect(res.body.notAuthorizedSources.sort()).toEqual(['invoices', 'quotations']);
    expect(res.body.context.noAccess).toBe(true);
    expect(res.body.insights).toEqual([]);
  });

  it('reports a partial state, not no-access, when only one source fails', async () => {
    globalThis.fetch = vi.fn((url) =>
      url.includes('/invoices')
        ? Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              Promise.resolve(JSON.stringify({ success: true, count: 1, total: 1, data: [overdueInvoice('inv-1')] })),
          })
        : Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('{}') }),
    );

    const res = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send(billingTurn);

    expect(res.status).toBe(200);
    expect(res.body.unavailableSources).toEqual(['quotations']);
    expect(res.body.context.noAccess).toBe(false);
    expect(res.body.insights.length).toBeGreaterThan(0);
  });

  it('still 404s the billing key when it is not on the allowlist', async () => {
    process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'leads';
    globalThis.fetch = vi.fn();

    const res = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send(billingTurn);

    expect(res.status).toBe(404);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
