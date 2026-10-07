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
- **Accent** (shadcn convention - **not** the brand color): the subtle hover/highlight wash for ghost buttons and menu items, teal-tinted for cohesion with `primary` but never the primary CTA color itself. `#e3f2f2` light / `#10282a` dark. It is also the operator's chat-bubble fill in the Management copilot. That is a surface use, not a CTA colour, and it is what keeps `primary` reserved for buttons, active states and focus rings.
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

## Control Sizing & Consistency

A named height scale, tied to what the primitives already implement - not a new invention:

| Token | Height | Who renders at it |
|---|---|---|
| `{control.default}` | 32px (`h-8`) | Button (default), Input, Select (`size="default"`), Tabs/TabsList (no `size` prop exists today - this is always its height). The tier nearly everything uses with no explicit `size` prop. |
| `{control.compact}` | 28px (`h-7`) | Button `size="sm"`, Select `size="sm"`. Only for a row that's deliberately compact end to end - never mixed with `{control.default}` neighbors. |
| `{control.tight}` | 24px (`h-6`) | Button `size="xs"`. Icon-only micro-actions, rare. |

**Every control sharing one row or toolbar renders at the same height tier.** Putting `size="sm"` on one control and leaving a neighbor at the unset default is a bug, not a style choice - it's the literal defect Phase 4.2 shipped with (the trip-type `Tabs`, fixed at `{control.default}`, sitting beside a cabin-class `Select` forced to `size="sm"`/`{control.compact}` in the same row). Since `Tabs` has no compact variant today, any row that includes `Tabs` keeps every other control in that row at `{control.default}` too - don't shrink the rest of the row instead.

**Same conceptual role means the same size everywhere it appears, not just within one screen.** This is Nielsen's "consistency and standards" heuristic applied literally: a segmented toggle/filter is a segmented toggle/filter no matter which feature folder it lives in. Once one screen's version of a control is migrated onto a shared primitive, every other screen's equivalent control should converge on that same primitive and size as it migrates in turn - not invent its own row height. (A trip-type toggle and a status-filter row are the same *kind* of control and must end up the same height, even if they're built in different phases.)

**Migrating a row is not the same as migrating a component.** When a row mixes a new primitive with a still-legacy leaf (`AirportAutocomplete`, `CountrySelect`, `PassengerSelector`, or any bare `<input>`/`<button>`), a visual mismatch between old and new *sections* of the app is an expected, temporary state of incremental migration - that's fine. A height mismatch *inside one row* is a different problem: it reads as broken alignment, not "old vs. new," even before the rest of that row gets modernized. Don't introduce this in new work going forward.

**No text smaller than `{typography.caption}` (12px) for real content.** Arbitrary `text-[11px]`/`text-[10px]`/`text-[9px]` escapes below `text-xs` are never acceptable for anything a user reads - section labels, stat captions, badge counts included. 12px is the floor already implied by the type scale above; if a caption feels cramped, the fix is more space or shorter copy, never a smaller font.

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
- **Categorical (non-state) badges** - e.g. `features/career`'s per-position tag, where a badge exists to visually distinguish *which one of several* rather than *what state* - rotate through `chart-1`..`chart-5` instead (`bg-chart-N/10 text-chart-N`, established in Phase 3.2). Reuses the system's one sanctioned multi-hue palette instead of introducing ad hoc stock Tailwind colors; keep this rotation to genuinely categorical tags, not state.

