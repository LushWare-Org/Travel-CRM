import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  copilotAsk,
  copilotBriefing,
  copilotDeterministic,
  copilotSeen,
  isCopilotAbort,
} from "@/services/copilotAPI";
import { COPILOT_PAGE_KEY } from "./types";
import type {
  CopilotClaim,
  CopilotContext,
  CopilotSession,
  CopilotSource,
  CopilotTurn,
  LeadCopilotScope,
  SinceWindow,
} from "./types";

// A kept briefing result is only re-presented while it is this fresh; past the
// bound the dock regenerates instead, so the presented content is never
// arbitrarily old.
export const BRIEFING_FRESHNESS_MS = 5 * 60_000;

type DeterministicState = {
  status: "loading" | "ready" | "error";
  context: CopilotContext | null;
  insights: CopilotClaim[];
  error: string | null;
  noAccess: boolean;
};

type BriefingState = {
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
  leadId: string | null;
  deterministic: DeterministicState;
  briefing: BriefingState;
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

// Trim, and treat blank/whitespace-only as no selection. `{}`, `{ leadId: '' }`
// and `{ leadId: '  ' }` are never sent as scopes.
export function normalizeLeadId(scope: LeadCopilotScope | undefined | null): string | null {
  const raw = scope?.leadId;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createSession(leadId: string | null): Session {
  return {
    leadId,
    deterministic: { status: leadId ? "loading" : "ready", context: null, insights: [], error: null, noAccess: false },
    briefing: {
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
 *   grounded briefing that is on screen for the active lead.
 */
export function useCopilotSession(
  scope: LeadCopilotScope,
  since: SinceWindow = "last_visit",
  options: UseCopilotSessionOptions = {}
): CopilotSession {
  const pageKey = options.pageKey ?? COPILOT_PAGE_KEY;
  const open = options.open ?? false;
  const leadId = normalizeLeadId(scope);

  const [session, setSessionState] = useState<Session>(() => createSession(leadId));
  const sessionRef = useRef(session);
  const activeKeyRef = useRef(leadId);
  // The committed session key. The reset below is guarded by this STATE rather
  // than only by `activeKeyRef`: React may discard a render pass, and a ref
  // mutated by a discarded render keeps the new key while the state update never
  // commits — which silently skips the reset forever after (propLeadId null,
  // session still briefing the previous lead).
  const [activeKey, setActiveKey] = useState(leadId);
  const openRef = useRef(open);
  const controllersRef = useRef(new Set<AbortController>());
  const briefingInFlightRef = useRef<number | null>(null);
  // The (key, run) generation this session body already requested, so an
  // arming re-render cannot start the same generation twice.
  const briefingStartedRef = useRef<{ key: string | null; run: number } | null>(null);
  const runIdRef = useRef(0);
  const [deterministicRun, setDeterministicRun] = useState(0);
  const [briefingRun, setBriefingRun] = useState(0);

  openRef.current = open;

  const commit = useCallback((updater: Session | ((current: Session) => Session)) => {
    const next = typeof updater === "function" ? (updater as (current: Session) => Session)(sessionRef.current) : updater;
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  // Key the whole session body by lead id: selecting B discards A's state in the
  // same render that B appears, before any of B's requests start.
  if (activeKey !== leadId) {
    setActiveKey(leadId);
    activeKeyRef.current = leadId;
    sessionRef.current = createSession(leadId);
    briefingInFlightRef.current = null;
    briefingStartedRef.current = null;
    setSessionState(sessionRef.current);
  }

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
  }, [leadId]);

  // Phase 1 — deterministic skeleton, on every scope change.
  useEffect(() => {
    if (!leadId) return undefined;
    const capturedKey = leadId;
    const controller = new AbortController();
    const unregister = register(controller);

    commit((current) => ({
      ...current,
      deterministic: { status: "loading", context: null, insights: [], error: null, noAccess: false },
    }));

    copilotDeterministic({ pageKey, scope: { leadId: capturedKey }, since, signal: controller.signal })
      .then((result) => {
        if (activeKeyRef.current !== capturedKey) return;
        const insights: CopilotClaim[] = (result.insights ?? []).map((insight: any) => ({
          id: insight.id,
          section: insight.section,
          text: insight.text,
          facts: insight.fact ? [insight.fact] : [],
          evidenceIds: insight.evidenceIds ?? [],
          evidenceType: "computed",
          severity: insight.severity,
        }));
        commit((current) => ({
          ...current,
          deterministic: {
            status: "ready",
            context: {
              pageKey: result.context?.pageKey ?? pageKey,
              scopeLabel: result.context?.scopeLabel ?? "",
              asOf: result.context?.asOf,
              partial: false,
              noAccess: Boolean(result.context?.noAccess),
            },
            insights,
            error: null,
            noAccess: Boolean(result.context?.noAccess),
          },
        }));
      })
      .catch((err) => {
        if (isCopilotAbort(err) || activeKeyRef.current !== capturedKey) return;
        commit((current) => ({
          ...current,
          deterministic: {
            status: "error",
            context: null,
            insights: [],
            error: messageOf(err, "Failed to load this lead's briefing"),
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
  }, [leadId, pageKey, since, deterministicRun, commit, register]);

  // The model phase is requested the first time the surface is open for a key.
  useEffect(() => {
    if (!leadId || !open) return;
    if (!sessionRef.current.armed) commit((current) => ({ ...current, armed: true }));
  }, [leadId, open, commit]);

  // Phase 2 — model briefing. Never cancelled by a collapse: its result is kept
  // for the next open of the same scope, and a stale kept result is regenerated
  // by the reopen effect below rather than re-presented.
  useEffect(() => {
    if (!leadId || !sessionRef.current.armed) return undefined;
    const started = briefingStartedRef.current;
    if (started && started.key === leadId && started.run === briefingRun) return undefined;
    if (briefingInFlightRef.current != null) return undefined;
    if (sessionRef.current.deterministic.noAccess) return undefined;

    const capturedKey = leadId;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const controller = new AbortController();
    const unregister = register(controller);
    briefingInFlightRef.current = runId;
    briefingStartedRef.current = { key: leadId, run: briefingRun };

    commit((current) => ({
      ...current,
      briefing: { ...current.briefing, status: "pending", runId, error: null },
    }));

    const settle = () => {
      if (briefingInFlightRef.current === runId) briefingInFlightRef.current = null;
    };

    copilotBriefing({ pageKey, scope: { leadId: capturedKey }, since, signal: controller.signal })
      .then((result) => {
        if (activeKeyRef.current !== capturedKey) return;
        commit((current) => ({
          ...current,
          briefing: {
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
        if (isCopilotAbort(err) || activeKeyRef.current !== capturedKey) return;
        // Only the model phase failed: the deterministic list stays on screen.
        commit((current) => ({
          ...current,
          briefing: {
            ...current.briefing,
            status: "error",
            runId,
            error: messageOf(err, "The AI briefing could not be generated"),
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
  }, [leadId, briefingRun, session.armed, pageKey, since, commit, register]);

  // A genuine (re)open re-presents a fresh kept result, regenerates a stale or
  // failed one, and gives a failed acknowledgement one more chance.
  useEffect(() => {
    if (!leadId || !open) return;
    const current = sessionRef.current;
    if (current.ackFailedRunId != null) {
      commit((sessionState) => ({ ...sessionState, ackFailedRunId: null }));
    }
    if (!current.armed) return;
    const kept = current.briefing;
    if (kept.status === "idle" || kept.status === "pending") return;
    if (kept.status === "ready" && Date.now() - kept.receivedAt <= BRIEFING_FRESHNESS_MS) return;
    setBriefingRun((run) => run + 1);
  }, [leadId, open, commit]);

  // Acknowledgement: once, at presentation time, only for grounded content that
  // is actually on screen for the still-active lead.
  useEffect(() => {
    if (!leadId || !open) return undefined;
    const current = sessionRef.current;
    const briefing = current.briefing;
    if (briefing.status !== "ready") return undefined;
    if (briefing.claims.length === 0) return undefined;
    if (current.deterministic.noAccess) return undefined;
    if (Date.now() - briefing.receivedAt > BRIEFING_FRESHNESS_MS) return undefined;
    if (current.ackRunId === briefing.runId || current.ackFailedRunId === briefing.runId) return undefined;

    const capturedKey = leadId;
    const ackedRunId = briefing.runId;
    const controller = new AbortController();
    const unregister = register(controller);

    // Marked before the request so a re-render can never double-acknowledge.
    commit((sessionState) => ({ ...sessionState, ackRunId: ackedRunId }));

    copilotSeen({ pageKey, scope: { leadId: capturedKey }, signal: controller.signal })
      .catch(() => {
        if (activeKeyRef.current !== capturedKey) return;
        // A failed acknowledgement never blocks the briefing; it retries once
        // on the next genuine open.
        commit((sessionState) =>
          sessionState.briefing.runId === ackedRunId
            ? { ...sessionState, ackRunId: null, ackFailedRunId: ackedRunId }
            : sessionState
        );
      })
      .finally(unregister);

    // Deliberately no abort here: the acknowledgement is not tied to a render.
    return undefined;
  }, [
    leadId,
    open,
    session.briefing.status,
    session.briefing.runId,
    session.briefing.claims.length,
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
      if (!capturedKey) return;
      const controller = new AbortController();
      const unregister = register(controller);
      commit((current) => ({ ...current, asking: true }));

      copilotAsk({
        pageKey,
        scope: { leadId: capturedKey },
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
      if (sessionRef.current.deterministic.noAccess) return;
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

  const retryBriefing = useCallback(() => {
    setBriefingRun((run) => run + 1);
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
    const modelClaims = session.briefing.status === "ready" ? session.briefing.claims : [];
    const claims = modelClaims.length > 0 ? modelClaims : session.deterministic.insights;
    const turnSources = session.turns.flatMap((turn) => turn.sources ?? []);
    const sources = [...session.briefing.sources, ...turnSources].filter(
      (source, index, all) => all.findIndex((candidate) => candidate.id === source.id) === index
    );
    const noAccess = session.deterministic.noAccess;
    const briefingFailed = session.briefing.status === "error";
    const modelEmpty = session.briefing.status === "ready" && session.briefing.claims.length === 0;
    const hasScope = session.leadId != null;

    return {
      leadId: session.leadId,
      hasScope,
      loading: Boolean(hasScope && session.deterministic.status === "loading"),
      error: session.deterministic.error,
      context: session.deterministic.context
        ? {
            ...session.deterministic.context,
            generatedAt: session.briefing.generatedAt ?? undefined,
            partial: modelClaims.length === 0,
          }
        : null,
      claims,
      provisional: modelClaims.length === 0,
      modelPending: session.briefing.status === "pending",
      modelPartial: briefingFailed || modelEmpty,
      ready: session.deterministic.status === "ready" && claims.length > 0,
      noAccess,
      sources,
      suggestedQuestions: session.briefing.status === "ready" ? session.briefing.questions : [],
      hasAttention: claims.some((claim) => claim.severity === "warning" || claim.severity === "critical"),
      generatedWhileOpen: session.briefing.settledWhileOpen,
      turns: session.turns,
      asking: session.asking,
      input: session.input,
      canAsk: hasScope && !noAccess && session.deterministic.status === "ready",
      setInput,
      submit,
      retryTurn,
      retryBriefing,
      retryDeterministic,
    };
  }, [session, setInput, submit, retryTurn, retryBriefing, retryDeterministic]);
}
