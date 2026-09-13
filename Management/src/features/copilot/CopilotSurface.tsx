import type { ReactNode } from "react";

type CopilotSurfaceProps = {
  children: ReactNode;
  /** Caller-owned spacing (padding, scroll padding). The scroll contract stays here. */
  className?: string;
};

/**
 * The panel's single scroll container, owned here so the dock and the drawer
 * cannot drift apart. Both callers wrap it in their own positioning element and
 * hand in only their padding via `className`.
 *
 * Two properties make this the wrap contract rather than a cosmetic fix:
 *
 * - `overflow-wrap: anywhere` is the load-bearing choice, and it must be
 *   `anywhere`, not `break-word`. Per CSS Text 3, only `anywhere` makes the
 *   soft-wrap opportunities count toward the element's min-content intrinsic
 *   size, which is what lets a flex child shrink below the length of its
 *   longest token. `break-word` breaks the line without changing min-content,
 *   so it fixes the visual overflow and leaves the scroll axis alive.
 *   `overflow-wrap` is inherited, so declaring it once here covers claim prose,
 *   questions, fact values, source labels, and evidence detail.
 * - `overflow-x-hidden` is the assertion, not the fix. It states that panel
 *   width is a layout invariant. Wrap alone leaves the axis available for the
 *   next unanticipated child; clip alone hides content. The pair is required.
 *
 * `relative` is load-bearing too, not decoration: this element is where the
 * clipping happens, and without a positioning context the absolutely positioned
 * `sr-only` labels deep inside the insights resolve against the sticky `<aside>`
 * instead. They then escape this element's clip and stretch the app shell's
 * scrollable area by ~1900px, so the page scrolls past its content into blank
 * space whenever the panel is open.
 */
export default function CopilotSurface({ children, className }: CopilotSurfaceProps) {
  return (
    <div
      data-copilot-surface="surface"
      className={`relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [overflow-wrap:anywhere] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
