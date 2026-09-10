import { describe, it, expect } from 'vitest';
import { billingAdapter } from '../pages/billing.adapter.js';
import { makeBundle, addRecord } from './bundleFixture.js';

// Descriptor-level tests. These pin the field traps the Assignment surfaced, so
// a later edit cannot quietly reintroduce them — each one fails SILENTLY in
// production, producing a wrong briefing rather than an error.

const invoice = (id, overrides = {}) => ({
  __source: 'invoices',
  id,
  status: 'sent',
  paymentStatus: 'unpaid',
  totalAmount: 1_000,
  paidAmount: 0,
  outstandingAmount: 1_000,
  dueDate: new Date(Date.now() - 10 * 86_400_000).toISOString(),
  sentAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
  viewedAt: null,
  remindersSent: 0,
  updatedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
  customerEmail: 'sam@acme.test',
  leadId: 'lead-1',
  currency: 'USD',
  ...overrides,
});

const INVOICE_FIELDS = Object.keys(invoice('x'));

describe('billing scope', () => {
  it('accepts the empty collection scope and rejects anything else', () => {
    expect(billingAdapter.parseScope({})).toEqual({});
    expect(() => billingAdapter.parseScope({ status: 'paid' })).toThrow(/Invalid billing scope/);
    expect(() => billingAdapter.parseScope({ leadId: 'a' })).toThrow(/Invalid billing scope/);
  });
});

describe('field traps', () => {
  it('never gates a payment rule on `status`, which never carries payment state', () => {
    // `status` only ever receives draft/sent/viewed/cancelled; paid/partial/
    // overdue/refunded exist in its enum but are never written. A rule reading
    // it for payment state reads the wrong column.
    const overdue = billingAdapter.descriptor.rules.find((r) => r.rule === 'overdueBy');
    expect(overdue.statusField).toBe('paymentStatus');
    expect(overdue.statuses).toEqual(['unpaid', 'partial']);

    // And nothing declares `unassigned`: there is no owner column on any billing
    // document, so a rule using it could never fire.
    expect(billingAdapter.descriptor.rules.map((r) => r.rule)).not.toContain('unassigned');
  });
});

describe('declared sources', () => {
  it('declares paging on every source, so a page size is never reported as a total', () => {
    // GET /billing/invoices and /billing/quotations both default to limit=20 and
    // answer a tidy 200 over one page. Without a declared total the engine
    // cannot tell a full result from a sliced one.
    for (const source of billingAdapter.descriptor.sources) {
      expect(source.paging, `${source.name} must declare paging`).toBeTruthy();
      expect(source.paging.totalPath).toBe('total');
    }
  });

  it('allows only the fields it needs, and includes paymentStatus', () => {
    const invoiceSource = billingAdapter.descriptor.sources.find((s) => s.name === 'invoices');
    expect(invoiceSource.fields).toContain('paymentStatus');
    expect(invoiceSource.fields).toContain('dueDate');
    expect(invoiceSource.fields).not.toContain('bankAccountNumber');
    expect(invoiceSource.fields).not.toContain('notes');
  });
});

describe('the escape-hatch rule', () => {
  const runHatch = (bundle) => {
    const hatch = billingAdapter.descriptor.rules.find((r) => typeof r.run === 'function');
    return hatch.run(bundle, new Date());
  };

  it('fires only when reminders are exhausted AND the invoice is still unpaid', () => {
    const bundle = makeBundle();
    addRecord(bundle, invoice('a', { remindersSent: 4 }), INVOICE_FIELDS, 'invoice');
    expect(runHatch(bundle)).toHaveLength(1);
  });

  it('does NOT fire when the invoice was paid after the reminders', () => {
    // The exact case the shared `thresholdExceeded(remindersSent, 3)` would get
    // wrong: it carries no status gate, so it would report a settled invoice as
    // an outstanding problem.
    const bundle = makeBundle();
    addRecord(bundle, invoice('a', { remindersSent: 4, paymentStatus: 'paid' }), INVOICE_FIELDS, 'invoice');
    expect(runHatch(bundle)).toEqual([]);
  });

  it('does not fire below the reminder threshold', () => {
    const bundle = makeBundle();
    addRecord(bundle, invoice('a', { remindersSent: 2 }), INVOICE_FIELDS, 'invoice');
    expect(runHatch(bundle)).toEqual([]);
  });

  it('cites evidence that exists in the bundle', () => {
    const bundle = makeBundle();
    addRecord(bundle, invoice('a', { remindersSent: 4 }), INVOICE_FIELDS, 'invoice');
    const [insight] = runHatch(bundle);
    const present = new Set(bundle.evidence.map((item) => item.id));
    for (const id of insight.evidenceIds) expect(present.has(id)).toBe(true);
  });
});
