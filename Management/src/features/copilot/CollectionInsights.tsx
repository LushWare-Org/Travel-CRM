import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import InsightList from "./InsightList";
import { ProducerLine, SuggestedQuestions, sectionBuckets } from "./insightShared";
import { LiveStatus, useAnnouncer } from "./Announcer";
import type { ClaimSection, CopilotClaim, CopilotSession, RenderedInsights } from "./types";

type CollectionInsightsProps = {
  session: CopilotSession;
  scopeLabel: string;
  onCollapse?: () => void;
  /** Bring the conversation forward after a suggested question is submitted. */
  onShowConversation?: () => void;
};

const SECTION_LABELS: Record<ClaimSection, string> = {
  attention: "Needs attention",
  changed: "Changed",
  current_state: "Current state",
  experienced_view: "Experienced view",
};

const SECTION_ORDER: ClaimSection[] = ["attention", "changed", "current_state", "experienced_view"];

// How many ranked items are shown before the operator asks for the rest. The
// server has already spent its own budget deciding what is worth showing; this is
// only about the viewport, so it cannot be the server's decision.
const RANKED_INITIAL = 5;

function InlineStatusRow({ dotColor, message, onRetry }: { dotColor?: string, message: string, onRetry?: () => void }) {
  return (
    <p className="flex items-center gap-2 text-sm text-foreground py-2 border-b border-border min-h-[44px]">
      {dotColor && <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />}
      {message}
      {onRetry && (
        <Button variant="outline" size="xs" onClick={onRetry} className="ml-auto">
          Retry
        </Button>
      )}
    </p>
  );
}

