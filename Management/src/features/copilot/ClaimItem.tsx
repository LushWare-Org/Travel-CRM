import { AlertTriangle, OctagonAlert } from "lucide-react";
import EvidenceAction from "./EvidenceAction";
import type { CopilotClaim, CopilotSource } from "./types";

type ClaimItemProps = {
  claim: CopilotClaim;
  sources: CopilotSource[];
  announce: (message: string) => void;
};

function severityStyles(severity: CopilotClaim["severity"]) {
  if (severity === "critical") return { className: "text-destructive", label: "Critical", Icon: OctagonAlert };
  if (severity === "warning") return { className: "text-warning", label: "Warning", Icon: AlertTriangle };
  return { className: "text-foreground", label: "Informational", Icon: null };
}

/**
 * One grounded claim: sentence-length prose, its typed facts in the data face,
 * and — when it cites evidence — the inline action that reveals that evidence.
 * Semantic status is always carried by text and icon, never color alone.
 */
export default function ClaimItem({ claim, sources, announce }: ClaimItemProps) {
  const { className, label, Icon } = severityStyles(claim.severity);

  return (
    <div className="space-y-1">
      <p className={`text-base leading-relaxed ${className}`}>
        {Icon && (
          <>
            <Icon className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
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

      <EvidenceAction evidenceIds={claim.evidenceIds} sources={sources} announce={announce} />
    </div>
  );
}
