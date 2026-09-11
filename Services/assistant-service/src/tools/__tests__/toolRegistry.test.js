import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockDomainAuthHeader } = vi.hoisted(() => ({ mockDomainAuthHeader: vi.fn() }));

// The audience bug is invisible off Cloud Run: `domainAuthHeader` returns `{}`
// whenever K_SERVICE is unset, so a wrong audience passes locally. Mocking the
// seam is the only way to assert which base URL each tool mints its token for.
vi.mock('../../utils/cloudRunAuth.js', () => ({ domainAuthHeader: mockDomainAuthHeader }));

const { executeTool, getTool, toolNames, domainTools, MAX_TOOL_ROWS } = await import('../toolRegistry.js');
const { serializeToolResult } = await import('../../ai/prompts/managementAnswer.v1.js');

const LEAD = 'http://lead.test';
const BILLING = 'http://billing.test';

const ctx = {
  user: { id: 'rep-1', role: 'salesRep' },
  headers: { 'x-user-id': 'rep-1', 'x-user-role': 'salesRep', 'x-user-permissions': '[]' },
};

let realFetch;

beforeEach(() => {
  process.env.LEAD_SERVICE_URL = LEAD;
  process.env.BILLING_SERVICE_URL = BILLING;
  mockDomainAuthHeader.mockReset();
  mockDomainAuthHeader.mockResolvedValue({ Authorization: 'Bearer test-token' });
  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.LEAD_SERVICE_URL;
  delete process.env.BILLING_SERVICE_URL;
});

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function captureFetch(body, status = 200) {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse(body, status);
  });
  return calls;
}

describe('every tool declares its bound', () => {
  it('declares a projection, a row cap, a byte budget and a schema', () => {
    for (const tool of domainTools) {
      expect(Array.isArray(tool.projection), `${tool.name} projection`).toBe(true);
      expect(tool.projection.length, `${tool.name} projection`).toBeGreaterThan(0);
      expect(Number.isInteger(tool.rowCap) && tool.rowCap > 0, `${tool.name} rowCap`).toBe(true);
      expect(tool.rowCap, `${tool.name} rowCap must not exceed the engine ceiling`).toBeLessThanOrEqual(MAX_TOOL_ROWS);
      expect(tool.resultByteBudget, `${tool.name} byte budget`).toBeGreaterThan(0);
      expect(typeof tool.argsSchema?.safeParse).toBe('function');
    }
    expect(toolNames()).toEqual(['getLead', 'listLeads', 'listInvoices']);
  });

  it('declares no non-GET tool', () => {
    // The read-only boundary is a property of the registry, not of a comment:
    // every tool executes through the GET-only `fetchJson` helper, and no tool
    // carries a method/body/mutation field at all.
    for (const tool of domainTools) {
      expect(tool.method, `${tool.name} must not choose a method`).toBeUndefined();
      expect(tool.body, `${tool.name} must not carry a body`).toBeUndefined();
    }
  });
});

describe('resolution honours the passed vocabulary', () => {
  it('rejects a tool the caller did not resolve, without executing it', async () => {
    const fetchCalls = captureFetch({ success: true, data: [] });
    const result = await executeTool('listInvoices', { limit: 1 }, ctx, ['listLeads']);
    expect(result).toEqual({ error: "unknown tool 'listInvoices'" });
    expect(fetchCalls).toHaveLength(0);
  });

  it('rejects an unknown name', async () => {
    const result = await executeTool('nope', {}, ctx, ['listLeads']);
    expect(result).toEqual({ error: "unknown tool 'nope'" });
  });

  it('rejects everything when no vocabulary is passed (fail closed)', async () => {
    const result = await executeTool('listLeads', {}, ctx, []);
    expect(result).toEqual({ error: "unknown tool 'listLeads'" });
  });
});

