import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

const { mockPrisma, mockGenerateStructured, mockIsAIConfigured } = vi.hoisted(() => ({
  mockPrisma: { managementLastSeen: { findUnique: vi.fn(), upsert: vi.fn() } },
  mockGenerateStructured: vi.fn(),
  mockIsAIConfigured: vi.fn(() => true),
}));

vi.mock('../../db/client.js', () => ({ default: mockPrisma }));

// The S8 ask case must observe the CALL SHAPE (one single-shot generation, no
// tool block), which a provider forced off cannot show — so the provider seam is
// stubbed for the whole file. Deterministic-mode cases never reach it.
vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: mockGenerateStructured,
  isAIConfigured: () => mockIsAIConfigured(),
}));

const { default: app } = await import('../../app.js');
const { managementSingleShotResponseJsonSchema } = await import('../../ai/prompts/managementAnswer.v1.js');

// Smoke across EVERY registered page key, through the real route, the real
// registry, the real engine, and the real response contract. Only the
// downstream services are stubbed.
//
// Two things this proves that per-descriptor unit tests cannot:
//   1. Each key actually routes — registered, scoped, parsed, and answered.
//   2. Each key degrades correctly when its sources refuse, rather than
//      throwing or returning a body the contract rejects.
//
// The second is the important one: ten adapters means ten chances for a
// descriptor to declare a scope the controller never satisfies, or to crash on
// an empty bundle.

const authHeaders = {
  'x-user-id': 'rep-1',
  'x-user-role': 'admin',
  'x-user-permissions': '[]',
  'x-user-is-super-admin': 'true',
};

const ALL_KEYS = [
  'overview',
  'analytics',
  'leads',
  'packages',
  'flights',
  'hotels',
  'billing',
  'users',
  'career',
  'settings',
];

const ALLOWLIST = ALL_KEYS.join(',');

const SERVICE_ENV = {
  LEAD_SERVICE_URL: 'http://lead.test',
  BILLING_SERVICE_URL: 'http://billing.test',
  ANALYTICS_SERVICE_URL: 'http://analytics.test',
  PACKAGE_SERVICE_URL: 'http://package.test',
  FLIGHT_SERVICE_URL: 'http://flight.test',
  CAREER_SERVICE_URL: 'http://career.test',
  USER_SERVICE_URL: 'http://user.test',
};

const scopeFor = (key) => (key === 'analytics' ? { tab: 'leads' } : {});

let realFetch;

beforeEach(() => {
  process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
  process.env.MANAGEMENT_COPILOT_PAGE_KEYS = ALLOWLIST;
  Object.assign(process.env, SERVICE_ENV);
  mockPrisma.managementLastSeen.findUnique.mockReset();
  mockPrisma.managementLastSeen.findUnique.mockResolvedValue(null);
  mockGenerateStructured.mockReset();
  mockGenerateStructured.mockResolvedValue({ claims: [] });
  mockIsAIConfigured.mockReset();
  mockIsAIConfigured.mockReturnValue(true);
  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.MANAGEMENT_COPILOT_ENABLED;
  delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  for (const key of Object.keys(SERVICE_ENV)) delete process.env[key];
});

const turn = (key, mode = 'deterministic') =>
  request(app)
    .post('/api/v1/assistant/management/turn')
    .set(authHeaders)
    .send({ mode, page: { key, scope: scopeFor(key), since: '7_days' } });

describe('every page key answers through the real route', () => {
  it.each(ALL_KEYS)('%s returns a contract-valid response when its sources refuse', async (key) => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('{}') }),
    );

    const res = await turn(key);

    expect(res.status).toBe(200);
    expect(res.body.context.pageKey).toBe(key);
    expect(typeof res.body.context.scopeLabel).toBe('string');
    expect(res.body.context.scopeLabel.length).toBeGreaterThan(0);
    expect(res.body.context.asOf).toBeTruthy();
    expect(Array.isArray(res.body.insights)).toBe(true);
    expect(Array.isArray(res.body.sources)).toBe(true);
    expect(Array.isArray(res.body.unavailableSources)).toBe(true);
    expect(Array.isArray(res.body.notAuthorizedSources)).toBe(true);

    // Every source refused, so this is the one shape that may read as no-access
    // — and no claim may survive without evidence.
    expect(res.body.context.noAccess).toBe(true);
    expect(res.body.insights).toEqual([]);
  });

  it.each(ALL_KEYS)('%s returns a contract-valid response when empty but successful', async (key) => {
    // A 200 carrying nothing is the quiet-page case. It must NOT read as
    // no-access, and it must not crash on an empty bundle.
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true, count: 0, total: 0, data: [], pagination: { total: 0 } })),
      }),
    );

    const res = await turn(key);

    expect(res.status).toBe(200);
    expect(res.body.context.noAccess).toBe(false);
    // NOT asserted empty. A quiet page may legitimately say something true
    // about being quiet — billing's `zeroOrLowCount` rule exists for exactly
    // that ("no invoices in this view are past due"). What must hold is that
    // nothing ships uncited and nothing crashes.
    expect(Array.isArray(res.body.insights)).toBe(true);
    for (const insight of res.body.insights) {
      expect(insight.evidenceIds.length).toBeGreaterThan(0);
      expect(insight.text).toBeTruthy();
    }
  });

  it.each(ALL_KEYS)('%s rejects an unknown scope key with a 400, not a 500', async (key) => {
    const res = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send({ mode: 'deterministic', page: { key, scope: { bogus: true }, since: '7_days' } });

    // Analytics legitimately rejects it too — `bogus` is not a tab.
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });
});

