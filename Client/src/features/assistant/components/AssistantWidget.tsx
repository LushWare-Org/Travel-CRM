import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Loader2, Send, User, X } from 'lucide-react';
import { useAssistantChat } from '../hooks/useAssistantChat';
import type { AssistantTurnData } from '../hooks/useAssistantChat';
import type { AssistantTurnMessageT } from '../../../services/api/assistantTurn';
import { sendAssistantEvent } from '../../../services/api/assistantEvents';
import { ASSISTANT_PANEL_BOTTOM_OFFSET_PX } from '../../../config/floatingActions';
import { isAssistantExcludedPath } from '../../../config/assistantRoutes';
import { setAssistantLauncherOpen, useAssistantLauncherOpen } from '../../../components/shared/floating-actions/assistantLauncherState';

const routeLabel = (route: string): string => route.charAt(0).toUpperCase() + route.slice(1);

const GREETING =
  "Hi! I'm the site assistant — ask me to take you to a page, or ask a question about our policies.";

const PANEL_CLASS =
  'pointer-events-auto w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-floating';
const CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50';
const SEND_BUTTON_CLASS =
  'w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600';
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
 * Site-wide floating assistant chat PANEL (Phase 1: navigation + FAQ/policy
 * answers). Mounted once in AppContent — deliberately OUTSIDE the route
 * Suspense boundary so lazy page loads never unmount/remount it and re-fire
 * impression telemetry.
 *
 * Phase 1 collapse: the widget no longer renders its own launcher button.
 * The single bottom-right launcher (FloatingActionStack, rendered by
 * MainLayout) owns that anchor and opens this panel through the shared
 * assistantLauncherState store; this component only renders the chat panel,
 * floating just above the launcher anchor (ASSISTANT_PANEL_BOTTOM_OFFSET_PX),
 * while the store is open on a route where the assistant is not excluded.
 * Self-exclusion and close-on-excluded-route are unchanged.
 */
export default function AssistantWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const chat = useAssistantChat();
  const isOpen = useAssistantLauncherOpen();
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
  // below, since it's mounted unconditionally in App.tsx), so the store's
  // open state would otherwise survive a visit to /planner or /login and
  // silently pop the panel back open on return (found in /ship's Claude
  // adversarial review). Close it the moment the route becomes excluded.
  useEffect(() => {
    if (isAssistantExcludedPath(location.pathname)) {
      setAssistantLauncherOpen(false);
    }
  }, [location.pathname]);

  // The launcher no longer lives here (Phase 1), so "user opened the
  // assistant" is now the store's false→true transition instead of a local
  // button click — but the telemetry contract is unchanged: one `opened`
  // event per widget mount, however many times the panel is later
  // closed/reopened. Guarded on the excluded route too: a panel that cannot
  // render (it returns null there) must not fire the event either.
  useEffect(() => {
    if (isOpen && !openedEventFired.current && !isAssistantExcludedPath(location.pathname)) {
      openedEventFired.current = true;
      void sendAssistantEvent({ sessionId: chat.sessionId, eventType: 'opened', tool: null, route: null });
    }
  }, [isOpen, location.pathname, chat.sessionId]);

  // Client-side navigation only: the widget's own router executes the
  // resolved path, and the route name the server validated goes as
  // telemetry. Declared before the early returns below — every hook call
  // must run unconditionally on every render, or a live transition into an
  // excluded route (this callback would otherwise be skipped) throws
  // "Rendered fewer hooks than expected" (caught by this file's own test
  // suite when it started exercising that transition).
  const handleChipClick = useCallback(
    (route: string, path: string) => {
      void sendAssistantEvent({ sessionId: chat.sessionId, eventType: 'nav_click', tool: 'navigate', route });
      navigate(path);
    },
    [chat.sessionId, navigate],
  );

  if (isAssistantExcludedPath(location.pathname)) return null;
  if (!isOpen) return null;

  const handleClose = () => setAssistantLauncherOpen(false);

  const handleSend = () => {
    const text = input;
    setInput('');
    void chat.sendMessage(text);
  };

  return (
    <div
      className="fixed right-3 z-floating-action pointer-events-none"
      style={{ bottom: `${ASSISTANT_PANEL_BOTTOM_OFFSET_PX}px` }}
    >
      <div role="dialog" aria-label="Travel assistant panel" className={PANEL_CLASS}>
        <div className="flex items-center justify-between gap-2 bg-brand-800 px-4 py-3 text-white">
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
    </div>
  );
}
