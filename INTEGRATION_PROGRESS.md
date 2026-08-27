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

- [ ] 1.1 `apiEnvelopeAny` helper in `envelope.js`
- [ ] 1.2 `websiteAuth.js` (Login/Register/WebsiteUser/AuthResult/ProfileUpdate*)
- [ ] 1.3 `apiPackage.js` (ApiPackage/PackageListResult/ReviewStatsResult/WebsiteReview*)
- [ ] 1.4 `websiteBooking.js`
- [ ] 1.5 `websiteContact.js`
- [ ] 1.6 `careerApplication.js`
- [ ] 1.7 `customizedPackage.js`
- [ ] 1.8 `manualItinerary.js`
- [ ] 1.9 Export all from `index.js`

**Gate 1:** `cd Services/shared/contracts && npm run lint && npm test` green.

## Phase 2 — Backend fix: `user-service` profile update accepts `email`

- [ ] 2.1 Validator: add `email` field to `updateCurrentUserProfileSchema`
- [ ] 2.2 Controller: destructure `email`, map `P2002` → 400
- [ ] 2.3 Tests: validator + controller

**Gate 2:** `cd Services/user-service && npm test` green.

## Phase 3 — Port `CustomizedPackage` + `ManualItinerary` into `lead-service`

- [ ] 3.1 Prisma schema: enum + 2 models + Lead relations, migrate + generate
- [ ] 3.2 Validators
- [ ] 3.3 Controllers
- [ ] 3.4 Routes
- [ ] 3.5 Mount in `app.js`
- [ ] 3.6 Gateway proxy + public patterns
- [ ] 3.7 Tests

**Gate 3:** `cd Services/lead-service && npm test` green; manual `curl` smoke test against live stack.

## Phase 4 — Client integration layer

- [ ] 4.1 Add `@travel-crm/contracts` + `zod` deps
- [ ] 4.2 `services/http/envelope.ts`
- [ ] 4.3 `services/http/client.ts` — correlation id + 401 handling
- [ ] 4.4 Rewrite `services/api/*.ts` (9 files) onto shared schemas
- [ ] 4.5 Tests: envelope + per-service

**Gate 4:** `typecheck`/`lint`/`build`/`test` green; live browser check of `/my-account` tabs + profile edit.

## Phase 5 — Live-gateway regression suite

- [ ] 5.1 `Services/e2e-tests/client-contracts/*.spec.js` (8 spec files)

**Gate 5:** `cd Services/e2e-tests && npm test` green against live seeded stack.

## Last session

- **2026-08-27**: Plan approved. Created branch `feat/client-backend-integration` (base `microservices`) and this progress file. Next: **Phase 1** — shared contracts schema surface.
