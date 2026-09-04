# Conversational Itinerary Builder + AI Workflow Roadmap

## Context

The Client site's trip planner (`Client/src/features/planner/PlanYourTripContainer.tsx`, route `/planner`) already ships a one-shot "Generate itinerary with AI" button (PR #33, `feat/ai-itinerary-workflow`, merged): the visitor fills Step 1 (destination) and Step 2 (dates/travelers/preferences) manually, then a single click calls package-service's public `POST /packages/generate-itinerary-preview` (Gemini-backed, `generateStructured`) to fill Step 3's day-by-day editor. `CustomizePackageContainer` (`/package/:id/customize`) has the equivalent "Regenerate with AI" button for adjusting an existing package's itinerary. Neither is conversational — both require the visitor to already have filled the structured fields before AI can act.

This plan adds a genuinely conversational entry point to `PlanYourTripContainer`: a chat panel where a visitor describes their trip in natural language, the assistant asks follow-up questions until it knows the destination and trip length, the visitor confirms exact travel dates through an inline calendar, and the container then calls the *existing, unchanged* `generate-itinerary-preview` pipeline to populate Step 3 — full reuse of the already-tested day-editor, contact form, and submission flow. `CustomizePackageContainer` is unchanged: its regenerate-only UX (always pre-seeded from a real package) doesn't fit a from-scratch conversational flow.

Per the user's broader ask ("find AI workflows for the whole website... evaluate the ideas on the current workflow"), this plan also delivers a research-grounded roadmap document evaluating further AI opportunities (site chatbot, natural-language search, review summarization, etc.) against the current manual workflow, with a priority recommendation — a concrete deliverable, not a design decision left open.

Default entry mode is **manual** (the existing Step 1 destination picker), with "Chat with AI" as an explicit opt-in tab — this mirrors every competitor researched (Kayak's Ask AI keeps a live traditional search page visible alongside its chat; Booking.com's AI Trip Planner and Expedia's Romie are both additive assistants, not default replacements of the existing search/browse UI) and means the existing default-Step-1 test (`PlanYourTripContainer.test.tsx`'s "renders the first step of the trip planner", asserting `Choose your destination...` is visible) keeps passing unmodified.

## Approach

### Phase A — Shared contract (`Services/shared/contracts`)

1. Add `Services/shared/contracts/src/itineraryChat.js`:
   ```js
   import { z } from 'zod';
   import { GenerateItineraryPreviewRequest } from './aiItineraryPreview.js';

   export const ItineraryChatMessage = z.object({
     role: z.enum(['user', 'assistant']),
     content: z.string().min(1).max(2000),
   });

   // All fields optional — a chat turn may know only some of what
   // GenerateItineraryPreviewRequest eventually requires in full.
   export const ItineraryChatSlots = GenerateItineraryPreviewRequest.partial();

   export const ItineraryChatRequest = z.object({
     messages: z.array(ItineraryChatMessage).min(1).max(20),
     slots: ItineraryChatSlots.optional(),
   });

   export const ItineraryChatResult = z.object({
     reply: z.string().min(1),
     slots: ItineraryChatSlots,
     readyToGenerate: z.boolean(),
   });
   ```
   Reuses `GenerateItineraryPreviewRequest`'s exact field constraints (`destination` max 255, `duration` int 1-30, etc.) via `.partial()` rather than re-declaring them.
2. Export from `Services/shared/contracts/src/index.js`, appended after the existing `aiItineraryPreview.js` export block (after line 42):
   ```js
   export {
     ItineraryChatMessage,
     ItineraryChatSlots,
     ItineraryChatRequest,
     ItineraryChatResult,
   } from './itineraryChat.js';
   ```
3. Add `Services/shared/contracts/test/itineraryChat.test.js`, same style as `test/aiItineraryPreview.test.js`:
   - `ItineraryChatRequest` parses a valid request with `slots`; parses a valid request with no `slots`; rejects `messages: []`; rejects a 21-message array (over the `.max(20)` cap); rejects an invalid `role` (e.g. `'system'`).
   - `ItineraryChatResult` parses a valid `{reply, slots, readyToGenerate}`; rejects a result missing `reply`; rejects `slots.duration: 31` (out of the reused 1-30 bound).

