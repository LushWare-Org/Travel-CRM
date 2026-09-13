import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  copilotAsk,
  copilotInsights,
  copilotDeterministic,
  copilotSeen,
  isCopilotAbort,
} from "@/services/copilotAPI";
import type {
  ClaimSection,
  ClaimSeverity,
  CopilotClaim,
  CopilotContext,
  CopilotFact,
  CopilotSession,
  CopilotSource,
  CopilotTurn,
  CopilotScope,
  SinceWindow,
} from "./types";

// A kept insights result is only re-presented while it is this fresh; past the
// bound the dock regenerates instead, so the presented content is never
// arbitrarily old.
export const INSIGHTS_FRESHNESS_MS = 5 * 60_000;

// The deterministic insight shape, mapped once for both views. `insights` and
// `ranked` carry the same items; the difference is that `ranked` is ordered and
// scored. One mapper keeps the two from drifting.
//
// The fields the client reads are CHECKED rather than asserted, because the type
// is lost where the JS service layer hands the payload over. Unknown fields are
// ignored on purpose: a server that adds a field must not break a client that has
// not learned about it yet (the 4C lockstep rule).
//
// This also closes a gap the old mapper had: it read only the singular `fact`,
// so the plural `facts` a computed rule emits were dropped on the floor.
const SECTIONS = ["current_state", "changed", "attention", "experienced_view"] as const;
const SEVERITIES = ["info", "warning", "critical"] as const;

function isSection(value: unknown): value is ClaimSection {
  return typeof value === "string" && (SECTIONS as readonly string[]).includes(value);
}

function isSeverity(value: unknown): value is ClaimSeverity {
  return typeof value === "string" && (SEVERITIES as readonly string[]).includes(value);
}

