# Client ↔ Backend Integration — Progress

Tracks execution of the plan approved 2026-08-27. Full plan (context, decisions, rationale) lives at `local://client-backend-integration-plan.md`; this doc is the checklist + resumption point for future sessions.

**Branch:** `feat/client-backend-integration` (base: `microservices`)
**Execution mode:** autonomous, step by step, one commit per completed unit. Read this file first at the start of every session before doing anything else.

## Decisions locked in (do not re-litigate)

- Backend target = Gateway (`:3000`) + `Services/` microservices only. Legacy `Server/` is untouched and unproxied — port target for behavior reference only, never a runtime dependency.
- Missing `CustomizedPackage`/`ManualItinerary` functionality ported into `lead-service` as new Prisma/zod/Express code, following the lean transaction-based `createWebsiteContactLead`/`createWebsiteBooking` pattern — not legacy's heavier multi-document Mongoose orchestration.
- Validation source = shared `@travel-crm/contracts` (zod), extended with Client-facing schemas, consumed by `Client/` via the same `file:` dependency pattern `Management/package.json` already uses. Management does NOT currently consume `@travel-crm/contracts` (only `@travel-crm/constants`, narrowly) — noted as a deferred follow-up, not in this plan's scope.
- Request schemas strip unknown keys (sanitization); response schemas use `.passthrough()` (resilience to additive backend changes).
- Regression testing = live integration tests against the local gateway, extending `Services/e2e-tests`' existing vitest/`apiClient` pattern — not a new test harness.
- Backend fixes in scope: `user-service` profile-update rejecting `email` (confirmed regression from legacy behavior, fixed with a one-line schema addition + Prisma `P2002` → 400 mapping).
- Port scope = minimum viable surface only: `POST /customized-packages/website`, `GET /customized-packages/my-requests`, `POST /manual-itineraries/website`, `GET /manual-itineraries/my-requests` (plus admin `GET/PUT /:id` since Client's `updateCustomizedPackage`-adjacent needs are covered defensively, per the plan's controller spec) — legacy's admin CRUD has zero current Client/Management consumers.

## Phase 0 — Branch

- [x] 0.1 Create branch + this progress file, commit first

## Phase 1 — Shared contracts: website-facing schema surface

- [x] 1.1 `apiEnvelopeAny` helper in `envelope.js`
- [x] 1.2 `websiteAuth.js` (Login/Register/WebsiteUser/AuthResult/ProfileUpdate*)
- [x] 1.3 `apiPackage.js` (ApiPackage/PackageListResult/ReviewStatsResult/WebsiteReview*)
- [x] 1.4 `websiteBooking.js`
- [x] 1.5 `websiteContact.js`
- [x] 1.6 `careerApplication.js`
- [x] 1.7 `customizedPackage.js`
- [x] 1.8 `manualItinerary.js`
- [x] 1.9 Export all from `index.js`

**Gate 1:** `cd Services/shared/contracts && npm run lint && npm test` green.

## Phase 2 — Backend fix: `user-service` profile update accepts `email`

- [x] 2.1 Validator: add `email` field to `updateCurrentUserProfileSchema`
- [x] 2.2 Controller: destructure `email`, map `P2002` → 400
- [x] 2.3 Tests: validator + controller

**Gate 2:** `cd Services/user-service && npm test` green.

## Phase 3 — Port `CustomizedPackage` + `ManualItinerary` into `lead-service`

- [x] 3.1 Prisma schema: enum + 2 models + Lead relations, migrate + generate
- [x] 3.2 Validators
- [x] 3.3 Controllers
- [x] 3.4 Routes
- [x] 3.5 Mount in `app.js`
- [x] 3.6 Gateway proxy + public patterns
- [x] 3.7 Tests

**Gate 3:** `cd Services/lead-service && npm test` green; manual `curl` smoke test against live stack.

## Phase 4 — Client integration layer

- [x] 4.1 Add `@travel-crm/contracts` + `zod` deps
- [x] 4.2 `services/http/envelope.ts`
- [x] 4.3 `services/http/client.ts` — correlation id + 401 handling
- [x] 4.4 Rewrite `services/api/*.ts` (9 files) onto shared schemas
- [x] 4.5 Tests: envelope + per-service

**Gate 4:** `typecheck`/`lint`/`build`/`test` green; live browser check of `/my-account` tabs + profile edit.

## Phase 5 — Live-gateway regression suite

- [x] 5.1 `Services/e2e-tests/client-contracts/*.spec.js` (8 spec files)

**Gate 5:** `cd Services/e2e-tests && npm test` green against live seeded stack.

## Last session

