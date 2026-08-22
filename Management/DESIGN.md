---
version: 0.1.0
name: signal-console
description: "An operational, clean design system for a travel-industry CRM's internal admin tool (leads, quotations, invoices, itineraries, analytics). Cool neutrals in both light and dark, one functional teal signal color used only on primary actions and focus states, and monospace reserved for anything tabular - prices, invoice IDs, dates, deltas - so numbers are always scannable at a glance. Deliberately not warm, not luxury, not gradient-heavy: this replaces a prior generic blue/indigo/violet SaaS look with something built for staff who process bookings in this screen all day."

colors:
  primary: "#0f7f8c"
  primary-foreground: "#ffffff"
  background: "#f6f7f9"
  foreground: "#10131a"
  card: "#ffffff"
  card-foreground: "#10131a"
  popover: "#ffffff"
  popover-foreground: "#10131a"
  secondary: "#eef0f3"
  secondary-foreground: "#10131a"
  muted: "#eef0f3"
  muted-foreground: "#5b6472"
  accent: "#e3f2f2"
  accent-foreground: "#10131a"
  destructive: "#c8392f"
  success: "#1a8f52"
  success-foreground: "#ffffff"
  warning: "#b8790f"
  warning-foreground: "#ffffff"
  border: "#dfe2e7"
  input: "#dfe2e7"
  ring: "#0f7f8c"
  chart-1: "#0f7f8c"
  chart-2: "#3b5bdb"
  chart-3: "#b8790f"
  chart-4: "#7c5cbf"
  chart-5: "#c2447a"

colors-dark:
  primary: "#2dd4d9"
  primary-foreground: "#06181a"
  background: "#0a0c0f"
  foreground: "#eef0f2"
  card: "#14171c"
  card-foreground: "#eef0f2"
  popover: "#14171c"
  popover-foreground: "#eef0f2"
  secondary: "#1b1f26"
  secondary-foreground: "#eef0f2"
  muted: "#1b1f26"
  muted-foreground: "#9aa3ad"
  accent: "#10282a"
  accent-foreground: "#eef0f2"
  destructive: "#ef6259"
  success: "#3ec27a"
  success-foreground: "#062012"
  warning: "#e0a83f"
  warning-foreground: "#2b1f06"
  border: "#262b33"
  input: "#262b33"
  ring: "#2dd4d9"
  chart-1: "#2dd4d9"
  chart-2: "#6d8cf5"
  chart-3: "#e0a83f"
  chart-4: "#a78bd6"
  chart-5: "#e07bab"

typography:
  display:
    fontFamily: Archivo Variable
    fontWeight: 800
    fontSize: 30px
    lineHeight: 1.2
    letterSpacing: -0.01em
  heading-lg:
    fontFamily: Archivo Variable
    fontWeight: 700
    fontSize: 24px
    lineHeight: 1.25
    letterSpacing: -0.01em
  heading:
    fontFamily: Archivo Variable
    fontWeight: 700
    fontSize: 18px
    lineHeight: 1.3
    letterSpacing: 0
  body:
    fontFamily: Public Sans Variable
    fontWeight: 400
    fontSize: 14px
    lineHeight: 1.5
    letterSpacing: 0
  body-lg:
    fontFamily: Public Sans Variable
    fontWeight: 400
    fontSize: 16px
    lineHeight: 1.55
    letterSpacing: 0
  label:
    fontFamily: Public Sans Variable
    fontWeight: 600
    fontSize: 12px
    lineHeight: 1.3
    letterSpacing: 0.04em
  caption:
    fontFamily: Public Sans Variable
    fontWeight: 400
    fontSize: 12px
    lineHeight: 1.4
    letterSpacing: 0
  button:
    fontFamily: Public Sans Variable
    fontWeight: 600
    fontSize: 13.5px
    lineHeight: 1.2
    letterSpacing: 0
  data:
    fontFamily: JetBrains Mono Variable
    fontWeight: 500
    fontSize: 14px
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  sm: 4.8px
  md: 6.4px
  lg: 8px
  xl: 11.2px
  2xl: 14.4px
  full: 9999px

spacing:
  unit: 4px
  card-padding: 16-24px
  section-gap: 32px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.muted-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  stat-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 16px 18px
  badge:
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 9px
  table:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
---

## Overview

