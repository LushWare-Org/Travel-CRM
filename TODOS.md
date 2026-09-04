# TODOS

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

## AI Infrastructure

### Honor Gemini's RetryInfo.retryDelay on 429 quota errors

**What:** `generateStructured`'s retry loop (`Services/package-service/src/ai/geminiClient.js`) treats `429` as retryable and backs off with a fixed `2^(attempt-1) * 500ms + jitter` (≈500ms then ≈1s, capped at `MAX_ATTEMPTS = 3`), regardless of what Gemini actually asks for. A quota-exhausted `429` response includes a `RetryInfo.retryDelay` (e.g. `"27s"`) in `err.details` — the fixed backoff is nowhere close, so all 3 attempts are exhausted well before the quota window Google names, and the request fails with a generic "AI generation failed" every time a quota 429 occurs, rather than actually waiting the suggested duration and succeeding.

**Why:** Observed live: `gemini-3.5-flash` free-tier quota (20 requests/day) exhausted mid-development, both `wizard-turn` and `itinerary-chat` 502'd identically with no indication in the client-facing error that this was a quota issue vs. a real failure, and the retry loop's backoff couldn't have survived it even if attempts were unlimited (they're capped at 3).

**Context:** Reported by the user against the running dev stack (real `429 RESOURCE_EXHAUSTED` log from `Services/package-service`), not related to the chatbot-lead-intake feature — `geminiClient.js` wasn't touched by that PR. Fix direction: parse `err.details` for a `type.googleapis.com/google.rpc.RetryInfo` entry's `retryDelay` and sleep that duration (with a sane cap, e.g. 60s) instead of the fixed backoff specifically for 429s; consider distinguishing "quota exhausted for the day" (not worth retrying at all within the same request) from a short-lived rate-limit blip.

**Effort:** S
**Priority:** P2
**Depends on:** None

## Completed