function isFact(value: unknown): value is CopilotFact {
  if (typeof value !== "object" || value === null) return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.kind === "string" && typeof raw.value === "string" && typeof raw.evidenceId === "string";
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((entry) => typeof entry === "number");
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toClaim(insight: unknown): CopilotClaim | null {
  if (typeof insight !== "object" || insight === null) return null;
  const raw = insight as Record<string, unknown>;
  const { id, text } = raw;
  if (typeof id !== "string" || typeof text !== "string") return null;
  if (!isSection(raw.section) || !isSeverity(raw.severity)) return null;

  const facts: CopilotFact[] = [];
  if (isFact(raw.fact)) facts.push(raw.fact);
  if (Array.isArray(raw.facts)) facts.push(...raw.facts.filter(isFact));

  return {
    id,
    section: raw.section,
    text,
    facts,
    evidenceIds: Array.isArray(raw.evidenceIds)
      ? raw.evidenceIds.filter((entry): entry is string => typeof entry === "string")
      : [],
    evidenceType: typeof raw.evidenceType === "string" ? raw.evidenceType : "computed",
    severity: raw.severity,
    key: typeof raw.key === "string" && raw.key.length > 0 ? raw.key : null,
    ruleId: typeof raw.ruleId === "string" && raw.ruleId.length > 0 ? raw.ruleId : null,
    score: optionalNumber(raw.score),
    components: isNumberRecord(raw.components) ? raw.components : undefined,
    origin: raw.origin === "rule" || raw.origin === "model" ? raw.origin : undefined,
    urgency: optionalNumber(raw.urgency),
    novelty: optionalNumber(raw.novelty),
    confidence: optionalNumber(raw.confidence),
    actionability: optionalNumber(raw.actionability),
  };
}

function toClaims(insights: unknown): CopilotClaim[] {
  if (!Array.isArray(insights)) return [];
  return insights.map(toClaim).filter((claim): claim is CopilotClaim => claim !== null);
}

function emptyDeterministic(status: DeterministicState["status"]): DeterministicState {
  return {
    status,
    context: null,
    insights: [],
    ranked: [],
    suppressedCount: 0,
    suppressedCriticals: [],
    rankingVersion: undefined,
    sources: [],
    error: null,
    noAccess: false,
  };
}

type DeterministicState = {
  status: "loading" | "ready" | "error";
  context: CopilotContext | null;
  insights: CopilotClaim[];
  /** The server's ranked view, in server order. Never re-sorted here. */
  ranked: CopilotClaim[];
  suppressedCount: number;
  suppressedCriticals: CopilotClaim[];
  rankingVersion?: string;
  // The server ships `sources` in the deterministic phase too: the per-source
  // baselines carry how much was examined, and without them the empty state has
  // no count to report and the cold-open evidence action has no metadata.
  sources: CopilotSource[];
  error: string | null;
  noAccess: boolean;
};

type InsightsState = {
  status: "idle" | "pending" | "ready" | "error";
  runId: number;
  claims: CopilotClaim[];
  sources: CopilotSource[];
  questions: string[];
  error: string | null;
  generatedAt: string | null;
  receivedAt: number;
  /** True when the result settled while the surface was open (checked, not kept). */
  settledWhileOpen: boolean;
};

type Session = {
  scopeKey: string | null;
  unsupported: boolean;
  deterministic: DeterministicState;
  insights: InsightsState;
  /** The model phase was requested for this key (the first open latches it). */
  armed: boolean;
  ackRunId: number | null;
  ackFailedRunId: number | null;
  turns: CopilotTurn[];
  input: string;
  asking: boolean;
};

export type UseCopilotSessionOptions = {
  pageKey?: string;
  /** Whether the dock or drawer is actually open for this session. */
  open?: boolean;
};

// Null => dormant. No record key => "__collection__". Non-empty leadId => record key. Blank => dormant.
export function deriveScopeKey(scope: CopilotScope | undefined | null): string | null {
  if (!scope) return null;
  if (!('leadId' in scope)) return "__collection__";
  const raw = scope.leadId;
  if (typeof raw !== "string") return "__collection__";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createSession(scopeKey: string | null): Session {
  return {
    scopeKey,
    unsupported: false,
    deterministic: emptyDeterministic(scopeKey ? "loading" : "ready"),
    insights: {
      status: "idle",
      runId: 0,
      claims: [],
      sources: [],
      questions: [],
      error: null,
      generatedAt: null,
      receivedAt: 0,
      settledWhileOpen: false,
    },
    armed: false,
    ackRunId: null,
    ackFailedRunId: null,
    turns: [],
    input: "",
    asking: false,
  };
}

function messageOf(err: unknown, fallback: string): string {
  const message = (err as { message?: string } | null)?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

let turnSeq = 0;
function nextTurnId(): string {
  turnSeq += 1;
  return `turn-${Date.now().toString(36)}-${turnSeq}`;
}

/**
 * Scope lifecycle for the copilot: a nullable, keyed, abortable lead session.
 *
 * - no lead => zero requests and every lead-scoped value cleared;
 * - a new lead id discards the previous session in the same render that selects
 *   it, and aborts the previous lead's in-flight requests;
 * - a late response from the previous lead can never repopulate the new one;
 * - the deterministic phase paints on every scope change, the model phase only
 *   runs while the surface is actually open, and a kept result is reused within
 *   the freshness bound;
 * - the last-seen acknowledgement fires once, at presentation time, only for a
 *   grounded insights set that is on screen for the active lead.
 */
export function useCopilotSession(
  scope: CopilotScope | undefined | null,
  since: SinceWindow = "last_visit",
  options: UseCopilotSessionOptions = {}
): CopilotSession {
  const pageKey = options.pageKey ?? "leads";
  const open = options.open ?? false;
  const scopeKey = deriveScopeKey(scope);

  const [sessionState, setSessionState] = useState<Session>(() => createSession(scopeKey));
  const sessionRef = useRef(sessionState);
  const activeKeyRef = useRef(scopeKey);
  // The committed session key. The reset below is guarded by this STATE rather
  // than only by `activeKeyRef`: React may discard a render pass, and a ref
  // mutated by a discarded render keeps the new key while the state update never
  // commits — which silently skips the reset forever after (propLeadId null,
  // session still showing the previous lead's insights).
  const [activeKey, setActiveKey] = useState(scopeKey);
  const activeScopeRef = useRef(scope);
  const openRef = useRef(open);
  const controllersRef = useRef(new Set<AbortController>());
  const insightsInFlightRef = useRef<number | null>(null);
  // The (key, run) generation this session body already requested, so an
  // arming re-render cannot start the same generation twice.
  const insightsStartedRef = useRef<{ key: string | null; run: number } | null>(null);
  const runIdRef = useRef(0);
  const [deterministicRun, setDeterministicRun] = useState(0);
  const [insightsRun, setInsightsRun] = useState(0);

  openRef.current = open;

  const commit = useCallback((updater: Session | ((current: Session) => Session)) => {
    const next = typeof updater === "function" ? (updater as (current: Session) => Session)(sessionRef.current) : updater;
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  // Key the whole session body by lead id: selecting B discards A's state in the
  // same render that B appears, before any of B's requests start.
  if (activeKey !== scopeKey) {
    setActiveKey(scopeKey);
    activeKeyRef.current = scopeKey;
    activeScopeRef.current = scope;
    sessionRef.current = createSession(scopeKey);
    insightsInFlightRef.current = null;
    insightsStartedRef.current = null;
    setSessionState(sessionRef.current);
  }

  // The reset above races completions belonging to the scope being left: React
  // can re-commit one of those already-queued writes after the reset, leaving
  // the state holding the previous scope's session. With the selection cleared
  // there is nothing left in flight to correct it, so the cleared scope's
  // composer and its claims would stay on screen indefinitely. Wherever the
  // state has drifted, this render presents the scope it was actually given:
  // a session carrying another scope's key is discarded rather than shown.
  const session = sessionState.scopeKey === scopeKey ? sessionState : createSession(scopeKey);
  // Point later completions at the session being presented, so the state
  // converges on the next commit rather than staying stale.
  if (session !== sessionState) sessionRef.current = session;

  const register = useCallback((controller: AbortController) => {
    controllersRef.current.add(controller);
    return () => {
      controllersRef.current.delete(controller);
    };
  }, []);

  // Abort every request still in flight for the previous key (or on unmount).
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, [scopeKey]);

  // Phase 1 — deterministic skeleton, on every scope change.
  useEffect(() => {
    if (!scopeKey) return undefined;
    const capturedKey = scopeKey;
    const capturedScope = activeScopeRef.current ?? {};
    const controller = new AbortController();
    const unregister = register(controller);

    commit((current) => ({
      ...current,
      deterministic: emptyDeterministic("loading"),
    }));

    copilotDeterministic({ pageKey, scope: capturedScope, since, signal: controller.signal })
      .then((result) => {
        if (activeKeyRef.current !== capturedKey) return;
        const insights = toClaims(result.insights);
        commit((current) => ({
          ...current,
          deterministic: {
            status: "ready",
            context: {
              pageKey: result.context?.pageKey ?? pageKey,
              scopeLabel: result.context?.scopeLabel ?? "",
              asOf: result.context?.asOf,
              unavailableSources: result.unavailableSources ?? [],
              notAuthorizedSources: result.notAuthorizedSources ?? [],
              partial: Boolean((result.unavailableSources?.length ?? 0) > 0 || (result.notAuthorizedSources?.length ?? 0) > 0),
              noAccess: Boolean(result.context?.noAccess),
            },
            insights,
            // The ranked view is adopted here and rendered by the panel. It is
            // the same items in a designed order; `insights` stays populated as
            // the fallback so a server that predates the ranking, or one that
            // sends none, still renders.
            ranked: toClaims(result.ranked),
            suppressedCount: typeof result.suppressedCount === "number" ? result.suppressedCount : 0,
            suppressedCriticals: toClaims(result.suppressedCriticals),
            rankingVersion: typeof result.rankingVersion === "string" ? result.rankingVersion : undefined,
            sources: result.sources ?? [],
            error: null,
            noAccess: Boolean(result.context?.noAccess),
          },
        }));
      })
      .catch((err) => {
        if (isCopilotAbort(err) || activeKeyRef.current !== capturedKey) return;
        if (err?.status === 404) {
          console.debug("Copilot feature is disabled for this page key (404).");
          commit((current) => ({ ...current, unsupported: true }));
          return;
        }
        commit((current) => ({
          ...current,
          deterministic: {
            status: "error",
            context: null,
            insights: [],
            ranked: [],
            suppressedCount: 0,
            suppressedCriticals: [],
            rankingVersion: undefined,
            sources: [],
            error: messageOf(err, "Failed to load these insights"),
            noAccess: false,
          },
        }));
      })
      .finally(unregister);

    return () => {
      unregister();
      controller.abort();
    };
    // `commit` and `register` are stable; the scope key drives this effect.
  }, [scopeKey, pageKey, since, deterministicRun, commit, register]);

  // The model phase is requested the first time the surface is open for a key.
  useEffect(() => {
    if (!scopeKey || !open) return;
    if (!sessionRef.current.armed) commit((current) => ({ ...current, armed: true }));
  }, [scopeKey, open, commit]);

  // Phase 2 — model insights. Never cancelled by a collapse: its result is kept
  // for the next open of the same scope, and a stale kept result is regenerated
  // by the reopen effect below rather than re-presented.
  useEffect(() => {
    if (!scopeKey || !sessionRef.current.armed || sessionRef.current.unsupported) return undefined;
    const started = insightsStartedRef.current;
    if (started && started.key === scopeKey && started.run === insightsRun) return undefined;
    if (insightsInFlightRef.current != null) return undefined;
    if (sessionRef.current.deterministic.noAccess) return undefined;

    const capturedKey = scopeKey;
    const capturedScope = activeScopeRef.current ?? {};
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const controller = new AbortController();
    const unregister = register(controller);
    insightsInFlightRef.current = runId;
    insightsStartedRef.current = { key: scopeKey, run: insightsRun };

    commit((current) => ({
      ...current,
      insights: { ...current.insights, status: "pending", runId, error: null },
    }));

    const settle = () => {
      if (insightsInFlightRef.current === runId) insightsInFlightRef.current = null;
    };

    copilotInsights({ pageKey, scope: capturedScope, since, signal: controller.signal })
      .then((result) => {
        if (activeKeyRef.current !== capturedKey) return;
        commit((current) => ({
          ...current,
          insights: {
            status: "ready",
            runId,
            claims: result.claims ?? [],
            sources: result.sources ?? [],
            questions: (result.suggestedQuestions ?? []).slice(0, 3),
            error: null,
            generatedAt: result.context?.generatedAt ?? null,
            receivedAt: Date.now(),
            settledWhileOpen: openRef.current,
          },
        }));
      })
      .catch((err) => {
        if (activeKeyRef.current !== capturedKey) return;

        if (isCopilotAbort(err)) {
          // An abort for the scope we are STILL showing. This effect's own
          // cleanup aborts whenever its dependencies change (a benign re-render,
          // not a scope change), and returning silently here is what left
          // `insights.status === "pending"` forever: the start effect refuses to
          // restart a run it already started (`insightsStartedRef`), and the
          // regenerate effect returns early on "pending" because that status
          // means a request is legitimately in flight. Nothing retried, nothing
          // errored, so the panel sat on "AI insights in progress — showing what
          // is already verified" indefinitely, with no error and no Retry. The
          // window is wide whenever the model is slow: measured 8-18s per call,
          // so an interruption mid-flight is common rather than rare.
          //
          // Surface it as the recoverable failure it is, exactly as a timeout
          // already is. Guarded on `runId` so a superseding run that has already
          // committed its own "pending" is never trampled — a superseding run
          // commits a new runId, so this one no longer matches.
          commit((current) =>
            current.insights.runId === runId && current.insights.status === "pending"
              ? {
                  ...current,
                  insights: {
                    ...current.insights,
                    status: "error",
                    runId,
                    error: "The insights were interrupted. Try again.",
                    receivedAt: Date.now(),
                    settledWhileOpen: openRef.current,
                  },
                }
              : current
          );
          return;
        }

        // Only the model phase failed: the deterministic list stays on screen.
        commit((current) => ({
          ...current,
          insights: {
            ...current.insights,
            status: "error",
            runId,
            error: messageOf(err, "The AI insights could not be generated"),
            receivedAt: Date.now(),
            settledWhileOpen: openRef.current,
          },
        }));
      })
      .finally(() => {
        settle();
        unregister();
      });

    return () => {
      settle();
      unregister();
      controller.abort();
    };
    // `session.armed` (not a ref) so the first open of a key starts the phase.
  }, [scopeKey, insightsRun, session.armed, pageKey, since, commit, register]);

  // A genuine (re)open re-presents a fresh kept result, regenerates a stale or
  // failed one, and gives a failed acknowledgement one more chance.
  useEffect(() => {
    if (!scopeKey || !open) return;
    const current = sessionRef.current;
    if (current.ackFailedRunId != null) {
      commit((sessionState) => ({ ...sessionState, ackFailedRunId: null }));
    }
    if (!current.armed) return;
    const kept = current.insights;
    if (kept.status === "idle" || kept.status === "pending") return;
    if (kept.status === "ready" && Date.now() - kept.receivedAt <= INSIGHTS_FRESHNESS_MS) return;
    setInsightsRun((run) => run + 1);
  }, [scopeKey, open, commit]);

  // Acknowledgement: once, at presentation time, only for grounded content that
  // is actually on screen for the still-active lead.
  useEffect(() => {
    if (!scopeKey || !open) return undefined;
    const current = sessionRef.current;
    const insights = current.insights;
    if (insights.status !== "ready") return undefined;
    if (insights.claims.length === 0) return undefined;
    if (current.deterministic.noAccess || current.unsupported) return undefined;
    if (Date.now() - insights.receivedAt > INSIGHTS_FRESHNESS_MS) return undefined;
    if (current.ackRunId === insights.runId || current.ackFailedRunId === insights.runId) return undefined;

    const capturedKey = scopeKey;
    const capturedScope = activeScopeRef.current ?? {};
    const ackedRunId = insights.runId;
    const controller = new AbortController();
    const unregister = register(controller);

    // Marked before the request so a re-render can never double-acknowledge.
    commit((sessionState) => ({ ...sessionState, ackRunId: ackedRunId }));

    copilotSeen({ pageKey, scope: capturedScope, signal: controller.signal })
      .catch(() => {
        if (activeKeyRef.current !== capturedKey) return;
        // A failed acknowledgement never blocks the insights; it retries once
        // on the next genuine open.
        commit((sessionState) =>
          sessionState.insights.runId === ackedRunId
            ? { ...sessionState, ackRunId: null, ackFailedRunId: ackedRunId }
            : sessionState
        );
      })
      .finally(unregister);

    // Deliberately no abort here: the acknowledgement is not tied to a render.
    return undefined;
  }, [
    scopeKey,
    open,
    session.insights.status,
    session.insights.runId,
    session.insights.claims.length,
    session.ackRunId,
    session.ackFailedRunId,
    session.deterministic.noAccess,
    pageKey,
    commit,
    register,
  ]);

  const runTurn = useCallback(
    (turnId: string, question: string) => {
      const capturedKey = activeKeyRef.current;
      if (!capturedKey || sessionRef.current.unsupported) return;
      const capturedScope = activeScopeRef.current ?? {};
      const controller = new AbortController();
      const unregister = register(controller);
      commit((current) => ({ ...current, asking: true }));

      copilotAsk({
        pageKey,
        scope: capturedScope,
        since,
        messages: [{ role: "user", content: question }],
        signal: controller.signal,
      })
        .then((result) => {
          if (activeKeyRef.current !== capturedKey) return;
          commit((current) => ({
            ...current,
            asking: false,
            turns: current.turns.map((turn) =>
              turn.id === turnId
                ? { ...turn, status: "answered", answer: result.answerBlocks ?? [], sources: result.sources ?? [] }
                : turn
            ),
          }));
        })
        .catch((err) => {
          if (isCopilotAbort(err) || activeKeyRef.current !== capturedKey) return;
          // The question stays visible with its own error and Retry.
          commit((current) => ({
            ...current,
            asking: false,
            turns: current.turns.map((turn) =>
              turn.id === turnId
                ? { ...turn, status: "error", error: messageOf(err, "The copilot could not answer that") }
                : turn
            ),
          }));
        })
        .finally(unregister);
    },
    [pageKey, since, commit, register]
  );

  const submit = useCallback(
    (text?: string) => {
      const question = (text ?? sessionRef.current.input).trim();
      if (!question) return;
      if (!activeKeyRef.current) return;
      if (sessionRef.current.deterministic.noAccess || sessionRef.current.unsupported) return;
      if (sessionRef.current.asking) return;
      const turnId = nextTurnId();
      // The user turn exists before the request starts.
      commit((current) => ({
        ...current,
        input: "",
        turns: [...current.turns, { id: turnId, question, status: "pending" }],
      }));
      runTurn(turnId, question);
    },
    [commit, runTurn]
  );

  const retryTurn = useCallback(
    (turnId: string) => {
      const turn = sessionRef.current.turns.find((candidate) => candidate.id === turnId);
      if (!turn) return;
      commit((current) => ({
        ...current,
        turns: current.turns.map((candidate) =>
          candidate.id === turnId ? { ...candidate, status: "pending", error: undefined, answer: undefined } : candidate
        ),
      }));
      runTurn(turnId, turn.question);
    },
    [commit, runTurn]
  );

  const retryInsights = useCallback(() => {
    setInsightsRun((run) => run + 1);
  }, []);

  const retryDeterministic = useCallback(() => {
    setDeterministicRun((run) => run + 1);
  }, []);

  const setInput = useCallback(
    (value: string) => {
      commit((current) => ({ ...current, input: value }));
    },
    [commit]
  );

  return useMemo<CopilotSession>(() => {
    const modelClaims = session.insights.status === "ready" ? session.insights.claims : [];
    const claims = modelClaims.length > 0 ? modelClaims : session.deterministic.insights;
    const turnSources = session.turns.flatMap((turn) => turn.sources ?? []);
    // The deterministic phase's sources are included on purpose. They are what
    // the cold-open evidence action renders from and what carries the per-source
    // record counts; excluding them was the reason a collection page's evidence
    // buttons opened an empty panel. Deduped by id, insights sources win.
    const sources = [...session.insights.sources, ...turnSources, ...session.deterministic.sources].filter(
      (source, index, all) => all.findIndex((candidate) => candidate.id === source.id) === index
    );
    const noAccess = session.deterministic.noAccess;
    const insightsFailed = session.insights.status === "error";
    const modelEmpty = session.insights.status === "ready" && session.insights.claims.length === 0;
    const hasScope = session.scopeKey != null;

    return {
      unsupported: session.unsupported,
      leadId: session.scopeKey !== "__collection__" ? session.scopeKey : null,
      scopeKey: session.scopeKey,
      hasScope,
      loading: Boolean(hasScope && session.deterministic.status === "loading"),
      error: session.deterministic.error,
      context: session.deterministic.context
        ? {
            ...session.deterministic.context,
            generatedAt: session.insights.generatedAt ?? undefined,
            partial: modelClaims.length === 0,
          }
        : null,
      claims,
      ranked: session.deterministic.ranked,
      suppressedCount: session.deterministic.suppressedCount,
      suppressedCriticals: session.deterministic.suppressedCriticals,
      rankingVersion: session.deterministic.rankingVersion,
      provisional: modelClaims.length === 0,
      modelPending: session.insights.status === "pending",
      modelPartial: insightsFailed || modelEmpty,
      ready: session.deterministic.status === "ready" && claims.length > 0,
      noAccess,
      sources,
      suggestedQuestions: session.insights.status === "ready" ? session.insights.questions : [],
      hasAttention: claims.some((claim) => claim.severity === "warning" || claim.severity === "critical"),
      generatedWhileOpen: session.insights.settledWhileOpen,
      turns: session.turns,
      asking: session.asking,
      input: session.input,
      canAsk: hasScope && !noAccess && session.deterministic.status === "ready",
      setInput,
      submit,
      retryTurn,
      retryInsights,
      retryDeterministic,
    };
  }, [session, setInput, submit, retryTurn, retryInsights, retryDeterministic]);
}