Signal Console is the design system for the Management app - the internal tool sales reps and admins use daily to work leads through quotation, invoice, payment, and voucher, plus itinerary building and analytics. It exists to replace a prior generic look (repeated blue/indigo/violet/teal gradients, stock Tailwind colors, no real typography, two incompatible duplicate `StatCard` components because nothing was shared) with a governed, source-owned system built on shadcn/ui + Base UI primitives.

**Key characteristics:**
- **Cool, not warm.** Neutrals lean cool-gray in both themes; there is no cream, no terracotta, no luxury-editorial warmth anywhere in the system. This was an explicit constraint, not an oversight.
- **One functional accent.** `{colors.primary}` (teal) is the only brand/interactive color - used for primary buttons, active states, and focus rings. It is not decorative and never appears as a gradient.
- **Semantic color is separate from the accent.** `success`/`warning`/`destructive` communicate state (confirmed, pending, overdue) and are never used for branding or navigation emphasis - and the accent is never repurposed to mean "success."
- **Monospace is reserved for anything tabular.** Prices, invoice/lead IDs, dates, percentage deltas - anywhere a human needs to compare numbers down a column - render in `{typography.data}` (JetBrains Mono) with `font-variant-numeric: tabular-nums`. This is the system's most distinctive, most load-bearing typographic decision: it is what makes a dense CRM table scannable instead of a wall of proportional-width digits.
- **Both themes are first-class.** Dark mode is not an inverted afterthought - `.dark` is a real, separately-tuned palette (see `colors-dark`), toggled via a `dark` class on `<html>`, driven by `ThemeContext` (`src/contexts/ThemeContext.tsx`): defaults to the OS preference, persists an explicit choice to `localStorage`, and re-follows the OS if the user picks "system" again.
- **Sharp, not bubbly.** Radius scale tops out at `{rounded.2xl}` (14.4px) for rare large surfaces; most UI (buttons, inputs, cards) sits at `{rounded.md}`-`{rounded.lg}` (6.4-8px). No `rounded-2xl`/`rounded-3xl` "friendly SaaS" cards.

## Colors

> Defined in `src/index.css` as CSS custom properties (`:root` for light, `.dark` for dark), consumed through Tailwind v4's auto-generated `bg-*`/`text-*`/`border-*` utilities - never hardcode a hex value in a component, reference the token.

### Brand & Interactive
- **Primary** (`{colors.primary}`): the one accent. Primary buttons, active nav/tab states, links, focus rings (`--ring`). Light: deep operational teal `#0f7f8c`. Dark: brightened to `#2dd4d9` for legibility against the near-black canvas - the hue doesn't change, only its lightness.
- **Ring**: always equals `primary`. Every focusable element gets a visible teal focus ring - this is an accessibility floor, not optional polish.

### Surface
- **Background** (`{colors.background}`): the page canvas. Light `#f6f7f9` (cool near-white, not stark clinical white), dark `#0a0c0f` (near-black).
- **Card** (`{colors.card}`): elevated surface for cards, dialogs, dropdowns, popovers - `#ffffff` light / `#14171c` dark.
- **Secondary / Muted**: subtle fill for secondary buttons, input backgrounds, and muted sections - `#eef0f3` light / `#1b1f26` dark. `secondary` and `muted` currently share one value; split them only if a real need for two distinct shades emerges.
- **Accent** (shadcn convention - **not** the brand color): the subtle hover/highlight wash for ghost buttons and menu items, teal-tinted for cohesion with `primary` but never the primary CTA color itself. `#e3f2f2` light / `#10282a` dark.
- **Border / Input**: hairline dividers and input borders - `#dfe2e7` light / `#262b33` dark.

### Text
- **Foreground**: primary text - `#10131a` light / `#eef0f2` dark.
- **Muted foreground**: secondary/meta text (timestamps, helper text, table captions) - `#5b6472` light / `#9aa3ad` dark.

### Semantic
- **Success** (`#1a8f52` / `#3ec27a`): confirmed bookings, paid invoices, positive deltas.
- **Warning** (`#b8790f` / `#e0a83f`): pending payment, action-needed states.
- **Destructive** (`#c8392f` / `#ef6259`): overdue, cancelled, delete actions, negative deltas.
- These three never appear as the accent color, and the accent never appears as a status badge - keeping "what's clickable/branded" and "what's the state of this record" visually distinct is deliberate.

