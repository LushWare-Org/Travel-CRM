import { z } from 'zod';

// ─── Management Context Copilot ──────────────────────────────────────────
// Wire contracts for the authenticated Management assistant
// (POST /api/v1/assistant/management/turn). These are the structured wire
// shapes the Management client sends and receives. The Gemini-facing
// generation schema is a separate FLAT schema (see assistant-service
// ai/prompts/managementBriefing.v1.js) that is canonicalized server-side
// into the strict claims shape below — mirroring assistantTurn's documented
// flat-schema boundary (conditional/empty object schemas return args: {}).

export const ManagementPageKeys = [
  'overview',
  'analytics',
  'leads',
  'packages',
  'flights',
  'hotels',
  'billing',
  'users',
  'career',
  'settings',
];

export const ManagementSinceWindows = ['last_visit', 'today', '7_days'];

export const ManagementFactKinds = ['id', 'date', 'amount', 'percentage', 'count', 'duration'];

export const ManagementClaimSections = ['current_state', 'changed', 'attention', 'experienced_view'];

export const ManagementEvidenceTypes = ['record', 'computed', 'pattern', 'guidance', 'inference'];
export const ManagementSeverities = ['info', 'warning', 'critical'];

// The roles the platform authorizes on. Every service guards with
// `authorize(...)`, and `isSuperAdmin` bypasses all of them.
export const ManagementRoles = ['superAdmin', 'admin', 'salesRep', 'customer'];

// Which roles may reach each copilot tool.
//
// Mirrors the guard on the TARGET route in the owning service, because the
// copilot is a second caller of that route, not a second authority. Two rules
// hold this map honest:
//
//   NEVER WIDER THAN THE ROUTE. `GET /api/v1/billing/invoices` is
//   `requireAuth`-only, so `listInvoices` is reachable by any authenticated role;
//   listing just the two management roles here is deliberately narrower than the
//   route, and narrower is the safe direction.
//
//   THE DOMAIN SERVICE STILL DECIDES. A missing entry removes a tool from an
//   actor's vocabulary, which surfaces to the model as "no such tool" — a visible
//   absence. It is not a substitute for the downstream ownership and role checks,
//   which continue to run under the caller's forwarded identity.
//
// Roles rather than permission strings, because that is what the services
// actually enforce: `permissions` is read in exactly one place platform-wide
// (`manage_leads` in lead-service, affecting which leads a salesRep may modify,
// not which tools exist). A permission-keyed map would have denied every tool to
// every operator holding no matching string.
export const ManagementToolAccess = {
  getLead: ['admin', 'salesRep'],
  listLeads: ['admin', 'salesRep'],
  listInvoices: ['admin', 'salesRep'],
  // Cross-site reads. Each role list mirrors the guard on the route the tool calls,
  // so a question about another domain is answerable from any page without widening
  // what the page volunteers unprompted.
  getDashboardSnapshot: ['admin', 'salesRep'], // /api/v1/dashboard/stats — authorize('admin','salesRep')
  getLeadAnalytics: ['admin', 'salesRep'], // /api/v1/analytics/leads/overview — authorize('admin','salesRep')
  getPackagePerformance: ['admin'], // /api/v1/analytics/packages/overview — authorize('admin')
  getSalesPerformance: ['admin'], // /api/v1/analytics/salesreps/performance — authorize('admin')
  // The route behind this one authorizes salesRep only and rejects an admin, which
  // is why it is its own tool rather than an argument on getSalesPerformance.
  getMyPerformance: ['salesRep'], // /api/v1/analytics/salesreps/me/performance — authorize('salesRep')
  // This route carries no auth at all, so listing the two management roles is
  // narrower than the route — the safe direction, as with listInvoices.
  searchPackages: ['admin', 'salesRep'], // /api/v1/packages/search/query — public
};

// The lead adapter's field allowlist. Each entry grounds exactly one field
// evidence item, and the rendered lead record publishes the same ID via
// `data-copilot-evidence-id` so a claim can reveal its supporting field.
export const LEAD_COPILOT_FIELDS = [
  'id',
  'lifecycleStatus',
  'assignedToId',
  'name',
  'destination',
  'budget',
  'createdAt',
  'updatedAt',
];

// The single producer of a lead field evidence ID. The adapter, the record
// surface, and the reveal resolver all call this — no call site rebuilds the
// string, and a drift test asserts the emitted and published sets are equal.
export function leadEvidenceId(leadId, field) {
  return `lead:${leadId}:${field}`;
}

