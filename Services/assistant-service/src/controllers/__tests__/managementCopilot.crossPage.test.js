import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

const { mockPrisma, mockGenerateStructured } = vi.hoisted(() => ({
  mockPrisma: {
    managementLastSeen: { findUnique: vi.fn(), upsert: vi.fn() },
    insightState: { findMany: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
    insightDecision: { createMany: vi.fn() },
    $executeRaw: vi.fn(),
  },
  mockGenerateStructured: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({ default: mockPrisma }));
vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: mockGenerateStructured,
  isAIConfigured: () => true,
}));

const { default: app } = await import('../../app.js');

// ─── Answering another domain's question from this page ───────────────────
// The reported failure: an operator on /leads clicked "Ask copilot" on a business
// notification about overdue invoices, asked "tell me more", and was refused with
// "I could not ground an answer to that question on this page". The tool
// vocabulary was never the problem — `toolsForActor` is actor-derived and
// `listInvoices` was reachable — but every claim the model produced named an
// invoice number, and `UNSAFE_PROSE_PATTERNS` matched `INV-202608-00027` as if it
// were an internal record id, so validation deleted the lot.
//
// This is the end-to-end proof that the number now survives, and that the rule
// still bites when the number is not something the read actually carried.

const authHeaders = {
  'x-user-id': 'admin-1',
  'x-user-role': 'admin',
  'x-user-permissions': '[]',
  'x-user-is-super-admin': 'true',
};

const DAY = 86_400_000;
const OLD = new Date(Date.now() - 30 * DAY).toISOString();

const LEADS = [
  {
    id: 'lead-1',
    name: 'Synthetic One',
    lifecycleStatus: 'NEW',
    assignedToId: 'rep-1',
    destination: 'Bali',
    source: 'website',
    platform: 'web',
    budget: 1000,
    createdAt: OLD,
    updatedAt: OLD,
  },
];

const invoice = (invoiceNumber) => ({
  id: 'invoice-1',
  invoiceNumber,
  customerEmail: 'customer@example.com',
  leadId: 'lead-1',
  currency: 'USD',
  paymentStatus: 'unpaid',
  status: 'sent',
  totalAmount: 5000,
  paidAmount: 0,
  outstandingAmount: 5000,
  dueDate: OLD,
  overdue: true,
});

const jsonResponse = (body) =>
  Promise.resolve({
    ok: true,
    status: 200,
    // Both shapes are needed: the page adapters read `.text()`, while the tool
    // layer's `fetchJson` reads `.json()`.
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });

let realFetch;

/** The billing read carries `invoiceNumber`, or it does not. */
function stubServices({ invoiceNumber }) {
  globalThis.fetch = vi.fn((url) => {
    const href = String(url);
    if (href.includes('billing.test')) {
      const invoices = [invoice(invoiceNumber)];
      return jsonResponse({ success: true, count: invoices.length, total: 20, data: invoices });
    }
    return jsonResponse({ success: true, data: LEADS, pagination: { total: LEADS.length } });
  });
}

/**
 * One tool call, then a final answer naming the invoice number. Neither step
 * cites an evidence id: a tool result is not a renderable field, so the model is
 * never shown one (COMPUTED_CLAIM_RULE) — its numbers are checked against the
 * tool result instead.
 *
 * The prose states only the document number, because this fixture's billing stub
 * returns ONE row against an envelope total of 20 — an incomplete read, so the tool
 * withholds its counts and only the row's own values are citable. A read that
 * returned everything the envelope counted carries `total` and `overdueTotal`, which
 * the count cases below exercise.
 */
const answerNamingTheInvoice = [
  { tool: 'listInvoices', args: {} },
  {
    tool: 'final_answer',
    args: {
      claims: [
        {
          id: 'c1',
          section: 'current_state',
          text: 'The oldest open invoice is INV-202608-00027.',
          facts: [],
          evidenceIds: [],
          evidenceType: 'computed',
          severity: 'info',
        },
      ],
    },
  },
];

// ─── A count the tool read, and a fact the contract used to reject ─────────
// Live, once the count finally reached the tool result, the model stated it
// CORRECTLY and was still refused: it wrote the figures as facts with an empty
// `evidenceId`, and the shared contract requires a non-empty one — so the whole
// claim was dropped by the response contract before grounding ever saw it. Both
// figures came off the tool result, and `validateClaims` throws an uncitable fact
// away regardless, so dropping the fact instead of the claim is the entire fix.
const INVOICES = [
  invoice('INV-1'),
  invoice('INV-2'),
  { ...invoice('INV-3'), dueDate: new Date(Date.now() + 5 * DAY).toISOString() },
];

/** A COMPLETE billing read: every row the envelope counts comes back. */
function stubCompleteInvoices() {
  globalThis.fetch = vi.fn((url) => {
    const href = String(url);
    if (href.includes('billing.test')) {
      return jsonResponse({ success: true, count: INVOICES.length, total: INVOICES.length, data: INVOICES });
    }
    return jsonResponse({ success: true, data: LEADS, pagination: { total: LEADS.length } });
  });
}