export default function CollectionInsights({
  session,
  scopeLabel,
  onCollapse,
  onShowConversation,
}: CollectionInsightsProps) {
  // Per-source baselines are emitted with the documented ID shape
  // (`<page>:source:<name>:recordCount`) and carry the count in `capturedValue`.
  // The empty state reports that count so it can say "nothing is flagged of the
  // 42 rows I looked at" rather than asserting a zero it never measured — a page
  // with fifty invoices and no findings is quiet, not empty. If no baseline
  // arrived, the line is omitted instead of guessed.
  const baselines = (session.sources ?? []).filter((source) => source.id.endsWith(":recordCount"));
  const examinedCount = baselines.reduce(
    (sum, source) => sum + (typeof source.capturedValue === "number" ? source.capturedValue : 0),
    0,
  );
  const [announcement, announce] = useAnnouncer();
  const claimsRegionRef = useRef<HTMLDivElement | null>(null);
  // The producer is stored WITH the claims it describes, and every write below
  // writes both halves as one value. That pairing is what stops the header
  // labelling rule-computed rows as AI-authored during the deferral window,
  // where the model phase has settled but the deterministic rows are still the
  // ones on screen.
  const [rendered, setRendered] = useState<RenderedInsights>({
    producer: session.producer,
    claims: session.claims,
  });
  const [queued, setQueued] = useState<RenderedInsights | null>(null);
  // Expansion is a viewport state, and it must not survive a scope change: an
  // expanded list on the next page would show items the operator never asked for
  // and cannot tell apart from the default view.
  const [showAllRanked, setShowAllRanked] = useState(false);
  const rankedHead = session.ranked[0]?.key ?? session.ranked[0]?.id ?? null;

  useEffect(() => {
    setShowAllRanked(false);
  }, [rankedHead]);

  useEffect(() => {
    const incoming: RenderedInsights = { producer: session.producer, claims: session.claims };
    if (incoming.claims === rendered.claims) return;
    const region = claimsRegionRef.current;
    const focused = typeof document !== "undefined" ? document.activeElement : null;
    const focusInside = Boolean(region && focused && focused !== document.body && region.contains(focused));
    if (focusInside) {
      // Queue the pair, never a bare claims array: the flush must not have to
      // reconstruct a producer, because the only thing it could reconstruct one
      // from is the phase flag that is already wrong in this window.
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

  const modelClaimsShown = !session.provisional && session.claims.length > 0;

  // Ranked rendering is the DETERMINISTIC path. Model claims carry no score, so
  // they keep the sectioned rendering: their order is the model's, and presenting
  // them as ranked would be an explanation the server never produced.
  //
  // The fallback is deliberate during rollout: a server that predates the ranking,
  // or one that sent an empty `ranked`, renders exactly as before.
  const ranked = session.ranked;
  const showRanked = !modelClaimsShown && ranked.length > 0;
  const visibleRanked = showAllRanked ? ranked : ranked.slice(0, RANKED_INITIAL);
  const hiddenRankedCount = showAllRanked ? 0 : Math.max(0, ranked.length - RANKED_INITIAL);

  // The panel chooses the SOURCE, never the shape. Both sources render through
  // one list, which is what stops the findings redrawing themselves when the
  // model phase settles.
  const source: RenderedInsights = showRanked
    ? { producer: "rule", claims: visibleRanked }
    : rendered;

  // Memoized because `keepMounted` keeps the inactive panel re-rendering on
  // every composer keystroke, and this must not scale with the list on each one.
  const buckets = useMemo(
    () =>
      sectionBuckets(source.claims, SECTION_ORDER, {
        // The ranked source's order IS the server's ranking and must survive
        // untouched. The unranked fallback has no ranking to overrule, so the
        // panel's own section order and attention severity ordering apply there
        // exactly as they always have.
        ordering: showRanked ? "server" : "panel",
      }),
    [source.claims, showRanked]
  );

  const hasAnyClaim = source.claims.length > 0;

  // Attaching a finding BRINGS THE CONVERSATION FORWARD, and that composition
  // lives here rather than in the session because the session does not own the
  // tab. Without it the quoted block renders into a hidden panel: present in the
  // DOM, invisible to the operator, and the composer's focus call is a no-op
  // because the browser will not focus a `display: none` element. Verified live —
  // the click left Insights selected and focus on `<body>`.
  const attachFinding = (claim: CopilotClaim) => {
    session.chatAbout(claim);
    onShowConversation?.();
  };

  useEffect(() => {
    if (session.noAccess) announce("You don't have access to this page's data.");
    else if (session.context?.partial) {
      if (session.context.notAuthorizedSources && session.context.notAuthorizedSources.length > 0) announce("Some data is outside your role");
      else announce(`Partially loaded - ${session.context.unavailableSources?.length || 0} sources unavailable`);
    } else if (session.error || session.modelPartial) announce("The summary couldn't be generated.");
  }, [session.noAccess, session.context?.partial, session.error, session.modelPartial, announce, session.context]);

  return (
    <div data-copilot-panel="collection" className="space-y-4">
      <header className="space-y-1">
        {/*
          The marker never truncates and the scope label truncates first: the
          timestamp is the freshness signal the panel's trust rests on, and a
          clipped one makes a stale briefing look current. `min-w` on the scope
          keeps it legible by wrapping the marker to its own line rather than
          squeezing the label to nothing at 360px.

          The panel's own name is the tab above it, so this row starts at the
          scope. `ml-auto` keeps the collapse control out of that wrap argument.
        */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-[4rem] truncate text-sm text-foreground">{scopeLabel}</p>
          <ProducerLine producer={source.producer} context={session.context} />
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCollapse}
              aria-label="Collapse copilot"
              className="ml-auto shrink-0 min-h-[44px] min-w-[44px]"
            >
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      <LiveStatus message={announcement} />

      {session.noAccess ? (
        <p className="text-sm text-muted-foreground">You don't have access to this page's data.</p>
      ) : (
        <>
          {session.hasScope && session.loading && !hasAnyClaim && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground py-2 border-b border-border min-h-[44px]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Reading the page…
            </p>
          )}

          {!hasAnyClaim && !session.loading && !session.modelPending && !session.error && !session.modelPartial && (
            <div className="space-y-2 py-4">
              <p className="text-sm text-foreground">Nothing needs you on this page.</p>
              {baselines.length > 0 && (
                <p className="text-xs text-muted-foreground font-mono">
                  {examinedCount} item{examinedCount === 1 ? "" : "s"} in the current view
                </p>
              )}
            </div>
          )}

          {session.context?.partial && (
            session.context.notAuthorizedSources && session.context.notAuthorizedSources.length > 0 ? (
              <InlineStatusRow message="Some data is outside your role" />
            ) : (
              <InlineStatusRow dotColor="bg-warning" message={`Partially loaded — ${session.context.unavailableSources?.length || 0} sources unavailable`} />
            )
          )}

          {(session.error || (session.modelPartial && !hasAnyClaim)) && (
            <InlineStatusRow message="The summary couldn't be generated." onRetry={session.retryInsights} />
          )}

          {session.modelPending && hasAnyClaim && (
             <div className="h-0.5 w-full bg-primary/20 overflow-hidden rounded-full mb-4">
                <div className="h-full bg-primary w-1/3 animate-[slide_1.5s_ease-in-out_infinite]" />
             </div>
          )}

          {/*
            ONE list, two sources. The bucket order is the server's ranking,
            regrouped by severity band and section; nothing here re-sorts, so the
            client cannot quietly replace the server's opinion with its own.
            `data-copilot-ranked` survives on the region so the existing ranked
            spec keeps asserting the same thing about the same source.
          */}
          <div ref={claimsRegionRef} {...(showRanked ? { "data-copilot-ranked": "" } : {})}>
            <InsightList
              buckets={buckets}
              labels={SECTION_LABELS}
              sources={session.sources}
              announce={announce}
              ranked={showRanked}
              hiddenCount={hiddenRankedCount}
              onShowMore={showRanked ? () => setShowAllRanked(true) : undefined}
              onChatAbout={session.canAsk ? attachFinding : undefined}
            />
          </div>

          {session.suppressedCount > 0 && (
            <p data-copilot-suppressed={session.suppressedCount} className="text-xs text-muted-foreground">
              {session.suppressedCount} previously flagged item
              {session.suppressedCount === 1 ? "" : "s"} hidden
            </p>
          )}

          {session.suppressedCriticals.length > 0 && (
            // Never let the quiet-state count stand in for a hidden critical:
            // "four already seen" and "a critical did not fit" are different
            // truths, and only one of them is safe to leave unsaid.
            <p
              data-copilot-suppressed-critical={session.suppressedCriticals.length}
              className="text-xs text-warning"
            >
              {session.suppressedCriticals.length} critical item
              {session.suppressedCriticals.length === 1 ? "" : "s"} did not fit and
              {session.suppressedCriticals.length === 1 ? " is" : " are"} not shown
            </p>
          )}

          <SuggestedQuestions session={session} onAsk={onShowConversation} />
        </>
      )}
    </div>
  );
}
