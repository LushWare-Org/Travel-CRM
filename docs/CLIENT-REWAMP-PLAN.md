# Client App Rewamp — Phased Plan

Status: PLANNING ONLY. No code changed, nothing committed. Written after a live audit
of `Client` (customer-facing app, vite+React+Tailwind, no component library) running
against the real backend (all 12 services + Supabase), 8 routes, desktop (1440x900)
and mobile (375x667/812).

Base branch for every phase: `microservices` (current branch). Each phase is its own
branch, its own session, its own PR back into `microservices`. Do not skip ahead —
Phase 0 changes the primitives every later phase builds on.

---

## Evidence from this audit (grounds every phase below)

1. **Filter sidebar breaks on real laptop widths.** `Client/src/features/destinations/components/FiltersSidebar.tsx`
   and `Client/src/features/packages/components/FiltersSidebar.tsx` (both wrapped by
   `Client/src/components/shared/FilterPanelShell.tsx`) use a `2xl:` (1536px) breakpoint
   to switch from "mobile drawer" to "clean sticky sidebar." Most laptops run
   1366–1440px — below that breakpoint. At 1440px both `/packages` and
   `/destinations-international` render the drawer treatment: a fixed-position panel
   with a backdrop, content bleeding around its edges, and an internal scrollbar
   (measured: `scrollHeight` 1124px inside a 828px box). This is very likely what
   you're seeing as "scrollbars everywhere."
2. **Hero text overlapped by the floating action stack on short mobile viewports** —
   already found and fixed in the previous session (`693d63e`, `HomeContainer.tsx`).
   The same fixed-stack-vs-vh-hero interaction needs checking on every other page with
   a full-bleed hero (`/contact`, `/about`, `/destinations-international`, package
   details).
3. **Team photos are broken.** `Client/src/content/about.js` hotlinks team member
   photos from `i.postimg.cc` (a free public image host). All 8 cards on `/about`
   render blank. Third-party hotlink hosts are unreliable and a client site should
   never depend on one.
4. **No shared UI library in `Client`.** Every button, card, modal, and input is
   hand-rolled Tailwind. Radius is inconsistent (`rounded-xl` / `rounded-2xl` /
   `rounded-3xl` used interchangeably for the same kind of element), CTA button
   styling differs per page (gradient green-gold hero search button vs. solid black
   "View Details" vs. gradient "Send Message"), and focus/hover states aren't
   systematic. Your sibling app `Management` already runs `shadcn/ui` + `@base-ui/react`
   + Tailwind v4 — that's the target, not a new library choice.
5. **Icon-circle color is inconsistent** (`/contact`'s Call/Email/Visit cards use blue,
   pink, and orange circle icons respectively — three unrelated brand colors on one
   page, next to a site that otherwise commits to one green/gold palette).
6. **Floating action stack (`Ask us` / WhatsApp / Call / Scroll-top) renders on nearly
   every page** and is the single biggest visual-clutter item site-wide, plus the
   direct cause of finding #2's mobile overlap.
7. **Career page lists visibly duplicated job postings** (same ~4 roles repeated
   8x). This is `career-service` seed/API data, not a `Client` rendering bug — flagged
   here so it's tracked, but it belongs to a backend-service task, not a Client PR.
