import { Button } from "@/components/ui/button";
import ClaimItem from "./ClaimItem";
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
 * `Management/DESIGN.md` documents this row as `claim-row`: an unpadded row
 * separated from the next by a hairline, severity carried by the marker and the
 * text weight rather than a colour tint, and no container.
 */
export default function InsightRow({ claim, sources, announce, ranked = false, onChatAbout }: InsightRowProps) {
  const why = ranked ? whyThis(claim) : null;

  return (
    <div
      data-copilot-item
      data-copilot-item-id={claim.key ?? claim.id}
      {...(ranked ? { "data-copilot-band": claim.severity, "data-copilot-score": claim.score ?? 0 } : {})}
      className="py-2 border-b border-border/40 last:border-0 min-h-[44px]"
    >
      <ClaimItem claim={claim} sources={sources} announce={announce} />
      {why && <p className="text-xs text-muted-foreground mt-1">Why now: {why}</p>}
      {onChatAbout && (
        <Button
          variant="ghost"
          size="xs"
          className="mt-1 h-auto px-0 text-xs text-primary"
          onClick={() => onChatAbout(claim)}
        >
          Chat about this
        </Button>
      )}
    </div>
  );
}
