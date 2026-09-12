import { z } from 'zod';
import { LEAD_COPILOT_FIELDS } from '@travel-crm/contracts';
import { domainAuthHeader } from '../utils/cloudRunAuth.js';
import { serializeToolResult } from '../ai/prompts/managementAnswer.v2.js';

// ─── Domain tool registry ─────────────────────────────────────────────────
// The model selects from this fixed, allowlisted tool vocabulary; the server
// executes each tool under the caller's forwarded x-user-* identity and
// returns bounded, allowlisted results. The model never receives database
// credentials, raw SQL, or arbitrary URLs — only these named tools.
//
// Every tool declares its bound NEXT TO ITS SCHEMA, and the execution layer
// enforces it before a result can reach the prompt:
//
//   projection        the allowlisted fields a row may carry
//   rowCap            the most rows that may leave the tool
//   resultByteBudget  the most bytes `serializeToolResult` may produce for it
//
// The prompt splices every tool result into the next request and
// `serializeToolResult` stringifies whatever it is handed, so an unbounded
// list is the first thing in this system that can blow the prompt. A tool
// added without all three declarations is an unbounded tool.
//
// Platform auth is per TARGET service, never a constant: `fetchJson` derives
// both the request URL and the ID-token audience from the base it is handed.
// A tool for another service built on a hardcoded audience would present a
// lead-audience token to that service, pass locally (K_SERVICE unset makes
// `domainAuthHeader` return `{}`) and be rejected at the Cloud Run edge with
// a 403 deployed — surfacing as `notAuthorized`.

// Service base URLs are read at CALL time, not import time, so a test or a
// deployment can point a tool at another host without re-importing the module
// (the collection engine reads its source URLs the same way).
function leadServiceUrl() {
  return process.env.LEAD_SERVICE_URL || 'http://localhost:3004';
}

function billingServiceUrl() {
  return process.env.BILLING_SERVICE_URL || 'http://localhost:3006';
}

function analyticsServiceUrl() {
  return process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009';
}

function packageServiceUrl() {
  return process.env.PACKAGE_SERVICE_URL || 'http://localhost:3003';
}

// The engine's own ceiling for a page of records (collectionEngine
// `maxFetchRows`). No tool may emit more rows than this, so a tool result can
// never outgrow the read a page adapter already performs.
export const MAX_TOOL_ROWS = 1_000;

// A list tool's page when the model does not ask for one. Deliberately smaller
// than the cap: the model is answering a question, not paging a table.
const DEFAULT_LIST_LIMIT = 50;

// Measured with the exact serializer the prompt uses, so the declared bound
// and the guarantee cannot drift apart.
const LIST_RESULT_BYTE_BUDGET = 64_000;
const RECORD_RESULT_BYTE_BUDGET = 8_000;

// The lead field allowlist is shared with the record page adapter
// (`LEAD_COPILOT_FIELDS`), so a tool cannot widen what the briefing exposes.
const LEAD_PROJECTION = [...LEAD_COPILOT_FIELDS];

// Billing fields that answer "what is overdue and what is still outstanding".
// Drawn from the descriptor's invoice allowlist; `overdue` is DERIVED below and
// is not an upstream field. `status` is deliberately absent — the document
// lifecycle never receives `partial`/`overdue`, so payment truth is read from
// `paymentStatus` only.
const INVOICE_PROJECTION = [
  'id',
  'invoiceNumber',
  'customerEmail',
  'leadId',
  'currency',
  'paymentStatus',
  'totalAmount',
  'paidAmount',
  'outstandingAmount',
  'dueDate',
  'overdue',
];

function project(record, fields) {
  const out = {};
  for (const field of fields) out[field] = record?.[field] ?? null;
  return out;
}

