import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { z } from 'zod';
import type { AssistantAction, AssistantCurrentView, AssistantPageContext } from '@travel-crm/contracts';

/**
 * One action the page can execute against its own state. Derived from the shared
 * contract, so the page cannot register an ability the server does not know how
 * to name, and the runner cannot hand it an action shape the contract rejects.
 */
export type AssistantPageAction = z.infer<typeof AssistantAction>['tool'];

export type AssistantActionPayload = z.infer<typeof AssistantAction>;

/**
 * What a mounted page tells the assistant about itself.
 *
 * `revision` is the page's IDENTITY, not its content: `planner`, or
 * `customize:<packageId>`. The server echoes it on any page action and the
 * runner refuses a mismatch, which is what stops a turn composed against one
 * package's customize page from executing on another's — the package swap
 * mid-turn is the case this exists for. Content changes (a new day, a new date)
 * deliberately do NOT change it: they are the actions' own subject matter, and a
 * revision that moved on every keystroke would refuse every action.
 *
 * This is the permission boundary the design puts on the client: the assistant
 * may only do what the page said, this turn, that it can do.
 */
export type AssistantPageContextValue = z.infer<typeof AssistantPageContext>;

/**
 * What the page reports about what is on screen — the counts a question about
 * the screen is answered from. Separate from the action registration on purpose:
 * a page that can count is not thereby a page that can be changed, and every page
 * gets a baseline report from the widget whether or not it registers anything.
 */
export type AssistantCurrentViewValue = z.infer<typeof AssistantCurrentView>;

export interface AssistantPageRegistration {
  surface: AssistantPageContextValue['surface'];
  revision: string;
  pageContext: AssistantPageContextValue;
  actions: AssistantPageAction[];
  /** Executes the action against the page and resolves to a line for the transcript ('' says nothing). */
  runAction: (action: AssistantActionPayload) => Promise<string>;
}

interface AssistantCapabilityStore {
  /** Read by the widget when a turn is SENT, never during render. */
  get: () => AssistantPageRegistration | null;
  set: (registration: AssistantPageRegistration | null) => void;
  /** The mounted page's own report of what is on screen, read at send time too. */
  getView: () => AssistantCurrentViewValue | null;
  setView: (view: AssistantCurrentViewValue | null) => void;
}

const AssistantCapabilityContext = createContext<AssistantCapabilityStore | null>(null);

/**
 * Holds one page's action registration, deliberately OUTSIDE React state.
 *
 * A registration is a callback over live page state, so a page rebuilds it
 * whenever that state changes — and storing each rebuild in state would re-render
 * every consumer, including the pages that re-register each render, which is a
 * render loop. A ref has none of that: the widget reads it at send time, which
 * is also the only moment the value matters, and the read is therefore never
 * stale (the alternative — capturing it during render — misses a page that
 * mounted after the widget last rendered).
 */
export function AssistantCapabilityProvider({ children }: { children: ReactNode }) {
  const registration = useRef<AssistantPageRegistration | null>(null);
  const currentView = useRef<AssistantCurrentViewValue | null>(null);

  const store = useMemo<AssistantCapabilityStore>(
    () => ({
      get: () => registration.current,
      set: (next) => {
        registration.current = next;
      },
      getView: () => currentView.current,
      setView: (next) => {
        currentView.current = next;
      },
    }),
    [],
  );

  return <AssistantCapabilityContext.Provider value={store}>{children}</AssistantCapabilityContext.Provider>;
}

/** The store's getter. Call it when a turn is sent, not while rendering. */
export function useAssistantCapabilities(): () => AssistantPageRegistration | null {
  const store = useContext(AssistantCapabilityContext);
  if (!store) throw new Error('useAssistantCapabilities must be used inside AssistantCapabilityProvider');
  return store.get;
}

/**
 * Registers a page's action surface for as long as it is mounted. Unregistering
 * on unmount is not tidiness: a registration that outlived its page would let a
 * turn execute against state that is no longer on screen.
 *
 * The caller passes a freshly built registration whenever its state changes; the
 * effect re-registers, which is a ref assignment and no re-render.
 */
export function useAssistantPageRegistration(registration: AssistantPageRegistration | null): void {
  const store = useContext(AssistantCapabilityContext);
  if (!store) throw new Error('useAssistantPageRegistration must be used inside AssistantCapabilityProvider');

  useEffect(() => {
    store.set(registration);
    return () => store.set(null);
  }, [store, registration]);
}

/**
 * The view store's getter, for the same reason the action one is a getter.
 *
 * Unlike the action pair, this one does NOT throw when the provider is absent:
 * the report is a baseline every page contributes to, and a page rendered without
 * the provider — an isolated test, an embedded widget — must not fail for the
 * want of a nice-to-have. The action hooks keep throwing, because there the
 * absence is a wiring mistake with a permission consequence.
 */
export function useAssistantCurrentView(): () => AssistantCurrentViewValue | null {
  const store = useContext(AssistantCapabilityContext);
  return store?.getView ?? (() => null);
}

/**
 * Reports what this page has on screen, from the page's own numbers, for as long
 * as it is mounted. The widget sends the baseline path and query parameters; a
 * page that can count adds the counts on top, which is what makes "how many are
 * under 1000" answerable from the screen rather than from the page's previous
 * state.
 */
export function useAssistantViewReport(view: AssistantCurrentViewValue | null): void {
  const store = useContext(AssistantCapabilityContext);

  useEffect(() => {
    store?.setView(view);
    return () => store?.setView(null);
  }, [store, view]);
}
