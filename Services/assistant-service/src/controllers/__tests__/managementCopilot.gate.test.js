import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MANAGEMENT_GENERATION_DEADLINE_MS } from '../../constants/managementCopilot.js';

const { mockPrisma, mockGenerateStructured, mockIsAIConfigured } = vi.hoisted(() => ({
  mockPrisma: {
    managementLastSeen: { findUnique: vi.fn(), upsert: vi.fn() },
  },
  mockGenerateStructured: vi.fn(),
  // Controllable so the ask/briefing gate order can be exercised both with and
  // without a provider (R3).
  mockIsAIConfigured: vi.fn(() => true),
}));

// app.js pulls in routes → db/client.js, which constructs a real PrismaClient
// at import time; mock it so this suite needs no live DB. The seen handler's
// awaited upsert and the turn route's best-effort last-seen read are the only
// storage paths exercised here. Gemini is stubbed so the briefing prompt can be
// inspected without a live call.
vi.mock('../../db/client.js', () => ({ default: mockPrisma }));
vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: mockGenerateStructured,
  isAIConfigured: () => mockIsAIConfigured(),
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
  mockIsAIConfigured.mockReset();
  mockIsAIConfigured.mockReturnValue(true);
});

afterEach(() => {
  delete process.env.MANAGEMENT_COPILOT_ENABLED;
  delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  globalThis.fetch = realFetch;
});

// Enables the copilot AND allowlists the page key the happy-path cases use.
// The gate is fail-closed: an unset or empty MANAGEMENT_COPILOT_PAGE_KEYS
// serves nothing, so a test that set only ENABLED would now get a 404. Override
// PAGE_KEYS after calling this to exercise a different allowlist.
function enableCopilot() {
  process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
  process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'leads';
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

  it('returns 404 when the allowlist is unset, rather than allowing every key', async () => {
    process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
    delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(turnBody);
    expect(res.status).toBe(404);
  });

  it('returns 404 when the allowlist is empty, rather than allowing every key', async () => {
    process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
    process.env.MANAGEMENT_COPILOT_PAGE_KEYS = '  ,  ';
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(turnBody);
    expect(res.status).toBe(404);
  });

  it('serves an allowlisted key', async () => {
    enableCopilot();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('lead-service unavailable'));
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(turnBody);
    expect(res.status).toBe(200);
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

  it('accepts the empty collection scope, which is now valid for leads', async () => {
    // `{}` used to be rejected: the leads scope required a leadId. It is now the
    // collection scope — the general leads page — so a 400 here would mean the
    // page could never acknowledge its own briefing.
    enableCopilot();
    const res = await request(app)
      .post('/api/v1/assistant/management/seen')
      .set(authHeaders)
      .send({ page: { key: 'leads', scope: {} } });
    expect(res.status).toBe(200);
    expect(mockPrisma.managementLastSeen.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.managementLastSeen.upsert.mock.calls[0][0].where).toEqual({
      actorId_pageKey_scopeFingerprint: { actorId: 'rep-1', pageKey: 'leads', scopeFingerprint: '{}' },
    });
  });

  it('still rejects a malformed scope', async () => {
    enableCopilot();
    for (const scope of [{ leadId: '' }, { leadId: '   ' }, { bogus: true }]) {
      const res = await request(app)
        .post('/api/v1/assistant/management/seen')
        .set(authHeaders)
        .send({ page: { key: 'leads', scope } });
      expect(res.status, `scope ${JSON.stringify(scope)} must reject`).toBe(400);
    }
    expect(mockPrisma.managementLastSeen.upsert).not.toHaveBeenCalled();
  });
});

