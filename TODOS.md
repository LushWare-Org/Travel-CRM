# TODOS

## Site-Wide Floating Assistant

### E2E coverage for cross-service assistant flows

**What:** A basic live-gateway contract smoke now exists in `Services/e2e-tests/client-contracts/assistantTurn.spec.js`, but several flows still need integration tests against a live stack rather than more mocked unit tests: nav round-trip through the real gateway (visitor asks to navigate → gateway → assistant-service → client chip → route change), Gemini/gateway-down banner recovery, telemetry funnel landing in Postgres (`assistant_impression` → `assistant_response` → `AssistantEvent` rows), and SPA navigation to `/planner` mid-conversation (widget must not re-fire an impression event).

**Why:** These cross real service boundaries (Client → gateway → assistant-service → Postgres) that mocked unit tests can't exercise faithfully — exactly the class of flow `Services/e2e-tests/` already exists for (per CLAUDE.md: "driving real HTTP calls through the Gateway against a fully running local microservices stack").

**Context:** The PR1 contract smoke covers one recognized outcome through the gateway; extend `Services/e2e-tests/` for the remaining flows, following the existing per-run-marker/cleanup convention.

**Effort:** M
**Priority:** P2
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

### Planner AI turns can outlive the client timeout

**What:** The shared axios client (`Client/src/services/http/config.ts`) still defaults to `VITE_API_TIMEOUT` (15s), while the planner's `wizard-turn` and `itinerary-chat` paths can spend up to 30s per Gemini attempt, retry transient failures, and sleep on Gemini `RetryInfo` delays. A slow-but-eventually-successful planner call can outlive the browser request; the visitor sees the generic error banner and may retry while the Cloud Run request keeps running and billing.

**Why:** Flagged during `/ship`'s red-team review (confidence 3). PR1 fixed this failure mode for `/assistant/turn` with an endpoint-specific 30s client timeout, a 27s server deadline, one resolver attempt, and `retry:false`; the remaining gap is limited to the existing planner AI endpoints.

**Context:** `Client/src/services/http/config.ts`, `Client/src/services/api/wizardTurn.ts`, `Client/src/services/api/itineraryChat.ts`, `Services/package-service/src/ai/geminiClient.js`. Fix direction: give planner AI endpoints per-request timeouts that cover their real server budget, or shrink their server-side retry budget to fit under the client's default timeout and surface 429/503 immediately instead of sleeping past the browser's abort.

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

## Client Rewamp

### booking-service: real availability check + cross-service rollback

**What:** `createWebsiteBooking` (`Services/booking-service/src/controllers/booking.controller.js:180-281`) has no availability/inventory check before creating a booking — no query against remaining slots or date conflicts. Its only rollback is a manual `booking.delete` if `createLead` throws, which doesn't cover the auto-assign-sales-rep or email side effects, and there is no cross-service saga at all.

**Why:** Flagged during `/plan-eng-review` on `docs/CLIENT-REWAMP-PLAN.md` (Client rewamp Phase 4). The rewamp plan's own state table originally specified UI for "availability conflict" and "full success or full rollback," but the backend has neither — Phase 4's UI has been scoped down to a generic retry message instead of a false specific claim, pending this fix.

**Context:** `Services/booking-service/src/controllers/booking.controller.js`, potentially `Services/billing-service`, `Services/lead-service` for the cross-service saga piece. Needs a real availability check (against package capacity/date blocking, if that concept exists elsewhere in package-service) and either a proper compensating-transaction saga or an idempotency-key + reconciliation approach across the three services involved in one booking.

**Effort:** L
**Priority:** P2
**Depends on:** None

### user-service: saved-traveler-profile for returning-visitor pre-fill

**What:** No saved-traveler or past-destination data model exists on `user-service` today (searched `Services/user-service/src` — no matches for `savedTraveler`/`pastDestination`/`preferredDestination`/`travelerProfile`).

**Why:** Flagged during `/plan-eng-review` on `docs/CLIENT-REWAMP-PLAN.md`. The rewamp's Journey section wants a logged-in returning visitor's planner to pre-fill from their account. Phase 4 ships a narrower version now (pre-fill from the visitor's most recent booking via `booking-service`'s existing `getUserBookings`, zero new backend work) — this TODO is the fuller version: an explicit saved-traveler profile (name/DOB/passport-adjacent fields, preferred destination) beyond what one past booking implies.

**Context:** `Services/user-service`. New schema + endpoints. Not blocking Phase 4 — the most-recent-booking pre-fill ships without it.

**Effort:** M
**Priority:** P3
**Depends on:** None

