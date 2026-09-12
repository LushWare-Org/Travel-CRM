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

// ─── The wedge ────────────────────────────────────────────────────────────
// "Which destinations have the most leads?" used to be unanswerable twice over:
// the page could not group, and any answer containing a digit was deleted by the
// validator. This is the end-to-end proof that the number now survives: rows are
// grouped before generation, the group becomes citation-capable evidence, and a
// claim stating the count validates against it.

const authHeaders = {
  'x-user-id': 'rep-1',
  'x-user-role': 'admin',
  'x-user-permissions': '[]',
  'x-user-is-super-admin': 'true',
};

const DAY = 86_400_000;
const OLD = new Date(Date.now() - 30 * DAY).toISOString();

const lead = (index, destination) => ({
  id: `lead-${index}`,
  name: `Synthetic ${index}`,
  lifecycleStatus: 'NEW',
  assignedToId: 'rep-1',
  destination,
  source: 'website',
  platform: 'web',
  budget: 1000 + index,
  createdAt: OLD,
  updatedAt: OLD,
});

// 12 Bali, 8 Dubai, 2 Paris — and Paris is below the minimum group size, so the
// aggregate must drop it and count it rather than showing it.
const LEADS = [
  ...Array.from({ length: 12 }, (_, i) => lead(i, 'Bali')),
  ...Array.from({ length: 8 }, (_, i) => lead(100 + i, 'Dubai')),
  ...Array.from({ length: 2 }, (_, i) => lead(200 + i, 'Paris')),
];

const BALI_GROUP_ID = 'leads:aggregate:leads:destination:Bali:value';
const DUBAI_GROUP_ID = 'leads:aggregate:leads:destination:Dubai:value';

let realFetch;

beforeEach(() => {
  process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
  process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'leads';
  process.env.LEAD_SERVICE_URL = 'http://lead.test';
  mockPrisma.managementLastSeen.findUnique.mockResolvedValue(null);
  mockPrisma.insightState.findMany.mockResolvedValue([]);
  mockPrisma.insightDecision.createMany.mockResolvedValue({ count: 0 });
  mockPrisma.$executeRaw.mockResolvedValue(0);
  mockGenerateStructured.mockReset();

  realFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({ success: true, data: LEADS, pagination: { total: LEADS.length } }),
        ),
    }),
  );
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.MANAGEMENT_COPILOT_ENABLED;
  delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  delete process.env.LEAD_SERVICE_URL;
});

const ask = (question) =>
  request(app)
    .post('/api/v1/assistant/management/turn')
    .set(authHeaders)
    .send({
      mode: 'ask',
      page: { key: 'leads', scope: {}, since: '7_days' },
      messages: [{ role: 'user', content: question }],
    });

const promptOf = (callIndex = 0) => String(mockGenerateStructured.mock.calls[callIndex]?.[0]?.prompt ?? '');

describe('a counting question gets groupable evidence before the model runs', () => {
  it('puts the grouped destinations in the prompt the model sees', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'final_answer', args: { claims: [] } });

    await ask('which destinations have the most leads?');

    const prompt = promptOf();
    expect(prompt).toContain(BALI_GROUP_ID);
    expect(prompt).toContain('"value":12');
  });

  it('does not precompute for a question that is not a counting one', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'final_answer', args: { claims: [] } });

    await ask('is the deposit paid?');

    expect(promptOf()).not.toContain(BALI_GROUP_ID);
  });

  it('does not precompute when the operator does not name a field', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'final_answer', args: { claims: [] } });

    await ask('how many leads are there?');

    // No named field means no grouping: guessing one produces a confident answer
    // to a question nobody asked.
    expect(promptOf()).not.toContain('aggregate');
  });

  it('ACCEPTS an answer that states the count, which is the whole point', async () => {
    mockGenerateStructured.mockResolvedValue({
      tool: 'final_answer',
      args: {
        claims: [
          {
            id: 'a1',
            section: 'experienced_view',
            text: 'Bali leads demand with 12 open leads, ahead of Dubai at 8.',
            // BOTH numbers are declared. The first version of this test declared
            // only 12 and the claim was correctly refused for the unsupported
            // 8 — a claim may state a number only when it also states it as a
            // fact, per number.
            facts: [
              { kind: 'count', value: '12', derivation: 'grouped-by', evidenceId: BALI_GROUP_ID },
              { kind: 'count', value: '8', derivation: 'grouped-by', evidenceId: DUBAI_GROUP_ID },
            ],
            evidenceIds: [BALI_GROUP_ID, DUBAI_GROUP_ID],
            evidenceType: 'computed',
            severity: 'info',
          },
        ],
      },
    });

    const res = await ask('which destinations have the most leads?');

    expect(res.status).toBe(200);
    expect(res.body.answerBlocks).toHaveLength(1);
    expect(res.body.answerBlocks[0].text).toContain('12');
  });

  it('still refuses an answer whose number has nothing behind it', async () => {
    mockGenerateStructured.mockResolvedValue({
      tool: 'final_answer',
      args: {
        claims: [
          {
            id: 'a1',
            section: 'experienced_view',
            text: 'Bali leads demand with 99 open leads.',
            facts: [],
            evidenceIds: [BALI_GROUP_ID],
            evidenceType: 'computed',
            severity: 'info',
          },
        ],
      },
    });

    const res = await ask('which destinations have the most leads?');

    // 99 resolves to nothing the claim cites, so the claim goes. The relaxation
    // allowed supported numbers, not any number.
    expect(res.body.answerBlocks).toHaveLength(1);
    expect(res.body.answerBlocks[0].id).toBe('limitation:ungrounded');
    // The refused number must not survive inside the limitation notice either.
    expect(res.body.answerBlocks[0].text).not.toContain('99');
  });

  it('leaves a non-counting question on the tool path it had before', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'final_answer', args: { claims: [] } });

    const res = await ask('is the deposit paid?');

    expect(res.status).toBe(200);
    // One loop step, exactly as before the aggregate existed.
    expect(mockGenerateStructured).toHaveBeenCalledTimes(1);
  });
});