describe('argument validation', () => {
  it.each([
    ['listLeads', { limit: 0 }],
    ['listLeads', { limit: -3 }],
    ['listLeads', { limit: MAX_TOOL_ROWS + 1 }],
    ['listLeads', { limit: 1.5 }],
    ['listLeads', { limit: '5' }],
    ['listLeads', { limit: 5, sort: 'name' }],
    ['listInvoices', { limit: 0 }],
    ['getLead', {}],
    ['getLead', { leadId: '' }],
  ])('%s rejects %j', async (name, args) => {
    const result = await executeTool(name, args, ctx, [name]);
    expect(result.error).toMatch(new RegExp(`^invalid args for ${name}:`));
  });

  it('clamps the default list page rather than requesting the cap', async () => {
    const fetchCalls = captureFetch({ success: true, data: [] });
    await executeTool('listLeads', {}, ctx, ['listLeads']);
    expect(fetchCalls[0].url).toBe(`${LEAD}/api/v1/leads?limit=50`);
  });
});

describe('failure classification', () => {
  it.each([
    [403, { notAuthorized: true }],
    [404, { notAuthorized: true }],
    [500, { unavailable: true }],
    [503, { unavailable: true }],
  ])('maps HTTP %i for listLeads', async (status, expected) => {
    captureFetch({}, status);
    const result = await executeTool('listLeads', { limit: 1 }, ctx, ['listLeads']);
    expect(result).toEqual(expected);
  });

  it('maps a 403 for listInvoices to notAuthorized', async () => {
    captureFetch({}, 403);
    const result = await executeTool('listInvoices', { limit: 1 }, ctx, ['listInvoices']);
    expect(result).toEqual({ notAuthorized: true });
  });

  it('maps a network failure to unavailable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const result = await executeTool('listInvoices', { limit: 1 }, ctx, ['listInvoices']);
    expect(result).toEqual({ unavailable: true });
  });

  it('aborts a stalled read through the passed signal and degrades to unavailable', async () => {
    const controller = new AbortController();
    const seen = [];
    globalThis.fetch = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          seen.push(init.signal);
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );

    const pending = executeTool('listLeads', { limit: 1 }, ctx, ['listLeads'], controller.signal);
    // Let the tool reach `fetch` before aborting, so the in-flight read observes
    // the abort rather than racing the token mint.
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    await expect(pending).resolves.toEqual({ unavailable: true });
    // The loop's signal itself reaches fetch — not a re-derived one.
    expect(seen).toEqual([controller.signal]);
  });

  it('maps a throwing token mint to unavailable rather than bubbling', async () => {
    mockDomainAuthHeader.mockRejectedValue(new Error('no metadata server'));
    const result = await executeTool('getLead', { leadId: 'lead-1' }, ctx, ['getLead']);
    expect(result).toEqual({ unavailable: true });
  });
});

describe('the token audience follows the target service (S4)', () => {
  it('mints a lead-audience token and fetches the lead service for listLeads', async () => {
    mockDomainAuthHeader.mockImplementation(async (base) => ({ Authorization: `Bearer ${base}` }));
    const fetchCalls = captureFetch({ success: true, data: [] });

    await executeTool('listLeads', { limit: 1 }, ctx, ['listLeads']);

    expect(mockDomainAuthHeader).toHaveBeenCalledWith(LEAD);
    expect(fetchCalls[0].url).toBe(`${LEAD}/api/v1/leads?limit=1`);
    expect(fetchCalls[0].init.headers.Authorization).toBe(`Bearer ${LEAD}`);
  });

  it('mints a billing-audience token and fetches the billing service for listInvoices', async () => {
    mockDomainAuthHeader.mockImplementation(async (base) => ({ Authorization: `Bearer ${base}` }));
    const fetchCalls = captureFetch({ success: true, data: [] });

    await executeTool('listInvoices', { limit: 1 }, ctx, ['listInvoices']);

    expect(mockDomainAuthHeader).toHaveBeenCalledWith(BILLING);
    expect(fetchCalls[0].url).toBe(`${BILLING}/api/v1/billing/invoices?limit=${MAX_TOOL_ROWS}`);
    expect(fetchCalls[0].init.headers.Authorization).toBe(`Bearer ${BILLING}`);
  });

  it('forwards the caller identity headers alongside the platform token', async () => {
    const fetchCalls = captureFetch({ success: true, data: [] });
    await executeTool('getLead', { leadId: 'lead-1' }, ctx, ['getLead']);
    expect(fetchCalls[0].init.headers['x-user-id']).toBe('rep-1');
    expect(fetchCalls[0].init.headers['x-user-role']).toBe('salesRep');
    // A 3xx must never be followed with the caller's forwarded identity
    // attached to whatever origin the response names.
    expect(fetchCalls[0].init.redirect).toBe('error');
  });

  it('forwards the loop abort signal into every tool fetch', async () => {
    const fetchCalls = captureFetch({ success: true, data: [] });
    const signal = AbortSignal.timeout(1_000);
    await executeTool('listLeads', { limit: 1 }, ctx, ['listLeads'], signal);
    expect(fetchCalls[0].init.signal).toBe(signal);
  });
});