### Client: remove the invalid shared hero image priority prop

**What:** `HeroBackground` forwards a camelCase `fetchPriority` prop into React 18.2's DOM renderer, which logs an unknown-prop warning on every page using the shared hero.

**Why:** Deferred from Phase 9 design review FINDING-006. Rendering succeeds, so this is technical polish rather than a release blocker, but a clean browser console makes real runtime faults easier to spot.

**Context:** `Client/src/components/shared/HeroBackground.tsx`.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Client: converge decorative gradients on the documented color system

**What:** Header, planner, package, and package-detail surfaces still mix green-to-gold and occasional cool-blue gradients despite `Client/DESIGN.md` specifying green interactive fills with gold reserved for highlights.

**Why:** Deferred from Phase 9 design review FINDING-007. The current UI remains readable and functional, but the drift weakens cross-page consistency and increases the AI-generated feel.

**Context:** Audit each rendered use before changing it; preserve image overlays and functional contrast gradients.

**Effort:** M
**Priority:** P3
**Depends on:** None

### Career fixtures: make repeated seeding idempotent

**What:** The real vacancies endpoint currently returns 22 rows, including five copies of four exact roles under distinct UUIDs. `Services/seed-extended.mjs` creates fresh IDs, so `createMany({ skipDuplicates: true })` cannot prevent duplication.

**Why:** Deferred from Phase 9 design review FINDING-008. The repeated cards damage trust and make the page unnecessarily long. Client-side title deduplication would mask the source defect.

**Context:** Give vacancy fixtures deterministic unique keys or replace the fixture set transactionally, then clean duplicate development rows.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Client: complete content and deployment polish

**What:** About has a long origin-story block and inconsistent team portraits; Contact renders no street address when its environment value is absent; the homepage repeats a centered-heading/card-row composition across many sections.

**Why:** Deferred from Phase 9 design review FINDING-009. These are editorial and deployment-input issues, not code correctness defects, but they limit the final premium impression.

**Context:** Requires approved team imagery/copy and a production address value before implementation.

**Effort:** M
**Priority:** P4
**Depends on:** Approved content and deployment configuration

## Management Context Copilot

### Proactive AI review queue

**What:** Add a cross-lead queue of real AI review records for stale leads, missing follow-ups, contradictions, and high-intent opportunities. Each review needs source evidence, freshness, status, dismiss/resolve behavior, and routing into the specialized workspace dock.

**Why:** This is the chosen ten-times return loop. It gives operators a truthful reason to reopen Copilot without fake unread counts or decorative engagement prompts.

**Pros:** Creates recurring value across workspaces and turns verified per-record attention into an actionable management workflow.

**Cons:** Requires a review data model, generation schedule, deduplication, lifecycle semantics, permissions, filtering, and noise controls.

**Context:** Deferred by the Evidence Lens design review so the first specialized lead module can prove briefing trust, evidence reveal, and visibility behavior before collection-level intelligence is introduced.

**Effort:** L
**Priority:** P2
**Depends on:** Approved lead Evidence Lens implementation; real-agent usability result; review lifecycle and freshness design

### Confirmed action-taking copilot

**What:** Let specialized workspace claims offer relevant CRM actions such as drafting a follow-up, updating an allowed field, or scheduling a next step, with explicit preview and confirmation before every write.

**Why:** Converts verified understanding into operator outcomes while keeping the human in control of business-data changes.

**Pros:** Reduces context switching and attaches each proposed action to the evidence and claim that justified it.

**Cons:** Changes the read-only security boundary and requires authorization, idempotency, audit history, reversal/compensation, and failure recovery.

**Context:** The Evidence Lens design keeps this out of the first module. Start only after agents trust briefing accuracy and a separate write-action threat model and contract are approved.

**Effort:** XL
**Priority:** P3
**Depends on:** Proven Evidence Lens briefing; approved write-action security design; audit and rollback contracts

### Scoped cross-page Copilot working memory

**What:** Allow operators to carry explicitly pinned evidence or unfinished questions between specialized workspace modules while keeping every answer visibly bound to its originating page and record scope.

**Why:** A product-wide Copilot can preserve useful work across navigation, but implicit transcript carryover would create stale or misattributed context.

**Pros:** Reduces repeated questioning and makes the shared shell feel continuous after multiple real workspace modules exist.

**Cons:** Requires explicit scope labels, expiry, pin/unpin behavior, stale-data handling, privacy rules, and conflict behavior when the active record changes.

**Context:** Separate from moving the shell into the protected layout. The default remains session isolation until at least two specialized modules prove a real continuity need.

