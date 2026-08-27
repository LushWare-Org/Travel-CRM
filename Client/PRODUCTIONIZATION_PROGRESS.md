# Client Productionization — Progress

Tracks execution of the plan approved 2026-08-27. Full plan (context, decisions, rationale) lives at `local://client-productionization-plan.md`; this doc is the checklist + resumption point for future sessions.

**Branch:** `refactor/client-productionization` (base: `microservices`)
**Execution mode:** autonomous, step by step, one commit per completed unit. Read this file first at the start of every session before doing anything else.

## Decisions locked in (do not re-litigate)

- Config model stays build-time, per-deployment `VITE_*` env-driven — not a runtime multi-tenant/remote-config system.
- Every new toggle defaults to **enabled** when its env var is unset (byte-identical behavior for existing deployments).
- Retry policy: hand-rolled interceptor (no new npm dependency), mirrors `Services/package-service/src/ai/geminiClient.js`'s style. Retries GET/HEAD only by default.
- TS strictness ramp: `allowJs:true`/`checkJs:false`/`strict:false` from Phase 0 → `strict:true` in Phase 6.
- Testing: Vitest + React Testing Library only. No Playwright/e2e added to `Client/` (explicit `CLAUDE.md` constraint).
- z-index scale (`header:50, dropdown:60, floating-action:70, overlay:90, modal:100`) added in Phase 1; every phase applies it to files it touches, no deferred full sweep.
- Pages togglable per client: Career, Trip Planner + Customize Package, Destinations (International), About, Login + My Account. Home/Packages/Package Details/Contact always-on.
- Floating buttons: WhatsApp + Call + Scroll-to-top, each independently togglable.
- Polish scope: incremental only (token/consistency debt), not a full design-system overhaul.

## Phase 0 — Tooling, dependency cleanup, safety net

- [ ] 0.1 Create branch + this progress file, commit first
- [ ] 0.2 Remove 11 dead deps (`@mui/*` x4, `@emotion/*` x2, `@headlessui/react`, `@stripe/*` x2, `react-icons`, `recharts`), `npm install`, re-grep to confirm zero refs
- [ ] 0.3 Fix broken lint tooling: add missing `@eslint/js`/`globals`/`eslint-plugin-react-hooks`/`eslint-plugin-react-refresh` deps, add `"lint"` script, wire `Client/**` into root `.lintstagedrc.mjs`
- [ ] 0.4 Bump `vite@^4.4.0` → `^8.x`, verify build/dev
- [ ] 0.5 Add `tsconfig.json`/`tsconfig.node.json`, rename `vite.config.js`→`.ts`, add `typecheck` script
- [ ] 0.6 Extend `eslint.config.js` with `.ts/.tsx` block mirroring `Management`
- [ ] 0.7 Add `vitest.config.ts` + `src/test/setup.ts`, add `test`/`test:watch` scripts

**Gate 0:** `npm run dev`/`build`/`lint`/`typecheck`/`test` all green, app pixel-identical to before.

## Phase 1 — Foundation: services, lib, config → TypeScript, HTTP resilience, dedupe

- [ ] 1.1 `services/http/{config,retry,client}.ts` (+ retry unit tests)
- [ ] 1.2 `services/auth/tokenStorage.ts` (+ unit tests), refactor `AuthContext.jsx` onto it
- [ ] 1.3 `services/api/*.ts` relocation (packages/career/auth/booking/contact/customization/manualItinerary) + new `account.ts`
- [ ] 1.4 Fix `MyAccount.jsx` raw-fetch profile save → `updateProfile`/`mergeStoredUser`
- [ ] 1.5 Delete `pdf/apiService.js`, fix `pdfService.js` to use `getPackageEnvelope`
- [ ] 1.6 Delete `utils/managementPdfBridge.js`
- [ ] 1.7 `pdf/constants.ts` — prune 9 dead exports, keep `PDF_CONFIG`
- [ ] 1.8 `config/domainData/destinations.ts` — add `COUNTRY_REGION_MAP`
- [ ] 1.9 `services/api/packages.transform.ts` (+ unit tests)
- [ ] 1.10 `lib/currency.ts` (+ unit tests)
- [ ] 1.11 `lib/elfsight.ts` hook
- [ ] 1.12 `config/{branding,theme,media}.ts` rename
- [ ] 1.13 `config/pages.ts` `PAGE_CONFIG` (+ unit tests)
- [ ] 1.14 `config/floatingActions.ts`
- [ ] 1.15 Tailwind z-index scale
- [ ] 1.16 `.env.example` additions
- [ ] 1.17 Delete now-empty `src/utils/` via `lsp rename_file` moves

**Gate 1:** `typecheck`/`lint`/`build`/`test` green; live network check against local gateway.

## Phase 2 — App shell, layout, floating actions, shared selectors

- [ ] 2.A Slice A: `layouts/MainLayout.tsx`, floating-action components + registry, `App.jsx` route gating + catch-all, `Header.jsx`/`Footer.jsx` nav gating, `index.html` title/meta
- [ ] 2.B Slice B: shared selector components → TypeScript (`components/shared/*`)

**Gate 2:** default-env parity + toggle-off live verification (Career off → redirect + nav hidden).

## Phase 3 — Feature migration wave 1 (about/career/auth/contact)

- [ ] 3.1 `features/about`
- [ ] 3.2 `features/career`
- [ ] 3.3 `features/auth`
- [ ] 3.4 `features/contact`

**Gate 3:** per-domain tests + full gate + live parity + submission smoke tests.

## Phase 4 — Feature migration wave 2 (destinations/account/landing)

- [ ] 4.1 `features/destinations`
- [ ] 4.2 `features/account`
- [ ] 4.3 `features/landing`

**Gate 4:** full gate + live parity across affected routes.

## Phase 5 — Feature migration wave 3 (planner/packages)

- [ ] 5.1 `features/planner` (PlanYourTrip + CustomizePackage)
- [ ] 5.2 `features/packages` (Packages + PackageDetails + pdf/)

**Gate 5:** full gate + booking/review/PDF-download live verification.

## Phase 6 — Composition root finalize + strictness ramp

- [ ] 6.1 `Header.tsx`/`Footer.tsx`/`App.tsx`/`main.tsx` full conversion
- [ ] 6.2 `context/`→`contexts/` rename
- [ ] 6.3 Flip `strict: true`, fix errors

**Gate 6:** `typecheck` 0 errors under strict; full gate green.

## Phase 7 — Final hardening & closeout

- [ ] 7.1 z-index/hex sweep (grep-verified zero stragglers)
- [ ] 7.2 Full gate run (direct, not delegated)
- [ ] 7.3 Live browser verification matrix (all toggles, on/off)
- [ ] 7.4 Open PR

## Last session

- **2026-08-27**: Plan approved. Created branch `refactor/client-productionization` (base `microservices`) and this progress file.
