import { useEffect, useRef, useState } from "react";
import { ClipboardList, Loader2, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClaimItem from "./ClaimItem";
import { SuggestedQuestions, claimsIn } from "./insightShared";
import { LiveStatus, useAnnouncer } from "./Announcer";
import type { ClaimSection, CopilotClaim, CopilotSession } from "./types";

type CollectionInsightsProps = {
  session: CopilotSession;
  scopeLabel: string;
  onCollapse?: () => void;
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

/**
 * The one or two scored inputs that put this item where it is, in plain words.
 *
 * Every value comes from the server: this reads the flattened score components
 * rather than recomputing or reinterpreting them, so the line explains the
 * server's ordering and cannot contradict it.
 */
function whyThis(claim: CopilotClaim): string | null {
  const scored: Array<{ value: number | undefined; label: string }> = [
    { value: claim.urgency, label: "time-sensitive" },
    { value: claim.novelty, label: "new" },
    { value: claim.confidence, label: "well-evidenced" },
    { value: claim.actionability, label: "actionable" },
  ];
  const strong = scored
    .filter((entry): entry is { value: number; label: string } => typeof entry.value === "number" && entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((entry) => entry.label);
  return strong.length > 0 ? strong.join(", ") : null;
}

function formatMoment(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

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

export default function CollectionInsights({ session, scopeLabel, onCollapse }: CollectionInsightsProps) {
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
  const [renderedClaims, setRenderedClaims] = useState<CopilotClaim[]>(session.claims);
  const [queuedClaims, setQueuedClaims] = useState<CopilotClaim[] | null>(null);
  // Expansion is a viewport state, and it must not survive a scope change: an
  // expanded list on the next page would show items the operator never asked for
  // and cannot tell apart from the default view.
  const [showAllRanked, setShowAllRanked] = useState(false);
  const rankedHead = session.ranked[0]?.key ?? session.ranked[0]?.id ?? null;

  useEffect(() => {
    setShowAllRanked(false);
  }, [rankedHead]);

  useEffect(() => {
    if (session.claims === renderedClaims) return;
    const region = claimsRegionRef.current;
    const focused = typeof document !== "undefined" ? document.activeElement : null;
    const focusInside = Boolean(region && focused && focused !== document.body && region.contains(focused));
    if (focusInside) {
      setQueuedClaims(session.claims);
      announce("Updated insights ready");
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

  // Ranked rendering is the DETERMINISTIC path. Model claims carry no score, so
  // they keep the sectioned rendering: their order is the model's, and presenting
  // them as ranked would be an explanation the server never produced.
  //
  // The fallback is deliberate during rollout: a server that predates the ranking,
  // or one that sent an empty `ranked`, renders exactly as before.
  const ranked = session.ranked;
  const showRanked = !modelClaimsShown && ranked.length > 0;
  const visibleRanked = showAllRanked ? ranked : ranked.slice(0, RANKED_INITIAL);

  const moment = formatMoment(modelClaimsShown ? session.context?.generatedAt : session.context?.asOf);
  const momentLabel = modelClaimsShown ? "Generated" : "Checked";
  const hasAnyClaim = renderedClaims.length > 0;

  useEffect(() => {
    if (session.noAccess) announce("You don't have access to this page's data.");
    else if (session.context?.partial) {
      if (session.context.notAuthorizedSources && session.context.notAuthorizedSources.length > 0) announce("Some data is outside your role");
      else announce(`Partially loaded - ${session.context.unavailableSources?.length || 0} sources unavailable`);
    } else if (session.error || session.modelPartial) announce("The summary couldn't be generated.");
  }, [session.noAccess, session.context?.partial, session.error, session.modelPartial, announce, session.context]);

  return (
    <section aria-labelledby="copilot-insights-heading" data-copilot-panel="collection" className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h2 id="copilot-insights-heading" tabIndex={-1} className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Insights
          </h2>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCollapse}
              aria-label="Collapse copilot"
              className="shrink-0 min-h-[44px] min-w-[44px]"
            >
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        <p className="text-sm text-foreground">{scopeLabel}</p>
        {moment && (
          <p className="text-xs text-muted-foreground">
            {momentLabel} <span className="font-mono tabular-nums">{moment}</span>
          </p>
        )}
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

          {showRanked ? (
            // SERVER ORDER, rendered as received. Nothing here re-sorts: the band
            // ordering and the score inside a band are the ranking, and a client
            // that re-sorted would quietly replace it with its own opinion.
            <div ref={claimsRegionRef} data-copilot-ranked>
              {visibleRanked.map((claim) => {
                const why = whyThis(claim);
                return (
                  <div
                    key={claim.key ?? claim.id}
                    data-copilot-item
                    data-copilot-item-id={claim.key ?? claim.id}
                    data-copilot-band={claim.severity}
                    data-copilot-score={claim.score ?? 0}
                    className="py-2 border-b border-border/40 last:border-0 min-h-[44px]"
                  >
                    <ClaimItem claim={claim} sources={session.sources} announce={announce} />
                    {why && <p className="text-xs text-muted-foreground mt-1">Why now: {why}</p>}
                  </div>
                );
              })}
              {ranked.length > RANKED_INITIAL && !showAllRanked && (
                <Button
                  data-copilot-show-more
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto justify-start text-sm text-primary"
                  onClick={() => setShowAllRanked(true)}
                >
                  Show {ranked.length - RANKED_INITIAL} more
                </Button>
              )}
            </div>
          ) : (
          <div ref={claimsRegionRef}>
            {SECTION_ORDER.map((sectionId) => {
              const claims = claimsIn(renderedClaims, sectionId);
              if (claims.length === 0) return null;
              return (
                <section key={sectionId} aria-labelledby={`heading-${sectionId}`} className="mb-6 last:mb-0">
                  <h3 id={`heading-${sectionId}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 pb-1 border-b border-border/50">
                    {SECTION_LABELS[sectionId]}
                  </h3>
                  <div className="space-y-0">
                    {claims.map((claim) => (
                      <div key={claim.id} className="py-2 border-b border-border/40 last:border-0 min-h-[44px]">
                        <ClaimItem claim={claim} sources={session.sources} announce={announce} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          )}

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

          <SuggestedQuestions session={session} />
        </>
      )}
    </section>
  );
}