**Effort:** L
**Priority:** P3
**Depends on:** At least two specialized workspace modules; approved memory scope/expiry design; stale-context tests

### Audited related evidence for richer lead briefings

**What:** Add authenticated, allowlisted evidence from payment, invoice, itinerary, and communication services so lead claims can truthfully cite deposit status, travel deadlines, and recent client interactions.

**Why:** The approved Evidence Lens sketch demonstrates this richer operational briefing, but the current adapter only exposes lead-record fields.

**Pros:** Makes attention claims more actionable and lets evidence reveal connect the lead briefing to the full travel-sales workflow.

**Cons:** Adds cross-service latency, authorization, partial-failure, data-minimization, and field-level source-contract work for each service.

**Context:** Do not implement from the mockup alone. Audit each endpoint under the caller's identity, define allowed fields and latency budget, then add one source at a time with no-access and unavailable-source tests.

**Effort:** L
**Priority:** P2
**Depends on:** Proven lead-record Evidence Lens; per-service endpoint and permission audit; partial-failure budget

### Operational lead fields and attention rules for the briefing

**What:** Extend the leads evidence allowlist to the lead-owned operational fields — `travelDate`, `endDate`, `numberOfTravelers`, `priority`, `followUpDate` — and add deterministic attention rules that use them, such as travel-date proximity and an overdue follow-up date.

**Why:** The first Evidence Lens release briefs only on lifecycle status, destination, budget, assignment, and the created/updated timestamps, so the “Needs attention” section stays thin for most leads even though the record already holds the fields agents act on.

**Pros:** Makes attention operationally useful, gives the model real material, and gives the Evidence Lens fields worth verifying.

**Cons:** Requires explicit product thresholds (how near a travel date counts as attention) plus insight rules, tests, and evaluation fixtures.

**Context:** Flagged by the independent plan review outside voice during `/plan-eng-review` on `feat/management-context-copilot`. All five fields are lead-owned, so no new endpoint or cross-service read is needed — the work is thresholds and rules, following the field-level evidence contract that ships first.

**Effort:** M
**Priority:** P2
**Depends on:** Landed Evidence Lens with field-level evidence IDs and boundary-aware `changed` insights

### Non-modal tablet and phone drawer for field reveal

**What:** Replace the modal `CopilotDrawer` below `xl` with a non-modal surface, or otherwise let the record stay interactive, so the evidence reveal interaction works on tablet and phone.

**Why:** Field reveal is scoped to `xl` and above because `Management/src/components/ui/dialog.tsx` composes Base UI's modal dialog, which makes the record behind the drawer inert. Below `xl` the evidence action falls back to the inline detail.

**Pros:** Extends the design's signature interaction to every viewport and removes the viewport caveat from the reveal success criterion.

**Cons:** A non-modal drawer must own dismissal, backdrop, scroll-lock, outside-click, and focus-restoration behavior that the modal dialog currently provides, plus its own accessibility verification.

**Context:** Deferred during `/plan-eng-review` on `feat/management-context-copilot` after confirming the modal constraint. The real fix is drawer modality, not a reveal bug — do not simply flip `modal={false}` without the replacement behavior.

**Effort:** M
**Priority:** P3
**Depends on:** Landed Evidence Lens; a measured need from tablet or phone agents

## Completed

### Honor Gemini's RetryInfo.retryDelay on 429 quota errors

**What:** `generateStructured`'s retry loop (`Services/package-service/src/ai/geminiClient.js`) treated `429` as retryable and backed off with a fixed `2^(attempt-1) * 500ms + jitter`, regardless of what Gemini actually asked for. Fixed by parsing the raw Gemini error body (JSON-stringified into `err.message` by the `@google/genai` SDK — confirmed against the installed SDK) for a `type.googleapis.com/google.rpc.RetryInfo` entry's `retryDelay` and sleeping that duration (capped at 60s) instead of the fixed backoff, specifically for 429s. 503s and timeouts keep the original fixed backoff.

**Context:** `Services/package-service/src/ai/geminiClient.js`. Landed alongside `docs/designs/site-wide-floating-assistant.md`'s `assistant-service` work — pulled forward because that design adds a 3rd caller of this same client, widening exposure to the previously-known-broken retry path.

**Completed:** v0.3.0.0 (2026-09-05)

### Verify assistant-service can reach user-service in Cloud Run

**What:** Confirm the deployed assistant-service identity can call user-service through Cloud Run before enabling conversational outcomes.

**Context:** The live assistant-service → user-service authenticated call path was confirmed during the v0.4.0.0 ship review.

**Completed:** v0.4.0.0 (2026-09-09)
