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

export type CopilotTurn = {
  id: string;
  question: string;
  status: "pending" | "answered" | "error";
  answer?: CopilotClaim[];
  sources?: CopilotSource[];
  error?: string;
};

export type CopilotSession = {
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
  /** True while `claims` are the deterministic provisional list. */
  provisional: boolean;
  modelPending: boolean;
  /** Model phase failed or returned nothing usable — keep the list, label it partial. */
  modelPartial: boolean;
  /** A grounded, presentable briefing result exists for the active lead. */
  ready: boolean;
  noAccess: boolean;
  sources: CopilotSource[];
  suggestedQuestions: string[];
  /** A real warning/critical claim is on screen — drives the rail marker. */
  hasAttention: boolean;
  /** The rendered result settled while the surface was open (vs. a kept result). */
  generatedWhileOpen: boolean;
  turns: CopilotTurn[];
  asking: boolean;
  input: string;
  /** The composer may send for the active scope. */
  canAsk: boolean;
  setInput: (value: string) => void;
  submit: (text?: string) => void;
  retryTurn: (turnId: string) => void;
  retryBriefing: () => void;
  retryDeterministic: () => void;
};