describe('listLeads projection, cap and byte budget (S5)', () => {
  it('projects only the allowlisted fields', async () => {
    captureFetch({
      success: true,
      data: [
        {
          id: 'lead-1',
          lifecycleStatus: 'NEW',
          assignedToId: 'rep-1',
          name: 'Jane',
          destination: 'Bali',
          budget: 450000,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-08T00:00:00Z',
          passwordHash: 'SHOULD-NOT-LEAK',
          bankDetails: 'SHOULD-NOT-LEAK',
        },
      ],
    });

    const result = await executeTool('listLeads', { limit: 1 }, ctx, ['listLeads']);

    expect(result.data).toHaveLength(1);
    expect(Object.keys(result.data[0]).sort()).toEqual([...getTool('listLeads').projection].sort());
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|bankDetails|SHOULD-NOT-LEAK/);
  });

  it('enforces the declared row cap', async () => {
    captureFetch({ success: true, data: Array.from({ length: 10 }, (_, i) => ({ id: `lead-${i}` })) });

    const tool = getTool('listLeads');
    const originalCap = tool.rowCap;
    tool.rowCap = 3;
    try {
      const result = await executeTool('listLeads', { limit: MAX_TOOL_ROWS }, ctx, ['listLeads']);
      expect(result.data).toHaveLength(3);
      expect(result.truncated).toBe(true);
    } finally {
      tool.rowCap = originalCap;
    }
  });

  it('counts UTF-8 bytes, not UTF-16 code units, so a non-ASCII page stays within the budget', async () => {
    // `.length` under-counts CJK/emoji by up to ~3x: a page of them could pass a
    // 64_000 code-unit check while serializing to well over 100_000 bytes.
    const rows = Array.from({ length: MAX_TOOL_ROWS + 50 }, (_, i) => ({
      id: `lead-${i}`,
      lifecycleStatus: 'NEW',
      assignedToId: 'rep-1',
      name: '旅行者🧳'.repeat(20),
      destination: '京都',
      budget: 450000,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-08T00:00:00Z',
    }));
    captureFetch({ success: true, count: rows.length, total: rows.length, data: rows });

    const tool = getTool('listLeads');
    const result = await executeTool('listLeads', { limit: MAX_TOOL_ROWS }, ctx, ['listLeads']);

    expect(Buffer.byteLength(serializeToolResult('listLeads', result), 'utf8')).toBeLessThanOrEqual(tool.resultByteBudget);
    expect(result.data.length).toBeLessThanOrEqual(tool.rowCap);
    expect(result.truncated).toBe(true);
  });
});

describe('getLead reads one encoded, allowlisted record', () => {
  it('encodes the lead id into the request path', async () => {
    const fetchCalls = captureFetch({ success: true, data: { id: 'a/../b' } });

    await executeTool('getLead', { leadId: 'a/../b' }, ctx, ['getLead']);

    expect(fetchCalls[0].url).toBe(`${LEAD}/api/v1/leads/a%2F..%2Fb`);
  });

  it('projects only the allowlisted fields', async () => {
    captureFetch({
      success: true,
      data: {
        id: 'lead-1',
        lifecycleStatus: 'NEW',
        name: 'Jane',
        passwordHash: 'SHOULD-NOT-LEAK',
        bankDetails: 'SHOULD-NOT-LEAK',
      },
    });

    const result = await executeTool('getLead', { leadId: 'lead-1' }, ctx, ['getLead']);

    expect(result.data).toHaveLength(1);
    expect(Object.keys(result.data[0]).sort()).toEqual([...getTool('getLead').projection].sort());
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|bankDetails|SHOULD-NOT-LEAK/);
  });

  it('maps a 403 to notAuthorized', async () => {
    captureFetch({}, 403);
    const result = await executeTool('getLead', { leadId: 'lead-1' }, ctx, ['getLead']);
    expect(result).toEqual({ notAuthorized: true });
  });
});

