import { vi } from 'vitest';
import type { CopilotClaim, CopilotSession, CopilotSource } from '../types';

/** Pin the viewport so `useMediaQuery`/`mediaQueryMatches` are deterministic. */
export function setViewport({ desktop = false, reducedMotion = false } = {}) {
  window.matchMedia = ((query: string) => {
    const matches = query.includes('prefers-reduced-motion')
      ? reducedMotion
      : query.includes('1280px')
        ? desktop
        : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
}

export function claim(overrides: Partial<CopilotClaim> = {}): CopilotClaim {
  return {
    id: 'claim-1',
    section: 'current_state',
    text: 'The lead is in drafting.',
    facts: [],
    evidenceIds: [],
    evidenceType: 'record',
    severity: 'info',
    ...overrides,
  };
}

export function source(overrides: Partial<CopilotSource> = {}): CopilotSource {
  return {
    id: 'lead:a:destination',
    label: 'Destination',
    type: 'record',
    updatedAt: '2026-09-10T09:00:00.000Z',
    target: { kind: 'lead', id: 'a', fieldPaths: ['destination'] },
    capturedValue: 'Lisbon',
    ...overrides,
  };
}

/** A complete session surface so sections can be tested without the transport. */
export function makeSession(overrides: Partial<CopilotSession> = {}): CopilotSession {
  return {
    unsupported: false, leadId: 'a',
    hasScope: true,
    loading: false,
    error: null,
    context: {
      pageKey: 'leads',
      scopeLabel: 'Alice Traveller',
      asOf: '2026-09-10T10:00:00.000Z',
      generatedAt: '2026-09-10T10:05:00.000Z',
      partial: false,
      noAccess: false,
    },
    claims: [],
    provisional: false,
    modelPending: false,
    modelPartial: false,
    ready: true,
    noAccess: false,
    sources: [],
    suggestedQuestions: [],
    hasAttention: false,
    generatedWhileOpen: true,
    turns: [],
    asking: false,
    input: '',
    canAsk: true,
    setInput: vi.fn(),
    submit: vi.fn(),
    retryTurn: vi.fn(),
    retryBriefing: vi.fn(),
    retryDeterministic: vi.fn(),
    ...overrides,
  };
}

/**
 * A record field that publishes the evidence anchor the adapter cites. It is
 * programmatically focusable exactly like the real LeadDetailPane field.
 */
export function evidenceTarget(evidenceId: string, options: { hidden?: boolean; display?: boolean; text?: string } = {}) {
  const element = document.createElement('div');
  element.setAttribute('data-copilot-evidence-id', evidenceId);
  element.setAttribute('tabindex', '-1');
  element.textContent = options.text ?? 'Lisbon';
  if (options.hidden) element.style.visibility = 'hidden';
  if (options.display === false) element.style.display = 'none';
  document.body.appendChild(element);
  return element;
}
