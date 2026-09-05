import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Loader2, Send, User, X } from 'lucide-react';
import { useAssistantChat } from '../hooks/useAssistantChat';
import type { AssistantTurnData } from '../hooks/useAssistantChat';
import type { AssistantTurnMessageT } from '../../../services/api/assistantTurn';
import { sendAssistantEvent } from '../../../services/api/assistantEvents';
import { ASSISTANT_LAUNCHER_BOTTOM_OFFSET_PX } from '../../../config/floatingActions';

// Routes where the floating assistant deliberately does not mount — exactly
// the design doc's Target User exclusions: /planner owns its own in-tab chat
// surface, /package/:id/customize is the planner-gated conversion funnel the
// widget must not compete with, and /login + /my-account are auth-adjacent.
export const isAssistantExcludedPath = (pathname: string): boolean => {
  // React Router matches "/planner" and "/planner/" identically when
  // resolving which page renders, but this file's own exact-string check
  // didn't — a trailing-slash URL would leave the widget mounted directly
  // over the excluded page it exists to avoid (found in /ship's Codex
  // adversarial review). Normalize before comparing.
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return (
    normalized === '/planner' ||
    /^\/package\/[^/]+\/customize$/.test(normalized) ||
    normalized === '/login' ||
    normalized === '/my-account'
  );
};

const routeLabel = (route: string): string => route.charAt(0).toUpperCase() + route.slice(1);

const GREETING =
  "Hi! I'm the site assistant — ask me to take you to a page, or ask a question about our policies.";

// Bigger and bolder than the icon-only Call/WhatsApp/ScrollTop buttons below
// it in the stack — size and shadow are the priority cue, not an animation.
const LAUNCHER_CLASS =
  'pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-brand-600 to-brand-accent-600 px-6 py-4 text-base font-bold text-white transition-transform hover:scale-105 active:scale-95';
const LAUNCHER_SHADOW = { boxShadow: '0 20px 45px 0 rgba(44, 112, 72, 0.45), 0 8px 20px 0 rgba(0, 0, 0, 0.15)' };
const PANEL_CLASS =
  'pointer-events-auto w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl';
const CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50';
const SEND_BUTTON_CLASS =
  'w-11 h-11 rounded-xl bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white flex items-center justify-center disabled:opacity-50';
const INPUT_CLASS =
  'flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50';

interface AssistantTurnExtrasProps {
  data: AssistantTurnData;
  onNavigate: (route: string, path: string) => void;
}