### Copilot Briefing Primitives
- **`claim-row`** (`src/features/copilot/ClaimItem.tsx`): An unpadded row separated from the next by a hairline (`border-border/40`). Uses marker-only severity: `{colors.destructive}` on the icon for critical, `{colors.warning}` for warning, and `{colors.foreground}` for info, with the text gaining type weight (`font-semibold`/`font-medium`/`font-normal`) rather than a color tint. No borders, no background, no card container. Source tags and cited values sit in `{typography.mono}`.
- **`inline-status-row`** (`src/features/copilot/CollectionInsights.tsx`): A compact, full-width status line (`min-h-[44px]` touch target, `border-b border-border`) for partial, empty, or denied collection states. Carries a small severity dot (`bg-warning`) if applicable, body text (`text-sm text-foreground`), and an optional trailing retry action (`variant="outline" size="xs"`). Never a full-panel error modal.
- **`insight-row`** (`src/features/copilot/InsightRow.tsx`): one finding, whatever produced it, drawn as a CARD so the finding reads as one bounded unit with its own actions inside it - `rounded-lg border-l-4 bg-foreground/10 px-3 py-2`, with `min-h-[44px]` kept as the touch target. The box is a fill plus a single-edge spine and NEVER a full outline: the spine carries severity (`border-l-destructive` / `border-l-warning` / `border-l-border`, taken from `severityStyles` so severity is never derived twice), and `bg-foreground/10` is the ONE fill for every severity, because tinting sixteen findings would flatten "this one is urgent" by making everything loud. Its footer takes an optional `primaryAction` (`{ label, onClick }`, `variant="outline" size="xs"`) ahead of the `Why now:` line and `Chat about this`: the copilot panels pass none, and the business notification surface passes its View action. A slot rather than a second row component, so there is still exactly ONE `insight-row` shape. The fill derives from `foreground` and not a surface token on purpose: `bg-card` IS the panel's own surface, and `bg-muted` measures 1.087:1 against it - the ratio that made the standalone quoted-finding box invisible before it moved to `bg-foreground/15`. The "Why now" line and "Chat about this" share one footer (`mt-2 flex flex-wrap items-center gap-x-3`); there is deliberately no divider above it, since a hairline tuned for `bg-card` would vanish across the fill. It is the SINGLE row shape for both the ranked and the sectioned source - the shape must not differ between them, or the list visibly redraws itself when the model phase settles. It publishes `data-copilot-item` and `data-copilot-item-id` always, and `data-copilot-band` / `data-copilot-score` ONLY on the ranked source: a model claim carries no score, and emitting `0` would assert a ranking the server never produced.
- **`insight-list`** (`src/features/copilot/InsightList.tsx`): renders the buckets `sectionBuckets` produces, so the ranked source and the model source share one list. Owns the section BAND - `{typography.label}`, uppercase, tracked, `flex items-center gap-1.5 rounded-md px-2 py-1 mb-2` over a per-section fill - and the critical band. Rows are separated by `space-y-2`: the card is the boundary, so the list draws no hairline between findings. BOTH panels render this one list, the record panel included, so their section shapes cannot drift apart. Never re-sorts: within a bucket the order is the source's.
- **`critical-band`** (`InsightList.tsx`): the hoisted severity group, and **not a fifth category**. It keeps a section band's SHAPE and differs in CONTENT - a `{colors.destructive}` fill (`bg-destructive/10 dark:bg-destructive/20`) with `{colors.destructive}` on the label plus a warning icon in the band, the same icon-plus-word treatment `claim-row` uses per row. The `attention` section (**Needs attention**) takes the warning fill (`bg-warning/10 dark:bg-warning/20 text-warning`) in both panels, because it is the section asking to be acted on; every other section takes the quiet `bg-foreground/15 text-muted-foreground`. Two grouping axes share this list, `section` answering *what kind of finding* and the band answering *how urgent*, and they have to be distinguishable or the band reads as another category. The band is the server's own structure (`rank.js` returns `[...shownCriticals, ...spread.picked]` over disjoint sets), so rendering it is re-deriving the server's shape, not disagreeing with it.
- **`producer-line`** (`src/features/copilot/insightShared.tsx`, `ProducerLine`): the panel header's authorship marker. `{typography.caption}` in `{colors.muted-foreground}` with **no hue at all** - not the accent, and not a categorical `chart-N` either, because authorship is neither a brand accent nor a categorical tag - plus a line icon (`Cpu` for rule-computed, `Bot` for model-authored), the words "Rule engine" / "AI briefing", and the timestamp. Icon PLUS word, so it survives grayscale, high-contrast mode, and monochrome print. The word, the arrival label ("Checked" / "Generated"), and the timestamp value all derive from ONE `producer` value; selecting the timestamp off the phase instead is exactly how a header ends up reading "Rule engine · Generated <model run time>". It names the LIST's producer, which is a smaller claim than it looks: the value comes from which pipeline produced the rendered source, because `origin` cannot answer it (that field exists only on `DeterministicInsightSchema`).

- **`chat-bubble`** (`src/features/copilot/CopilotConversation.tsx`): the operator's own turn in the Management copilot conversation. `bg-accent` with `text-accent-foreground`, `{rounded.xl}` with the bottom-right corner dropped to `{rounded.sm}` for the tail, `max-w-[85%]`, right-aligned inside a `flex justify-end`. One bubble per turn, carrying the `quoted-finding` box above the question. **Only the operator's turns are boxed**: the copilot's answer stays unboxed and left-aligned, because `claim-row` is documented with no container and its evidence actions sit inside the claim text. Neither speaker gets a visible name label - attribution is `sr-only` text ("You said:" / "Copilot said:"), so the transcript is not a list of labelled blocks.

