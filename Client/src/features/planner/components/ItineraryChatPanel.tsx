import { useState } from 'react';
import { Send } from 'lucide-react';
import { useItineraryChat } from '../hooks/useItineraryChat';
import { addDaysISO } from '../utils/formHelpers';
import ChatTranscript from './ChatTranscript';
import DateRangeCalendar from './DateRangeCalendar';

interface ItineraryChatPanelProps {
  onReady: (params: { destination: string; startDate: string; endDate: string; travelers?: number; preferences?: string }) => void;
}

const GREETING = "Hi! Tell me about the trip you're dreaming of — where, how long, how many travelers, and any preferences?";

export default function ItineraryChatPanel({ onReady }: ItineraryChatPanelProps) {
  const chat = useItineraryChat();
  const [input, setInput] = useState('');
  const [datesConfirmed, setDatesConfirmed] = useState(false);

  const handleSend = () => {
    const text = input;
    setInput('');
    void chat.send(text);
  };

  const handleDatesChosen = (start: string, end: string) => {
    setDatesConfirmed(true);
    onReady({
      destination: chat.slots.destination as string,
      startDate: start,
      endDate: end,
      travelers: chat.slots.travelers,
      preferences: chat.slots.preferences,
    });
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <ChatTranscript greeting={GREETING} messages={chat.messages} isSending={chat.isSending} />

      {chat.error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between gap-2">
          <p className="text-xs text-red-700">{chat.error}</p>
          <button type="button" onClick={chat.retry} className="text-xs font-semibold text-red-700 underline shrink-0">Retry</button>
        </div>
      )}

      {chat.readyToGenerate && !datesConfirmed && (
        <div className="p-4 border-t border-gray-200 bg-brand-50">
          <p className="text-sm font-semibold text-gray-800 mb-3">
            Sounds like a {chat.slots.duration}-day trip to {chat.slots.destination}! Confirm your travel dates:
          </p>
          <DateRangeCalendar
            initialStart={todayISO}
            initialEnd={addDaysISO(todayISO, Math.max((chat.slots.duration ?? 1) - 1, 0))}
            onChange={handleDatesChosen}
            onClose={() => {}}
          />
        </div>
      )}

      <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
          placeholder="Tell us about your trip..."
          disabled={chat.isSending}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={chat.isSending || !input.trim()}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
