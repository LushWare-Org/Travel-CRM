import type { ReactNode } from "react";
import ManagementContextCopilot, { type CopilotSectionApi } from "./ManagementContextCopilot";
import CollectionInsights from "./CollectionInsights";

/**
 * The one-line mount for a collection-scoped page.
 *
 * Two things this owns that every page would otherwise get wrong:
 *
 * 1. **The layout.** `CopilotDock` is a flex column (`sticky top-0 w-[360px]
 *    shrink-0`), not `position: fixed`. It only sits *beside* content if its
 *    parent is a two-column grid. Dropping the copilot into a plain block
 *    container makes it a full-width block above the page on wide screens —
 *    which is exactly the bug the first `/billing` mount shipped with.
 *    `PageCopilot` therefore renders the content column AND the dock column as
 *    siblings inside the grid, so a page cannot get it wrong.
 *
 * 2. **The feature gate.** Off by default, and a page whose key is not in the
 *    server allowlist answers 404 — which the session treats as "feature off
 *    for this page", so the rail renders nothing rather than an error. That is
 *    why this stays mounted on every page instead of being conditionally
 *    imported per page.
 *
 * 3. **The bottom exclusion.** At `xl`+ a collapsed panel floats a labeled
 *    trigger over the bottom-right of the content column. The column therefore
 *    reserves 72px (the trigger's height plus its offset) so no interactive row
 *    action or tab control sits under it at 1280, 1366 or 1439px.
 *
 * Usage:
 *   <PageCopilot pageKey="overview" scopeLabel="Overview">
 *     ...existing page content...
 *   </PageCopilot>
 */
type PageCopilotProps = {
  pageKey: string;
  scopeLabel: string;
  /** Page filter state, when the page has any. v1 sends `{}` (the default view). */
  scope?: Record<string, unknown>;
  /**
   * The insights block to render in the dock. Defaults to the collection panel; a
   * record-scoped page passes its own, since it swaps between the two.
   */
  renderInsights?: (api: CopilotSectionApi) => ReactNode;
  children: ReactNode;
};

export default function PageCopilot({
  pageKey,
  scopeLabel,
  scope = {},
  renderInsights,
  children,
}: PageCopilotProps) {
  const enabled = import.meta.env.VITE_MANAGEMENT_COPILOT_ENABLED === "true";

  if (!enabled) return <>{children}</>;

  return (
    <div className="grid grid-cols-1 items-start xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 xl:pb-[72px]">{children}</div>
      <ManagementContextCopilot pageKey={pageKey} scope={scope} scopeLabel={scopeLabel}>
        {(api) =>
          renderInsights ? (
            renderInsights(api)
          ) : (
            <CollectionInsights session={api.session} scopeLabel={scopeLabel} onCollapse={api.collapse} />
          )
        }
      </ManagementContextCopilot>
    </div>
  );
}
