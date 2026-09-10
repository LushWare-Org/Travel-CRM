// ─── Billing page descriptor ──────────────────────────────────────────────
// The first non-lead page. Everything here is declarative except one rule that
// demonstrates the escape hatch.
//
// ── Field traps this descriptor is written around ──
// Verified against Services/billing-service. Each of these fails SILENTLY —
// a wrong briefing rather than an error — so they are worth the comments:
//
// 1. `status` and `paymentStatus` are different fields. Payment truth lives in
//    `paymentStatus` (unpaid/partial/paid/overpaid/refunded) and is written by
//    paymentReceipt.controller.js. `status` is the document lifecycle and only
//    ever receives draft/sent/viewed/cancelled — `paid`, `partial`, `overdue`
//    and `refunded` exist in its enum but are never written. Any rule reading
//    `status` for payment state reads the wrong column, so every payment rule
//    below gates on `paymentStatus`.
// 2. `overdue` is DERIVED from `dueDate` at query time, never stored
//    (invoice.controller.js:218). Rules derive it the same way rather than
//    trusting a status value that never appears.
// 3. `unassigned` is deliberately NOT declared. There is no owner column on any
//    billing document; assignment is crm_leads.Lead.assignedToId, reachable only
//    through a raw cross-schema join. Declaring it would emit a claim that can
//    never fire.
// 4. `stuckInStatus` has no status-transition timestamp, so it can only use
//    `updatedAt`. Any edit — a note, a resend — resets the clock, so the default
//    text says "unedited" rather than claiming the status itself is stuck.
//
// ── Paging ──
// GET /billing/invoices and /billing/quotations both default to `limit=20` and
// return `{ success, count, total, data }`. A tidy 200 over one page is
// indistinguishable from a complete result unless you read `total`, and a count
// taken from a page is a wrong count. Both sources therefore request an
// explicit larger page AND declare `paging.totalPath`, so the engine can prove
// it has everything or drop the source.

import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';
import { fieldEvidenceId } from '../rules.js';

const BILLING_INVOICE_FIELDS = [
  'id',
  'invoiceNumber',
  'status',
  'paymentStatus',
  'totalAmount',
  'paidAmount',
  'outstandingAmount',
  'dueDate',
  'sentAt',
  'viewedAt',
  'remindersSent',
  'updatedAt',
  'customerEmail',
  'leadId',
  'currency',
];

const BILLING_QUOTATION_FIELDS = [
  'id',
  'quotationNumber',
  'status',
  'totalAmount',
  'validUntil',
  'issueDate',
  'customerEmail',
  'leadId',
];

const PAGE_LIMIT = 200;

const scopeSchema = z.object({}).strict();

export const billingAdapter = createPageAdapter({
  key: 'billing',

  scopeSchema,

  scopeLabel: () => 'Billing',

  sources: [
    {
      name: 'invoices',
      envKey: 'BILLING_SERVICE_URL',
      path: `/api/v1/billing/invoices?limit=${PAGE_LIMIT}`,
      listPath: 'data',
      recordKind: 'invoice',
      idField: 'id',
      fields: BILLING_INVOICE_FIELDS,
      label: 'Invoices',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'total' },
    },
    {
      name: 'quotations',
      envKey: 'BILLING_SERVICE_URL',
      path: `/api/v1/billing/quotations?limit=${PAGE_LIMIT}`,
      listPath: 'data',
      recordKind: 'quotation',
      idField: 'id',
      fields: BILLING_QUOTATION_FIELDS,
      label: 'Quotations',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'total' },
    },
  ],

  aggregates: [
    {
      // `field` with `cmp: 'ltNow'` scopes this to past-due invoices, matching
      // how getOverdueInvoices derives overdue from dueDate.
      name: 'invoices-past-due',
      op: 'countWhere',
      field: 'dueDate',
      cmp: 'ltNow',
      label: 'Invoices past due',
    },
    {
      name: 'outstanding-total',
      op: 'sumWhere',
      sumField: 'outstandingAmount',
      label: 'Outstanding total',
    },
  ],

  rules: [
    {
      // The headline claim. Gated on `paymentStatus`, not `status` (trap 1).
      rule: 'overdueBy',
      field: 'dueDate',
      statusField: 'paymentStatus',
      statuses: ['unpaid', 'partial'],
      criticalAfterDays: 60,
      section: 'attention',
      text: 'Invoice is past its due date and still not settled.',
    },

    {
      rule: 'stuckInStatus',
      statusField: 'status',
      statuses: ['draft'],
      days: 14,
      severity: 'warning',
      section: 'attention',
      text: 'Draft invoice has not been touched in a while.',
    },

    {
      // Part-paid and slow: `paidAmount` against `totalAmount`.
      rule: 'ratioBelow',
      numeratorField: 'paidAmount',
      denominatorField: 'totalAmount',
      threshold: 0.5,
      severity: 'info',
      section: 'attention',
      text: 'Less than half of this invoice has been collected.',
    },

    {
      rule: 'thresholdExceeded',
      field: 'outstandingAmount',
      threshold: 10_000,
      factKind: 'amount',
      severity: 'warning',
      section: 'attention',
      text: 'Outstanding balance is large.',
    },

    {
      rule: 'expiringWithin',
      field: 'validUntil',
      days: 7,
      severity: 'warning',
      section: 'attention',
      text: 'Quotation validity is about to lapse.',
    },

    {
      // A quiet-page signal. Fires when nothing is past due, so the panel has
      // something true to say on a good day instead of rendering empty.
      rule: 'zeroOrLowCount',
      aggregate: 'invoices-past-due',
      threshold: 0,
      severity: 'info',
      section: 'current_state',
      text: 'No invoices in this view are past due.',
    },

    {
      // Relational: one customer holding several invoices. Impossible with the
      // original per-record vocabulary — see the design doc's Assignment.
      rule: 'groupedCount',
      byKey: 'customerEmail',
      threshold: 3,
      severity: 'info',
      section: 'changed',
      text: 'One customer holds {count} invoices in this view.',
    },

    {
      // Relational: where the money is concentrated.
      rule: 'groupedShare',
      byKey: 'customerEmail',
      sumField: 'outstandingAmount',
      threshold: 40,
      severity: 'info',
      section: 'experienced_view',
      text: 'One customer is {pct}% of the outstanding value in this view.',
    },

    {
      // ── Escape hatch ──
      // "Reminders exhausted AND still unpaid." The vocabulary can express
      // `thresholdExceeded(remindersSent, 3)`, but that predicate carries no
      // status gate, so it also fires on invoices that have since been paid —
      // a wrong claim. A conjunction across two fields is exactly the case the
      // hatch exists for, and this shows the cost is small.
      run(bundle, _since) {
        const insights = [];
        for (const invoice of bundle.records) {
          if (invoice.__source !== 'invoices') continue;
          if (!['unpaid', 'partial'].includes(invoice.paymentStatus)) continue;
          if (typeof invoice.remindersSent !== 'number' || invoice.remindersSent < 3) continue;
          const evidenceId = fieldEvidenceId(bundle, invoice.id, 'remindersSent');
          if (!evidenceId) continue;
          insights.push({
            id: `reminders-exhausted:${invoice.id}`,
            section: 'attention',
            severity: 'critical',
            text: `Reminded ${invoice.remindersSent} times and still unpaid — this needs a call, not another email.`,
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
  ],

  questionTemplates: [
    'Which invoices should I chase first?',
    'Which customer owes the most right now?',
    'What is about to expire this week?',
  ],
});
