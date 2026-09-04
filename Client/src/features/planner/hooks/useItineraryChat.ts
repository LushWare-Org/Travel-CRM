import { useState } from 'react';
import { sendItineraryChatMessage } from '../../../services/api/itineraryChat';
import type { ItineraryChatSlots } from '../../../services/api/itineraryChat';

export interface ItineraryChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Sliding window sent to the backend each turn — matches the contract's
// ItineraryChatRequest.messages.max(20). Older turns still show in the
// visible transcript; only the most recent 20 are sent as model context.
const MAX_SENT_MESSAGES = 20;

export function useItineraryChat() {
  const [messages, setMessages] = useState<ItineraryChatMessage[]>([]);
  const [slots, setSlots] = useState<ItineraryChatSlots>({});
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [lastFailedMessages, setLastFailedMessages] = useState<ItineraryChatMessage[] | null>(null);

  const attempt = async (nextMessages: ItineraryChatMessage[]) => {
    setError('');
    setIsSending(true);
    try {
      const result = await sendItineraryChatMessage({ messages: nextMessages, slots });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
      setSlots(result.slots);
      setReadyToGenerate(result.readyToGenerate);
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
    const userMessage: ItineraryChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    await attempt([...messages, userMessage].slice(-MAX_SENT_MESSAGES));
  };

  const retry = () => {
    if (lastFailedMessages) attempt(lastFailedMessages);
  };

  return { messages, slots, readyToGenerate, isSending, error, send, retry };
}
