import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';
import { pageEvidenceId } from '@travel-crm/contracts';

// The engine's failure paths are the point of this suite. Every one of them
// produces a WRONG BRIEFING rather than an error if it is wrong, which is why
// each is asserted explicitly rather than left to integration.

const BASE = 'http://billing.test';

function descriptor(overrides = {}) {
  return {
    key: 'billing',
    scopeSchema: z.object({}).strict(),
    scopeLabel: () => 'Billing',
    sources: [
      {
        name: 'invoices',
        envKey: 'BILLING_SERVICE_URL',
        path: '/api/v1/billing/invoices?limit=200',
        listPath: 'data',
        recordKind: 'invoice',
        idField: 'id',
        fields: ['id', 'status', 'paymentStatus', 'dueDate', 'outstandingAmount', 'customerEmail'],
        label: 'Invoices',
        paging: { param: 'limit', defaultLimit: 200, totalPath: 'total' },
      },
    ],
    aggregates: [
      { name: 'invoices-past-due', op: 'countWhere', field: 'dueDate', cmp: 'ltNow', label: 'Past due' },
      { name: 'outstanding-total', op: 'sumWhere', sumField: 'outstandingAmount', label: 'Outstanding' },
    ],
    rules: [
      {
        rule: 'overdueBy',
        field: 'dueDate',
        statusField: 'paymentStatus',
        statuses: ['unpaid', 'partial'],
        section: 'attention',
        text: 'Past due and unsettled.',
      },
    ],
    questionTemplates: ['What should I chase first?'],
    ...overrides,
  };
}

const ctx = { user: { id: 'rep-1', role: 'admin' }, headers: { 'x-user-id': 'rep-1' } };

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function invoice(id, overrides = {}) {
  return {
    id,
    status: 'sent',
    paymentStatus: 'unpaid',
    dueDate: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    outstandingAmount: 100,
    customerEmail: 'sam@acme.test',
    ...overrides,
  };
}

const listBody = (rows, total = rows.length) => ({ success: true, count: rows.length, total, data: rows });

let restoreFetch;

beforeEach(() => {
  process.env.BILLING_SERVICE_URL = BASE;
  restoreFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = restoreFetch;
  delete process.env.BILLING_SERVICE_URL;
  delete process.env.MANAGEMENT_DETERMINISTIC_SOURCE_TIMEOUT_MS;
  delete process.env.MANAGEMENT_MAX_FETCH_BYTES;
  delete process.env.MANAGEMENT_MAX_FETCH_ROWS;
  delete process.env.MANAGEMENT_MAX_EVIDENCE;
  vi.restoreAllMocks();
});

describe('happy path', () => {
  it('projects allowlisted fields, cites them, and emits a per-source baseline', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([invoice('inv-1')])));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });

    expect(bundle.records).toHaveLength(1);
    expect(bundle.attemptedSources).toEqual(['invoices']);
    expect(bundle.unavailableSources).toEqual([]);
    expect(bundle.notAuthorizedSources).toEqual([]);

    const cited = pageEvidenceId('billing', 'invoice', 'inv-1', 'dueDate');
    expect(bundle.index['inv-1'].dueDate).toBe(cited);
    expect(bundle.evidence.map((e) => e.id)).toContain(cited);
  });

  it('never puts a field outside the allowlist into evidence', async () => {
    globalThis.fetch = vi.fn(() =>
      jsonResponse(listBody([{ ...invoice('inv-1'), bankAccountNumber: 'SECRET', notes: 'private' }])),
    );
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    const labels = bundle.evidence.map((e) => e.id).join(' ');
    expect(labels).not.toContain('bankAccountNumber');
    expect(labels).not.toContain('notes');
  });

  it('computes declared aggregates from the fetched records', async () => {
    globalThis.fetch = vi.fn(() =>
      jsonResponse(
        listBody([
          invoice('a', { outstandingAmount: 10 }),
          invoice('b', { outstandingAmount: 32 }),
          invoice('c', { dueDate: new Date(Date.now() + 86_400_000).toISOString(), outstandingAmount: 5 }),
        ]),
      ),
    );
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.aggregates['invoices-past-due']).toBe(2);
    expect(bundle.aggregates['outstanding-total']).toBe(47);
  });

  it('produces no insights when no rule fires', async () => {
    globalThis.fetch = vi.fn(() =>
      jsonResponse(listBody([invoice('a', { paymentStatus: 'paid', dueDate: new Date().toISOString() })])),
    );
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(adapter.computeInsights(bundle, new Date())).toEqual([]);
  });
});

