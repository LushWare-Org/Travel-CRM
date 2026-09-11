import { useEffect, useRef, useState } from "react";
import { ClipboardList, Loader2, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClaimItem from "./ClaimItem";
import { SuggestedQuestions, claimsIn } from "./briefingShared";
import { LiveStatus, useAnnouncer } from "./Announcer";
import type { ClaimSection, CopilotClaim, CopilotSession } from "./types";

type LeadBriefingProps = {
  session: CopilotSession;
  /** Client-side display label for the active lead. */
  scopeLabel: string;
  leadId?: string | null;
  /** Collapses the persistent desktop dock. Omitted below `xl`. */
  onCollapse?: () => void;
};

const SECTION_LABELS: Record<ClaimSection, string> = {
  changed: "Since you were here",
  current_state: "Current state",
  attention: "Needs attention",
  experienced_view: "Experienced view",
};

function formatMoment(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

/**
 * The briefing-first hierarchy: lead identity and freshness, what changed since
 * the agent last saw this lead, the current state, then what needs attention
 * before interpretation and its suggested questions. The conversation below it
 * belongs to the shell, not to this briefing.
 *
 * Deterministic insights render first as a provisional list; a successful
 * non-empty model briefing replaces it atomically — never clearing first and
 * never unmounting a control the agent is focused on.
 */
export default function LeadBriefing({ session, scopeLabel, leadId, onCollapse }: LeadBriefingProps) {
  const [announcement, announce] = useAnnouncer();
  const claimsRegionRef = useRef<HTMLDivElement | null>(null);
  const [renderedClaims, setRenderedClaims] = useState<CopilotClaim[]>(session.claims);
  const [queuedClaims, setQueuedClaims] = useState<CopilotClaim[] | null>(null);

  // Atomic replacement, deferred while the agent's focus is in the provisional
  // claims region so a focused control is never unmounted under them.
  useEffect(() => {
    if (session.claims === renderedClaims) return;
    const region = claimsRegionRef.current;
    const focused = typeof document !== "undefined" ? document.activeElement : null;
    const focusInside = Boolean(region && focused && focused !== document.body && region.contains(focused));
    if (focusInside) {
      setQueuedClaims(session.claims);
      announce("Updated briefing ready");
      return;
    }
    setRenderedClaims(session.claims);
  }, [session.claims, renderedClaims, announce]);

  useEffect(() => {
    if (!queuedClaims) return undefined;
    const onFocusChange = () => {
      const region = claimsRegionRef.current;
      const focused = document.activeElement;
      if (region && focused && focused !== document.body && region.contains(focused)) return;
      setRenderedClaims(queuedClaims);
      setQueuedClaims(null);
    };
    document.addEventListener("focusin", onFocusChange);
    return () => document.removeEventListener("focusin", onFocusChange);
  }, [queuedClaims]);

  const modelClaimsShown = !session.provisional && session.claims.length > 0;
  const moment = formatMoment(modelClaimsShown ? session.context?.generatedAt : session.context?.asOf);
  const momentLabel = modelClaimsShown ? (session.generatedWhileOpen ? "AI checked this lead" : "Generated") : "Checked";
  const changed = claimsIn(renderedClaims, "changed");
  const attention = claimsIn(renderedClaims, "attention");
  const currentState = claimsIn(renderedClaims, "current_state");
  const experienced = claimsIn(renderedClaims, "experienced_view");
  const hasAnyClaim = renderedClaims.length > 0;

  return (
    <section aria-labelledby="copilot-briefing-heading" className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h2 id="copilot-briefing-heading" tabIndex={-1} className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Lead briefing
          </h2>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCollapse}
              aria-label="Collapse copilot"
              className="shrink-0"
            >
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        <p className="text-sm text-foreground">{scopeLabel}</p>

        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {leadId && <span className="font-mono tabular-nums">{leadId}</span>}
          {moment && (
            <span>
              {momentLabel} <span className="font-mono tabular-nums">{moment}</span>
            </span>
          )}
          {session.modelPartial && <span className="text-warning">Partial briefing</span>}
        </p>
      </header>

      <LiveStatus message={announcement} />

      {session.noAccess && <p className="text-sm text-muted-foreground">You do not have access to this record.</p>}

      {!session.hasScope && (
        <p className="text-sm text-muted-foreground">Select a lead to generate its situation briefing.</p>
      )}

      {!session.noAccess && session.error && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">{session.error}</p>
          <Button variant="outline" size="xs" onClick={session.retryDeterministic}>
            Retry
          </Button>
        </div>
      )}

      {session.hasScope && !session.noAccess && !session.error && session.loading && !hasAnyClaim && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Checking this lead…
        </p>
      )}

      {session.hasScope && !session.noAccess && !session.error && (
        <div ref={claimsRegionRef} className="space-y-4">
          {changed.length > 0 && (
            <section aria-label={SECTION_LABELS.changed} className="border-y border-border py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS.changed}
              </p>
              <div className="mt-2 space-y-3">
                {changed.map((claim) => (
                  <ClaimItem key={claim.id} claim={claim} sources={session.sources} announce={announce} />
                ))}
              </div>
            </section>
          )}

          {currentState.length > 0 && (
            <section aria-label={SECTION_LABELS.current_state} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS.current_state}
              </p>
              <div className="space-y-3">
                {currentState.map((claim) => (
                  <ClaimItem key={claim.id} claim={claim} sources={session.sources} announce={announce} />
                ))}
              </div>
            </section>
          )}

          {attention.length > 0 && (
            <section aria-label={SECTION_LABELS.attention} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS.attention}
              </p>
              <div className="space-y-3">
                {attention.map((claim) => (
                  <ClaimItem key={claim.id} claim={claim} sources={session.sources} announce={announce} />
                ))}
              </div>
            </section>
          )}

          {experienced.length > 0 && (
            <section aria-label={SECTION_LABELS.experienced_view} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS.experienced_view}
              </p>
              <div className="space-y-3">
                {experienced.map((claim) => (
                  <ClaimItem key={claim.id} claim={claim} sources={session.sources} announce={announce} />
                ))}
              </div>
            </section>
          )}

          {!hasAnyClaim && !session.loading && (
            <p className="text-sm text-muted-foreground">No verified insights for this lead yet.</p>
          )}

          {session.modelPending && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              AI briefing in progress — showing what is already verified.
            </p>
          )}

          {session.modelPartial && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                The AI briefing was not available; this is the verified summary.
              </p>
              <Button variant="outline" size="xs" onClick={session.retryBriefing}>
                Retry
              </Button>
            </div>
          )}

          <SuggestedQuestions session={session} />
        </div>
      )}
    </section>
  );
}