### Chart (data visualization only)
- `{colors.chart-1}` through `{colors.chart-5}`: a five-hue categorical palette for multi-series charts (analytics dashboards, revenue breakdowns). This is the one place the system uses more than one hue at a time - legitimate, since distinguishing chart series is a different problem than branding a button. `chart-1` equals `primary` (teal) so the "main" series in any chart still reads as on-brand; the other four (slate-blue, amber, muted violet, muted rose) are for additional series only.

## Typography

### Font Family
- **Archivo Variable** - display/heading face. Geometric grotesk, technical/operational character. Self-hosted via `@fontsource-variable/archivo`. Fallback: `system-ui, sans-serif`.
- **Public Sans Variable** - body/UI face. Built for dense, highly-legible interface text (originated for USWDS - literally designed for functional government/operational UIs, which is exactly this system's brief). Self-hosted via `@fontsource-variable/public-sans`. Fallback: `system-ui, sans-serif`.
- **JetBrains Mono Variable** - data face. Real tabular figures, designed for scanning columns of characters. Self-hosted via `@fontsource-variable/jetbrains-mono`. Fallback: `ui-monospace, monospace`.

### Hierarchy

| Token | Family | Size | Weight | Line height | Use |
|---|---|---|---|---|---|
| `{typography.display}` | Archivo | 30px | 800 | 1.2 | Page titles ("Lead Management", "Analytics") |
| `{typography.heading-lg}` | Archivo | 24px | 700 | 1.25 | Section headers |
| `{typography.heading}` | Archivo | 18px | 700 | 1.3 | Card/panel/dialog titles |
| `{typography.body-lg}` | Public Sans | 16px | 400 | 1.55 | Longer-form content, dialog descriptions |
| `{typography.body}` | Public Sans | 14px | 400 | 1.5 | Default UI text - forms, table cells, most everything |
| `{typography.label}` | Public Sans | 12px | 600 | 1.3 | Form field labels, table column headers - uppercase, tracked |
| `{typography.caption}` | Public Sans | 12px | 400 | 1.4 | Secondary/meta text, timestamps |
| `{typography.button}` | Public Sans | 13.5px | 600 | 1.2 | All button labels |
| `{typography.data}` | JetBrains Mono | 14px | 500 | 1.4 | **Anything tabular**: prices, invoice/lead IDs, dates, quantities, percentage deltas |

### Principles
- **Mono is a semantic choice, not a decorative one.** If a value is meant to be compared against others in a column (an invoice total, a lead ID, a date in a table), it renders in `{typography.data}` with `font-variant-numeric: tabular-nums`. Prose, labels, and one-off numbers (a page title that happens to include a count) stay in Public Sans.
- **Archivo is for structure, not for long text.** Reserve it for titles/headings that are scanned, not read - never body copy.
- **`{typography.label}` always gets `text-transform: uppercase` and its `0.04em` tracking** - this is what visually distinguishes "this is a field label" from "this is a caption" even though both sit at 12px.

## Layout

### Spacing
- 4px base unit (Tailwind's default scale - not overridden, no need to reinvent it).
- Card interior padding: 16-24px (`{spacing.card-padding}`), scaling with card density (a StatCard sits toward 16px, a dialog body toward 24px).
- Section-to-section gap: 32px (`{spacing.section-gap}`).

### Grid
- Data tables get `overflow-x: auto` on their own wrapper, never the page body - wide tables (invoices, itineraries) must scroll inside their own container.
- Stat card grids: `repeat(auto-fit, minmax(190px, 1fr))` - reflows from 4-up to 1-up without a hand-authored breakpoint per screen.

## Elevation & Depth

| Token | Shadow | Use |
|---|---|---|
| `{shadow.card}` | `0 1px 2px var(--shadow-color), 0 1px 1px var(--shadow-color)` | Default resting elevation for cards, stat tiles, table containers |
| `{shadow.dropdown}` | `0 4px 12px var(--shadow-color-strong)` | Popovers, dropdown menus, select lists |
| `{shadow.modal}` | `0 12px 32px var(--shadow-color-strong)` | Dialogs/modals |

Shadow color itself is a token (`--shadow-color` / `--shadow-color-strong`) that swaps between a soft dark tint in light mode and a stronger black in dark mode - a shadow authored only for light mode disappears against a dark canvas, so this isn't optional plumbing.

**No `shadow-xl`/`shadow-2xl`.** The prior app's "polish recipe" (`rounded-2xl` + `shadow-xl`/`shadow-2xl` + `hover:scale-110`) is retired along with the gradients it dressed up - elevation here is functional (this is a menu vs. this is the page), not decorative depth.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.sm}` | 4.8px | Small chips, inline tags |
| `{rounded.md}` | 6.4px | Inputs |
| `{rounded.lg}` | 8px | Buttons, cards, table containers - the default |
| `{rounded.xl}` | 11.2px | Larger elevated surfaces (dialogs) |
| `{rounded.2xl}` | 14.4px | Rare - large hero-ish surfaces only |
| `{rounded.full}` | 9999px | Badges/pills, avatars |

Radius is driven by one CSS variable (`--radius: 0.5rem` in `src/index.css`) that every other radius token derives from via `calc()` - change the one variable, the whole scale moves together.

## Components

> `src/components/ui/` holds shadcn/Base UI-generated primitives (source-owned, editable); `src/components/shared/` holds app-specific composites built on top. Every new primitive gets an entry here when it's built - this section is intentionally incomplete right now and grows with Phase 2.

### Buttons
- **`button-primary`** (`src/components/ui/button.tsx`, `variant="default"`): the one primary-CTA look. `bg-primary text-primary-foreground`.
- **`button-secondary`** (`variant="outline"`): `bg-card` with a bordered outline - secondary actions ("Save draft", "Cancel").
- **`button-ghost`** (`variant="ghost"`): no background until hover - tertiary/inline actions.
- **`button-destructive`** (`variant="destructive"`): `bg-destructive/10 text-destructive` - a soft-fill treatment, not a solid red button, so destructive actions read as "careful" rather than alarming.
- Sizes: `default`/`sm`/`lg`/`xs` plus icon-only variants - see `button.tsx` for the full `cva` variant map.

### Badge
- **`badge`** (`src/components/ui/badge.tsx`): `default` (primary-filled), `secondary`, `destructive`, `outline` variants via `badgeVariants` (`cva`). This is the shadcn-generic version - the actual status pills used across the app (Confirmed/Pending payment/Overdue/Draft, per the Signal Console preview) should compose this with `success`/`warning`/`destructive`/`muted` tokens directly, not the generic variant names, when a feature migration reaches for it.

### Card
- **`card`** family (`src/components/ui/card.tsx`): `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent`/`CardFooter`. `bg-card text-card-foreground`, `rounded-xl` container - the base every `StatCard` and panel composes on top of (Phase 2.2 builds `StatCard` on this, not from scratch).

### Dialog
- **`dialog`** family (`src/components/ui/dialog.tsx`): `Dialog`/`DialogTrigger`/`DialogPortal`/`DialogClose`/`DialogOverlay`/`DialogContent`/`DialogHeader`/`DialogFooter`. This is the direct replacement for every hand-rolled `fixed inset-0 bg-black/50` + `rounded-2xl bg-white shadow-2xl` modal pattern found across `lead-management` (`QuotationModal`, `InvoiceDialog`, `ReceiptDialog`, `VoucherDialog`, etc.) - when those migrate (Phase 4), they compose this, not their own markup.

### Table
- **`table`** family (`src/components/ui/table.tsx`): `Table`/`TableHeader`/`TableBody`/`TableFooter`/`TableRow`/`TableHead`/`TableCell`/`TableCaption`. This is the raw primitive only - Phase 2.3's actual `DataTable` wrapper (sort/empty-state/loading conventions, `{typography.data}` + `tabular-nums` on numeric columns) still needs to be built on top of this before `lead-management`/`analytics`/`user-management` migrate.

### Form Inputs
- **`input`** (`src/components/ui/input.tsx`), **`textarea`** (`src/components/ui/textarea.tsx`), **`select`** family (`src/components/ui/select.tsx`: `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectGroup`/`SelectLabel`/`SelectSeparator`/`SelectValue`). Bare primitives - the `react-hook-form` + zod `Form`/`FormField` wrapper (Phase 2.4) still needs to be built to actually use these in a real form without every dialog hand-rolling its own validation/error-display plumbing.

### Tabs
- **`tabs`** family (`src/components/ui/tabs.tsx`): `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `tabsListVariants` (`cva`).

### Popover
- **`popover`** family (`src/components/ui/popover.tsx`): `Popover`/`PopoverTrigger`/`PopoverContent`/`PopoverHeader`/`PopoverTitle`/`PopoverDescription`.

### StatCard
- **`stat-card`** (`src/components/shared/StatCard.tsx`): the consolidated replacement for the two prior duplicate implementations (`features/analytics/components/Common/StatCard.jsx` and `features/user-management/components/Common/StatsCard.jsx` - deleted when their respective feature migrates, Phase 4/5). Superset props: `icon, label, value, unit, subtitle, trend, trendDirection, color, loading`. Built on `Card`/`CardContent`. `value` always renders in `font-mono tabular-nums` per the system's core "monospace for anything tabular" rule. `trend` color is **never** the card's own `color` prop - it's always `success` (up) or `destructive` (down), because trend direction is state, not branding. `color` (icon tile background) is one of `primary | success | warning | destructive | muted`, each a soft `bg-{token}/10 text-{token}` fill - never a raw hex or a Tailwind stock color, unlike both predecessors' local `colorConfig` objects.

### DataTable
- **`data-table`** (`src/components/shared/DataTable.tsx`): a typed wrapper over the raw `table.tsx` primitives with the three conventions the raw primitive doesn't provide on its own - a loading state (skeleton rows), an empty state (centered message row, customizable per usage), and numeric-column formatting (`text-right font-mono tabular-nums` when `column.numeric` is set). Sortable columns render a clickable header with a `ChevronUp`/`ChevronDown`/`ChevronsUpDown` indicator and call `onSort(key)` - the table itself holds no sort state, callers own that (matches how `lead-management`/`analytics`/`user-management` already fetch pre-sorted pages from their APIs rather than sorting client-side).

### Form / FormField
- **`form`** (`src/components/ui/form.tsx`): binds `react-hook-form` to the shadcn `Field`/`FieldLabel`/`FieldError` primitives (which ship un-opinionated about any form library). `Form` is `FormProvider` renamed for readability at call sites; `FormField` wraps RHF's `Controller`; `FormFieldItem` is the actual per-field wrapper components reach for - it takes `label`/`error`/`children`, renders `Field` with `data-invalid` wired from RHF's `fieldState.error`, and passes errors straight into `FieldError`. Pairs with `@hookform/resolvers`' `zodResolver` - `zod` schemas (already a project dependency, previously under-used) become the single source of truth for both the TypeScript type and the runtime validation shown in the UI. Verified end-to-end (not just typechecked) by `src/components/ui/__tests__/form.test.tsx`: a real `useForm` + `zodResolver` + submit cycle, asserting the actual validation message text and that `onSubmit` only fires on valid data.

### Sidebar / App Shell
- **`Sidebar`** (`src/pages/Sidebar.tsx`): the primary nav shell, migrated to TypeScript and Signal Console tokens in Phase 2.5. Uses the dedicated `sidebar`/`sidebar-foreground`/`sidebar-primary`/`sidebar-accent`/`sidebar-border` token set (`src/index.css`) rather than `card`/`background`, so the shell can be tuned independently of page content if the two ever need to diverge. Active nav item is a solid `bg-sidebar-primary` fill (the "active nav state" use of the one accent color, per the Colors section) - not a soft tint - since exactly one item is active at a time. Nav row hover is `bg-sidebar-accent`, no scale/shadow micro-interactions. Sign Out uses the shared `Button` (`variant="destructive"`, the soft-fill treatment) rather than a hand-rolled button. The brand/logo tile is a flat `bg-sidebar-primary` square (`rounded-lg`) - the prior gradient tile and decorative blurred-circle background elements are retired along with the rest of the old gradient system. Collapse toggle and mobile hamburger are plain icon buttons on `card`/`border` tokens, not the `Button` primitive, since neither fits its fixed action-button sizing.
- **`ProtectedRoute`** (`src/components/ProtectedRoute.tsx`): loading spinner now uses `text-primary` (was a hardcoded `text-blue-600`); the Access Denied screen's heading uses `font-heading` at the `display` scale. Behavior (redirect-to-login, role-gate check, `children` passthrough) is unchanged - `e2e/auth/rbac.spec.js`'s `getByRole('heading', { name: 'Access Denied' })` assertion still holds since the text and heading role didn't change, only the styling.

## Do's and Don'ts

### Do
- Use `{colors.primary}` for exactly one thing per screen: the one primary action. If a screen has three teal buttons, that's a sign none of them is actually primary.
- Render every price, ID, date, and delta in `{typography.data}` with tabular figures.
- Reach for `success`/`warning`/`destructive` for state, never for branding.
- Give every focusable element the `ring` treatment - it's the accent color's second job, and it's not optional.
- Keep both themes considered together - a color decided only in light mode isn't finished.

### Don't
- Don't introduce a second accent hue. No blue *and* teal, no teal *and* amber-as-brand.
- Don't use `bg-gradient-to-r`/`bg-gradient-to-br` for decoration. The prior system's blue-indigo-violet-teal gradients are exactly what this system replaces - if a gradient shows up in a new component, that's regression, not polish.
- Don't reach past `{rounded.lg}` (8px) for ordinary buttons/cards, and don't add `shadow-xl`/`shadow-2xl` - see Elevation & Depth.
- Don't use Public Sans for tabular data or Archivo for body copy - each face has one job.
- Don't invent a new gray. `foreground`/`muted-foreground`/`border` cover the ladder - if something needs a fourth gray, that's a sign the hierarchy problem is elsewhere (usually: too many things trying to be visually important at once).

## Responsive Behavior

Inherited from the existing app's mobile-responsive CSS (`src/index.css`) rather than redefined here:
- Touch targets ≥ 44px on screens ≤ 767px (`button, a, [role="button"]`).
- `.modal-responsive` shrinks dialog padding to 16px and caps height at 90vh on mobile.
- `.scrollbar-hide` for horizontal tab/nav strips.

No new breakpoint system is introduced in Phase 1 - Tailwind's default breakpoints (`sm`/`md`/`lg`/`xl`) are sufficient; revisit only if a specific feature migration (Phase 3-5) hits a real limitation.

## Iteration Guide

1. Reference existing tokens by name (`bg-primary`, `text-muted-foreground`, `shadow-card`) - never a raw hex or an ad hoc `rgba()`.
2. When building a new primitive in `components/ui/`, add its entry to the **Components** section above in the same PR - this file drifting out of sync with the code is the one failure mode that makes the whole system stop working as a reference.
3. When a feature-folder migration (Phase 3-5) discovers a real gap (a needed token that doesn't exist yet), add the token to `src/index.css` *and* document it here in the same commit - don't invent an inline one-off value.
4. Before adding a new color, ask whether it's semantic (state) or structural (surface/text) - it should map to one of the existing roles, not add a new one, unless it's genuinely a new *kind* of information (which is rare).
5. Dark mode is not optional for new components - if you can't state the `.dark` value for a token you're introducing, it isn't done.

## Known Gaps

- **The `colors-dark` frontmatter key is a deliberate extension beyond the base DESIGN.md spec** (checked with `npx @google/design.md lint DESIGN.md` - 0 errors, warnings only): the spec's `colors` schema has no native light/dark variant mechanism yet, so dark values are kept as this parallel key for human/agent reference rather than silently living only in prose. `design.md export` tooling will ignore it - `src/index.css`'s `:root`/`.dark` blocks remain the actual build-time source of truth; if this file and that CSS ever disagree, the CSS wins and this file is stale.
- **Most tokens (`border`, `ring`, `chart-*`, `success`, `warning`, etc.) aren't yet referenced by any `components:` entry**, which the linter flags as "orphaned" - expected at this stage (only `Button` exists), not a real gap. Resolves naturally as Phase 2 documents Card/Dialog/Table/Badge/Form.

- **Form field validation/error states** are not yet designed - Phase 2 introduces `react-hook-form` + zod resolvers, and error-state styling (input border on invalid, error message typography) should be specified then, not improvised per-form.
- **Chart component styling** (axis lines, gridlines, tooltip treatment for `recharts`) beyond the five `chart-*` color tokens isn't specified yet - due when `features/analytics`/`features/dashboard` migrate (Phase 3-4).
- **Empty states and loading skeletons** have no defined visual language yet - each `StatCard` today improvises its own; the consolidated `StatCard` primitive (Phase 2.2) is where this should be settled once, not per-instance.