// Projects, caps and byte-bounds a row list into the shape a tool returns.
// Byte accounting uses `serializeToolResult` (the same envelope the prompt
// serializes) and reserves the truncation flag's bytes up front, so a trimmed
// result still fits its declared budget. Rows are dropped from the tail, and
// `truncated` is set whenever anything was dropped — a silent partial list
// would let the model state a wrong count.
function boundResult(tool, records) {
  const projected = records.slice(0, tool.rowCap).map((record) => project(record, tool.projection));
  const baseBytes = Buffer.byteLength(serializeToolResult(tool.name, { data: [] }), 'utf8');
  const flagOverhead =
    Buffer.byteLength(serializeToolResult(tool.name, { data: [], truncated: true }), 'utf8') - baseBytes;
  let bytes = baseBytes + flagOverhead;
  let kept = 0;
  for (const row of projected) {
    const rowBytes = Buffer.byteLength(JSON.stringify(row), 'utf8') + (kept > 0 ? 1 : 0);
    if (bytes + rowBytes > tool.resultByteBudget) break;
    bytes += rowBytes;
    kept += 1;
  }
  const truncated = records.length > tool.rowCap || kept < projected.length;
  const data = projected.slice(0, kept);
  return truncated ? { data, truncated: true } : { data };
}

// Fetches one JSON envelope from `baseUrl`+`path` under the caller's forwarded
// identity. `baseUrl` supplies the token audience as well as the origin.
// A 3xx is refused (`redirect: 'error'`), never followed: following one would
// re-send the caller's forwarded x-user-* identity to whatever origin the
// target service names — undici strips `Authorization` cross-origin but keeps
// custom headers. `signal` bounds the read to the ask loop's remaining budget.
async function fetchJson(baseUrl, path, ctx, signal) {
  const auth = await domainAuthHeader(baseUrl);
  const url = new URL(path, baseUrl).toString();
  const res = await fetch(url, {
    headers: { ...ctx.headers, 'content-type': 'application/json', ...auth },
    redirect: 'error',
    signal,
  });
  if (res.status === 403 || res.status === 404) {
    return { notAuthorized: true };
  }
  if (!res.ok) {
    return { unavailable: true };
  }
  const json = await res.json();
  return { data: json?.data ?? null };
}

const getLeadTool = {
  name: 'getLead',
  description: 'Fetch one lead record (id, status, assignment, name, destination, budget).',
  argsSchema: z.object({ leadId: z.string().min(1).max(255) }).strict(),
  projection: LEAD_PROJECTION,
  rowCap: 1,
  resultByteBudget: RECORD_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const result = await fetchJson(leadServiceUrl(), `/api/v1/leads/${encodeURIComponent(args.leadId)}`, ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    return boundResult(getLeadTool, result.data ? [result.data] : []);
  },
};

const listLeadsTool = {
  name: 'listLeads',
  description:
    'List leads (id, status, owner, name, destination, budget, timestamps). Use `limit` to bound how many are returned.',
  argsSchema: z.object({ limit: z.number().int().min(1).max(MAX_TOOL_ROWS).optional() }).strict(),
  projection: LEAD_PROJECTION,
  rowCap: MAX_TOOL_ROWS,
  resultByteBudget: LIST_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const limit = args.limit ?? DEFAULT_LIST_LIMIT;
    const result = await fetchJson(leadServiceUrl(), `/api/v1/leads?limit=${limit}`, ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    const rows = Array.isArray(result.data) ? result.data : [];
    return boundResult(listLeadsTool, rows);
  },
};

