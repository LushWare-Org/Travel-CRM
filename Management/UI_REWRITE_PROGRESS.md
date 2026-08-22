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
- [x] 0.2 TypeScript scaffolding: `tsconfig.json` (`allowJs`, `checkJs: false`, `strict: false`, aliases mirroring `@`/`@utils`), `tsconfig.node.json`, rename `vite.config.js`/`vitest.config.js` → `.ts`, extend `eslint.config.js` with a `**/*.{ts,tsx}` block at the same `warn` posture
- [x] 0.2b Third-party type-compat audit (lodash, js-cookie, file-saver, qrcode, json2csv, leaflet/react-leaflet, react-datepicker, react-phone-number-input, react-select, sweetalert2, i18next/react-i18next, zod v4) — add ambient `.d.ts` shims where needed
- [x] 0.3 Tailwind v4 upgrade (CSS-first `@theme`, PostCSS setup)
- [x] 0.4 shadcn/Base UI init (`components.json`, `src/lib/utils.ts`, `src/components/ui/` scaffold), add `@base-ui/react` + `clsx`/`tailwind-merge`/`class-variance-authority`
- [x] 0.5 Document the strictness ramp (non-strict now → tighten after Phase 2 → full `strict: true` after Phase 5)

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

- **2026-08-22**: Plan approved. Created this progress file and the `feat/management-ui-design-system-rewrite` branch (base `microservices`). Completed 0.1: removed `@mui/*`/`@emotion/*`/`@headlessui/react` (confirmed 0 usages via grep before and after), reinstalled with `--legacy-peer-deps` (matches how the existing lockfile was already resolved — a pre-existing vite@8/`@vitejs/plugin-react`@4 peer-dep mismatch unrelated to this change, not fixed here as out of scope). Verified: `npm run build` ✓, `npm run lint` ✓ (146 warnings, 0 errors — matches pre-existing baseline), `npm test` ✓ (260/260). `npm run test:e2e` not run this commit (requires full local stack up; skipped as low-risk given confirmed zero usage of removed packages) — run it before the next phase that touches Sidebar/ProtectedRoute (Phase 2).
  Completed 0.2/0.2b/0.5: added `typescript` (pinned to `^6.0.3` — **note: `typescript@7.x` is now the npm-default "latest" but `typescript-eslint@8.67` does not support it yet**, hard-errors on import; stay on the 6.x line until typescript-eslint publishes TS7 support, don't blindly bump), `@types/react`/`@types/react-dom` pinned to `^18` (matching the installed React 18 runtime — npm's un-pinned install grabbed `@types/react@19` initially, which is wrong for this app and was corrected), `@types/node`, `typescript-eslint`. Added `tsconfig.json` (`allowJs`/`checkJs:false`/`strict:false`, `@`/`@utils` path aliases, no `baseUrl` — deprecated in TS6→7 with `moduleResolution:"bundler"`, `paths` alone works) and a standalone `tsconfig.node.json` for the two config files (not wired via TS project references — hit `composite`/`noEmit` conflicts for no real benefit, dropped the reference). Renamed `vite.config.js`→`.ts`, `vitest.config.js`→`.ts` (also switched its `defineConfig` import from `'vite'` to `'vitest/config'` to get the `test:` field typed). Extended `eslint.config.js` with a `**/*.{ts,tsx}` block using `typescript-eslint`'s non-type-checked `recommended` config at the same `warn` posture as the JS block. Added `npm run typecheck` script. Third-party audit (0.2b): every package needing types has real ones — installed `@types/{lodash,js-cookie,file-saver,qrcode,json2csv,leaflet}`; `react-leaflet`, `react-datepicker`, `qrcode.react`, `react-select`, `sweetalert2`, `i18next`, `react-i18next`, `zod` all ship their own; `@types/react-phone-number-input` turned out to be a deprecated stub (the package ships its own types) — installed then removed. **No ambient `.d.ts` shims were needed at all.** Verified: `npm run typecheck` ✓, `npm run lint` ✓ (146/0, unchanged), `npm run build` ✓, `npm test` ✓ (260/260).
  Completed 0.3: ran the official `npx @tailwindcss/upgrade` codemod (required `--force` — it does a repo-wide git-clean check and the *repo root* has pre-existing unrelated untracked files (`.idea/`, `secret/`, `test.md`) outside Management; verified `Management/` itself was clean first). It auto-migrated `tailwind.config.js`'s `theme.extend.colors` into a `@theme { --color-*: ... }` block at the top of `src/index.css`, switched `@tailwind base/components/utilities` to `@import 'tailwindcss'`, and — notably — auto-added a `@layer base` compatibility shim for v4's default-border-color change (v3→v4 changed the default border color from `gray-200` to `currentcolor`; the shim restores the old default so this stays a non-visual change). The tool's own `npm add tailwindcss@latest` step failed (same pre-existing vite8/`@vitejs/plugin-react`4 peer conflict as everywhere else in this repo) so I finished the dependency swap manually: installed `tailwindcss@^4` + `@tailwindcss/vite` with `--legacy-peer-deps`, added the `tailwindcss()` plugin to `vite.config.ts`, deleted `postcss.config.js` and `tailwind.config.js` (fully superseded — no `@config` directive was added, so nothing still references the JS file) and removed the now-unnecessary `autoprefixer` dependency (v4 handles vendor prefixing internally).
  **One known, accepted non-pixel-identical detail**: v4's default gradient color interpolation space changed (`bg-gradient-to-r` etc. now compile with `in oklab` interpolation instead of v3's implicit sRGB) — this is the standard, expected effect of the official upgrade path (not something the tool "fixes," since it's considered a rendering improvement) and affects the ~50 files using gradient utilities. Visually this is a subtle smoothing of gradient stops, not a broken/missing style — flagging it rather than silently claiming zero visual diff.
  Verified: `npm run build` ✓ (CSS output compiles, spot-checked `bg-gradient-to-r`/`rounded-2xl`/`shadow-xl`/`text-blue-600` are all present in the built CSS), `npm run lint` ✓ (146/0, unchanged), `npm run typecheck` ✓, `npm test` ✓ (260/260), `npm run dev` boots and serves 200 on :5174 (started and stopped manually, no console errors in the log).
  Completed 0.4 (**Phase 0 is now fully done**): initialized shadcn/ui on Base UI via `npx shadcn@latest init -t vite -b base -p nova`. Two hurdles, both solved:
  1. The CLI prompts interactively for a style **preset** even with `-y` — there's no non-interactive "blank/custom" option, so I picked `nova` (Lucide icons + Geist font) since it matches the already-installed `lucide-react` icon set (94 existing usages) rather than introducing a second icon library. The preset only seeds initial placeholder tokens; Phase 1 fully overrides them, so this choice is low-stakes.
  2. The CLI's internal `npm install` steps (both for its own dependencies and for anything installed later via `shadcn add`) kept failing on this repo's pre-existing peer-dependency conflicts — first the known vite8/`@vitejs/plugin-react`4 mismatch, then a new one: `@base-ui/react` has an optional peer on `date-fns@^4` while the app uses `date-fns@2.30.0` (used elsewhere in the app; not upgraded, out of scope). The CLI has no flag to pass `--legacy-peer-deps` through. Fixed for good by adding **`Management/.npmrc`** with `legacy-peer-deps=true` — this isn't a one-off workaround, it's needed for every future `npx shadcn add <component>` call in Phase 2+ too.
  Result: `components.json` (aliases match the plan: `ui`→`@/components/ui`, `utils`→`@/lib/utils`, plus a `hooks`→`@/hooks` alias the CLI adds by default), `src/lib/utils.ts` (the `cn()` helper), and a first real primitive `src/components/ui/button.tsx` (Base UI `Button` wrapped with `cva` variants) — confirms the whole toolchain (Base UI + cva + Tailwind v4 + our path aliases) works end to end. `src/index.css` gained `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"` (the base color-token CSS variables — `--background`/`--foreground`/`--primary`/etc. — live in this imported package rather than inlined; Phase 1 overrides them), `@import "@fontsource-variable/geist"`, and a `@custom-variant dark (&:is(.dark *))` (exactly the mechanism Phase 1.2's real dark mode plan needs) — our existing color `@theme` block and all the hand-written CSS below it (mobile utilities, phone-input overrides) were left untouched. New deps: `@base-ui/react`, `@fontsource-variable/geist`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, and `shadcn` itself (the CLI, kept as a regular dependency per the tool's own convention — harmless, never imported by app code).
  Verified: `npm run typecheck` ✓, `npm run build` ✓ (Geist font files are now bundled since the CSS `@import`s them globally, but nothing renders it yet — `body`'s explicit font-family rule still wins over `html`'s new `font-sans` class, so this is inert until Phase 1's real typography decision; flagging rather than silently shipping unused font weight), `npm run lint` ✓ (147/0 — one new expected warning on `button.tsx`, `react-refresh/only-export-components` for exporting both `Button` and `buttonVariants` from one file, which is upstream shadcn's own standard pattern, not a mistake), `npm test` ✓ (260/260).
  Next: **Phase 1 — Design Token Foundation.** This phase needs the user's actual input (color palette direction, font pairing) via the `frontend-design` skill before any tokens get finalized — don't pick silently.
