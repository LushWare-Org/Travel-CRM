import type { ReactNode } from "react";

type CopilotDockProps = {
  children: ReactNode;
};

/**
 * The persistent desktop dock. A layout column, never `position: fixed`: the
 * record keeps its own scroll and the dock is 388px at wider desktop sizes,
 * 360px at 1280–1439px.
 *
 * It no longer renders `CopilotSurface` itself. The surface moved into the tab
 * panels (`CopilotTabs`) because one scroller shared by two panels cannot hold
 * two scroll offsets. This element stays a flex column so the tabs fill it and
 * the panel's surface remains the constrained scroller; the composer inside is
 * sticky to that scrollport, never to the viewport.
 *
 * Named `Copilot`, not after whichever tab is showing: this element holds both
 * of them, so a name taken from one would misdescribe it. The drawer's dialog
 * carries the same name.
 */
export default function CopilotDock({ children }: CopilotDockProps) {
  return (
    <aside
      aria-label="Copilot"
      data-copilot-surface="dock"
      className="sticky top-0 hidden h-dvh w-[360px] shrink-0 flex-col border-l border-border bg-card min-[1440px]:w-[388px] xl:flex"
    >
      {children}
    </aside>
  );
}
