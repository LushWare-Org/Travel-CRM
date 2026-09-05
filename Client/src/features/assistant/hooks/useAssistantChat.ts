import { useState } from 'react';
import { sendAssistantTurn } from '../../../services/api/assistantTurn';
import type { AssistantTurnMessageT, AssistantTurnResultT } from '../../../services/api/assistantTurn';
import { sendAssistantEvent } from '../../../services/api/assistantEvents';
import type { AssistantEventPayload } from '../../../services/api/assistantEvents';
import { getEnabledAssistantRoutes } from '../../../config/assistantRoutes';

// Sliding window resent to the stateless assistant-service each turn — same
// reasoning as useTripWizard's MAX_SENT_MESSAGES. Older turns still show in
// the widget transcript; only the most recent 20 go as model context.
const MAX_SENT_MESSAGES = 20;
// Matches the server's content.max(2000) on both wire schemas (assistant.schema.js,
// assistantTurn.ts) — clamped here (not just via the input's maxLength) so a
// paste that bypasses the input attribute can never enter React state as a
// message that would fail validation on every later resend (/ship red-team:
// an unsendable message stuck in the sliding window bricks the session).
const MAX_MESSAGE_LENGTH = 2000;
const ASSISTANT_SESSION_KEY = 'travel-crm.assistantSessionId';

// Distinct from the trip-planning assistant's fallback — this widget talks to
// the phase-1 site-wide assistant-service, not the planner wizard.
const ASSISTANT_ERROR_MESSAGE = 'Failed to reach the assistant. Please try again.';

export interface AssistantSnippet {
  docId: string;
  title: string;
  quote: string;
}

// Server-resolved, deterministic per-turn data the widget renders under the
// assistant bubble. Never derived from raw model args: a navigate chip only
// exists when the server resolved the requested route against the allowlist
// the client sent (serverResult.route/path non-null); the model never authors
// policy text, so a no-match FAQ turn carries the server's fallback message.
export type AssistantTurnData =
  | { tool: 'navigate'; route: string; path: string }
  | { tool: 'navigate'; route: null; path: null }
  | { tool: 'answer_faq_policy'; answered: true; snippets: AssistantSnippet[] }
  | { tool: 'answer_faq_policy'; answered: false; fallbackMessage: string };

export interface AssistantTurnView {
  assistantMessageId: string;
  data: AssistantTurnData;
}

// A stable per-browser session id, persisted so a page reload resumes the
// same session instead of forking a brand-new anonymous identity on the
// telemetry side. Falls back to a fresh id if localStorage is unavailable
// (privacy mode / opaque origin) — the widget still works, just without
// cross-reload identity. Mirrors useTripWizard's loadOrCreateSessionId.
function loadOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(ASSISTANT_SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ASSISTANT_SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

// Every message gets a stable id (assigned once, never regenerated on a
// resent sliding-window slice) and an `at` timestamp, so the server can diff
// a resent window against what the client already showed.
function createMessage(role: 'user' | 'assistant', content: string): AssistantTurnMessageT {
  return { id: crypto.randomUUID(), role, content, at: new Date().toISOString() };
}

function fireEvent(sessionId: string, eventType: AssistantEventPayload['eventType'], tool: AssistantEventPayload['tool'], route: string | null) {
  const payload: AssistantEventPayload = { sessionId, eventType, tool, route };
  void sendAssistantEvent(payload);
}

function deriveTurnData(result: AssistantTurnResultT): AssistantTurnData {
  const serverResult = result.serverResult as
    | { answered?: unknown; snippets?: unknown; fallbackMessage?: unknown; route?: unknown; path?: unknown }
    | null
    | undefined;

  if (result.toolCall.tool === 'navigate') {
    const route = typeof serverResult?.route === 'string' ? serverResult.route : null;
    const path = typeof serverResult?.path === 'string' ? serverResult.path : null;
    if (route && path) return { tool: 'navigate', route, path };
    // Model picked a route the client never offered (or the server declined
    // it) — nothing executable to render, the bubble text carries the reply.
    return { tool: 'navigate', route: null, path: null };
  }

  if (serverResult?.answered === true) {
    const snippets = (Array.isArray(serverResult.snippets) ? serverResult.snippets : []) as AssistantSnippet[];
    return { tool: 'answer_faq_policy', answered: true, snippets };
  }

  const fallbackMessage = typeof serverResult?.fallbackMessage === 'string' ? serverResult.fallbackMessage : '';
  return { tool: 'answer_faq_policy', answered: false, fallbackMessage };
}

export function useAssistantChat() {
  const [sessionId] = useState(loadOrCreateSessionId);
  const [messages, setMessages] = useState<AssistantTurnMessageT[]>([]);
  // One view per successful assistant reply, joined to the assistant message
  // by id — nav chips/FAQ text from earlier turns stay rendered even after a
  // later turn errors (they are static client-side data by then).
  const [turns, setTurns] = useState<AssistantTurnView[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async (text: string) => {
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed || isSending) return;
    const userMessage = createMessage('user', trimmed);
    const nextMessages = [...messages, userMessage].slice(-MAX_SENT_MESSAGES);

    setMessages((prev) => [...prev, userMessage]);
    setError('');
    setIsSending(true);
    fireEvent(sessionId, 'turn', null, null);

    try {
      const result = await sendAssistantTurn({
        sessionId,
        messages: nextMessages,
        availableRoutes: getEnabledAssistantRoutes(),
      });
      // Defense-in-depth: the server now guarantees a non-empty,
      // length-capped message (never-empty + MAX_MESSAGE_LENGTH guard in
      // assistant.controller.js), but never store an empty or oversized
      // bubble here either — content.min(1)/.max(2000) would otherwise
      // reject it on every later resend and brick the session (/ship
      // red-team + Claude adversarial review).
      const assistantMessage = createMessage('assistant', (result.message || '...').slice(0, MAX_MESSAGE_LENGTH));
      setMessages((prev) => [...prev, assistantMessage]);
      setTurns((prev) => [...prev, { assistantMessageId: assistantMessage.id, data: deriveTurnData(result) }]);
      const route = result.toolCall.tool === 'navigate' ? ((result.toolCall.args.route as string | undefined) ?? null) : null;
      fireEvent(sessionId, 'response', result.toolCall.tool, route);
    } catch {
      setError(ASSISTANT_ERROR_MESSAGE);
      fireEvent(sessionId, 'error', null, null);
    } finally {
      setIsSending(false);
    }
  };

  return { messages, turns, sessionId, isSending, error, sendMessage };
}
