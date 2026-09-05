import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { FALLBACK_POLICY_MESSAGE } from '@travel-crm/policy-retrieval';

const { mockGenerateStructured, mockPrisma, mockFetchPolicyDocuments } = vi.hoisted(() => ({
  mockGenerateStructured: vi.fn(),
  mockPrisma: {
    assistantEvent: { create: vi.fn() },
  },
  mockFetchPolicyDocuments: vi.fn(),
}));

vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: mockGenerateStructured,
  isAIConfigured: vi.fn(() => true),
}));

// app.js pulls in routes → db/client.js, which constructs a real
// PrismaClient at import time; mock it so this suite doesn't need DATABASE_URL.
vi.mock('../../db/client.js', () => ({ default: mockPrisma }));
// The real retrieveSnippets + FALLBACK_POLICY_MESSAGE still run (importOriginal
// spread); only the user-service fetch is stubbed.
vi.mock('@travel-crm/policy-retrieval', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchPolicyDocuments: mockFetchPolicyDocuments };
});

const { default: app } = await import('../../app.js');

// Turn messages must carry a stable id and an ISO timestamp (see the
// WizardTurnMessage contract). Content is used as the id so each fixture is
// unique and stable across the resent sliding window.
function assistantMsg(content, role = 'user') {
  return { id: `m-${content}`, role, content, at: '2026-09-04T00:00:00.000Z' };
}

const AVAILABLE_ROUTES = [
  { name: 'packages', path: '/packages' },
  { name: 'destinations', path: '/destinations-international' },
];

function baseBody(overrides = {}) {
  return {
    sessionId: 'session-1',
    messages: [assistantMsg('Show me the packages')],
    availableRoutes: AVAILABLE_ROUTES,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchPolicyDocuments.mockResolvedValue([]);
});

describe('POST /api/v1/assistant/turn — navigate', () => {
  it('resolves the route/path from the client-offered allowlist when the model names an offered route', async () => {
    mockGenerateStructured.mockResolvedValue({
      tool: 'navigate',
      args: { route: 'destinations', message: 'Sure — taking you to the destinations page.' },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Take me to international destinations')] }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.toolCall.tool).toBe('navigate');
    expect(res.body.data.serverResult).toEqual({ route: 'destinations', path: '/destinations-international' });
    expect(res.body.data.message).toBe('Sure — taking you to the destinations page.');
  });

  it('ignores a route the client never offered — null result, nothing executed', async () => {
    mockGenerateStructured.mockResolvedValue({
      tool: 'navigate',
      args: { route: 'refunds', message: 'Taking you to the refunds page.' },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Take me to the refund page')] }));

    expect(res.status).toBe(200);
    expect(res.body.data.toolCall.tool).toBe('navigate');
    // Never executed: no path is fabricated and the server does not navigate.
    expect(res.body.data.serverResult).toEqual({ route: null, path: null });
    // Never empty — an empty assistant message would poison the resent
    // sliding window on every later turn (both wire schemas require
    // content.min(1)), permanently bricking the session (/ship red-team).
    expect(res.body.data.message).toBe(
      "I can't take you there directly — try asking for a specific page, like packages or destinations.",
    );
  });
});

describe('POST /api/v1/assistant/turn — answer_faq_policy', () => {
  it('quotes the server-retrieved snippet verbatim when the model selects it', async () => {
    mockFetchPolicyDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Refund Policy', body: 'Cancellations within 30 days of departure are non-refundable except for medical emergencies with documentation.' },
    ]);
    mockGenerateStructured.mockResolvedValue({
      tool: 'answer_faq_policy',
      args: { question: 'Is my trip refundable if I cancel within 30 days?', selectedSnippetIds: ['snippet-0'], message: "Here's what our policy says:" },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Is my trip refundable if I cancel within 30 days?')] }));

    expect(res.body.data.serverResult.answered).toBe(true);
    expect(res.body.data.serverResult.snippets[0].quote).toBe(
      'Cancellations within 30 days of departure are non-refundable except for medical emergencies with documentation.',
    );
    expect(res.body.data.serverResult.snippets[0].docId).toBe('doc-1');
  });

  it('model-authored quote text is discarded even when it selects a valid snippet id', async () => {
    mockFetchPolicyDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Refund Policy', body: 'Full refunds are issued for cancellations made more than 30 days before departure.' },
    ]);
    mockGenerateStructured.mockResolvedValue({
      tool: 'answer_faq_policy',
      args: { question: 'What is your refund policy for cancellations?', selectedSnippetIds: ['snippet-0'], message: 'We always offer bereavement fare refunds.', quote: 'A fabricated quote the model wrote.' },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('What is your refund policy for cancellations?')] }));

    expect(res.body.data.serverResult.answered).toBe(true);
    expect(res.body.data.serverResult.snippets[0].quote).toBe(
      'Full refunds are issued for cancellations made more than 30 days before departure.',
    );
    expect(JSON.stringify(res.body.data.serverResult)).not.toContain('fabricated quote');
    expect(JSON.stringify(res.body.data.serverResult)).not.toContain('bereavement');
  });

  it('no matching snippet returns the exact FALLBACK_POLICY_MESSAGE, ignoring the model', async () => {
    mockFetchPolicyDocuments.mockResolvedValue([]);
    mockGenerateStructured.mockResolvedValue({
      tool: 'answer_faq_policy',
      args: { question: 'What is your refund policy?', selectedSnippetIds: ['snippet-0'], message: 'Made up policy text the model tried to author.' },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('What is your refund policy?')] }));

    expect(res.body.data.serverResult.answered).toBe(false);
    expect(res.body.data.serverResult.fallbackMessage).toBe(FALLBACK_POLICY_MESSAGE);
    // The visitor-facing turn text is the server fallback too — the model's
    // authored text never reaches the visitor as policy.
    expect(res.body.data.message).toBe(FALLBACK_POLICY_MESSAGE);
  });
});

