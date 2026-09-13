// Shared client-side shapes for the Management Context Copilot.
//
// These mirror the wire contracts in `@travel-crm/contracts`
// (`ManagementAssistantTurnResult` / `ManagementDeterministicResult`), narrowed
// to what the dock renders. They are deliberately local: the shell is page
// agnostic and only the page adapter knows whether a claim's evidence resolves
// to a rendered record field.

export type SinceWindow = "last_visit" | "today" | "7_days";

export type ClaimSection = "current_state" | "changed" | "attention" | "experienced_view";

export type ClaimSeverity = "info" | "warning" | "critical";

export type CopilotScope = Record<string, unknown>;

/**
 * Which pipeline produced a rendered list.
 *
 * Deliberately not the same question as which request produced it. A
 * deterministic fallback arrives through the insights response when generation
 * fails, and the client marks that as a completed model phase unless the server
 * says otherwise — so authorship has to travel on its own, not be inferred from
 * transport. `origin` on a claim cannot answer it: that field exists only on
 * `DeterministicInsightSchema`, so no model claim carries one.
 */
export type InsightProducer = "rule" | "model";

/**
 * A rendered list and the pipeline that produced it, held together as one value.
 *
 * The pairing is the point. Every write to panel state writes both halves, so no
 * code path can pair a producer label with rows that did not come from it — which
 * is what the deferral queue and the fallback path each did when they carried a
 * bare claims array.
 */
export type RenderedInsights = { producer: InsightProducer; claims: CopilotClaim[] };

export type CopilotFact = {
  kind: string;
  value: string;
  evidenceId: string;
};

export type CopilotClaim = {
  id: string;
  section: ClaimSection;
  text: string;
  facts: CopilotFact[];
  evidenceIds: string[];
  evidenceType: string;
  severity: ClaimSeverity;
  /**
   * Identity that survives a descriptor reorder. Prefer this over `id` as a
   * React key and as the stable hook: `id` is positional, so inserting a rule
   * above another renumbers every row after it.
   */
  key?: string | null;
  ruleId?: string | null;
  /**
   * Present once the insight has been scored for the ranked list. Absent on
   * model claims, which carry no score — the ranking is the deterministic
   * pipeline's, not a property of every claim.
   */
  score?: number;
  components?: Record<string, number>;
  origin?: "rule" | "model";
  /** The scored inputs, flattened by the server so "why now" needs no unpacking. */
  urgency?: number;
  novelty?: number;
  confidence?: number;
  actionability?: number;
};

export type CopilotSource = {
  id: string;
  label: string;
  type: string;
  updatedAt?: string;
  target?: { kind: string; id: string; fieldPaths?: string[] };
  /** Scalar value of the cited allowlisted field, when the server supplies it. */
  capturedValue?: string | number | boolean | null;
};

export type CopilotContext = {
  pageKey: string;
  scopeLabel: string;
  asOf?: string;
  generatedAt?: string;
  partial: boolean;
  noAccess: boolean;
  unavailableSources?: string[];
  notAuthorizedSources?: string[];
};

/**
 * The finding a turn is anchored to.
 *
 * Mirrors `PriorClaimSchema` exactly and deliberately carries no `evidenceId`:
 * that schema and its fact schema are both `.strict()`, so an extra key is a
 * parse failure rather than a silent strip, and the server documents the payload
 * as client-asserted continuity that never satisfies grounding. `facts` is capped
 * at 20 because the schema caps it there while a claim may carry 50.
 */
export type PriorClaimContext = {
  text: string;
  facts: Array<{ kind: string; value: string }>;
};

export type CopilotTurn = {
  id: string;
  question: string;
  status: "pending" | "answered" | "error";
  answer?: CopilotClaim[];
  sources?: CopilotSource[];
  error?: string;
  /** The finding this turn was started from, when it was started from a row. */
  context?: PriorClaimContext;
};

export type CopilotSession = {
  /**
   * The server's ranked view of the deterministic insights, in SERVER ORDER.
   * Already sorted by severity band, then score; a client that re-sorts it
   * destroys the ranking. Empty when the server sent no ranking, in which case
   * `claims` is the list to render.
   */
  ranked: CopilotClaim[];
  /** How many candidates the ranking dropped as already-acknowledged. */
  suppressedCount: number;
  /**
   * Critical candidates that did not fit, kept separate from `suppressedCount`
   * so a critical is never silently hidden behind a quiet-state count.
   */
  suppressedCriticals: CopilotClaim[];
  rankingVersion?: string;
  /** Normalized selected lead id, or null when nothing is selected. */
  leadId: string | null;
  hasScope: boolean;
  /** Feature is disabled for this page key (server returned 404). */
  unsupported: boolean;
  loading: boolean;
  error: string | null;
  context: CopilotContext | null;
  /** The claims to render: model claims once ready and non-empty, else deterministic. */
  claims: CopilotClaim[];
  /** Which pipeline produced `claims`. Read the label off this, never off the phase. */
  producer: InsightProducer;
  /** True while `claims` are the deterministic provisional list. */
  provisional: boolean;
  modelPending: boolean;
  /** Model phase failed or returned nothing usable — keep the list, label it partial. */
  modelPartial: boolean;
  /** A grounded, presentable insights result exists for the active lead. */
  ready: boolean;
  noAccess: boolean;
  sources: CopilotSource[];
  suggestedQuestions: string[];
  /** A real warning/critical claim is on screen — drives the rail marker. */
  hasAttention: boolean;
  /** The rendered result settled while the surface was open (vs. a kept result). */
  generatedWhileOpen: boolean;
  turns: CopilotTurn[];
  /** The finding the composer is currently attached to, if any. */
  pendingContext: PriorClaimContext | null;
  /** Attach a finding to the next question and move focus into the composer. */
  chatAbout: (claim: CopilotClaim) => void;
  /**
   * Drop the finding attached to the next question, leaving the draft and the
   * transcript untouched. Trivially reversible — the operator can re-attach from
   * the row — so unlike `clearConversation` it needs no confirmation.
   */
  detachFinding: () => void;
  /**
   * Drop the transcript. Aborts anything in flight and leaves the findings
   * untouched — the findings are not chat, and clearing the conversation must
   * never look like it cleared the panel.
   */
  clearConversation: () => void;
  asking: boolean;
  input: string;
  /** The composer may send for the active scope. */
  canAsk: boolean;
  setInput: (value: string) => void;
  submit: (text?: string) => void;
  retryTurn: (turnId: string) => void;
  retryInsights: () => void;
  retryDeterministic: () => void;
};