// Billing has no endpoint that can order by dueDate (`getAllInvoices` hardcodes
// `createdAt: 'desc'` and takes no sort parameter) and the one dueDate-ascending
// query (`getOverdueInvoices`) gates on the document `status` field, which never
// receives `partial`/`overdue` — so that query would silently miss every
// part-paid invoice. The tool therefore reads a capped page and does its own
// filtering and ordering: unpaid/partial only, dueDate ascending, with the
// overdue flag derived from dueDate at read time (never trusted from a stored
// status).
const listInvoicesTool = {
  name: 'listInvoices',
  description:
    'List invoices that are unpaid or part-paid (id, number, customer, amounts, payment status, due date, overdue flag), most overdue first. Pass `leadId` to read one lead\'s invoices instead of the whole page. Use `limit` to bound how many are returned.',
  argsSchema: z
    .object({
      limit: z.number().int().min(1).max(MAX_TOOL_ROWS).optional(),
      // The model reached for this argument constantly — "which of this lead's
      // invoices are overdue" is a real question and the endpoint for it already
      // existed. Without it the call was rejected, the model repeated it
      // identically, and the loop burned its budget on schema errors before
      // producing nothing.
      leadId: z.string().min(1).max(255).optional(),
    })
    .strict(),
  projection: INVOICE_PROJECTION,
  rowCap: MAX_TOOL_ROWS,
  resultByteBudget: LIST_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const url = args.leadId
      ? `/api/v1/billing/invoices/lead/${encodeURIComponent(args.leadId)}`
      : `/api/v1/billing/invoices?limit=${MAX_TOOL_ROWS}`;
    const result = await fetchJson(billingServiceUrl(), url, ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    const now = Date.now();
    // The by-lead endpoint returns one record rather than a list, so a single
    // object is wrapped rather than silently discarded as "no rows".
    const raw = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    const rows = raw
      .filter((row) => row?.paymentStatus === 'unpaid' || row?.paymentStatus === 'partial')
      .map((row) => {
        // Parse each dueDate once and carry the numeric value for the sort
        // below — re-parsing both operands per comparison cost 2·n·log n
        // Date.parse calls over a 1000-row page.
        const dueAt = Date.parse(row?.dueDate);
        return { ...row, overdue: Number.isFinite(dueAt) && dueAt < now, dueAt };
      });
    rows.sort(byDueDateAscending);
    const limit = args.limit ?? DEFAULT_LIST_LIMIT;
    return boundResult(listInvoicesTool, rows.slice(0, limit));
  },
};

function byDueDateAscending(left, right) {
  const a = left?.dueAt;
  const b = right?.dueAt;
  const aValid = Number.isFinite(a);
  const bValid = Number.isFinite(b);
  // A row with no parseable dueDate sorts last rather than first: an unknown
  // date is not the most overdue one.
  if (!aValid && !bValid) return 0;
  if (!aValid) return 1;
  if (!bValid) return -1;
  return a - b;
}

// ─── Cross-site reads ─────────────────────────────────────────────────────
// These are what let a question be answered from any page rather than only the
// one the operator is standing on. Each calls a route that already exists, under
// the caller's forwarded identity, and each is gated in `ManagementToolAccess`
// by the same roles that route's own guard requires.
//
// The analytics payloads are aggregates the service has ALREADY computed, which
// is why their projections name the aggregate groups rather than individual
// fields: `project` copies an allowlisted key's value verbatim, and the service's
// own `LIMIT 10` bounds what is inside each group.
//
// Two payloads are deliberately narrowed to exclude `recentLeads`/`recentBookings`
// (`/dashboard/stats` and the personal-performance route). Those rows carry
// customer EMAIL addresses, and a model prompt is not a place for them; they are
// also record-level detail rather than cross-site intelligence. If either is
// wanted later it needs a field-level projection first, not a wider allowlist.
//
// The byte budget for all six is the LIST budget, not the RECORD one: a wrapped
// aggregate is a single row, and `boundResult` drops tail rows to fit, so a
// budget that one payload exceeded would drop the entire result rather than trim
// it.
const timeRangeSchema = z.enum(['daily', 'weekly', 'monthly', 'annual']);

