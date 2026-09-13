import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { deriveScopeKey, useCopilotSession } from "./useCopilotSession";
import { useCopilotVisibility } from "./useCopilotVisibility";
import { useIsDesktopDock } from "./useMediaQuery";
import CopilotDock from "./CopilotDock";
import CopilotDrawer from "./CopilotDrawer";
import CopilotRail from "./CopilotRail";
import CopilotTrigger from "./CopilotTrigger";
import CopilotConversation from "./CopilotConversation";
import CopilotTabs, { COPILOT_TAB_IDS, type CopilotTab } from "./CopilotTabs";
import type { CopilotSession, CopilotScope, SinceWindow } from "./types";

export type CopilotSectionApi = {
  session: CopilotSession;
  /** Whether the session body is currently presented (dock or open drawer). */
  open: boolean;
  scopeLabel: string;
  /** Collapse the persistent dock. Undefined below `xl`, where the drawer closes instead. */
  collapse?: () => void;
  /**
   * Bring the conversation forward.
   *
   * Threaded to each panel so attaching a finding raises the conversation. The
   * findings list owns the reading; the tab that answers questions owns the
   * asking, so nothing is submitted from a tab the operator is not looking at.
   */
  showConversation: () => void;
};

type ManagementContextCopilotProps = {
  pageKey: string;
  scope: CopilotScope | null;
  /** Client-only display label for the active scope. */
  scopeLabel: string;
  since?: SinceWindow;
  /**
   * The page-owned insights block, hosted by the shared shell. The conversation that
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

  const [activeTab, setActiveTab] = useState<CopilotTab>("insights");
  const showConversation = useCallback(() => setActiveTab("conversation"), []);

  // Acknowledgement follows PRESENTATION, not the surface merely being open. With
  // the Copilot tab active a result would otherwise be marked seen while hidden,
  // and the next visit's "since you were here" would silently lose it.
  const insightsPresented = surfaceOpen && activeTab === "insights";

  const session = useCopilotSession(scope, since, { pageKey, open: surfaceOpen, insightsPresented });

  // A scope change resets the view. The transcript is already cleared by the
  // scope key, so a kept tab would land the operator on an empty conversation
  // and hide the new lead's findings — the same rule first-open already follows
  // at `xl`. Keyed on the derived scope rather than on the session object so the
  // reset cannot fire on an unrelated session identity change.
  const activeScopeKey = deriveScopeKey(scope);
  useEffect(() => {
    setActiveTab("insights");
  }, [activeScopeKey]);

  // Closed until the operator opens it. There is no first-visit auto-open: the
  // rail and the floating trigger are the only things that expand the dock, and
  // a stored preference is the only thing that keeps it open across visits.
  const collapse = useCallback(() => setVisibility("collapsed"), [setVisibility]);

  // Opening the panel from either desktop control lands focus on the element
  // that names the region, exactly as the drawer's `initialFocus` does. The tab
  // names the panel now that no heading sits inside it, and it is the ACTIVE tab
  // that names what is on screen — so the target is derived, not a fixed id.
  // Without the rule a keyboard operator presses the trigger, the panel appears
  // elsewhere in the tab order, and they must traverse the page to reach what
  // they just opened. The dock is not a dialog, so the move is explicit and
  // runs on the commit that mounts it — never before the tab exists.
  const activeTabId = COPILOT_TAB_IDS[activeTab];
  const focusOnExpandRef = useRef(false);
  const expand = useCallback(() => {
    focusOnExpandRef.current = true;
    setVisibility("open");
  }, [setVisibility]);

  useEffect(() => {
    if (!dockOpen || !focusOnExpandRef.current) return;
    focusOnExpandRef.current = false;
    document.getElementById(activeTabId)?.focus();
  }, [dockOpen, activeTabId]);

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
    showConversation,
  });

  // Findings and conversation stop competing for one scroll column. Each tab
  // panel owns its own `CopilotSurface`, so the two keep independent scroll
  // positions across a switch.
  const body = (
    <CopilotTabs
      insights={content}
      conversation={<CopilotConversation session={session} scopeLabel={scopeLabel} />}
      active={activeTab}
      onActiveChange={setActiveTab}
      pending={session.asking}
    />
  );

  return (
    <>
      {dockOpen && <CopilotDock>{body}</CopilotDock>}

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
          initialFocusId={activeTabId}
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