- **`quoted-finding`** (`src/features/copilot/CopilotConversation.tsx`, `QuotedContext`): the finding a turn was started from - what makes "Chat about this" legible as a reference rather than as the operator's own words. One component, two tones, because it renders against two surfaces and each tone is an inset relative to ITS OWN: `onAccent` (inside the operator's bubble) is `rounded-sm bg-accent-foreground/20 px-2 py-1.5`, and the standalone tone (the attachment above the composer, on `bg-card`) is `rounded-md bg-foreground/15 px-2.5 py-2`. Not `bg-muted`: muted sits 1.14:1 from `bg-card` in light and 1.087:1 in dark, so with an empty transcript the attachment read as loose text with no box, worst in dark; `bg-foreground/15` lands roughly 35 RGB units away in both themes. Both are a FILL with no border at all, which is what keeps them clear of the "hairlines only; no nested outlined containers" boundary rule - a box is a surface, an outline is not permitted. Same idiom as `VoucherDialog`'s `bg-primary-foreground/10 rounded-lg` key/value boxes inside a primary-filled panel. Label and text stay at reduced foreground opacity (`/70`, `/80`) so the operator's own question remains the highest-contrast line in the bubble. The label reads "Finding referenced" and is never phrased in the first person, because a label written from the operator's point of view ("You asked about") sitting inside their own bubble is exactly what made the quote read as their typed text. The composer's tone also carries a `variant="ghost" size="icon-sm"` `XIcon` dismiss (`aria-label="Remove attached finding"`) on its label row, the same icon-only button `copilot-drawer` uses for its cue and close. The transcript's tone never carries one: a submitted turn's reference is a record of what was asked, and the request already sent with the finding attached, so it is not the operator's to remove afterwards. One click, no confirmation - re-attaching from the row undoes it, so it is not the one-way door that clearing the transcript is.

### Rating Display
- **Star rating fill** (`features/shared`'s `StarRating`, used in `HotelSelectionModal`, Phase 4.2): filled stars use `text-warning`/`fill-warning`, not a new amber/gold color. This is a deliberate, narrow reuse of the `warning` token outside its usual "state" meaning - `warning`'s hue is already amber, which matches the universal star-rating convention, and introducing a dedicated rating color would violate "don't invent a new gray/hue" for a single decorative use. Empty stars use `text-muted`. Keep this reuse limited to rating displays; don't reach for `warning` as a general-purpose amber outside state or rating contexts.

### Card
- **`card`** family (`src/components/ui/card.tsx`): `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent`/`CardFooter`. `bg-card text-card-foreground`, `rounded-xl` container - the base every `StatCard` and panel composes on top of (Phase 2.2 builds `StatCard` on this, not from scratch).

### Dialog
- **`dialog`** family (`src/components/ui/dialog.tsx`): `Dialog`/`DialogTrigger`/`DialogPortal`/`DialogClose`/`DialogOverlay`/`DialogContent`/`DialogHeader`/`DialogFooter`. This is the direct replacement for every hand-rolled `fixed inset-0 bg-black/50` + `rounded-2xl bg-white shadow-2xl` modal pattern found across `lead-management` (`QuotationModal`, `InvoiceDialog`, `ReceiptDialog`, `VoucherDialog`, etc.) - when those migrate (Phase 4), they compose this, not their own markup. For large multi-section edit-form modals with a pinned header/footer and collapsible sections, compose `FormDialogHeader`/`FormDialogBody`/`FormDialogSection`/`FormDialogFooter` (below) on top of this rather than hand-rolling header/section-header/footer markup per feature. `DialogContent` also accepts a `closeClassName` pass-through for its corner close X (a ghost button floating over the content): any dialog whose header is `bg-primary` must pass `closeClassName="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground dark:hover:bg-primary-foreground/20 dark:hover:text-primary-foreground"` so the X isn't dark-on-teal (same treatment as `PdfPreview`'s header controls). A `p-0`-content dialog that still uses `DialogFooter` (rather than `FormDialogFooter`) must pass `-mx-0 -mb-0` to it, or the negative margins clip the footer's bottom padding and its buttons sit on the popup edge.