### Phase B — package-service backend (depends on Phase A for field-shape parity only — package-service owns its own local zod validators, same precedent as `generateItineraryPreviewSchema` already does for `GenerateItineraryPreviewRequest`)

4. Add to `Services/package-service/src/validators/package.schema.js`, directly after `generateItineraryPreviewSchema` (after line 195):
   ```js
   const itineraryChatMessageSchema = z.object({
     role: z.enum(['user', 'assistant']),
     content: z.string().min(1).max(2000),
   });

   const itineraryChatSlotsSchema = z.object({
     destination: z.string().max(255).optional(),
     duration: z.coerce.number().int().min(1).max(30).optional(),
     travelers: z.coerce.number().int().min(1).max(50).optional(),
     budget: z.string().max(100).optional(),
     preferences: z.string().max(1000).optional(),
   });

   export const itineraryChatSchema = z.object({
     messages: z.array(itineraryChatMessageSchema).min(1).max(20),
     slots: itineraryChatSlotsSchema.optional(),
   });
   ```
5. Add `Services/package-service/src/ai/prompts/itineraryChat.v1.js`:
   ```js
   // v1 — public, non-persisting conversational itinerary-planning turn.
   // Prompt and response schema change together; bump to itineraryChat.v2.js
   // on breaking changes rather than editing in place.

   export function buildItineraryChatPrompt({ messages, slots }) {
     const transcript = (messages || [])
       .map((m) => `${m.role === 'user' ? 'Traveler' : 'Assistant'}: ${m.content}`)
       .join('\n');
     return `You are a friendly, expert travel-planning assistant chatting with a website visitor to gather the details needed to generate a day-by-day itinerary.

   Known so far (may be incomplete or empty): ${JSON.stringify(slots || {})}.

   Conversation so far:
   ${transcript}

   Your job, for this turn only:
   1. Read the traveler's latest message and extract any of these slots it reveals: destination (place name), duration (trip length in whole days — infer common phrases like "a week" as 7 or "long weekend" as 3, but do not invent a number the traveler did not state or clearly imply), travelers (number of people), budget (free text), preferences (free text, e.g. activities, pace, food). Only include a slot in your response if you are confident of its value this turn — omit slots you did not just learn; the caller merges your output with what it already knows, so you never need to repeat earlier slots.
   2. destination and duration are required before an itinerary can be generated; travelers, budget, and preferences are optional extras. If destination or duration is still unknown after this message, write a short, warm reply asking a single question for exactly the next missing required slot — never ask about more than one thing at once, and never ask about optional slots before both required ones are known.
   3. If destination and duration are both known (from earlier turns or this one), write a short reply confirming the trip you understood (destination, duration, and any optional slots gathered) and tell the traveler you're ready to build the day-by-day itinerary once they confirm their travel dates.
   4. If the traveler's message is unrelated to trip planning, gently and briefly steer the conversation back to gathering destination and trip length.

   Respond with your reply text and only the slot(s) you learned this turn (or an empty object if none).`;
   }

   export const itineraryChatResponseSchema = {
     type: 'object',
     properties: {
       reply: { type: 'string' },
       slots: {
         type: 'object',
         properties: {
           destination: { type: 'string' },
           duration: { type: 'integer' },
           travelers: { type: 'integer' },
           budget: { type: 'string' },
           preferences: { type: 'string' },
         },
       },
     },
     required: ['reply', 'slots'],
   };
   ```
   `readyToGenerate` is deliberately **not** in the model's schema — it's computed deterministically by the controller from the merged slots (step 6), not trusted from the model's own judgment, to avoid the model prematurely declaring readiness.