describe('failure classification', () => {
  it('classifies 403 as notAuthorized, never as unavailable', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({}, 403));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.notAuthorizedSources).toEqual(['invoices']);
    expect(bundle.unavailableSources).toEqual([]);
  });

  it('classifies 404 as notAuthorized', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({}, 404));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.notAuthorizedSources).toEqual(['invoices']);
  });

  it('classifies 5xx as unavailable', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({}, 503));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
    expect(bundle.notAuthorizedSources).toEqual([]);
  });

  it('classifies a network throw as unavailable', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('ECONNREFUSED')));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
  });

  it('classifies a timeout as unavailable rather than hanging', async () => {
    process.env.MANAGEMENT_DETERMINISTIC_SOURCE_TIMEOUT_MS = '20';
    globalThis.fetch = vi.fn(
      (_url, opts) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
  });

  it('treats a missing service URL as unavailable, not as a denial', async () => {
    delete process.env.BILLING_SERVICE_URL;
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([])));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
    expect(bundle.notAuthorizedSources).toEqual([]);
  });

  it('keeps sibling sources when one fails', async () => {
    const twoSources = descriptor({
      sources: [
        { ...descriptor().sources[0], name: 'invoices', path: '/invoices' },
        { ...descriptor().sources[0], name: 'quotations', path: '/quotations', recordKind: 'quotation' },
      ],
    });
    globalThis.fetch = vi.fn((url) =>
      url.includes('/invoices') ? jsonResponse(listBody([invoice('a')])) : jsonResponse({}, 503),
    );
    const adapter = createPageAdapter(twoSources);
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.records).toHaveLength(1);
    expect(bundle.unavailableSources).toEqual(['quotations']);
  });
});

describe('truncation', () => {
  it('drops a source whose reported total exceeds the rows returned', async () => {
    // The trap: a tidy 200 over one page is indistinguishable from a complete
    // result, so a count taken from it is silently wrong.
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([invoice('a')], 400)));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
    expect(bundle.records).toEqual([]);
    expect(bundle.aggregates['invoices-past-due']).toBeUndefined();
  });

  it('accepts a source whose total matches the rows returned', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([invoice('a')], 1)));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual([]);
    expect(bundle.records).toHaveLength(1);
  });

  it('drops a source that returned a full page with no total to check against', async () => {
    const noTotal = descriptor();
    noTotal.sources[0].paging = { param: 'limit', defaultLimit: 2 };
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([invoice('a'), invoice('b')])));
    const adapter = createPageAdapter(noTotal);
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
  });
});

describe('caps', () => {
  it('drops a source over the byte cap rather than slicing it', async () => {
    process.env.MANAGEMENT_MAX_FETCH_BYTES = '50';
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([invoice('a')])));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
  });

  it('drops a source over the row cap rather than slicing it', async () => {
    process.env.MANAGEMENT_MAX_FETCH_ROWS = '1';
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([invoice('a'), invoice('b')], 2)));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.unavailableSources).toEqual(['invoices']);
    delete process.env.MANAGEMENT_MAX_FETCH_ROWS;
  });
});

