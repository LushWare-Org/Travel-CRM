import { useState } from 'react';
import { sendWizardTurn } from '../../../services/api/wizardTurn';
import type { WizardState, WizardTurnMessageT } from '../../../services/api/wizardTurn';

export interface WizardPackage {
  id: string;
  title: string;
  destination: string;
  durationDays: number;
  sellPrice: number;
  currency: string;
  coverImage?: string | null;
  rating: number;
  images?: Array<{ url: string }>;
}

export interface PolicyAnswer {
  answered: boolean;
  fallbackMessage?: string;
  supportEmail?: string;
  whatsappNumber?: string;
  snippets?: Array<{ docId: string; title: string; quote: string }>;
}

// Sliding window sent to the backend each turn, same reasoning as
// useItineraryChat's MAX_SENT_MESSAGES.
const MAX_SENT_MESSAGES = 20;
const WIZARD_SESSION_KEY = 'travel-crm.wizardSessionId';

// A stable per-browser-wizard session id, persisted so a page reload resumes
// the same session instead of forking a brand-new lead on the intake side.
// Falls back to a fresh id if localStorage is unavailable (privacy mode /
// opaque origin) — the wizard still works, just without cross-reload identity.
function loadOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(WIZARD_SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(WIZARD_SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

// Every message gets a stable id (assigned once here, never regenerated on a
// resent sliding-window slice) and an `at` timestamp, so package-service can
// diff a resent window and lead-service's intake transcript dedupes per-message.
function createMessage(role: 'user' | 'assistant', content: string): WizardTurnMessageT {
  return { id: crypto.randomUUID(), role, content, at: new Date().toISOString() };
}

export function useTripWizard() {
  const [sessionId] = useState(loadOrCreateSessionId);
  const [messages, setMessages] = useState<WizardTurnMessageT[]>([]);
  const [wizardState, setWizardState] = useState<WizardState>({});
  const [packages, setPackages] = useState<WizardPackage[] | null>(null);
  const [policyAnswer, setPolicyAnswer] = useState<PolicyAnswer | null>(null);
  const [contactPrompt, setContactPrompt] = useState(false);
  const [completedPackage, setCompletedPackage] = useState<WizardPackage | null>(null);
  const [wizardError, setWizardError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [lastFailedMessages, setLastFailedMessages] = useState<WizardTurnMessageT[] | null>(null);

  const attempt = async (nextMessages: WizardTurnMessageT[], nextWizardState: WizardState) => {
    setError('');
    setIsSending(true);
    try {
      const result = await sendWizardTurn({ sessionId, wizardState: nextWizardState, messages: nextMessages });
      setMessages((prev) => [...prev, createMessage('assistant', result.message || '...')]);
      setWizardState(result.updatedWizardState);

      setPackages(null);
      setPolicyAnswer(null);
      setCompletedPackage(null);
      setContactPrompt(false);
      setWizardError('');

      if (result.uiComponent === 'packageCards') {
        setPackages((result.serverResult?.packages as WizardPackage[] | undefined) || []);
      } else if (result.uiComponent === 'policyAnswer') {
        setPolicyAnswer(result.serverResult as unknown as PolicyAnswer);
      } else if (result.uiComponent === 'contactPrompt') {
        setContactPrompt(true);
      } else if (result.uiComponent === 'complete') {
        setCompletedPackage((result.serverResult?.package as WizardPackage | undefined) || null);
      } else if (result.uiComponent === 'error') {
        setWizardError('That package is no longer available — please choose another.');
      }

      setLastFailedMessages(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the trip-planning assistant. Please try again.');
      setLastFailedMessages(nextMessages);
    } finally {
      setIsSending(false);
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    const userMessage = createMessage('user', trimmed);
    setMessages((prev) => [...prev, userMessage]);
    await attempt([...messages, userMessage].slice(-MAX_SENT_MESSAGES), wizardState);
  };

  const selectPackage = async (pkg: WizardPackage) => {
    if (isSending) return;
    const nextWizardState: WizardState = { ...wizardState, selectedPackageId: pkg.id };
    setWizardState(nextWizardState);
    const userMessage = createMessage('user', `I'd like to book "${pkg.title}".`);
    setMessages((prev) => [...prev, userMessage]);
    await attempt([...messages, userMessage].slice(-MAX_SENT_MESSAGES), nextWizardState);
  };

  const retry = () => {
    if (lastFailedMessages) attempt(lastFailedMessages, wizardState);
  };

  return { messages, wizardState, packages, policyAnswer, contactPrompt, completedPackage, wizardError, isSending, error, send, selectPackage, retry };
}