// The page-agnostic evidence-ID producer for every non-lead page. Same
// purpose as `leadEvidenceId`: one producer, so the engine, the reveal
// resolver, and (when a page opts in) that page's own field anchors cannot
// drift apart.
//
// Shape is always four or more colon-separated segments. The client resolver
// (Management/src/features/copilot/evidence.ts) parses only four-or-more
// segment IDs, so every emitted ID — record fields, aggregates, and per-source
// baselines — goes through here and never gets hand-built:
//   pageEvidenceId('billing', 'invoice', id, 'dueDate')      → record field
//   pageEvidenceId('billing', 'aggregate', 'overdue-count', 'value')
//   pageEvidenceId('billing', 'source', 'invoices', 'recordCount')
export function pageEvidenceId(pageKey, recordKind, recordId, field) {
  return `${pageKey}:${recordKind}:${recordId}:${field}`;
}

// What an insight is about. A record is one row; a group is a grouping such as
// leads by destination; a collection is a whole source, for the rules that
// aggregate over everything and have no single record to point at.
export const ManagementEntityRefSchema = z
  .object({
    kind: z.enum(['record', 'group', 'collection']),
    id: z.string().min(1).max(512),
  })
  .strict();

// A typed fact is a value the reader may rely on. `value` is canonical: numbers
// and dates are compared by exact equality against it when prose is checked.
//
// A fact either states something read from the evidence (grounded: its value
// appears inside the cited item) or something computed from it (a count, a
// duration, a percentage, a rule constant). The second kind carries
// `derivation`, because "62 days" is nowhere inside the date it was measured
// from and a groundedness check would otherwise discard it.
//
// NOTE ON THE OLD COMMENT: this used to say free prose must stay qualitative,
// and the validator enforced that by deleting any claim whose prose held a
// digit — which made every counting question unanswerable. Prose may now carry
// a number when the claim also states it as a fact here.
export const BriefingFactSchema = z
  .object({
    kind: z.enum(ManagementFactKinds),
    value: z.string().min(1).max(255),
    evidenceId: z.string().min(1).max(255),
    unit: z.enum(['days', 'percent', 'currency']).optional(),
    derivation: z.enum(['grouped-by', 'elapsed-since', 'ratio-of', 'sum-of', 'descriptor-constant']).optional(),
    derivedFrom: z.array(z.string().min(1).max(255)).max(50).optional(),
  })
  .strict();

