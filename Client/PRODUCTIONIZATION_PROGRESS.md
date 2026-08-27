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

- [x] 0.1 Create branch + this progress file, commit first
- [x] 0.2 Remove 11 dead deps (`@mui/*` x4, `@emotion/*` x2, `@headlessui/react`, `@stripe/*` x2, `react-icons`, `recharts`), `npm install`, re-grep to confirm zero refs
- [x] 0.3 Fix broken lint tooling: add missing `@eslint/js`/`globals`/`eslint-plugin-react-hooks`/`eslint-plugin-react-refresh` deps, add `"lint"` script, wire `Client/**` into root `.lintstagedrc.mjs`
- [x] 0.4 Bump `vite@^4.4.0` → `^8.x`, verify build/dev
- [x] 0.5 Add `tsconfig.json`/`tsconfig.node.json`, rename `vite.config.js`→`.ts`, add `typecheck` script
- [x] 0.6 Extend `eslint.config.js` with `.ts/.tsx` block mirroring `Management`
- [x] 0.7 Add `vitest.config.ts` + `src/test/setup.ts`, add `test`/`test:watch` scripts

**Gate 0:** `npm run dev`/`build`/`lint`/`typecheck`/`test` all green, app pixel-identical to before.

## Phase 1 — Foundation: services, lib, config → TypeScript, HTTP resilience, dedupe

- [x] 1.1 `services/http/{config,retry,client}.ts` (+ retry unit tests)
- [x] 1.2 `services/auth/tokenStorage.ts` (+ unit tests), refactor `AuthContext.jsx` onto it
- [x] 1.3 `services/api/*.ts` relocation (packages/career/auth/booking/contact/customization/manualItinerary) + new `account.ts`
- [x] 1.4 Fix `MyAccount.jsx` raw-fetch profile save → `updateProfile`/`mergeStoredUser`
- [x] 1.5 Delete `pdf/apiService.js`, fix `pdfService.js` to use `getPackageEnvelope`
- [ ] 1.6 Delete `utils/managementPdfBridge.js` — **deferred to Phase 5** (see session log: deleting now would break `PackageDetails.jsx`'s still-untouched import; its target `features/packages/pdf/pdfService.ts` doesn't exist until Phase 5)
- [x] 1.7 `pdf/constants.ts` — prune dead exports, keep `PDF_CONFIG` (pruned 10: the 9 plan-flagged ones + `STATUS_COLORS`, found equally dead on re-grep)
- [x] 1.8 `config/domainData/destinations.ts` — add `COUNTRY_REGION_MAP`
- [x] 1.9 `services/api/packages.transform.ts` (+ unit tests)
- [x] 1.10 `lib/currency.ts` (+ unit tests)
- [x] 1.11 `lib/elfsight.ts` hook
- [x] 1.12 `config/{branding,theme,media}.ts` rename
- [x] 1.13 `config/pages.ts` `PAGE_CONFIG` (+ unit tests) — plus new shared `config/envFlag.ts`
- [x] 1.14 `config/floatingActions.ts`
- [x] 1.15 Tailwind z-index scale
- [x] 1.16 `.env.example` additions
- [ ] 1.17 Delete now-empty `src/utils/` — **not yet empty**, holds only the deferred `managementPdfBridge.js` (1.6); every other file moved/deleted

**Gate 1:** `typecheck`/`lint`/`build`/`test` green; live network check against local gateway.

## Phase 2 — App shell, layout, floating actions, shared selectors