describe('when() source gating', () => {
  it('skips a gated-out source without marking it denied', async () => {
    const gated = descriptor();
    gated.sources[0].when = () => false;
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([invoice('a')])));
    const adapter = createPageAdapter(gated);
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(bundle.attemptedSources).toEqual([]);
    expect(bundle.notAuthorizedSources).toEqual([]);
    expect(bundle.unavailableSources).toEqual([]);
  });
});

describe('empty vs no-access', () => {
  it('a quiet but successful page emits a baseline so it is never no-access', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([])));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.records).toEqual([]);
    const baseline = bundle.evidence.find(
      (item) => item.id === pageEvidenceId('billing', 'source', 'invoices', 'recordCount'),
    );
    expect(baseline).toBeTruthy();
    expect(baseline.value).toBe(0);
    // The point: SOME evidence exists, so isNoAccess is false and the page
    // renders empty rather than forbidden.
    expect(bundle.evidence.length).toBeGreaterThan(0);
  });

  it('a fully denied page emits no evidence at all', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({}, 403));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });
    expect(bundle.evidence).toEqual([]);
    expect(bundle.attemptedSources).toEqual(['invoices']);
    expect(bundle.notAuthorizedSources).toEqual(['invoices']);
  });
});

describe('evidence budget', () => {
  it('keeps baselines and aggregates when record evidence is truncated', async () => {
    process.env.MANAGEMENT_MAX_EVIDENCE = '3';
    const rows = [1, 2, 3, 4, 5].map((n) =>
      invoice(`inv-${n}`, { customerEmail: `c${n}@acme.test`, outstandingAmount: n }),
    );
    globalThis.fetch = vi.fn(() => jsonResponse(listBody(rows)));
    const adapter = createPageAdapter(
      descriptor({
        aggregates: [{ name: 'outstanding-total', op: 'sumWhere', sumField: 'outstandingAmount', label: 'Outstanding' }],
      }),
    );
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });

    const ids = bundle.evidence.map((e) => e.id);
    expect(ids).toContain(pageEvidenceId('billing', 'aggregate', 'outstanding-total', 'value'));
    expect(ids).toContain(pageEvidenceId('billing', 'source', 'invoices', 'recordCount'));
    delete process.env.MANAGEMENT_MAX_EVIDENCE;
  });

  it('never ships an insight citing evidence that was dropped', async () => {
    process.env.MANAGEMENT_MAX_EVIDENCE = '2';
    const rows = [1, 2, 3, 4].map((n) => invoice(`inv-${n}`));
    globalThis.fetch = vi.fn(() => jsonResponse(listBody(rows)));
    const adapter = createPageAdapter(descriptor());
    const bundle = await adapter.loadEvidence(ctx, {}, { mode: 'deterministic' });

    const present = new Set(bundle.evidence.map((item) => item.id));
    for (const insight of adapter.computeInsights(bundle, new Date())) {
      for (const id of insight.evidenceIds) expect(present.has(id)).toBe(true);
    }
    delete process.env.MANAGEMENT_MAX_EVIDENCE;
  });
});

describe('parseScope', () => {
  it('rejects an unknown filter before any fetch', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse(listBody([])));
    const adapter = createPageAdapter(descriptor());
    expect(() => adapter.parseScope({ status: 'paid' })).toThrow(/Invalid billing scope/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('accepts the empty collection scope', () => {
    const adapter = createPageAdapter(descriptor());
    expect(adapter.parseScope({})).toEqual({});
  });
});

describe('defaultQuestions', () => {
  it('returns at most three and never the model\'s', () => {
    const adapter = createPageAdapter(
      descriptor({ questionTemplates: ['one', 'two', 'three', 'four'] }),
    );
    expect(adapter.defaultQuestions({})).toEqual(['one', 'two', 'three']);
  });

  it('supports a function template reading the bundle', () => {
    const adapter = createPageAdapter(descriptor({ questionTemplates: [(b) => `${b.recordCount} rows?`] }));
    expect(adapter.defaultQuestions({ recordCount: 7 })).toEqual(['7 rows?']);
  });
});