### Form Dialog Sections
- **`form-dialog-sections`** (`src/components/shared/FormDialogSections.tsx`): `FormDialogHeader`/`FormDialogBody`/`FormDialogSection`/`FormDialogFooter` - the shared scaffolding for "big multi-section edit form" modals (lead create/edit, package create/edit), consolidating what were previously three independent hand-rolled implementations (`EditLeadDialog`'s `EditSectionHeader`, `NewLeadDialog`'s near-duplicate `SectionHeader`, and `NewEditPackageForm`'s `StableSectionCard`). `FormDialogHeader` composes `dialog.tsx`'s `DialogHeader`/`DialogTitle`/`DialogDescription` into a full-bleed `bg-primary` banner. `FormDialogSection` is a collapsible card (`bg-card rounded-xl border shadow-card`) whose header flips to solid `bg-primary`/`bg-primary-foreground` ("high colour") when expanded, vs. muted/hover when collapsed - one padding layer for the header (`px-6 py-4`), one for the body (`px-6 pb-6 pt-4`), never both a card frame and a separate inner `bg-muted` box for the same content. `FormDialogFooter` deliberately does **not** compose `DialogFooter` - `DialogFooter`'s `-mx-4 -mb-4 rounded-b-xl bg-muted/50` base classes are tuned for `DialogContent`'s *default* padded state and actively fight the `p-0 gap-0 overflow-hidden flex flex-col` structure this pattern requires (that mismatch was the original bug: an overridden `DialogFooter` produced an unwanted full-bleed colored footer band instead of the inset, breathing-room look the rest of the system uses). Any dialog using these components must set its own `DialogContent` className to `sm:max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col` (header/footer pin via `shrink-0`, body scrolls alone via `FormDialogBody`'s `flex-1 overflow-y-auto`). Uses `rounded-xl`/`shadow-card` (not `rounded-2xl`/no-shadow, which the two prior local implementations inconsistently used) per the Shapes/Elevation sections above.

### Table
- **`table`** family (`src/components/ui/table.tsx`): `Table`/`TableHeader`/`TableBody`/`TableFooter`/`TableRow`/`TableHead`/`TableCell`/`TableCaption`. This is the raw primitive only - Phase 2.3's actual `DataTable` wrapper (sort/empty-state/loading conventions, `{typography.data}` + `tabular-nums` on numeric columns) still needs to be built on top of this before `lead-management`/`analytics`/`user-management` migrate.

### Form Inputs
- **`input`** (`src/components/ui/input.tsx`), **`textarea`** (`src/components/ui/textarea.tsx`), **`select`** family (`src/components/ui/select.tsx`: `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectGroup`/`SelectLabel`/`SelectSeparator`/`SelectValue`). Bare primitives - the `react-hook-form` + zod `Form`/`FormField` wrapper (Phase 2.4) still needs to be built to actually use these in a real form without every dialog hand-rolling its own validation/error-display plumbing.

### Tabs
- **`tabs`** family (`src/components/ui/tabs.tsx`): `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `tabsListVariants` (`cva`).

### Popover
- **`popover`** family (`src/components/ui/popover.tsx`): `Popover`/`PopoverTrigger`/`PopoverContent`/`PopoverHeader`/`PopoverTitle`/`PopoverDescription`.

### Toast
- **`toast`** family (`src/components/ui/toast.tsx`): `Toaster`/`Toast`/`ToastAction`/`ToastClose`/etc. over Base UI's real `@base-ui/react/toast` primitive (Phase 6.5, replacing `react-hot-toast`) - `bg-popover text-popover-foreground` body, `text-destructive` on the error icon, otherwise theme-neutral so it always resolves correctly in light/dark without its own hardcoded colors (the prior `react-hot-toast` `<Toaster>` set a literal `background: '#363636'` that never responded to theme). Mounted once, globally, in `src/App.jsx` (`<Toaster timeout={4000} />`) - a second, redundant `<Toaster>` inside `AdminManagement.tsx` was found and removed during the migration.
- **`src/lib/toast.ts`**: a thin react-hot-toast-compatible facade (`toast(msg)`, `.success()`, `.error()`, `.loading()`, `.dismiss(id?)`) over the primitive's real `add`/`close` API, so the ~260 existing call sites across the app only needed their import path changed, not their call signature. Import `import { toast } from '@/lib/toast'` (or the default export) - never import `@/components/ui/toast`'s `toast` manager directly from feature code, so the compat surface stays the one place call-site behavior is defined.
- **Known, deliberate behavior changes from `react-hot-toast`**: (1) toast position moved from top-right to Base UI's own bottom-right stacking - the primitive's stacking/swipe animation math is tuned for its own anchor, not worth fighting to preserve the old corner; (2) a handful of "no results" toasts that used a custom decorative emoji `icon` (✈️/🏨) now use the real `info` semantic type instead, consistent with the system's "no ad hoc icons - use the token set" rule elsewhere; (3) the one custom-JSX toast (`InvoiceDialog.tsx`'s "Open Organization Settings" link, previously written against react-hot-toast's `toast.error((t) => ...)` callback form) works unchanged - the shim gives the callback a live `{ id }` object so `t.id` still resolves to the real toast id inside the JSX, even though it's evaluated before the manager assigns one.

### StatCard
- **`stat-card`** (`src/components/shared/StatCard.tsx`): the consolidated replacement for the two prior duplicate implementations (`features/analytics/components/Common/StatCard.jsx` and `features/user-management/components/Common/StatsCard.jsx` - deleted when their respective feature migrates, Phase 4/5). Superset props: `icon, label, value, unit, subtitle, trend, trendDirection, color, loading`. Built on `Card`/`CardContent`. `value` always renders in `font-mono tabular-nums` per the system's core "monospace for anything tabular" rule. `trend` color is **never** the card's own `color` prop - it's always `success` (up) or `destructive` (down), because trend direction is state, not branding. `color` (icon tile background) is one of `primary | success | warning | destructive | muted`, each a soft `bg-{token}/10 text-{token}` fill - never a raw hex or a Tailwind stock color, unlike both predecessors' local `colorConfig` objects.

### DataTable
- **`data-table`** (`src/components/shared/DataTable.tsx`): a typed wrapper over the raw `table.tsx` primitives with the three conventions the raw primitive doesn't provide on its own - a loading state (skeleton rows), an empty state (centered message row, customizable per usage), and numeric-column formatting (`text-right font-mono tabular-nums` when `column.numeric` is set). Sortable columns render a clickable header with a `ChevronUp`/`ChevronDown`/`ChevronsUpDown` indicator and call `onSort(key)` - the table itself holds no sort state, callers own that (matches how `lead-management`/`analytics`/`user-management` already fetch pre-sorted pages from their APIs rather than sorting client-side).

### Form / FormField
- **`form`** (`src/components/ui/form.tsx`): binds `react-hook-form` to the shadcn `Field`/`FieldLabel`/`FieldError` primitives (which ship un-opinionated about any form library). `Form` is `FormProvider` renamed for readability at call sites; `FormField` wraps RHF's `Controller`; `FormFieldItem` is the actual per-field wrapper components reach for - it takes `label`/`error`/`children`, renders `Field` with `data-invalid` wired from RHF's `fieldState.error`, and passes errors straight into `FieldError`. Pairs with `@hookform/resolvers`' `zodResolver` - `zod` schemas (already a project dependency, previously under-used) become the single source of truth for both the TypeScript type and the runtime validation shown in the UI. Verified end-to-end (not just typechecked) by `src/components/ui/__tests__/form.test.tsx`: a real `useForm` + `zodResolver` + submit cycle, asserting the actual validation message text and that `onSubmit` only fires on valid data.

### Sidebar / App Shell
- **`Sidebar`** (`src/pages/Sidebar.tsx`): the primary nav shell, migrated to TypeScript and Signal Console tokens in Phase 2.5. Uses the dedicated `sidebar`/`sidebar-foreground`/`sidebar-primary`/`sidebar-accent`/`sidebar-border` token set (`src/index.css`) rather than `card`/`background`, so the shell can be tuned independently of page content if the two ever need to diverge. Active nav item is a solid `bg-sidebar-primary` fill (the "active nav state" use of the one accent color, per the Colors section) - not a soft tint - since exactly one item is active at a time. Nav row hover is `bg-sidebar-accent`, no scale/shadow micro-interactions. Sign Out uses the shared `Button` (`variant="destructive"`, the soft-fill treatment) rather than a hand-rolled button. The brand block stacks instead of running horizontally: first row is the logo (or the `bg-sidebar-primary` initials tile when no logo resolves) plus the collapse control, second row is the org's company name from org settings - wrapping, never truncating; the org tagline is not shown in the rail. The rail's mark is the square brand tile (`object-contain`, no teal fill behind it) - `getSidebarInfo()` points at the neutral square asset, not the `logo-full.png` wordmark, which still carries the retired name and stays in use on the login screens until it is redrawn. The rail is `w-56` expanded / `w-20` collapsed: the expanded width is owned by the footer user card - its identity row has ~167px of room and the 40px avatar, the 8px gap and the 111px `Super Admin` role pill already spend 159 of them - not by the nav labels, which clear it with room to spare (the row's hover chevron is absolutely positioned so labels keep the full row width and never wrap or truncate). The rail's expand/collapse animates via the `.transition-layout` utility (`src/index.css`), scoped to `prefers-reduced-motion: no-preference` - anyone who has asked their OS to reduce motion gets the width change instantly, instead of the unconditional `transition-all` it replaced. Collapse toggle and mobile hamburger are plain icon buttons on `card`/`border` tokens, not the `Button` primitive, since neither fits its fixed action-button sizing.
- **`ProtectedRoute`** (`src/components/ProtectedRoute.tsx`): loading spinner now uses `text-primary` (was a hardcoded `text-blue-600`); the Access Denied screen's heading uses `font-heading` at the `display` scale. Behavior (redirect-to-login, role-gate check, `children` passthrough) is unchanged - `e2e/auth/rbac.spec.js`'s `getByRole('heading', { name: 'Access Denied' })` assertion still holds since the text and heading role didn't change, only the styling.
- **Sub-page sidebar nav (a bespoke nav, not `Tabs`)** (`features/user-management/UserManagementPage.tsx`, Phase 5.1i): a feature can have its own left-sidebar section switcher (icon tile + label + description per row) independent of the app's own `Sidebar`. This is deliberately **not** built on the `Tabs` primitive - `Tabs`/`TabsList`/`TabsTrigger` is for a flat segmented control (a row of equal-weight labels), not a rich icon+label+description nav row; the latter is closer to `Sidebar.tsx`'s own nav list (solid `bg-primary` active fill, `hover:bg-muted` otherwise) than to a toggle. The page's *mobile* horizontal tab strip, by contrast, genuinely is a segmented control and does use `Tabs` at the standard `h-8` tier. Rule of thumb: if a row of controls is interchangeable single-line labels, reach for `Tabs`; if each item carries its own icon/description/secondary content, it's a nav list, not a tab bar.

### Management Context Copilot
- **`copilot-dock` / `copilot-rail` / `copilot-drawer`** (`src/features/copilot/`): the reusable page-copilot shell (session in `useCopilotSession`, the page-owned briefing handed in as children, and the conversation owned by the shell so it renders on every page key). The dock is **layout, not a Card** - one `border-l border-border` edge against `bg-card`, `360px` at `xl` and `388px` from `1440px` up, `sticky` to its own column and never `position: fixed`. Collapsed at `xl`+ it is a 40px rail whose control is `Expand copilot panel`, **kept** alongside the same floating labeled `CopilotTrigger` (`Open copilot`) the below-`xl` drawer uses - the edge-anchored and the discoverable affordance, with distinct names - and the content column reserves a 72px bottom exclusion so no interactive row action sits under the floating control. Below `xl` the same body opens in a `CopilotDrawer` composed from `dialog.tsx` at `min(420px, 90vw)` (full-width `100dvh` under 768px). The composer is the dock's only solid `bg-primary` action; everything else is ghost/outline. The active tab is a state rather than an action - it is `bg-primary`, which DESIGN.md's own accent rule sanctions for active nav/tab state, and it is not the CTA the composer is.
- **`copilot-surface`** (`src/features/copilot/CopilotSurface.tsx`): the panel's single scroll container, consumed by both the dock and the drawer - `overflow-y-auto overflow-x-hidden overscroll-contain [overflow-wrap:anywhere]` on one `relative` element. `anywhere` (never `break-word`) is the load-bearing half: only `anywhere` counts soft-wrap opportunities toward min-content intrinsic size, so a flex child can shrink below its longest unbreakable token; `overflow-x-hidden` is the assertion that panel width is a layout invariant; `relative` keeps absolutely positioned `sr-only` labels inside the clip instead of stretching the app shell's scroll area by ~1900px. Callers add only their own padding via `className` and declare no scroller of their own.
- **`copilot-tabs`** (`src/features/copilot/CopilotTabs.tsx`): the panel's two sections, and its title. `variant="default"` at `w-full` inside `px-4`, so the track spans the panel and the two triggers split it evenly - the strip reads as the panel's title bar rather than a small control parked in a corner, and `px-4` aligns the pills with the content column below. The active tab is the primitive's `bg-primary` / `text-primary-foreground` (light: white on `#0f7f8c`; dark: `#06181a` on `#2dd4d9`), which is a state, not an action. **Neither panel renders a heading of its own**: the tab names the section, and Base UI already points each tabpanel's `aria-labelledby` at its own tab, so nothing lost a name when the duplicate heading went. The strip is deliberately taller than the primitive's `{control.default}` `h-8`: its track is `h-10` and it sits `mt-6` down from the panel top, so the pills line up with the page heading beside them (measured: pills at 28px, the heading at 26px) instead of sitting flush against the viewport edge. Override the height with the primitive's own `group-data-horizontal/tabs:` prefix - a plain `h-10` loses to that variant selector and `tailwind-merge` does not group the two. Never put a `min-h` on a trigger: the track's `p-[3px]` sizes the pill from itself, and a `min-h-[44px]` trigger overflows the track and clips the filled pill.
- **Evidence Lens** (`data-copilot-evidence-id`): a grounded claim's inline action resolves the first rendered, non-hidden record field that publishes the cited evidence id. Reveal is an `accent` wash plus a 2px `primary` outline transitioning **only** `background-color`/`outline-color` at 140ms exponential ease-out (see `src/index.css`'s `[data-copilot-evidence-id]` rules, which also drop the transition under `prefers-reduced-motion: reduce`) - never a scale, pulse, glow, or opacity entrance, and the `ring` token keeps its focus-state job. Hover/focus is a preview, activation is pinned, and below `xl` (modal drawer, inert record) or when no target renders, the same action opens the inline evidence detail instead of failing.
- **Attention marker**: the rail's marker is `text-warning` (or `destructive`) plus an icon and the label "This lead has items needing attention." - derived only from a real warning/critical claim, never an unread count, and never color-only. The same contract covers the floating and drawer trigger: `CopilotTrigger` puts the accessible name on a sibling `role="img"` span (`data-copilot-attention-marker="true"`) - never inside the button, whose contents are presentational in the accessibility tree - and pairs it with a visible `aria-hidden` glyph, so the state is announced once and never conveyed by color alone.
- **Persisted preferences**: `management-copilot:v1:<actorId>:<pageKey>:visibility` (`open`|`collapsed`) and `management-copilot:v1:<actorId>:<pageKey>:mobile-cue-dismissed` (`true`), keyed by the authenticated operator's stable internal id and the page, and written only after that identity resolves - never a browser-global key. The panel **starts collapsed**: nothing auto-opens it, on a first visit or any other, and the stored value is the only thing that keeps it open across visits.

### Business Notification Surface
- **`page-bar`** (`src/components/PageHeader.tsx`): the ONE bar at the top of every Management page - the page's name (and optional one-line subtitle) on the left, the page's own action buttons next, and the site-wide notification control at the far right. `sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg`: above every page-level bar (`z-10`/`z-20`) and below dialogs/popovers (`z-50`). `min-h-14`, `px-4 py-2 pl-14 sm:px-6 md:pl-6` - the left inset clears the sidebar's fixed mobile hamburger, which is why no page needs its own `pl-10` hack any more. **Pages own their actions**: the bar takes them as a slot and renders them in the page's own React tree, so no page has to portal state-dependent buttons into a bar it does not own. A page renders it ONCE, in place of the title block it used to hand-roll; the page's sub-bars (tab strips, filter rows) stay exactly where they were.
- **`notification-bell`** (`src/features/notifications/NotificationBell.tsx`): the icon button in the bar's right-most slot, and the site-wide counterpart to the page-scoped copilot. `variant="ghost" size="icon"`, `aria-label="Notifications"`, with a count pill anchored `-right-1.5 -top-1.5`. The pill counts **unread `critical` + `warning` only** and takes `variant="destructive"` when any of the unread is a critical, `secondary` otherwise - so the badge's colour is a severity statement, never decoration, and is always paired with an `sr-only` sentence because semantic state is never colour-only. `info` notifications are still counted on the wire but never reach the badge. It renders nothing without a session (no provider, or a role without business access) - the `useOptionalAuth` precedent for chrome that must degrade rather than throw. A critical raises the panel **once per browser session** (`management-notifications:v1:critical-auto-opened`), not once per page: the bell remounts on every route, so a ref would have re-opened it on every navigation.
- **`notification-panel`** (`src/features/notifications/NotificationPanel.tsx`): the bell's `PopoverContent` - `w-[26rem]`, `max-h-[min(42rem,calc(100vh-6rem))]`, `align="end" side="bottom"`. The primitive hard-codes `w-72`, so the width is passed explicitly. Opens with the page's **scope line** ("Your book" for a `salesRep`, "All business activity" otherwise) so the operator always knows which picture they are looking at, and a `Mark all read` ghost action. Rows group under `{typography.label}` category headings (Revenue / Pipeline / Operations / Customer opportunity / Business risk) in wire order. The `info` tier folds behind a single `Also worth a look (n)` disclosure - the gate the three severities imply - while `critical` and `warning` are always shown. Opening marks the visible set read; the three lifecycle actions are all optimistic with a refetch on failure. **Never colour-only, never a second severity vocabulary**: the row renders through `severityStyles`, so the panel and the copilot cannot describe severity differently.
- **`notification-row`** (`src/features/notifications/NotificationRow.tsx`): one business notification = a read/unread + date line, a `Dismiss` ghost icon-button, and the shared `insight-row` underneath with `primaryAction` set to the server's View target. It is deliberately NOT a second row shape: `notificationToClaim` maps a notification onto a `CopilotClaim` with `evidenceIds: []`, which makes `ClaimItem`'s `EvidenceAction` return `null` - a business reading cites a computed aggregate, not a rendered record field, so there is no field to reveal and no dead control is drawn. `Chat about this` is passed only when a copilot control is registered on the current page, matching `insight-row`'s own "absent hides the affordance entirely rather than offering it and failing" rule.
- **Notification targets** (`src/features/notifications/target.ts`): the View button's destination is server-authored as `{ path, query, label }` and serialized by `toNotificationUrl`, never assembled at a call site - `ids` is a comma-joined list that must be percent-encoded exactly once, and the deep-link pages read it back through `URLSearchParams`.

## Do's and Don'ts

### Do
- Use `{colors.primary}` for exactly one thing per screen: the one primary action. If a screen has three teal buttons, that's a sign none of them is actually primary.
- Render every price, ID, date, and delta in `{typography.data}` with tabular figures.
- Reach for `success`/`warning`/`destructive` for state, never for branding.
- Give every focusable element the `ring` treatment - it's the accent color's second job, and it's not optional.
- Keep both themes considered together - a color decided only in light mode isn't finished.
- Give every control sharing a row or toolbar the same height tier - see Control Sizing & Consistency.

### Don't
- Don't introduce a second accent hue. No blue *and* teal, no teal *and* amber-as-brand.
- Don't use `bg-gradient-to-r`/`bg-gradient-to-br` for decoration. The prior system's blue-indigo-violet-teal gradients are exactly what this system replaces - if a gradient shows up in a new component, that's regression, not polish.
- Don't reach past `{rounded.lg}` (8px) for ordinary buttons/cards, and don't add `shadow-xl`/`shadow-2xl` - see Elevation & Depth.
- Don't use Public Sans for tabular data or Archivo for body copy - each face has one job.
- Don't invent a new gray. `foreground`/`muted-foreground`/`border` cover the ladder - if something needs a fourth gray, that's a sign the hierarchy problem is elsewhere (usually: too many things trying to be visually important at once).
- Don't mix `size="sm"`/compact controls with default-size neighbors in one row, and don't drop below 12px (a `text-[Npx]` under `text-xs`) for real text.

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
- **Empty states and loading skeletons** have no defined visual language yet - each `StatCard` today improvises its own; the consolidated `StatCard` primitive (Phase 2.2) is where this should be settled once, not per-instance.
- **Phases 0-4.2 predate the Control Sizing & Consistency section above** and are known to violate it in places (row-level height mismatches, a couple of screens still off the shared size scale for same-role controls, a few sub-12px labels) - not fixed retroactively here by design; tracked as a single sweep in `UI_REWRITE_PROGRESS.md`'s Phase 6.6, scheduled after the remaining migration phases land rather than patched piecemeal mid-migration.

## Chart Theming (recharts)

Established in `features/dashboard` (Phase 3.1); centralized into `features/analytics/components/Common/chartTheme.ts` (Phase 4.1) - `chartGridColor`, `chartAxisColor`, `chartTooltipStyle`, `chartLegendStyle`, and the `CHART_PALETTE` array live there as the single source every chart in that feature imports, rather than each chart file re-deriving the same `var(--color-chart-1)` strings. Any future `recharts` usage outside `features/analytics` should still follow the pattern below (promote `chartTheme.ts` to `components/shared/` only if a second feature folder needs it - not preemptively).

`recharts` takes literal CSS color strings on its own props (`stroke`, `fill`, `contentStyle`, `<stop stopColor>`), not Tailwind classes - so it references the same CSS custom properties the `bg-*`/`text-*` utilities resolve, as raw `var(...)` strings:
- Series color: `var(--color-chart-1)` through `var(--color-chart-5)` - one token per series, `chart-1` for whichever series is "primary" in that chart.
- Gridlines (`CartesianGrid`): `var(--color-border)`.
- Axis ticks/labels: `var(--color-muted-foreground)`.
- Tooltip (`contentStyle`): `background: var(--color-popover)`, `color: var(--color-popover-foreground)`, `border: 1px solid var(--color-border)`, `boxShadow: var(--shadow-dropdown)`.

This works for dark mode with zero extra plumbing: the browser re-resolves `var()` on every paint, so toggling `.dark` re-colors an already-rendered chart with no React re-render or JS theme-detection needed - verified by screenshotting both themes.

**Gradients in charts are not the same "no gradients" rule as UI chrome.** A single-hue fade-to-transparent area fill (`stopOpacity` 0.3→0) is a standard charting convention, not decoration, and stays. A *multi-hue* gradient on one data series (e.g. the prior indigo→violet bar fill) is retired - if a chart needs to show two things, that's two series with two `chart-*` tokens, not one series with a two-color gradient.
