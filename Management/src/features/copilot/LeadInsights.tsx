import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import InsightRow from "./InsightRow";
import { ProducerLine, SuggestedQuestions, sectionBuckets } from "./insightShared";
import { LiveStatus, useAnnouncer } from "./Announcer";
import type { ClaimSection, CopilotClaim, CopilotSession, RenderedInsights } from "./types";

type LeadInsightsProps = {
  session: CopilotSession;
  /** Client-side display label for the active lead. */
  scopeLabel: string;
  leadId?: string | null;
  /** Collapses the persistent desktop dock. Omitted below `xl`. */
  onCollapse?: () => void;
  /** Bring the conversation forward after a suggested question is submitted. */
  onShowConversation?: () => void;
};

const SECTION_LABELS: Record<ClaimSection, string> = {
  changed: "Since you were here",
  current_state: "Current state",
  attention: "Needs attention",
  experienced_view: "Experienced view",
};

// The record panel's own order, deliberately different from the collection's:
// a record is read changed-first, a list is scanned attention-first. Only the
// SECTION ORDER and the heading text differ — the grouping mechanism, the row,
// and the critical band are shared.
const LEAD_SECTION_ORDER: ClaimSection[] = [
  "changed",
  "current_state",
  "attention",
  "experienced_view",
];

/**
 * The insight-first hierarchy: lead identity and freshness, what changed since
 * the agent last saw this lead, the current state, then what needs attention
 * before interpretation and its suggested questions. The conversation below it
 * belongs to the shell, not to this panel.
 *
 * Deterministic insights render first as a provisional list; a successful
 * non-empty model insight set replaces it atomically — never clearing first and
 * never unmounting a control the agent is focused on.
 */
export default function LeadInsights({
  session,
  scopeLabel,
  leadId,
  onCollapse,
  onShowConversation,
}: LeadInsightsProps) {
  const [announcement, announce] = useAnnouncer();
  const claimsRegionRef = useRef<HTMLDivElement | null>(null);
  // The producer travels WITH the claims here too, and for the same reason: the
  // model phase can settle while the deterministic rows are still mounted, and a
  // header reading the phase would label those rows as AI-authored.
  const [rendered, setRendered] = useState<RenderedInsights>({
    producer: session.producer,
    claims: session.claims,
  });
  const [queued, setQueued] = useState<RenderedInsights | null>(null);

  // Atomic replacement, deferred while the agent's focus is in the provisional
  // claims region so a focused control is never unmounted under them.
  useEffect(() => {
    const incoming: RenderedInsights = { producer: session.producer, claims: session.claims };
    if (incoming.claims === rendered.claims) return;
    const region = claimsRegionRef.current;
    const focused = typeof document !== "undefined" ? document.activeElement : null;
    const focusInside = Boolean(region && focused && focused !== document.body && region.contains(focused));
    if (focusInside) {
      setQueued(incoming);
      announce("Updated insights ready");
      return;
    }
    setRendered(incoming);
  }, [session.claims, session.producer, rendered, announce]);

  useEffect(() => {
    if (!queued) return undefined;
    const onFocusChange = () => {
      const region = claimsRegionRef.current;
      const focused = document.activeElement;
      if (region && focused && focused !== document.body && region.contains(focused)) return;
      setRendered(queued);
      setQueued(null);
    };
    document.addEventListener("focusin", onFocusChange);
    return () => document.removeEventListener("focusin", onFocusChange);
  }, [queued]);

  const buckets = useMemo(
    () => sectionBuckets(rendered.claims, LEAD_SECTION_ORDER, { ordering: "panel" }),
    [rendered.claims]
  );
  const hasAnyClaim = rendered.claims.length > 0;

  // Same composition as the collection panel: the attachment lives on the
  // Copilot tab, so attaching must also raise that tab or the quoted block lands
  // in a hidden panel and the composer cannot take focus.
  const attachFinding = (claim: CopilotClaim) => {
    session.chatAbout(claim);
    onShowConversation?.();
  };

  return (
    <div data-copilot-panel="record" className="space-y-4">
      <header className="space-y-1">
        {/*
          Same rule as the collection panel: the producer marker never truncates,
          the scope label truncates first. The old third label ("AI checked this
          lead") collapsed into the marker — authorship is stated once, and a
          label that says "AI" next to a marker that already says it was the
          duplication this removes.

          The panel's own name is the tab above it, so this row starts at the
          scope. `ml-auto` keeps the collapse control out of that wrap argument.
        */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-[4rem] truncate text-sm text-foreground">{scopeLabel}</p>
          <ProducerLine producer={rendered.producer} context={session.context} />
          {leadId && <span className="font-mono text-xs tabular-nums text-muted-foreground">{leadId}</span>}
          {session.modelPartial && <span className="text-xs text-warning">Partial insights</span>}
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCollapse}
              aria-label="Collapse copilot"
              className="ml-auto shrink-0"
            >
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      <LiveStatus message={announcement} />

      {session.noAccess && <p className="text-sm text-muted-foreground">You do not have access to this record.</p>}

      {!session.hasScope && (
        <p className="text-sm text-muted-foreground">Select a lead to see its insights.</p>
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
          {buckets.map((bucket) => {
            const key = bucket.kind === "critical" ? "critical" : bucket.section;
            const label = bucket.kind === "critical" ? "Critical" : SECTION_LABELS[bucket.section];
            const isCritical = bucket.kind === "critical";
            // The record panel keeps its own section SHAPES — `changed` is boxed
            // because it answers the return question, everything else is a plain
            // group — while the row and the band come from the shared pieces.
            const isChanged = bucket.kind === "section" && bucket.section === "changed";

            return (
              <section
                key={key}
                aria-label={label}
                className={isChanged ? "border-y border-border py-3" : "space-y-2"}
              >
                <p
                  className={
                    isCritical
                      ? "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive"
                      : "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  }
                >
                  {isCritical && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  {label}
                </p>
                <div className={isChanged ? "mt-2" : undefined}>
                  {bucket.claims.map((claim) => (
                    <InsightRow
                      key={claim.key ?? claim.id}
                      claim={claim}
                      sources={session.sources}
                      announce={announce}
                      onChatAbout={session.canAsk ? attachFinding : undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {!hasAnyClaim && !session.loading && (
            <p className="text-sm text-muted-foreground">No verified insights for this lead yet.</p>
          )}

          {session.modelPending && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              AI insights in progress — showing what is already verified.
            </p>
          )}

          {session.modelPartial && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                The AI insights were not available; this is the verified summary.
              </p>
              <Button variant="outline" size="xs" onClick={session.retryInsights}>
                Retry
              </Button>
            </div>
          )}

          <SuggestedQuestions session={session} onAsk={onShowConversation} />
        </div>
      )}
    </div>
  );
}