// A prior claim carries conversational continuity only: text plus
// evidenceId-free facts. It is client-asserted and never satisfies grounding.
export const PriorClaimSchema = z
  .object({
    text: z.string().min(1).max(4000),
    facts: z
      .array(
        z
          .object({
            kind: z.enum(ManagementFactKinds),
            value: z.string().min(1).max(255),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export const ManagementMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(8000),
  })
  .strict();

// The page scope is a per-key discriminated union owned by each adapter.
// The wire contract only enforces that it is an object; the adapter's
// parseScope enforces the page-key-specific shape and rejects unknown
// filters/record kinds/IDs/sort fields with a 400 before any data fetch.
export const ManagementAssistantTurnRequest = z
  .object({
    // 'briefing' is the pre-rename value, accepted for ONE release so a client
    // that has not shipped yet cannot 400. Emit-only 'insights'; drop 'briefing'
    // after the client is out — the assistant logs when the legacy value arrives,
    // so the drop is observable rather than assumed.
    mode: z.enum(['deterministic', 'briefing', 'insights', 'ask']),
    page: z
      .object({
        key: z.enum(ManagementPageKeys),
        scope: z.record(z.unknown()).optional().default({}),
        since: z.enum(ManagementSinceWindows),
        // FIRST-VISIT-ONLY fallback, never a source of truth. Used solely when
        // no stored ManagementLastSeen row exists for this actor/page/scope
        // (i.e. the operator has never acknowledged this scope). The server
        // stores and advances the window via POST .../management/seen, which
        // accepts no client timestamp; this field is a device-local display
        // hint that must not override a stored row.
        lastSeenAt: z.string().datetime().optional(),
      })
      .strict(),
    messages: z.array(ManagementMessageSchema).max(10).optional(),
    priorClaims: z.array(PriorClaimSchema).max(10).optional(),
  })
  .strict();

export const BriefingClaimSchema = z
  .object({
    id: z.string().min(1).max(255),
    section: z.enum(ManagementClaimSections),
    text: z.string().min(1).max(4000),
    facts: z.array(BriefingFactSchema).max(50),
    evidenceIds: z.array(z.string().min(1).max(255)).max(50),
    evidenceType: z.enum(ManagementEvidenceTypes),
    severity: z.enum(ManagementSeverities),
    // Ranking metadata, present when a rule-derived insight travelled through
    // the pipeline and absent on a plain model claim. Optional so a client built
    // before the ranking work still parses these payloads.
    key: z.string().min(1).max(512).optional(),
    ruleId: z.string().min(1).max(255).optional(),
    entityRef: ManagementEntityRefSchema.optional(),
    action: z.record(z.string(), z.unknown()).optional(),
    score: z.number().optional(),
    scoreComponents: z.record(z.string(), z.number()).optional(),
  })
  .strict();

// Request body for POST /api/v1/assistant/management/seen — the authenticated
// acknowledgement that a grounded briefing was actually presented. There is
// deliberately no client-authored timestamp: the handler stamps server time.
export const ManagementCopilotSeenRequest = z
  .object({
    page: z
      .object({
        key: z.enum(ManagementPageKeys),
        scope: z.record(z.unknown()).optional().default({}),
      })
      .strict(),
  })
  .strict();

export const ManagementSourceTargetSchema = z
  .object({
    kind: z.string().min(1).max(64),
    id: z.string().min(1).max(255),
    fieldPaths: z.array(z.string().min(1).max(255)).max(32).optional(),
  })
  .strict();

export const ManagementSourceSchema = z
  .object({
    id: z.string().min(1).max(255),
    label: z.string().min(1).max(500),
    type: z.enum(['record', 'computed', 'pattern', 'guidance']),
    updatedAt: z.string().datetime().optional(),
    target: ManagementSourceTargetSchema.optional(),
    // The cited allowlisted field's scalar value, copied only from a field
    // evidence item. Lets an authorized client render the inline detail
    // fallback when no record anchor is rendered.
    capturedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  })
  .strict();

export const ManagementAssistantTurnResult = z
  .object({
    context: z
      .object({
        pageKey: z.enum(ManagementPageKeys),
        scopeLabel: z.string().min(1).max(500),
        generatedAt: z.string().datetime(),
        partial: z.boolean(),
        noAccess: z.boolean(),
      })
      .strict(),
    claims: z.array(BriefingClaimSchema).max(100),
    answerBlocks: z.array(BriefingClaimSchema).max(100).optional(),
    suggestedQuestions: z.array(z.string().min(1).max(500)).max(3),
    sources: z.array(ManagementSourceSchema).max(100),
    unavailableSources: z.array(z.string().min(1).max(255)).max(50),
    notAuthorizedSources: z.array(z.string().min(1).max(255)).max(50),
  })
  .strict();

export const DeterministicInsightSchema = z
  .object({
    id: z.string().min(1).max(255),
    section: z.enum(ManagementClaimSections),
    severity: z.enum(ManagementSeverities),
    text: z.string().min(1).max(2000),
    fact: BriefingFactSchema.optional(),
    evidenceIds: z.array(z.string().min(1).max(255)).max(50),
    // Identity that survives a descriptor reorder, and the plural facts a rule
    // emits when it prints a computed number. Optional throughout: an insight
    // from before this change parses unchanged.
    key: z.string().min(1).max(512).nullish(),
    ruleId: z.string().min(1).max(255).nullish(),
    entityRef: ManagementEntityRefSchema.optional(),
    facts: z.array(BriefingFactSchema).max(50).optional(),
    action: z.record(z.string(), z.unknown()).nullish(),
    observation: z.boolean().optional(),
    // Present once the insight has been scored for the ranked list.
    score: z.number().optional(),
    components: z.record(z.string(), z.number()).optional(),
    // The scored inputs, flattened, so a client can show "why now" without
    // unpacking `components`. All derived server-side.
    origin: z.enum(['rule', 'model']).optional(),
    urgency: z.number().optional(),
    novelty: z.number().optional(),
    confidence: z.number().optional(),
    actionability: z.number().optional(),
  })
  .strict();

// mode='deterministic' returns no model claims — only the stamp + insights.
export const ManagementDeterministicResult = z
  .object({
    context: z
      .object({
        pageKey: z.enum(ManagementPageKeys),
        scopeLabel: z.string().min(1).max(500),
        asOf: z.string().datetime(),
        noAccess: z.boolean(),
      })
      .strict(),
    insights: z.array(DeterministicInsightSchema).max(100),
    unavailableSources: z.array(z.string().min(1).max(255)).max(50),
    notAuthorizedSources: z.array(z.string().min(1).max(255)).max(50),
    // Optional until the deterministic handler populates it. The briefing path
    // already builds this payload server-side; shipping it in the deterministic
    // phase too is what lets the cold-open evidence action render a real value
    // instead of "not captured" — EvidenceAction derives its inline detail from
    // a sources entry and has none in this phase today.
    sources: z.array(ManagementSourceSchema).max(100).optional(),
    // The ranked view of the same insights. Additive: `insights` keeps its shape
    // so a client built before the ranking work still renders, and the client
    // adopts `ranked` when it gains the affordances for it (`show more`, the
    // quiet state). `suppressedCount` is separate from a zero assertion on
    // purpose: "nothing flagged" and "four previously acknowledged" are
    // different truths and the operator should be able to tell them apart.
    ranked: z.array(DeterministicInsightSchema).max(100).optional(),
    suppressedCount: z.number().int().nonnegative().optional(),
    suppressedCriticals: z.array(DeterministicInsightSchema).max(50).optional(),
    rankingVersion: z.string().min(1).max(64).optional(),
  })
  .strict();