8. **AI-slop signals present but mild:** brand-consistent color use (good — this isn't
   generic purple-gradient slop), but the 3-icon-feature-grid pattern appears twice
   ("Travel That Gives Back," "Why Travel With Us") and decorative blurred circle
   shapes appear in the CTA section (`bg-blue-500/5 rounded-full blur-3xl` in
   `HomeContainer.tsx`'s closing CTA) — the exact "decorative blob" AI-slop pattern.
9. **Responsive is currently "stack the desktop layout,"** not designed mobile
   layouts — confirmed on the home page (mobile/tablet screenshots are the same
   card order and grouping as desktop, just narrower), consistent with the skill's
   "responsive is design, not just not-broken" rule.

Routes covered this audit: `/`, `/packages`, `/contact`, `/destinations-international`,
`/about`, `/career`, `/login`, `/planner`. Not yet audited: `/package/:id`,
`/package/:id/customize`, `/my-account`, the booking modal, and the assistant chat
panel's open state — Phase 1 picks these up.

---

## Journey — Home → Booking Funnel

Added by `/plan-design-review` (both outside voices independently flagged the same
gap: nothing connects the five customer-facing phases into one funnel).

**The funnel:** inspire on home → narrow on destinations/packages → commit in
planner/customize → confirm in account. Every phase below must build toward this
chain, not just restyle its own surface in isolation.

- **Home (Phase 2)'s job in the funnel:** build enough trust and inspiration to move
  a first-time visitor into the planner, or get a returning visitor back into their
  trip. Every home section's fix in Phase 2 must state which of those two jobs it
  serves — sections serving neither are consolidation candidates (see Phase 2).
- **Destinations/Packages (Phase 3)'s job:** narrow the visitor from "browsing" to
  "I want this specific package" — the `PackageCard`'s CTA is the funnel's
  narrowing point, not just a UI component (see Phase 3's data contract).
- **Planner/Booking (Phase 4) decision-point trust content:** at the point a visitor
  is about to submit, the page must surface: total price clarity (is it per-person
  or total, are taxes/fees included), cancellation/refund terms, deposit terms if
  any, and a visible human-support escape hatch (the floating launcher, scoped per
  Phase 1, must be reachable here specifically). This is high-consideration travel
  spend — reassurance at commit time is not optional polish.
- **Post-booking landing (Phase 4 → Phase 5 seam):** on successful submit, the user
  lands on a confirmation state (see Phase 4's state table) that states plainly what
  happens next (confirmation email timing, whether an agent will contact them,
  payment timeline) and links into `/my-account`, which becomes the "this booking is
  real" anchor — Phase 5 must render the booking there, not just a generic account
  shell.
- **First-time vs. returning visitor:** home, planner, and account currently treat
  every visitor identically. Minimum bar for this rewamp (resolved by
  `/plan-eng-review` — the original "saved travelers" claim had no backing data
  model): a logged-in returning visitor's planner pre-fills from their most recent
  booking via `booking-service`'s existing `getUserBookings` endpoint, zero new
  backend work. The fuller saved-traveler-profile version is a separate backend
  TODO (see `TODOS.md`), not a dependency of this rewamp.

---

## Phase 0 — Design System Foundation
**Branch:** `client-rewamp/00-design-system`

The one phase every other phase depends on. Nothing here is visible to a user yet;
it's the primitives.

- Install `shadcn/ui` + `@base-ui/react` + `class-variance-authority` + `clsx` +
  `tailwind-merge` in `Client` — same stack `Management` already runs, so both apps
  share one design language and one upgrade path.
- **Tailwind v4 migration path** (resolved by `/plan-eng-review` — the plan
  previously left this unspecified for a non-trivial JS config): fully migrate to
  CSS-first `@theme`, following `Management/src/index.css`'s exact existing pattern
  (`@theme inline { --font-heading: ...; }`, hand-written CSS custom properties —
  confirmed Management does NOT use a JSON-to-CSS codegen step, so this needs no new
  build tooling). Port `Client/src/config/palettes/lush.json`'s brand/brandAccent/
  brandDark/neutral color scales, fonts, and typeScale into `@theme` variables by
  hand in Client's main CSS file. Also port the existing `tailwind.config.js`'s
  custom `zIndex` scale (base/raised/elevated/.../modal — the named stacking tokens
  already documented in that file) and `kenburns` keyframes/animation the same way.
  Delete `tailwind.config.js` once the port is verified equivalent.
- Write `Client/DESIGN.md`: color tokens (now sourced from the ported `@theme`
  variables above, not the JSON file directly), spacing scale, radius scale (pick
  ONE radius per component kind: card, button, input, modal), one accent color
  rule, typography (keep Fraunces + Inter, already loaded via
  `VITE_GOOGLE_FONTS_URL` — just formalize which weight/size pairs are "headline,"
  "body," "caption").
- **Shared `RangeFilterGroup` primitive** (resolved by `/plan-eng-review` — both
  `Client/src/features/destinations/components/FiltersSidebar.tsx` and
  `Client/src/features/packages/components/FiltersSidebar.tsx` copy-paste their
  range-option rendering, confirmed by diffing both files): one component renders a
  labeled group of range options (checkbox list + selected state), parameterized by
  the option list. Destination-specific (region/country) and package-specific
  (duration) filters stay in their own files — only the shared range-list pattern
  moves here. Consumed by both `FiltersSidebar` copies in Phase 1.
- **Elevation policy** (added by `/plan-design-review` — Codex litmus check 7 failed
  without this): state which surfaces use shadow vs. border vs. image-contrast for
  elevation. Default to border/contrast; reserve shadow for genuinely floating
  elements (modals, the floating launcher, dropdowns) — not every card.
- **Motion budget** (same finding): name the 2-3 allowed motion patterns sitewide —
  hero background zoom (Ken Burns), hover/reveal on interactive elements, and
  scroll-linked entrance for section headings. Anything not on this list (shine
  sweeps, typewriter effects, decorative pulse) gets removed in the phase that owns
  it, not added to in later phases.
- Port base primitives via shadcn CLI: Button, Card, Input, Select, Dialog, Sheet
  (replaces the hand-rolled filter drawer), Tabs (replaces the FAQ tab bar), Badge.
  Do NOT touch page code yet — this phase only adds the primitives and the tokens.
- Add `components.json` config matching `Management`'s so future `shadcn add` calls
  behave identically across both apps.

**Acceptance:** `Client/DESIGN.md` exists and is followed, including elevation and
motion-budget sections; shadcn primitives installed and render in a throwaway
`/dev/style-guide` route (deleted before merge, or kept behind a flag); Tailwind v4
build green; zero page-visible changes yet.

---

## Phase 1 — Global Chrome
**Branch:** `client-rewamp/01-global-chrome`

Everything that renders on every page. Fix once here, not per-page later.

- **Floating action stack redesign** (`FloatingActionStack.tsx`, `AssistantWidget.tsx`,
  `WhatsAppButton.tsx`, `CallButton.tsx`, `ScrollTopButton.tsx`): collapse
  Call+WhatsApp+Assistant into a single expandable launcher (shadcn `Popover` or a
  speed-dial pattern) instead of 3-4 permanently stacked buttons. Cuts visual clutter
  site-wide and removes the overlap risk from finding #2 by construction — one anchor
  point, not four.
- **Launcher visibility scope** (added by `/plan-design-review` — Codex flagged the
  launcher competing with the brand hero on marketing pages): on app pages
  (`/planner`, `/package/:id/customize`, booking modal, `/my-account`, `/login`) the
  launcher is always visible. On marketing pages (`/`, `/about`, `/contact`,
  `/destinations-international`) it fades in only after the same scroll threshold
  the current `WhatsAppButton`/`CallButton` already use — never rendering inside the
  hero's first viewport. Exception: the Phase 4 decision-point trust content (see
  Journey section above) always shows the launcher regardless of scroll position,
  since it's the human-support escape hatch at the moment of commit.
- **Filter drawer/sidebar rebuild** (finding #1): replace `FilterPanelShell` +
  both `FiltersSidebar.tsx` copies with a shadcn `Sheet` (mobile/tablet, real slide-in
  drawer with a real backdrop, no bleed) and a plain sticky-static column at desktop
  widths (`lg:` 1024px breakpoint, not `2xl:` 1536px — matches actual laptop widths).
  Internal filter-list scrolling only kicks in if the filter list is taller than the
  viewport, using `max-h-[calc(100vh-Npx)]` consistently, not a mix of `h-` and
  `max-h-`. Both sidebars consume Phase 0's `RangeFilterGroup` for their price/
  duration range options instead of each rendering their own copy.
- **Header**: audit `Header.tsx`'s sticky/scroll-state behavior across all 8 routes
  (contrast on light-hero pages like `/about`), confirm the mobile menu (`z-modal`
  portal) doesn't fight the floating stack's `z-floating-action` token.
- **Footer**: swap hand-rolled markup for shadcn primitives where applicable
  (link lists, social icons) per the new DESIGN.md.
- Replace all hardcoded `rounded-xl`/`rounded-2xl`/`rounded-3xl` on shared chrome with
  the Phase 0 radius tokens.

**Acceptance:** floating stack is one control on every page, scoped per the
visibility rule above, no overlap at 375×568 through 1920×1080; filter drawer has no
internal double-scrollbar at 1280–1440px; before/after screenshots at 3 breakpoints
per changed component.

---

## Phase 2 — Home Page Rebuild
**Branch:** `client-rewamp/02-home`

**Primary job of this page** (added by `/plan-design-review`): convert a first-time
visitor into a planner session, or return a known visitor to their in-progress trip
(see Journey section above). Hierarchy: hero (brand + primary CTA into search/planner)
→ trust/inspiration content (consolidated, see below) → catalog entry points
(Featured Packages, Recently Booked) → conversion FAQ/CTA. Anything that doesn't
serve one of those four roles is a consolidation candidate, not a section to
preserve by default.

- **Section consolidation before rebuild** (added by `/plan-design-review` — both
  outside voices independently flagged this): the current ~12 sections spread the
  same trust/social-proof job across "Travel That Gives Back," "Why Choose LUSH
  Ware," "Why Travel With Us," "Recently Booked," "Trusted Partners," and
  "Testimonials." Before rebuilding any section on primitives, approve a final
  section map that merges or cuts overlapping trust content down to one or two
  sections doing that job well, instead of six doing it thinly. Do this decision
  first — rebuilding sections on shadcn primitives that then get cut is wasted work.
- **Hero rebuild** (added by `/plan-design-review` — Codex hard rejection: the
  current hero auto-rotates through 4 unrelated headline/subtitle pairs every 5s
  with the search action detached in a separate section below): replace with one
  static hero composition — single headline + subline + the search/CTA integrated
  directly into the hero, not a separate section beneath it. Keep the Ken Burns
  background zoom (per Phase 0's motion budget) as the hero's only motion; remove
  the message rotation.
- Rebuild the consolidated section set (post-merge) and closing CTA on Phase 0
  primitives.
- Remove the two 3-icon-feature-grid instances' generic layout (finding #8) — vary
  section rhythm so consecutive sections don't all read as "icon + heading + 2-line
  body" (this skill's "cookie-cutter section rhythm" AI-slop rule).
- Remove decorative blurred-blob divs in the closing CTA section; if the section
  needs visual interest, use the brand imagery already available, not a content-free
  gradient blob.
- **Design mobile and tablet layouts, not stacked desktop** (finding #9): each
  section gets an actual mobile composition decision — e.g., "Recently Booked"
  becomes a horizontal swipeable carousel on mobile instead of a vertically stacked
  card list; "Why Travel With Us" alternating image/text rows collapse to
  image-then-text (not text first) to match reading order.
- **States** (added by `/plan-design-review`): "Recently Booked" empty (no prior
  bookings — a likely first-visit state) shows popular packages instead of hiding
  the section or showing fake data; "Featured Packages" empty shows a graceful
  fallback, never a blank section.

**Acceptance:** section map approved before rebuild; hero is one static composition
with integrated search; home page fully rebuilt on shadcn primitives; distinct,
intentional mobile/tablet compositions per section (not just narrower desktop);
empty states specified for data-driven sections; Lighthouse/CLS check since hero
media + Ken Burns animation is layout-sensitive.

---

## Phase 3 — Destinations & Packages (listing + detail)
**Branch:** `client-rewamp/03-destinations-packages`

**Primary job of this page:** narrow the visitor from browsing to "I want this
specific package" (see Journey section above) — the `PackageCard`'s CTA is the
funnel's narrowing point.

- `/destinations-international`, `/packages`, `/package/:id` on the new filter
  drawer (Phase 1) and Phase 0 primitives.
- **`PackageCard` data contract** (added by `/plan-design-review` — pins the
  ambiguity Claude's subagent flagged): one `PackageCard` component with a base
  contract (image, name, price) plus an explicit variant slot for context-specific
  fields — booked-date for "Recently Booked," sold-out/availability badge for the
  listing, rating for "Featured Packages." One component, one documented extension
  point — not silent per-surface duplication and not an over-general prop soup.
- Package detail page: audit the image gallery, booking CTA placement, and the
  hero-height mobile media queries already present in `PackageDetailsContainer.tsx`
  (`.hero-height-mobile`, `.hero-height-sm` — these are hand-rolled `<style>` blocks;
  fold them into Tailwind/DESIGN.md tokens instead of inline `!important` overrides).
- **States** (added by `/plan-design-review`): zero filter results (with a way to
  relax filters, not just "no results"), a destination with no packages, package
  image gallery loading/error, sold-out badge via the `PackageCard` variant slot
  above.

**Acceptance:** one `PackageCard` component with the documented variant contract,
used in 3+ places; filter drawer works cleanly at 1280–1440px; zero-result and
sold-out states specified; package detail page passes the same responsive-design bar
as Phase 2.

---

## Phase 4 — Planner & Booking Flow
**Branch:** `client-rewamp/04-planner-booking`

**Primary job of this flow:** convert intent into a committed booking without losing
the visitor to doubt or a broken submit (see Journey section above — this is the
highest business-value flow in the plan).

- `/planner` (4-step wizard: Destination → Dates & Travelers → Plan Itinerary →
  Contact Info), `/package/:id/customize`, and `BookingModal.tsx`.
- Stepper UI on shadcn primitives (currently hand-rolled numbered circles).
- `BookingModal.tsx` and `ProfileEditModal.tsx`'s `sticky top-0` inner headers →
  shadcn `Dialog` (gets scroll-lock, focus-trap, and escape-to-close for free instead
  of hand-rolled).
- **Step & submission states** (added by `/plan-design-review`, rated critical by
  both outside voices; scoped to backend reality by `/plan-eng-review` — see below):

  | Feature | Loading | Empty | Error | Success | Partial |
  |---|---|---|---|---|---|
  | Destination step | destination list skeleton | "no destinations match {filters}" + relax-filter action | — | — | — |
  | Dates & Travelers | — | — | invalid range, past date, window too long (inline, per-field) | — | — |
  | Plan Itinerary | itinerary-generation spinner (AI path) | — | AI generation failure → fallback to manual entry | — | AI partially generates, user completes rest |
  | Availability | — | — | **generic failure message** ("couldn't complete your booking, please try again or contact us") — NOT a specific "sold out"/"conflict" claim, since `booking-service` has no availability check today (see `/plan-eng-review` note below) | — | — |
  | Submit | button disabled + spinner, **double-submit guard** (disable on first click, ignore repeat clicks until response) | — | card declined / service timeout, with the same generic retry message — never silently drop the form data on error | confirmation state (see below) | same generic message; do not claim "full rollback" in the UI until the backend TODO below lands |
  | Browser back mid-wizard | — | — | — | — | wizard step state persists via a `?step=` URL search param, read on mount and written on every step transition (`PlanYourTripContainer.tsx`'s `useState(1)` today has no URL binding — this is new work, not a copy) |

  **`/plan-eng-review` note (Architecture Issue 1):** read `booking-service`'s
  `createWebsiteBooking` (`Services/booking-service/src/controllers/booking.controller.js:180-281`)
  directly — it has no availability/inventory check and no real cross-service
  rollback (only a manual `booking.delete` on `createLead` failure, which doesn't
  cover auto-assign or email side effects). The table above intentionally does NOT
  promise availability-conflict detection or atomic rollback in the UI — that would
  be a false claim the backend can't back up. See `TODOS.md`'s "booking-service:
  real availability check + cross-service rollback" for the backend fix; Phase 4
  does not depend on it.
  **Returning-visitor pre-fill (Architecture Issue 3):** the Destination and Dates
  steps pre-fill from the visitor's most recent booking via `booking-service`'s
  existing `getUserBookings` endpoint when the visitor is logged in and has one —
  zero new backend work. The fuller saved-traveler-profile version is a separate
  backend TODO, not a Phase 4 dependency.

  **Success destination:** confirmation state states plainly what happens next
  (confirmation email timing, whether an agent will contact them, payment timeline)
  and links to `/my-account`, where the booking must actually render (see Phase 5).
- This is the highest business-value flow (it's how bookings happen) — budget extra
  QA time; test the full 4-step flow end to end after the rebuild, not just visually,
  including the double-submit guard and the browser-back persistence case above.
- **`BookingModal.test.tsx`** (added by `/plan-eng-review` — this file has zero
  existing tests today): required before Phase 4 merges, covering the double-submit
  guard, shadcn `Dialog` focus-trap, and escape-to-close, matching the test quality
  bar already set by `PlanYourTripContainer.test.tsx`'s 24+ cases.

**Acceptance:** wizard and modals on shadcn `Dialog`/stepper primitives; every row of
the state table above implemented and smoke-tested; wizard step reflected in
`?step=` and restored correctly on browser back/forward and reload;
`BookingModal.test.tsx` exists and covers double-submit/focus-trap/escape; full
booking flow smoke-tested end to end (not just screenshotted), specifically
including a duplicate-submit attempt and a mid-wizard browser-back.

---

## Phase 5 — Account & Auth
**Branch:** `client-rewamp/05-account-auth`

**Primary job of `/login`:** authenticate quickly — it's a task screen, not a
landing page. **Primary job of `/my-account`:** be the "this booking is real"
anchor a Phase 4 confirmation links to (see Journey section above).

- `/login`, `/my-account`.
- **Login hierarchy — form-first** (added by `/plan-design-review`, resolving the
  form-first-vs-brand-first ambiguity Claude's subagent flagged): the form is the
  primary element, not a 50/50 partner with the branding panel. Shrink the branding
  panel further than a simple rebalance — logo + at most 1-2 trust bullets, sized as
  a supporting sidebar, not a co-equal half of the screen. The current "LUSH WARE"
  wordmark dominating ~70% of the left panel gets replaced under this rule, not
  just resized.
- **`/my-account` renders bookings** (added by `/plan-design-review` — this was a
  silent gap; Phase 4 links here on confirmation and the page had no stated content
  spec): the account page must show the visitor's bookings (status, dates,
  destination), not just a generic profile shell. **States:** empty account (no
  trips yet — first-time visitor, since this is also the Phase 4 landing target),
  login error (wrong password, inline not just a toast), session-expired mid-booking
  (redirect back to the exact wizard step, not to a blank login page).
- Form inputs → shadcn `Input`/`Form` (React Hook Form + zod already a dependency
  in `Management`; `Client` already depends on `zod` too, just needs `react-hook-form`
  added — check before adding a second form-handling pattern).

**Acceptance:** login is form-first with a supporting (not co-equal) branding panel;
`/my-account` renders real booking data with empty/error/session-expired states
specified above; login/register/my-account on shadcn form primitives; branding panel
proportion verified at 1440px and 375px.

---

## Phase 6 — Content Pages
**Branch:** `client-rewamp/06-content-pages`

**Primary job of these pages:** support the trust/inspiration role assigned to them
in the Journey section — not a catch-all for "everything else."

- `/about`, `/contact`, `/career` (styling only — the duplicate job-listing data is
  a backend-service issue, see "Out of scope" below).
- Fix finding #3: replace `i.postimg.cc` hotlinks in `Client/src/content/about.js`
  with self-hosted assets (same `Client/public/lush/` convention the hero images
  already use).
- Fix finding #5: unify the 3 contact-method icon circles to one accent color
  (per DESIGN.md), differentiate the cards by icon shape/label only, not by color.

**Acceptance:** team photos render (self-hosted); contact icons on one accent color;
about/career pages on Phase 0 primitives.

---

## Phase 7 — Accessibility & Cross-Breakpoint Audit
**Branch:** `client-rewamp/07-a11y-responsive`

Full-site pass, after every page has been rebuilt, not before — otherwise this
phase repeats itself.

- Every page at 375×667, 375×812, 768×1024, 1280×800, 1440×900, 1920×1080.
- Contrast ratios (this skill's hard rule: body text ≥4.5:1, never below 16px).
- Keyboard navigation and focus states through the full booking flow (Phase 4).
- `aria-label`/landmark audit — `AssistantWidget`/`WhatsAppButton`/`CallButton`
  already have `aria-label`s; verify the new shadcn `Sheet`/`Dialog` swaps didn't
  regress focus-trap or `aria-modal`.
- **State announcements** (added by `/plan-design-review` — both outside voices
  warned that adding states in Phases 2-5 without an announcement story ships
  invisible to screen-reader users): every async state added in Phases 2-5 gets
  `aria-live`/`role="status"` on load/success/error transitions, `aria-busy` during
  Phase 4's submit-in-flight state, and inline validation errors linked via
  `aria-describedby` — checked specifically across the booking flow.
- Re-run the overflow probe from this audit (scan every element for
  `scrollHeight > clientHeight` with `overflow: auto|scroll`) across all 8+ routes to
  confirm finding #1's fix didn't just move the bug to another breakpoint.

**Acceptance:** zero unintended internal scrollbars at any audited breakpoint; WCAG
AA contrast on body text sitewide; full keyboard pass on the booking flow; state
announcements verified with a screen reader (VoiceOver/NVDA) on the booking flow
specifically, not just an automated axe/contrast pass.

---

## Phase 8 — Performance & Final Polish
**Branch:** `client-rewamp/08-performance-polish`

- Image optimization pass (hero images, package thumbnails) — check format
  (WebP/AVIF), responsive `srcset`, and lazy-loading below the fold.
- **Font-loading strategy** (added by `/plan-design-review` — the plan's "no
  unstyled flash" acceptance criterion had no strategy behind it): self-host
  Fraunces/Inter via `@fontsource` (same pattern `Management` already uses for
  Archivo/JetBrains Mono/Public Sans) instead of the runtime Google Fonts stylesheet
  URL (`VITE_GOOGLE_FONTS_URL`), with `font-display: swap` and a metric-matched
  fallback stack to minimize layout shift during load.
- Motion audit: keep the Ken Burns hero and card hover states (they're intentional,
  not decorative filler per Phase 0's motion budget), but confirm
  `prefers-reduced-motion` is respected.
- Final AI-slop re-score against this skill's blacklist now that Phase 2's rhythm
  fix and Phase 0's token system are in.
- Bundle check: `vite.config.ts`'s existing manual chunking (`router-vendor`,
  `react-vendor`, `utils-vendor`, `pdf-vendor`, `icons-vendor`) — confirm the new
  shadcn/base-ui dependencies land in a sensible chunk, not bloating the main bundle.

**Acceptance:** fonts self-hosted with `font-display: swap` and measured CLS
improvement; Lighthouse performance score recorded before/after; no unstyled flash
on the new component set; final design score + AI-slop score recorded per the
`/design-review` scoring rubric.

---

## Phase 9 — Full-Site QA + Merge
**Branch:** `client-rewamp/09-final-qa`

- Run `/design-review` for real this time (all pages, both outside-voice reviewers,
  regression scoring) against the completed rewamp as the final gate before this
  branch is the one that gets merged last.
- Confirm every prior phase branch has already been merged into `microservices` —
  this phase is integration QA on the accumulated result, not another feature phase.
- Full regression pass on the booking flow (Phase 4) with the real backend, not
  just visual QA.

**Acceptance:** `/design-review` final report attached; all phase branches merged;
no open P0/P1 findings.

---

## Out of scope for `Client` (flag, don't fix here)

- **Career listing duplication** (finding #7) — `career-service` seed/API data.
  File as a `career-service` task; Phase 6 only fixes how the (eventually correct)
  data is styled.
- **Backend response shapes/timing** — none observed this audit, but any found
  during Phase 4's booking-flow QA route to the owning service, not a `Client` PR.
- **`booking-service` availability check + cross-service rollback** (surfaced by
  `/plan-eng-review`, Architecture Issue 1) — `createWebsiteBooking` has neither
  today. Filed as a `TODOS.md` item; Phase 4's UI is scoped to a generic
  retry/failure message specifically so it doesn't promise backend behavior that
  doesn't exist.
- **`user-service` saved-traveler-profile** (surfaced by `/plan-eng-review`,
  Architecture Issue 3) — no such data model exists. Filed as a `TODOS.md` item;
  Phase 4 ships a narrower most-recent-booking pre-fill instead, which needs no
  new backend work.
- **`Management` app** — explicitly out of scope per this session's earlier
  decision (client-facing app only). It's already ahead on the shadcn/Tailwind v4
  stack Phase 0 adopts, so it's the reference implementation, not a rewamp target.


## What already exists (reuse, don't reinvent)

- `Management` app's full stack: `shadcn/ui`, `@base-ui/react`, Tailwind v4 +
  `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`,
  `components.json` config, and self-hosted `@fontsource-variable` fonts — Phase 0
  and Phase 8 both copy this pattern rather than choosing fresh.
- `Client/src/palettes/lush.json` — existing brand color scale and type scale,
  the starting point for Phase 0's DESIGN.md tokens.
- `Client/src/config/floatingActions.ts`'s existing scroll-threshold fade-in
  pattern (already used by `WhatsAppButton`/`CallButton`) — Phase 1 extends this
  pattern to the marketing-page launcher-visibility rule rather than inventing a
  new mechanism.
- `Client/public/lush/` self-hosted asset convention (already used for hero
  images) — Phase 6 uses this same location for the replacement team photos.
- `Management/src/index.css`'s hand-written `@theme inline { --font-heading: ...; }`
  pattern (confirmed by `/plan-eng-review` — no JSON-to-CSS codegen tooling exists
  or is needed) — Phase 0's Tailwind v4 migration ports `lush.json` into this same
  hand-written `@theme` style.
- `booking-service`'s existing `getUserBookings` endpoint (confirmed by
  `/plan-eng-review` — `Services/booking-service/src/controllers/booking.controller.js:283-306`)
  — Phase 4's returning-visitor pre-fill and Phase 5's `/my-account` bookings list
  both consume this directly, zero new backend work.
- `Client/src/features/planner/hooks/useTripWizard.ts`'s existing
  `loadOrCreateSessionId` localStorage pattern — precedent for client-side
  persistence conventions in this codebase, though Phase 4's wizard-step
  persistence uses a URL param instead (see Phase 4) since it specifically needs
  browser back/forward semantics, not just reload survival.

## Unresolved Decisions

All nine design gaps surfaced by `/plan-design-review` were resolved during this
review (see each phase's "added by `/plan-design-review`" callouts above). One item
remains genuinely open:

- **AI-generated itinerary failure UX** (Phase 4's Plan Itinerary step): the state
  table specifies "AI generation failure → fallback to manual entry," but the exact
  copy/interaction for that fallback (does the user see a visible error message
  first, or does it silently switch to manual mode?) wasn't decided — genuinely
  depends on the AI itinerary feature's actual failure modes, which weren't in this
  audit's scope. Defer to Phase 4's implementing session, informed by the
  `assistant-service` behavior at that time.

## Branch/merge mechanics

- Every phase branches from `microservices` at the start of its session (`git checkout
  microservices && git pull && git checkout -b client-rewamp/0N-name`).
- Rebase (not merge) onto `microservices` before opening each PR, since phases are
  sequential and each depends on the prior phase's primitives already landing.
- One phase = one PR = one session. Don't start Phase N+1's branch until Phase N is
  merged — Phase 0's tokens and Phase 1's chrome are load-bearing for everything after.
- Nothing in this plan has been committed. First commit happens when Phase 0 starts.

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific finding
above. Run with Claude Code or Codex; checkbox as you ship.

- [ ] **T1 (P1, human: ~1h / CC: ~10min)** — Phase 2 — Approve consolidated home
  section map before any rebuild
  - Surfaced by: Pass 4b / Journey — 12 sections with overlapping trust jobs
  - Files: `Client/src/features/landing/HomeContainer.tsx` and its section components
  - Verify: written section map with one job per section, reviewed before Phase 2 branch starts coding
- [ ] **T2 (P1, human: ~2-3h / CC: ~20min)** — Phase 2 — Rebuild hero as one static composition, remove message rotation
  - Surfaced by: Pass 4 hard rejection (Codex) — rotating headline carousel with no narrative
  - Files: `Client/src/features/landing/HomeContainer.tsx`, `Client/src/content/home.ts`
  - Verify: hero renders one headline/CTA, search integrated in hero, only Ken Burns motion remains
- [ ] **T3 (P1, human: ~1-2h / CC: ~20min)** — Phase 4 — Implement full step/submission state table
  - Surfaced by: Pass 2 (critical) — zero state coverage in the booking flow
  - Files: planner wizard components, `BookingModal.tsx`, `CustomizePackageContainer.tsx`
  - Verify: manual test of double-submit guard, mid-wizard browser-back, and each error/empty state in the table
- [ ] **T4 (P2, human: ~30min / CC: ~10min)** — Phase 0 — Add elevation + motion-budget sections to DESIGN.md
  - Surfaced by: Pass 5 — shadow/motion policy missing, Codex litmus 7 fail
  - Files: `Client/DESIGN.md` (new)
  - Verify: DESIGN.md reviewed, names allowed motion patterns and elevation rule
- [ ] **T5 (P2, human: ~30min spec / CC: ~15min impl)** — Phase 1 — Scope floating launcher visibility by page type
  - Surfaced by: Pass 6 (Codex) — launcher competes with hero on marketing pages
  - Files: `FloatingActionStack.tsx`, `AssistantWidget.tsx`, `config/assistantRoutes.ts`
  - Verify: launcher absent from marketing-page hero viewport pre-scroll, always visible on app pages
- [ ] **T6 (P2, human: ~20min spec / CC: ~10min)** — Phase 3 — Pin PackageCard variant data contract
  - Surfaced by: Pass 7 — ambiguous "one card, 3+ places" claim
  - Files: new `PackageCard` component, `FeaturedPackages`, `RecentlyBookedSlider`, packages listing
  - Verify: one component import used by all three surfaces with typed variant prop
- [ ] **T7 (P2, human: ~15min / CC: ~10min)** — Phase 5 — Login form-first hierarchy
  - Surfaced by: Pass 7 — form-first vs. brand-first ambiguity
  - Files: `Client/src/features/.../Login` page component
  - Verify: branding panel reduced to logo + ≤2 bullets, form is primary visual element at 1440px and 375px
- [ ] **T8 (P2, human: ~30min / CC: ~15min)** — Phase 8 — Self-host fonts with font-display: swap
  - Surfaced by: Pass 7 — FOUT risk, no font-loading strategy
  - Files: `Client/index.html`, `Client/package.json` (add `@fontsource-variable/fraunces`, `@fontsource-variable/inter`), remove `VITE_GOOGLE_FONTS_URL` usage
  - Verify: Lighthouse CLS measured before/after, no runtime Google Fonts request
- [ ] **T9 (P3, human: ~20min / CC: ~10min)** — Phase 7 — Add state-announcement checks
  - Surfaced by: Pass 6b — a11y audit missing aria-live/aria-busy coverage
  - Files: booking flow components touched by T3
  - Verify: VoiceOver/NVDA pass confirms state changes are announced
- [ ] **T10 (P1, human: ~1h / CC: ~15min)** — Phase 4 — Wizard step as URL search param
  - Surfaced by: Eng Review Architecture Issue 2 — no persistence mechanism existed
  - Files: `Client/src/features/planner/PlanYourTripContainer.tsx`
  - Verify: `?step=2` loads step 2 directly; browser back/forward steps through the wizard; reload preserves current step
- [ ] **T11 (P1, human: ~1h / CC: ~15min)** — Phase 4 — Soften availability/rollback UI to generic retry message
  - Surfaced by: Eng Review Architecture Issue 1 — booking-service has no availability check or real rollback
  - Files: planner wizard, `BookingModal.tsx`
  - Verify: no UI copy claims "sold out"/"conflict detected"/"rolled back" until the booking-service TODO lands
- [ ] **T12 (P1, human: ~1h / CC: ~15min)** — Phase 4 — `BookingModal.test.tsx` (new — zero existing coverage)
  - Surfaced by: Eng Review Test Section — no test file exists for this component today
  - Files: `Client/src/features/packages/components/BookingModal.tsx` + new test file
  - Verify: double-submit guard, focus-trap, escape-to-close all covered
- [ ] **T13 (P2, human: ~1h / CC: ~15min)** — Phase 0/1 — Extract shared `RangeFilterGroup`
  - Surfaced by: Eng Review Code Quality Issue 5 — duplicated range-option rendering confirmed by diff
  - Files: new `RangeFilterGroup` component, both `FiltersSidebar.tsx` copies
  - Verify: both sidebars import the same component; no duplicated range-list JSX remains
- [ ] **T14 (P2, human: ~2h / CC: ~20min)** — Phase 0 — Tailwind v4 `@theme` port
  - Surfaced by: Eng Review Architecture Issue 4 — migration path was unspecified
  - Files: `Client/tailwind.config.js` (deleted), new `@theme` block in Client's main CSS
  - Verify: `lush.json`'s colors/fonts/type-scale and the existing z-index/keyframe scale render identically after the port; `tailwind.config.js` removed
- [ ] **T15 (P3, human: ~1h / CC: ~15min)** — Phase 4 — Most-recent-booking pre-fill
  - Surfaced by: Eng Review Architecture Issue 3 — no saved-traveler data model exists
  - Files: `PlanYourTripContainer.tsx`, consumes existing `booking-service` `getUserBookings`
  - Verify: logged-in visitor with ≥1 prior booking sees Destination/Dates pre-filled from their most recent booking

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 (as design outside voice) | issues found, resolved | hard rejections #2/#6, elevation/motion gap — all folded into phases above |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 5 issues found (4 architecture, 1 code quality), 1 test gap, 0 performance issues, all resolved into the plan; 2 backend TODOs filed |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open → resolved | score: 4/10 → 8/10, 9 decisions made, 1 deferred (AI itinerary failure UX, Phase 4) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | not run |

- **CODEX:** Two hard rejections found (rotating hero carousel with no narrative; weak brand presence in hero) — both resolved via T2 above (static hero composition). Elevation/shadow policy gap resolved via T4.
- **CROSS-MODEL:** Codex and the independent Claude subagent converged without prompting on the same root finding — the plan is strong engineering, weak product design — and both flagged the Phase 4 booking flow as the highest-risk gap. Eng Review then found that flow's backend assumptions (availability checking, atomic rollback, saved-traveler pre-fill) don't exist in the code today — the same flow, two independent failure modes (design gap, then engineering gap), both converging on Phase 4 as the highest-risk phase.
- **Step 0 scope challenge:** complexity check triggered on Phase 1 (10 files) and Phase 2 (11 files), both over the generic 8-file smell threshold. Resolved by measuring this repo's own convention directly (`git diff --name-only` across the last 5 merged feature PRs: 33-78 files each) — proceeded with both phases unsplit as within-convention.
- **VERDICT:** DESIGN + ENG CLEARED — ready to implement, starting with Phase 0.

**UNRESOLVED DECISIONS:**
- + 1 unresolved from prior reviews: AI-generated itinerary failure UX in Phase 4's Plan Itinerary step (from `/plan-design-review`) — copy/interaction for the AI-generation-failure fallback depends on `assistant-service`'s actual failure modes, deferred to Phase 4's implementing session (see "Unresolved Decisions" section above).