function AssistantTurnExtras({ data, onNavigate }: AssistantTurnExtrasProps) {
  if (data.tool === 'navigate') {
    if (!data.path) return null;
    return (
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => onNavigate(data.route, data.path)} className={CHIP_CLASS}>
          <ArrowRight className="w-3 h-3" />
          Go to {routeLabel(data.route)}
        </button>
      </div>
    );
  }

  if (data.answered) {
    return (
      <div className="space-y-2 rounded-xl bg-blue-50 px-3 py-2 shadow-sm">
        {data.snippets.map((snippet) => (
          <blockquote key={snippet.docId} className="border-l-4 border-brand-400 pl-3">
            <p className="text-sm text-gray-800">{snippet.quote}</p>
            <cite className="text-xs text-gray-500 not-italic">— {snippet.title}</cite>
          </blockquote>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-blue-50 px-3 py-2 shadow-sm">
      <p className="text-sm text-gray-700">{data.fallbackMessage}</p>
    </div>
  );
}

interface MessageRowProps {
  message: AssistantTurnMessageT;
  turnData: AssistantTurnData | undefined;
  onNavigate: (route: string, path: string) => void;
}

const MessageRow = memo(function MessageRow({ message, turnData, onNavigate }: MessageRowProps) {
  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-2 flex-row-reverse">
        <User className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
        <p className="text-sm bg-brand-600 text-white rounded-xl px-3 py-2 shadow-sm">{message.content}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Bot className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-2">
        <p className="text-sm bg-white rounded-xl px-3 py-2 shadow-sm">{message.content}</p>
        {turnData && <AssistantTurnExtras data={turnData} onNavigate={onNavigate} />}
      </div>
    </div>
  );
});

/**
 * Site-wide floating assistant (Phase 1: navigation + FAQ/policy answers).
 * Mounted once in AppContent — self-excludes by route (see
 * isAssistantExcludedPath), so it can sit unconditionally next to <Routes>.
 *
 * Placement is bottom-RIGHT (`fixed right-3`, same z-floating-action token
 * as FloatingActionStack), stacked as the priority action one step above
 * the existing Call/WhatsApp/ScrollTop stack — never covering it — via
 * ASSISTANT_LAUNCHER_BOTTOM_OFFSET_PX. Sized larger than the stack's icon
 * buttons (bigger padding/text, bolder shadow) so it reads as the primary
 * CTA, not just another item in the list.
 */
export default function AssistantWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const chat = useAssistantChat();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const openedEventFired = useRef(false);
  const mountPathname = useRef(location.pathname);

  const turnByMessageId = useMemo(() => new Map(chat.turns.map((turn) => [turn.assistantMessageId, turn.data])), [chat.turns]);

  // Impression fires exactly once per widget mount, and only when that mount
  // actually renders the widget (mounting on an excluded route renders null).
  useEffect(() => {
    if (!isAssistantExcludedPath(mountPathname.current)) {
      void sendAssistantEvent({ sessionId: chat.sessionId, eventType: 'impression', tool: null, route: null });
    }
  }, [chat.sessionId]);

  // The component never unmounts on an excluded route (it just renders null
  // below, since it's mounted unconditionally in App.tsx), so `isOpen` state
  // would otherwise survive a visit to /planner or /login and silently pop
  // the panel back open on return (found in /ship's Claude adversarial
  // review). Close it the moment the route becomes excluded.
  useEffect(() => {
    if (isAssistantExcludedPath(location.pathname)) setIsOpen(false);
  }, [location.pathname]);

  // Client-side navigation only: the widget's own router executes the
  // resolved path, and the route name the server validated goes as
  // telemetry. Declared before the early return below — every hook call
  // (useCallback included) must run unconditionally on every render, or a
  // live transition into an excluded route (this hook would otherwise be
  // skipped) throws "Rendered fewer hooks than expected" (caught by this
  // file's own test suite when it started exercising that transition).
  const handleChipClick = useCallback(
    (route: string, path: string) => {
      void sendAssistantEvent({ sessionId: chat.sessionId, eventType: 'nav_click', tool: 'navigate', route });
      navigate(path);
    },
    [chat.sessionId, navigate],
  );

  if (isAssistantExcludedPath(location.pathname)) return null;

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !openedEventFired.current) {
      openedEventFired.current = true;
      void sendAssistantEvent({ sessionId: chat.sessionId, eventType: 'opened', tool: null, route: null });
    }
  };

  const handleClose = () => setIsOpen(false);

  const handleSend = () => {
    const text = input;
    setInput('');
    void chat.sendMessage(text);
  };

  return (
    <div
      className="fixed right-3 z-floating-action flex flex-col items-end gap-3 pointer-events-none"
      style={{ bottom: `${ASSISTANT_LAUNCHER_BOTTOM_OFFSET_PX}px` }}
    >
      {isOpen && (
        <div role="dialog" aria-label="Travel assistant panel" className={PANEL_CLASS}>
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-brand-600 to-brand-accent-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Travel Assistant</p>
                <p className="text-xs text-white/80 leading-tight">Navigation help &amp; FAQ answers</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close assistant panel"
              className="rounded-full p-1.5 transition-colors hover:bg-white/20 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3 bg-gray-50 p-4">
            <div className="flex items-start gap-2">
              <Bot className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
              <p className="text-sm bg-white rounded-xl px-3 py-2 shadow-sm">{GREETING}</p>
            </div>
            {chat.messages.map((message) => (
              <MessageRow key={message.id} message={message} turnData={turnByMessageId.get(message.id)} onNavigate={handleChipClick} />
            ))}
            {chat.isSending && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
          </div>

          {chat.error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-700">{chat.error}</p>
            </div>
          )}

          <div className="flex gap-2 border-t border-gray-200 bg-white p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me to help you navigate..."
              maxLength={2000}
              disabled={chat.isSending}
              className={INPUT_CLASS}
            />
            <button type="button" onClick={handleSend} disabled={chat.isSending || !input.trim()} aria-label="Send message" className={SEND_BUTTON_CLASS}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        aria-label="Travel assistant"
        className={LAUNCHER_CLASS}
        style={LAUNCHER_SHADOW}
      >
        <Bot className="w-6 h-6" />
        Ask us
      </button>
    </div>
  );
}
