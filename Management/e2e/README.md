# Management E2E (Playwright)

Browser E2E for the Management CRM app, scoped narrowly to auth/RBAC and the
core lead workflow — see `CLAUDE.md`'s Testing section for the policy this
suite operates under. `Client/` is explicitly out of scope; it stays
unit/integration-tested only.

## Running

1. Start the backend stack (separate terminal):
   ```
   cd Services && npm run dev
   ```
2. Start Management (separate terminal) — or let Playwright's `webServer`
   config start it for you automatically:
   ```
   cd Management && npm run dev
   ```
3. Run the suite:
   ```
   cd Management && npx playwright install --with-deps   # first run only
   npm run test:e2e
   ```
   `npm run test:e2e:ui` opens Playwright's UI mode; `npm run test:e2e:report`
   opens the last HTML report.

Requires the seed users from `Services/update-passwords.mjs` to exist in the
local stack's database (`superadmin@travelcrm.com`, `alice.admin@travelcrm.com`,
`bob.sales@travelcrm.com` — see `fixtures/test-data.js`).

## Covered

- `auth/login.spec.js` — real login UI: admin login, salesRep login, invalid
  credentials, logout.
- `auth/rbac.spec.js` — role-gated Sidebar nav visibility (superAdmin/admin/
  salesRep) and `ProtectedRoute` "Access Denied" behavior for `/settings` and
  `/users`.
- `leads/lead-lifecycle.spec.js` — create a lead (manual itinerary) as a
  salesRep, confirm it appears in the list, and confirm the Quotation/
  Invoice/Receipt/Voucher dialogs each open correctly scoped to that lead.
  Stops short of actually generating/sending documents — see the `TODO(e2e)`
  comment in that file for why and what's needed to extend it.

## Deferred (not built in this pass)

Per the "narrow E2E, critical journeys only" pyramid guidance in `CLAUDE.md`:
flight/hotel search UI, billing/analytics dashboards, career management UI,
organization settings UI, package/itinerary generation UI, and the deeper
quotation-generate → accept → invoice-convert → receipt → voucher-send chain
(blocked on pricing/package-selection preconditions — see the TODO in
`leads/lead-lifecycle.spec.js`).

## Known accessibility gaps worked around here

`NewLeadDialog`'s form labels aren't associated with their inputs (no
`htmlFor`/`id`, no wrapping) and `ReceiptDialog`/`VoucherDialog`'s close
buttons have no accessible name at all. `utils/selectors.js` works around the
first; the lead-lifecycle spec works around the second by reloading instead of
clicking close. Fixing the underlying components would let both specs use
plain `getByLabel`/`getByRole` and is worth doing independently of this suite.

## CI — not wired up yet

Deliberately left local-only for now (see `Services/e2e-tests/README.md` for
why — same underlying reason: this suite needs the same full backend stack
and database decision that suite is waiting on). When it's time to wire this
into `.github/workflows/`, a job needs:

1. **Everything `Services/e2e-tests`'s CI job needs** (full stack up, health
   checks, DB strategy — see that suite's README) — this suite talks to the
   same backend through the Gateway, so it can't run without it.
2. **Playwright's browser + OS deps**: `npx playwright install --with-deps chromium`.
   This failed in a sandboxed dev environment here (no `sudo`) but works on a
   normal GitHub Actions Ubuntu runner — not a blocker, just don't assume the
   `--with-deps` step is optional.
3. **`CI=true` in the job env** so `Management/vite.config.js`'s
   `open: !process.env.CI` doesn't try to launch a browser tab, and so
   Playwright's own `forbidOnly`/`retries: 2` CI-mode settings kick in
   (`e2e/playwright.config.js` already branches on `process.env.CI`).
4. **Upload `playwright-report/` as a build artifact** on failure (and
   probably always, at least at first) — `actions/upload-artifact`, same
   pattern as any standard Playwright GitHub Actions setup.
5. **Trigger**: start with `workflow_dispatch` (manual) only, same as the
   backend suite — promote to running on PRs/pushes once both suites have
   proven stable and a real CI database story exists for the backend half.
