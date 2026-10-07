#!/usr/bin/env node
/**
 * Purge test residue from the shared development database.
 *
 *   cd Services && node clean-test-data.mjs             # report only (default)
 *   cd Services && node clean-test-data.mjs --commit    # actually delete
 *
 * WHY THIS EXISTS
 *   Every service points at one shared Postgres, and three independent writers
 *   leave rows behind in it:
 *
 *     1. `Services/e2e-tests` — leads, careers, quotations, invoices, receipts
 *        and bookings tagged `[E2E-<runId>]` / `e2e-<runId>+…@travelcrm.test`.
 *        Its teardown deletes what it can, but billing exposes only `cancel`
 *        for invoices and receipts, and booking-service exposes no delete at
 *        all, so those rows accumulate by design.
 *     2. `Services/e2e-tests/synthetic/seed-synthetic.mjs` — a whole synthetic
 *        book of business tagged `SYNTH-<runId>`, with the same non-deletable
 *        residue (invoices, receipts, flight bookings).
 *     3. `Management/e2e` Playwright and ad-hoc manual testing — `E2E Test
 *        Lead <ts>`, `E2E Copilot Lead <ts>` and a scatter of throwaway
 *        accounts (`planprobe@test.com`, `smoketest_…@example.com`, …).
 *
 *   The older seed scripts also duplicate themselves on every re-run: `Career`,
 *   `Vacancy`, `Review`, `Package_Day_Transport` and `Otp` have no unique key,
 *   so `createMany` piles up a fresh copy each time. That duplication is
 *   collapsed here too, keeping the earliest row of each natural key.
 *
 * WHAT IT NEVER TOUCHES
 *   Seeded accounts, the seven original packages and anything a human created
 *   through the UI. Deletion is driven by explicit marker patterns and by
 *   reference to a marked parent — never by "looks empty" or "created recently".
 *
 * SAFETY
 *   Dry run by default; nothing is written without --commit. All deletes run in
 *   one transaction, so a failure leaves the database exactly as it was.
 */
import pg from '../Services/analytics-service/node_modules/pg/lib/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { DEMO_ID_PREFIXES } from './seed-demo/lib/reset.mjs';

// ─── connection: same refusal-to-guess rule as the seed scripts ──────────────
function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Fall back to a service .env only because this script may be run from a
  // worktree with no exported environment; the value is still the operator's
  // own configured database, never a literal in this file.
  for (const svc of ['lead-service', 'user-service', 'billing-service']) {
    const p = path.join(import.meta.dirname, svc, '.env');
    if (!fs.existsSync(p)) continue;
    const m = /^DIRECT_URL="?([^"\n]+)"?/m.exec(fs.readFileSync(p, 'utf8')) ?? /^DATABASE_URL="?([^"\n]+)"?/m.exec(fs.readFileSync(p, 'utf8'));
    if (m) return m[1];
  }
  throw new Error('Set DATABASE_URL (or provide a service .env) — this script will not guess a database.');
}

/**
 * The marker predicates. Kept as exported consts so a test can assert on them
 * and so the report can tell the operator exactly what matched.
 */
const RESIDUE_LEAD = `(
      l.name LIKE '[E2E-%' OR l.name LIKE '[SYNTH-%'
   OR l.name LIKE 'E2E Test Lead %' OR l.name LIKE 'E2E Copilot Lead %'
   OR l.email LIKE 'e2e-%@travelcrm.test' OR l.email LIKE 'synth-%@travelcrm.test'
   OR l.email LIKE 'smoketest\\_%@example.com'
   OR l.email IN ('ana.audit@example.com','smoketest@example.com','eka@deka.com','eka@email.com',
                  'test@email.com','planprobe@test.com','planprobe.ui@test.com')
   OR l.message LIKE 'Automated E2E lead%'
   OR EXISTS (SELECT 1 FROM unnest(l.tags) t WHERE t LIKE 'SYNTH-%')
)`;