// The company-wide picture, and the single most useful answer to "how are we
// doing" from a page that carries none of it.
const getDashboardSnapshotTool = {
  name: 'getDashboardSnapshot',
  description:
    'Read the company snapshot: lead, booking, revenue and package totals, plus leads by status. Lifetime figures, not a time window. A salesRep sees their own book; an admin sees the company.',
  argsSchema: z.object({}).strict(),
  projection: ['leads', 'bookings', 'revenue', 'packages', 'leadsByStatus'],
  rowCap: 5,
  resultByteBudget: LIST_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const result = await fetchJson(analyticsServiceUrl(), '/api/v1/dashboard/stats', ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    return boundResult(getDashboardSnapshotTool, result.data ? [result.data] : []);
  },
};

// Lead analytics across the company: totals, the trend, status and platform
// distribution, and the top destinations and countries by lead volume and
// conversion — the cross-site counterpart to the page's own lead rows.
const getLeadAnalyticsTool = {
  name: 'getLeadAnalytics',
  description:
    'Read lead analytics: totals by stage, the trend over the window, status and platform distribution, and the top destinations and countries by lead volume and conversion rate. A salesRep is scoped to their own leads.',
  argsSchema: z.object({ timeRange: timeRangeSchema.optional() }).strict(),
  projection: [
    'stats',
    'trend',
    'statusDistribution',
    'categoryDistribution',
    'topCountries',
    'topDestinations',
    'priceRangeDistribution',
  ],
  rowCap: 7,
  resultByteBudget: LIST_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const result = await fetchJson(analyticsServiceUrl(), analyticsPath('/leads/overview', args), ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    return boundResult(getLeadAnalyticsTool, result.data ? [result.data] : []);
  },
};

// Package performance: the questions that had no answer at all before this —
// which packages are asked about, which convert, and where the catalogue is
// concentrated by destination.
const getPackagePerformanceTool = {
  name: 'getPackagePerformance',
  description:
    'Read package performance: totals for itineraries, inquiries and conversions, the trend, performance by destination, and the most-inquired packages by name. Use this for "best performing packages" or "where is the catalogue concentrated".',
  argsSchema: z.object({ timeRange: timeRangeSchema.optional() }).strict(),
  projection: ['stats', 'trend', 'destinationPerformance', 'mostInquired'],
  rowCap: 4,
  resultByteBudget: LIST_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const result = await fetchJson(analyticsServiceUrl(), analyticsPath('/packages/overview', args), ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    return boundResult(getPackagePerformanceTool, result.data ? [result.data] : []);
  },
};

// The sales team's numbers. Its own tool rather than an argument on the personal
// one, because the route behind it authorizes admin only.
const getSalesPerformanceTool = {
  name: 'getSalesPerformance',
  description:
    'Read every sales representative\'s performance for the window: confirmed sales and conversion rate, highest first.',
  argsSchema: z.object({ timeRange: timeRangeSchema.optional() }).strict(),
  projection: ['rep', 'sales', 'conversion'],
  rowCap: MAX_TOOL_ROWS,
  resultByteBudget: LIST_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const result = await fetchJson(analyticsServiceUrl(), analyticsPath('/salesreps/performance', args), ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    return boundResult(getSalesPerformanceTool, Array.isArray(result.data) ? result.data : []);
  },
};

// The caller's own book. Separate from the team tool because the route rejects an
// admin and never accepts a rep id — it is always "me".
const getMyPerformanceTool = {
  name: 'getMyPerformance',
  description:
    'Read your own performance: leads assigned, converted and pending, and your conversion rate for the window.',
  argsSchema: z.object({ timeRange: timeRangeSchema.optional() }).strict(),
  projection: ['performance'],
  rowCap: 1,
  resultByteBudget: RECORD_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const result = await fetchJson(analyticsServiceUrl(), analyticsPath('/salesreps/me/performance', args), ctx, signal);
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    return boundResult(getMyPerformanceTool, result.data ? [result.data] : []);
  },
};

