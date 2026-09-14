import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ClaimItem, { severityStyles } from "./ClaimItem";
import type { CopilotClaim, CopilotSource } from "./types";

type InsightRowProps = {
  claim: CopilotClaim;
  sources: CopilotSource[];
  announce: (message: string) => void;
  /**
   * The row came from the ranked source. Ranking metadata travels with the
   * ranking, so only these rows publish it: a model claim carries no score, and
   * emitting `0` would assert a ranking the server never produced.
   */
  ranked?: boolean;
  /**
   * The surface-owned primary action. Copilot panels pass none; the business
   * notification surface passes its View action.
   */
  primaryAction?: { label: string; onClick: () => void };
  /**
   * Present only when the session can actually ask. Absent hides the affordance
   * entirely rather than offering it and failing.
   */
  onChatAbout?: (claim: CopilotClaim) => void;
};

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

/**
 * One finding, whatever produced it.
 *
 * One row shape serves both sources, which is what stops the list redrawing
 * itself when the model phase settles. Before this existed the ranked branch and
 * the sectioned branch each carried their own inline wrapper, and only the ranked
 * one published `data-copilot-item` — so the same finding was two different
 * objects depending on which phase happened to be showing.
 *
 * `Management/DESIGN.md` documents this row as `insight-row`, which is `claim-row`
 * plus the box: a fill and a single-edge severity spine, never an outline, with
 * the row's own affordances gathered into one footer. `claim-row` itself is the
 * answer transcript's shape (`ClaimItem`), and it stays unboxed.
 */
export default function InsightRow({ claim, sources, announce, ranked = false, primaryAction, onChatAbout }: InsightRowProps) {
  const why = ranked ? whyThis(claim) : null;
  const { spineClass } = severityStyles(claim.severity);

  return (
    <div
      data-copilot-item
      data-copilot-item-id={claim.key ?? claim.id}
      {...(ranked ? { "data-copilot-band": claim.severity, "data-copilot-score": claim.score ?? 0 } : {})}
      className={cn("rounded-lg border-l-4 bg-foreground/10 px-3 py-2 min-h-[44px]", spineClass)}
    >
      <ClaimItem claim={claim} sources={sources} announce={announce} />
      {(primaryAction || why || onChatAbout) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {primaryAction && (
            <Button variant="outline" size="xs" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {why && <p className="text-xs text-muted-foreground">Why now: {why}</p>}
          {onChatAbout && (
            <Button
              variant="ghost"
              size="xs"
              className="h-auto px-0 text-xs text-primary"
              onClick={() => onChatAbout(claim)}
            >
              Chat about this
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
