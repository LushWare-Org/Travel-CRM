import { useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearEvidencePreview,
  clearEvidenceReveal,
  evidenceFieldPath,
  pinEvidence,
  previewEvidence,
  resolveEvidenceTarget,
} from "./evidence";
import { useIsDesktopDock } from "./useMediaQuery";
import type { CopilotSource } from "./types";

type EvidenceActionProps = {
  evidenceIds: string[];
  sources: CopilotSource[];
  /** Announces the outcome through the surface's polite live region. */
  announce: (message: string) => void;
};

function formatTimestamp(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatCapturedValue(value: CopilotSource["capturedValue"]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : String(value);
  return value;
}

/**
 * The inline evidence action every grounded claim renders.
 *
 * At `xl` and wider, where the record is live beside the dock, activation
 * reveals and focuses the supporting field. Below `xl` — or whenever no target
 * is rendered — the same action opens the inline evidence detail instead, so a
 * claim is never a dead control.
 */
export default function EvidenceAction({ evidenceIds, sources, announce }: EvidenceActionProps) {
  const isDesktop = useIsDesktopDock();
  const [detailOpen, setDetailOpen] = useState(false);
  const buttonRef = useRef<HTMLElement | null>(null);

  if (evidenceIds.length === 0) return null;

  // The reveal target is the record anchor, not the `sources` entry: the
  // deterministic phase ships cited evidence ids but no `sources`, and every
  // claim that cites an allowlisted field must still reveal it. Enrich from
  // `sources` when present; otherwise derive the field from the cited id.
  const source = evidenceIds.map((id) => sources.find((candidate) => candidate.id === id)).find(Boolean) ?? null;
  const fieldPath = source?.target?.fieldPaths?.[0] ?? evidenceFieldPath(evidenceIds[0]);
  const sourceLabel = source?.label ?? (fieldPath ? `Lead ${fieldPath}` : null);
  const captured = source ? formatCapturedValue(source.capturedValue) : null;
  const timestamp = source ? formatTimestamp(source.updatedAt) : null;

  // Unresolvable: no source metadata and no id that names a field.
  if (!sourceLabel) {
    return <p className="text-xs text-muted-foreground">Source unavailable</p>;
  }

  const openDetail = () => {
    setDetailOpen(true);
    announce(`Evidence detail for ${sourceLabel}`);
  };

  const activate = () => {
    if (isDesktop && pinEvidence(evidenceIds)) {
      announce(`Revealed ${sourceLabel} in the lead record`);
      return;
    }
    openDetail();
  };

  const preview = () => {
    if (isDesktop) previewEvidence(evidenceIds);
  };

  const endPreview = () => {
    const previewed = resolveEvidenceTarget(evidenceIds);
    const focusInsideTarget = previewed != null && previewed.contains(document.activeElement);
    if (!focusInsideTarget && !buttonRef.current?.contains(document.activeElement)) clearEvidencePreview();
  };

  return (
    <div className="mt-1.5">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="xs"
        className="gap-1 text-xs text-primary hover:text-primary"
        onClick={activate}
        onPointerEnter={preview}
        onPointerLeave={endPreview}
        onFocus={preview}
        onBlur={() => {
          // The pinned highlight is owned by the reveal and cleared when focus
          // leaves the record target — focusing that target blurs this button.
          clearEvidencePreview();
        }}
        aria-label={`Evidence: ${sourceLabel}`}
        aria-expanded={detailOpen || undefined}
      >
        <Crosshair className="h-3 w-3" aria-hidden="true" />
        {sourceLabel}
      </Button>

      {detailOpen && (
        <div
          role="region"
          aria-label="Evidence detail"
          className="mt-1.5 space-y-1 rounded-md border border-border bg-muted/40 px-2.5 py-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
          <dl className="space-y-0.5 text-xs">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="text-foreground">{sourceLabel}</dd>
            </div>
            {fieldPath && (
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground">Field</dt>
                <dd className="font-mono tabular-nums text-foreground">{fieldPath}</dd>
              </div>
            )}
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="font-mono tabular-nums text-foreground">{timestamp ?? "not recorded"}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Value</dt>
              <dd className="font-mono tabular-nums text-foreground">{captured ?? "not captured"}</dd>
            </div>
          </dl>
          <Button type="button" variant="ghost" size="xs" onClick={() => setDetailOpen(false)}>
            Close evidence
          </Button>
        </div>
      )}
    </div>
  );
}
