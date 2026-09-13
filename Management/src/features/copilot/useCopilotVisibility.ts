import { useCallback, useEffect, useState } from "react";

// Keyed by page key as well as actor. The design decision is "auto-open once per
// page key per operator, then honour the persisted collapsed state": a record
// scope has a notion of a first visit, a collection scope does not, so an
// actor-global key would auto-open exactly once ever and nine pages would never
// announce that the insights exist there. Collapsing on one page therefore no
// longer silences the others — that is the intended discovery behaviour, not a
// regression.
//
// Changing the key shape orphans any previously stored value, so every operator
// sees one extra discovery pass. Harmless (the entries are a few bytes) and not
// worth a migration.
export const COPILOT_STORAGE_PREFIX = "management-copilot:v1";

export function visibilityKey(actorId: string, pageKey: string): string {
  return `${COPILOT_STORAGE_PREFIX}:${actorId}:${pageKey}:visibility`;
}

export function mobileCueKey(actorId: string, pageKey: string): string {
  return `${COPILOT_STORAGE_PREFIX}:${actorId}:${pageKey}:mobile-cue-dismissed`;
}

export type CopilotVisibility = "open" | "collapsed";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, quota) — the session still works */
  }
}

export type UseCopilotVisibility = {
  /** False until the authenticated identity is known: nothing is read or written. */
  ready: boolean;
  /** The stored preference, or null before the first discovery. */
  visibility: CopilotVisibility | null;
  cueDismissed: boolean;
  setVisibility: (value: CopilotVisibility) => void;
  dismissCue: () => void;
};

export function useCopilotVisibility(actorId: string | null | undefined, pageKey: string): UseCopilotVisibility {
  const [visibility, setVisibilityState] = useState<CopilotVisibility | null>(null);
  const [cueDismissed, setCueDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!actorId) {
      setVisibilityState(null);
      setCueDismissed(false);
      setReady(false);
      return;
    }
    const stored = read(visibilityKey(actorId, pageKey));
    setVisibilityState(stored === "open" || stored === "collapsed" ? stored : null);
    setCueDismissed(read(mobileCueKey(actorId, pageKey)) === "true");
    setReady(true);
  }, [actorId, pageKey]);

  const setVisibility = useCallback(
    (value: CopilotVisibility) => {
      if (!actorId) return;
      write(visibilityKey(actorId, pageKey), value);
      setVisibilityState(value);
    },
    [actorId, pageKey]
  );

  const dismissCue = useCallback(() => {
    if (!actorId) return;
    write(mobileCueKey(actorId, pageKey), "true");
    setCueDismissed(true);
  }, [actorId, pageKey]);

  return { ready, visibility, cueDismissed, setVisibility, dismissCue };
}
