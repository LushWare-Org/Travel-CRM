# Management UI/Design-System Rewrite — Progress

Tracks execution of the plan approved 2026-08-22. Full plan (context, decisions, rationale) lives at the top of this session's plan file; this doc is the checklist + resumption point for future sessions.

**Branch:** `feat/management-ui-design-system-rewrite` (base: `microservices`)
**Execution mode:** autonomous, step by step, one commit per completed unit. Read this file first at the start of every session before doing anything else.

## Decisions locked in (do not re-litigate)

- Foundation: shadcn/ui component patterns on **Base UI** primitives, on **Tailwind v4**.
- Rollout: incremental, feature-folder by feature-folder — no big-bang rewrite.
- TypeScript: migrated alongside, file-by-file as each folder is touched (`allowJs` during transition).
- Cleanup included: remove dead `@mui/*`/`@emotion/*`/`@headlessui/react`; consolidate the two duplicate `StatCard` components.
- Forms: adopt `react-hook-form` + `@hookform/resolvers` (zod).
- Toast: **keep `react-hot-toast` for now** — revisit after primitive migration lands (Phase 6), not before.
- Copy/label changes allowed during redesign; update the matching Playwright spec in the same commit, and report the full before/after text to the user when it happens.
- Color palette and font pairing are **not yet decided** — make that call in Phase 1 via the `frontend-design` skill, present concrete options to the user, don't default silently.

## Phase 0 — Tooling & Infrastructure

- [x] 0.0 Create this progress file, commit first
- [x] 0.1 Remove dead deps (`@mui/material`, `@mui/icons-material`, `@mui/lab`, `@mui/x-date-pickers`, `@emotion/react`, `@emotion/styled`, `@headlessui/react`), `npm install`, re-grep to confirm
- [ ] 0.2 TypeScript scaffolding: `tsconfig.json` (`allowJs`, `checkJs: false`, `strict: false`, aliases mirroring `@`/`@utils`), `tsconfig.node.json`, rename `vite.config.js`/`vitest.config.js` → `.ts`, extend `eslint.config.js` with a `**/*.{ts,tsx}` block at the same `warn` posture
- [ ] 0.2b Third-party type-compat audit (lodash, js-cookie, file-saver, qrcode, json2csv, leaflet/react-leaflet, react-datepicker, react-phone-number-input, react-select, sweetalert2, i18next/react-i18next, zod v4) — add ambient `.d.ts` shims where needed
- [ ] 0.3 Tailwind v4 upgrade (CSS-first `@theme`, PostCSS setup)
- [ ] 0.4 shadcn/Base UI init (`components.json`, `src/lib/utils.ts`, `src/components/ui/` scaffold), add `@base-ui-components/react` + `clsx`/`tailwind-merge`/`class-variance-authority`
- [ ] 0.5 Document the strictness ramp (non-strict now → tighten after Phase 2 → full `strict: true` after Phase 5)

**Gate before moving to Phase 1:** `npm run dev`, `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` all green, app pixel-identical to before.

## Phase 1 — Design Token Foundation

- [ ] 1.1 Color system — real semantic palette (primary/neutral/success/warning/danger/info), CSS variables for light+dark. **Needs user decision on exact palette/brand direction — surface options via `frontend-design` skill before finalizing.**
- [ ] 1.2 Real dark mode: `darkMode: 'class'`, CSS var pairs, rebuilt `ThemeContext.tsx` (persistence + `prefers-color-scheme` + `document.documentElement` class toggle)
- [ ] 1.3 Typography — real font pairing + type scale. **Needs user decision on font pairing — surface options via `frontend-design` skill.**
- [ ] 1.4 Spacing/radius/shadow scale + deliberate motion vocabulary (replacing `hover:scale-110`/`-translate-y-1`)
- [ ] 1.5 Author `Management/DESIGN.md` (frontmatter + Overview/Colors/Typography/Layout/Elevation/Shapes/Components/Do's-Don'ts/Responsive/Iteration Guide/Known Gaps, per the `linear.app/DESIGN.md` reference structure)
- [ ] 1.6 Verify light/dark manually before Phase 2 starts

**Gate:** tokens finalized, `ThemeContext` v2 working, `DESIGN.md` accurate, no `features/*` changes yet.

## Phase 2 — Shared Primitive Library

- [ ] 2.1 Core primitives: Button, Card, Dialog, Table, Badge, Input/Select/Textarea, Tabs, Popover
- [ ] 2.2 `src/components/shared/StatCard.tsx` (superset props, semantic-token colors) — duplicates deleted when their feature folder migrates (Phase 4/5), not here
- [ ] 2.3 Table primitive (sort/empty/loading conventions)
- [ ] 2.4 `react-hook-form` + zod resolver wiring, shared `Form`/`FormField` wrapper
- [ ] 2.5 Migrate `Sidebar.jsx` → `.tsx` and `ProtectedRoute.jsx` → `.tsx` (both under continuous `rbac.spec.js` coverage — update the spec + report exact before/after text if labels change)

**Gate:** `rbac.spec.js`/`login.spec.js` green against the new shell.

## Phase 3 — Feature Migration, Wave 1

- [ ] 3.1 `features/dashboard` (3 files)
- [ ] 3.2 `features/career` (3 files)

## Phase 4 — Feature Migration, Wave 2

- [ ] 4.1 `features/analytics` (31 files) — delete `features/analytics/components/Common/StatCard.jsx`, repoint to shared StatCard
- [ ] 4.2 `features/shared` (8 files: FlightSelectionModal, HotelSelectionModal, FlightPreferenceCard)
- [ ] 4.3 `features/itinerary` (45 files)
- [ ] 4.4 `features/lead-management` (42 files) — **`npm run test:e2e` is a hard merge gate**; preserve or deliberately update (with full before/after report) the accessible names `lead-lifecycle.spec.js` asserts on

## Phase 5 — Feature Migration, Wave 3

- [ ] 5.1 `features/user-management` (51 files) — delete `features/user-management/components/Common/StatsCard.jsx`; verify `/users`/`/settings` access-denial still passes

## Phase 6 — Hardening & Closeout

- [ ] 6.1 Flip `strict: true`, fix resulting errors
- [ ] 6.2 Re-check type-shim audit, drop unnecessary ambient `.d.ts`
- [ ] 6.3 Sweep `src/pages/*` page shells not covered by a feature folder for leftover gradient/stock-palette usage
- [ ] 6.4 Full `test`/`test:e2e`/`lint`/`build` gate
- [ ] 6.5 Revisit `react-hot-toast` → shadcn/Base UI toast replacement decision (deferred item)

## Last session

- **2026-08-22**: Plan approved. Created this progress file and the `feat/management-ui-design-system-rewrite` branch (base `microservices`). Completed 0.1: removed `@mui/*`/`@emotion/*`/`@headlessui/react` (confirmed 0 usages via grep before and after), reinstalled with `--legacy-peer-deps` (matches how the existing lockfile was already resolved — a pre-existing vite@8/`@vitejs/plugin-react`@4 peer-dep mismatch unrelated to this change, not fixed here as out of scope). Verified: `npm run build` ✓, `npm run lint` ✓ (146 warnings, 0 errors — matches pre-existing baseline), `npm test` ✓ (260/260). `npm run test:e2e` not run this commit (requires full local stack up; skipped as low-risk given confirmed zero usage of removed packages) — run it before the next phase that touches Sidebar/ProtectedRoute (Phase 2). Next: Phase 0.2 (TypeScript scaffolding).
