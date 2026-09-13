import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import InsightRow from "./InsightRow";
import type { InsightBucket } from "./insightShared";
import type { ClaimSection, CopilotClaim, CopilotSource } from "./types";

type InsightListProps = {
  /** Already ordered by `sectionBuckets`; this component does not re-group. */
  buckets: InsightBucket[];
  /** Each panel owns its own heading text; only the mechanism is shared. */
  labels: Record<ClaimSection, string>;
  sources: CopilotSource[];
  announce: (message: string) => void;
  ranked?: boolean;
  /** Rows the viewport cap held back. Zero renders no control. */
  hiddenCount?: number;
  onShowMore?: () => void;
  /** Absent hides the per-row affordance entirely. */
  onChatAbout?: (claim: CopilotClaim) => void;
};

const CRITICAL_LABEL = "Critical";

const HEADING_CLASS = "text-xs font-semibold uppercase tracking-wide mb-1 pb-1 border-b border-border/50";

/**
 * The findings list, rendered from `sectionBuckets`.
 *
 * **The critical band is a severity level, not a fifth category.** It keeps the
 * section heading's *shape* — same type role, same rule, same spacing — and
 * differs in its *content*: the destructive token plus a warning icon, which is
 * the icon-plus-word treatment `ClaimItem` already applies to severity and the
 * rail marker already uses for attention. Drawing it as an identical heading
 * would make `CRITICAL` read as another kind of finding, which is the opposite of
 * hoisting it above them. That is why the two groupings can share one list
 * without one being mistaken for the other.
 *
 * Nothing here re-sorts. The bucket order comes from `sectionBuckets`, whose
 * within-section order comes from `claimsIn`, whose ordering is the server's.
 */
export default function InsightList({
  buckets,
  labels,
  sources,
  announce,
  ranked = false,
  hiddenCount = 0,
  onShowMore,
  onChatAbout,
}: InsightListProps) {
  return (
    <>
      {buckets.map((bucket) => {
        const key = bucket.kind === "critical" ? "critical" : bucket.section;
        const label = bucket.kind === "critical" ? CRITICAL_LABEL : labels[bucket.section];
        const isCritical = bucket.kind === "critical";

        return (
          <section
            key={key}
            data-copilot-bucket={key}
            aria-labelledby={`heading-${key}`}
            className="mb-6 last:mb-0"
          >
            <h3
              id={`heading-${key}`}
              className={
                isCritical
                  ? `flex items-center gap-1.5 text-destructive ${HEADING_CLASS}`
                  : `text-muted-foreground ${HEADING_CLASS}`
              }
            >
              {isCritical && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              {label}
            </h3>
            <div className="space-y-0">
              {bucket.claims.map((claim) => (
                <InsightRow
                  key={claim.key ?? claim.id}
                  claim={claim}
                  sources={sources}
                  announce={announce}
                  ranked={ranked}
                  onChatAbout={onChatAbout}
                />
              ))}
            </div>
          </section>
        );
      })}

      {onShowMore && hiddenCount > 0 && (
        <Button
          data-copilot-show-more
          variant="ghost"
          size="sm"
          className="mt-1 h-auto justify-start text-sm text-primary"
          onClick={onShowMore}
        >
          Show {hiddenCount} more
        </Button>
      )}
    </>
  );
}
