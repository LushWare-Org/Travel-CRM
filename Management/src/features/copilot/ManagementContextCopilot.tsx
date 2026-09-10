import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { useCopilotSession } from "./useCopilotSession";
import { useCopilotVisibility } from "./useCopilotVisibility";
import { useIsDesktopDock } from "./useMediaQuery";
import CopilotDock from "./CopilotDock";
import CopilotDrawer from "./CopilotDrawer";
import CopilotRail from "./CopilotRail";
import type { CopilotSession, CopilotScope, SinceWindow } from "./types";

const BRIEFING_HEADING_ID = "copilot-briefing-heading";

export type CopilotSectionApi = {
  session: CopilotSession;
  /** Whether the session body is currently presented (dock or open drawer). */
  open: boolean;
  scopeLabel: string;
  /** Collapse the persistent dock. Undefined below `xl`, where the drawer closes instead. */
  collapse?: () => void;
};

type ManagementContextCopilotProps = {
  pageKey: string;
  scope: CopilotScope | null;
  /** Client-only display label for the active scope. */
  scopeLabel: string;
  since?: SinceWindow;
  /** Page-specific briefing and conversation sections, hosted by the shared shell. */
  children: (api: CopilotSectionApi) => ReactNode;
};

/** The operator's stable internal id — never email or display name. */
// eslint-disable-next-line react-refresh/only-export-components
export function actorIdOf(user: unknown): string | null {
  const candidate = user as { _id?: unknown; id?: unknown } | null | undefined;
  const raw = candidate?._id ?? candidate?.id;
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

/**
 * The reusable copilot shell: scope/session ownership, persisted visibility, the
 * responsive surface, and the page-specific sections handed in as children.
 *
 * Landing a second workspace therefore means supplying six page-owned pieces —
 * not copying this shell:
 *   1. a typed, strict, nullable page scope (`CopilotScope` is this page's);
 *   2. an authenticated server adapter for the page key;
 *   3. field-level evidence ids plus the record targets that publish them;
 *   4. page-specific deterministic insights and suggested questions;
 *   5. rendered record anchors and complete empty/error/access states; and
 *   6. the scope-switch, stale-response, responsive, and accessibility tests.
 */
export default function ManagementContextCopilot({
  pageKey,
  scope,
  scopeLabel,
  since = "last_visit",
  children,
}: ManagementContextCopilotProps) {
  const auth = useOptionalAuth();
  const actorId = actorIdOf(auth?.user);
  const isDesktop = useIsDesktopDock();
  const { ready, visibility, cueDismissed, setVisibility, dismissCue } = useCopilotVisibility(actorId);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Until the identity resolves nothing is read or written: the dock renders as
  // a collapsed rail and the drawer keeps an unlatched local state.
  const dockOpen = isDesktop && ready && visibility === "open";
  const surfaceOpen = isDesktop ? dockOpen : drawerOpen;

  const session = useCopilotSession(scope, since, { pageKey, open: surfaceOpen });

  // Discovery: the first valid lead opens the dock once, only at `xl` and wider.
  // No-lead visits do not count, and a stored choice is never overridden.
  useEffect(() => {
    if (!isDesktop || !ready || visibility !== null) return;
    if (!session.hasScope) return;
    setVisibility("open");
  }, [isDesktop, ready, visibility, session.hasScope, setVisibility]);

  const collapse = useCallback(() => setVisibility("collapsed"), [setVisibility]);
  const expand = useCallback(() => setVisibility("open"), [setVisibility]);

  const handleDrawerOpenChange = useCallback(
    (next: boolean) => {
      setDrawerOpen(next);
      if (next && ready) {
        setVisibility("open");
        dismissCue();
      }
    },
    [ready, setVisibility, dismissCue]
  );

  const showCue = !isDesktop && ready && !cueDismissed && session.ready;

  const content = children({
    session,
    open: surfaceOpen,
    scopeLabel,
    collapse: isDesktop && dockOpen ? collapse : undefined,
  });

  return (
    <>
      {dockOpen && (
        <CopilotDock labelledBy={BRIEFING_HEADING_ID}>{content}</CopilotDock>
      )}

      {isDesktop && !dockOpen && <CopilotRail onExpand={expand} hasAttention={session.hasAttention} />}

      {!isDesktop && (
        <CopilotDrawer
          open={drawerOpen}
          onOpenChange={handleDrawerOpenChange}
          hasAttention={session.hasAttention}
          showCue={showCue}
          onDismissCue={dismissCue}
        >
          {content}
        </CopilotDrawer>
      )}
    </>
  );
}