// Catalogue content rather than performance: what a package IS. The route is
// public and forces `isActive`, so a query cannot widen the catalogue; the tool
// map still narrows it to the two management roles.
const searchPackagesTool = {
  name: 'searchPackages',
  description:
    'Search the package catalogue by free text, matching title, description or destination, ranked by rating. Returns the package\'s destination, duration, category, prices, rating, views and bookings.',
  argsSchema: z.object({ q: z.string().min(1).max(200) }).strict(),
  projection: [
    'id',
    'title',
    'destination',
    'durationDays',
    'category',
    'basePrice',
    'sellPrice',
    'currency',
    'rating',
    'numReviews',
    'views',
    'bookings',
    'isActive',
    'isFeatured',
  ],
  rowCap: MAX_TOOL_ROWS,
  resultByteBudget: LIST_RESULT_BYTE_BUDGET,
  async execute(ctx, args, signal) {
    const result = await fetchJson(
      packageServiceUrl(),
      `/api/v1/packages/search/query?q=${encodeURIComponent(args.q)}`,
      ctx,
      signal,
    );
    if (result.notAuthorized) return { notAuthorized: true };
    if (result.unavailable) return { unavailable: true };
    return boundResult(searchPackagesTool, Array.isArray(result.data) ? result.data : []);
  },
};

/** An analytics path with the optional window the service accepts. */
function analyticsPath(path, args) {
  return args.timeRange ? `/api/v1/analytics${path}?timeRange=${args.timeRange}` : `/api/v1/analytics${path}`;
}

// getSimilarConvertedLeads and searchManagementKnowledge stay unimplemented: no
// tool-shaped endpoint backs either one (there is no similarity route anywhere,
// and policy documents are readable only with an internal token), so a tool for
// them would have to invent its own data source.
export const domainTools = [
  getLeadTool,
  listLeadsTool,
  listInvoicesTool,
  getDashboardSnapshotTool,
  getLeadAnalyticsTool,
  getPackagePerformanceTool,
  getSalesPerformanceTool,
  getMyPerformanceTool,
  searchPackagesTool,
];

const toolsByName = new Map(domainTools.map((t) => [t.name, t]));

export function getTool(name) {
  return toolsByName.get(name);
}

export function toolNames() {
  return [...toolsByName.keys()];
}

// The prompt-shaped view of a resolved tool list. Unknown names are skipped
// here; naming one in a request is answered by `executeTool`'s error, below.
export function resolveTools(names = []) {
  return names
    .map((name) => getTool(name))
    .filter(Boolean)
    .map((tool) => ({ name: tool.name, description: tool.description }));
}

/** The argument names a tool accepts, read from its own schema. */
function acceptedArguments(tool) {
  const shape = tool.argsSchema?.shape;
  if (!shape) return 'none';
  const keys = Object.keys(shape);
  return keys.length > 0 ? keys.join(', ') : 'none';
}

// Executes a model-requested tool. Returns a bounded result object; a malformed
// tool or args returns a named error so the loop can feed it back to the model.
// Resolution is against the CALLER's resolved vocabulary, never the whole
// registry: a page that does not declare a tool cannot reach it even if the
// model names it.
export async function executeTool(name, rawArgs, ctx, allowedNames = [], signal) {
  if (!allowedNames.includes(name)) return { error: `unknown tool '${name}'` };
  const tool = getTool(name);
  if (!tool) return { error: `unknown tool '${name}'` };
  const parsed = tool.argsSchema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    // The accepted arguments are DERIVED from the schema, so this cannot drift
    // from what the tool actually takes. A bare "Unrecognized key" told the model
    // what was wrong but not what would be right, and live it repeated the same
    // rejected call until the loop gave up.
    return {
      error: `invalid args for ${name}: ${parsed.error.issues.map((i) => i.message).join('; ')}. Accepted arguments: ${acceptedArguments(tool)}`,
    };
  }
  try {
    return await tool.execute(ctx, parsed.data, signal);
  } catch {
    return { unavailable: true };
  }
}
