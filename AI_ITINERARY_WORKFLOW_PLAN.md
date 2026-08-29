# AI Itinerary Building Workflow — Client Site

## Context

Ground truth (verified by reading the code): **no AI itinerary generation exists on the Client (customer-facing) site today.** Both day-by-day wizards — `PlanYourTripContainer` (`/planner`, builds a trip from scratch) and `CustomizePackageContainer` (`/package/:id/customize`, overrides days on an existing catalog package) — are 100% manual: the user hand-fills locations/activities via `LocationSelector`/`ActivitySelector` and submits to lead-service. All existing AI generation (Gemini-backed, in `Services/package-service/src/ai/`) is gated `requireAuth + authorize('admin','staff')` and persists a `Package` row — customers cannot reach it and it's the wrong data shape for a customer flow anyway.

This plan builds a customer-facing AI itinerary workflow: a new public, non-persisting "generate itinerary preview" endpoint in package-service (reusing the existing Gemini infrastructure), a gateway route with its own rate limiter, and Client UI in both `PlanYourTripContainer` and `CustomizePackageContainer` that lets a visitor generate a day-by-day itinerary with AI, review/edit it (exactly like admin's AI flow: "generated, then reviewed before saving"), and submit through the existing, already-tested manual submission pipeline unchanged. Confirmed with the user: backend changes are in scope for this plan, and both PlanYourTrip and CustomizePackage get the AI-assist surface.

## Approach

### Phase A — Shared contract (`Services/shared/contracts`)

1. Add `Services/shared/contracts/src/aiItineraryPreview.js`:
   ```js
   import { z } from 'zod';
   import { ManualItineraryDay } from './manualItinerary.js';

   export const GenerateItineraryPreviewRequest = z.object({
     destination: z.string().min(1).max(255),
     duration: z.number().int().min(1).max(30),
     travelers: z.number().int().min(1).max(50).optional(),
     budget: z.string().max(100).optional(),
     preferences: z.string().max(1000).optional(),
   });

   export const GenerateItineraryPreviewResult = z.object({
     days: z.array(ManualItineraryDay).min(1),
   });
   ```
   Reuses `ManualItineraryDay` (already the exact day shape both `WebsiteManualItineraryRequest.days` and the Client's `ItineraryDay`/`DayOverrideState` need) rather than inventing a new day schema.
2. Export both from `Services/shared/contracts/src/index.js` (append after the existing `manualItinerary.js` export block).
3. Add `Services/shared/contracts/test/aiItineraryPreview.test.js`, same style as `test/itineraryDay.test.js`: parses a valid request/result; rejects a request missing `destination`; rejects `duration: 0` and `duration: 31`; rejects a result with `days: []`.

### Phase B — package-service backend (depends on Phase A for field-shape parity only, no runtime import — package-service does not depend on `@travel-crm/contracts`, matching its existing pattern of owning its own local zod validators)

4. Add `generateItineraryPreviewSchema` to `Services/package-service/src/validators/package.schema.js`, next to `generateAIPackageSchema`/`generateFromTitleSchema` (line 171-187):
   ```js
   export const generateItineraryPreviewSchema = z.object({
     destination: z.string().min(1, 'Destination is required').max(255),
     duration: z.coerce.number().int().min(1).max(30),
     travelers: z.coerce.number().int().min(1).max(50).optional(),
     budget: z.string().max(100).optional(),
     preferences: z.string().max(1000).optional(),
   });
   ```
5. Add `Services/package-service/src/ai/prompts/generateItineraryPreview.v1.js`:
   ```js
   export function buildGenerateItineraryPreviewPrompt({ destination, duration, travelers, budget, preferences }) {
     return `You are an expert travel itinerary planner. Generate a day-by-day travel itinerary for ${destination} for exactly ${duration} days.

   Travelers: ${travelers || 2}.
   Budget: ${budget || 'moderate'}.
   Preferences: ${preferences || 'general sightseeing'}.

   The "days" array must contain exactly ${duration} entries, one per day, numbered 1 to ${duration}. Do not stop early or summarize remaining days. Each day must include "locations" (place names) and "activities" (activity names). Only set "transport" when travel between locations that day genuinely requires it, using one of the allowed values.`;
   }

   export const generateItineraryPreviewResponseSchema = {
     type: 'object',
     properties: {
       days: {
         type: 'array',
         items: {
           type: 'object',
           properties: {
             dayNumber: { type: 'integer' },
             title: { type: 'string' },
             description: { type: 'string' },
             locations: { type: 'array', items: { type: 'string' } },
             activities: { type: 'array', items: { type: 'string' } },
             meals: {
               type: 'object',
               properties: {
                 breakfast: { type: 'boolean' },
                 lunch: { type: 'boolean' },
                 dinner: { type: 'boolean' },
               },
             },
             transport: { type: 'string', enum: ['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'] },
           },
           required: ['dayNumber', 'title', 'locations', 'activities'],
         },
       },
     },
     required: ['days'],
   };
   ```
   Constraining `transport` to the exact `ManualItineraryDay.transport` enum via the JSON schema (Gemini's `responseSchema` does constrained decoding, per `geminiClient.js`'s doc comment) means the controller needs zero string-to-enum mapping — unlike `generateAIPackage`'s `mapTransportMode`, which exists only because that endpoint's schema left `transport` as free text. This new schema intentionally omits `title`/`price`/`category`/`inclusions`/`exclusions` (present in `generatePackageResponseSchema`) since the customer preview never persists a sellable package — smaller output, cheaper/faster calls.
6. Refactor `Services/package-service/src/controllers/aiPackage.controller.js`:
   - Extract the token-budget-scaling + shortfall-padding block currently inline in `generateAIPackage` (lines 89-113: computing `maxOutputTokens`, calling `generateStructured`, slicing/padding `days` to exactly `duration`, logging the padding warning) into a new shared helper:
     ```js
     async function generateDaysArray({ prompt, schema, duration, tokenBudgetBase }) {
       const d = Number(duration);
       const maxOutputTokens = Math.min(60000, tokenBudgetBase + d * 700);
       const data = await generateStructured({ prompt, schema, maxOutputTokens });
       const days = Array.isArray(data.days) ? data.days.slice(0, d) : [];
       const shortfall = d - days.length;
       while (days.length < d) {
         const n = days.length + 1;
         days.push({ dayNumber: n, title: `Day ${n}`, description: '', locations: [], activities: [], meals: { breakfast: true, dinner: true } });
       }
       if (shortfall > 0) {
         logger.warn({ requestedDuration: d, shortfall }, 'AI returned fewer days than requested — padded with blank placeholder days');
       }
       return { data, days };
     }
     ```
     (Padding placeholder omits `transport` rather than setting `''`, since the new schema's `transport` is a strict enum — `undefined` is valid for the `.nullable().optional()` contract field, an empty string is not.)
   - Update `generateAIPackage` (lines 73-113) to call `const { data: packageData, days } = await generateDaysArray({ prompt, schema: generatePackageResponseSchema, duration, tokenBudgetBase: 1500 });` in place of its current inline block; the rest of the function (normalization, persistence) is unchanged.
   - Add a new exported handler:
     ```js
     export const generateItineraryPreview = asyncHandler(async (req, res) => {
       const { destination, duration, travelers, budget, preferences } = req.body;
       const prompt = buildGenerateItineraryPreviewPrompt({ destination, duration, travelers, budget, preferences });
       const { days } = await generateDaysArray({ prompt, schema: generateItineraryPreviewResponseSchema, duration, tokenBudgetBase: 800 });
       res.json({ success: true, data: { days } });
     });
     ```
     No Prisma call anywhere in this path — it must never persist, and never touches `resolveActivityCatalogIds`/`buildItineraryDaysData` (those exist only to shape data for the `Package` table).
7. Register the route in `Services/package-service/src/routes/package.routes.js`, in the "AI: full-package generation" block (lines 40-42), alongside the other two AI POST routes but **without** `requireAuth`/`authorize` — intentionally public, matching the existing `/ai-status` public-route precedent (line 31):
   ```js
   // Public: non-persisting customer-facing itinerary preview — no DB write, rate-limited at the gateway.
   router.post('/generate-itinerary-preview', validateBody(generateItineraryPreviewSchema), generateItineraryPreview);
   ```
8. Extend `Services/package-service/src/controllers/__tests__/aiPackage.controller.test.js` with a new `describe('POST /api/v1/packages/generate-itinerary-preview', ...)` block, mirroring the existing `generate-ai` tests' mocking setup (`mockGenerateStructured`, `mockPrisma`) but asserting the *new* behavioral contract:
   - returns 200 with `data.days` shaped per `generateItineraryPreviewResponseSchema` on success, called with **no** `Authorization` header (proves the route is genuinely public — the single most important regression to catch, since accidentally adding `requireAuth` later would silently break the customer flow with a 401);
   - never calls `mockPrisma.package.create` (proves it never persists);
   - pads to exactly `duration` days when the model returns fewer (mirrors the existing `generate-ai` padding test, confirms the extracted `generateDaysArray` helper still works through this new call site);
   - returns 400 when `destination` is missing (zod `validateBody`);
   - returns 503 when `isAIConfigured()` is false;
   - returns 502 when the model output fails schema/JSON validation.
9. Add `Services/package-service/test/integration/generateItineraryPreview.live.test.js`, mirroring `aiPackage.generateAI.live.test.js` exactly (same `.env` loading, same `describe.skipIf(!process.env.GEMINI_API_KEY)`, 30s timeout): call `buildGenerateItineraryPreviewPrompt` + `generateStructured` directly with `{ destination: 'Kandy, Sri Lanka', duration: 2 }`, assert `data.days.length === 2` and each day's `locations`/`activities` are arrays and (if present) `transport` is one of the 7 enum values.
10. Add `'**/generateItineraryPreview.live.test.js'` to the `--exclude` list in `Services/package-service/package.json`'s `test:ci` script (alongside the existing `aiPackage.generateAI.live.test.js` exclusion) — forgetting this makes CI attempt a real paid Gemini call and fail without a key.

### Phase C — Gateway (`Services/gateway/src/index.js`) — depends on Phase B's exact route path

11. Add a dedicated limiter near `authLimiter` (line 44): `const aiItineraryPreviewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });` — stricter than `authLimiter`'s 10/15min because each request is a real, billed Gemini call, not a login attempt.
12. Add a `PUBLIC_PATTERNS` entry (in the block around lines 77-79, alongside the other `.../website$` public POST routes): `[/^\/api\/v1\/packages\/generate-itinerary-preview$/, 'POST'],`.
13. Register the rate-limited route **before** the generic `/packages` proxy mount (line 181), matching the existing auth-route ordering convention (specific-path-with-limiter registered before the generic mount):
    ```js
    app.use(`${V1}/packages/generate-itinerary-preview`, aiItineraryPreviewLimiter, proxy(SERVICES.package));
    ```

### Phase D — Client (depends on Phase A's contract; needs Phase B+C running for end-to-end verification, but can be written in parallel with B/C)

14. Add `Client/src/services/api/aiItinerary.ts`, same shape as `manualItinerary.ts`:
    ```ts
    import { z } from 'zod';
    import httpClient from '../http/client';
    import { parseEnvelope } from '../http/envelope';
    import { GenerateItineraryPreviewRequest, GenerateItineraryPreviewResult } from '@travel-crm/contracts';

    type GenerateItineraryPreviewPayload = z.infer<typeof GenerateItineraryPreviewRequest>;

    export const generateItineraryPreview = async (payload: GenerateItineraryPreviewPayload) => {
      const body = GenerateItineraryPreviewRequest.parse(payload);
      const response = await httpClient.post('/packages/generate-itinerary-preview', body);
      return parseEnvelope(GenerateItineraryPreviewResult, response.data, 'POST /packages/generate-itinerary-preview').data;
    };
    ```
15. Add `Client/src/services/api/__tests__/aiItinerary.test.ts`, mirroring `manualItinerary.test.ts`'s mocking pattern (`vi.hoisted` + `vi.mock('../../http/client', ...)`): resolves with parsed `{days}` on a well-formed response; rejects before calling `httpClient.post` when `destination` is empty; rejects when the response's `days` fails `ManualItineraryDay` validation (e.g. a day missing `dayNumber`).
16. Add `Client/src/features/planner/hooks/useAIItineraryGenerator.ts` (new `hooks/` folder — the planner feature currently has none):
    ```ts
    import { useState } from 'react';
    import Swal from 'sweetalert2';
    import { generateItineraryPreview } from '../../../services/api/aiItinerary';

    type GeneratedDay = Awaited<ReturnType<typeof generateItineraryPreview>>['days'][number];

    interface GenerateParams {
      destination: string;
      duration: number;
      travelers?: number;
      preferences?: string;
    }

    interface UseAIItineraryGeneratorOptions<TDay> {
      hasExistingDays: () => boolean;
      mapDay: (aiDay: GeneratedDay, index: number) => TDay;
      onGenerated: (days: TDay[]) => void;
    }

    export function useAIItineraryGenerator<TDay>({ hasExistingDays, mapDay, onGenerated }: UseAIItineraryGeneratorOptions<TDay>) {
      const [isGenerating, setIsGenerating] = useState(false);
      const [error, setError] = useState('');

      const generate = async (params: GenerateParams) => {
        if (hasExistingDays()) {
          const confirmed = await Swal.fire({
            icon: 'warning',
            title: 'Replace itinerary?',
            text: 'Generating a new AI itinerary will replace all planned days. Continue?',
            showCancelButton: true,
            confirmButtonText: 'Replace',
            cancelButtonText: 'Cancel',
          });
          if (!confirmed.isConfirmed) return;
        }
        setError('');
        setIsGenerating(true);
        try {
          const { days } = await generateItineraryPreview(params);
          onGenerated(days.map(mapDay));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to generate itinerary. Please try again or plan manually.');
        } finally {
          setIsGenerating(false);
        }
      };

      return { isGenerating, error, generate };
    }
    ```
    `sweetalert2` is already a Client dependency, already used for exactly this "confirm/loading/success/error around a generation action" pattern in `Client/src/features/packages/pdf/pdfService.ts` — reused here rather than introducing a second confirmation mechanism.
17. Add `Client/src/features/planner/hooks/__tests__/useAIItineraryGenerator.test.ts` (Testing Library `renderHook`): calling `generate()` with no existing days skips the confirm dialog and calls `onGenerated` with mapped days on success; with existing days present, confirms via a mocked `Swal.fire` resolving `{isConfirmed:false}` and asserts `onGenerated` is never called; a rejected `generateItineraryPreview` call sets `error` and never calls `onGenerated`.
18. In `Client/src/features/planner/utils/formHelpers.ts`: move the `DayAccommodation`, `DayMeals`, and `ItineraryDay` interfaces currently declared locally in `PlanYourTripContainer.tsx` (lines 66-90) into this file as named exports, and add:
    ```ts
    export const buildItineraryDayFromAIDay = (aiDay: RawAIDay, index: number): ItineraryDay => ({
      dayNumber: aiDay?.dayNumber || index + 1,
      title: aiDay?.title || `Day ${index + 1}`,
      locations: aiDay?.locations || [],
      activities: aiDay?.activities || [],
      accommodation: {
        name: aiDay?.accommodation?.name || '',
        type: aiDay?.accommodation?.type || 'hotel',
        rating: aiDay?.accommodation?.rating ?? 4,
        address: aiDay?.accommodation?.address || '',
        contactNumber: aiDay?.accommodation?.contactNumber || '',
      },
      meals: {
        breakfast: aiDay?.meals?.breakfast ?? false,
        lunch: aiDay?.meals?.lunch ?? false,
        dinner: aiDay?.meals?.dinner ?? false,
      },
      transport: aiDay?.transport || '',
      places: [], // Never populated from AI (or manual entry) — see note below.
      notes: aiDay?.description || '',
    });
    ```
    `places` stays `[]`: grepping `PlanYourTripContainer.tsx` confirms `places` is never written by any existing UI control (only `locations` is user/AI-editable) — matching that exact existing behavior rather than inventing new semantics for a field the rest of the codebase treats as inert. The AI response has no `accommodation` data (the new response schema, like the existing `generateAIPackage`'s, doesn't generate it), so `buildItineraryDayFromAIDay` always falls back to the same defaults `handleAddDay` already uses for a fresh manual day.
19. Update `PlanYourTripContainer.tsx`:
    - Replace the local `DayAccommodation`/`DayMeals`/`ItineraryDay` interface declarations (lines 66-90) with an import from `./utils/formHelpers`.
    - Add `const [preferences, setPreferences] = useState('');` and an optional "Trip preferences (optional)" `<textarea>` in Step 2 (after the Travelers control, ~line 500), placeholder `"e.g., Include water sports, prefer beachside hotels, need vegetarian food options..."` (matches `AIPackageDialog`'s equivalent field's placeholder for consistency).
    - In `handleSubmit`'s payload (line 304), change `message: ''` to `message: preferences.trim()` — the preferences textarea must reach the submitted lead so the sales rep sees it too, not just the AI prompt; leaving it collected-but-discarded would be misleading.
    - Wire the hook: `const aiGenerator = useAIItineraryGenerator<ItineraryDay>({ hasExistingDays: () => itineraryDays.length > 0, mapDay: buildItineraryDayFromAIDay, onGenerated: (days) => { setItineraryDays(days); setCurrentDayIndex(0); } });`
    - In Step 3 (line 505-546): in the `itineraryDays.length === 0` empty state (lines 534-545), add a "Generate itinerary with AI" button next to "Add Day 1", calling `aiGenerator.generate({ destination: destLabel(selectedDest), duration, travelers, preferences: preferences || undefined })`; show a `Loader2` spinner + "Generating..." while `aiGenerator.isGenerating`.
    - When `itineraryDays.length > 0` (line 549-573 day-nav header), add a secondary "Regenerate with AI" button calling the same `aiGenerator.generate(...)`; disable it and the manual day-editing controls (`handleAddDay`/`handleRemoveDay`/field inputs) while `aiGenerator.isGenerating`.
    - Render `aiGenerator.error` as an inline red banner directly under the Step 3 header (same visual style as the existing `validationMsg` banner at lines 875-879, but a separate state so an AI failure doesn't collide with cross-step navigation validation messages).
20. Update `CustomizePackageContainer.tsx`:
    - `dayOverrides` is always pre-seeded from the package's real itinerary on load (`useEffect` at lines 68-99 calls `buildDayState` for every existing `pkg.itinerary` day) — so this container's AI action is always a "regenerate" action, never an empty-state "start from scratch" button; only one placement is needed.
    - Wire the hook: `const aiGenerator = useAIItineraryGenerator<DayOverrideState>({ hasExistingDays: () => dayOverrides.length > 0, mapDay: buildDayState, onGenerated: setDayOverrides });` — reuses the existing `buildDayState` from `formHelpers.ts` directly as `mapDay` since its `RawDay` input type (`dayNumber?, title?, description?, activities?, locations?`) is already structurally satisfied by an AI-generated `ManualItineraryDay`.
    - In Step 3 (line 497-523), add a "Regenerate with AI" button next to the existing "Add Day" button (line 514-522), calling `aiGenerator.generate({ destination: pkg.destination?.name || pkg.destinationRaw || '', duration: pkg.duration_days, travelers: Number(travelPrefs.travelers) || undefined, preferences: message || undefined })`; disable it and `handleAddDay`/`handleRemoveDay`/field inputs while `aiGenerator.isGenerating`.
    - Render `aiGenerator.error` as an inline red banner in the same Step 3 block.
21. Extend `Client/src/features/planner/__tests__/PlanYourTripContainer.test.tsx`: mock `generateItineraryPreview` (same `vi.hoisted`/`vi.mock` pattern as `submitManualItineraryRequest`); add tests — (a) clicking "Generate itinerary with AI" at the empty Step 3 state calls it with the exact `{destination, duration, travelers, preferences}` derived from steps 1-2, populates the day grid, and the final Step 4 submit payload's `days[0]` matches the AI-mapped shape; (b) with a day already added, clicking "Regenerate with AI" shows the confirm dialog (mock `Swal.fire`) — canceling leaves `itineraryDays` untouched, confirming replaces them; (c) a rejected `generateItineraryPreview` shows the AI error banner and leaves the manual "Add Day 1" path usable.
22. Extend `Client/src/features/planner/__tests__/CustomizePackageContainer.test.tsx` with the equivalent three cases, plus one asserting `handleSubmit`'s existing `overrides.days` mapping (line 178-182, `{dayNumber, activities, locations}` only) is unchanged for AI-populated days — the new feature must not alter the existing, already-tested submission contract.
23. Extend `Client/src/features/planner/__tests__/formHelpers.test.ts` with cases for `buildItineraryDayFromAIDay`: full AI day maps correctly; missing `accommodation`/`meals`/`transport` fall back to the same defaults `handleAddDay` uses; `places` is always `[]` regardless of input.

### Phase E — Cross-service E2E (`Services/e2e-tests`)

24. Add `Services/e2e-tests/client-contracts/aiItineraryPreview.spec.js`, same style as `packages.spec.js`: call `GET /packages/ai-status` first (no auth) to read `configured`; then call `POST /packages/generate-itinerary-preview` **without** an `Authorization` header (proves the route is genuinely public through the live gateway, not just in package-service's own route table) with `{destination: 'Kandy, Sri Lanka', duration: 2}`. Branch on `configured`: if `false`, assert the response is `503` with a message (validates the safe-decline path when no key is set in the shared environment); if `true`, assert `200` and `z.array(ManualItineraryDay-shaped days)` via `GenerateItineraryPreviewResult.safeParse(res.body?.data)` from `@travel-crm/contracts`. This avoids a test that's permanently skipped or flaky depending on whether the shared deployed stack happens to have `GEMINI_API_KEY` set.
    - Deliberately **not** added: an automated test that exhausts the new rate limiter. Doing so against the shared live stack would lock out the limiter for 15 minutes for every other e2e run and real user sharing that gateway instance. Covered instead by a manual curl-loop check in Verification.

## Critical files & anchors

- `Services/package-service/src/controllers/aiPackage.controller.js:73-113` — existing `generateAIPackage` inline token-scaling/padding logic to extract into `generateDaysArray`.
- `Services/gateway/src/index.js:43-45,62-92,165-191` — limiter definitions, `PUBLIC_PATTERNS` array, and route-table ordering convention (specific-path-with-limiter before generic mount).
- `Client/src/features/planner/PlanYourTripContainer.tsx:66-90,504-573` — interfaces to relocate into `formHelpers.ts`; Step 3 empty-state and day-nav-header insertion points.
- `Client/src/features/planner/CustomizePackageContainer.tsx:68-99,497-523` — confirms `dayOverrides` is always pre-seeded (regenerate-only UX); Step 3 header insertion point for the button.
- `Services/shared/contracts/src/manualItinerary.js` — `ManualItineraryDay` is the day shape the new AI response schema must match field-for-field; reused as-is rather than duplicated.

## Verification

1. **Contracts**: `cd Services/shared/contracts && npm test` — new `aiItineraryPreview.test.js` passes alongside existing suite.
2. **package-service unit** (mocked Gemini, no key needed): `cd Services/package-service && npm run test:ci` — new `generate-itinerary-preview` describe block passes (200/no-auth/no-persist/padding/400/503/502 cases), existing `generate-ai` suite still passes unchanged (proves the `generateDaysArray` extraction didn't regress it).
3. **package-service live smoke** (costs one real Gemini call, requires a configured key): `cd Services/package-service && GEMINI_API_KEY=<key> npm test -- test/integration/generateItineraryPreview.live.test.js` — asserts exactly 2 days returned for a 2-day Kandy request, each with array `locations`/`activities`.
4. **Client unit/component**: `cd Client && npm test` — new `aiItinerary.test.ts`, `useAIItineraryGenerator.test.ts`, `formHelpers.test.ts` additions, and extended `PlanYourTripContainer.test.tsx`/`CustomizePackageContainer.test.tsx` all pass; existing "submits the exact expected payload" tests still pass unchanged.
5. **E2E against a running live stack** (gateway + package-service + lead-service up, per `Services/e2e-tests/README.md`'s existing prerequisites): `cd Services/e2e-tests && GATEWAY_URL=http://localhost:3000/api/v1 E2E_I_UNDERSTAND_SHARED_DB=true npm test -- client-contracts/aiItineraryPreview.spec.js` — passes whether or not `GEMINI_API_KEY` happens to be set on that stack.
6. **Manual rate-limit check** (not automated, per Phase E note): with the dev stack running, `for i in $(seq 1 7); do curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/v1/packages/generate-itinerary-preview -H 'Content-Type: application/json' -d '{"destination":"Bali","duration":1}'; done` — expect the first 5 to return 200/400/502/503 (whatever the real outcome is) and the 6th/7th to return 429.
7. **Browser-driven UI proof** (required for this UI change): with `Client` dev server and the full backend stack running, open `/planner`, fill destination + dates, on the empty Step 3 click "Generate itinerary with AI", observe the day grid populate (or the inline error banner if `GEMINI_API_KEY` is unset locally — confirm the "Add Day 1" manual path still works in that case). Add a day and click "Regenerate with AI", confirm the SweetAlert2 warning appears and cancel leaves the day untouched. Repeat on `/package/:id/customize` for an existing package's "Regenerate with AI" button.

## Assumptions & contingencies

- **Rate-limit threshold**: `max: 5` requests/15min/IP on the new gateway route, stricter than `authLimiter`'s 10 since each call is a billed Gemini request. If real usage shows this too strict for legitimate iterative use (a visitor regenerating a few times while tuning preferences), raise `aiItineraryPreviewLimiter`'s `max` — it's an isolated ops-tuning constant, not a behavior change, and does not require re-approval.
- **No new env var**: reuses the already-configured `GEMINI_API_KEY`/`GEMINI_MODEL` package-service already reads for the admin AI flow. If a given environment has no key set, the feature safely degrades — every consuming path (backend 503, Client inline error banner, e2e spec's `configured`-branch) already handles that case, and the pre-existing manual itinerary flow is completely unaffected.
- **Model under-populates optional fields** (e.g. omits `transport` or `meals` on some days despite the schema listing them): expected and already handled — only `dayNumber`/`title`/`locations`/`activities` are in the JSON schema's `required` array, and every consumer (`buildItineraryDayFromAIDay`, `buildDayState`) already defaults the rest. No further code changes needed if this occurs.
