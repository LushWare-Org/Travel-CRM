import { useCallback, useEffect, useState } from "react";

// Operator-scoped copilot preferences. Keyed by the authenticated operator's
// stable internal id (never email or display name) so one operator can never
// inherit another's discovery or visibility choice, and never written before
// the identity resolves.
export const COPILOT_STORAGE_PREFIX = "management-copilot:v1";

export function visibilityKey(actorId: string): string {
  return `${COPILOT_STORAGE_PREFIX}:${actorId}:visibility`;
}

export function mobileCueKey(actorId: string): string {
  return `${COPILOT_STORAGE_PREFIX}:${actorId}:mobile-cue-dismissed`;
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

export function useCopilotVisibility(actorId: string | null | undefined): UseCopilotVisibility {
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
    const stored = read(visibilityKey(actorId));
    setVisibilityState(stored === "open" || stored === "collapsed" ? stored : null);
    setCueDismissed(read(mobileCueKey(actorId)) === "true");
    setReady(true);
  }, [actorId]);

  const setVisibility = useCallback(
    (value: CopilotVisibility) => {
      if (!actorId) return;
      write(visibilityKey(actorId), value);
      setVisibilityState(value);
    },
    [actorId]
  );

  const dismissCue = useCallback(() => {
    if (!actorId) return;
    write(mobileCueKey(actorId), "true");
    setCueDismissed(true);
  }, [actorId]);

  return { ready, visibility, cueDismissed, setVisibility, dismissCue };
}