describe('selected keys produce grounded insights from real-shaped data', () => {
  it('overview reads the dashboard singleton', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: true,
              data: {
                leads: { total: 100, new: 30, converted: 10 },
                bookings: { total: 40, confirmed: 30, pending: 4 },
                revenue: { total: 100_000, collected: 20_000 },
                packages: { total: 50, published: 10 },
              },
            }),
          ),
      }),
    );

    const res = await turn('overview');
    expect(res.status).toBe(200);
    expect(res.body.context.noAccess).toBe(false);
    // Conversion 10/100, collection 20k/100k, published 10/50 — all below
    // threshold, so at least one grounded claim must render.
    expect(res.body.insights.length).toBeGreaterThan(0);
    for (const insight of res.body.insights) {
      expect(insight.evidenceIds.length).toBeGreaterThan(0);
    }
  });

  it('settings reports the unset fields a customer would notice', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              status: 'success',
              data: {
                settings: {
                  id: 'org-1',
                  companyName: 'Lush Travel',
                  companyShortName: null,
                  companyAddress: null,
                  supportEmail: null,
                  logoUrl: null,
                  whatsappNumber: null,
                  updatedAt: new Date().toISOString(),
                },
              },
            }),
          ),
      }),
    );

    const res = await turn('settings');
    expect(res.status).toBe(200);
    const text = res.body.insights.map((i) => i.text).join(' ');
    expect(text).toMatch(/support email/i);
    expect(text).toMatch(/address/i);
    // Bank details must never reach the bundle.
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/bankAccountNumber|bankName|upiId/);
  });
});

describe('an ask by an actor with no tools (S8)', () => {
  it('issues exactly one single-shot generation, with no tool block', async () => {
    // The zero-tool branch is selected by the ACTOR's vocabulary, not by the
    // page: an actor whose role can reach no tool has nothing to loop over, so a
    // single generation is the right shape.
    const toolLessActor = {
      ...authHeaders,
      'x-user-role': 'customer',
      'x-user-is-super-admin': 'false',
    };
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: true,
              data: {
                leads: { total: 100, new: 30, converted: 10 },
                bookings: { total: 40, confirmed: 30, pending: 4 },
                revenue: { total: 100_000, collected: 20_000 },
                packages: { total: 50, published: 10 },
              },
            }),
          ),
      }),
    );

    const calls = [];
    mockGenerateStructured.mockImplementation(async (args) => {
      calls.push(args);
      return { claims: [] };
    });

    const res = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(toolLessActor)
      .send({
        mode: 'ask',
        page: { key: 'overview', scope: {}, since: '7_days' },
        messages: [{ role: 'user', content: 'How are we doing?' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.context.pageKey).toBe('overview');
    expect(res.body.context.noAccess).toBe(false);
    // No grounded answer, so the operator gets the server-authored limitation.
    // This actor can reach no tool at all, so the wording says exactly that
    // rather than naming capabilities that do not exist for this role.
    expect(res.body.answerBlocks).toHaveLength(1);
    expect(res.body.answerBlocks[0].id).toBe('limitation:ungrounded');
    expect(res.body.answerBlocks[0].text).toMatch(/readable with your role/);
    expect(res.body.claims).toEqual([]);

    // The branch itself, not merely the envelope: exactly one generation, the
    // single-shot schema, and a prompt that never mentions tools or the loop's
    // final_answer envelope. Remove the zero-tool branch and the loop instead
    // makes four `{ tool, args }` calls against the same stub.
    expect(calls).toHaveLength(1);
    expect(calls[0].schema).toBe(managementSingleShotResponseJsonSchema);
    expect(calls[0].prompt).not.toContain('Available tools:');
    expect(calls[0].prompt).not.toContain('final_answer');
  });
});