- [x] 2.A Slice A: `layouts/MainLayout.tsx`, floating-action components + registry, `App.jsx` route gating + catch-all, `Header.jsx`/`Footer.jsx` nav gating, `index.html` title/meta
- [x] 2.B Slice B: shared selector components → TypeScript (`components/shared/*`)

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
  **Phase 0 complete.** Removed 11 dead deps (0.2, confirmed 0 usages before and after via grep). Fixed lint tooling (0.3): added `@eslint/js`/`globals`/`eslint-plugin-react-hooks`/`eslint-plugin-react-refresh` as transitive/direct deps, added `"lint"` script, wired `Client/**/*.{js,jsx,ts,tsx}` into root `.lintstagedrc.mjs`. Bumped `vite@4.4.0`→`^8.1.3` (0.4) with `npm install --legacy-peer-deps` — hit one real build break: Vite 8/Rolldown requires `rollupOptions.output.manualChunks` as a function, not the old chunk-name→module-array object; rewrote `vite.config.js`→`vite.config.ts` with a function-form `manualChunks` and dropped its `@mui/*`/`@headlessui/react`/`recharts` chunk entries (now-removed deps) in the same pass (0.5). Added `tsconfig.json` (`allowJs`/`checkJs:false`/`strict:false`, `@/*` alias) + `tsconfig.node.json`, `typecheck` script. Extended `eslint.config.js` with a `.ts/.tsx` block mirroring `Management`'s exact bootstrap posture (0.6).
  **First real lint run surfaced pre-existing debt** (lint had never actually run before — deps were missing despite the config existing): 43 errors, mostly `no-unused-vars`. One was a genuine bug, not noise — `Landing/TestimonialsSection.jsx` called `useState`/`useEffect`/`useRef` after an early `return null` (conditional hooks, `react-hooks/rules-of-hooks` violation). Fixed in place (moved the guard after the hook declarations, before the JSX return) since it's a real correctness issue independent of this plan's scope, not deferred. The remaining 43 `no-unused-vars`/`no-empty` issues are pre-existing dead-code debt in files this plan already schedules for TS conversion in Phases 3-6; downgraded to `warn` for the `.jsx` block (same bootstrap posture Management used, same reasoning: don't block Phase 0 tooling work on unrelated cleanup) — now 0 errors/44 warnings.
  Added `vitest.config.ts` + `src/test/setup.ts` (`IntersectionObserver` polyfill) (0.7); `vitest run` exits 1 on zero test files by default, added `test.passWithNoTests: true` (removed once real tests exist).
  Booted the full local backend stack (`cd Services && npm run dev` — gateway :3000 + all 11 microservices, shared Supabase Postgres, env files already present) for live verification going forward.
  **Gate 0 verified**: `npm run build`/`lint`/`typecheck`/`test`/`dev` all green. Live browser check (real backend running) of `/`, `/packages`, `/package/:id`, `/contact` — zero console errors, matches pre-Phase-0 behavior.
  Next: **Phase 1** — services/lib/config → TypeScript, HTTP consolidation with retry, the three ad-hoc-HTTP-path fixes.

- **2026-08-27 (continued)**: **Phase 1 complete.** Built the consolidated HTTP stack: `services/http/config.ts` (`HTTP_CONFIG` from `VITE_API_*` env vars incl. new retry config), `services/http/retry.ts` (`shouldRetry`/`computeDelayMs` — capped exponential backoff + jitter, same shape as `Services/package-service/src/ai/geminiClient.js`'s `2 ** (attempt-1) * 500 + jitter`; GET/HEAD retried by default, `Retry-After` header honored, per-request `{retry: true|false}` override), `services/http/client.ts` (single axios instance, auto-retry interceptor, same error-enrichment shape the old `apiClient.js` had). 24 new unit tests for retry logic (attempt caps, method/status allowlists, opt-in/opt-out override, Retry-After precedence, backoff math).
  `services/auth/tokenStorage.ts` — single `'tsw_auth'` source of truth (`getToken`/`getUser`/`persist`/`clear`/`mergeStoredUser`), 12 unit tests incl. corrupt-JSON and missing-key paths. Refactored `AuthContext.jsx` onto it (no behavior change — same envelope shape, same React state flow).
  Relocated all `utils/*Api.js` → `services/api/*.ts` (auth/booking/career/contact/customization/manualItinerary/packages), all now on the shared `httpClient`. `contactApi.js`/`customizationApi.js`/`manualItineraryApi.js`'s unused default-object exports dropped (confirmed zero consumers via grep — everything used named imports); `careerApi.js` kept its default-object shape since `Career.jsx` genuinely imports it that way. New `services/api/account.ts` (`updateProfile`) and `getPackageEnvelope` (raw, non-normalized `/packages/:id` envelope, for the PDF fix below — distinct from `fetchPackageById`'s normalized shape). `lsp rename_file` couldn't actually rewrite import paths (the LSP's TS server fails to initialize — this is a no-root-workspace monorepo, likely resolving `typescript` from the repo root instead of `Client/`), so plain filesystem renames only; fixed the ~30 affected import sites by hand/`sed` afterward and confirmed via grep (zero stale references remain).
  **Fixed `MyAccount.jsx`'s raw-fetch profile save** (1.4): replaced the hand-rolled `fetch` + manual `localStorage.getItem('tsw_auth')` parsing with `updateProfile()` + `mergeStoredUser()`, same success/error UI and `setTimeout(reload, 1000)` behavior preserved exactly.
  **Fixed the `'tsw_auth'`-vs-`'authToken'`/`'token'` key bug** (1.5, the plan's flagged highest-risk edit): deleted `pdf/apiService.js` (`ApiService.getPackage` was reading the wrong localStorage keys, so PDF downloads never sent a valid `Authorization` header) and repointed `pdfService.js`'s `createPackagePdfBlob` at `getPackageEnvelope` — verified byte-identical response shape (`{success, data}` from the same `GET /packages/:id`) and, live in-browser: logged in as the seeded customer (`david.kumar@gmail.com` / `Customer@123`, found via `Services/update-passwords.mjs`), called `getPackageEnvelope` directly via a dynamic import in the browser console — `{success: true, hasData: true}` — and confirmed the network tab shows `Authorization: Bearer <token>` matching the live `tsw_auth` token on `/packages/:id` requests.
  `utils/managementPdfBridge.js` **kept, not deleted** (1.6) — the plan's own fallback clause applies: `PackageDetails.jsx` still imports from it and isn't touched until Phase 5, so deleting now would break the site. Actual deletion + `PackageDetails.jsx`'s one-line import fix moved to Phase 5 alongside the rest of that file's migration.
  `pdf/constants.ts` pruned to just `PDF_CONFIG` (1.7) — deleted the 9 plan-flagged dead exports plus `STATUS_COLORS`, which my own re-grep (per the "re-grep before deleting" rule) found equally unreferenced outside its own definition, so folded it into the same cleanup.
  `config/domainData/destinations.ts` gained `COUNTRY_REGION_MAP` (1.8, moved verbatim from `packageTransform.js`); `services/api/packages.transform.ts` (1.9, moved + typed, `NormalizedPackage`/`AggregatedDestination`/`DestinationMeta` interfaces) imports it. 15 new unit tests. `lib/currency.ts` (1.10, typed, 6 new unit tests) and `lib/elfsight.ts` (1.11, new — a `useElfsightWidget()` hook consolidating the two previously-duplicated, non-idempotent inline elfsight-script-loaders in `PackageDetails.jsx`/`TestimonialsSection.jsx`; wiring both call sites onto it is deferred to Phases 5/6 per the plan, this step only creates the hook).
  `config/{branding,theme,media}.ts` renamed + typed (1.12 — added a `Branding` interface, `hexToRgb`/`applyCssVariables` signatures). `config/pages.ts` (`PAGE_CONFIG`, 1.13, 4 new unit tests) and `config/floatingActions.ts` (1.14) — both pull a small shared `flag()` helper into new `config/envFlag.ts` rather than duplicating the env-parsing logic across two files. Tailwind z-index scale added (1.15: `header`/`dropdown`/`floating-action`/`overlay`/`modal`). `.env.example` gained the retry/page-toggle/floating-button/SEO sections (1.16).
  **Real hooks bug found and fixed along the way** (`TestimonialsSection.jsx`, already noted under Phase 0 — carried forward here since it directly enabled the elfsight-hook consolidation work in 1.11).
  **Gate 1 verified**: `typecheck`/`lint`(0 errors/41 warnings, all pre-existing)/`build`/`test`(46/46) all green. Live browser walkthrough of every route (`/`, `/packages`, `/contact`, `/career`, `/login`, `/about`, `/destinations-international`, `/planner`, `/my-account`, `/package/:id`) — zero console errors except two pre-existing 404s on `/my-account` (`/customized-packages/my-requests`, `/manual-itineraries/my-requests` — confirmed via grep that gateway never registered these routes at all, unrelated to this refactor, same endpoint paths as the original code).
  **Local dev note**: `Client/.env` (gitignored, pre-existing) points `VITE_API_URL` at production `https://api.lushtravelcloud.com`, which was intermittently returning `ERR_CONNECTION_RESET` from this sandbox. Backed up to `.env.bak` and pointed `.env` at `http://localhost:3000/api/v1` for the rest of this session's live verification against the local backend stack (`cd Services && npm run dev`); restore `.env` from `.env.bak` before ending the session if the production-pointing default matters for this machine's normal workflow.
  Next: **Phase 2** — app shell (`MainLayout`, floating-action registry, route gating, `index.html` templating) + shared selector components → TypeScript. Two independent slices per the plan — dispatch as parallel subagents.

- **2026-08-27 (continued)**: **Phase 2 complete.** Dispatched two parallel slices per the plan: did Slice A myself directly (App.jsx is the composition root — highest-risk file, kept in-house rather than delegated), dispatched Slice B to a subagent (`SharedSelectorsTS`) concurrently since its file set (6 shared selector components + 3 consumer pages) is fully disjoint from Slice A's.
  **Slice A**: `layouts/MainLayout.tsx` (Header + `<Outlet/>` + Footer + `FloatingActionStack`, still forwards `currentPage`/`onNavigate` to Header/Footer — kept the existing navigate-by-prop pattern rather than inventing a `useNavigate()` rewrite, since the plan scoped this as a surgical nav-gating pass, not a navigation-pattern redesign). New `components/shared/floating-actions/{WhatsAppButton,CallButton,ScrollTopButton,FloatingActionStack}.tsx` — `WhatsAppButton` moved verbatim from `components/WhatsAppFloating.jsx` (SVG path spliced byte-for-byte via a Python script reading the exact source line, after catching myself about to hand-transcribe a `read`-truncated SVG path — verified identical via a before/after diff rather than trusting the retype). `App.jsx` restructured onto nested routes (`<Route element={<MainLayout .../>}>` wrapping every page route, `<Outlet/>`-based instead of the old manual `<div>` wrapper), each optional route conditionally included via `{PAGE_CONFIG.X.enabled && <Route .../>}`, plus a new catch-all `<Route path="*" element={<Navigate to="/" replace />} />` (there was none before). `Header.jsx`/`Footer.jsx` nav arrays gated on `PAGE_CONFIG` — also found and gated two hardcoded "Plan Your Trip" CTAs in `Header.jsx` (desktop pill + mobile menu) that bypassed the `navItems`/`sideMenuItems` arrays entirely; also short-circuited `Header.jsx`'s destinations-dropdown fetch when Destinations is disabled (avoids a pointless network call). `index.html` title/meta templated to `%VITE_COMPANY_NAME%`/`%VITE_META_DESCRIPTION%`. Deleted the now-orphaned `components/WhatsAppFloating.jsx`. New tests: `FloatingActionStack` (all-enabled, one-disabled-no-gap — asserts the actual computed `bottom` offset, all-disabled), `CallButton`, `ScrollTopButton`, plus a `routeGating.test.tsx` that exercises the real `PAGE_CONFIG` against the exact conditional-`<Route>`-inclusion + catch-all mechanism `App.jsx` uses (via `MemoryRouter` + trivial placeholder pages, not the full heavy app).
  **Slice B** (subagent, independently re-verified — re-ran `typecheck`/`lint`/`build`/`test` myself rather than trusting the self-report, spot-checked `LazyIcon.tsx` and a test file, grepped for zero stale import paths): moved `components/{ActivitySelector,DestinationSelector,LocationAutocomplete,LocationSelector,LazyIcon,LazyImage}.jsx` → `components/shared/*.tsx` (filesystem-move fallback, same LSP-init limitation as Phase 1), added honest prop interfaces (not `any`) for each, fixed every consumer import in `Contact.jsx`/`CustomizePackage.jsx`/`PlanYourTrip.jsx`; coordinated over `hub` on `Header.jsx`'s one-line `LazyIcon` import path since I owned that file concurrently — confirmed I'd landed it before Slice B's own build-gate re-run. 21 new tests (real interaction assertions, e.g. picking a destination asserts the exact `onChange` payload, not just "renders").
  **`lsp rename_file` confirmed still non-functional in this monorepo** (both slices hit it independently) — its underlying TS server fails to initialize, most likely because it resolves `typescript` from the repo root rather than `Client/` (no root workspace, per `CLAUDE.md`). Plain filesystem moves + manual/grepped import-path fixes are the working pattern for the rest of this refactor; stop attempting `lsp rename_file` for anything beyond a same-directory extension-only rename (which doesn't need path rewriting).
  **Gate 2 verified**: `typecheck`/`lint`(0 errors/40 warnings)/`build`/`test`(76/76) all green after merging both slices. Live browser: every route zero-console-error at default env; unknown path redirects to `/`; toggled `VITE_FEATURE_CAREER=false` (dev server restarted) — `/career` redirects to `/`, "Career" absent from both Header nav and Footer, "Plan Your Trip"/"About" still present (confirms independent per-flag gating, not an all-or-nothing switch); restored default env afterward. Screenshot-verified all three floating buttons render stacked with no gap.
  Next: **Phase 3** — feature migration wave 1 (About/Career/Auth/Contact, the 4 smallest/most static domains). Four independent per-domain subagents per the plan.