describe('listInvoices filters, orders and derives overdue (S5)', () => {
  const NOW = Date.now();
  const past = (days) => new Date(NOW - days * 86_400_000).toISOString();
  const future = (days) => new Date(NOW + days * 86_400_000).toISOString();

  function invoice(overrides) {
    return {
      id: 'inv-0',
      invoiceNumber: 'INV-0',
      customerEmail: 'a@example.com',
      leadId: 'lead-1',
      currency: 'USD',
      paymentStatus: 'unpaid',
      totalAmount: 1000,
      paidAmount: 0,
      outstandingAmount: 1000,
      dueDate: past(10),
      status: 'sent',
      remindersSent: 2,
      viewedAt: past(2),
      ...overrides,
    };
  }

  it('returns only unpaid/part-paid rows, ordered by dueDate ascending, with a derived overdue flag', async () => {
    captureFetch({
      success: true,
      data: [
        invoice({ id: 'inv-paid', paymentStatus: 'paid', dueDate: past(30) }),
        invoice({ id: 'inv-partial', paymentStatus: 'partial', dueDate: past(5) }),
        invoice({ id: 'inv-late', paymentStatus: 'unpaid', dueDate: past(20) }),
        invoice({ id: 'inv-future', paymentStatus: 'unpaid', dueDate: future(3) }),
        invoice({ id: 'inv-refunded', paymentStatus: 'refunded', dueDate: past(1) }),
      ],
    });

    const result = await executeTool('listInvoices', {}, ctx, ['listInvoices']);

    expect(result.data.map((row) => row.id)).toEqual(['inv-late', 'inv-partial', 'inv-future']);
    expect(result.data.map((row) => row.overdue)).toEqual([true, true, false]);
    expect(result.truncated).toBeUndefined();
  });

  it('never trusts the document status for payment truth and drops unprojected fields', async () => {
    captureFetch({
      success: true,
      data: [invoice({ id: 'inv-1', paymentStatus: 'unpaid', status: 'cancelled', remindersSent: 9 })],
    });

    const result = await executeTool('listInvoices', { limit: 1 }, ctx, ['listInvoices']);

    expect(result.data[0].paymentStatus).toBe('unpaid');
    expect(Object.keys(result.data[0]).sort()).toEqual([...getTool('listInvoices').projection].sort());
    expect(JSON.stringify(result)).not.toMatch(/remindersSent|"status"/);
  });

  it('honours the caller limit after ordering, so "the three most overdue" is correct', async () => {
    captureFetch({
      success: true,
      data: [
        invoice({ id: 'inv-a', dueDate: past(2) }),
        invoice({ id: 'inv-b', dueDate: past(40) }),
        invoice({ id: 'inv-c', dueDate: past(10) }),
      ],
    });

    const result = await executeTool('listInvoices', { limit: 2 }, ctx, ['listInvoices']);
    expect(result.data.map((row) => row.id)).toEqual(['inv-b', 'inv-c']);
  });

  it('sorts a row with an unparseable dueDate last, not first', async () => {
    captureFetch({
      success: true,
      data: [
        invoice({ id: 'inv-nodate', dueDate: null }),
        invoice({ id: 'inv-dated', dueDate: past(1) }),
      ],
    });

    const result = await executeTool('listInvoices', {}, ctx, ['listInvoices']);
    expect(result.data.map((row) => row.id)).toEqual(['inv-dated', 'inv-nodate']);
    expect(result.data[1].overdue).toBe(false);
  });
});