describe('POST /api/v1/assistant/turn — request validation', () => {
  it('rejects a body with no sessionId with a 400 by Zod', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send({
        messages: [assistantMsg('Show me the packages')],
        availableRoutes: AVAILABLE_ROUTES,
      });

    expect(res.status).toBe(400);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });

  it('rejects an empty messages array with a 400 by Zod', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [] }));

    expect(res.status).toBe(400);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });

  it('rejects a messages array longer than 20 with a 400 by Zod', async () => {
    const messages = Array.from({ length: 21 }, (_, i) => assistantMsg(`message number ${i}`));
    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages }));

    expect(res.status).toBe(400);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/assistant/turn — model tool-contract enforcement', () => {
  it('rejects model output outside the fixed tool vocabulary with a 502 and never dispatches', async () => {
    // The Gemini JSON schema constrains generation, but the Zod safeParse is
    // the enforcement boundary: an out-of-vocabulary tool must fail the turn
    // rather than fall through to the switch default or execute anything.
    mockGenerateStructured.mockResolvedValue({
      tool: 'send_email',
      args: { recipient: 'visitor@example.com', body: 'You won!' },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Email me the refund policy')] }));

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('AI response did not match the tool contract');
    expect(res.body.serverResult).toBeUndefined();
  });

});

describe('POST /api/v1/assistant/turn — never-empty / never-oversized message guarantee', () => {
  it('falls back to a tool-appropriate default when the model omits args.message for a resolved navigate', async () => {
    // The response JSON schema has no `required` list inside `args` (see
    // assistantTurn.v1.js), so the model can legally omit `message` even
    // though the prompt asks for one. An empty message would poison the
    // client's resent sliding window on every later turn (/ship red-team).
    mockGenerateStructured.mockResolvedValue({
      tool: 'navigate',
      args: { route: 'packages' },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Show me packages')] }));

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Sure — heading there now.');
  });

  it('falls back to a tool-appropriate lead-in when the model omits args.message for a matched FAQ answer', async () => {
    mockFetchPolicyDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Refund Policy', body: 'Cancellations within 30 days of departure are non-refundable except for medical emergencies with documentation.' },
    ]);
    mockGenerateStructured.mockResolvedValue({
      tool: 'answer_faq_policy',
      args: { question: 'Is my trip refundable if I cancel within 30 days?', selectedSnippetIds: ['snippet-0'] },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Is my trip refundable if I cancel within 30 days?')] }));

    expect(res.status).toBe(200);
    // Never the generic "didn't catch that" apology sitting above a real
    // answer — that was a contradiction the model-message-missing path used
    // to produce (found in /ship's Claude adversarial review).
    expect(res.body.data.message).toBe("Here's what I found:");
    expect(res.body.data.serverResult.answered).toBe(true);
  });

  it('clamps an oversized model message to the wire schema max instead of letting it brick the session', async () => {
    // args is an open z.record with no length cap, and Gemini's 1024+ token
    // budget makes a >2000-char reply reachable — the exact mirror of the
    // empty-message brick (/ship red-team + Claude adversarial review).
    const oversized = 'x'.repeat(2500);
    mockGenerateStructured.mockResolvedValue({
      tool: 'navigate',
      args: { route: 'refunds', message: oversized },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Take me to the refund page')] }));

    expect(res.status).toBe(200);
    // Declined route always uses the fixed message regardless of what the
    // model sent — pick an offered route instead to prove the clamp itself.
    expect(res.body.data.message.length).toBeLessThanOrEqual(2000);
  });

  it('clamps an oversized model message on a resolved navigate to exactly 2000 chars', async () => {
    const oversized = 'y'.repeat(2500);
    mockGenerateStructured.mockResolvedValue({
      tool: 'navigate',
      args: { route: 'packages', message: oversized },
    });

    const res = await request(app)
      .post('/api/v1/assistant/turn')
      .send(baseBody({ messages: [assistantMsg('Show me packages')] }));

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe(oversized.slice(0, 2000));
    expect(res.body.data.message.length).toBe(2000);
  });
});
