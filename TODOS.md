# TODOS

## Site-Wide Floating Assistant

### E2E coverage for cross-service assistant flows

**What:** The /ship coverage audit (77%, 15 gaps, 6 tagged `[→E2E]`) identified several flows that need integration tests against a live stack rather than more mocked unit tests: nav round-trip through the real gateway (visitor asks to navigate → gateway → assistant-service → client chip → route change), Gemini/gateway-down banner recovery, telemetry funnel landing in Postgres (`assistant_impression` → `assistant_response` → `AssistantEvent` rows), and SPA navigation to `/planner` mid-conversation (widget must not re-fire an impression event).

**Why:** These cross real service boundaries (Client → gateway → assistant-service → Postgres) that mocked unit tests can't exercise faithfully — exactly the class of flow `Services/e2e-tests/` already exists for (per CLAUDE.md: "driving real HTTP calls through the Gateway against a fully running local microservices stack").

**Context:** Flagged during `/ship`'s coverage audit on `feat/site-wide-assistant`. Add to `Services/e2e-tests/` following the existing per-run-marker/cleanup convention.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Verify assistant-service (and package-service) can actually reach user-service in Cloud Run

**What:** `@travel-crm/policy-retrieval`'s `fetchPolicyDocuments()` makes a plain, unsigned `fetch` to `USER_SERVICE_URL` with only an `x-internal-token` header — no Google-signed ID token. In production, user-service is deployed `allow_unauthenticated = false`, and `iam.tf`'s `run.invoker` grants only cover the gateway's service account calling each backend (`gateway_invoker_*`) — there is no `run.invoker` grant for package-service's or assistant-service's own service account to call user-service directly. If that IAM gap is real, the call 403s at the platform layer before the application-level token check even runs, and the failure path (`if (!res.ok) return cachedDocuments || [];`) makes this indistinguishable from "no policy documents" — every FAQ turn silently degrades to the fallback message with no error surfaced anywhere.

**Why:** Flagged during `/ship`'s Claude adversarial AND Codex adversarial review (both independently found this). This pattern is NOT new to this diff — `wizard-turn`'s `answer_policy_question` already makes the identical direct-fetch call today, unchanged by this PR (just relocated into the shared package). Either there's a production mechanism this review can't see from the code alone (a broader IAM binding, a VPC-internal allowance, etc.) making this a non-issue, or FAQ answering has been silently degraded in production for wizard-turn already, and this diff extends the same exposure to a second, more widely-mounted caller.

