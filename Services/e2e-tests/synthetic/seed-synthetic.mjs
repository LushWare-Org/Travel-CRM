/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Synthetic book-of-business generator — Management copilot scenario suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS IS
 *   Creates one deterministic, marker-tagged synthetic book of business (3
 *   operators, 200 leads, 55 invoices + 15 receipts, 4 quotations, 12 flight
 *   bookings, 9 hotel bookings — the workload in `scenarios.v1.md`), so the
 *   Management copilot can be scored against known ground truth.
 *
 *   ⚠ IT WRITES REAL ROWS TO THE SHARED LIVE DEV POSTGRES, through the Gateway,
 *   using the same helpers the E2E suite uses. There is no disposable test
 *   database in this repo. Every row carries the run marker `SYNTH-<runId>` and
 *   `--cleanup` removes only rows carrying that marker.
 *
 *   The three operators are the SEEDED users the suite logs in as — `salesRep`
 *   (90 leads), `admin` (60) and `superAdmin` (20), resolved at commit through
 *   `getUserId(role)` from helpers/auth-helper.js. No operator user is created,
 *   so "which of MY leads…" is answerable for whichever role the spec
 *   authenticates as, and no temporary-password round-trip is involved.
 *
 *   ⚠ It does NOT fabricate data the API cannot produce. Bands the mock
 *   providers pin (flight ticketing deadlines, hotel stays and supplier codes),
 *   lead staleness and the PENDING_VERIFICATION queue are absent by design and
 *   listed in GROUND_TRUTH.authorability.gaps with file:line evidence.
 *
 * COMMANDS
 *   Plan only — no network, no guard, nothing created, exits 0:
 *     node Services/e2e-tests/synthetic/seed-synthetic.mjs --dry-run
 *
 *   Real seed — local stack must be up and the guard must pass:
 *     node Services/e2e-tests/synthetic/seed-synthetic.mjs --commit
 *     node Services/e2e-tests/synthetic/seed-synthetic.mjs --commit --with-adversarial
 *     node Services/e2e-tests/synthetic/seed-synthetic.mjs --commit --run-id=my-run
 *     node Services/e2e-tests/synthetic/seed-synthetic.mjs --commit --manifest=/tmp/synth.json
 *
 *   Remove one run again — marker-driven, local stack must be up:
 *     node Services/e2e-tests/synthetic/seed-synthetic.mjs --cleanup --run-id=<runId>
 *
 *   `--with-adversarial` also seeds the 23 bad-data rows catalogued in
 *   `adversarial.v1.jsonl` (the clean workload stays clean without it).
 *   `--with-overcap` additionally bulk-creates ~1200 filler leads for the
 *   over-cap page scenario; it is OFF even with --with-adversarial because it
 *   costs ~1200 requests (about an hour behind the Gateway's 300-req/15-min
 *   limiter) and it invalidates the clean-workload counts (see GROUND_TRUTH.overcap).
 *
 * ENV VARS (required for --commit / --cleanup; --dry-run needs none)
 *   GATEWAY_URL=http://localhost:3000/api/v1    must resolve to localhost/127.0.0.1
 *   E2E_I_UNDERSTAND_SHARED_DB=true             literal "true" — same guard as global-setup.js
 *   Optional:
 *     SYNTH_RUN_ID             pin the run id (also the marker suffix)
 *     SYNTH_SEED               PRNG seed (default 20260912) — fixes the workload shape
 *     SYNTH_NOW                ISO anchor for every generated date (default: today 09:00Z)
 *     SYNTH_MAX_REQ_PER_WINDOW sliding-window request budget (default 280)
 *     SYNTH_WINDOW_MS          window length in ms (default 900000 = the Gateway's 15 min)
 *     SYNTH_OVERCAP_ROWS       filler rows for --with-overcap (default 1200)
 *   Values are read from `Services/e2e-tests/.env` when that file exists; the
 *   real process environment always wins over the file.
 *
 * MODULE USE (for `synthetic.spec.js`)
 *   Importing this file has no side effects: it prints nothing, creates nothing
 *   and touches no network. `GROUND_TRUTH` is exported for a canonical run id
 *   (`SYNTH_RUN_ID` or `'plan'`); counts are run-id independent, so it is the
 *   same book of business the runner scores against. Use `planFor({ runId, ... })`
 *   for a different run or for the adversarial/overcap variants.
 *
 * LEAD NAMING (proves non-leakage: "operator X never sees operator Y's leads")
 *   Every assigned lead is named `[SYNTH-<runId>-<token>-<nnn>] Lead <nnn>`, where
 *   <token> is operator1 (salesRep), operator2 (admin), operator3 (superAdmin) or
 *   unassigned. GROUND_TRUTH.operators[role] exports two ownership strings:
 *     namePrefix     "SYNTH-<runId>-<token>-"  run-scoped; cleanup/discovery and
 *                                              assertions that know the run id.
 *     ownershipToken "<token>-"                run-independent; use this for the
 *                                              leakage assertion when the run id
 *                                              is not pinned, so a stale prefix
 *                                              cannot make the check vacuous.
 *   The tokens are deliberately operator1/2/3, not the role names: score.js
 *   normalises case-insensitively, and "admin" is a substring of "superAdmin",
 *   so a role-name search would false-positive across operators.
 *   `unassigned` is a first-class FOURTH tranche of the same shape: those 30
 *   leads have ownerRole === null and carry the `unassigned` token. A checker
 *   must treat `unassigned` as a role key in the token map — reading a null
 *   ownerRole as "missing token" or as "foreign token" reports 30 false
 *   violations. The token map is GROUND_TRUTH.operators[role] for the four role
 *   keys; the token→role mapping is the SIBLING key
 *   GROUND_TRUTH.operators.operatorSlots (not a field inside each role object).
 *
 * MARKER (`SYNTH-<runId>`) — where it lives per entity
 *   lead            name ("[SYNTH-<runId>-operator1-007] Lead 007"), email, tags[]
 *   invoice         customerEmail (its lead's marked email) + notes prefix
 *   quotation       customerEmail (its lead's marked email) + notes prefix + packageTitle
 *   receipt         customerEmail inherited from its invoice + notes
 *   flight booking  travelers[].lastName + the booking contact email; the contact
 *                   user findOrCreateCustomer creates is marked in name and email
 *   flight contact User   name ("[SYNTH-<id>] Flight Contact") + email
 *   hotel booking   guestInfo[].lastName + searchSnapshot.offer.name — HotelBooking
 *                   has NO marker column of its own
 *   Entities with NO marker field at all: HotelBooking (no notes column) and
 *   FlightBooking (`notes` exists but the controller never maps it from the
 *   request). Those two carry the marker in JSON columns and the guest/traveler
 *   names instead, and are reported as marker-poor in GROUND_TRUTH.authorability.
 *
 * CLEANUP
 *   `--cleanup --run-id=<runId>` discovers the run by marker (leads by
 *   `?search=`, the flight-contact user by `?search=`, billing rows by filtering
 *   the list endpoints on the marked lead ids), then cancels receipts → cancels
 *   invoices → deletes quotations → cancels hotel bookings → deletes leads →
 *   deletes the contact user. It reuses `helpers/test-data-cleanup.js`'s
 *   semantics (admin token, reverse-creation order, best-effort per row) but not
 *   its in-memory `created[]` array, which is per-process and therefore useless
 *   in a separate CLI invocation. Invoices and receipts can only be CANCELLED
 *   (the API has no delete, by design) and flight bookings have no delete or
 *   cancel endpoint at all, so both are reported as residue.
 *
 * AUTHORABILITY
 *   GROUND_TRUTH.authorability.gaps lists every catalogue band this API cannot
 *   author, with the reason, the file:line evidence and what was seeded instead.
 *   Nothing is silently dropped: unachievable bands are absent from the produced
 *   distribution AND visible as absent.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const E2E_DIR = path.resolve(HERE, '..');

// ─── Helpers are imported lazily, AFTER the optional .env file is loaded:
// ─── api-client.js and auth-helper.js capture GATEWAY_URL at module-evaluation
// ─── time. Lazy import also keeps `import './seed-synthetic.mjs'` side-effect
// ─── free for synthetic.spec.js.
let envFileLoaded = false;
function loadEnvOnce() {
  const file = path.join(E2E_DIR, '.env');
  if (!existsSync(file)) return false;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
  envFileLoaded = true;
  return true;
}

let helpersPromise = null;
function loadHelpers() {
  if (!helpersPromise) {
    loadEnvOnce();
    helpersPromise = Promise.all([import('../helpers/api-client.js'), import('../helpers/auth-helper.js')]).then(
      ([apiModule, authModule]) => ({ apiClient: apiModule.apiClient, getToken: authModule.getToken, getUserId: authModule.getUserId }),
    );
  }
  return helpersPromise;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Catalogue constants — every number the scenario suite scores against.
// ═══════════════════════════════════════════════════════════════════════════════

export const CATALOGUE = Object.freeze({
  totalLeads: 200,
  // scenarios.v1.md's S2 headline names Bali 12 and Goa 31. Those six numbers
  // sum to 67, and the remaining 133 leads spread across the same six to
  // reconcile to 200 — so `destinationBase` is the headline tranche and
  // `destinations.final` (largest-remainder apportionment of 200) is what the
  // copilot actually counts. GOA IS THE TOP DESTINATION, not Bali.
  destinationBase: Object.freeze({ Bali: 12, Dubai: 8, Paris: 7, Tokyo: 5, Lisbon: 4, Goa: 31 }),
  // Deliberately ranks differently from destinations, so "which source brings
  // the most leads" cannot be answered from the destination ordering.
  sourceCounts: Object.freeze({
    referral: 58,
    website: 44,
    social_media: 35,
    phone_call: 27,
    walk_in: 22,
    email: 14,
  }),
  // Prisma enum pairs for Lead.source / Lead.platform (lead-service schema.prisma).
  sourcePlatform: Object.freeze({
    referral: 'Referral',
    website: 'Website_Form',
    social_media: 'Social_Media',
    phone_call: 'Phone_Call',
    walk_in: 'Walk_in',
    email: 'Email',
  }),
  invoices: Object.freeze({ over60: 6, between30and60: 14, under30: 20, paid: 10, partPaid: 5 }),
  bigEurInvoices: 2,
  bigEurThreshold: 5000,
  flights: 12,
  hotels: 9,
  quotations: 4,
  unassignedLeads: 30,
  // Lead tranches are owned by the REAL SEEDED USERS the suite logs in as, so
  // the ownership scenarios ("which of MY leads…") are answerable for whichever
  // role the spec authenticates as. Ids are resolved at commit via
  // getUserId(role); the dry run is role-keyed and needs no ids.
  // `token` is the ownership marker that appears in every lead name. It is NOT
  // the role name on purpose: "admin" is a substring of "superAdmin", and
  // score.js's normalise() lowercases, so role names would cross-match.
  operators: Object.freeze([
    Object.freeze({ role: 'salesRep', leadCount: 90, token: 'operator1' }),
    Object.freeze({ role: 'admin', leadCount: 60, token: 'operator2' }),
    Object.freeze({ role: 'superAdmin', leadCount: 20, token: 'operator3' }),
  ]),
});

export const UNASSIGNED_TOKEN = 'unassigned';

export const OVERDUE_AGES = Object.freeze({
  over60: Object.freeze([95, 88, 77, 70, 66, 61]),
  between30and60: Object.freeze(Array.from({ length: 14 }, (_, k) => 31 + k * 2)),
  under30: Object.freeze(Array.from({ length: 20 }, (_, k) => 1 + k)),
});

export const QUOTATION_EXPIRY_DAYS = Object.freeze([2, 5, 9, 13]);
export const FLIGHT_BANDS = Object.freeze([
  'overdue', 'overdue',
  'within72h', 'within72h', 'within72h',
  'withinWeek', 'withinWeek', 'withinWeek', 'withinWeek',
  'later', 'later', 'later',
]);
export const HOTEL_SLOTS = Object.freeze({
  insideWeek: Object.freeze([0, 1, 2]),
  noSupplierCode: Object.freeze([7, 8]),
});

export const DEFAULT_SEED = 20260912;
const DAY_MS = 86_400_000;
const LONG_NOTE = 'Synthetic long note field. '.repeat(70).slice(0, 1200);
const ZERO_WIDTH_SPACE = '\u200b';

// ═══════════════════════════════════════════════════════════════════════════════
// Seeded PRNG — no Math.random() anywhere, so the same SYNTH_SEED always yields
// the same book of business (only the run id / marker differs between runs).
// ═══════════════════════════════════════════════════════════════════════════════

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, rng) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const expandToArray = (counts) => {
  const out = [];
  for (const [key, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i += 1) out.push(key);
  }
  return out;
};

/** Largest-remainder apportionment: scale `counts` up to `total` exactly. */
export function apportion(counts, total) {
  const entries = Object.entries(counts);
  const baseSum = entries.reduce((sum, [, n]) => sum + n, 0);
  const out = {};
  const remainders = [];
  for (const [key, n] of entries) {
    const exact = (n * total) / baseSum;
    out[key] = Math.floor(exact);
    remainders.push([key, exact - Math.floor(exact)]);
  }
  remainders.sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  let left = total - Object.values(out).reduce((sum, n) => sum + n, 0);
  for (let i = 0; left > 0; i += 1, left -= 1) out[remainders[i][0]] += 1;
  return out;
}

const round2 = (n) => Math.round(n * 100) / 100;
const isoDate = (date) => date.toISOString().slice(0, 10);
const isoDateTime = (date) => date.toISOString();
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
const pad3 = (n) => String(n).padStart(3, '0');

// ═══════════════════════════════════════════════════════════════════════════════
// Plan — pure, offline, deterministic. Everything above the CLI is network-free.
// ═══════════════════════════════════════════════════════════════════════════════

export function planFor({ runId = process.env.SYNTH_RUN_ID || 'plan', withAdversarial = false, withOvercap = false } = {}) {
  return buildPlan({ runId, withAdversarial, withOvercap });
}

function buildPlan({ runId, withAdversarial = false, withOvercap = false }) {
  const seed = Number(process.env.SYNTH_SEED || DEFAULT_SEED);
  const rng = mulberry32(seed);
  const marker = `SYNTH-${runId}`;

  const now = process.env.SYNTH_NOW
    ? new Date(process.env.SYNTH_NOW)
    : new Date(`${isoDate(new Date())}T09:00:00.000Z`);
  if (Number.isNaN(now.getTime())) throw new Error(`SYNTH_NOW is not a valid date: ${process.env.SYNTH_NOW}`);

  const destinationFinal = apportion(CATALOGUE.destinationBase, CATALOGUE.totalLeads);
  const destinationLane = shuffled(expandToArray(destinationFinal), rng);
  const sourceLane = shuffled(expandToArray(CATALOGUE.sourceCounts), rng);
  const ownerLane = shuffled(
    [
      ...Array(CATALOGUE.operators[0].leadCount).fill(CATALOGUE.operators[0].role),
      ...Array(CATALOGUE.operators[1].leadCount).fill(CATALOGUE.operators[1].role),
      ...Array(CATALOGUE.operators[2].leadCount).fill(CATALOGUE.operators[2].role),
      ...Array(CATALOGUE.unassignedLeads).fill(null),
    ],
    rng,
  );
  const tokenForRole = (role) => (role ? CATALOGUE.operators.find((op) => op.role === role).token : UNASSIGNED_TOKEN);

  // ── Leads ──────────────────────────────────────────────────────────────────
  const leads = [];
  for (let i = 0; i < CATALOGUE.totalLeads; i += 1) {
    const destination = destinationLane[i];
    const source = sourceLane[i];
    leads.push({
      slot: i,
      ref: `lead[${i}]`,
      name: `[${marker}-${tokenForRole(ownerLane[i])}-${pad3(i)}] Lead ${pad3(i)}`,
      // The ownership token rides in the email too, and therefore in the invoice
      // and quotation customerEmail snapshots: leakage stays detectable in
      // billing responses, not only where a lead name is rendered.
      email: `synth-${runId}+${tokenForRole(ownerLane[i])}-${pad3(i)}@travelcrm.test`,
      phone: `+1555${String(1_000_000 + i)}`,
      destination,
      source,
      platform: CATALOGUE.sourcePlatform[source],
      numberOfTravelers: 1 + (i % 5),
      budget: `USD ${2000 + i * 25}`,
      budgetValue: 2000 + i * 25,
      message: `Synthetic ${destination} enquiry via ${source} (slot ${i}).`,
      travelDate: isoDate(addDays(now, 30 + (i % 180))),
      lifecycleStatus: i % 17 === 0 ? 'DRAFTING' : 'NEW',
      priority: ['low', 'medium', 'high'][i % 3],
      ownerRole: ownerLane[i],
      tags: [marker, tokenForRole(ownerLane[i]), destination, source],
    });
  }
  const operatorLeadSlots = Object.fromEntries(
    CATALOGUE.operators.map((op) => [op.role, leads.filter((l) => l.ownerRole === op.role).map((l) => l.slot)]),
  );
  const unassignedLeadSlots = leads.filter((l) => l.ownerRole === null).map((l) => l.slot);
  const leadBySlot = new Map(leads.map((l) => [l.slot, l]));

  // ── Invoices ───────────────────────────────────────────────────────────────
  // 40 in the three overdue bands (status sent + a past dueDate → exactly the
  // predicate the API's /billing/invoices/overdue and the copilot's overdueBy
  // rule use), plus 10 paid and 5 part-paid with FUTURE due dates so they never
  // pollute the overdue set. The copilot's overdueBy gate is paymentStatus ∈
  // {unpaid, partial}, so the part-paid rows must not be past due.
  const invoices = [];
  const pushInvoice = (entry) => {
    const lead = leadBySlot.get(entry.ledSlot);
    const total = round2(entry.unitPrice * (1 + entry.taxRate / 100));
    invoices.push({
      index: invoices.length,
      ref: `invoice[${invoices.length}]`,
      ...entry,
      totalAmount: total,
      customerName: `Synthetic Customer ${pad3(entry.ledSlot)}`,
      customerEmail: lead.email,
      notes: `${marker} | ${entry.note || 'synthetic invoice'}`,
    });
  };

  // The two big EUR invoices are the two most overdue, so "over 60 days and
  // over EUR 5,000, most overdue first" has one unambiguous order.
  for (let i = 0; i < CATALOGUE.invoices.over60; i += 1) {
    const isBigEur = i < CATALOGUE.bigEurInvoices;
    pushInvoice({
      ledSlot: i,
      band: 'over60',
      kind: 'overdue',
      status: 'sent',
      currency: isBigEur ? 'EUR' : 'USD',
      unitPrice: isBigEur ? (i === 0 ? 7500 : 6200) : 900 + i * 310,
      taxRate: 0,
      overdueDays: OVERDUE_AGES.over60[i],
      dueDate: addDays(now, -OVERDUE_AGES.over60[i]),
      description: isBigEur
        ? `Synthetic EUR package ${pad3(i)} (above EUR 5000, over 60 days)`
        : `Synthetic package ${pad3(i)} (over 60 days overdue)`,
      note: isBigEur ? 'high-value overdue' : 'overdue band 60+',
    });
  }
  for (let k = 0; k < CATALOGUE.invoices.between30and60; k += 1) {
    const age = OVERDUE_AGES.between30and60[k];
    pushInvoice({
      ledSlot: CATALOGUE.invoices.over60 + k,
      band: 'between30and60',
      kind: 'overdue',
      status: 'sent',
      currency: 'USD',
      unitPrice: 420 + k * 90,
      taxRate: 5,
      overdueDays: age,
      dueDate: addDays(now, -age),
      description: `Synthetic package ${pad3(6 + k)} (30-60 days overdue)`,
      note: 'overdue band 30-60',
    });
  }
  for (let k = 0; k < CATALOGUE.invoices.under30; k += 1) {
    const age = OVERDUE_AGES.under30[k];
    pushInvoice({
      ledSlot: CATALOGUE.invoices.over60 + CATALOGUE.invoices.between30and60 + k,
      band: 'under30',
      kind: 'overdue',
      status: 'sent',
      currency: 'USD',
      unitPrice: 260 + k * 45,
      taxRate: 0,
      overdueDays: age,
      dueDate: addDays(now, -age),
      description: `Synthetic package ${pad3(20 + k)} (under 30 days overdue)`,
      note: 'overdue band under-30',
    });
  }
  const overdueInvoiceCount =
    CATALOGUE.invoices.over60 + CATALOGUE.invoices.between30and60 + CATALOGUE.invoices.under30;
  for (let k = 0; k < CATALOGUE.invoices.paid; k += 1) {
    pushInvoice({
      ledSlot: overdueInvoiceCount + k,
      band: null,
      kind: 'paid',
      status: 'paid',
      currency: 'USD',
      unitPrice: 1500 + k * 275,
      taxRate: 0, // no tax: a 5% float residue would leave paidAmount a hair under totalAmount, and the receipt would then mark the invoice 'partial'
      overdueDays: 0,
      dueDate: addDays(now, 10 + k * 2),
      receipt: { fraction: 1, paymentType: 'full-payment', paymentMethod: 'card' },
      description: `Synthetic package ${pad3(40 + k)} (settled in full)`,
      note: 'paid in full',
    });
  }
  for (let k = 0; k < CATALOGUE.invoices.partPaid; k += 1) {
    pushInvoice({
      ledSlot: overdueInvoiceCount + CATALOGUE.invoices.paid + k,
      band: null,
      kind: 'partPaid',
      status: 'partial',
      currency: 'USD',
      unitPrice: 3400 + k * 480,
      taxRate: 0,
      overdueDays: 0,
      dueDate: addDays(now, 7 + k * 3),
      receipt: { fraction: 0.4, paymentType: 'advance', paymentMethod: 'cash' },
      description: `Synthetic package ${pad3(50 + k)} (40% deposit taken)`,
      note: 'part-paid',
    });
  }
  const bigEurInvoices = invoices.filter((inv) => inv.currency === 'EUR' && inv.totalAmount > CATALOGUE.bigEurThreshold);

  // ── Quotations (expiring inside the window) ────────────────────────────────
  const quotations = QUOTATION_EXPIRY_DAYS.map((days, i) => ({
    index: i,
    ref: `quotation[${i}]`,
    leadSlot: i,
    currency: 'USD',
    validUntil: addDays(now, days),
    expiresInDays: days,
    status: 'sent',
    unitPrice: 2200 + i * 650,
    taxRate: 5,
  }));

  // ── Flight bookings ────────────────────────────────────────────────────────
  // `intentBand` is the catalogue's ask. Under MockFlightClient every booking
  // gets ticketingDeadline = bookedAt + 24h and a generated PNR, so the intent
  // cannot be authored (see GROUND_TRUTH.authorability and .flights.producedBands).
  const flights = FLIGHT_BANDS.map((band, i) => ({
    index: i,
    ref: `flight[${i}]`,
    leadSlot: i,
    intentBand: band,
    ticketedWithNoPnr: i === 9 || i === 10,
    tripType: 'oneWay',
    flightType: i % 3 === 0 ? 'optional' : 'itinerary',
    dayNumber: 1 + (i % 5),
    currency: 'USD',
    baseFare: 220 + i * 65,
    taxes: 40 + i * 12,
    fareTotal: 260 + i * 77,
    departureAt: isoDateTime(addDays(now, 30 + i * 3)),
  }));

  // ── Hotel bookings ─────────────────────────────────────────────────────────
  const hotels = Array.from({ length: CATALOGUE.hotels }, (_, i) => ({
    index: i,
    ref: `hotel[${i}]`,
    leadSlot: i,
    intentInsideWeek: HOTEL_SLOTS.insideWeek.includes(i),
    intentNoSupplierCode: HOTEL_SLOTS.noSupplierCode.includes(i),
    hotelId: `MOCK-HOTEL-${(i % 5) + 1}`,
    dayNumber: 1 + (i % 5),
    checkinIntent: isoDate(addDays(now, i < 3 ? 2 + i : 14 + i)),
    checkoutIntent: isoDate(addDays(now, i < 3 ? 5 + i : 17 + i)),
    rate: { roomType: 'Deluxe King', boardType: 'Bed & Breakfast', currency: 'USD', totalAmount: 300 + i * 25 },
  }));

  // ── Adversarial rows ───────────────────────────────────────────────────────
  const adversarial = withAdversarial ? buildAdversarialRows({ marker, runId, now }) : [];

  // ── Over-cap filler ────────────────────────────────────────────────────────
  const overcapCount = withOvercap ? Number(process.env.SYNTH_OVERCAP_ROWS || 1200) : 0;
  const destinationCycle = Object.keys(CATALOGUE.destinationBase);
  const sourceCycle = Object.keys(CATALOGUE.sourceCounts);
  const overcapLeads = Array.from({ length: overcapCount }, (_, i) => ({
    slot: CATALOGUE.totalLeads + i,
    ref: `filler[${i}]`,
    name: `[${marker}-${CATALOGUE.operators[i % CATALOGUE.operators.length].token}-f${pad3(i)}] Filler ${pad3(i)}`,
    email: `synth-${runId}+filler${pad3(i)}@travelcrm.test`,
    destination: destinationCycle[i % destinationCycle.length],
    source: sourceCycle[i % sourceCycle.length],
    platform: CATALOGUE.sourcePlatform[sourceCycle[i % sourceCycle.length]],
    ownerRole: CATALOGUE.operators[i % CATALOGUE.operators.length].role,
    tags: [marker, 'overcap'],
  }));

  const plan = {
    runId,
    marker,
    seed,
    now,
    withAdversarial,
    withOvercap,
    leads,
    operatorLeadSlots,
    unassignedLeadSlots,
    invoices,
    bigEurInvoices,
    quotations,
    flights,
    hotels,
    adversarial,
    overcapLeads,
    totals: {
      leads: leads.length,
      invoices: invoices.length,
      receipts: invoices.filter((inv) => inv.receipt).length,
      quotations: quotations.length,
      flights: flights.length,
      hotels: hotels.length,
      operators: CATALOGUE.operators.length,
      adversarialRows: adversarial.length,
      overcapLeads: overcapLeads.length,
    },
  };
  plan.groundTruth = buildGroundTruth(plan);
  plan.requestEstimate = estimateRequests(plan);
  return plan;
}

/**
 * Parses `adversarial.v1.jsonl` and states, per row, whether the HTTP create
 * surface can produce it. Statuses:
 *   seedable                    a row is created by commitAdversarial()
 *   satisfied-by-clean-workload  the clean 200-lead book already produces it
 *   not-row-seedable            no HTTP path exists; `reason` says why
 */
function buildAdversarialRows({ marker, runId, now }) {
  const file = path.join(HERE, 'adversarial.v1.jsonl');
  if (!existsSync(file)) throw new Error(`adversarial.v1.jsonl not found at ${file}`);
  const parsed = readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`adversarial.v1.jsonl line ${i + 1} is not valid JSON: ${err.message}`);
      }
    });

  // Lead rows each adversarial seeder creates — lets GROUND_TRUTH state the
  // additive count without touching the network.
  const ADVERSARIAL_LEAD_ROWS = Object.freeze({
    'injection-in-name': 1,
    'sql-ish-destination': 1,
    'duplicate-customer-names': 2,
    'blank-destination': 1,
    'negative-budget': 1,
    'zero-budget': 1,
    'huge-budget': 1,
    'long-note': 1,
    'cjk-name': 1,
    'emoji-only-name': 1,
    'claimed-with-null-owner': 1,
    'zero-width-chars': 1,
    'html-in-name': 1,
    'group-at-minimum': 3,
    'group-below-minimum': 2,
  });

  const PLANS = {
    'injection-in-name': { status: 'seedable', create: 'lead-name-payload' },
    'sql-ish-destination': { status: 'seedable', create: 'lead-destination-payload' },
    'duplicate-customer-names': { status: 'seedable', create: 'lead-name-payload-twice' },
    'blank-destination': { status: 'seedable', create: 'lead-destination-null' },
    'negative-budget': {
      status: 'seedable',
      create: 'lead-budget-string',
      note: "Lead.budget is z.string() (lead.validator.js:21), so the JSONL's numeric -500 is rejected at ingest with 400. Seeded as the string '-500' so the render path is still exercised.",
    },
    'zero-budget': { status: 'seedable', create: 'lead-budget-string', note: 'Seeded as the string "0".' },
    'huge-budget': { status: 'seedable', create: 'lead-budget-string', note: 'Seeded as the string "999999999".' },
    'long-note': {
      status: 'seedable',
      create: 'lead-long-message',
      note: 'Lead has no `notes` column; the 1200-char payload goes into `message`, the lead free-text field.',
    },
    'cjk-name': { status: 'seedable', create: 'lead-name-payload' },
    'emoji-only-name': { status: 'seedable', create: 'lead-name-payload' },
    'claimed-with-null-owner': {
      status: 'seedable',
      create: 'lead-claimed-null-owner',
      note: 'Approximated as lifecycleStatus=BOOKING_IN_PROGRESS + assignedToId=null; "claimed" is not a separate column.',
    },
    'null-due-date': {
      status: 'not-row-seedable',
      reason: 'Invoice.dueDate is NOT NULL with no default, and createInvoice spreads the body straight into Prisma.',
    },
    'duplicate-invoice-number': {
      status: 'not-row-seedable',
      reason: 'createInvoice overwrites any body invoiceNumber with nextInvoiceNumber(), and invoiceNumber is @unique.',
    },
    'malformed-pnr': {
      status: 'not-row-seedable',
      reason: 'PNR is provider-generated and stripped from the request body; MockFlightClient always returns MOCK######.',
    },
    'currency-symbols': {
      status: 'seedable',
      create: 'invoice-currency-symbols',
      note: 'An invoice whose items total exactly 1500 and whose notes carry the literal "₹1,500", so the canonical value is resolvable.',
    },
    'empty-page': {
      status: 'not-row-seedable',
      reason: 'A collection precondition (a collection with no rows), not a row; point a scenario at a filter that matches nothing instead.',
    },
    'over-cap-page': {
      status: 'not-row-seedable',
      reason: 'Needs ~1200 rows in one collection; available behind --with-overcap, which is deliberately not part of --with-adversarial because it costs ~1200 throttled requests and invalidates every clean-workload count.',
    },
    'group-at-minimum': { status: 'seedable', create: 'lead-group-3' },
    'group-below-minimum': { status: 'seedable', create: 'lead-group-2' },
    'group-large': {
      status: 'satisfied-by-clean-workload',
      reason: 'The clean workload already contains a 92-lead Goa cluster (catalogue headline: 31). No extra row is created.',
    },
    'all-sources-denied': {
      status: 'not-row-seedable',
      reason: 'An authorization precondition (a role with no read access), not a row; it needs a token/role fixture.',
    },
    'zero-width-chars': {
      status: 'seedable',
      create: 'lead-zero-width-destination',
      note: 'The JSONL double-escapes this value, so JSON.parse yields the literal 11-char string "Bali\\u200b". Seeded as a real U+200B zero-width space, which is what the row exists to test.',
    },
    'html-in-name': { status: 'seedable', create: 'lead-name-payload' },
  };

  return parsed.map((row) => {
    const plan = PLANS[row.id];
    if (!plan) throw new Error(`adversarial.v1.jsonl row "${row.id}" has no seeding plan`);
    return {
      ...row,
      runId,
      marker,
      ref: `adversarial:${row.id}`,
      status: plan.status,
      create: plan.create || null,
      leads: ADVERSARIAL_LEAD_ROWS[row.id] || 0,
      note: plan.note || null,
      reason: plan.reason || null,
      seedEmail: `synth-${runId}+adv-${row.id}@travelcrm.test`,
      tag: `adversarial:${row.id}`,
      now,
    };
  });
}

