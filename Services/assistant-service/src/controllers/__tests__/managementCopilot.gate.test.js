import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

const { mockPrisma, mockGenerateStructured } = vi.hoisted(() => ({
  mockPrisma: {
    managementLastSeen: { findUnique: vi.fn(), upsert: vi.fn() },
  },
  mockGenerateStructured: vi.fn(),
}));

// app.js pulls in routes → db/client.js, which constructs a real PrismaClient
// at import time; mock it so this suite needs no live DB. The seen handler's
// awaited upsert and the turn route's best-effort last-seen read are the only
// storage paths exercised here. Gemini is stubbed so the briefing prompt can be
// inspected without a live call.
vi.mock('../../db/client.js', () => ({ default: mockPrisma }));
vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: mockGenerateStructured,
  isAIConfigured: () => true,
}));

const { default: app } = await import('../../app.js');

// Server-side gate + scoped auth for the Management copilot routes. These
// assertions verify the load-bearing boundaries: the feature is off until
// enabled (404, no existence leak), the route is NOT globally authed (public
// routes stay public; these routes alone require the actor context), the seen
// acknowledgement shares the turn route's gates, and the turn route itself
// never advances the last-seen window.

const authHeaders = {
  'x-user-id': 'rep-1',
  'x-user-role': 'salesRep',
  'x-user-permissions': '[]',
  'x-user-is-super-admin': 'false',
};

const turnBody = { mode: 'deterministic', page: { key: 'leads', scope: { leadId: 'lead-1' }, since: '7_days' } };
const seenBody = { page: { key: 'leads', scope: { leadId: 'lead-1' } } };

let realFetch;

beforeAll(() => {
  realFetch = globalThis.fetch;
});

beforeEach(() => {
  mockPrisma.managementLastSeen.findUnique.mockReset();
  mockPrisma.managementLastSeen.upsert.mockReset();
  mockPrisma.managementLastSeen.upsert.mockResolvedValue({});
  mockGenerateStructured.mockReset();
  mockGenerateStructured.mockResolvedValue({ claims: [] });
});

afterEach(() => {
  delete process.env.MANAGEMENT_COPILOT_ENABLED;
  delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  globalThis.fetch = realFetch;
});

function enableCopilot() {
  process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
}

describe('management copilot server-side gate (turn route)', () => {
  it('returns 404 when MANAGEMENT_COPILOT_ENABLED is off', async () => {
    process.env.MANAGEMENT_COPILOT_ENABLED = 'false';
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(turnBody);
    expect(res.status).toBe(404);
  });

  it('returns 404 when the page key is not in the allowlist', async () => {
    enableCopilot();
    process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'packages';
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(turnBody);
    expect(res.status).toBe(404);
  });

  it('returns 401 without actor context (scoped auth, not global)', async () => {
    enableCopilot();
    const res = await request(app).post('/api/v1/assistant/management/turn').send(turnBody);
    expect(res.status).toBe(401);
  });

  it('never advances the last-seen window on a turn request', async () => {
    enableCopilot();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('lead-service unavailable'));
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(turnBody);
    expect(res.status).toBe(200);
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
  });

  it('reads the stored boundary only for since=last_visit, best-effort', async () => {
    enableCopilot();
    mockPrisma.managementLastSeen.findUnique.mockResolvedValue({ lastSeenAt: new Date('2026-09-05T00:00:00Z') });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('lead-service unavailable'));
    const res = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send({ mode: 'deterministic', page: { key: 'leads', scope: { leadId: 'lead-1' }, since: 'last_visit' } });
    expect(res.status).toBe(200);
    expect(mockPrisma.managementLastSeen.findUnique).toHaveBeenCalledWith({
      where: { actorId_pageKey_scopeFingerprint: { actorId: 'rep-1', pageKey: 'leads', scopeFingerprint: '{"leadId":"lead-1"}' } },
    });
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
  });

  it('lets deterministic and briefing phases observe the same stored boundary', async () => {
    enableCopilot();
    const stored = new Date('2026-09-05T00:00:00Z');
    mockPrisma.managementLastSeen.findUnique.mockResolvedValue({ lastSeenAt: stored });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: 'lead-1',
          lifecycleStatus: 'NEW',
          assignedToId: 'rep-1',
          name: 'Jane',
          destination: 'Bali',
          budget: 450000,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-08T00:00:00Z',
        },
      }),
    });

    const deterministic = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send({ mode: 'deterministic', page: { key: 'leads', scope: { leadId: 'lead-1' }, since: 'last_visit' } });
    expect(deterministic.status).toBe(200);
    // The deterministic phase consumed the stored boundary: updatedAt is after it.
    expect(deterministic.body.insights.some((insight) => insight.id === 'lead-changed')).toBe(true);

    const briefing = await request(app)
      .post('/api/v1/assistant/management/turn')
      .set(authHeaders)
      .send({ mode: 'briefing', page: { key: 'leads', scope: { leadId: 'lead-1' }, since: 'last_visit' } });
    expect(briefing.status).toBe(200);

    // Both phases read the same scope fingerprint, neither advanced the window,
    // and the prompt received the resolved ISO boundary — not the keyword.
    expect(mockPrisma.managementLastSeen.findUnique).toHaveBeenCalledTimes(2);
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
    const prompt = mockGenerateStructured.mock.calls[0][0].prompt;
    expect(prompt).toContain('2026-09-05T00:00:00.000Z');
    expect(prompt).not.toContain('Change window: last_visit');
  });
});