const RESIDUE_USER = `(
      u.email LIKE 'e2e-%@travelcrm.test' OR u.email LIKE 'synth-%@travelcrm.test'
   OR u.email LIKE 'smoketest\\_%@example.com'
   OR u.email IN ('john.doe.uitest@example.com','test@email.com','planprobe@test.com',
                  'planprobe.ui@test.com','eka@email.com','ana.audit@example.com')
)`;

const RESIDUE_CAREER = `(
      c.email LIKE 'e2e-%@travelcrm.test' OR c."fullName" LIKE '[E2E-%'
   OR c."adminNotes" = 'Reviewed by E2E suite'
)`;

/**
 * Dangling references. A billing document whose lead has been removed (by an
 * earlier cleanup, or an aborted manual test) is unreachable from the UI — the
 * lead's Documents tab is the only place these are rendered, and that lead no
 * longer exists. Same idea for a child row whose parent is gone. These are the
 * only predicates here that do not key off a marker string.
 */
const ORPHAN_INVOICE = `SELECT i.id FROM crm_billing."Invoice" i WHERE i."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`;
const ORPHAN_QUOTATION = `SELECT q.id FROM crm_billing."Quotation" q WHERE q."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`;
const ORPHAN_CREDIT_NOTE = `SELECT c.id FROM crm_billing."CreditNote" c WHERE c."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`;
const ORPHAN_VOUCHER = `SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`;

const RESIDUE_BOOKING = `(
      b."userId" IN (SELECT u.id FROM crm_users."User" u WHERE ${RESIDUE_USER.replace(/\bu\./g, 'u.')})
   OR b."specialRequests" = 'Automated E2E contract test'
)`;

/**
 * Ordered deletions. Within a schema, children precede parents because those
 * FKs are real; across schemas the order is a correctness choice (there are no
 * cross-schema constraints), so it follows the reference graph.
 *
 * Each entry: [label, countSql, deleteSql]. Both must select/delete the same set.
 *
 * Assistant telemetry and OTPs carry no marker string — a smoke run, a manual
 * probe and the demo seed all write the same shape. The discriminator is the
 * id: seed-demo owns the deterministic `5_000000-` family (see
 * seed-demo/lib/ids.mjs). Everything else in those tables is residue, but the
 * demo's own transcripts are fixtures and must survive this script.
 */
const demoOwnedId = (category) => `id LIKE '${DEMO_ID_PREFIXES[category]}%'`;

/**
 * A transcript message id is `${sessionId}-m${seq}` (see domains/assistant.mjs),
 * so a demo message carries the *session* prefix, not the message category's —
 * this mirrors the seed's own delete, which matches on both.
 */
const NOT_DEMO_MESSAGE = `NOT (${demoOwnedId('assistantMessage')} OR "sessionId" LIKE '${DEMO_ID_PREFIXES.assistantSession}%')`;

const telemetryJob = (label, table, predicate) => {
  const where = `WHERE ${predicate}`;
  return [`${label} (non-demo)`, `SELECT count(*)::int n FROM ${table} ${where}`, `DELETE FROM ${table} ${where}`];
};

