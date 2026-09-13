import { AlertTriangle, OctagonAlert } from "lucide-react";
import EvidenceAction from "./EvidenceAction";
import type { CopilotClaim, CopilotSource } from "./types";

type ClaimItemProps = {
  claim: CopilotClaim;
  sources: CopilotSource[];
  announce: (message: string) => void;
};

/**
 * Severity, spelled once: the marker colour, the text weight, the sr-only word,
 * the evidence badge variant, and the spine `InsightRow` draws down the card's
 * leading edge. The spine is a single edge, never an outline - the boundary rule
 * this panel follows allows a fill or an edge, not a box drawn around a box.
 *
 * Exported because the row needs the spine, and severity must not be derived a
 * second time: two mappings drift the moment either one changes.
 */
export function severityStyles(severity: CopilotClaim["severity"]) {
  if (severity === "critical") return { textClass: "font-semibold", markerClass: "text-destructive", label: "Critical", Icon: OctagonAlert, badgeVariant: "destructive" as const, spineClass: "border-l-destructive" };
  if (severity === "warning") return { textClass: "font-medium", markerClass: "text-warning", label: "Warning", Icon: AlertTriangle, badgeVariant: "warning" as const, spineClass: "border-l-warning" };
  return { textClass: "font-normal", markerClass: "text-foreground", label: "Information", Icon: null, badgeVariant: "muted" as const, spineClass: "border-l-border" };
}

/**
 * One grounded claim: sentence-length prose, its typed facts in the data face,
 * and — when it cites evidence — the inline action that reveals that evidence.
 * Semantic status is always carried by text and icon, never color alone.
 */
export default function ClaimItem({ claim, sources, announce }: ClaimItemProps) {
  const { textClass, markerClass, label, Icon, badgeVariant } = severityStyles(claim.severity);

  return (
    <div className="space-y-1">
      <p className={`text-sm leading-relaxed text-foreground ${textClass}`}>
        {Icon && (
          <>
            <Icon className={`mr-1.5 inline h-3.5 w-3.5 align-text-bottom ${markerClass}`} aria-hidden="true" />
            <span className="sr-only">{label}: </span>
          </>
        )}
        {claim.text}
      </p>

      {claim.facts.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {claim.facts.map((fact, index) => (
            <span
              key={`${fact.evidenceId}-${index}`}
              className="font-mono text-xs tabular-nums text-muted-foreground"
              title={fact.kind}
            >
              {fact.value}
            </span>
          ))}
        </div>
      )}

      <EvidenceAction evidenceIds={claim.evidenceIds} sources={sources} announce={announce} badgeVariant={badgeVariant} />
    </div>
  );
}
