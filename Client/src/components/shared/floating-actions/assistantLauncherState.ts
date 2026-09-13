import { useSyncExternalStore } from 'react';

/**
 * Cross-subtree open state for the site-wide assistant panel.
 *
 * The Phase 1 launcher lives in FloatingActionStack (rendered by MainLayout
 * on every routed page) while the assistant's chat panel lives in
 * AssistantWidget (mounted once in App.tsx, deliberately OUTSIDE the route
 * Suspense boundary so lazy page loads never unmount/remount it and re-fire
 * impression telemetry). Those two subtrees share no React ancestor that
 * could own the panel's open state as a prop, so the state lives here as a
 * tiny module singleton read via useSyncExternalStore — the React-idiomatic
 * way for two always-mounted subtrees to observe one boolean without a
 * context provider wrapping the whole app or prop-drilling across App.tsx.
 *
 * Contract: only the launcher sets it to true (its "Travel Assistant" menu
 * item); AssistantWidget renders the panel while it is true, closes itself
 * (sets it back to false) on its own X button and on excluded routes, and
 * the launcher closes it when the launcher itself is hidden (marketing
 * pages above the scroll threshold must never show the panel floating over
 * the hero with no anchor beneath it).
 */

let isOpen = false;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return isOpen;
}

/** Setter used by the launcher and AssistantWidget. No-ops when unchanged. */
export function setAssistantLauncherOpen(next: boolean): void {
  if (isOpen === next) return;
  isOpen = next;
  listeners.forEach((listener) => listener());
}

/** Read-only accessor for tests and non-React callers. */
export function getAssistantLauncherOpen(): boolean {
  return isOpen;
}

/** Reactive open state for React components (useSyncExternalStore). */
export function useAssistantLauncherOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
