import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { runAgentLoop } = await import('../agentRunner.js');
const {
  managementAnswerResponseJsonSchema,
  managementSingleShotResponseJsonSchema,
} = await import('../prompts/managementAnswer.v1.js');

const ctx = {
  user: { id: 'rep-1', role: 'salesRep' },
  headers: { 'x-user-id': 'rep-1', 'x-user-role': 'salesRep' },
};

const base = {
  ctx,
  scopeLabel: 'Leads',
  question: 'Which leads need attention?',
  evidence: [{ id: 'lead:lead-1:lifecycleStatus', type: 'record', label: 'Lead lead-1 · lifecycleStatus', value: 'NEW' }],
};

const LEAD_ROWS = {
  success: true,
  data: [{ id: 'lead-1', lifecycleStatus: 'NEW', assignedToId: 'rep-1', name: 'Jane', destination: 'Bali', budget: 450000, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-08T00:00:00Z' }],
};

let realFetch;

beforeEach(() => {
  process.env.LEAD_SERVICE_URL = 'http://lead.test';
  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.LEAD_SERVICE_URL;
  vi.restoreAllMocks();
});

function stubFetch(body) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
}

describe('tool vocabulary comes from the passed list (S1)', () => {
  it('advertises exactly the passed tools in the prompt', async () => {
    const calls = [];
    const generateStructured = vi.fn(async (args) => {
      calls.push(args);
      return { tool: 'final_answer', args: { claims: [] } };
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    expect(calls).toHaveLength(1);
    expect(calls[0].prompt).toContain('- listLeads:');
    expect(calls[0].prompt).not.toContain('- listInvoices:');
    expect(calls[0].prompt).not.toContain('- getLead:');
    expect(calls[0].schema).toBe(managementAnswerResponseJsonSchema);
    // The model concluded with no claims, which is a fact about the ANSWER, not a
    // fault — so it reports `no-final-answer` rather than a generation failure.
    expect(result).toEqual({ answerBlocks: [], toolEvidence: [], reason: 'no-final-answer' });
  });

  it('advertises every resolved tool when the scope declares several', async () => {
    const calls = [];
    const generateStructured = vi.fn(async (args) => {
      calls.push(args);
      return { tool: 'final_answer', args: { claims: [] } };
    });

    await runAgentLoop({ ...base, tools: ['getLead', 'listLeads'], generateStructured });

    expect(calls[0].prompt).toContain('- getLead:');
    expect(calls[0].prompt).toContain('- listLeads:');
  });

  it('rejects a tool outside the resolved list, feeds the error back, and never executes it', async () => {
    const fetchSpy = stubFetch(LEAD_ROWS);
    globalThis.fetch = fetchSpy;

    const calls = [];
    let step = 0;
    const generateStructured = vi.fn(async (args) => {
      calls.push(args);
      return step++ === 0
        ? { tool: 'listInvoices', args: { limit: 1 } }
        : { tool: 'final_answer', args: { claims: [] } };
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(calls[1].prompt).toContain("unknown tool 'listInvoices'");
    expect(result.toolEvidence).toHaveLength(1);
    expect(result.toolEvidence[0].id).toBe('tool:listInvoices:1');
    expect(result.toolEvidence[0].value).toEqual({ error: "unknown tool 'listInvoices'" });
  });

  it('caps the TOOL calls at three, then forces one answer', async () => {
    globalThis.fetch = stubFetch(LEAD_ROWS);
    const generateStructured = vi.fn(async () => ({ tool: 'listLeads', args: { limit: 1 } }));

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    // Three tool executions plus the forced answer. A stub that only ever returns
    // tool calls therefore costs four generations, and the fourth cannot be
    // dodged into a fourth tool.
    expect(generateStructured).toHaveBeenCalledTimes(4);
    expect(result.answerBlocks).toEqual([]);
    expect(result.toolEvidence).toHaveLength(3);
  });

  it('forces a final answer after the tool budget instead of ending empty', async () => {
    globalThis.fetch = stubFetch(LEAD_ROWS);
    const claim = {
      id: 'a1',
      section: 'current_state',
      text: 'One lead in this scope is new.',
      facts: [],
      evidenceIds: [],
      evidenceType: 'computed',
      severity: 'info',
    };
    let step = 0;
    const calls = [];
    const generateStructured = vi.fn(async (args) => {
      calls.push(args);
      return step++ < 3 ? { tool: 'listLeads', args: { limit: 1 } } : { claims: [claim] };
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    expect(calls).toHaveLength(4);
    // Claims-only schema and a prompt with no tool block: the model is told the
    // budget is gone, so it cannot answer by starting a gather it will not get.
    expect(calls[3].schema).toBe(managementSingleShotResponseJsonSchema);
    expect(calls[3].prompt).toMatch(/tool budget is spent/i);
    expect(calls[3].prompt).not.toContain('Available tools:');
    // The gathered rows reach the forced answer, which is the whole point.
    expect(calls[3].prompt).toContain('Tool results:');
    expect(result.answerBlocks).toEqual([claim]);
  });

  it('still ends empty when the forced answer itself fails', async () => {
    globalThis.fetch = stubFetch(LEAD_ROWS);
    let step = 0;
    const generateStructured = vi.fn(async () => {
      if (step++ < 3) return { tool: 'listLeads', args: { limit: 1 } };
      throw new Error('provider down');
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    // No fabricated fallback: an answer nobody produced stays absent, and the
    // controller turns that into an honest limitation instead.
    expect(result.answerBlocks).toEqual([]);
    expect(result.toolEvidence).toHaveLength(3);
  });

  it('keeps the prompt under a stated budget after a full-cap tool result', async () => {
    const rows = Array.from({ length: 1050 }, (_, i) => ({
      id: `lead-${i}`,
      lifecycleStatus: 'NEW',
      assignedToId: 'rep-1',
      name: 'A'.repeat(120),
      destination: 'Bali',
      budget: 450000,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-08T00:00:00Z',
    }));
    globalThis.fetch = stubFetch({ success: true, count: rows.length, total: rows.length, data: rows });

    const calls = [];
    let step = 0;
    const generateStructured = vi.fn(async (args) => {
      calls.push(args);
      return step++ === 0
        ? { tool: 'listLeads', args: { limit: 1000 } }
        : { tool: 'final_answer', args: { claims: [] } };
    });

    await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    // 64_000 is the tool's declared result budget; the prompt adds the fixed
    // instructions, the scope/question and the bundle evidence.
    expect(calls[1].prompt.length).toBeLessThan(100_000);
  });

  it('returns [] for answerBlocks when the final answer carries no claims', async () => {
    const generateStructured = vi.fn(async () => ({ tool: 'final_answer', args: {} }));
    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });
    expect(result.answerBlocks).toEqual([]);
  });
});

describe('the zero-tool single-shot path (S2)', () => {
  it('makes one call, with no tool block and no tool field in the schema', async () => {
    const calls = [];
    const generateStructured = vi.fn(async (args) => {
      calls.push(args);
      return { claims: [] };
    });

    const result = await runAgentLoop({ ...base, tools: [], generateStructured });

    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(calls[0].prompt).not.toContain('Available tools:');
    expect(calls[0].prompt).not.toContain('final_answer');
    expect(calls[0].schema).toBe(managementSingleShotResponseJsonSchema);
    expect(calls[0].schema.properties.tool).toBeUndefined();
    expect(calls[0].schema.required).toEqual(['claims']);
    expect(result).toEqual({ answerBlocks: [], toolEvidence: [], reason: 'no-final-answer' });
  });

  it('runs single-shot when the resolved list names no known tool', async () => {
    const calls = [];
    const generateStructured = vi.fn(async (args) => {
      calls.push(args);
      return { claims: [] };
    });

    await runAgentLoop({ ...base, tools: ['notATool'], generateStructured });

    expect(calls[0].schema).toBe(managementSingleShotResponseJsonSchema);
  });

  it('passes returned claims through as answerBlocks', async () => {
    const claim = {
      id: 'a1',
      section: 'current_state',
      text: 'The lead is new.',
      facts: [],
      evidenceIds: ['lead:lead-1:lifecycleStatus'],
      evidenceType: 'record',
      severity: 'info',
    };
    const generateStructured = vi.fn(async () => ({ claims: [claim] }));

    const result = await runAgentLoop({ ...base, tools: [], generateStructured });

    expect(result.answerBlocks).toEqual([claim]);
    expect(result.toolEvidence).toEqual([]);
  });

  it('returns the empty answer payload when generation fails', async () => {
    const generateStructured = vi.fn().mockRejectedValue(new Error('not configured'));
    const result = await runAgentLoop({ ...base, tools: [], generateStructured });
    // The provider failed, so nothing can be concluded about the page — the
    // controller turns this into a retry-shaped message, never a capability claim.
    expect(result).toEqual({ answerBlocks: [], toolEvidence: [], reason: 'generation-failed' });
  });
});

describe('one overall loop budget (T2)', () => {
  it('derives each iteration timeout from what remains, never reaching zero', async () => {
    let clock = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    globalThis.fetch = stubFetch(LEAD_ROWS);

    const timeouts = [];
    let step = 0;
    const generateStructured = vi.fn(async (args) => {
      timeouts.push(args.timeoutMs);
      clock += 5_000; // each generation consumes 5s of the one budget
      return step++ < 2
        ? { tool: 'listLeads', args: { limit: 1 } }
        : { tool: 'final_answer', args: { claims: [] } };
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    // Tool rounds draw on the budget MINUS the answer reserve (6s of the 17s), so
    // the last of them stops 6s short and the forced answer always has time to
    // run. Before the reserve, every live ask spent the whole budget gathering and
    // the answer never happened.
    expect(timeouts).toEqual([11_000, 6_000, 1_000]);
    expect(timeouts.every((ms) => ms > 0 && ms <= 11_000)).toBe(true);
    expect(result.answerBlocks).toEqual([]);
  });

  it('bounds each tool read with a signal derived from the remaining budget', async () => {
    const signals = [];
    globalThis.fetch = vi.fn(async (_url, init) => {
      signals.push(init.signal);
      return { ok: true, status: 200, json: async () => LEAD_ROWS };
    });

    let step = 0;
    const generateStructured = vi.fn(async () =>
      step++ === 0 ? { tool: 'listLeads', args: { limit: 1 } } : { tool: 'final_answer', args: { claims: [] } },
    );

    await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    expect(signals).toHaveLength(1);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0].aborted).toBe(false);
  });

  it('stops instead of starting another call once the budget is exhausted', async () => {
    let clock = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    globalThis.fetch = stubFetch(LEAD_ROWS);

    const generateStructured = vi.fn(async () => {
      clock += 20_000; // the first call alone outlives the whole budget
      return { tool: 'listLeads', args: { limit: 1 } };
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(result.answerBlocks).toEqual([]);
    expect(result.toolEvidence).toHaveLength(1);
  });

  it('does not spend the last sliver on a call that cannot complete', async () => {
    let clock = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    globalThis.fetch = stubFetch(LEAD_ROWS);

    const generateStructured = vi.fn(async () => {
      clock += 16_500;
      return { tool: 'listLeads', args: { limit: 1 } };
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(result.answerBlocks).toEqual([]);
  });

  it('returns the empty answer payload when generation fails mid-loop', async () => {
    globalThis.fetch = stubFetch(LEAD_ROWS);
    let step = 0;
    const generateStructured = vi.fn(async () => {
      if (step++ === 0) return { tool: 'listLeads', args: { limit: 1 } };
      throw new Error('provider down');
    });

    const result = await runAgentLoop({ ...base, tools: ['listLeads'], generateStructured });

    expect(result.answerBlocks).toEqual([]);
    expect(result.toolEvidence).toHaveLength(1);
  });
});
