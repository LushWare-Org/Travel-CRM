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

### The conversation cannot tell that the visitor changed pages

**What:** Nothing tells the assistant that the visitor navigated outside the chat. History, the package under discussion and the names a browse answer lists are all snapshots taken from the turns themselves; if the visitor clicks a package card, the header navigation or a destination link mid-conversation, the next turn is answered as if the page had not changed. Listing package names in the browse reply makes this sharper, because the assistant will discuss a package the visitor has already left.

**Why:** A visitor who follows the site's own navigation instead of the chat's chip is invisible to the conversation, so a follow-up can be answered against a page they are no longer on — a stale-context bug with no visible cause.

**Context:** The channel is designed and unbuilt. `docs/designs/client-assistant-action-infrastructure.md` specifies `currentView` (`{ path, params, filteredCount, renderedCount, catalogueTotal }`) sent by the client every turn and consumed by a planned `answer_current_view` outcome, with the manifest treated as untrusted input (that document's untrusted-input premise). No code sends it today — `currentView` matches only that design doc. When built: `Client/src/features/assistant/hooks/useAssistantChat.ts` reports the view, `Services/assistant-service/src/validators/assistant.schema.js` declares it (zod strips what is not declared), `assistantTurn.v1.js` gets the union member plus canonicalizer and prompt changes, `assistant.controller.js` gets the dispatch case and its server-composed copy, and the client and server tool enums both learn the new outcome.

**Effort:** M
**Priority:** P2
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

### Merge the flights and hotels descriptors if a third booking-like page appears

**What:** `flights` and `hotels` are written as two separate page descriptors with the same shape — a windowed booking list, differing only in field names and deadline semantics. Collapse them into one parameterized descriptor when and only when a third booking-like page is added.

**Why:** Two instances with different field sets is exactly where premature abstraction starts, so they ship as two. But a third copy is the point where the duplication costs more than the abstraction would, and without a recorded trigger the third page gets written as a third copy by default.

**Pros:** Stops the descriptor set drifting into N near-copies of the same booking-list logic, each with its own rule bugs to fix separately.

**Cons:** A parameterized descriptor will carry more branching than either instance does alone, so it is a loss if no third page ever arrives.

**Context:** Raised during `/plan-eng-review` on `docs/designs/management-copilot-all-pages.md` (issue 7, confidence 6/10). The trigger is concrete: a third descriptor whose sources are a bounded, ordered list of booking-like records.

**Effort:** S
**Priority:** P3
**Depends on:** A third booking-like page actually existing

### Collection briefings that respect the page's active filters

**What:** v1 sends `{}` as the collection scope for every page, so the briefing describes the page's default view rather than the list the operator has filtered to. Add validated filter scopes per page so the briefing describes what is actually on screen.

**Why:** A briefing that describes a different list than the one rendered is worse than no briefing — it reads as authoritative while being about something else. This was deferred rather than partially wired because a scope the adapter rejects produces the exact `400 Invalid leads scope` the collection work set out to remove.

**Pros:** Makes every count and attention item match the visible list, which is the precondition for an operator trusting the panel while filtering.

**Cons:** Each descriptor needs a filter scope schema that mirrors the page's real filter state, and every filter the page gains becomes a schema to keep in sync.

**Context:** Deferred during `/plan-eng-review` on `docs/designs/management-copilot-all-pages.md` (Open Question 1). The leads union in §5 is deliberately strict — `{ leadId } | {}` — so filter scopes require a real schema on the collection branch, not an opaque object.

**Effort:** M
**Priority:** P2
**Depends on:** The all-pages collection work landing

### Per-page ask-mode tool vocabulary

**What:** Finish declaring ask-mode tools per page. The panel-hardening slice shipped the seam — a descriptor `tools` list, `askTools(scope)` on every adapter, and `runAgentLoop` resolving the vocabulary from the parsed scope — plus two read tools (`listLeads`, `listInvoices`), so `/leads` and `/billing` can now fetch data the briefing bundle does not contain. The remaining work is declaring tools on the other eight page keys and adding reads beyond the two list tools. A page declaring none still answers single-shot over the evidence already fetched.

**Why:** The seam is the hard part, and it has landed; the vocabulary is what makes the ask box worth using on a page. On the eight page keys that declare nothing, "what did we quote them last quarter" is still unanswerable, because the bundle is all the model may read.

**Pros:** Turns the assistant on each page from a briefing with follow-ups into something that can actually investigate, which is where the ten-times-return value sits.

**Cons:** Each tool is a new allowlisted, Zod-validated, server-executed call under the caller's identity — a real per-page design and review, not a config change.

**Context:** Deferred during `/plan-eng-review` on `docs/designs/management-copilot-all-pages.md` (§6, outside-voice finding 4). The seam landed on `feat/management-copilot-panel-hardening` (see `docs/designs/management-copilot-panel-hardening.md` §4) and reuses the existing `assistantTurn`/`wizard-turn` tool-calling convention (fixed enum, server-executed, Zod-validated, canonicalized), so this stays additive rather than a new framework. `runAgentLoop` now receives `adapter.askTools(scope)`, so adding a tool is a descriptor declaration plus a registry entry, not a controller change.

**Effort:** L
**Priority:** P2
**Depends on:** Per-descriptor tool design for the remaining eight page keys (the `tools` seam and two tools have landed)

### Interrogable briefing: promptable claim rows

**What:** Make each briefing claim row a prompt. An `Ask why this` affordance on a claim submits a turn carrying that claim's own `evidenceIds`, so the answer is grounded against evidence already on screen, and the Needs attention list becomes the agent's open loop rather than a wall of prose.

**Why:** The strongest idea surfaced in the 2026-09-11 panel-hardening session, from the independent model read. Today the conversation is a box below the briefing, and the operator has to re-describe what they are looking at. Carrying the claim's evidence ids makes the turn self-grounding and makes the briefing the entry point to the agent, which is what "act as a real agent copilot" actually requires.

**Pros:** Zero re-description, since the question arrives with its scope and citations attached. Turns the briefing into the agent's interface rather than a report with a chat underneath it. Reuses the existing turn endpoint, the claim shape, and `evidenceIds`; no new transport.

**Cons:** A new interaction surface needing its own focus, keyboard, and accessibility pass. Prompt affordances can crowd the briefing hierarchy that the Evidence Lens design deliberately ranked first. The turn request needs an optional originating-claim field.

**Context:** Deferred during `/plan-eng-review` on `docs/designs/management-copilot-panel-hardening.md` (approach C, "Interrogable briefing") because it is a new interaction rather than a fix, and that change set was already ~20 files. Its substrate has landed: the conversation lives in the shell so it renders on every scope, the page-scoped tool seam exists (`adapter.askTools(scope)`), and the shared briefing logic is extracted. Start it once the panel-hardening slice has real agent usage behind it.

**Effort:** L
**Priority:** P3
**Depends on:** Landed panel-hardening slice (shell-owned conversation + page-scoped ask tools); an optional originating-claim field on `ManagementAssistantTurnRequest`

### Generate the collection briefing mockups

**What:** Produce visual mockups of the copilot panel with the gstack designer. Covers the collection briefing (claim list, inline status row, empty state) **and** the surfaces that `docs/designs/management-copilot-panel-hardening.md` specifies in text only: the floating desktop trigger sitting beside the retained rail, the attention marker's dot-plus-glyph treatment, and the combined briefing-plus-conversation column with its sticky composer.

**Why:** `/plan-design-review` on `docs/designs/management-copilot-all-pages.md` ran text-only because the designer binary has no API key configured, so the panel's visual design was described and reviewed but never rendered. The same happened again on `docs/designs/management-copilot-panel-hardening.md`, where `$D generate` returned verbatim: `No OpenAI API key found. Run: $D setup ... or set OPENAI_API_KEY`. Anyone reading either doc later would reasonably assume the visuals were validated. Nothing is blocked by this, since both specs are precise enough to build from; the risk is a specification that is right in words and wrong on screen, which only a rendered check catches.

**Pros:** Turns the state contract, claim form, and severity discipline into something reviewable at a glance, and catches layout problems while they are still plan-stage.

**Cons:** Requires an OpenAI API key (`$D setup`), and the mockups then have to be re-checked against `Management/DESIGN.md` tokens rather than trusted as-is.

**Context:** Run `$D setup` in the gstack design package, then `$D variants --brief <collection briefing brief>`. The design decisions to render are recorded in the design doc's `## Design decisions` section.

**Effort:** S
**Priority:** P3
**Depends on:** A configured designer API key

### Surface briefing freshness in the panel

**What:** The client cache permits a briefing to be up to 60 seconds stale, and nothing on screen says so. Decide whether the context stamp's `as of` time is sufficient, or whether near-expiry needs a visible marker.

**Why:** The panel presents itself as "current state". A briefing served from cache can be a minute old, and an operator acting on a stale number has no way to know. The existing design accepts the 60s bound but never surfaces it.

**Pros:** Closes a small but real trust gap on a surface whose entire value is being believable, and it is cheap once the wording is decided.

**Cons:** Any freshness indicator risks reading as a warning on every load, which would be worse than the silence it replaces.

**Context:** The bound comes from the client's in-memory cache keyed by scope fingerprint. The server-side `asOf` stamp is already authoritative; the question is only whether the user is told when the value they are reading is old. Decide alongside the server-side TTL work rather than before it.

**Effort:** S
**Priority:** P3
**Depends on:** The collection briefing landing; a decision on the server-side TTL

### Section collapse behaviour at high claim volumes

**What:** Decide whether the four briefing sections collapse, and what the default is when a collection page produces twenty or more claims.

**Why:** The state contract specifies a list that can be arbitrarily long, and nothing says whether the reader scrolls it, folds sections, or sees a summary with an expand. Guessing wrong makes the panel either a long scroll or a set of closed drawers nobody opens.

**Pros:** Long panels are the most common reason people stop opening an assistant; deciding this deliberately keeps the top of the panel meaningful.

**Cons:** Designing collapse honestly needs real claim volumes from a live page, which do not exist yet — designing it now would be guessing.

**Context:** Deferred from `/plan-design-review` Pass 7 on `docs/designs/management-copilot-all-pages.md` for exactly that reason. The section order is settled (attention leads on collections); only the folding behaviour is open.

**Effort:** S
**Priority:** P3
**Depends on:** Real claim volumes from at least one live collection page

### Run the Playwright suite in CI

**What:** Add a GitHub Actions job that boots the stack and runs `cd Management && npm run test:e2e` on PRs targeting `microservices`.

**Why:** `Management/e2e/` never runs in CI — `.github/workflows/` has no Playwright step. Three tests were red from the commits that wrote them: `auth/login.spec.js` still expected a salesRep to land on `/` after `ce651b2` deliberately sent agents to `/leads`; `copilot.spec.js` expected an evidence chip to read "not captured" at a moment when the briefing does supply a field value; and `lead-lifecycle.spec.js` still clicked Invoice as a direct row child after `01043f6` moved it into a "More actions" popover. All three were only found when the panel-hardening branch repaired them, and the horizontal-scroll regression that branch fixes had no X-axis assertion for the same reason.

**Pros:** Makes the browser suite an actual gate, so a stale assertion fails loudly instead of rotting unnoticed; the X-axis assertion then protects the wrap contract permanently.

**Cons:** The suite needs the full stack and a seeded database, which is real pipeline setup and a slow, potentially flaky job unless the harness is tuned.

**Context:** Deferred during `/ship` on `docs/designs/management-copilot-panel-hardening.md`, which repaired the three stale tests; only the CI wiring is outstanding. `Services/e2e-tests/` has the same gap.

**Effort:** M
**Priority:** P1
**Depends on:** A CI-runnable stack (database + services), or a recorded decision to run the suite on a schedule instead of per-PR

### Reuse the invoice page across one ask

**What:** Cache the `listInvoices` upstream page for the lifetime of a single ask, so a model that calls the tool more than once does not re-fetch and re-sort up to 1000 rows per call.

**Why:** `listInvoices` must fetch a capped page and filter/sort locally, because billing-service cannot filter by `paymentStatus` or order by `dueDate` (`getAllInvoices` hardcodes `createdAt desc`). The loop permits four tool calls, so a repeated call pays the whole page cost again.

**Pros:** Cuts latency and upstream load on the heaviest tool, and the full-page read stays so correctness is unchanged.

**Cons:** Adds per-request cache state plus a lifetime question — what invalidates it, and whether a cached page may outlive its turn.

**Context:** Found by the performance specialist during `/ship` review of `docs/designs/management-copilot-panel-hardening.md`. The per-comparison `dueDate` re-parse was fixed in the same review (decorate-once sort); this is the remaining half.

**Effort:** S
**Priority:** P2
**Depends on:** Nothing, or a billing endpoint that can filter by payment status and order by due date, which would remove the need entirely

### Copilot collapsed-state polish

**What:** Two cosmetic findings from the same review — move the `xl`+ floating `CopilotTrigger` clear of the rail's 40px column instead of letting it straddle the rail's `border-l` edge, and drop the unused `export` on `COPILOT_TRIGGER_LABEL` (nothing imports it; `COPILOT_RAIL_LABEL` is the one with a consumer).

**Why:** Both are small incoherences a reader notices: one control crossing the other's edge at `xl`+, and an exported constant with no importer that reads as load-bearing.

**Pros:** Cheap, and removes two "is this deliberate?" moments from the copilot surface.

**Cons:** The offset is a visual taste call never seen rendered — the design pass ran text-only with no designer API key — so changing it now trades one unverified layout for another.

**Context:** Found by the design and simplification specialists during `/ship` review. Nothing is occluded by the current position: the rail's control and marker sit at the top, the trigger at the bottom.

**Effort:** S
**Priority:** P3
**Depends on:** A rendered look at 1280px, or the designer API key so the panel can be visualised

## Copilot Capability Plan (eng review 2026-09-12)

Deferred during `/plan-eng-review` on `docs/designs/actionable-insight-ranking-and-quality-gate.md` and `docs/designs/copilot-question-driven-capability.md`. Each carries the reasoning, because these were decisions rather than omissions.

### Decision-log retention window plus the scheduler it needs

**What:** Decide the retention window for the new insight decision log (one row per candidate per page load), then build the periodic job that enforces it: Supabase `pg_cron` or Cloud Scheduler targeting a Cloud Run Job.

**Why:** The decision log is written at page-load frequency, which is faster than `AssistantEvent` already grows, and `AssistantEvent` has no retention at all today. The ranking design makes the retention window a gate on phase 2, so this decision blocks a phase rather than an idle concern.

**Context:** `AssistantEvent` (prisma/schema.prisma) is the precedent: an eternal sink with no purge, no rollup and no consumer, flagged P3 in this file under Site-Wide Floating Assistant. The new log has the same shape but higher volume. There is no scheduler, worker or queue anywhere in the stack, and services run with `min_instances = 0`, so the job has to be an external trigger, not an in-process timer. The eng review decided (PERF-2/3A) that only candidates reaching L3+ are logged, which reduces but does not remove the growth. Start here: `docs/designs/actionable-insight-ranking-and-quality-gate.md` §9.4 and its phase table.

**Effort:** M
**Priority:** P1
**Depends on:** Stable keys and the decision log landing (phase 0); the retention window must be decided before phase 2 writes suppression state.

### Contract drift test across the service and client schemas

**What:** A CI test that parses one canonical fixture through both the service's response schema and the Management client's schema, failing the build when they diverge.

**Why:** The approved rollout is lockstep: the contract rename and the reshaped response ship together, across both halves, with downtime tolerated. The two halves do not share deploy machinery (Management ships via Firebase Hosting, the service via Cloud Run), so nothing enforces the ordering and no build-time check exists. Drift would present as a broken panel on every turn, which reads as an outage rather than a version mismatch.

**Context:** Decided during `/plan-eng-review` as option 4C with the safeguard declined (downtime accepted). The replacement guard is the mandatory post-deploy smoke check in the capability doc's Success Criteria; this TODO is the durable fix that would catch the next contract change before it ships. Schemas to compare: `Services/shared/contracts/src/managementCopilot.js` and `Management/src/features/copilot/types.ts`.

**Effort:** S
**Priority:** P2
**Depends on:** The contract v2 fields landing.

### Decide whether the 200-row fail-closed truncation should change

**What:** Decide whether a paged collection source should keep failing closed when its read is truncated, and if not, what it should do instead.

**Why:** `leadsCollection` pages at 200 rows with a `pagination.total` probe, and `collectionEngine` fails the whole source when the total exceeds the rows fetched. So past 200 leads the source is reported `unavailable`, and the operator sees "partially loaded, 1 sources unavailable" for what is actually a page-size limit. The message misdiagnoses a configured cap as an outage, and the same banner is used for a genuinely dead service.

**Context:** `Services/assistant-service/src/adapters/collectionEngine.js` (the truncation probe) and `src/adapters/pages/leadsCollection.adapter.js` (`PAGE_LIMIT`, `paging.totalPath`). The aggregate work routes around it by grouping over loaded rows and threading the upstream total, so this is not a blocker for that work; changing it would alter panel semantics for every paged source, which is why it is its own decision. Related: the eng review added per-source failure reasons to the panel so this case reports a reason rather than a count.

**Effort:** M
**Priority:** P2
**Depends on:** None, but it should be decided before more pages are added to the copilot.

### Named rubric owner per page before derived severity ships

**What:** For each page, name the person who signs off the criticality bands (impact dimensions and thresholds) before derived severity replaces the literal `severity` values.

**Why:** The ranking design's §6.5 makes severity a derived business judgement rather than a literal a developer typed once. That only holds if someone who knows why a missed ticketing deadline costs more than a missing package description owns the bands. Without an owner, deriving severity from conservative defaults would downgrade most `warning` rules to `info`, and the severity floor would then drop them from the panel entirely.

**Context:** Deferred during `/plan-eng-review`; phases 0 to 2 ship on today's literal severities, and §6.5 is adopted per page afterwards. Impact dimensions to classify per rule: `externalImpact`, `irreversibility`, `commitment`, alongside the existing `severity`, `days` and `threshold`. The divergence between a model-emitted severity and the derived band is the calibration signal once this lands. Start with the pages that already carry criticals: `billing` and `flights`.

**Effort:** M
**Priority:** P2
**Depends on:** The derived-band function and the impact-dimension declarations landing.

### Propagate x-request-id on assistant-service outbound fetches

**What:** Forward the caller's `x-request-id` on every outbound fetch the assistant makes to domain services, alongside the `x-user-*` headers it already forwards.

**Why:** `forwardActorHeaders` sends only `x-user-*`, so every evidence read and tool call reaches lead-service, billing-service and the rest without the assistant's correlation id, and each downstream service mints a fresh one. The result is that a tool read cannot be joined to the turn that made it, which defeats the decision log and the per-step trace rows the plan adds for exactly this purpose.

**Context:** `Services/assistant-service/src/middleware/auth.js` (`forwardActorHeaders`) and `src/tools/toolRegistry.js` (`fetchJson` sends `{...ctx.headers, content-type, auth}`). The gateway solves the same problem by mutating `req.headers['x-request-id']` so the proxy forwards it; assistant-service's own `correlationId` copy sets only `req.requestId` and the response header. Small, self-contained, and worth shipping alongside the first instrumentation task.

**Effort:** S
**Priority:** P2
**Depends on:** None.

## Completed

### Honor Gemini's RetryInfo.retryDelay on 429 quota errors

**What:** `generateStructured`'s retry loop (`Services/package-service/src/ai/geminiClient.js`) treated `429` as retryable and backed off with a fixed `2^(attempt-1) * 500ms + jitter`, regardless of what Gemini actually asked for. Fixed by parsing the raw Gemini error body (JSON-stringified into `err.message` by the `@google/genai` SDK — confirmed against the installed SDK) for a `type.googleapis.com/google.rpc.RetryInfo` entry's `retryDelay` and sleeping that duration (capped at 60s) instead of the fixed backoff, specifically for 429s. 503s and timeouts keep the original fixed backoff.

**Context:** `Services/package-service/src/ai/geminiClient.js`. Landed alongside `docs/designs/site-wide-floating-assistant.md`'s `assistant-service` work — pulled forward because that design adds a 3rd caller of this same client, widening exposure to the previously-known-broken retry path.

**Completed:** v0.3.0.0 (2026-09-05)

### Verify assistant-service can reach user-service in Cloud Run

**What:** Confirm the deployed assistant-service identity can call user-service through Cloud Run before enabling conversational outcomes.

**Context:** The live assistant-service → user-service authenticated call path was confirmed during the v0.4.0.0 ship review.

**Completed:** v0.4.0.0 (2026-09-09)

### Run the live assistant-router eval replay once the quota allows

**What:** Run `cd Services/assistant-service && npm run eval:router -- evaluation/assistant-router.synthetic.v1.jsonl` (or an approved sanitized corpus) once Gemini quota permits, and compare the router's choices against the corpus expectations.

**Why:** `docs/designs/client-assistant-action-infrastructure.md` changes `allowedFinalTools`, the tool-vocabulary lists and `CORE_TOOLS`, so the router's behaviour changed. Only the offline `--validate-only` path can run here: a live replay attempt on 2026-09-12 over 34 rows returned `AI request timed out` from `Services/assistant-service/src/ai/geminiClient.js:55` for every row inside the 1.5-second per-row budget, leaving latency and cost metrics null. The corpus is well formed but the router's actual choices are unverified. Per `CLAUDE.md:44-45`, synthetic rows are development fixtures only and never count as production enablement evidence, so even a green synthetic replay would not authorise rollout on its own.

**Context:** Update the corpus in the same branch that changes `allowedFinalTools`, then run this. Raised by `/plan-eng-review` as part of the deployment-compatibility finding and confirmed against `CLAUDE.md`.

**Effort:** S
**Priority:** P2
**Depends on:** A raised Gemini quota plus an approved, already-sanitized corpus.