/** One tool call, then a final answer whose facts carry no usable evidenceId. */
const answerStating = (text, values) => [
  { tool: 'listInvoices', args: {} },
  {
    tool: 'final_answer',
    args: {
      claims: [
        {
          id: 'c-count',
          section: 'current_state',
          text,
          facts: values.map((value) => ({ kind: 'count', value, evidenceId: '' })),
          evidenceIds: [],
          evidenceType: 'computed',
          severity: 'info',
        },
      ],
    },
  },
];

const scriptModel = (steps) =>
  mockGenerateStructured.mockImplementation(async () => {
    const step = mockGenerateStructured.mock.calls.length - 1;
    return steps[step] ?? steps[steps.length - 1];
  });

const ask = () =>
  request(app)
    .post('/api/v1/assistant/management/turn')
    .set(authHeaders)
    .send({
      mode: 'ask',
      // The question is about invoices; the page is leads. That is the point.
      page: { key: 'leads', scope: {}, since: '7_days' },
      messages: [{ role: 'user', content: 'tell me more' }],
      priorClaims: [{ text: '20 invoices worth $81,082 are past due.', facts: [] }],
    });

beforeEach(() => {
  process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
  process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'leads';
  process.env.LEAD_SERVICE_URL = 'http://lead.test';
  process.env.BILLING_SERVICE_URL = 'http://billing.test';
  mockPrisma.managementLastSeen.findUnique.mockResolvedValue(null);
  mockPrisma.insightState.findMany.mockResolvedValue([]);
  mockPrisma.insightDecision.createMany.mockResolvedValue({ count: 0 });
  mockPrisma.$executeRaw.mockResolvedValue(0);
  mockGenerateStructured.mockReset();

  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.MANAGEMENT_COPILOT_ENABLED;
  delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  delete process.env.LEAD_SERVICE_URL;
  delete process.env.BILLING_SERVICE_URL;
});

describe('an invoice question asked from the leads page', () => {
  it('answers with an invoice number instead of refusing', async () => {
    stubServices({ invoiceNumber: 'INV-202608-00027' });
    // A fresh function per call: the same array serves both generations.
    mockGenerateStructured.mockImplementation(async () => {
      const step = mockGenerateStructured.mock.calls.length - 1;
      return answerNamingTheInvoice[step] ?? answerNamingTheInvoice[1];
    });

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.answerBlocks).toHaveLength(1);
    // The regression: this used to be `limitation:ungrounded` because the prose
    // named a document number.
    expect(res.body.answerBlocks[0].id).not.toBe('limitation:ungrounded');
    expect(res.body.answerBlocks[0].text).toContain('INV-202608-00027');
  });

  it('still refuses a document number nothing it read carries', async () => {
    // Same claim, same tool call — but the read never returned this number, so
    // the token resolves to nothing and the claim must not be allowed through.
    stubServices({ invoiceNumber: 'INV-202608-00099' });
    mockGenerateStructured.mockImplementation(async () => {
      const step = mockGenerateStructured.mock.calls.length - 1;
      return answerNamingTheInvoice[step] ?? answerNamingTheInvoice[1];
    });

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.answerBlocks).toHaveLength(1);
    expect(res.body.answerBlocks[0].id).toBe('limitation:ungrounded');
  });

  it('never claims a limit of the page in the dead end', async () => {
    stubServices({ invoiceNumber: 'INV-202608-00099' });
    mockGenerateStructured.mockImplementation(async () => {
      const step = mockGenerateStructured.mock.calls.length - 1;
      return answerNamingTheInvoice[step] ?? answerNamingTheInvoice[1];
    });

    const res = await ask();

    const text = res.body.answerBlocks[0].text;
    expect(text).not.toMatch(/this page/i);
    // The honest version names what the service CAN read instead.
    expect(text).toMatch(/any page/);
  });
  it('answers a count question, dropping an uncitable fact rather than the answer', async () => {
    // Three open invoices, one of them not yet due: the tool states both figures.
    stubCompleteInvoices();
    scriptModel(answerStating('3 invoices are unpaid or part-paid, and 2 of them are overdue.', ['3', '2']));

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.answerBlocks).toHaveLength(1);
    expect(res.body.answerBlocks[0].id).not.toBe('limitation:ungrounded');
    expect(res.body.answerBlocks[0].text).toContain('2 of them are overdue');
    // The facts could not be cited, so they are gone. The claim is not.
    expect(res.body.answerBlocks[0].facts).toEqual([]);
  });

  it('still refuses a count the read did not carry', async () => {
    stubCompleteInvoices();
    // The read states 3 open and 2 overdue. A fact may not smuggle in a fourth,
    // which is the rule this fix must not weaken.
    scriptModel(answerStating('4 invoices are unpaid or part-paid.', ['4']));

    const res = await ask();

    expect(res.body.answerBlocks).toHaveLength(1);
    expect(res.body.answerBlocks[0].id).toBe('limitation:ungrounded');
  });
});
