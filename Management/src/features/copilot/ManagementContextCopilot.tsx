import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { useCopilotSession } from "./useCopilotSession";
import { useCopilotVisibility } from "./useCopilotVisibility";
import { useIsDesktopDock } from "./useMediaQuery";
import CopilotDock from "./CopilotDock";
import CopilotDrawer from "./CopilotDrawer";
import CopilotRail from "./CopilotRail";
import CopilotTrigger from "./CopilotTrigger";
import CopilotConversation from "./CopilotConversation";
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
  /**
   * The page-owned briefing, hosted by the shared shell. The conversation that
   * follows it is the shell's own, so every page key has the chat.
   */
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
 * responsive surface, the panel's single scroll container, and the conversation
 * — which therefore renders on every page key, including `/leads` with no row
 * selected, without any page wiring it.
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
  const { ready, visibility, cueDismissed, setVisibility, dismissCue } = useCopilotVisibility(actorId, pageKey);
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

  // Opening the panel from either desktop control lands focus on the element
  // that names the region, exactly as the drawer's `initialFocus` does. Without
  // the rule a keyboard operator presses the trigger, the panel appears
  // elsewhere in the tab order, and they must traverse the page to reach what
  // they just opened. The dock is not a dialog, so the move is explicit and
  // runs on the commit that mounts it — never before the heading exists.
  const focusOnExpandRef = useRef(false);
  const expand = useCallback(() => {
    focusOnExpandRef.current = true;
    setVisibility("open");
  }, [setVisibility]);

  useEffect(() => {
    if (!dockOpen || !focusOnExpandRef.current) return;
    focusOnExpandRef.current = false;
    document.getElementById(BRIEFING_HEADING_ID)?.focus();
  }, [dockOpen]);

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

  // The panel's two children, in reading order: the page-owned briefing first,
  // then one hairline, then the shell's conversation, whose composer sticks to
  // `CopilotSurface`'s scrollport.
  const body = (
    <>
      {content}
      <CopilotConversation session={session} scopeLabel={scopeLabel} />
    </>
  );

  return (
    <>
      {dockOpen && <CopilotDock labelledBy={BRIEFING_HEADING_ID}>{body}</CopilotDock>}

      {isDesktop && !dockOpen && (
        <>
          <CopilotRail onExpand={expand} hasAttention={session.hasAttention} />
          {/*
            The rail is the page's layout edge; the floating trigger is the
            discoverable one. The two controls perform the same action, so they
            carry distinct accessible names (`Expand copilot panel` vs
            `Open copilot`) — never two controls with one name on a viewport.
            The content column reserves a 72px bottom exclusion (`PageCopilot`)
            so nothing interactive sits under this control.
          */}
          <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-end">
            <CopilotTrigger hasAttention={session.hasAttention} onClick={expand} />
          </div>
        </>
      )}

      {!isDesktop && (
        <CopilotDrawer
          open={drawerOpen}
          onOpenChange={handleDrawerOpenChange}
          hasAttention={session.hasAttention}
          showCue={showCue}
          onDismissCue={dismissCue}
        >
          {body}
        </CopilotDrawer>
      )}
    </>
  );
}
