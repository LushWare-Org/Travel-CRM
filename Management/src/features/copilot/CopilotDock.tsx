import type { ReactNode } from "react";
import CopilotSurface from "./CopilotSurface";

type CopilotDockProps = {
  children: ReactNode;
  labelledBy?: string;
};

/**
 * The persistent desktop dock. A layout column, never `position: fixed`: the
 * record keeps its own scroll and the dock is 388px at wider desktop sizes,
 * 360px at 1280–1439px. The composer inside is sticky to the `CopilotSurface`
 * scrollport, not to the viewport.
 */
export default function CopilotDock({ children, labelledBy }: CopilotDockProps) {
  return (
    <aside
      {...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": "Copilot" })}
      data-copilot-surface="dock"
      className="sticky top-0 hidden h-dvh w-[360px] shrink-0 flex-col border-l border-border bg-card min-[1440px]:w-[388px] xl:flex"
    >
      <CopilotSurface className="px-4 py-4 scroll-pb-24">{children}</CopilotSurface>
    </aside>
  );
}