/**
 * The scoring contract: pure (no ids, no network, no clock reads beyond the
 * plan's anchor). Entities are addressed by slot; commit prints a RESOLVED
 * manifest mapping slot → runtime id.
 */
function buildGroundTruth(plan) {
  const { leads, invoices } = plan;
  const destinationFinal = {};
  const sourceFinal = {};
  for (const lead of leads) {
    destinationFinal[lead.destination] = (destinationFinal[lead.destination] || 0) + 1;
    sourceFinal[lead.source] = (sourceFinal[lead.source] || 0) + 1;
  }
  const destinationBaseTotal = Object.values(CATALOGUE.destinationBase).reduce((a, b) => a + b, 0);
  const leadBySlot = new Map(leads.map((l) => [l.slot, l]));

  const overdueInvoiceLeadSlots = invoices.filter((inv) => inv.kind === 'overdue').map((inv) => inv.ledSlot);
  const overdueSet = new Set(overdueInvoiceLeadSlots);

  // ── Per-role ownership, the shape the ownership scenarios score against ────
  const operators = {};
  for (const op of CATALOGUE.operators) {
    const slots = plan.operatorLeadSlots[op.role];
    operators[op.role] = {
      namePrefix: `${plan.marker}-${op.token}-`,
      ownershipToken: `${op.token}-`,
      leadCount: slots.length,
      // The copilot's going-quiet rules key off Lead.updatedAt (leads adapter
      // staleForDays: 7 days; stuckInStatus: 2 days). Every seeded lead is
      // created now, so the honest count is 0 — the staleness split is NOT
      // authorable (see authorability `lead-staleness`).
      quietCount: 0,
      // Copilot rule: invoice past due AND paymentStatus ∈ {unpaid, partial}.
      overdueCount: slots.filter((slot) => overdueSet.has(slot)).length,
      leadSlots: slots,
    };
  }
  operators.unassigned = {
    namePrefix: `${plan.marker}-${UNASSIGNED_TOKEN}-`,
    ownershipToken: `${UNASSIGNED_TOKEN}-`,
    leadCount: plan.unassignedLeadSlots.length,
    quietCount: 0,
    overdueCount: plan.unassignedLeadSlots.filter((slot) => overdueSet.has(slot)).length,
    leadSlots: plan.unassignedLeadSlots,
  };
  operators.operatorSlots = Object.fromEntries(CATALOGUE.operators.map((op) => [op.token, op.role]));
  operators.notes = {
    quietCount:
      'Always 0 in a fresh seed: lead. updatedAt is server-set and no endpoint writes followUpDate, so no lead can be 2 or 7 days stale. See authorability `lead-staleness`.',
    overdueCount: 'Invoices past due (paymentStatus unpaid/partial, dueDate < now) whose lead is owned by this role.',
    unassigned: 'lifecycleStatus NEW with assignedToId=null — see authorability `unassigned-pending-verification`.',
    namePrefix:
      'Run-scoped: SYNTH-<runId>-<token>-. Present in every lead name and in the leads search used by --cleanup, so cleanup removes exactly this run.',
    ownershipToken:
      'Run-independent safe token (<token>-). Use this for the non-leakage assertion when the run id is not pinned, so a prefix that matches nothing cannot make the assertion vacuous.',
    adversarial: 'Adversarial rows are NOT part of the 200-lead ownership tranches and carry no operator token in their name (some must carry a hostile payload verbatim); they are discovered by email/tags instead.',
    operatorSlots:
      'Sibling key (operators.operatorSlots), not a per-role field: maps operator1/2/3 → salesRep/admin/superAdmin. `unassigned` is the fourth tranche and has no entry there because it maps to no seeded user.',
    unassignedTranche:
      'The 30 unassigned leads have ownerRole === null but a real `unassigned` ownership token; treat them as a role key, not as leads missing an owner token.',
  };

  const outstandingByOwner = {};
  for (const key of [...CATALOGUE.operators.map((op) => op.role), 'unassigned']) {
    outstandingByOwner[key] = { invoices: 0, totalAmount: 0, outstandingAmount: 0 };
  }
  const customers = invoices.map((inv) => {
    const lead = leadBySlot.get(inv.ledSlot);
    const owner = lead?.ownerRole || 'unassigned';
    const outstanding = inv.kind === 'paid' ? 0 : inv.receipt ? round2(inv.totalAmount * (1 - inv.receipt.fraction)) : inv.totalAmount;
    outstandingByOwner[owner].invoices += 1;
    outstandingByOwner[owner].totalAmount = round2(outstandingByOwner[owner].totalAmount + inv.totalAmount);
    outstandingByOwner[owner].outstandingAmount = round2(outstandingByOwner[owner].outstandingAmount + outstanding);
    return {
      slot: inv.ledSlot,
      ref: `lead[${inv.ledSlot}]`,
      customerName: inv.customerName,
      currency: inv.currency,
      invoiceRef: inv.ref,
      totalAmount: inv.totalAmount,
      outstandingAmount: outstanding,
      overdueDays: inv.overdueDays,
      paymentState: inv.kind === 'paid' ? 'paid' : inv.kind === 'partPaid' ? 'partial' : 'unpaid',
    };
  });

  const flightLeadSlots = plan.flights.map((f) => f.leadSlot);
  const hotelLeadSlots = plan.hotels.map((h) => h.leadSlot);
  const quotationLeadSlots = plan.quotations.map((q) => q.leadSlot);

  // ── S1 rubrics ─────────────────────────────────────────────────────────────
  // /leads: the `unassigned` rule ('Lead has no owner.', warning, attention)
  // outranks the info-level grouping insights, so the top-3 is the three
  // unassigned leads with the largest requested budget, tie-broken by slot.
  const topLeadSlots = [...plan.unassignedLeadSlots]
    .sort((a, b) => leadBySlot.get(b).budgetValue - leadBySlot.get(a).budgetValue || a - b)
    .slice(0, 3);
  // /billing: the overdueBy rule is `criticalAfterDays: 60`, so the critical
  // band is the six > 60-day invoices; ordering is due date ascending (most
  // overdue first) and invoice[0]/invoice[1] are the two EUR > 5,000 rows.
  const topBillingRefs = [...invoices]
    .filter((inv) => inv.kind === 'overdue')
    .sort((a, b) => b.overdueDays - a.overdueDays || a.index - b.index)
    .slice(0, 3)
    .map((inv) => inv.ref);

  return {
    runId: plan.runId,
    marker: plan.marker,
    seed: plan.seed,
    workload: {
      operators: plan.totals.operators,
      leads: plan.totals.leads,
      invoices: plan.totals.invoices,
      receipts: plan.totals.receipts,
      quotations: plan.totals.quotations,
      flightBookings: plan.totals.flights,
      hotelBookings: plan.totals.hotels,
    },
    destinations: {
      // Authoritative: what the copilot counts over this run's marked leads
      // (plus whatever non-synthetic rows already sit in the shared DB).
      final: destinationFinal,
      // The catalogue's headline tranche, kept so the drift stays auditable.
      base: { ...CATALOGUE.destinationBase },
      reconciliation: {
        baseTotal: destinationBaseTotal,
        extraTranche: CATALOGUE.totalLeads - destinationBaseTotal,
        total: CATALOGUE.totalLeads,
        rule: 'largest-remainder apportionment of 200 over the catalogue base weights',
      },
      ranking: Object.entries(destinationFinal)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([destination, count]) => ({ destination, count })),
    },
    sources: {
      final: sourceFinal,
      ranking: Object.entries(sourceFinal)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([source, count]) => ({ source, count })),
    },
    operators,
    invoiceBands: {
      overdue: {
        over60Days: CATALOGUE.invoices.over60,
        between30And60Days: CATALOGUE.invoices.between30and60,
        under30Days: CATALOGUE.invoices.under30,
        total: overdueInvoiceLeadSlots.length,
      },
      paymentStates: {
        unpaid: invoices.filter((i) => i.kind === 'overdue').length,
        paid: CATALOGUE.invoices.paid,
        partPaid: CATALOGUE.invoices.partPaid,
        total: invoices.length,
      },
      over60AndOverEur5000: plan.bigEurInvoices.map((inv) => ({
        slot: inv.ref,
        leadRef: `lead[${inv.ledSlot}]`,
        currency: inv.currency,
        totalAmount: inv.totalAmount,
        overdueDays: inv.overdueDays,
        match: 'past its due date',
      })),
      outstandingByOwner,
      customers,
    },
    quotations: {
      count: plan.quotations.length,
      expiringInDays: plan.quotations.map((q) => q.expiresInDays),
      refs: plan.quotations.map((q) => ({ slot: q.ref, leadRef: `lead[${q.leadSlot}]`, validUntil: isoDate(q.validUntil) })),
    },
    flights: {
      count: plan.flights.length,
      intendedBands: {
        overdue: plan.flights.filter((f) => f.intentBand === 'overdue').length,
        within72h: plan.flights.filter((f) => f.intentBand === 'within72h').length,
        withinWeek: plan.flights.filter((f) => f.intentBand === 'withinWeek').length,
        later: plan.flights.filter((f) => f.intentBand === 'later').length,
        ticketedWithNoPnr: plan.flights.filter((f) => f.ticketedWithNoPnr).length,
      },
      // What the mock provider actually produces (see authorability).
      producedBands: {
        overdue: 0,
        inside72h: plan.flights.length,
        insideWeek: plan.flights.length,
        later: 0,
        ticketedWithNoPnr: 0,
        basis:
          'MockFlightClient returns ticketingDeadline = bookedAt + 24h and always a MOCK###### PNR, so every booking lands inside 72h and none is overdue, later or PNR-less.',
      },
      refs: plan.flights.map((f) => ({ slot: f.ref, leadRef: `lead[${f.leadSlot}]`, intentBand: f.intentBand })),
    },
    hotels: {
      count: plan.hotels.length,
      intendedBands: {
        staysStartingInsideWeek: HOTEL_SLOTS.insideWeek.length,
        withoutSupplierCode: HOTEL_SLOTS.noSupplierCode.length,
      },
      producedBands: {
        staysStartingInsideWeek: plan.hotels.length,
        withoutSupplierCode: 0,
        basis:
          'MockHotelClient.book returns checkin = today, checkout = today + 3d and always a MOCK-BOOK-###### id; the controller prefers those over the offer dates and always persists liteapiBookingId.',
      },
      refs: plan.hotels.map((h) => ({ slot: h.ref, leadRef: `lead[${h.leadSlot}]` })),
    },
    crossEntity: {
      overdueInvoiceLeadSlots,
      flightLeadSlots,
      hotelLeadSlots,
      quotationLeadSlots,
      overdueInvoiceAndFlightLeadSlots: flightLeadSlots.filter((slot) => overdueSet.has(slot)),
      note: 'Every seeded flight is inside 24h under the mock provider, so the S3 intersection is simply the flight leads that also have an overdue invoice.',
    },
    // Each entry is { slot, match }: scoreTopN/scoreOrder take `match` (a
    // lowercase substring that must appear in the rendered insight text) and
    // `slot` is the entity the runner resolves through the commit manifest.
    expectedTop3: {
      rubrics: {
        leads: 'unassigned rule ("Lead has no owner.", warning/attention) ranked by requested budget, descending',
        billing: 'overdueBy critical band (> 60 days past due), most overdue first; invoice[0] and invoice[1] are the EUR > 5,000 rows',
        flights: 'ticketing-deadline criticals first (irreversible), then nearest deadline — NOT achievable with the mock provider',
      },
      leads: topLeadSlots.map((slot) => ({ slot: `lead[${slot}]`, match: 'no owner' })),
      billing: topBillingRefs.map((slot) => ({ slot, match: 'past its due date' })),
      flights: [
        { slot: 'flight[0]', match: 'ticketing deadline' },
        { slot: 'flight[1]', match: 'ticketing deadline' },
        { slot: 'flight[2]', match: 'ticketing deadline' },
      ],
      flightsProducedBehaviour:
        'All 12 bookings carry ticketingDeadline = bookedAt + 24h, so the panel should rank all 12 as "deadline is within three days" criticals. Any three of the twelve is a defensible top-3; the ordering is not determined by a deadline difference. Score the flight page by set membership, not order.',
    },
    authorability: { gaps: buildAuthorabilityGaps(plan) },
    adversarial: plan.withAdversarial
      ? {
          rows: plan.adversarial.length,
          seedable: plan.adversarial.filter((r) => r.status === 'seedable').length,
          satisfiedByCleanWorkload: plan.adversarial.filter((r) => r.status === 'satisfied-by-clean-workload').length,
          leadsCreated: plan.adversarial.reduce((n, r) => n + r.leads, 0),
          invoicesCreated: plan.adversarial.filter((r) => r.create === 'invoice-currency-symbols').length,
          additive: true,
          noteVisibleToCopilot:
            'These rows are ADDITIVE to the clean 200-lead baseline: with --with-adversarial the copilot counts them too, so score the clean counts only against the non-adversarial variant.',
          notRowSeedable: plan.adversarial.filter((r) => r.status === 'not-row-seedable').map((r) => ({ id: r.id, reason: r.reason })),
          table: plan.adversarial.map((r) => ({ id: r.id, entity: r.entity, status: r.status, create: r.create, leads: r.leads })),
        }
      : { enabled: false, rows: 23, note: 'Re-run with --with-adversarial to seed them.' },
    overcap: plan.withOvercap
      ? {
          fillerLeads: plan.overcapLeads.length,
          note: 'Filler rows are excluded from every clean-workload count above; they exist only to push a collection past the 200-row page cap and the 1000-row fetch cap.',
        }
      : { enabled: false, note: '--with-overcap adds ~1200 filler leads (about an hour behind the Gateway rate limiter).' },
  };
}

