import type { ReactNode } from "react";

type CopilotDockProps = {
  children: ReactNode;
  labelledBy?: string;
};

/**
 * The persistent desktop dock. A layout column, never `position: fixed`: the
 * record keeps its own scroll and the dock is 388px at wider desktop sizes,
 * 360px at 1280–1439px. The composer inside is sticky to this column, not to
 * the viewport.
 */
export default function CopilotDock({ children, labelledBy }: CopilotDockProps) {
  return (
    <aside
      {...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": "Copilot" })}
      data-copilot-surface="dock"
      className="sticky top-0 hidden h-dvh w-[360px] shrink-0 flex-col border-l border-border bg-card min-[1440px]:w-[388px] xl:flex"
    >
      {/*
        `relative` is load-bearing, not decoration: this scroller is the dock's
        only scroll container, and without a positioning context the absolutely
        positioned `sr-only` labels deep inside the briefing resolve against the
        sticky <aside> instead. They then escape this element's clip and stretch
        the app shell's scrollable area by ~1900px, so the page scrolls past its
        content into blank space whenever the dock is open.
      */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 scroll-pb-24">
        {children}
      </div>
    </aside>
  );
}
