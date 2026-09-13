import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopilotSurface from "./CopilotSurface";

export type CopilotTab = "insights" | "conversation";

type CopilotTabsProps = {
  insights: ReactNode;
  conversation: ReactNode;
  active: CopilotTab;
  onActiveChange: (tab: CopilotTab) => void;
  /** The operator's own turn is in flight. Never a count of server-owned state. */
  pending?: boolean;
};

/**
 * The panel's two tabs, and the owner of its scrollers.
 *
 * **Why the surface moved here.** `CopilotSurface` used to be rendered once by
 * `CopilotDock` and once by `CopilotDrawer`, wrapping both tabs at once. One
 * scroller behind two panels cannot hold two scroll offsets, so switching tabs
 * would have thrown away where the operator was reading. Each panel now owns its
 * own surface, and the dock and drawer pass children straight through. That is
 * why `CopilotSurface.test.tsx` asserts "every scroller IS a CopilotSurface"
 * rather than "there is exactly one".
 *
 * **Why both panels stay mounted.** `keepMounted` keeps the inactive panel in the
 * DOM so its scroll position and the composer's content survive a switch. Base UI
 * renders it with `hidden`, so it takes no layout space. The cost is that the
 * hidden panel re-renders on every composer keystroke, which is why the bucket
 * computation is memoized at the call site.
 *
 * **The variant is `line`, not `default`.** The filled pill would put a permanent
 * solid accent block at the top of a 360px panel, competing with the composer for
 * the panel's single strongest treatment. `DESIGN.md` sanctions the accent for
 * active tabs, so both are permitted; the underline keeps it for action.
 */
export default function CopilotTabs({
  insights,
  conversation,
  active,
  onActiveChange,
  pending = false,
}: CopilotTabsProps) {
  return (
    <Tabs
      value={active}
      onValueChange={(value) => onActiveChange(value as CopilotTab)}
      className="min-h-0 flex-1 gap-0"
    >
      <TabsList variant="line" className="shrink-0 px-4 pt-2">
        <TabsTrigger value="insights" className="min-h-[44px]">
          Insights
        </TabsTrigger>
        <TabsTrigger value="conversation" className="min-h-[44px]">
          Copilot
          {pending && (
            <>
              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              <span className="sr-only">, answering now</span>
            </>
          )}
        </TabsTrigger>
      </TabsList>

      {/*
        Each panel is a flex column with a bounded height so the surface inside
        stays the scroller. If any link in that chain loses `min-h-0`, the
        surface's `flex-1` goes inert, the panel grows to fit its content, and the
        sticky composer stops sticking — silently.
      */}
      <TabsContent value="insights" keepMounted className="flex min-h-0 flex-1 flex-col">
        <CopilotSurface className="px-4 py-4 scroll-pb-24">{insights}</CopilotSurface>
      </TabsContent>

      <TabsContent value="conversation" keepMounted className="flex min-h-0 flex-1 flex-col">
        <CopilotSurface className="px-4 py-4 scroll-pb-24">{conversation}</CopilotSurface>
      </TabsContent>
    </Tabs>
  );
}