/** One entry per un-authorable catalogue band: case / reason / evidence / fallback. */
function buildAuthorabilityGaps(plan) {
  return [
    {
      case: 'unassigned-pending-verification',
      reason:
        'The 30 unassigned leads cannot be PENDING_VERIFICATION: the lead create/update validators reject that status, and the only writer is the service-to-service chatbot intake webhook.',
      evidence: 'Services/lead-service/src/validators/lead.validator.js:5-12 (enum omits PENDING_VERIFICATION); Services/lead-service/src/controllers/leadIntake.controller.js:62; Services/lead-service/src/routes/lead.routes.js:40 (x-internal-token)',
      fallback: 'Seeded as lifecycleStatus NEW with assignedToId=null (PATCH /leads/:id/unassign). The claim queue GET /leads/status/PENDING_VERIFICATION stays empty; ownership scenarios read assignedToId instead.',
    },
    {
      case: 'flight-overdue-band',
      reason: 'MockFlightClient pins ticketingDeadline to bookedAt + 24h; no request field or endpoint can set or backdate it.',
      evidence: 'Services/flight-service/src/clients/mock.client.js:59; Services/flight-service/src/controllers/leadFlight.controller.js:71 (deadline copied from the provider order)',
      fallback: 'All 12 bookings are seeded and land inside 72h. OVERDUE=0, LATER=0 — see flights.producedBands. An overdue band needs a real provider or a direct DB write.',
    },
    {
      case: 'flight-ticketed-no-pnr',
      reason: 'PNR is provider-generated and never read from the request body; the mock always returns one.',
      evidence: 'Services/flight-service/src/clients/mock.client.js:56; Services/flight-service/src/validators/flight.schema.js:109 (leadBookSchema has no pnr field)',
      fallback: 'Seeded normally, so every booking has a PNR and the flights-page rule "Ticketed flight booking has no PNR." (Services/assistant-service/src/adapters/pages/flights.adapter.js:87) can never fire. producedBands.ticketedWithNoPnr = 0.',
    },
    {
      case: 'hotel-stay-band',
      reason: 'MockHotelClient.book returns checkin = today and checkout = today + 3d, and the controller prefers the provider result over the offer dates.',
      evidence: 'Services/package-service/src/hotels/clients/mock.client.js:118-119; Services/package-service/src/hotels/controllers/hotelBooking.controller.js:66-67',
      fallback: 'All 9 bookings are seeded and start today, so staysStartingInsideWeek = 9 (not 3) and LATER = 0. The band needs a real provider or a direct DB write.',
    },
    {
      case: 'hotel-no-supplier-code',
      reason: 'The mock always returns a booking id and the controller always persists it as liteapiBookingId.',
      evidence: 'Services/package-service/src/hotels/clients/mock.client.js:114; Services/package-service/src/hotels/controllers/hotelBooking.controller.js:147',
      fallback: 'All 9 bookings carry a MOCK-BOOK-###### supplier code; producedBands.withoutSupplierCode = 0.',
    },
    {
      case: 'lead-staleness',
      reason: 'No HTTP surface writes a lead-activity timestamp: updateLeadSchema is .strict() and does not accept followUpDate, and createdAt/updatedAt are server-set on a fresh row.',
      evidence: 'Services/lead-service/src/validators/lead.validator.js:14-35 and :59 (strict update schema, no followUpDate); Services/assistant-service/src/adapters/pages/leadsCollection.adapter.js:60 (staleForDays, updatedAt, 7 days) and :49 (stuckInStatus, 2 days)',
      fallback: 'Seeded fresh, so operators.*.quietCount = 0 for every role. The per-role lead tranches (90/60/20) are authored; the 7-day-quiet split needs a direct DB backdate of updatedAt or followUpDate.',
    },
    {
      case: 'invoice-null-due-date',
      reason: 'Invoice.dueDate is NOT NULL with no default and createInvoice spreads the body straight into Prisma.',
      evidence: 'Services/billing-service/prisma/schema.prisma:298; Services/billing-service/src/controllers/invoice.controller.js:71-84',
      fallback: 'Not seeded. The adversarial row null-due-date is reported as not-row-seedable; it needs a direct DB write.',
    },
    {
      case: 'invoice-duplicate-number',
      reason: 'createInvoice overwrites any body invoiceNumber with an auto-generated one, and Invoice.invoiceNumber is @unique.',
      evidence: 'Services/billing-service/src/controllers/invoice.controller.js:71 and :84; Services/billing-service/prisma/schema.prisma:266 (@unique)',
      fallback: 'Not seeded. The adversarial row duplicate-invoice-number is reported as not-row-seedable; it needs a direct DB write.',
    },
    {
      case: 'flight-malformed-pnr',
      reason: 'The PNR column is written only from the provider result; the request body cannot carry one.',
      evidence: 'Services/flight-service/src/clients/mock.client.js:56; Services/flight-service/src/controllers/leadFlight.controller.js:59',
      fallback: 'Not seeded. The adversarial row malformed-pnr is reported as not-row-seedable; it needs a real provider or a direct DB write.',
    },
    {
      case: 'collection-empty-page',
      reason: 'An empty page is a precondition of a view, not a row; it cannot be created inside a shared DB that other runs also write to.',
      evidence: 'Services/e2e-tests/synthetic/adversarial.v1.jsonl (row: empty-page)',
      fallback: 'No row created. The scenario must be pointed at a filter that matches nothing (or the assertion must read the examined count).',
    },
    {
      case: 'collection-over-cap-page',
      reason: 'Exceeding the 200-row page and 1000-row fetch caps needs ~1200 rows in one collection.',
      evidence: 'Services/e2e-tests/synthetic/adversarial.v1.jsonl (row: over-cap-page); Services/assistant-service/src/adapters/pages/leadsCollection.adapter.js:5 (PAGE_LIMIT = 200)',
      fallback: 'Available behind --with-overcap (~1200 marked filler leads, excluded from every clean-workload count). Not enabled by --with-adversarial because it costs an hour of throttled requests.',
    },
    {
      case: 'collection-all-sources-denied',
      reason: 'A role with no read access is an authorization fixture, not a row.',
      evidence: 'Services/e2e-tests/synthetic/adversarial.v1.jsonl (row: all-sources-denied)',
      fallback: 'No row created. The scenario needs a token/role fixture, not seeded data.',
    },
    {
      case: 'marker-poor-entities',
      reason: 'HotelBooking has no free-text/notes column and FlightBooking.notes is never mapped from the request, so those two entities cannot carry the marker in a first-class field.',
      evidence: 'Services/package-service/prisma/schema.prisma:310-345 (no notes column); Services/flight-service/src/controllers/leadFlight.controller.js:58-96 (no notes mapping)',
      fallback: 'The marker rides in HotelBooking.guestInfo[].lastName + searchSnapshot.offer.name and in FlightBooking.travelers[].lastName + the booking contact email; cleanup discovers them through their marked leadId.',
    },
  ];
}

