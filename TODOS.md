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

## Completed
