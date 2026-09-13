import { useState } from 'react';
import { sendAssistantTurn } from '../../../services/api/assistantTurn';
import type { AssistantTurnMessageT, AssistantTurnResultT } from '../../../services/api/assistantTurn';
import { sendAssistantEvent } from '../../../services/api/assistantEvents';
import type { AssistantEventPayload } from '../../../services/api/assistantEvents';
import { getEnabledAssistantRoutes } from '../../../config/assistantRoutes';
import { loadAssistantParamValues } from '../assistantParamValues';

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

/**
 * Where a handoff sends the visitor. The server resolves the kind — and, for a
 * booking, which package — and the client builds the URL from it, because URL
 * shape is the client's to own. That is the same split as the package card
 * below, which builds `/package/<id>` here rather than being handed one.
 */
export type AssistantHandoff =
  | { kind: 'booking'; packageId: string; title: string }
  | { kind: 'human' };

/**
 * How far a booking request got. The server owns this entirely — the model
 * reports what it read and nothing else — so the widget only decides whether to
 * offer the one-tap confirmation. `needs_details` deliberately renders nothing:
 * a status the client did not recognise must never look like a confirmation.
 */
export interface AssistantBooking {
  status: 'needs_details' | 'awaiting_confirmation' | 'submitted';
  missing?: string[];
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
  | { tool: 'answer_faq_policy'; answered: false; fallbackMessage: string }
  | { tool: 'answer_packages'; packages: AssistantPackageCard[] }
  | { tool: 'hand_off'; handoff: AssistantHandoff }
  | { tool: 'request_booking'; booking: AssistantBooking }
  | { tool: 'respond_conversationally'; mode: 'social' | 'travel_general' | 'capability' }
  | { tool: 'redirect_off_topic'; redirected: true };

/**
 * One package the assistant answered about, rendered under the reply as a card
 * with a link. The `id` is only ever used to build that link — it is a uuid and
 * is never shown to the visitor.
 */
export interface AssistantPackageCard {
  id: string;
  title: string;
  destination: string;
  durationDays: number;
  price: number;
  currency: string;
  rating: number;
  numReviews: number;
}

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

function fireEvent(
  sessionId: string,
  turnId: string | null,
  eventType: AssistantEventPayload['eventType'],
  tool: AssistantEventPayload['tool'],
  route: string | null,
) {
  const payload: AssistantEventPayload = { sessionId, turnId, eventType, tool, route };
  void sendAssistantEvent(payload);
}

function deriveTurnData(result: AssistantTurnResultT): AssistantTurnData {
  const serverResult = result.serverResult as
    | {
        answered?: unknown;
        snippets?: unknown;
        fallbackMessage?: unknown;
        route?: unknown;
        path?: unknown;
        mode?: unknown;
        redirected?: unknown;
        packages?: unknown;
        present?: unknown;
        handoff?: unknown;
        booking?: unknown;
      }
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

  if (result.toolCall.tool === 'respond_conversationally') {
    // Preserved rather than collapsed: the server distinguishes the two
    // self-authored modes, and narrowing either to social here would throw
    // away the only signal the widget has about which one it answered with.
    const raw = serverResult?.mode;
    const mode = raw === 'travel_general' || raw === 'capability' ? raw : 'social';
    return { tool: 'respond_conversationally', mode };
  }

  if (result.toolCall.tool === 'redirect_off_topic') {
    return { tool: 'redirect_off_topic', redirected: true };
  }

  if (result.toolCall.tool === 'answer_packages') {
    const packages = (Array.isArray(serverResult?.packages) ? serverResult.packages : [])
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .filter((entry) => typeof entry.id === 'string' && entry.id && typeof entry.title === 'string' && entry.title)
      .map((entry) => ({
        id: entry.id as string,
        title: entry.title as string,
        destination: typeof entry.destination === 'string' ? entry.destination : '',
        durationDays: Number(entry.durationDays) || 0,
        price: Number(entry.price) || 0,
        currency: typeof entry.currency === 'string' && entry.currency ? entry.currency : 'USD',
        rating: Number(entry.rating) || 0,
        numReviews: Number(entry.numReviews) || 0,
      }));

    // Every package answer carries the records it was about; whether a card is
    // drawn is the server's call, made from what the visitor has already been
    // shown. So an empty card list is the ordinary "nothing to draw this turn"
    // outcome and must not render a panel — only the first introduction of a
    // package, or an explicit request to see one, draws a card.
    if (serverResult?.present !== true) return { tool: 'answer_packages', packages: [] };

    if (packages.length) return { tool: 'answer_packages', packages };

    // Presenting with nothing renderable is a malformed payload rather than a
    // deliberate empty, so it degrades to the server's own fallback line.
    return {
      tool: 'answer_faq_policy',
      answered: false,
      fallbackMessage: typeof serverResult?.fallbackMessage === 'string' ? serverResult.fallbackMessage : '',
    };
  }

  if (result.toolCall.tool === 'hand_off') {
    const raw = serverResult?.handoff;
    const entry = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    if (entry?.kind === 'booking' && typeof entry.packageId === 'string' && entry.packageId) {
      return {
        tool: 'hand_off',
        handoff: {
          kind: 'booking',
          packageId: entry.packageId,
          title: typeof entry.title === 'string' ? entry.title : '',
        },
      };
    }
    // Everything else is a handoff to a person. `human` is what the server
    // falls back to whenever it cannot book, so an unrecognised payload still
    // renders the one chip that always works rather than nothing at all.
    return { tool: 'hand_off', handoff: { kind: 'human' } };
  }

  if (result.toolCall.tool === 'request_booking') {
    const raw = serverResult?.booking;
    const entry = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    const status = entry?.status;
    if (status === 'awaiting_confirmation' || status === 'submitted') {
      return { tool: 'request_booking', booking: { status } };
    }
    // Everything else means the server still needs something. That renders no
    // chip, so an unrecognised status is inert rather than an invitation to
    // send a booking.
    return {
      tool: 'request_booking',
      booking: {
        status: 'needs_details',
        missing: Array.isArray(entry?.missing) ? entry.missing.filter((key) => typeof key === 'string') : undefined,
      },
    };
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
    fireEvent(sessionId, userMessage.id, 'turn', null, null);

    try {
      // Loaded before the turn because the server checks the destination the
      // model chose against it. Never throws and is memoized for the visit, so
      // this is one request per visit rather than one per message.
      const paramValues = await loadAssistantParamValues();
      const availableRoutes = getEnabledAssistantRoutes().map((route) =>
        paramValues[route.name] ? { ...route, paramValues: paramValues[route.name] } : route,
      );
      // Which cards this session has already drawn. Read from `turns` rather
      // than tracked separately: an entry carries packages exactly when a card
      // was drawn for it, so the two cannot disagree. The server needs it
      // because a package the visitor has already seen is not re-presented.
      const shownPackageIds = turns.flatMap((turn) =>
        turn.data.tool === 'answer_packages' ? turn.data.packages.map((pkg) => pkg.id) : [],
      );
      const result = await sendAssistantTurn({
        sessionId,
        messages: nextMessages,
        availableRoutes,
        shownPackageIds,
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
      fireEvent(sessionId, userMessage.id, 'response', result.toolCall.tool, route);
    } catch {
      setError(ASSISTANT_ERROR_MESSAGE);
      fireEvent(sessionId, userMessage.id, 'error', null, null);
    } finally {
      setIsSending(false);
    }
  };

  return { messages, turns, sessionId, isSending, error, sendMessage };
}