/** Upper-bound request count, so the plan can state what a commit will cost. */
function estimateRequests(plan) {
  const assigned = plan.leads.filter((l) => l.ownerRole && l.ownerRole !== 'salesRep').length;
  const requests =
    3 + // admin / salesRep / superAdmin logins (lead tranches are resolved from these)
    plan.leads.length + // POST /leads
    assigned + // PATCH /leads/:id/assign (seeded ids fail z.string().uuid() in the create body)
    plan.unassignedLeadSlots.length + // PATCH /leads/:id/unassign, when auto-assign fires
    plan.invoices.length + // POST /billing/invoices
    plan.invoices.filter((inv) => inv.receipt).length + // POST /billing/receipts
    plan.quotations.length +
    plan.flights.length +
    plan.hotels.length +
    plan.adversarial.reduce((n, r) => n + r.leads, 0) + // adversarial lead rows
    plan.adversarial.filter((r) => r.create === 'invoice-currency-symbols').length +
    plan.overcapLeads.length;
  const windowMs = Number(process.env.SYNTH_WINDOW_MS || 15 * 60 * 1000);
  const budget = Number(process.env.SYNTH_MAX_REQ_PER_WINDOW || 280);
  return {
    requests,
    throttledMinutes: Math.ceil((requests / budget) * (windowMs / 60000)),
    budgetPerWindow: budget,
    windowMinutes: Math.round(windowMs / 60000),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Safety guard — mirrors Services/e2e-tests/global-setup.js wording.
// ═══════════════════════════════════════════════════════════════════════════════

export function checkGuard() {
  const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000/api/v1';
  const isLocal = /localhost|127\.0\.0\.1/.test(gatewayUrl);
  const looksProd = /api\.lushtravelcloud\.com|\bprod(uction)?\b/i.test(gatewayUrl);
  const reasons = [];
  if (!isLocal || looksProd) {
    reasons.push(
      `Refusing to run against GATEWAY_URL="${gatewayUrl}".\n` +
        'This suite only ever runs against a local Gateway (http://localhost:3000/api/v1 by default).',
    );
  }
  if (process.env.E2E_I_UNDERSTAND_SHARED_DB !== 'true') {
    reasons.push(
      'Refusing to run: E2E_I_UNDERSTAND_SHARED_DB is not set to "true".\n' +
        'This suite creates real rows in the shared live Postgres database used by every ' +
        'service (there is no disposable test DB in this repo). Records are tagged with a ' +
        'per-run marker and cleaned up automatically, but you must opt in explicitly first.\n' +
        'Copy .env.example to .env, review it, and set E2E_I_UNDERSTAND_SHARED_DB=true.',
    );
  }
  return { ok: reasons.length === 0, gatewayUrl, reasons };
}

function assertSafeToCommit() {
  loadEnvOnce();
  const guard = checkGuard();
  if (!guard.ok) {
    console.error('\n✗ Synthetic seed refused:\n');
    for (const reason of guard.reasons) console.error(`${reason}\n`);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Throttled Gateway client. The Gateway allows 300 requests / 15 min per IP
// (gateway/src/index.js globalLimiter) and the committed workload is ~500, so
// every call goes through a sliding-window budget plus a 429 retry.
// ═══════════════════════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Throttle {
  constructor() {
    this.windowMs = Number(process.env.SYNTH_WINDOW_MS || 15 * 60 * 1000);
    this.max = Number(process.env.SYNTH_MAX_REQ_PER_WINDOW || 280);
    this.stamps = [];
  }

  async acquire() {
    for (;;) {
      const now = Date.now();
      this.stamps = this.stamps.filter((t) => now - t < this.windowMs);
      if (this.stamps.length < this.max) break;
      const waitMs = this.windowMs - (now - this.stamps[0]) + 250;
      console.log(`  … rate-limit budget full (${this.stamps.length}/${this.max}); waiting ${Math.ceil(waitMs / 1000)}s`);
      await sleep(waitMs);
    }
    this.stamps.push(Date.now());
  }
}

class Api {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.throttle = new Throttle();
    this.count = 0;
  }

  async call(method, p, { role, body, expect = [200, 201], tolerate = false, label = '' } = {}) {
    for (let attempt = 0; ; attempt += 1) {
      await this.throttle.acquire();
      const res = await this.apiClient[method](p, { role, body });
      this.count += 1;
      if (res.status === 429 && attempt < 3) {
        const retryAfter = Number(res.body?.retryAfter || 30);
        console.warn(`  … 429 on ${method.toUpperCase()} ${p}; retrying in ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }
      if (!tolerate && !expect.includes(res.status)) {
        throw new Error(`${method.toUpperCase()} ${p} → ${res.status} ${JSON.stringify(res.body)}${label ? ` (${label})` : ''}`);
      }
      return res;
    }
  }

  get(p, opts) {
    return this.call('get', p, opts);
  }
  post(p, opts) {
    return this.call('post', p, opts);
  }
  put(p, opts) {
    return this.call('put', p, opts);
  }
  patch(p, opts) {
    return this.call('patch', p, opts);
  }
  delete(p, opts) {
    return this.call('delete', p, opts);
  }
}

/** Paginate an endpoint that reports either `pagination.total` or `total`. */
async function fetchAllPages(api, endpoint, { role, pageSize = 200, maxPages = 25 } = {}) {
  const collected = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const res = await api.get(`${endpoint}${separator}page=${page}&limit=${pageSize}`, { role });
    const body = res.body || {};
    const rows = Array.isArray(body.data) ? body.data : [];
    collected.push(...rows);
    const total = body.pagination?.total ?? body.total ?? rows.length;
    if (rows.length === 0 || collected.length >= total) break;
  }
  return collected;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Commit
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolves the seeded users the suite logs in as. Fails before anything is
 * written if a role cannot log in (a salesRep login needs SKIP_OTP=true — the
 * same precondition the e2e flows already have).
 */
async function resolveOperatorIds(auth) {
  const ids = {};
  for (const op of CATALOGUE.operators) {
    try {
      ids[op.role] = await auth.getUserId(op.role);
    } catch (err) {
      throw new Error(
        `Could not resolve the seeded ${op.role} user via getUserId('${op.role}'): ${err.message}\n` +
          `The shared stack must have SKIP_OTP=true for salesRep logins (Services/auth-service/.env), ` +
          `exactly as the e2e flows require. Nothing has been written.`,
      );
    }
    console.log(`  operator ${op.role.padEnd(11)} ${ids[op.role]} (${op.leadCount} leads)`);
  }
  return ids;
}

async function commitLeads(api, plan, operatorIds) {
  const results = [];
  for (const lead of plan.leads) {
    const body = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      destination: lead.destination,
      source: lead.source,
      platform: lead.platform,
      numberOfTravelers: lead.numberOfTravelers,
      budget: lead.budget,
      message: lead.message,
      travelDate: lead.travelDate,
      lifecycleStatus: lead.lifecycleStatus,
      priority: lead.priority,
      tags: lead.tags,
    };
    // Seeded ids fail z.string().uuid() inside createLeadSchema, so ownership is
    // applied afterwards through PATCH /leads/:id/assign, which has no zod.
    const actor = lead.ownerRole === 'salesRep' ? 'salesRep' : 'admin';
    const res = await api.post('/leads', { role: actor, body });
    const created = res.body?.data;
    if (!created?.id) throw new Error(`Lead ${lead.ref} not created: ${JSON.stringify(res.body)}`);

    if (lead.ownerRole) {
      const wanted = operatorIds[lead.ownerRole];
      if (created.assignedToId !== wanted) {
        await api.patch(`/leads/${created.id}/assign`, { role: 'admin', body: { assignedTo: wanted } });
      }
    } else if (created.assignedToId) {
      // Settings.assignmentMode=auto can round-robin an admin-created lead; the
      // 30 unassigned leads must genuinely have no owner.
      await api.patch(`/leads/${created.id}/unassign`, { role: 'admin' });
    }

    results.push({ ...lead, id: created.id, assignedToId: lead.ownerRole ? operatorIds[lead.ownerRole] : null });
    if (results.length % 25 === 0) console.log(`  leads: ${results.length}/${plan.leads.length}`);
  }
  return results;
}

async function commitInvoices(api, plan, leads) {
  const leadBySlot = new Map(leads.map((l) => [l.slot, l]));
  const results = [];
  for (const invoice of plan.invoices) {
    const lead = leadBySlot.get(invoice.ledSlot);
    const res = await api.post('/billing/invoices', {
      role: 'admin',
      body: {
        leadId: lead.id,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        destination: lead.destination,
        type: 'invoice',
        status: invoice.status,
        currency: invoice.currency,
        dueDate: isoDateTime(invoice.dueDate),
        notes: invoice.notes,
        terms: `Synthetic row — remove with seed-synthetic.mjs --cleanup --run-id=${plan.runId}`,
        taxRate: invoice.taxRate,
        discountType: 'none',
        items: [{ description: invoice.description, category: 'package', quantity: 1, unitPrice: invoice.unitPrice }],
      },
    });
    const id = res.body?.data?.id;
    if (!id) throw new Error(`Invoice ${invoice.ref} not created: ${JSON.stringify(res.body)}`);
    const created = { ...invoice, id };

    if (invoice.receipt) {
      // Settle against the server's own total: the invoice controller computes
      // totalAmount itself (subtotal + tax - discount), and a full payment must
      // land exactly or a float residue leaves the invoice 'partial'.
      const serverTotal = res.body?.data?.totalAmount ?? invoice.totalAmount;
      const amount = invoice.receipt.fraction === 1 ? serverTotal : round2(serverTotal * invoice.receipt.fraction);
      await api.post('/billing/receipts', {
        role: 'admin',
        body: {
          invoiceId: id,
          amount,
          currency: invoice.currency, // never let the receipt's LKR default leak in
          paymentMethod: invoice.receipt.paymentMethod,
          paymentType: invoice.receipt.paymentType,
          notes: `${plan.marker} | synthetic ${invoice.kind} payment`,
        },
      });
      created.receiptAmount = amount;
    }
    results.push(created);
  }
  return results;
}

async function commitQuotations(api, plan, leads) {
  const leadBySlot = new Map(leads.map((l) => [l.slot, l]));
  const results = [];
  for (const quotation of plan.quotations) {
    const lead = leadBySlot.get(quotation.leadSlot);
    const res = await api.post('/billing/quotations', {
      role: 'admin',
      body: {
        leadId: lead.id,
        customerName: `Synthetic Customer ${pad3(quotation.leadSlot)}`,
        customerEmail: lead.email,
        destination: lead.destination,
        type: 'package_based',
        mode: 'detailed',
        status: 'sent',
        currency: quotation.currency,
        validUntil: isoDateTime(quotation.validUntil),
        packageTitle: `[${plan.marker}] Synthetic package ${pad3(quotation.leadSlot)}`,
        notes: `${plan.marker} | expiring in ${quotation.expiresInDays} days`,
        taxRate: quotation.taxRate,
        discountType: 'none',
        includedServices: ['Accommodation', 'Airport transfers'],
        excludedServices: ['International flights'],
        items: [
          { description: `Synthetic package ${pad3(quotation.leadSlot)}`, category: 'package', quantity: 1, unitPrice: quotation.unitPrice },
        ],
        itineraryDays: [{ day: 1, title: 'Arrival', locations: [lead.destination], meals: ['Dinner'] }],
      },
    });
    const id = res.body?.data?.id;
    if (!id) throw new Error(`Quotation ${quotation.ref} not created: ${JSON.stringify(res.body)}`);
    results.push({ ...quotation, id });
  }
  return results;
}

async function commitFlights(api, plan, leads) {
  const leadBySlot = new Map(leads.map((l) => [l.slot, l]));
  const contactEmail = `synth-${plan.runId}+flight-contact@travelcrm.test`;
  const results = [];
  for (const flight of plan.flights) {
    const lead = leadBySlot.get(flight.leadSlot);
    const departure = flight.departureAt;
    const arrival = isoDateTime(new Date(new Date(departure).getTime() + 6 * 3600 * 1000));
    const res = await api.post('/flights/book-for-lead', {
      role: 'admin',
      body: {
        leadId: lead.id,
        flightType: flight.flightType,
        dayNumber: flight.dayNumber,
        tripType: flight.tripType,
        offer: {
          offerId: `SYNTH-${plan.runId}-F${flight.index}`,
          airline: 'Emirates',
          airlineCode: 'EK',
          cabinClass: 'Economy',
          currency: flight.currency,
          baseFare: flight.baseFare,
          taxes: flight.taxes,
          fareTotal: flight.fareTotal,
          legCount: 1,
          segments: [
            {
              sequence: 1,
              marketingCarrier: 'EK',
              operatingCarrier: 'EK',
              flightNumber: `EK${100 + flight.index}`,
              bookingClass: 'Y',
              origin: 'DXB',
              destination: 'CMB',
              departureAt: departure,
              arrivalAt: arrival,
              durationMinutes: 360,
              stops: 0,
            },
          ],
        },
        travelers: [{ type: 'adult', firstName: 'Synthetic', lastName: plan.marker, nationality: 'US' }],
        contact: { name: `[${plan.marker}] Flight Contact`, email: contactEmail },
      },
    });
    const id = res.body?.data?.id;
    if (!id) throw new Error(`Flight ${flight.ref} not created: ${JSON.stringify(res.body)}`);
    results.push({
      ...flight,
      id,
      pnr: res.body?.data?.pnr ?? null,
      ticketingDeadline: res.body?.data?.ticketingDeadline ?? null,
    });
  }
  return { results, contactEmail };
}

async function commitHotels(api, plan, leads) {
  const leadBySlot = new Map(leads.map((l) => [l.slot, l]));
  const results = [];
  for (const hotel of plan.hotels) {
    const lead = leadBySlot.get(hotel.leadSlot);
    const res = await api.post('/hotels/book-with-context', {
      role: 'admin',
      body: {
        prebookId: `SYNTH-${plan.runId}-H${hotel.index}`,
        leadId: lead.id,
        dayNumber: hotel.dayNumber,
        guests: [{ firstName: 'Synthetic', lastName: plan.marker, title: 'Mr' }],
        contact: { name: `[${plan.marker}] Hotel Contact`, email: lead.email },
        offer: {
          hotelId: hotel.hotelId,
          name: `[${plan.marker}] Synthetic Hotel ${hotel.index}`,
          checkin: hotel.checkinIntent,
          checkout: hotel.checkoutIntent,
          cheapestRate: hotel.rate,
        },
      },
    });
    const id = res.body?.data?.id;
    if (!id) throw new Error(`Hotel ${hotel.ref} not created: ${JSON.stringify(res.body)}`);
    results.push({
      ...hotel,
      id,
      actualCheckin: res.body?.data?.checkin ?? null,
      actualCheckout: res.body?.data?.checkout ?? null,
      supplierCode: res.body?.data?.liteapiBookingId ?? null,
    });
  }
  return results;
}

/** Creates the adversarial rows the HTTP surface can actually produce. */
async function commitAdversarial(api, plan, leads) {
  if (!plan.withAdversarial) return { created: [], skipped: [], leads: [], invoiceIds: [] };
  const byId = Object.fromEntries(plan.adversarial.map((row) => [row.id, row]));
  const created = [];
  const createdLeads = [];
  const createdInvoices = [];
  const skipped = plan.adversarial.filter((r) => r.status === 'not-row-seedable');

  const baseLeadBody = (row) => ({
    email: row.seedEmail,
    phone: `+1555${String(8_000_000 + created.length)}`,
    source: 'manual',
    platform: 'Manual_Entry',
    numberOfTravelers: 2,
    message: `Adversarial row ${row.id}: ${row.why}`,
    tags: [plan.marker, 'adversarial', row.tag],
    lifecycleStatus: 'NEW',
  });

  const createLead = async (row, overrides) => {
    const res = await api.post('/leads', {
      role: 'admin',
      body: { ...baseLeadBody(row), name: `[${plan.marker}] ${row.id}`, destination: 'Bali', ...overrides },
    });
    const created_ = res.body?.data;
    if (!created_?.id) throw new Error(`Adversarial row ${row.id} not created: ${JSON.stringify(res.body)}`);
    // An admin-created lead can be round-robined by Settings.assignmentMode=auto;
    // the "claimed with a null owner" row must genuinely have no owner.
    if ('assignedToId' in overrides && overrides.assignedToId === null && created_.assignedToId) {
      await api.patch(`/leads/${created_.id}/unassign`, { role: 'admin' });
    }
    created.push({ id: row.id, entity: 'lead', ref: created_.id });
    createdLeads.push({ rowId: row.id, id: created_.id, name: overrides?.name || `[${plan.marker}] ${row.id}` });
    return created_.id;
  };

  const seeders = {
    'injection-in-name': (row) => createLead(row, { name: String(row.value) }),
    'sql-ish-destination': (row) => createLead(row, { destination: String(row.value) }),
    'blank-destination': (row) => createLead(row, { destination: null }),
    'negative-budget': (row) => createLead(row, { budget: String(row.value) }),
    'zero-budget': (row) => createLead(row, { budget: String(row.value) }),
    'huge-budget': (row) => createLead(row, { budget: String(row.value) }),
    'long-note': (row) => createLead(row, { message: LONG_NOTE }),
    'cjk-name': (row) => createLead(row, { name: String(row.value) }),
    'emoji-only-name': (row) => createLead(row, { name: String(row.value) }),
    'claimed-with-null-owner': (row) => createLead(row, { lifecycleStatus: 'BOOKING_IN_PROGRESS', assignedToId: null }),
    'zero-width-chars': (row) => createLead(row, { destination: `Bali${ZERO_WIDTH_SPACE}` }),
    'html-in-name': (row) => createLead(row, { name: String(row.value) }),
    'duplicate-customer-names': async (row) => {
      const first = await createLead(row, { name: String(row.value) });
      const second = await api.post('/leads', {
        role: 'admin',
        body: {
          ...baseLeadBody(row),
          name: String(row.value),
          email: `synth-${plan.runId}+adv-duplicate-customer-names-b@travelcrm.test`,
          destination: 'Tokyo',
        },
      });
      const secondId = second.body?.data?.id;
      if (!secondId) throw new Error(`Adversarial duplicate-customer-names (2nd row) not created: ${JSON.stringify(second.body)}`);
      created.push({ id: `${row.id}#b`, entity: 'lead', ref: secondId });
      createdLeads.push({ rowId: `${row.id}#b`, id: secondId, name: String(row.value) });
      return first;
    },
    'group-at-minimum': async (row) => {
      // A dedicated destination nothing else uses, at exactly the minimum group
      // size (leads adapter: groupedCount threshold 3).
      let first = null;
      for (let i = 0; i < Number(row.value); i += 1) {
        const id = await createLead(row, {
          destination: 'Reykjavik',
          name: `[${plan.marker}] group-at-minimum ${i + 1}`,
          email: `synth-${plan.runId}+adv-group-at-minimum-${i + 1}@travelcrm.test`,
        });
        if (i === 0) first = id;
      }
      return first;
    },
    'group-below-minimum': async (row) => {
      let first = null;
      for (let i = 0; i < Number(row.value); i += 1) {
        const id = await createLead(row, {
          destination: 'Ulaanbaatar',
          name: `[${plan.marker}] group-below-minimum ${i + 1}`,
          email: `synth-${plan.runId}+adv-group-below-minimum-${i + 1}@travelcrm.test`,
        });
        if (i === 0) first = id;
      }
      return first;
    },
    'currency-symbols': async (row) => {
      const lead = leads[0];
      const res = await api.post('/billing/invoices', {
        role: 'admin',
        body: {
          leadId: lead.id,
          customerName: `[${plan.marker}] currency-symbols`,
          customerEmail: lead.email,
          destination: 'Bali',
          type: 'invoice',
          status: 'sent',
          currency: 'USD',
          dueDate: isoDateTime(addDays(plan.now, 14)),
          notes: `${plan.marker} | formatted amount as rendered upstream: ₹1,500`,
          discountType: 'none',
          items: [{ description: 'Adversarial formatted-total row', category: 'other', quantity: 1, unitPrice: 1500 }],
        },
      });
      const id = res.body?.data?.id;
      if (!id) throw new Error(`Adversarial row currency-symbols not created: ${JSON.stringify(res.body)}`);
      created.push({ id: row.id, entity: 'invoice', ref: id });
      createdInvoices.push({ rowId: row.id, id });
      return id;
    },
  };

  for (const row of plan.adversarial) {
    if (row.status !== 'seedable') continue;
    const seeder = seeders[row.id];
    if (!seeder) throw new Error(`No seeder for adversarial row ${row.id}`);
    await seeder(row);
  }

  return { created, skipped, leads: createdLeads, invoiceIds: createdInvoices };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cleanup — marker-driven, modelled on helpers/test-data-cleanup.js semantics
// (admin token, reverse-creation order, best-effort per row).
// ═══════════════════════════════════════════════════════════════════════════════

async function runCleanup(api, { marker }) {
  const summary = {
    leads: 0,
    quotations: 0,
    invoices: 0,
    receipts: 0,
    hotelBookings: 0,
    contactUsers: 0,
    residue: [],
  };

  // Emails carry the marker lowercased ("synth-<runId>+..."), so match the
  // marker case-insensitively rather than relying on the name only.
  const markerLc = marker.toLowerCase();
  const hasMarker = (value) => String(value ?? '').toLowerCase().includes(markerLc);

  const leadRows = await fetchAllPages(api, `/leads?search=${encodeURIComponent(marker)}`, { role: 'admin' });
  const markedLeads = leadRows.filter(
    (lead) => hasMarker(lead.name) || hasMarker(lead.email) || (lead.tags || []).some((tag) => hasMarker(tag)),
  );
  const leadIds = new Set(markedLeads.map((l) => l.id));
  const qualifies = (row) => leadIds.has(row.leadId) || hasMarker(row.customerEmail) || hasMarker(row.notes);
  console.log(`  marked leads found: ${leadIds.size}`);

  // Receipts first: an invoice cannot be cancelled while money is attached.
  const markedReceipts = (await fetchAllPages(api, '/billing/receipts', { role: 'admin' })).filter(qualifies);
  for (const receipt of markedReceipts) {
    const res = await api.put(`/billing/receipts/${receipt.id}/cancel`, { role: 'admin', tolerate: true, expect: [200, 400, 404] });
    if (res.status === 200) summary.receipts += 1;
  }

  const markedInvoices = (await fetchAllPages(api, '/billing/invoices', { role: 'admin' })).filter(qualifies);
  for (const invoice of markedInvoices) {
    const res = await api.put(`/billing/invoices/${invoice.id}/cancel`, { role: 'admin', tolerate: true, expect: [200, 400, 404] });
    if (res.status === 200) summary.invoices += 1;
  }
  if (markedInvoices.length) summary.residue.push(`invoice rows (cancelled, not deleted): ${markedInvoices.length}`);
  if (markedReceipts.length) summary.residue.push(`payment receipt rows (cancelled, not deleted): ${markedReceipts.length}`);

  const markedQuotations = (await fetchAllPages(api, '/billing/quotations', { role: 'admin' })).filter(qualifies);
  for (const quotation of markedQuotations) {
    const res = await api.delete(`/billing/quotations/${quotation.id}`, { role: 'admin', tolerate: true, expect: [200, 204, 404] });
    if (res.status < 400) summary.quotations += 1;
  }

  const markedHotels = (await fetchAllPages(api, '/hotels/bookings', { role: 'admin' })).filter((h) => leadIds.has(h.leadId));
  for (const booking of markedHotels) {
    const res = await api.post(`/hotels/bookings/${booking.id}/cancel`, {
      role: 'admin',
      body: { reason: `${marker} cleanup` },
      tolerate: true,
      expect: [200, 400, 404],
    });
    if (res.status === 200) summary.hotelBookings += 1;
  }

  // Flight bookings have no delete or cancel endpoint — count them so the
  // residue is explicit rather than silent.
  let flightResidue = 0;
  for (const lead of markedLeads) {
    const res = await api.get(`/flights/bookings/by-lead/${lead.id}`, { role: 'admin', tolerate: true, expect: [200, 400, 404] });
    if (res.status === 200) flightResidue += (res.body?.data || []).length;
  }
  if (flightResidue) summary.residue.push(`flight bookings (no delete/cancel endpoint): ${flightResidue}`);

  for (const lead of markedLeads) {
    const res = await api.delete(`/leads/${lead.id}`, { role: 'admin', tolerate: true, expect: [200, 204, 404] });
    if (res.status < 400) summary.leads += 1;
  }

  // The flight contact User findOrCreateCustomer created (no tags column, so the
  // marker lives in its name/email).
  const users = await fetchAllPages(api, `/admin/users?search=${encodeURIComponent(marker)}`, { role: 'admin' });
  for (const user of users) {
    if (!(hasMarker(user.name) || hasMarker(user.email))) continue;
    const res = await api.delete(`/admin/users/${user.id}`, { role: 'admin', tolerate: true, expect: [200, 204, 404] });
    if (res.status < 400) summary.contactUsers += 1;
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Printing
// ═══════════════════════════════════════════════════════════════════════════════

function printHelp() {
  console.log(`
Synthetic book-of-business generator for the Management copilot scenario suite.

  node Services/e2e-tests/synthetic/seed-synthetic.mjs --dry-run
      Print the full plan and GROUND_TRUTH. No network, no guard, creates nothing.

  node Services/e2e-tests/synthetic/seed-synthetic.mjs --commit [--with-adversarial] [--with-overcap]
      Create the rows. Requires GATEWAY_URL on localhost and
      E2E_I_UNDERSTAND_SHARED_DB=true, mirroring Services/e2e-tests/global-setup.js.

  node Services/e2e-tests/synthetic/seed-synthetic.mjs --cleanup --run-id=<runId>
      Cancel/delete every row carrying SYNTH-<runId>.

Options:
  --run-id=<id>     pin the run id / marker suffix
  --manifest=<path> also write the resolved slot→id manifest as JSON
  --help            this text
`);
}

function printPlan(plan, opts, guard) {
  const gt = plan.groundTruth;
  const line = '─'.repeat(78);
  console.log(`\n${line}\nSynthetic seed plan — ${opts.commit ? 'COMMIT' : 'DRY RUN (nothing will be created)'}\n${line}`);
  console.log(`run id            ${plan.runId}`);
  console.log(`marker            ${plan.marker}`);
  console.log(`prng seed         ${plan.seed} (fixed: same seed ⇒ same book of business)`);
  console.log(`date anchor       ${isoDateTime(plan.now)}${process.env.SYNTH_NOW ? ' (SYNTH_NOW)' : ' (today 09:00Z)'}`);
  console.log(`gateway           ${guard.gatewayUrl}`);
  console.log(`guard             ${guard.ok ? 'PASS' : `FAIL — ${guard.reasons.length} reason(s)`}`);
  if (!guard.ok && !opts.commit) {
    console.log('                  (a dry run does not need the guard; --commit would refuse with the reasons below)');
    for (const reason of guard.reasons) console.log(`                  · ${reason.split('\n')[0]}`);
  }

  console.log(`\noperators (${plan.totals.operators}) — seeded users resolved at commit via getUserId(role)`);
  for (const op of CATALOGUE.operators) {
    console.log(
      `  ${op.role.padEnd(12)} ${String(op.leadCount).padStart(3)} leads   quiet ${gt.operators[op.role].quietCount} · overdue ${gt.operators[op.role].overdueCount}   ${gt.operators[op.role].namePrefix}`,
    );
  }
  console.log(
    `  unassigned   ${String(CATALOGUE.unassignedLeads).padStart(3)} leads   lifecycleStatus NEW, assignedToId=null   ${gt.operators.unassigned.namePrefix}`,
  );

  console.log(`\nleads (${plan.totals.leads})`);
  console.log(`  destinations   ${gt.destinations.ranking.map((d) => `${d.destination} ${d.count}`).join(' · ')}`);
  console.log(`  base tranche   ${Object.entries(gt.destinations.base).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  reconciliation ${gt.destinations.reconciliation.baseTotal} base + ${gt.destinations.reconciliation.extraTranche} extra = ${gt.destinations.reconciliation.total}`);
  console.log(`  sources        ${gt.sources.ranking.map((s) => `${s.source} ${s.count}`).join(' · ')}`);

  console.log(`\ninvoices (${plan.totals.invoices}) + receipts (${plan.totals.receipts})`);
  console.log(`  overdue bands  >60d ${gt.invoiceBands.overdue.over60Days} · 30-60d ${gt.invoiceBands.overdue.between30And60Days} · <30d ${gt.invoiceBands.overdue.under30Days} = ${gt.invoiceBands.overdue.total}`);
  console.log(`  payment states unpaid ${gt.invoiceBands.paymentStates.unpaid} · paid ${gt.invoiceBands.paymentStates.paid} · part-paid ${gt.invoiceBands.paymentStates.partPaid}`);
  for (const inv of gt.invoiceBands.over60AndOverEur5000) {
    console.log(`  >EUR 5000      ${inv.slot} (${inv.leadRef}) ${inv.currency} ${inv.totalAmount} — ${inv.overdueDays}d overdue`);
  }
  console.log(`  outstanding    ${Object.entries(gt.invoiceBands.outstandingByOwner).map(([k, v]) => `${k} ${v.outstandingAmount}`).join(' · ')}`);

  console.log(`\nquotations (${plan.totals.quotations})  expiring in ${gt.quotations.expiringInDays.join(', ')} days`);
  console.log(`flights (${plan.totals.flights})      intended ${JSON.stringify(gt.flights.intendedBands)}`);
  console.log(`                 produced ${JSON.stringify({ overdue: gt.flights.producedBands.overdue, inside72h: gt.flights.producedBands.inside72h, later: gt.flights.producedBands.later, ticketedWithNoPnr: gt.flights.producedBands.ticketedWithNoPnr })}  ⚠ mock-pinned`);
  console.log(
    `hotels (${plan.totals.hotels})       intended ${JSON.stringify(gt.hotels.intendedBands)} → produced staysInsideWeek ${gt.hotels.producedBands.staysStartingInsideWeek}, withoutSupplierCode ${gt.hotels.producedBands.withoutSupplierCode}  ⚠ mock-pinned`,
  );

  console.log(`\nexpected top-3 (S1) — { slot, match }, match is the scored substring`);
  console.log(`  /leads    ${gt.expectedTop3.leads.map((e) => `${e.slot}:${e.match}`).join(' · ')}`);
  console.log(`  /billing  ${gt.expectedTop3.billing.map((e) => `${e.slot}:${e.match}`).join(' · ')}`);
  console.log(`  /flights  ${gt.expectedTop3.flights.map((e) => `${e.slot}:${e.match}`).join(' · ')}  ⚠ ${gt.expectedTop3.rubrics.flights}`);

  if (plan.withAdversarial) {
    console.log(`\nadversarial rows (${plan.totals.adversarialRows})`);
    for (const row of plan.adversarial) {
      console.log(`  ${row.id.padEnd(28)} ${row.entity.padEnd(11)} ${row.status.padEnd(27)} ${row.status === 'seedable' ? row.create : row.reason || ''}`);
    }
  } else {
    console.log('\nadversarial rows   not enabled (--with-adversarial to include the 23 rows from adversarial.v1.jsonl)');
  }
  if (plan.withOvercap) console.log(`\nover-cap filler    ${plan.totals.overcapLeads} extra marked leads (excluded from every count above)`);

  console.log(`\nrequest budget     ~${plan.requestEstimate.requests} requests ⇒ ~${plan.requestEstimate.throttledMinutes} min behind the ${plan.requestEstimate.budgetPerWindow} req/${plan.requestEstimate.windowMinutes} min sliding window`);

  console.log(`\nauthorability gaps (${gt.authorability.gaps.length}) — bands this API cannot author`);
  for (const gap of gt.authorability.gaps) {
    console.log(`  · ${gap.case}\n      reason:   ${gap.reason}\n      evidence: ${gap.evidence}\n      fallback: ${gap.fallback}`);
  }
}

function printGroundTruth(plan) {
  console.log(`\n${'═'.repeat(78)}\nGROUND_TRUTH (import this; do not re-derive)\n${'═'.repeat(78)}`);
  console.log(JSON.stringify(plan.groundTruth, null, 2));
}

function printManifest(manifest, opts) {
  console.log(`\n${'═'.repeat(78)}\nRESOLVED MANIFEST (slot → runtime id)\n${'═'.repeat(78)}`);
  console.log(JSON.stringify(manifest, null, 2));
  if (opts.manifest) {
    writeFileSync(opts.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`\nmanifest written to ${opts.manifest}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    commit: false,
    cleanup: false,
    withAdversarial: false,
    withOvercap: false,
    runId: null,
    manifest: null,
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--commit') opts.commit = true;
    else if (arg === '--cleanup') opts.cleanup = true;
    else if (arg === '--with-adversarial') opts.withAdversarial = true;
    else if (arg === '--with-overcap') opts.withOvercap = true;
    else if (arg.startsWith('--run-id=')) opts.runId = arg.slice('--run-id='.length);
    else if (arg.startsWith('--manifest=')) opts.manifest = arg.slice('--manifest='.length);
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else throw new Error(`Unknown argument "${arg}" (try --help)`);
  }
  if (opts.commit && opts.dryRun) throw new Error('--commit and --dry-run are mutually exclusive');
  if (opts.cleanup && (opts.commit || opts.dryRun)) throw new Error('--cleanup cannot be combined with --commit/--dry-run');
  return opts;
}

function resolveRunId(opts) {
  if (opts.runId) return opts.runId;
  if (process.env.SYNTH_RUN_ID) return process.env.SYNTH_RUN_ID;
  if (opts.cleanup) throw new Error('--cleanup needs --run-id=<runId> (or SYNTH_RUN_ID) to know which marker to remove');
  if (opts.commit) return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return 'plan';
}

async function main() {
  loadEnvOnce();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const runId = resolveRunId(opts);
  const plan = planFor({ runId, withAdversarial: opts.withAdversarial, withOvercap: opts.withOvercap });
  const { apiClient, getToken } = await loadHelpers();

  if (opts.cleanup) {
    assertSafeToCommit();
    process.env.E2E_RUN_ID = runId;
    const api = new Api(apiClient);
    await getToken('admin');
    console.log(`\nCleaning ${plan.marker} via ${checkGuard().gatewayUrl}\n`);
    const summary = await runCleanup(api, { marker: plan.marker });
    console.log(`\nCleanup summary (${api.count} requests):`);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.residue.length) {
      console.log('\nResidue the API cannot remove:');
      for (const item of summary.residue) console.log(`  · ${item}`);
    }
    return;
  }

  if (!opts.commit) {
    const guard = checkGuard();
    printPlan(plan, opts, guard);
    printGroundTruth(plan);
    console.log(
      guard.ok
        ? '\nThis was a dry run: nothing was created. Re-run with --commit to write these rows.'
        : '\nThis was a dry run: the guard did not pass, so nothing was created. Set GATEWAY_URL to localhost and E2E_I_UNDERSTAND_SHARED_DB=true, then use --commit.',
    );
    return;
  }

  assertSafeToCommit();
  process.env.E2E_RUN_ID = runId;
  const api = new Api(apiClient);

  console.log(`\n${'═'.repeat(78)}\nCOMMITTING ${plan.marker} via ${checkGuard().gatewayUrl}\n${'═'.repeat(78)}`);
  console.log(`~${plan.requestEstimate.requests} requests expected; throttling to ${plan.requestEstimate.budgetPerWindow} per ${plan.requestEstimate.windowMinutes} min.\n`);

  await getToken('admin');
  const auth = { getUserId: (await loadHelpers()).getUserId };
  console.log('operators');
  const operatorIds = await resolveOperatorIds(auth);

  console.log('leads');
  const leads = await commitLeads(api, plan, operatorIds);

  console.log('invoices + receipts');
  const invoices = await commitInvoices(api, plan, leads);

  console.log('quotations');
  const quotations = await commitQuotations(api, plan, leads);

  console.log('flight bookings');
  const flights = await commitFlights(api, plan, leads);

  console.log('hotel bookings');
  const hotels = await commitHotels(api, plan, leads);

  let adversarial = { created: [], skipped: [], leads: [], invoiceIds: [] };
  if (plan.withAdversarial) {
    console.log('adversarial rows');
    adversarial = await commitAdversarial(api, plan, leads);
  }

  const manifest = {
    runId,
    marker: plan.marker,
    createdAt: new Date().toISOString(),
    gatewayUrl: checkGuard().gatewayUrl,
    requests: api.count,
    operators: CATALOGUE.operators.map((op) => ({ role: op.role, id: operatorIds[op.role], leadCount: plan.operatorLeadSlots[op.role].length })),
    leads: leads.map((l) => ({ slot: l.slot, ref: l.ref, id: l.id, destination: l.destination, source: l.source, ownerRole: l.ownerRole })),
    invoices: invoices.map((inv) => ({
      ref: inv.ref,
      leadSlot: inv.ledSlot,
      id: inv.id,
      kind: inv.kind,
      band: inv.band,
      currency: inv.currency,
      totalAmount: inv.totalAmount,
      dueDate: isoDate(inv.dueDate),
      receiptAmount: inv.receiptAmount ?? null,
    })),
    quotations: quotations.map((q) => ({ ref: q.ref, leadSlot: q.leadSlot, id: q.id })),
    flights: flights.results.map((f) => ({ ref: f.ref, leadSlot: f.leadSlot, id: f.id, pnr: f.pnr, ticketingDeadline: f.ticketingDeadline })),
    flightContactEmail: flights.contactEmail,
    hotels: hotels.map((h) => ({
      ref: h.ref,
      leadSlot: h.leadSlot,
      id: h.id,
      actualCheckin: h.actualCheckin,
      actualCheckout: h.actualCheckout,
      supplierCode: h.supplierCode,
    })),
    adversarial: {
      leads: adversarial.leads,
      invoices: adversarial.invoiceIds,
      skipped: adversarial.skipped.map((r) => ({ id: r.id, reason: r.reason })),
    },
    overcapLeads: plan.overcapLeads.length,
  };

  console.log(`\n${'═'.repeat(78)}\nCOMMIT COMPLETE — ${api.count} requests\n${'═'.repeat(78)}`);
  printGroundTruth(plan);
  printManifest(manifest, opts);
}

// Import-safe: synthetic.spec.js imports GROUND_TRUTH from this module and must
// see no output and no writes. Only a direct CLI invocation runs main().
export const GROUND_TRUTH = planFor({ runId: process.env.SYNTH_RUN_ID || 'plan' }).groundTruth;

const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(`\n✗ seed-synthetic failed: ${err.message}`);
    if (process.env.SYNTH_DEBUG) console.error(err.stack);
    process.exitCode = 1;
  });
}