6. In `Services/package-service/src/controllers/aiPackage.controller.js`: add `import { buildItineraryChatPrompt, itineraryChatResponseSchema } from '../ai/prompts/itineraryChat.v1.js';` after line 12, and add directly after the `generateItineraryPreview` handler (after line 166, before the `generateContentFromTitle` section comment on line 168):
   ```js
   // ── Public: non-persisting conversational itinerary-chat turn ─

   function pickDefined(obj) {
     return Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
   }

   // Re-validates the model's newly-learned slots against the same bounds the
   // request schema enforces (duration 1-30, string lengths) before merging
   // them into what's already known. A slot outside these bounds is dropped
   // (treated as not-yet-known) rather than surfaced as a 502, so one odd
   // model output degrades to "ask again next turn" instead of failing the turn.
   function sanitizeSlots(rawSlots, previousSlots) {
     const merged = { ...(previousSlots || {}), ...pickDefined(rawSlots) };
     if (merged.duration !== undefined) {
       const d = Number(merged.duration);
       if (!Number.isInteger(d) || d < 1 || d > 30) delete merged.duration;
       else merged.duration = d;
     }
     if (merged.travelers !== undefined) {
       const t = Number(merged.travelers);
       if (!Number.isInteger(t) || t < 1 || t > 50) delete merged.travelers;
       else merged.travelers = t;
     }
     if (merged.destination !== undefined) merged.destination = String(merged.destination).slice(0, 255);
     if (merged.budget !== undefined) merged.budget = String(merged.budget).slice(0, 100);
     if (merged.preferences !== undefined) merged.preferences = String(merged.preferences).slice(0, 1000);
     return merged;
   }

   export const itineraryChat = asyncHandler(async (req, res) => {
     const { messages, slots } = req.body;
     const prompt = buildItineraryChatPrompt({ messages, slots });
     const data = await generateStructured({ prompt, schema: itineraryChatResponseSchema, maxOutputTokens: 1024 });
     const mergedSlots = sanitizeSlots(data.slots, slots);
     const readyToGenerate = Boolean(mergedSlots.destination && mergedSlots.duration);
     res.json({ success: true, data: { reply: data.reply, slots: mergedSlots, readyToGenerate } });
   });
   ```
   No Prisma call — never persists, matching `generateItineraryPreview`'s pattern exactly. `maxOutputTokens: 1024` is a fixed budget (unlike the days-array endpoints' duration-scaled budget) since this endpoint only ever returns a short reply plus a small slots object, never itinerary days.
7. Register the route in `Services/package-service/src/routes/package.routes.js`: add `itineraryChat` to the controller import (line 17-23 block) and `itineraryChatSchema` to the validator import (line 4-14 block), then add directly after line 46:
   ```js
   // Public: non-persisting conversational turn — no DB write, rate-limited at the gateway.
   router.post('/itinerary-chat', validateBody(itineraryChatSchema), itineraryChat);
   ```