// mode='ask' is answer-shaped and is evaluated ahead of the provider gate; the
// briefing fallback behind that gate keeps its claims contract (R3).
describe('management copilot ask mode payload contract (S7/R3)', () => {
  const askBody = {
    mode: 'ask',
    page: { key: 'leads', scope: { leadId: 'lead-1' }, since: '7_days' },
    messages: [{ role: 'user', content: 'What changed since I last looked?' }],
  };

  const lead = {
    id: 'lead-1',
    lifecycleStatus: 'NEW',
    assignedToId: 'rep-1',
    name: 'Jane',
    destination: 'Bali',
    budget: 450000,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-08T00:00:00Z',
  };

  function stubLead() {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: lead }),
    });
  }

  // The lead list tool and the record read differ in shape: the tool drops a
  // non-array payload as "no rows", the page scope needs the bare object. Answering
  // the list request with an array is what puts the lead's figures in the tool result.
  function stubLeadList() {
    globalThis.fetch = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: String(url).includes('/api/v1/leads?') ? [lead] : lead }),
    }));
  }

  const postTurn = (body) => request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(body);

  // An ungrounded ask returns exactly one SERVER-authored limitation block, not
  // an empty list. The operator learns what this scope can read; the wording
  // cannot come from the model, because a claim citing no evidence is rejected by
  // the validator — which is why silence used to be the only possible outcome.
  const expectLimitation = (body, expectedId = 'limitation:ungrounded') => {
    expect(body.answerBlocks).toHaveLength(1);
    expect(body.answerBlocks[0].id).toBe(expectedId);
    expect(body.answerBlocks[0].evidenceIds).toEqual([]);
    expect(body.claims).toEqual([]);
  };

  it('explains itself, and never leaks a claims payload, when the provider is unconfigured', async () => {
    enableCopilot();
    mockIsAIConfigured.mockReturnValue(false);
    mockGenerateStructured.mockRejectedValue(new Error('AI generation is not configured'));
    stubLead();

    const res = await postTurn(askBody);

    expect(res.status).toBe(200);
    expectLimitation(res.body, 'limitation:generation-failed');
    // A provider fault must never be reported as a limit of the PAGE: that would
    // teach the operator to stop asking questions this scope can answer.
    expect(res.body.answerBlocks[0].text).toMatch(/temporary fault/);
  });

  it('explains itself when the loop generation fails', async () => {
    enableCopilot();
    stubLead();
    mockGenerateStructured.mockRejectedValue(new Error('provider down'));

    const res = await postTurn(askBody);

    expect(res.status).toBe(200);
    expectLimitation(res.body, 'limitation:generation-failed');
  });

  it('returns an empty answer, never a briefing body, when every claim is rejected', async () => {
    enableCopilot();
    stubLead();
    mockGenerateStructured.mockResolvedValue({
      tool: 'final_answer',
      args: {
        claims: [
          {
            id: 'ask-rejected-1',
            section: 'current_state',
            text: 'The lead is in a state the server cannot ground.',
            facts: [],
            evidenceIds: ['lead:does-not-exist:lifecycleStatus'],
            evidenceType: 'record',
            severity: 'info',
          },
        ],
      },
    });

    const res = await postTurn(askBody);

    expect(res.status).toBe(200);
    // Every claim cited evidence the bundle does not contain, so nothing grounded
    // survives — and the operator is told that rather than shown a dead end.
    // `claims` must still never carry the briefing's payload, and no `insights`
    // may appear in an answer.
    expectLimitation(res.body);
    expect(res.body.answerBlocks[0].text).toMatch(/could not ground/);
    expect(res.body.insights).toBeUndefined();
    expect(res.body.context.pageKey).toBe('leads');
  });

  it('gives the actor the same vocabulary on a record scope as anywhere else', async () => {
    // The page no longer narrows the vocabulary. A salesRep may read leads and
    // invoices from any screen, which is what makes a question spanning two
    // domains answerable from either. The page still decides what is VOLUNTEERED
    // without being asked — that is what keeps the panel quiet.
    enableCopilot();
    stubLead();
    const prompts = [];
    mockGenerateStructured.mockImplementation(async ({ prompt }) => {
      prompts.push(prompt);
      return { tool: 'final_answer', args: { claims: [] } };
    });

    await postTurn(askBody);

    expect(prompts[0]).toContain('- getLead:');
    expect(prompts[0]).toContain('- listLeads:');
    expect(prompts[0]).toContain('- listInvoices:');
  });

  it('offers a role with no access no tools at all', async () => {
    enableCopilot();
    stubLead();
    const prompts = [];
    mockGenerateStructured.mockImplementation(async ({ prompt }) => {
      prompts.push(prompt);
      return { tool: 'final_answer', args: { claims: [] } };
    });

    await request(app)
      .post('/api/v1/assistant/management/turn')
      .set({ ...authHeaders, 'x-user-role': 'customer', 'x-user-is-super-admin': 'false' })
      .send(askBody);

    // Fail closed: an unrecognised capability is an empty vocabulary, and the
    // prompt should say so rather than offering tools the role cannot use.
    expect(prompts[0]).not.toContain('- getLead:');
    expect(prompts[0]).not.toContain('- listLeads:');
    expect(prompts[0]).not.toContain('- listInvoices:');
  });

  it('gives the collection scope the same vocabulary as the record scope', async () => {
    enableCopilot();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, count: 0, total: 0, data: [], pagination: { total: 0 } }),
    });
    const prompts = [];
    mockGenerateStructured.mockImplementation(async ({ prompt }) => {
      prompts.push(prompt);
      return { tool: 'final_answer', args: { claims: [] } };
    });

    const res = await postTurn({ ...askBody, page: { key: 'leads', scope: {}, since: '7_days' } });

    expect(res.status).toBe(200);
    // Identical to the record scope, and that is the point: the page no longer
    // decides what may be asked.
    expect(prompts[0]).toContain('- getLead:');
    expect(prompts[0]).toContain('- listLeads:');
    expect(prompts[0]).toContain('- listInvoices:');
  });

  it('grounds an answer claim that cites tool-gathered evidence', async () => {
    enableCopilot();
    stubLead();
    const toolClaim = {
      id: 'ask-1',
      section: 'current_state',
      text: 'The lead is new.',
      facts: [],
      evidenceIds: ['tool:listLeads:1'],
      evidenceType: 'computed',
      severity: 'info',
    };
    let step = 0;
    mockGenerateStructured.mockImplementation(async () =>
      step++ === 0
        ? { tool: 'listLeads', args: { limit: 1 } }
        : { tool: 'final_answer', args: { claims: [toolClaim] } },
    );

    const res = await postTurn(askBody);

    expect(res.status).toBe(200);
    expect(res.body.answerBlocks.map((claim) => claim.id)).toEqual(['ask-1']);
    expect(res.body.sources.map((source) => source.id)).toContain('tool:listLeads:1');
    expect(res.body.claims).toEqual([]);
  });

  it('grounds an answer claim that cites nothing but quotes the tool result', async () => {
    // The live failure this path exists for: the model reads a tool result, states
    // a figure from it, and cannot cite it — the id `tool:<name>:<n>` is minted
    // server-side and never shown. Every claim was deleted as `no-valid-evidence`
    // and the operator saw a refusal.
    enableCopilot();
    // The list tool needs an ARRAY (it drops anything else as "no rows"), while the
    // record read behind the page scope needs the bare object. `stubLead` answers
    // both with the object, so the tool result would carry no figures at all and the
    // test would pass for the wrong reason.
    stubLeadList();
    const uncitedClaim = {
      id: 'ask-uncited',
      section: 'current_state',
      text: 'The lead has a budget of 450000.',
      facts: [],
      evidenceIds: [],
      evidenceType: 'computed',
      severity: 'info',
    };
    let step = 0;
    mockGenerateStructured.mockImplementation(async () =>
      step++ === 0
        ? { tool: 'listLeads', args: { limit: 1 } }
        : { tool: 'final_answer', args: { claims: [uncitedClaim] } },
    );

    const res = await postTurn(askBody);

    expect(res.status).toBe(200);
    expect(res.body.answerBlocks.map((claim) => claim.id)).toEqual(['ask-uncited']);
    expect(res.body.answerBlocks[0].evidenceIds).toEqual([]);
    expect(res.body.claims).toEqual([]);
  });

  it('still refuses an uncited answer whose number is in no tool result', async () => {
    // The floor: the relaxation admits computed answers, it does not admit
    // invented figures. 999999 is nowhere in the lead payload.
    enableCopilot();
    stubLeadList();
    const invented = {
      id: 'ask-invented',
      section: 'current_state',
      text: 'The lead has a budget of 999999.',
      facts: [],
      evidenceIds: [],
      evidenceType: 'computed',
      severity: 'info',
    };
    let step = 0;
    mockGenerateStructured.mockImplementation(async () =>
      step++ === 0
        ? { tool: 'listLeads', args: { limit: 1 } }
        : { tool: 'final_answer', args: { claims: [invented] } },
    );

    const res = await postTurn(askBody);

    expect(res.status).toBe(200);
    expect(res.body.answerBlocks).toHaveLength(1);
    expect(res.body.answerBlocks[0].id).toBe('limitation:ungrounded');
  });

  it('returns answerBlocks, not claims, when the scope cannot be read', async () => {
    enableCopilot();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => '{}' });

    const res = await postTurn(askBody);

    expect(res.status).toBe(200);
    expect(res.body.context.noAccess).toBe(true);
    expect(res.body.answerBlocks).toEqual([]);
    expect(res.body.claims).toEqual([]);
  });

  it('keeps the briefing fallback in the claims shape when the provider is unconfigured (R3)', async () => {
    enableCopilot();
    mockIsAIConfigured.mockReturnValue(false);
    stubLead();

    const res = await postTurn({ mode: 'briefing', page: { key: 'leads', scope: { leadId: 'lead-1' }, since: '7_days' } });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.claims)).toBe(true);
    expect(res.body.answerBlocks).toBeUndefined();
  });

  it('leaves the deterministic phase deterministic when the provider is unconfigured (R3)', async () => {
    enableCopilot();
    mockIsAIConfigured.mockReturnValue(false);
    stubLead();

    const res = await postTurn(turnBody);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.insights)).toBe(true);
    expect(res.body.answerBlocks).toBeUndefined();
    expect(res.body.claims).toBeUndefined();
  });

  it('gives the briefing a second attempt bounded by the same generation deadline', async () => {
    enableCopilot();
    stubLead();

    const res = await postTurn({ mode: 'briefing', page: { key: 'leads', scope: { leadId: 'lead-1' }, since: '7_days' } });

    expect(res.status).toBe(200);
    // The retry is only safe because `deadlineMs` caps the WHOLE call: the
    // second attempt cannot outlive the single-attempt budget the client's 20s
    // abort wraps (see geminiClient.js and constants/managementCopilot.js).
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        maxAttempts: 2,
        timeoutMs: MANAGEMENT_GENERATION_DEADLINE_MS,
        deadlineMs: MANAGEMENT_GENERATION_DEADLINE_MS,
      }),
    );
  });
});