- **2026-08-27**: Plan approved. Created branch `feat/client-backend-integration` (base `microservices`) and this progress file.
  **Phase 1 complete**: extended `@travel-crm/contracts` with `websiteAuth.js`/`apiPackage.js`/`websiteBooking.js`/`websiteContact.js`/`careerApplication.js`/`customizedPackage.js`/`manualItinerary.js` + `apiEnvelopeAny` helper for the `{status:'success'}` convention. Request schemas strip unknown keys; response schemas `.passthrough()`. Fixed one drafting error found via real backend code: `ProfileUpdateResult` corrected to `{user: WebsiteUser}` (user-service nests under `data.user`, not `data` directly) — confirmed by reading `user.controller.js`'s actual `res.json(...)` call. Gate 1 green (58/58 tests).
  **Phase 2 complete**: `user-service`'s `updateCurrentUserProfileSchema` now accepts `email` (still `.strict()`); controller maps Prisma `P2002` (duplicate email) to a 400 `AppError`. 4 new tests (2 validator, 2 controller). Gate 2 green (209/209 tests, up from 205).
  **Phase 3 complete**: ported `CustomizedPackage`+`ManualItinerary` into `lead-service`. Real deviations from the plan's draft, found by reading the actual codebase before writing: (1) reused lead-service's existing `fetchPackage()` helper (`services/lead-draft.service.js`) instead of hand-rolling a new fetch — already the established package-lookup idiom, used by 3 other lead-service call sites; (2) new route files needed `router.use(extractUser)` — not applied globally in `app.js`, only per-route-file, confirmed by reading `lead.routes.js`; (3) `updateCurrentUserProfileSchema`'s `phoneField` was already `.optional().nullable()`, no manual normalization needed. Non-interactive `prisma migrate dev` isn't supported in this sandbox — generated the migration SQL via `migrate diff --from-schema-datasource`, hit a live-DB baseline gap (`_prisma_migrations` had no rows for lead-service's own prior 4 migrations despite their tables already existing), resolved via `migrate resolve --applied` for each pre-existing migration (verified the "pending" `whatsapp` enum value was in fact already live via a direct query, so baselining it was safe/correct) then `migrate deploy` for the new migration only. New Prisma models/enum, 2 validators, 2 controllers (transaction-based, mirroring `createWebsiteContactLead`), 2 route files, `app.js` mount, 2 Gateway proxy lines + 2 `PUBLIC_PATTERNS` entries, 4 new test files (24 new tests). Gate 3 green (301/301 tests; `migrate status` clean).
  Next: **Phase 4** — Client integration layer (dependencies, `envelope.ts`, `client.ts` 401/correlation-id, rewrite `services/api/*.ts`).
  **Phase 4 complete**: rewired all 9 `services/api/*.ts` files onto `@travel-crm/contracts` schemas via a new `parseEnvelope()` helper (`services/http/envelope.ts`, normalizes both backend envelope conventions). `client.ts` gained an `x-request-id` correlation header and 401 session handling (clears token + redirects to `/login`, except for the login/register endpoints themselves). Found and fixed 4 real, previously-silent frontend bugs surfaced by introducing actual response validation instead of untyped `any`: (1) `CareerContainer.tsx` read `response.data.vacancies` but `GET /vacancies` returns a bare array — vacancies list was always empty; (2) `Vacancy`'s real fields are `id`/`position`/`experienceMin` flat, not the assumed `_id`/`title`/`experience.min` nested — the "X+ years experience" badge never rendered; (3) `WebsiteReview`'s real fields are `id`/`name`/`createdAt`, not `user_name`/`created_at` snake_case — reviews always showed "Traveler" and today's date; (4) `ManualItineraryDay.places` is `string[]`, not `{name,description}[]` — every real trip-planner submission was rejected 400 by the (also-just-written) backend `.strict()` validator, caught before it ever shipped. Also found booking/customization/manual-itinerary's tested submit flows all allow an empty `name` — loosened those three request schemas to match, with matching `'Website Traveler'` fallback added to the Phase-3 lead-service controllers (mirroring booking-service's existing pattern). Fixed 9 test-file mocks whose expectations assumed the old untyped return shapes. Full gate green: `typecheck` 0 errors, `lint` 0 errors, `build` succeeds, `test` 183/183 across 40 files (was 142/31 before this phase). Commit `59f2edf` (message amended after a shell-backtick-escaping mishap garbled the first attempt).
  Next: **Phase 5** — live-gateway regression suite in `Services/e2e-tests`.
  **Phase 5 complete**: added `Services/e2e-tests/client-contracts/` — 8 spec files (auth, packages, bookings, contact, careers, customized-packages, manual-itineraries, user-profile) parsing real Gateway responses with the same `@travel-crm/contracts` schemas the Client uses. `customized-packages.spec.js`/`manual-itineraries.spec.js` are the Phase 3 regression guard (these two endpoints 404'd before that port); `user-profile.spec.js` is the Phase 2 regression guard (proves the `email` field is accepted and a duplicate-email conflict maps to 400) — it swaps the seeded customer's email to a temp value and restores it in a `finally`/`afterAll`, verified restored via a direct DB read after the run. Found and fixed two real infra issues while running against the live stack: `api-client.js` crashed on a non-JSON response body (the Gateway's plaintext 429 rate-limit response) instead of surfacing a legible failure; `vitest.config.js` was missing `isolate:false`, so `auth-helper.js`'s per-run token cache was silently re-populated per spec file despite `fileParallelism:false`, multiplying real `/auth/login` calls past the Gateway's 10-req/15min limiter once enough spec files existed — fixed both, benefiting every existing spec too. Added a `customer` seed role. Gate 5 green: 36/36 tests across 10 files against the live local stack with a real seeded Postgres database.
  **Final verification (live browser, headless Chromium against the running stack)**: logged in as the seeded customer (`david.kumar@gmail.com`), navigated `/my-account` — zero console errors, zero failed network requests; "Regular Bookings"/"Customized Packages"/"Trip Plans" tabs all clickable with zero errors (the two 404s observed at the very start of this task are gone). Live profile-edit: changed the account email via the UI form → `PUT /users/profile` returned `200` with the updated email (previously a `400 "Unrecognized key: email"`) — then reverted it back to the original seeded value through the same UI flow, independently confirmed restored via a direct Postgres read.
  **All 5 phases complete.** Branch `feat/client-backend-integration`, 6 commits (`5a43c6f`..`15f16ed`) on top of `microservices` at `fc7cf53`. Every phase's own test suite green (contracts 58/58, user-service 209/209, lead-service 301/301, Client 183/183, e2e 36/36) plus a clean live-browser walkthrough. No PR opened yet — pending user review of this session's work before requesting one.
