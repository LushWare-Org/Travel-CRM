import { prefersReducedMotion } from "./useMediaQuery";

// ─── Evidence Lens target resolution ──────────────────────────────────────
// The record surface publishes `data-copilot-evidence-id={leadEvidenceId(id,
// field)}`; the briefing resolves those attributes against the live document.
// Nothing here rebuilds an evidence id: the ids come from the wire result, which
// the adapter produced with the same `leadEvidenceId` helper.
export const EVIDENCE_TARGET_ATTR = "data-copilot-evidence-id";
export const EVIDENCE_PREVIEW_CLASS = "copilot-evidence-preview";
export const EVIDENCE_PINNED_CLASS = "copilot-evidence-pinned";
export const EVIDENCE_TRANSITION_MS = 140;

/**
 * The allowlisted field a cited evidence id refers to
 * (`lead:<leadId>:<field>` -> `<field>`) — the inverse of `leadEvidenceId`.
 * The deterministic phase ships cited ids but no `sources` entries, so the
 * evidence detail derives its field path rather than losing the action.
 */
export function evidenceFieldPath(evidenceId: string): string | null {
  if (typeof evidenceId !== "string") return null;
  const parts = evidenceId.split(":");
  if (parts.length < 3 || parts[0] !== "lead") return null;
  const field = parts.slice(2).join(":");
  return field.length > 0 ? field : null;
}

function escapeAttributeValue(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

/** Rendered means neither `display: none` nor `visibility: hidden`. */
function isRendered(element: HTMLElement): boolean {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return true;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

/**
 * The first matching target that is rendered and not hidden. Off-screen is
 * fine — an off-screen target scrolls into view on activation.
 */
export function resolveEvidenceTarget(evidenceIds: string | string[]): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const ids = Array.isArray(evidenceIds) ? evidenceIds : [evidenceIds];
  for (const id of ids) {
    if (!id) continue;
    const nodes = document.querySelectorAll<HTMLElement>(`[${EVIDENCE_TARGET_ATTR}="${escapeAttributeValue(id)}"]`);
    for (const node of nodes) {
      if (isRendered(node)) return node;
    }
  }
  return null;
}

export function clearEvidencePreview(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`.${EVIDENCE_PREVIEW_CLASS}`).forEach((node) => node.classList.remove(EVIDENCE_PREVIEW_CLASS));
}

let pinnedElement: HTMLElement | null = null;
let pinnedFocusHandler: ((event: FocusEvent) => void) | null = null;

function detachPinnedHandler() {
  if (pinnedFocusHandler && typeof document !== "undefined") {
    document.removeEventListener("focusin", pinnedFocusHandler);
  }
  pinnedFocusHandler = null;
}

/** Clear the pinned highlight (another claim activated, or focus left the target). */
export function clearEvidenceReveal(): void {
  if (pinnedElement) pinnedElement.classList.remove(EVIDENCE_PINNED_CLASS);
  pinnedElement = null;
  detachPinnedHandler();
}

/** Hover/focus preview: a wash, never focus or scroll. */
export function previewEvidence(evidenceIds: string | string[]): HTMLElement | null {
  const target = resolveEvidenceTarget(evidenceIds);
  clearEvidencePreview();
  if (target) target.classList.add(EVIDENCE_PREVIEW_CLASS);
  return target;
}

/** Activation: pin the highlight, focus the field, then scroll it into view. */
export function pinEvidence(evidenceIds: string | string[]): HTMLElement | null {
  const target = resolveEvidenceTarget(evidenceIds);
  clearEvidencePreview();
  clearEvidenceReveal();
  if (!target) return null;

  pinnedElement = target;
  target.classList.add(EVIDENCE_PINNED_CLASS);
  target.focus?.({ preventScroll: true });
  // Reduced motion: no transition and no smooth scroll, the same instant reveal.
  if (prefersReducedMotion()) target.scrollIntoView?.({ block: "center" });
  else target.scrollIntoView?.({ block: "center", behavior: "smooth" });

  pinnedFocusHandler = (event: FocusEvent) => {
    const next = event.target as Node | null;
    if (!next || !target.contains(next)) clearEvidenceReveal();
  };
  if (typeof document !== "undefined") document.addEventListener("focusin", pinnedFocusHandler);
  return target;
}