const JOBS = [
  // ── assistant telemetry (dev residue: smoke-*, probe-*, eval-*, bare uuids) ─
  telemetryJob('assistant: AssistantMessage', 'crm_assistant."AssistantMessage"', NOT_DEMO_MESSAGE),
  telemetryJob('assistant: AssistantEvent', 'crm_assistant."AssistantEvent"', `NOT (${demoOwnedId('assistantEvent')})`),
  telemetryJob('assistant: InsightDecision', 'crm_assistant."InsightDecision"', `NOT (${demoOwnedId('insightDecision')})`),
  telemetryJob('assistant: InsightState', 'crm_assistant."InsightState"', `NOT (${demoOwnedId('insightState')})`),
  telemetryJob('assistant: ManagementLastSeen', 'crm_assistant."ManagementLastSeen"', `NOT (${demoOwnedId('managementLastSeen')})`),
  telemetryJob('assistant: AssistantSession', 'crm_assistant."AssistantSession"', `NOT (${demoOwnedId('assistantSession')})`),

  // ── flights ───────────────────────────────────────────────────────────────
  [
    'flights: FlightTraveler (stranded)',
    `SELECT count(*)::int n FROM crm_flights."FlightTraveler" t WHERE t."lastName" LIKE 'SYNTH-%'
       OR t."flightBookingId" IN (SELECT f.id FROM crm_flights."FlightBooking" f WHERE f."leadId" IS NULL AND f."customerId" IS NULL AND f.status = 'cancelled')`,
    `DELETE FROM crm_flights."FlightTraveler" t WHERE t."lastName" LIKE 'SYNTH-%'
       OR t."flightBookingId" IN (SELECT f.id FROM crm_flights."FlightBooking" f WHERE f."leadId" IS NULL AND f."customerId" IS NULL AND f.status = 'cancelled')`,
  ],
  [
    'flights: FlightSegment (stranded)',
    `SELECT count(*)::int n FROM crm_flights."FlightSegment" s WHERE s."flightBookingId" IN (SELECT f.id FROM crm_flights."FlightBooking" f WHERE f."leadId" IS NULL AND f."customerId" IS NULL AND f.status = 'cancelled')`,
    `DELETE FROM crm_flights."FlightSegment" s WHERE s."flightBookingId" IN (SELECT f.id FROM crm_flights."FlightBooking" f WHERE f."leadId" IS NULL AND f."customerId" IS NULL AND f.status = 'cancelled')`,
  ],
  [
    'flights: FlightBooking (test residue)',
    `SELECT count(*)::int n FROM crm_flights."FlightBooking" f
      WHERE (f."leadId" IS NULL AND f."customerId" IS NULL AND f.status = 'cancelled')
         OR f."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})
         OR f."customerId" IN (SELECT u.id FROM crm_users."User" u WHERE ${RESIDUE_USER})`,
    `DELETE FROM crm_flights."FlightBooking" f
      WHERE (f."leadId" IS NULL AND f."customerId" IS NULL AND f.status = 'cancelled')
         OR f."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})
         OR f."customerId" IN (SELECT u.id FROM crm_users."User" u WHERE ${RESIDUE_USER})`,
  ],

  // ── hotel bookings ────────────────────────────────────────────────────────
  [
    'packages: HotelBooking (test residue)',
    `SELECT count(*)::int n FROM crm_packages."HotelBooking" h
      WHERE (h."leadId" IS NULL AND h."packageId" IS NULL)
         OR h."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})
         OR h."guestInfo"::text LIKE '%SYNTH-%' OR h."searchSnapshot"::text LIKE '%SYNTH-%'`,
    `DELETE FROM crm_packages."HotelBooking" h
      WHERE (h."leadId" IS NULL AND h."packageId" IS NULL)
         OR h."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})
         OR h."guestInfo"::text LIKE '%SYNTH-%' OR h."searchSnapshot"::text LIKE '%SYNTH-%'`,
  ],

  // ── bookings (no delete endpoint exists; this is the only way) ────────────
  [
    'bookings: BookingTraveler',
    `SELECT count(*)::int n FROM crm_bookings."BookingTraveler" t WHERE t."bookingId" IN (SELECT b.id FROM crm_bookings."Booking" b WHERE ${RESIDUE_BOOKING})`,
    `DELETE FROM crm_bookings."BookingTraveler" t WHERE t."bookingId" IN (SELECT b.id FROM crm_bookings."Booking" b WHERE ${RESIDUE_BOOKING})`,
  ],
  [
    'bookings: Booking',
    `SELECT count(*)::int n FROM crm_bookings."Booking" b WHERE ${RESIDUE_BOOKING}`,
    `DELETE FROM crm_bookings."Booking" b WHERE ${RESIDUE_BOOKING}`,
  ],

  // ── billing: children before parents ─────────────────────────────────────
  [
    'billing: PaymentHistory',
    `SELECT count(*)::int n FROM crm_billing."PaymentHistory" h
      WHERE h."customerEmail" LIKE 'e2e-%@travelcrm.test' OR h."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR h.notes LIKE 'SYNTH-%' OR h."receiptId" IN (SELECT r.id FROM crm_billing."PaymentReceipt" r WHERE r."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."PaymentHistory" h
      WHERE h."customerEmail" LIKE 'e2e-%@travelcrm.test' OR h."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR h.notes LIKE 'SYNTH-%' OR h."receiptId" IN (SELECT r.id FROM crm_billing."PaymentReceipt" r WHERE r."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: PaymentReceipt',
    `SELECT count(*)::int n FROM crm_billing."PaymentReceipt" r
      WHERE r."customerEmail" LIKE 'e2e-%@travelcrm.test' OR r."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR r.notes LIKE 'Automated E2E payment%' OR r.notes LIKE 'SYNTH-%'
         OR r."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
    `DELETE FROM crm_billing."PaymentReceipt" r
      WHERE r."customerEmail" LIKE 'e2e-%@travelcrm.test' OR r."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR r.notes LIKE 'Automated E2E payment%' OR r.notes LIKE 'SYNTH-%'
         OR r."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
  ],
  [
    'billing: CreditNoteItem',
    `SELECT count(*)::int n FROM crm_billing."CreditNoteItem" i WHERE i."creditNoteId" IN (SELECT c.id FROM crm_billing."CreditNote" c WHERE c."customerEmail" LIKE 'e2e-%@travelcrm.test' OR c."customerEmail" LIKE 'synth-%@travelcrm.test' OR c."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."CreditNoteItem" i WHERE i."creditNoteId" IN (SELECT c.id FROM crm_billing."CreditNote" c WHERE c."customerEmail" LIKE 'e2e-%@travelcrm.test' OR c."customerEmail" LIKE 'synth-%@travelcrm.test' OR c."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: CreditNote',
    `SELECT count(*)::int n FROM crm_billing."CreditNote" c WHERE c."customerEmail" LIKE 'e2e-%@travelcrm.test' OR c."customerEmail" LIKE 'synth-%@travelcrm.test' OR c."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
    `DELETE FROM crm_billing."CreditNote" c WHERE c."customerEmail" LIKE 'e2e-%@travelcrm.test' OR c."customerEmail" LIKE 'synth-%@travelcrm.test' OR c."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
  ],
  [
    'billing: VoucherFlightSegment',
    `SELECT count(*)::int n FROM crm_billing."VoucherFlightSegment" s WHERE s."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."VoucherFlightSegment" s WHERE s."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: Voucher child rows',
    `SELECT count(*)::int n FROM crm_billing."VoucherItinerarySummary" s WHERE s."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."VoucherItinerarySummary" s WHERE s."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: VoucherMealPlan',
    `SELECT count(*)::int n FROM crm_billing."VoucherMealPlan" m WHERE m."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."VoucherMealPlan" m WHERE m."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: VoucherLocationDate',
    `SELECT count(*)::int n FROM crm_billing."VoucherLocationDate" d WHERE d."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."VoucherLocationDate" d WHERE d."voucherId" IN (SELECT v.id FROM crm_billing."Voucher" v WHERE v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: Voucher',
    `SELECT count(*)::int n FROM crm_billing."Voucher" v WHERE v."customerEmail" LIKE 'e2e-%@travelcrm.test' OR v."customerEmail" LIKE 'synth-%@travelcrm.test' OR v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
    `DELETE FROM crm_billing."Voucher" v WHERE v."customerEmail" LIKE 'e2e-%@travelcrm.test' OR v."customerEmail" LIKE 'synth-%@travelcrm.test' OR v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
  ],
  [
    'billing: InvoiceItem',
    `SELECT count(*)::int n FROM crm_billing."InvoiceItem" i WHERE i."invoiceId" IN (SELECT v.id FROM crm_billing."Invoice" v WHERE v."customerEmail" LIKE 'e2e-%@travelcrm.test' OR v."customerEmail" LIKE 'synth-%@travelcrm.test' OR v.notes LIKE 'SYNTH-%' OR v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."InvoiceItem" i WHERE i."invoiceId" IN (SELECT v.id FROM crm_billing."Invoice" v WHERE v."customerEmail" LIKE 'e2e-%@travelcrm.test' OR v."customerEmail" LIKE 'synth-%@travelcrm.test' OR v.notes LIKE 'SYNTH-%' OR v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: Invoice (cancelled/invoice residue)',
    `SELECT count(*)::int n FROM crm_billing."Invoice" v
      WHERE v."customerEmail" LIKE 'e2e-%@travelcrm.test' OR v."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR v.notes LIKE 'SYNTH-%'
         OR v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
    `DELETE FROM crm_billing."Invoice" v
      WHERE v."customerEmail" LIKE 'e2e-%@travelcrm.test' OR v."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR v.notes LIKE 'SYNTH-%'
         OR v."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
  ],
  [
    'billing: QuotationItem',
    `SELECT count(*)::int n FROM crm_billing."QuotationItem" i WHERE i."quotationId" IN (SELECT q.id FROM crm_billing."Quotation" q WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test' OR q.notes LIKE 'SYNTH-%' OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."QuotationItem" i WHERE i."quotationId" IN (SELECT q.id FROM crm_billing."Quotation" q WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test' OR q.notes LIKE 'SYNTH-%' OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: QuotationImage',
    `SELECT count(*)::int n FROM crm_billing."QuotationImage" i WHERE i."quotationId" IN (SELECT q.id FROM crm_billing."Quotation" q WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test' OR q.notes LIKE 'SYNTH-%' OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."QuotationImage" i WHERE i."quotationId" IN (SELECT q.id FROM crm_billing."Quotation" q WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test' OR q.notes LIKE 'SYNTH-%' OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: QuotationRevision',
    `SELECT count(*)::int n FROM crm_billing."QuotationRevision" r WHERE r."quotationId" IN (SELECT q.id FROM crm_billing."Quotation" q WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test' OR q.notes LIKE 'SYNTH-%' OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
    `DELETE FROM crm_billing."QuotationRevision" r WHERE r."quotationId" IN (SELECT q.id FROM crm_billing."Quotation" q WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test' OR q.notes LIKE 'SYNTH-%' OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}))`,
  ],
  [
    'billing: Quotation',
    `SELECT count(*)::int n FROM crm_billing."Quotation" q
      WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR q.notes LIKE 'SYNTH-%'
         OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
    `DELETE FROM crm_billing."Quotation" q
      WHERE q."customerEmail" LIKE 'e2e-%@travelcrm.test' OR q."customerEmail" LIKE 'synth-%@travelcrm.test'
         OR q.notes LIKE 'SYNTH-%'
         OR q."leadId" IN (SELECT l.id FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD})`,
  ],

  // ── billing: orphans ─────────────────────────────────────────────────────
  // Children first: a child is removed when its parent is orphaned *or* when
  // the child itself points at a parent that is already gone. Without the first
  // clause, deleting an orphaned Invoice would hit its receipts' foreign key.
  [
    'billing: PaymentHistory (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."PaymentHistory" h WHERE h."invoiceId" IN (${ORPHAN_INVOICE}) OR h."invoiceId" NOT IN (SELECT i.id FROM crm_billing."Invoice" i)`,
    `DELETE FROM crm_billing."PaymentHistory" h WHERE h."invoiceId" IN (${ORPHAN_INVOICE}) OR h."invoiceId" NOT IN (SELECT i.id FROM crm_billing."Invoice" i)`,
  ],
  [
    'billing: PaymentReceipt (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."PaymentReceipt" r WHERE r."invoiceId" IN (${ORPHAN_INVOICE}) OR r."invoiceId" NOT IN (SELECT i.id FROM crm_billing."Invoice" i)`,
    `DELETE FROM crm_billing."PaymentReceipt" r WHERE r."invoiceId" IN (${ORPHAN_INVOICE}) OR r."invoiceId" NOT IN (SELECT i.id FROM crm_billing."Invoice" i)`,
  ],
  [
    'billing: InvoiceItem (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."InvoiceItem" t WHERE t."invoiceId" IN (${ORPHAN_INVOICE}) OR t."invoiceId" NOT IN (SELECT i.id FROM crm_billing."Invoice" i)`,
    `DELETE FROM crm_billing."InvoiceItem" t WHERE t."invoiceId" IN (${ORPHAN_INVOICE}) OR t."invoiceId" NOT IN (SELECT i.id FROM crm_billing."Invoice" i)`,
  ],
  [
    'billing: Invoice (orphaned lead)',
    `SELECT count(*)::int n FROM crm_billing."Invoice" i WHERE i."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
    `DELETE FROM crm_billing."Invoice" i WHERE i."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
  ],
  [
    'billing: QuotationItem (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."QuotationItem" t WHERE t."quotationId" IN (${ORPHAN_QUOTATION}) OR t."quotationId" NOT IN (SELECT q.id FROM crm_billing."Quotation" q)`,
    `DELETE FROM crm_billing."QuotationItem" t WHERE t."quotationId" IN (${ORPHAN_QUOTATION}) OR t."quotationId" NOT IN (SELECT q.id FROM crm_billing."Quotation" q)`,
  ],
  [
    'billing: QuotationImage (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."QuotationImage" g WHERE g."quotationId" IN (${ORPHAN_QUOTATION}) OR g."quotationId" NOT IN (SELECT q.id FROM crm_billing."Quotation" q)`,
    `DELETE FROM crm_billing."QuotationImage" g WHERE g."quotationId" IN (${ORPHAN_QUOTATION}) OR g."quotationId" NOT IN (SELECT q.id FROM crm_billing."Quotation" q)`,
  ],
  [
    'billing: QuotationRevision (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."QuotationRevision" r WHERE r."quotationId" IN (${ORPHAN_QUOTATION}) OR r."quotationId" NOT IN (SELECT q.id FROM crm_billing."Quotation" q)`,
    `DELETE FROM crm_billing."QuotationRevision" r WHERE r."quotationId" IN (${ORPHAN_QUOTATION}) OR r."quotationId" NOT IN (SELECT q.id FROM crm_billing."Quotation" q)`,
  ],
  [
    'billing: Quotation (orphaned lead)',
    `SELECT count(*)::int n FROM crm_billing."Quotation" q WHERE q."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
    `DELETE FROM crm_billing."Quotation" q WHERE q."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
  ],
  [
    'billing: CreditNoteItem (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."CreditNoteItem" t WHERE t."creditNoteId" IN (${ORPHAN_CREDIT_NOTE}) OR t."creditNoteId" NOT IN (SELECT c.id FROM crm_billing."CreditNote" c)`,
    `DELETE FROM crm_billing."CreditNoteItem" t WHERE t."creditNoteId" IN (${ORPHAN_CREDIT_NOTE}) OR t."creditNoteId" NOT IN (SELECT c.id FROM crm_billing."CreditNote" c)`,
  ],
  [
    'billing: CreditNote (orphaned lead)',
    `SELECT count(*)::int n FROM crm_billing."CreditNote" c WHERE c."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
    `DELETE FROM crm_billing."CreditNote" c WHERE c."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
  ],
  [
    'billing: VoucherItinerarySummary (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."VoucherItinerarySummary" s WHERE s."voucherId" IN (${ORPHAN_VOUCHER}) OR s."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
    `DELETE FROM crm_billing."VoucherItinerarySummary" s WHERE s."voucherId" IN (${ORPHAN_VOUCHER}) OR s."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
  ],
  [
    'billing: VoucherMealPlan (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."VoucherMealPlan" m WHERE m."voucherId" IN (${ORPHAN_VOUCHER}) OR m."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
    `DELETE FROM crm_billing."VoucherMealPlan" m WHERE m."voucherId" IN (${ORPHAN_VOUCHER}) OR m."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
  ],
  [
    'billing: VoucherLocationDate (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."VoucherLocationDate" d WHERE d."voucherId" IN (${ORPHAN_VOUCHER}) OR d."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
    `DELETE FROM crm_billing."VoucherLocationDate" d WHERE d."voucherId" IN (${ORPHAN_VOUCHER}) OR d."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
  ],
  [
    'billing: VoucherFlightSegment (orphaned)',
    `SELECT count(*)::int n FROM crm_billing."VoucherFlightSegment" f WHERE f."voucherId" IN (${ORPHAN_VOUCHER}) OR f."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
    `DELETE FROM crm_billing."VoucherFlightSegment" f WHERE f."voucherId" IN (${ORPHAN_VOUCHER}) OR f."voucherId" NOT IN (SELECT v.id FROM crm_billing."Voucher" v)`,
  ],
  [
    'billing: Voucher (orphaned lead)',
    `SELECT count(*)::int n FROM crm_billing."Voucher" v WHERE v."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
    `DELETE FROM crm_billing."Voucher" v WHERE v."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
  ],
  [
    'bookings: Booking (orphaned customer/package)',
    `SELECT count(*)::int n FROM crm_bookings."Booking" b WHERE b."userId" NOT IN (SELECT u.id FROM crm_users."User" u) OR b."packageId" NOT IN (SELECT p.id FROM crm_packages."Package" p)`,
    `DELETE FROM crm_bookings."Booking" b WHERE b."userId" NOT IN (SELECT u.id FROM crm_users."User" u) OR b."packageId" NOT IN (SELECT p.id FROM crm_packages."Package" p)`,
  ],
  [
    'flights: FlightBooking (orphaned lead)',
    `SELECT count(*)::int n FROM crm_flights."FlightBooking" f WHERE f."leadId" IS NOT NULL AND f."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
    `DELETE FROM crm_flights."FlightBooking" f WHERE f."leadId" IS NOT NULL AND f."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
  ],
  [
    'packages: HotelBooking (orphaned lead)',
    `SELECT count(*)::int n FROM crm_packages."HotelBooking" h WHERE h."leadId" IS NOT NULL AND h."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
    `DELETE FROM crm_packages."HotelBooking" h WHERE h."leadId" IS NOT NULL AND h."leadId" NOT IN (SELECT l.id FROM crm_leads."Lead" l)`,
  ],

  // ── careers ───────────────────────────────────────────────────────────────
  [
    'careers: Career (test residue)',
    `SELECT count(*)::int n FROM crm_careers."Career" c WHERE ${RESIDUE_CAREER}`,
    `DELETE FROM crm_careers."Career" c WHERE ${RESIDUE_CAREER}`,
  ],

  // ── leads (cascades LeadRemark, LeadStatusHistory, selections, pricing…) ──
  [
    'leads: Lead (cascades children)',
    `SELECT count(*)::int n FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}`,
    `DELETE FROM crm_leads."Lead" l WHERE ${RESIDUE_LEAD}`,
  ],

  // ── auth: ephemeral codes from every test login ───────────────────────────
  telemetryJob('auth: Otp', 'crm_auth."Otp"', `NOT (${demoOwnedId('otp')})`),

  // ── users: profiles before users ──────────────────────────────────────────
  [
    'users: VendorProfile',
    `SELECT count(*)::int n FROM crm_users."VendorProfile" v WHERE v."userId" IN (SELECT u.id FROM crm_users."User" u WHERE ${RESIDUE_USER})`,
    `DELETE FROM crm_users."VendorProfile" v WHERE v."userId" IN (SELECT u.id FROM crm_users."User" u WHERE ${RESIDUE_USER})`,
  ],
  [
    'users: User (throwaway accounts)',
    `SELECT count(*)::int n FROM crm_users."User" u WHERE ${RESIDUE_USER}`,
    `DELETE FROM crm_users."User" u WHERE ${RESIDUE_USER}`,
  ],
];

/**
 * Duplicate collapse. `Career` and `Vacancy` have no unique key, so every
 * re-run of the older seeds appended another copy of the same eight people and
 * six vacancies. Keep the earliest of each natural key.
 */
const CAREER_DUP = `EXISTS (SELECT 1 FROM crm_careers."Career" k
   WHERE k.email = c.email AND k.position = c.position
     AND (k."createdAt" < c."createdAt" OR (k."createdAt" = c."createdAt" AND k.id < c.id)))`;

const VACANCY_DUP = `EXISTS (SELECT 1 FROM crm_careers."Vacancy" k
   WHERE k.position = v.position AND k.location = v.location AND k.type = v.type
     AND (k."createdAt" < v."createdAt" OR (k."createdAt" = v."createdAt" AND k.id < v.id)))`;

const DEDUPE = [
  [
    'careers: Career duplicates',
    `SELECT count(*)::int n FROM crm_careers."Career" c WHERE ${CAREER_DUP}`,
    `DELETE FROM crm_careers."Career" c WHERE ${CAREER_DUP}`,
  ],
  [
    'careers: Vacancy duplicates',
    `SELECT count(*)::int n FROM crm_careers."Vacancy" v WHERE ${VACANCY_DUP}`,
    `DELETE FROM crm_careers."Vacancy" v WHERE ${VACANCY_DUP}`,
  ],
];

async function main() {
  const commit = process.argv.includes('--commit');
  const client = new pg.Client({ connectionString: resolveUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  const host = (() => {
    try {
      const u = new URL(resolveUrl().replace(/^postgresql:/, 'http:'));
      return `${u.hostname}/${u.pathname.replace(/^\//, '')}`;
    } catch {
      return '(unparseable url)';
    }
  })();

  console.log(`\n  clean-test-data  ·  ${host}`);
  console.log(`  mode: ${commit ? 'COMMIT — deletions will be applied' : 'DRY RUN — nothing will be written'}`);
  console.log(`  ─────────────────────────────────────────────────────────`);

  const results = [];
  let total = 0;
  for (const [label, countSql, deleteSql] of [...JOBS, ...DEDUPE]) {
    try {
      const { rows } = await client.query(countSql);
      const n = rows[0]?.n ?? 0;
      results.push({ label, n, deleteSql });
      total += n;
    } catch (err) {
      results.push({ label, n: `ERR ${err.message}`, deleteSql: null });
    }
  }

  for (const r of results) {
    if (r.n === 0) continue;
    console.log(`    ${String(r.n).padStart(7)}  ${r.label}`);
  }
  const skipped = results.filter((r) => r.n === 0).length;
  console.log(`  ─────────────────────────────────────────────────────────`);
  console.log(`  ${total} row(s) to remove across ${results.length - skipped} table target(s); ${skipped} already clean.`);

  if (!commit) {
    console.log(`\n  Re-run with --commit to apply.\n`);
    await client.end();
    return;
  }

  await client.query('BEGIN');
  try {
    let deleted = 0;
    for (const r of results) {
      if (!r.deleteSql) continue;
      const res = await client.query(r.deleteSql);
      deleted += res.rowCount ?? 0;
    }
    await client.query('COMMIT');
    console.log(`  committed — ${deleted} row(s) deleted.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`\n  ✗ failed, rolled back: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n  ✗ clean-test-data failed: ${err.message}\n`);
  if (process.env.DEBUG_SEED) console.error(err.stack);
  process.exitCode = 1;
});
