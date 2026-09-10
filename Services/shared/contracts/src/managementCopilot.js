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

// A typed fact is the only place a risky value (id/date/amount/percentage/
// count/duration) may appear. Free prose must stay qualitative.
export const BriefingFactSchema = z
  .object({
    kind: z.enum(ManagementFactKinds),
    value: z.string().min(1).max(255),
    evidenceId: z.string().min(1).max(255),
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
    mode: z.enum(['deterministic', 'briefing', 'ask']),
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
  })
  .strict();