describe('management copilot server-side gate (seen route)', () => {
  it('returns 404 when MANAGEMENT_COPILOT_ENABLED is off', async () => {
    process.env.MANAGEMENT_COPILOT_ENABLED = 'false';
    const res = await request(app).post('/api/v1/assistant/management/seen').set(authHeaders).send(seenBody);
    expect(res.status).toBe(404);
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
  });

  it('returns 404 when the page key is not in the allowlist', async () => {
    enableCopilot();
    process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'packages';
    const res = await request(app).post('/api/v1/assistant/management/seen').set(authHeaders).send(seenBody);
    expect(res.status).toBe(404);
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
  });

  it('returns 401 without actor context (scoped auth, not global)', async () => {
    enableCopilot();
    const res = await request(app).post('/api/v1/assistant/management/seen').send(seenBody);
    expect(res.status).toBe(401);
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
  });

  it('acknowledges idempotently with a server-stamped, forward-only timestamp', async () => {
    enableCopilot();
    const first = await request(app).post('/api/v1/assistant/management/seen').set(authHeaders).send(seenBody);
    const second = await request(app).post('/api/v1/assistant/management/seen').set(authHeaders).send(seenBody);

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ success: true });
    expect(second.status).toBe(200);
    expect(mockPrisma.managementLastSeen.upsert).toHaveBeenCalledTimes(2);

    const firstArgs = mockPrisma.managementLastSeen.upsert.mock.calls[0][0];
    const secondArgs = mockPrisma.managementLastSeen.upsert.mock.calls[1][0];
    expect(firstArgs.where).toEqual({
      actorId_pageKey_scopeFingerprint: { actorId: 'rep-1', pageKey: 'leads', scopeFingerprint: '{"leadId":"lead-1"}' },
    });
    expect(firstArgs.update.lastSeenAt).toBeInstanceOf(Date);
    expect(firstArgs.create).toMatchObject({ actorId: 'rep-1', pageKey: 'leads', scopeFingerprint: '{"leadId":"lead-1"}' });
    expect(secondArgs.update.lastSeenAt.getTime()).toBeGreaterThanOrEqual(firstArgs.update.lastSeenAt.getTime());
  });

  it('returns 5xx when the acknowledgement upsert rejects (never swallowed)', async () => {
    enableCopilot();
    mockPrisma.managementLastSeen.upsert.mockRejectedValue(new Error('db down'));
    const res = await request(app).post('/api/v1/assistant/management/seen').set(authHeaders).send(seenBody);
    expect(res.status).toBe(500);
  });

  it('rejects an invalid scope before any write', async () => {
    enableCopilot();
    const res = await request(app)
      .post('/api/v1/assistant/management/seen')
      .set(authHeaders)
      .send({ page: { key: 'leads', scope: {} } });
    expect(res.status).toBe(400);
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
  });
});