**Context:** `Services/shared/policy-retrieval/src/index.js`, `infra/terraform/modules/deployment/iam.tf`. Needs a human to verify the real prod call path (check Cloud Run logs for 403s on this route, or confirm the actual IAM bindings on user-service beyond what this diff's terraform shows). If genuinely missing, fix direction: add a `run.invoker` grant for package-service's and assistant-service's service accounts on user-service (mirroring the existing `gateway_invoker_*` pattern), or switch to routing this call through the gateway.

**Effort:** M (mostly investigation; the terraform fix itself is small)
**Priority:** P1
**Depends on:** None

### Unbounded public telemetry sink has no retention policy

**What:** `POST /api/v1/assistant/events` is public and unauthenticated (necessarily — it's anonymous visitor telemetry), and every call inserts one row into `crm_assistant.AssistantEvent` with no TTL, retention job, or consumer of the table anywhere in this diff. Per-IP rate limiting (`globalLimiter`, 300/15min, in-memory per gateway instance) doesn't bound total storage from a rotating-IP source, and Cloud Run scale-out multiplies the effective in-memory ceiling across instances.

**Why:** Flagged during `/ship`'s Claude adversarial review (confidence: architectural/ops, not a code defect). No action needed for phase-1 launch traffic, but worth a decision before the table grows unbounded in a shared database every other service also lives in.

**Context:** `Services/assistant-service/prisma/schema.prisma` (`AssistantEvent` model), `Services/assistant-service/src/controllers/events.controller.js`. Needs an ops decision: a scheduled purge/rollup job, sampling at ingest, or a Cloud Armor-style ingress filter — not a code-level fix this PR should silently invent.

**Effort:** M
**Priority:** P3
**Depends on:** None

### Shared per-IP rate limiter is CGNAT-unfriendly and gives no "slow down" affordance

**What:** `/assistant/turn` shares the 30-req/15min/IP `itineraryChatLimiter` bucket with the planner wizard, keyed on IP in an in-memory, per-gateway-instance store. Many real visitors behind mobile carrier CGNAT share one public IP; they collectively exhaust the shared bucket, and any one of them hitting the 429 sees only the generic "Failed to reach the assistant" banner — no rate-limit-specific messaging.

**Why:** Flagged during `/ship`'s Claude adversarial review (confidence: low at current phase-1 traffic volume, worth revisiting before the go/no-go bar's 2-week measurement window if traffic is meaningful).

**Context:** `Services/gateway/src/index.js` (`itineraryChatLimiter`), `Client/src/features/assistant/hooks/useAssistantChat.ts` (generic error message). Fix direction: consider a distinct rate-limit error message client-side (distinguishable from a genuine outage), and revisit limiter keying (session id instead of/alongside IP) if CGNAT contention shows up in real telemetry.

**Effort:** S
**Priority:** P3
**Depends on:** None

### fetchPolicyDocuments latency sits on the assistant-turn critical path

**What:** `assistant.controller.js` awaits `fetchPolicyDocuments()` before the Gemini call on every turn, including pure-navigation turns and turns whose message has no meaningful tokens (where the fetched documents are never consulted). The fetch carries a 3s timeout and only refreshes the 60s TTL cache on success, so a slow/unreachable user-service can add up to 3s of latency to every assistant turn across every public page. Compounding this: the cache is stamped only on a SUCCESSFUL fetch — every failure path (`!res.ok` and the catch) leaves `cachedAt` untouched, so during a sustained user-service outage past the 60s TTL, every single turn site-wide repeats the full 3s stall indefinitely (no negative caching).

**Why:** Flagged during `/ship`'s performance specialist review (confidence 4) and red-team review (confidence 3, non-blocking). Avoidable latency/availability coupling in steady state; a real outage-mode latency multiplier once the TTL expires during an incident.

**Context:** `Services/assistant-service/src/controllers/assistant.controller.js`, `Services/shared/policy-retrieval/src/index.js`. Fix direction: skip the fetch when the latest user message has no meaningful tokens; race it against a short budget that degrades to empty candidates (already routes to `FALLBACK_POLICY_MESSAGE`) instead of blocking the turn; and stamp a short negative-cache window on failure (e.g. `cachedAt = now` even on `!res.ok`/catch) so repeated failures during an outage don't each pay the full 3s timeout.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Client axios timeout can fire before a slow-but-successful Gemini turn completes

**What:** The shared axios client (`Client/src/services/http/config.ts`) times out at `VITE_API_TIMEOUT` (default 15s), but `generateStructured`'s own budget is 30s per attempt with up to `MAX_ATTEMPTS = 3` and 429 `RetryInfo` sleeps capped at 60s — a slow-but-eventually-successful Gemini call can run well past the client's abort point. The Cloud Run request keeps running (and billing) after the browser gives up; the visitor sees the generic error banner and may retry, launching a second billed call under the same 30/15min gateway limiter.

**Why:** Flagged during `/ship`'s red-team review (confidence 3). Pre-existing architectural characteristic shared by every AI-chat endpoint on this axios client (`wizard-turn`, `itinerary-chat`) — not introduced by this diff, but now also applies to `/assistant/turn`.

**Context:** `Client/src/services/http/config.ts`, `Services/assistant-service/src/ai/geminiClient.js` (and its package-service twin). Fix direction: give AI-chat endpoints a per-request axios timeout that covers the server's real worst-case budget, or shrink the server-side retry budget to fit under the client's default timeout and surface 429/503 as an immediate response instead of sleeping past the client's abort.

**Effort:** M
**Priority:** P3
**Depends on:** None

### Impression telemetry undercounts sessions that land on an excluded route first

**What:** `AssistantWidget`'s impression event fires once, gated on the FIRST pathname the component mounted with (`mountPathname` ref, set once). A visitor who lands on `/login`, `/my-account`, or a `/planner` deep link and then navigates (SPA, no remount) to an eligible page never fires an impression, even though the widget becomes visible.

**Why:** Flagged during `/ship`'s red-team review (confidence 3). Skews the design doc's own go/no-go denominator (impression→open rate) — real widget-exposure sessions go uncounted. Non-blocking since the go/no-go bar is itself a post-launch measurement, not a ship gate, but worth fixing before the 2-week measurement window starts.

**Context:** `Client/src/features/assistant/components/AssistantWidget.tsx`. Fix direction: re-evaluate eligibility on `location.pathname` changes (not just the mount pathname), firing the impression exactly once per session on the first transition into an eligible route.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Unit-level coverage gaps (non-blocking)

**What:** Three smaller unit-test gaps from the same coverage audit: `fetchPolicyDocuments`'s TTL-expiry-then-refetch branch (>60s) is untested (only the within-TTL cache-hit path is); `AssistantWidget`'s matched-FAQ snippet-quote render has no dedicated assertion; `useAssistantChat`'s declined-nav-derivation / `isSending` re-entry-guard / 20-message-window-trim branches are untested.

**Why:** None indicate a known bug — informational, low-risk, same class as the chatbot-lead-intake feature's own "Additional test coverage gaps" entry above.

**Context:** `Services/shared/policy-retrieval/src/index.js`, `Client/src/features/assistant/components/AssistantWidget.tsx`, `Client/src/features/assistant/hooks/useAssistantChat.ts`.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Fallback payload parity with wizard-turn (supportEmail/whatsappNumber)

**What:** `assistant-service`'s `answer_faq_policy` no-match fallback returns `{answered:false, fallbackMessage}` only. `wizard-turn`'s equivalent fallback also includes `supportEmail`/`whatsappNumber` (from `orgSettings`), which its client renders as contact links alongside the fallback text. `assistant-service` doesn't fetch `orgSettings` at all, so the visitor sees the same fallback text but no clickable contact info.

**Why:** Flagged during `/ship`'s plan completion audit (confidence high — verified against both controllers). Minor UX parity gap, not a correctness bug — the visitor-visible message text itself is identical and accurate.

**Context:** `Services/assistant-service/src/controllers/assistant.controller.js` vs `Services/package-service/src/controllers/wizard.controller.js`. Fix direction: have `assistant-service` also fetch `orgSettings` (same internal endpoint wizard-turn already uses) and include `supportEmail`/`whatsappNumber` in the fallback `serverResult`, then have `AssistantWidget` render them the same way `TripWizardPanel` does.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Granular AI Itinerary Generation

### Give generate-days-preview its own rate limiter

**What:** `POST /packages/generate-days-preview` currently shares `itineraryChatLimiter` (30/15min/IP) with the small chat/wizard endpoints, but a single call can generate up to 30 days (up to 21,800 output tokens plus up to ~90KB of existingDays context) — an order of magnitude more expensive per request than a chat turn.

**Why:** The design's rationale for sharing the limiter compared call *count* (a 14-day regen = 14 calls, well under 30) but never call *size*. An unauthenticated caller can burn far more billable Gemini tokens per request against the same per-IP ceiling than any other endpoint on this limiter permits.

**Context:** Flagged during `/ship` adversarial review on the `feat/granular-ai-itinerary-generation` branch (`Services/gateway/src/index.js`, `generate-days-preview` mount). The sibling `generate-itinerary-preview` endpoint — equally expensive per call — already has its own tighter `aiItineraryPreviewLimiter` (5/15min). Consider giving `generate-days-preview` the same tighter limiter, or a new one sized between the two, while leaving `generate-day-preview` (genuinely small, one day) on `itineraryChatLimiter`.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Validate model output alignment before positional mapping in generateDaysRangePreview

**What:** `generateDaysRangePreview` maps the model's returned `days` array onto the sorted requested `dayNumbers` purely by array position, trusting the model always returns a complete, ascending, non-skipping sequence when it returns fewer than requested.

**Why:** If the model ever omits a *middle* day of the requested set (e.g. asked for days [4,5,6,7] but returns only days 4, 6, 7), the current code silently shifts every day after the gap onto the wrong day number, merging mislabeled content with no error — and the client would then re-request the "missing" day and duplicate content.

**Context:** Flagged during `/ship` adversarial review, confidence 0.4 (requires model non-compliance beyond the already-handled truncation/`MAX_TOKENS` case). `Services/package-service/src/controllers/aiPackage.controller.js`, `generateDaysRangePreview`. Fix direction: validate `returned[i].dayNumber` is present and strictly increasing before assigning it to `sortedDayNumbers[i]`; drop only the misaligned tail rather than blindly assigning by position.

**Effort:** M
**Priority:** P3
**Depends on:** None

## Chatbot Inbound Lead Intake

### Verified contact-based lead merge (deferred security cut)

**What:** `intakeLead` originally dedupe'd a chat lead by email/phone/whatsapp against ANY existing Lead, so a returning visitor on a new device/session merged into their prior Lead. This was removed during `/ship`'s specialist security review: `contact` is fully attacker-controlled from the public, unauthenticated `wizard-turn` endpoint, so matching by contact alone let an anonymous caller merge into or overwrite a stranger's Lead (IDOR) — see `docs/designs/chatbot-inbound-lead-intake.md`'s Premise 5 addendum. Today, a returning visitor without their original session id (new device, cleared localStorage) forks a second Lead instead of merging.

**Why:** Restoring the cross-session merge safely requires proof the caller actually owns the contact info (e.g. an email confirmation link, an OTP sent to the phone/WhatsApp, or requiring the visitor to be authenticated). None of that exists today.

**Context:** `Services/lead-service/src/controllers/leadIntake.controller.js`. Flagged during `/ship`'s security specialist review on `feat/chatbot-lead-intake`, confidence 0.95 (concrete, demonstrated exploit path).

**Effort:** L
**Priority:** P1
**Depends on:** A verified-ownership mechanism (email confirmation link or OTP) for anonymous wizard visitors.

### Shared normalization helper for contact fields

**What:** `normalizeContact` in `leadIntake.controller.js` re-implements the exact email/phone/whatsapp normalization already inlined separately in `createWebsiteContactLead`, `handleFacebookLeadEvent`, `customizedPackage.controller.js`, and `manualItinerary.controller.js` — five call sites with subtle variations.

**Why:** A future change to normalization rules (e.g. international phone formatting) has to be made in five places or silently drifts.

**Context:** Flagged during `/ship`'s maintainability specialist review. Extract into one shared helper (e.g. `services/lead-normalize.js`) and have all five call sites use it.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Source-of-truth slot-to-message folding shared between create and merge

**What:** `buildCreateData` and `mergeSlotData` in `leadIntake.controller.js` both fold `duration`/`preferences` into the free-text `message` field, using different separators (`'; '` vs `' | '`) and duplicated label strings.

**Why:** A future slot field has to be added to both functions in sync, and the create vs. merge paths already format the message differently for the same data.

**Context:** Flagged during `/ship`'s maintainability specialist review. Extract a shared `foldExtrasToMessage` helper used by both.

**Effort:** S
**Priority:** P4
**Depends on:** None

### Additional test coverage gaps (informational, non-blocking)

**What:** `/ship`'s testing specialist and coverage audit flagged several untested branches, all informational/low-risk: `mergeSlotData`'s endDate-fold arithmetic (duration + existing travelDate), `useTripWizard`'s blank-send guard and double-submit drop, `loadOrCreateSessionId`'s localStorage-unavailable catch branch, `StatusChangeDialog`'s reject-with-empty-lostReason negative path for `PENDING_VERIFICATION`, `LeadFilters`' clear-search/chip-deselect controls, and `capture_contact`'s empty-string-field-drop behavior when merging into already-captured contact info.

**Why:** None indicate a known bug — they're untested edge cases a regression could silently break.

**Context:** Flagged during `/ship`'s testing specialist review and coverage audit (90% coverage, 5 gaps) on `feat/chatbot-lead-intake`.

**Effort:** M (collectively)
**Priority:** P3
**Depends on:** None

### Proper LeadPackageSelection linking for chat-selected packages

**What:** When a wizard visitor selects a package before the durable signal fires, `selectedPackageId` is folded into the free-text `message` field (`Selected package: <id>`) rather than creating a real `LeadPackageSelection` row — the pattern already used for `duration`/`preferences`, which also have no dedicated column.

**Why:** A claiming agent sees the package id as text but has to look it up manually instead of the lead already carrying a linked, priced package selection the way agent-created leads do.

**Context:** Flagged during `/ship`'s red-team review (confidence 9) as a "dead data path" before the message-fold mitigation was added. `Services/lead-service/src/controllers/leadIntake.controller.js`. Proper fix likely needs an HTTP call to package-service (cross-service, no direct DB access) to resolve `packageName`, mirroring `lead-draft.service.js`'s `fetchPackage` pattern, then create a `LeadPackageSelection` alongside the Lead.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Merge updated contact fields on repeat chat intake turns

**What:** `mergeSlotData` never updates `name`/`email`/`phone`/`whatsapp` on a repeat intake call for a still-`PENDING_VERIFICATION` lead — contact is create-only. If a traveler corrects a typo'd email mid-conversation, the CRM lead keeps the original value.

**Why:** The design doc's Implementation shape #7 says "merge new/changed slots," which is arguably contact-inclusive; as shipped it isn't, so the Client and the CRM record can disagree on which contact is authoritative.

**Context:** Flagged during `/ship`'s red-team review (confidence 7) as a design ambiguity, not a clear bug. `Services/lead-service/src/controllers/leadIntake.controller.js`, `mergeSlotData`.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Completed

### Honor Gemini's RetryInfo.retryDelay on 429 quota errors

**What:** `generateStructured`'s retry loop (`Services/package-service/src/ai/geminiClient.js`) treated `429` as retryable and backed off with a fixed `2^(attempt-1) * 500ms + jitter`, regardless of what Gemini actually asked for. Fixed by parsing the raw Gemini error body (JSON-stringified into `err.message` by the `@google/genai` SDK — confirmed against the installed SDK) for a `type.googleapis.com/google.rpc.RetryInfo` entry's `retryDelay` and sleeping that duration (capped at 60s) instead of the fixed backoff, specifically for 429s. 503s and timeouts keep the original fixed backoff.

**Context:** `Services/package-service/src/ai/geminiClient.js`. Landed alongside `docs/designs/site-wide-floating-assistant.md`'s `assistant-service` work — pulled forward because that design adds a 3rd caller of this same client, widening exposure to the previously-known-broken retry path.

**Completed:** v0.3.0.0 (2026-09-05)
