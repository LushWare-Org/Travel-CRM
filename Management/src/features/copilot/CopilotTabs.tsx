import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopilotSurface from "./CopilotSurface";

export type CopilotTab = "insights" | "conversation";

/** Stable ids: the shell focuses the active one on open, and the drawer on show. */
export const COPILOT_TAB_IDS: Record<CopilotTab, string> = {
  insights: "copilot-tab-insights",
  conversation: "copilot-tab-conversation",
};

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
 * **The tab IS the panel title.** Neither panel renders a second heading: a tab
 * that says "Insights" above a heading that says "Insights" states one thing
 * twice, and the tab is the element that actually selects what is shown. Nothing
 * lost its name — Base UI already points each tabpanel's `aria-labelledby` at its
 * own tab (verified in the DOM: it resolves to "Insights" / "Copilot").
 *
 * **Full width, `variant="default".** The track spans the panel and the triggers
 * split it evenly, so the strip reads as the panel's title bar rather than a small
 * control in a corner. The accent on the active tab is a *state*, which
 * `DESIGN.md` sanctions for active nav/tab state; it is not a second action.
 *
 * **Height, and the offset above it.** `TabsList` is `{control.default}` (32px) by
 * default and sizes the pill from its own box, which leaves the pill 25px. This
 * strip raises the track to `h-10` (pill 33px) and offsets it `mt-6`, so the pills
 * sit on the page heading's own line — measured pills at 28 against the heading at
 * 26, where flush against the viewport edge the strip read as cramped.
 *
 * Two things about that height. The override repeats the primitive's
 * `group-data-horizontal/tabs:` prefix on purpose: a plain `h-10` loses to it,
 * because the primitive's rule is a variant selector and `tailwind-merge` does not
 * see the two as one group. And the trigger must carry NO `min-h` — the track's
 * `p-[3px]` sizes the pill from itself, and a `min-h-[44px]` trigger overflowed the
 * box by 3px, which was invisible only while the active tab was an underline.
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
      data-copilot-tabs=""
      className="min-h-0 flex-1 gap-0"
    >
      <TabsList
        variant="default"
        className="mt-6 shrink-0 w-full px-4 group-data-horizontal/tabs:h-10"
      >
        <TabsTrigger id={COPILOT_TAB_IDS.insights} value="insights">
          Insights
        </TabsTrigger>
        <TabsTrigger id={COPILOT_TAB_IDS.conversation} value="conversation">
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