8. Extend `Services/package-service/src/controllers/__tests__/aiPackage.controller.test.js`: append a new `describe('POST /api/v1/packages/itinerary-chat', ...)` block after the file's last line (312), mirroring the existing `generate-itinerary-preview` block's `beforeEach(() => vi.clearAllMocks())` setup:
   - 200 with `{reply, slots, readyToGenerate: true}` when `mockGenerateStructured` resolves `{reply: 'Great, a 3-day Kandy trip!', slots: {destination: 'Kandy', duration: 3}}` and the request body has no prior `slots`.
   - `readyToGenerate: false` when the model's `slots` contain only `destination` (no `duration`).
   - merges with previously-known slots: request body includes `slots: {destination: 'Kandy'}`; model response is `{reply: '...', slots: {duration: 3}}` (doesn't repeat destination); response's merged `slots` contains both `destination: 'Kandy'` and `duration: 3`, and `readyToGenerate: true`.
   - drops an out-of-range `duration` from the model (e.g. `slots: {duration: 45}`): merged slots omit `duration`, `readyToGenerate: false`.
   - `mockPrisma.package.create` is never called (proves no persistence).
   - returns 400 when `messages: []` (zod `.min(1)`); `mockGenerateStructured` not called.
   - returns 503 when `mockGenerateStructured` rejects with the "AI generation is not configured" error (same pattern as the existing 503 test at line 291-300).
   - returns 502 when `mockGenerateStructured` rejects with "AI did not return valid JSON" (same pattern as line 302-311).
   - called with no `Authorization` header (genuinely public), same style as the existing preview test at line 247-258.
9. Add `Services/package-service/test/integration/itineraryChat.live.test.js`, mirroring `test/integration/generateItineraryPreview.live.test.js`'s `.env` loading and `describe.skipIf(!process.env.GEMINI_API_KEY)` / 30s-timeout pattern: call `buildItineraryChatPrompt({messages: [{role: 'user', content: 'I want a 3 day trip to Kandy, Sri Lanka'}]})` + `generateStructured` directly, assert `data.slots.destination` matches `/kandy/i` and, if `data.slots.duration` is present, it is an integer between 1 and 30.
10. Add `'**/itineraryChat.live.test.js'` to the `test:ci` script's `--exclude` list in `Services/package-service/package.json` (alongside the three existing exclusions on line 17) — omitting this makes CI attempt a real paid Gemini call and fail without a key.

### Phase C — Gateway (`Services/gateway/src/index.js`) — depends on Phase B's exact route path

11. Add a dedicated limiter directly after `aiItineraryPreviewLimiter` (after line 47):
    ```js
    // Higher ceiling than aiItineraryPreviewLimiter: a single conversation to
    // "ready" plus a couple of follow-up messages is several billed Gemini
    // calls, not one — 30/15min gives roughly 3x a typical conversation's
    // turn count while still bounding cost per IP.
    const itineraryChatLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
    ```
12. Add a `PUBLIC_PATTERNS` entry directly after the `generate-itinerary-preview` line (after line 88): `[/^\/api\/v1\/packages\/itinerary-chat$/, 'POST'],`.
13. Register the rate-limited route directly after the existing `generate-itinerary-preview` proxy mount (after line 215, before the generic `/packages` mount): `app.use(\`${V1}/packages/itinerary-chat\`, itineraryChatLimiter, proxy(SERVICES.package));`.

### Phase D — Client services & hooks (depends on Phase A's contract shape; needs Phase B+C running only for end-to-end verification)

14. Add `Client/src/services/api/itineraryChat.ts`, same shape as `aiItinerary.ts`:
    ```ts
    import { z } from 'zod';
    import httpClient from '../http/client';
    import { parseEnvelope } from '../http/envelope';
    import { ItineraryChatRequest, ItineraryChatResult } from '@travel-crm/contracts';

    type ItineraryChatPayload = z.infer<typeof ItineraryChatRequest>;
    export type ItineraryChatSlots = z.infer<typeof ItineraryChatResult>['slots'];

    export const sendItineraryChatMessage = async (payload: ItineraryChatPayload) => {
      const body = ItineraryChatRequest.parse(payload);
      const response = await httpClient.post('/packages/itinerary-chat', body);
      return parseEnvelope(ItineraryChatResult, response.data, 'POST /packages/itinerary-chat').data;
    };
    ```
15. Add `Client/src/services/api/__tests__/itineraryChat.test.ts`, mirroring `aiItinerary.test.ts`'s `vi.hoisted`/`vi.mock('../../http/client', ...)` pattern: resolves with parsed `{reply, slots, readyToGenerate}` on a well-formed response; rejects before calling `httpClient.post` when `messages` is `[]`; rejects when the response fails `ItineraryChatResult` validation (e.g. missing `reply`).
16. In `Client/src/features/planner/utils/formHelpers.ts`, add two exports (used by both the container's existing duration calc and the new chat panel):
    ```ts
    /** Whole-day count between two ISO date strings, 0 if either is empty. */
    export const computeDurationDays = (start: string, end: string): number =>
      start && end
        ? Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    /** Adds `days` whole days to an ISO date string, returning an ISO date string. */
    export const addDaysISO = (isoDate: string, days: number): string => {
      const d = new Date(isoDate);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };
    ```
17. Extend `Client/src/features/planner/__tests__/formHelpers.test.ts`: `computeDurationDays` returns 0 for empty/missing start or end; returns the correct day count for a real range (e.g. 5 days apart → 5, matching the container's existing "5 Days / 4 Nights" test fixture). `addDaysISO` adds days correctly including a month rollover (e.g. Jan 30 + 3 days → Feb 2).
18. Add `Client/src/features/planner/hooks/useItineraryChat.ts`:
    ```ts
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
    ```
    `retry()` resends the exact failed request without re-appending the user message (already in `messages` from the original `send()` call), so a failure never duplicates the visible transcript.
19. Add `Client/src/features/planner/hooks/__tests__/useItineraryChat.test.ts`, mirroring `useAIItineraryGenerator.test.ts`'s mocking pattern (`vi.hoisted` + `vi.mock('../../../../services/api/itineraryChat', ...)`): `send()` appends the user message immediately, then the assistant reply and updated `slots`/`readyToGenerate` on success; a rejected call keeps the user's message in `messages`, sets `error`, and appends no assistant reply; calling `retry()` after a failure re-sends without duplicating the user message, and clears `error` on success; sending 25 messages in sequence (each resolving) results in the final call's `messages` payload having length 20, containing only the 20 most recent entries.

### Phase E — Client UI (depends on Phase D)

20. Add `Client/src/features/planner/components/ItineraryChatPanel.tsx`:
    ```tsx
    import { useState } from 'react';
    import { Send, Bot, User, Loader2 } from 'lucide-react';
    import { useItineraryChat } from '../hooks/useItineraryChat';
    import { addDaysISO } from '../utils/formHelpers';
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
          <div className="max-h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
            <div className="flex items-start gap-2">
              <Bot className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
              <p className="text-sm bg-white rounded-xl px-3 py-2 shadow-sm">{GREETING}</p>
            </div>
            {chat.messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'user' ? <User className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" /> : <Bot className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />}
                <p className={`text-sm rounded-xl px-3 py-2 shadow-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white'}`}>{m.content}</p>
              </div>
            ))}
            {chat.isSending && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
          </div>

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
    ```
    `onClose={() => {}}` is intentional: `DateRangeCalendar` is reused exactly as-is (same component Step 2 already uses via its outside-click-to-close popover behavior), but here it's rendered inline/permanently rather than as a dismissable popover, so there is nothing for an outside click to "close."
21. Add `Client/src/features/planner/components/__tests__/ItineraryChatPanel.test.tsx`: renders the greeting bubble on mount; typing and sending a message shows the user bubble immediately and disables the send button while `chat.isSending` (mock `useItineraryChat`... — actually mock the underlying `sendItineraryChatMessage` API, same as `useItineraryChat.test.ts`, so this test exercises the real hook + component together); after the mocked API resolves with `readyToGenerate: false`, only the assistant reply renders (no date picker); after it resolves with `readyToGenerate: true` and `slots: {destination: 'Bali', duration: 5}`, the inline "Sounds like a 5-day trip to Bali!" card and calendar render; selecting a date range in the calendar (same day-click interaction as `PlanYourTripContainer.test.tsx`'s existing calendar test) calls the `onReady` prop with `{destination: 'Bali', startDate, endDate, travelers: undefined, preferences: undefined}`.
22. Update `Client/src/features/planner/PlanYourTripContainer.tsx`:
    - Add `import ItineraryChatPanel from './components/ItineraryChatPanel';` and change the `formHelpers` import (line 26) to include `computeDurationDays`: `import { buildItineraryDayFromAIDay, computeDurationDays } from "./utils/formHelpers";`.
    - Add `const [entryMode, setEntryMode] = useState<'manual' | 'chat'>('manual');` after line 101.
    - Replace the inline duration calculation (lines 120-126) with: `const duration = computeDurationDays(startDate, endDate);` — pure refactor, zero behavior change, dedupes the same formula now needed by the chat-ready handler below.
    - Add the chat-completion handler (near `handleSubmit`, e.g. after line 330):
      ```ts
      const handleChatReady = async (params: { destination: string; startDate: string; endDate: string; travelers?: number; preferences?: string }) => {
        setSelectedDest({ value: params.destination, label: params.destination });
        setStartDate(params.startDate);
        setEndDate(params.endDate);
        if (params.travelers) setTravelers(params.travelers);
        if (params.preferences) setPreferences(params.preferences);
        const chatDuration = computeDurationDays(params.startDate, params.endDate);
        await aiGenerator.generate({ destination: params.destination, duration: chatDuration, travelers: params.travelers, preferences: params.preferences || undefined });
        setStep(3);
      };
      ```
      Always advances to Step 3 regardless of generation success/failure: on failure, Step 3's existing empty-state UI (line 537-568) already renders `aiGenerator.error` plus both a manual "Add Day 1" button and a "Generate itinerary with AI" retry button — no new fallback UI needed, it's the same empty state the manual flow already hits and already has test coverage for.
    - In Step 1's JSX (lines 367-404), insert a mode toggle directly after the header block (after line 377) and wrap the existing destination-selector content (lines 379-402) in the `manual` branch:
      ```tsx
      <div className="flex gap-2 mb-4 sm:mb-6">
        <button type="button" onClick={() => setEntryMode('manual')} className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${entryMode === 'manual' ? 'bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Enter manually
        </button>
        <button type="button" onClick={() => setEntryMode('chat')} className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${entryMode === 'chat' ? 'bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Zap className="w-3.5 h-3.5" /> Chat with AI
        </button>
      </div>
      {entryMode === 'chat' ? (
        <ItineraryChatPanel onReady={handleChatReady} />
      ) : (
        <>
          {/* existing lines 379-402 unchanged: destination selector + selected-destination card */}
        </>
      )}
      ```
    - Switching between tabs always starts that mode fresh (no state transfer from manual selections into the chat panel or vice versa) — the chat panel unmounts/remounts on toggle, matching React's default conditional-render behavior; not treated as a bug since neither mode has committed data until its own completion step.
23. Extend `Client/src/features/planner/__tests__/PlanYourTripContainer.test.tsx`: add `vi.mock('../../../services/api/itineraryChat', () => ({ sendItineraryChatMessage: vi.fn() }))` and `const sendItineraryChatMessageMock = vi.mocked(sendItineraryChatMessage);` (reset in the existing `beforeEach`). Add tests:
    - Step 1 still defaults to "Enter manually" active with the existing `Choose your destination...` selector visible (confirms the default-mode decision didn't regress the existing "renders the first step" test).
    - Clicking "Chat with AI" hides the destination selector and shows the chat greeting + input.
    - Typing a message and sending it calls `sendItineraryChatMessage` with `{messages: [{role: 'user', content: '<text>'}], slots: {}}` and renders the mocked `reply` as an assistant bubble.
    - Mocking a response with `readyToGenerate: true, slots: {destination: 'Bali', duration: 5}`, then completing the inline date-range calendar (same day-click sequence as the file's existing Step-2 calendar test, lines 88-97) calls `generateItineraryPreview` (already mocked in this file) with `{destination: 'Bali', duration: 5, travelers: undefined, preferences: undefined}` and, on resolution, advances directly to Step 3 with the AI-generated day visible (heading `Plan Your Itinerary`).
    - A rejected `sendItineraryChatMessage` shows the error banner with a working "Retry" button and never calls `generateItineraryPreview`.

### Phase F — Cross-service E2E (`Services/e2e-tests`)

24. Add `Services/e2e-tests/client-contracts/itineraryChat.spec.js`, mirroring `client-contracts/aiItineraryPreview.spec.js` exactly: call `GET /packages/ai-status` first (no auth); then `POST /packages/itinerary-chat` with `{messages: [{role: 'user', content: 'I want a 3 day trip to Kandy, Sri Lanka'}]}`, no `Authorization` header. Branch on `configured`: if `false`, assert `503` with a truthy `message`; if `true`, assert `200` and `ItineraryChatResult.safeParse(res.body?.data)` succeeds (import `ItineraryChatResult` from `@travel-crm/contracts`), plus `data.reply` is a non-empty string.

### Phase G — AI workflow roadmap document

25. Write `AI_WORKFLOW_ROADMAP.md` at the repo root (same location convention as the existing `AI_ITINERARY_WORKFLOW_PLAN.md`/`LANDING_SECTIONS_PLAN.md`), with exactly this content:

    ```markdown
    # AI Workflow Roadmap — Travel CRM Client & Management

    ## Context: what's shipped, what's still manual

    Client itinerary building is now a hybrid manual/conversational flow
    (`PlanYourTripContainer`'s "Enter manually" vs "Chat with AI" tabs) plus a
    one-shot "Regenerate with AI" button on `CustomizePackageContainer`. Both
    call package-service's Gemini-backed endpoints (`generate-itinerary-preview`,
    `itinerary-chat`). Everything else customer-facing is still fully
    static/manual: `content/faq.js` renders a fixed accordion; `/packages`
    search/filter (`FiltersSidebar`/`Toolbar`) is manual dropdown/checkbox
    filtering; package reviews (`ReviewModal`) render as a raw list with no
    summarization; `MyAccount` only lists past bookings/requests with no
    proactive assistance; floating actions (`FloatingActionStack`) are
    WhatsApp/Call/ScrollTop only — every "talk to us" path routes straight to
    a human, with no AI-mediated step first.

    Confirmed across Kayak Ask AI, Expedia Romie, and Booking.com's AI Trip
    Planner: none of them replaced their existing manual search/browse UI
    with AI — each layers a conversational assistant alongside the existing
    interface and lets it progressively narrow/fill the same underlying
    search or itinerary data. Every item below follows that same principle:
    augment an existing manual workflow, don't replace it outright.

    ## Evaluated opportunities, in priority order

    1. **Conversational itinerary builder — shipped.** `PlanYourTripContainer`'s
       chat entry point, slot-filling (destination, duration, travelers,
       budget, preferences) via the `itinerary-chat` endpoint, handing off to
       the existing `generate-itinerary-preview` pipeline once dates are
       confirmed. Current workflow was a fully manual step-by-step form;
       upgrade is natural-language trip description with progressive
       clarifying questions, matching Kayak Ask AI's "open request, then hone
       criteria progressively" pattern.

    2. **Natural-language package search ("Smart Filter").** Current
       workflow: `/packages`' `FiltersSidebar`/`Toolbar` requires manually
       picking category, price range, and duration from dropdowns/checkboxes.
       Upgrade, modeled on Booking.com's Smart Filter: a text input above the
       existing filters sends free text to a small `generateStructured`
       endpoint extracting `{category?, minPrice?, maxPrice?, minDuration?,
       maxDuration?}`, then applies those values to the *existing* filter
       state — the manual filters stay visible and adjustable afterward.
       Lowest new-infrastructure cost of the unshipped items (one small
       endpoint, one input component, reuses the existing filter state
       machine end-to-end). Recommended as the next build after this plan.

    3. **AI review summarization.** Current workflow: `PackageDetailsContainer`
       renders a raw review list with no synthesis. Upgrade, modeled on
       Booking.com's Review Summaries: a cacheable per-package
       `generateStructured` call producing a 2-3 sentence summary shown above
       the raw list (reviews change rarely, so this can be generated
       infrequently, not per page view). No conversation state, no new
       client-side form. Recommended as a quick follow-up alongside item 2.

    4. **Sitewide FAQ/concierge chat widget.** Current workflow:
       `content/faq.js`'s static accordion plus WhatsApp/Call floating
       buttons are the only "ask a question" paths. Upgrade: a floating chat
       widget (new entry in `FloatingActionStack`, alongside `WhatsAppButton`/
       `CallButton`) answering general questions grounded in the existing FAQ
       content and live package catalog, with an explicit "Chat with a human
       on WhatsApp" escalation path for anything it can't answer — directly
       matching the confirmed best practice that complex or judgment-call
       requests still need a human. Higher cost than items 2-3 (a persistent
       widget shell, its own conversation endpoint, a retrieval step over
       FAQ/catalog content) — scope as its own plan once items 2-3 ship and
       this plan's stateless multi-turn pattern has proven out in production.

    5. **Post-booking trip companion (Expedia Romie-style).** Current
       workflow: `MyAccountContainer` only lists past bookings/requests — no
       proactive check-ins, no real-time updates, no in-app messaging after
       booking. This needs infrastructure the CRM doesn't have yet
       (push/SMS notifications, live disruption data, a persistent per-trip
       conversation thread). Highest cost, lowest readiness of the items
       here — not recommended before items 1-4 ship and notification-service
       gains a delivery channel beyond email.

    6. **Sales-rep AI copilot (Management app, Intercom Fin-style).** A
       different surface (Management, not Client) and a different user
       (staff, not visitor): an assistant surfacing relevant past-lead
       context, suggested replies, and quotation drafts inside Management's
       lead-management views. Intercom reports a 31% agent-efficiency lift
       from the equivalent pattern. Out of this plan's build scope (wrong
       app, wrong user) — a candidate for its own dedicated plan once items
       1-3 validate the Gemini-conversation pattern this plan establishes.

    ## Recommendation

    Ship item 1 first (this plan) — it's the concrete ask and reuses the
    most existing infrastructure. Item 2 (Smart Filter) is the next
    highest-value, lowest-cost follow-up: it reuses this plan's exact
    `generateStructured`-extraction pattern against an already-built filter
    UI. Items 4-6 are real opportunities but each has its own data/session/
    escalation design decisions and need their own dedicated plans rather
    than being folded into this one.
    ```

## Critical files & anchors

- `Services/package-service/src/controllers/aiPackage.controller.js:1-166` — existing `generateItineraryPreview`/`generateDaysArray`/imports to mirror; the new `itineraryChat` handler is inserted directly after.
- `Services/package-service/src/routes/package.routes.js:1-46` — existing public, no-auth, `validateBody`-only route registration pattern to copy exactly for `/itinerary-chat`.
- `Services/gateway/src/index.js:44-101,213-216` — limiter definitions, `PUBLIC_PATTERNS` array, and the specific-path-before-generic-mount route-table ordering convention.
- `Client/src/features/planner/PlanYourTripContainer.tsx:82-126,367-404` — state declarations and inline duration calc to extract into `computeDurationDays`; Step 1 JSX block to wrap with the entry-mode toggle.
- `Services/shared/contracts/src/aiItineraryPreview.js` — `GenerateItineraryPreviewRequest`, reused via `.partial()` for `ItineraryChatSlots` rather than re-declared.

## Verification

1. **Contracts**: `cd Services/shared/contracts && npm test` — new `itineraryChat.test.js` passes alongside the existing suite.
2. **package-service unit** (mocked Gemini, no key needed): `cd Services/package-service && npm run test:ci` — new `itinerary-chat` describe block passes (200/merge/out-of-range-drop/no-persist/400/503/502/no-auth cases); existing `generate-itinerary-preview`/`generate-ai` suites still pass unchanged.
3. **package-service live smoke** (one real Gemini call, needs a configured key): `cd Services/package-service && GEMINI_API_KEY=<key> npm test -- test/integration/itineraryChat.live.test.js` — asserts the extracted `slots.destination` matches `/kandy/i` for a "3 day trip to Kandy" opening message.
4. **Client unit/component**: `cd Client && npm test` — new `itineraryChat.test.ts` (service), `useItineraryChat.test.ts`, `formHelpers.test.ts` additions, `ItineraryChatPanel.test.tsx`, and the extended `PlanYourTripContainer.test.tsx` all pass; every pre-existing test (including "renders the first step of the trip planner") still passes unchanged.
5. **E2E against a running live stack** (gateway + package-service + lead-service up): `cd Services/e2e-tests && GATEWAY_URL=http://localhost:3000/api/v1 E2E_I_UNDERSTAND_SHARED_DB=true npm test -- client-contracts/itineraryChat.spec.js`.
6. **Manual rate-limit check** (not automated, same reasoning as the existing `aiItineraryPreview.spec.js` note — exhausting it against the shared live stack would lock out other users/tests): with the dev stack running, `for i in $(seq 1 32); do curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/v1/packages/itinerary-chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Hi"}]}'; done` — expect the first 30 to return 200/400/502/503 and the last 2 to return 429.
7. **Browser-driven UI proof**: with `Client` dev server and the full backend stack running, open `/planner` — confirm "Enter manually" is the active default tab and the existing destination selector is visible (regression check). Click "Chat with AI", type "I'd like a 4 day trip to Kandy, Sri Lanka for 2 people who love hiking", observe an assistant reply; continue the conversation until the inline "Confirm your travel dates" calendar appears; pick a date range and confirm the page auto-advances to Step 3 with a populated 4-day itinerary (or the existing empty-state + error banner + manual "Add Day 1"/"Generate itinerary with AI" fallback if `GEMINI_API_KEY` is unset locally). Complete Step 4 and submit, confirming the existing success screen renders exactly as it does for the manual flow today.

## Assumptions & contingencies

- **Default entry mode is "manual", not "chat"** — grounded in every researched competitor keeping AI as an add-on rather than the default (see Context). If the user instead wants chat-first by default, it's a one-line change (flip `useState<'manual' | 'chat'>('manual')` to `('chat')`) plus updating the two default-mode assertions in step 23 to expect the chat panel instead of the destination selector — no architectural change.
- **Gemini unavailable (`GEMINI_API_KEY` unset)**: every `itinerary-chat` call 503s immediately. No special-case detection is built for this vs. any other transient failure — the panel's existing error banner (with "Retry") surfaces it, and the always-visible "Enter manually" tab is the unconditional working fallback.
- **Rate-limit thresholds** (`itineraryChatLimiter` max 30/15min, mirroring `aiItineraryPreviewLimiter`'s existing max 5/15min precedent): isolated ops-tuning constants. If real usage shows 30 too strict for a longer back-and-forth, raise it — does not require re-approval, same as the existing limiter's own documented assumption.
- **No new environment variables**: reuses the already-configured `GEMINI_API_KEY`/`GEMINI_MODEL`.
