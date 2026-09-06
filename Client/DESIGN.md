---
version: 0.1.0
name: lush-client
description: "The design system for LUSH Ware's customer-facing Client app - the luxury, eco-conscious travel booking site travellers actually see (home, destinations, packages, booking funnel, itinerary planner, my-account). Warm and brand-forward: a green/gold palette rooted in the existing LUSH brand, a warm neutral gray scale (not Tailwind's cool default), Fraunces serif for display, Inter for UI. The opposite of the Management app's cool operational Signal Console system: this is an editorial, image-led, high-consideration booking experience, not a data-processing tool. One interactive accent (green), gold reserved for featured/highlight moments, elevation by border and image contrast first with shadow reserved for genuinely floating chrome, and a deliberately small motion budget (Ken Burns hero, interactive hover/reveal, scroll-linked section entrances)."
colors:
  primary: "#2C7048"        # brand-600 - THE interactive accent: solid primary CTAs, active states, links
  primary-foreground: "#FFFFFF"
  accent: "#C9A24B"         # brand-accent-500 - gold highlight: FEATURED ribbons, prestige moments; never a primary CTA fill
  accent-foreground: "#0A1F14"
  background: "#FFFFFF"
  background-alt: "#FAF8F4" # gray-50 warm off-white, alternate section canvas
  foreground: "#2B241C"     # gray-900 warm ink
  muted-foreground: "#7C6E56" # gray-600 secondary/meta text
  border: "#E7E0D2"         # gray-200 warm hairline
  brand: "#3B8F5E"          # brand-500 scale midpoint (spinners, progress, icon tiles)
  brand-ink: "#123020"      # brand-900 deep green (dark surfaces w/ white text, footer-grade)

typography:
  display:
    fontFamily: Fraunces
    fontWeight: 600
    fontSize: 76px
    lineHeight: 1.02
    letterSpacing: -0.02em
    token: text-hero
  heading-lg:
    fontFamily: Fraunces
    fontWeight: 700
    fontSize: 48px
    lineHeight: 1.1
    token: text-display-lg
  heading:
    fontFamily: Fraunces
    fontWeight: 700
    fontSize: 36px
    lineHeight: 1.18
    token: text-display-md
  title:
    fontFamily: Fraunces
    fontWeight: 600
    fontSize: 20px
  body:
    fontFamily: Inter
    fontWeight: 400
    fontSize: 16px
    lineHeight: 1.625
  body-sm:
    fontFamily: Inter
    fontWeight: 400
    fontSize: 14px
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontWeight: 600
    fontSize: 12px
    lineHeight: 1.3
    letterSpacing: 0.04em
    textTransform: uppercase
  button:
    fontFamily: Inter
    fontWeight: 600
    fontSize: 14px
    lineHeight: 1.2

rounded:
  control: 12px   # rounded-xl - buttons, inputs, selects - the uniform interactive control radius
  card: 16px      # rounded-2xl - cards, content tiles
  modal: 24px     # rounded-3xl - dialogs/modals and full-bleed white panels
  pill: 9999px    # rounded-full - badges, avatars, icon circles, status dots

spacing:
  unit: 4px
  card-padding: 24px
  section-gap: 64px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    border: 1px solid "{colors.border}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
  modal:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.modal}"
  badge-featured:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
---

## Overview

LUSH Client is the design system for the customer-facing app - the site a traveller lands on, browses destinations on, books a package through, and plans a trip in. It is a **warm, editorial, brand-forward** system for a luxury eco-travel brand, and it is deliberately the opposite of Management's Signal Console: no cool grays, no teal, no dense operational tables. Everything a visitor touches should feel like the brand's print collateral came alive - deep botanical green, harvest gold, warm paper-white neutrals, and Fraunces serif headlines.

**Key characteristics:**

- **Warm, not cool.** The `gray` scale is overridden wholesale with a warm neutral scale (`gray-50 #FAF8F4` … `gray-950 #1A1610`) - every "neutral" surface in the app carries a faint cream/umber temperature. Nothing in the system uses Tailwind's default cool gray, and no new neutral hue may be introduced.
- **One interactive accent: brand green.** `brand-600 #2C7048` is the only Call-to-action / interactive color in the system - primary buttons, active page/tab/filter states, links, and focus rings. Today's code already does this overwhelmingly (see Colors → evidence); the rule going forward is that any new interactive element converges on green, never gold.
- **Gold is a highlight, not an action.** `brand-accent` (harvest gold) is reserved for "featured / premium / moment" surfaces - the `FEATURED` ribbon on package cards, headline prices, status dots that mean "pending/partial", gold-tinted editorial panels. It is never a solid primary CTA fill and never participates in a gradient with green (existing green→gold gradient CTAs are listed as violations to retire in later phases, not a pattern to copy).
- **Editorial typography.** Fraunces (serif) for every heading and display numeral, Inter for body/UI. Headings inherit Fraunces automatically (`h1`-`h6` rule in `index.css`) - no heading in the system renders in a sans face.
- **Elevation by border and image contrast first.** Cards sit on the canvas with a hairline border, not a shadow. Shadows exist for exactly three floating classes of element (dropdown/popover, the floating-action launcher, modal/drawer surfaces). Photo cards get their depth from the photography itself, not from box-shadow.
- **A small, named motion budget.** Three patterns and no more: the hero Ken Burns zoom, hover/reveal on interactive elements, and scroll-linked section-heading entrances. Shine sweeps, typewriter effects, and decorative pulses are banned.
- **Light theme only - for now.** Unlike Management, Client has no `.dark` palette: the app is a bright, image-led marketing + booking surface. All values in this document are chosen for light canvases; dark variants are not in scope until (if) a dark theme is actually designed.

## Colors

> All four scale tables above are copied verbatim from the `@theme` block of `Client/src/index.css`, which is the single source of truth (ported in Phase 0 from `src/config/palettes/lush.json`); the only non-`@theme` values in this file are Tailwind defaults used for semantic role mappings (`#FFFFFF` = the `white` utility, `#DC2626` = `red-600`), flagged where they appear. Never hardcode a hex in a component - reference the Tailwind utility (`bg-brand-600`, `text-gray-500`, `border-brand-accent-200`, …) or the CSS custom property (`var(--color-brand-600)`).

### Brand scale - botanical green (the interactive accent family)

| Token | Hex | Typical use |
|---|---|---|
| `brand-50` | `#F0F7F3` | Selected-row / hover wash on white, tinted section bands (`SustainabilityStrip`) |
| `brand-100` | `#DCEEE2` | Icon-chip / step-tile tinted fills |
| `brand-200` | `#BADFC8` | Tinted borders (selected tab underline pairs, info callouts) |
| `brand-300` | `#8FC9A6` | – |
| `brand-400` | `#5FAD7E` | – |
| `brand-500` | `#3B8F5E` | Mid-green: spinners, progress fills, completed steps, outlined-brand secondary buttons |
| `brand-600` | `#2C7048` | **The accent.** Primary CTA fill, active tab/filter/pagination state, chat bubbles, focus ring color |
| `brand-700` | `#235939` | Primary CTA hover, link hover |
| `brand-800` | `#1B4332` | Deep-green alternate CTA fill (`View Details` on light-gray bands), dark panel accents |
| `brand-900` | `#123020` | Near-black green text on tinted bands |
| `brand-950` | `#0A1F14` | Deepest green - shadow tint base |

### Brand-accent scale - harvest gold (highlight family, NOT interactive)

| Token | Hex | Typical use |
|---|---|---|
| `brand-accent-50` | `#FBF6EC` | Gold-tinted editorial panels / callout backgrounds |
| `brand-accent-100` | `#F6EAD1` | Gold icon-chip fills, focus halo tint |
| `brand-accent-200` | `#ECD5A3` | Gold panel borders, focus ring halo |
| `brand-accent-300` | `#E0BC72` | – |
| `brand-accent-400` | `#D4AD5A` | Gradient end-stop in legacy CTAs (being retired) |
| `brand-accent-500` | `#C9A24B` | **The gold.** `FEATURED` ribbon fill, status dots (pending/partial), support-tile fill |
| `brand-accent-600` | `#AD8536` | Gold icon/typography on tinted fills, social-icon hover |
| `brand-accent-700` | `#8C6A2B` | Gold text on white (outline-CTA label color) |
| `brand-accent-800` | `#6E5322` | – |
| `brand-accent-900` | `#574218` | – |
| `brand-accent-950` | `#332610` | Dark-ink-on-gold text (for `FEATURED` pill typography once code stops using raw `text-black`) |

### Brand-dark scale - deep green canvases

| Token | Hex | Use |
|---|---|---|
| `brand-dark-800` | `#16261E` | Secondary step on dark auth/splash gradients |
| `brand-dark-900` | `#0D1712` | Dark panel/splash base (`LoginContainer` side panel) |
| `brand-dark-950` | `#060B08` | Deepest canvas; modal-scrim shadow tint base |

### Warm neutral scale (replaces Tailwind gray)

| Token | Hex | Use |
|---|---|---|
| `gray-50` | `#FAF8F4` | Alternate section canvas (warm paper white) |
| `gray-100` | `#F3EFE6` | Skeleton/disabled fills, soft hover fills |
| `gray-200` | `#E7E0D2` | **Default hairline border / input border** |
| `gray-300` | `#D6CBB5` | Stronger dividers, hover borders |
| `gray-400` | `#B9AA8C` | Disabled icon/text |
| `gray-500` | `#9C8B6C` | Placeholder text |
| `gray-600` | `#7C6E56` | **Secondary / meta text** (descriptions, timestamps, captions) |
| `gray-700` | `#5F5341` | Strong body text |
| `gray-800` | `#443A2E` | Dark social-icon tiles, footer surfaces |
| `gray-900` | `#2B241C` | **Primary body text (warm ink)** |
| `gray-950` | `#1A1610` | Deepest neutral |

### The one-accent-color rule

**Brand green - specifically `brand-600` (#2C7048) with `brand-700` for hover - is THE Call-to-action and interactive accent.** Every solid primary CTA, every active navigation/tab/filter/pagination state, every link, and every focus ring in the app uses the brand green family. Gold (`brand-accent`) is a highlight color, never an action color.

Evidence from the current code (grep counts over `Client/src`, tsx/ts/css):

| Class family | Matches | Where it actually goes |
|---|---|---|
| `bg-brand-[0-9]` | 76 | Solid CTAs (`bg-brand-600` + `hover:bg-brand-700`), pagination active page, step dots, progress fills |
| `bg-brand-accent-[0-9]` | 20 | `FEATURED` ribbon, status dots, support tiles, tinted callouts - no solid white-text CTA |
| `text-brand-[0-9]` | 148 | Links, active-tab labels, prices (`FeaturedPackages` price), icons |
| `text-brand-accent-[0-9]` | 61 | Gold icon accents, hover tints on card titles, outline-CTA labels |
| `border-brand-[0-9]` | 79 | Active-tab underlines, brand outline buttons |
| `border-brand-accent-[0-9]` | 22 | Gold outline secondary CTAs, callout borders |

Every primary action in the current pages is a solid `bg-brand-600`/`bg-brand-700`/`bg-brand-800` button with white text (`Try again` reloads, pagination prev/next, planner `Next`/`Add Your First Day`, the assistant send button, chat bubbles, `View Details`). Gold appears as the `FEATURED` ribbon, pending/partial status dots, decorative icon tiles, and *outline*-style secondary CTAs - it never owns a solid white-text primary button outside a few legacy gradient violations listed below.

**Known violations to converge (not to copy) in later phases:**
- Green→gold gradient CTAs (`from-brand-600 to-brand-accent-600` in `AssistantWidget.tsx` and `ContactContainer.tsx`; `from-brand-accent-500 to-brand-500` in `BookingModal.tsx`; the gold→green hover gradient on `FeaturedPackages.tsx`'s `View Details`; `DestinationSelector.tsx`'s active-tab gradient). A two-hue gradient fill contradicts the one-accent rule; these become solid `brand-600` fills with `brand-700` hover when their phase touches them.
- `BookingModal.tsx` uses gold for its step indicator and submit emphasis. This is the funnel page drifting toward gold-as-primary; it converges to green with the rest of the system in Phase 2/3 work.

### Semantic role mapping (for wiring the primitives)

The shadcn primitives in `src/components/ui/` were ported with their generic shadcn class names (`bg-primary`, `bg-secondary`, `bg-muted`, `border-border`, `ring-ring`, `text-muted-foreground`, `bg-destructive`, …). Client's `index.css` defines scale tokens (`--color-brand-*`, `--color-gray-*`, `--font-*`, `--text-*`), not those semantic names, so the semantic tokens do not resolve yet. When a later phase wires the primitives, this is the sanctioned mapping (each target is an existing scale value above):

| Semantic role (primitive class) | Maps to | Value |
|---|---|---|
| `primary` / `ring` | `brand-600` | `#2C7048` |
| `primary-foreground` | white | `#FFFFFF` |
| `background` | white | `#FFFFFF` |
| `card` / `popover` | white | `#FFFFFF` |
| `foreground` | `gray-900` | `#2B241C` |
| `muted` / `secondary` | `gray-100` | `#F3EFE6` |
| `muted-foreground` / `secondary-foreground` | `gray-600` | `#7C6E56` |
| `border` / `input` | `gray-200` | `#E7E0D2` |
| `destructive` | stock red `red-600` | `#DC2626` |

Until that wiring lands, page code references the scale utilities directly (`bg-brand-600`, …) as it does today.

## Typography

### Font families

- **Fraunces** (`--font-display`, `'Fraunces', serif`) - the display/editorial face. Every heading (`h1`-`h6` get it automatically via the `index.css` rule), hero statements, card titles, and large prices. Weights loaded: 300, 400, 500, 600, 700.
- **Inter** (`--font-body`, `'Inter', sans-serif`) - the body/UI face. Paragraphs, labels, buttons, form fields, small print. Weights loaded: 300, 400, 500, 600, 700, 800.

Loaded via `VITE_GOOGLE_FONTS_URL` today (self-hosted `@fontsource` migration is scheduled separately in a later phase). Note: the legacy `body { font-family: 'Open Sans', … }` rule in `index.css` is stale - Open Sans is no longer loaded by `index.html` (only Fraunces + Inter are). Body copy should be styled with `font-body` / Inter utilities going forward; correcting the base `body` rule belongs to a later phase that edits page styling, not Phase 0.

### Hierarchy

The three custom size tokens in `@theme` carry their typographic companions in the theme block (copy-verified):

| Token | Face | Size | Weight | Line-height | Letter-spacing | Use (grounded) |
|---|---|---|---|---|---|---|
| `text-hero` | Fraunces | 76px (`4.75rem`) | 600 | 1.02 | `-0.02em` | Page-level H1, marketing heroes only (`HomeContainer.tsx:487` H1, ramped `text-3xl → sm:text-4xl → md:text-5xl → lg:text-hero`) |
| `text-display-lg` | Fraunces | 48px (`3rem`) | 700 | 1.1 | 0 | Statement section headings on photo/dark bands (`KeyPartners.tsx`, closing CTA, `md:text-5xl` usages) |
| `text-display-md` | Fraunces | 36px (`2.25rem`) | 700 | 1.18 | 0 | Default section heading (`FeaturedPackages`, `FAQ`, `SustainabilityStrip`, `TestimonialsSection` H2s - today written `text-3xl md:text-4xl font-bold`, which is this tier at `md+`) |

| Tier | Face | Size | Weight | Use (grounded) |
|---|---|---|---|---|
| Hero (page H1) | Fraunces | 76px → ramps down to 30px on small screens | 600 | One per marketing page, over the hero image (`HomeContainer` H1) |
| Display / section heading (H2) | Fraunces | 36px (md+), 30px below md | 700 | One per section, centered with an `mb-10/12/16` gap and a `text-lg text-gray-600` lede paragraph |
| Card title (H3/H4) | Fraunces | 18-20px | 600-700 | Package/feature/testimonial card titles (`FeaturedPackages` H3 `text-xl font-bold`; `AIPlanningExplainer`/`SustainabilityStrip` H3 `text-lg font-semibold`), FAQ questions |
| Body | Inter | 16px | 400 | Section lede paragraphs and long-form copy (`leading-relaxed`) |
| Body-sm / UI text | Inter | 14px | 400 | Card descriptions, list copy, forms, dense text (`text-sm text-gray-600`) |
| Label / eyebrow | Inter | 12px | 600 | Uppercase, `0.04em` tracking - kickers above headings, `FEATURED`-style pills, form labels. The app's floor: nothing user-readable below 12px |
| Price / big figure | Fraunces | 20-24px | 600-700 | Prices and hero numerals (`FeaturedPackages` price `text-2xl font-bold text-brand-600` renders in Fraunces via the heading rule - deliberate: prices are editorial on this site, unlike Management where they are tabular mono data) |

### Principles

- **Fraunces is for what is scanned and felt; Inter is for what is read and entered.** Never set body copy in Fraunces; never set a heading in Inter.
- **Green prices, gold eyebrows.** Headline prices use `text-brand-600`; the `FEATURED` ribbon is the one sanctioned gold `label` treatment (`bg-brand-accent-500/90` with dark text).
- **Headings inherit the serif automatically** (global `h1`-`h6` rule) - an `h3` with no font utility is already Fraunces, so don't add classes to make it so, and don't add a font-* utility that would override it back to sans.
- No font smaller than 12px for real content (arbitrary `text-[10px]`-style escapes below `text-xs` are never acceptable).

## Layout

### Spacing
- Tailwind's default 4px base scale is in effect (`@theme` adds no `--spacing-*` overrides) - use stock spacing utilities, never one-off pixel values.
- Card interior padding: 24px (`p-6`, the dominant current value on package/feature cards). Dense sub-cards may drop to `p-5`.
- Section rhythm: marketing sections alternate white and `bg-gray-50`/`bg-brand-50` bands; vertical padding of a full marketing section should be `py-16` on mobile scaling to `py-24` on desktop, with section headers using an `mb-12`-scale gap. (Legacy `py-section-md`-style class names used in some landing components are not defined anywhere and are inert - when a phase touches those components it replaces them with real spacing utilities, per `docs/CLIENT-REWAMP-PLAN.md`.)
- Content container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` - the near-universal wrapper across landing/listing sections today.

### Grid
- Card grids use `repeat(auto-fit, minmax(Npx, 1fr))`-style responsive columns (as the existing package/deal grids do) - no hand-authored breakpoint per row of cards.

## Elevation & Depth

**Default to border and image contrast. Reserve shadow for genuinely floating elements.** A card that sits in normal document flow is elevated by (a) a `border-gray-200` hairline against the page canvas, or (b) the contrast of its own photography/scrim - never by a box-shadow. This is a settled `/plan-design-review` decision, restated here so later phases implement it consistently.

| Elevation | Recipe | For |
|---|---|---|
| In-flow card (default) | `bg-white border border-gray-200 rounded-2xl`, no shadow | Package/feature/FAQ cards, tiles, panels |
| Tinted band | `bg-gray-50` or `bg-brand-50` full-bleed section, no border needed | Alternate section backgrounds |
| Photo card | Photography + bottom gradient scrim for text legibility (`from-black/60`-style single-hue fade, if needed) | Destination/package image cards, heroes |
| Floating | `var(--shadow-floating)` | Dropdowns, popovers, the floating-action launcher, tooltips |
| Modal/drawer surface | `var(--shadow-modal)` + `z-overlay` scrim | Dialogs, mobile filter drawer, any portal surface |

Two shadow tokens are specified here as CSS custom properties for a later phase to add to `index.css` (do NOT add them during Phase 0 - the tokens land with the phase that first needs them):

```css
/* Recommended additions to Client/src/index.css when elevation wiring lands */
--shadow-floating: 0 8px 24px rgb(10 31 20 / 0.10), 0 2px 6px rgb(10 31 20 / 0.06);
--shadow-modal: 0 24px 64px rgb(6 11 8 / 0.24), 0 4px 16px rgb(6 11 8 / 0.10);
```

(The tint bases are `brand-950 #0A1F14` / `brand-900`-adjacent green-blacks so shadows stay warm, not gray. Client is light-theme-only today, so no shadow-color token swap is needed yet.)

**No `shadow-xl`/`shadow-2xl` on in-flow cards, no `hover:shadow` on every card.** The existing `hover:shadow-lg`/`hover:shadow-2xl` + `hover:scale` recipe on package cards is exactly what this policy retires: hover feedback for an in-flow card is a border/translate/brand-tint change, not a deepening shadow. Card hover = `border-gray-300` + title `group-hover:text-brand-600`-style color movement.

## Shapes (radius scale)

One radius per component kind, picked from what the current code already mostly does. Phase 1's chrome pass replaces hardcoded `rounded-xl`/`2xl`/`3xl` on shared chrome with these tokens.

| Kind | Token | Value | Utility | Why (grounded in current code) |
|---|---|---|---|---|
| **Card** | `--radius-card` | 16px | `rounded-2xl` | Majority of existing hero/feature/package/FAQ cards and white content tiles are `rounded-2xl` (83 matches across features - `FeaturedPackages.tsx` package card `bg-white rounded-2xl`, FAQ items, DealSlider tiles) |
| **Button** | `--radius-button` | 12px | `rounded-xl` | The booking/conversion CTAs - planner `Next`/`Add Your First Day`/generate buttons (`CustomizePackageContainer.tsx`), contact submit, assistant controls - are `rounded-xl`. Smaller than the cards they sit on (radius scales down with element size), and it keeps buttons visually distinct from the `rounded-2xl` tiles |
| **Input** | `--radius-input` | 12px | `rounded-xl` | Every field in the contact form (`ContactContainer.tsx` name/email/phone/etc.) and the planner fields are `rounded-xl`. Inputs and buttons share rows in filters/forms, so they share one radius |
| **Modal** | `--radius-modal` | 24px | `rounded-3xl` | The largest surfaces already use `rounded-3xl`: the booking modal (`BookingModal.tsx:49` `bg-white rounded-3xl`), profile edit modal, request-list dialog, and the full-bleed white panels on package/about pages |
| Pill | – | 9999px | `rounded-full` | Badges, avatars, icon circles, status dots, step indicators - anything meant to read as a dot or pill |

Legacy clusters that will converge onto this scale (not preserved): list/pagination utility buttons currently at `rounded-lg`, and `BookingModal`'s inputs/CTA at `rounded-2xl`. The installed primitives ship shadcn defaults (`rounded-lg` on Button/Input base classes) - those literal classes are replaced with the tokens during the phase that wires the primitives.

## Motion Budget

Settled `/plan-design-review` decision, formalized: **exactly three motion patterns are allowed sitewide.** Anything else found in later phases gets removed, not replicated.

1. **Hero background zoom (Ken Burns)** - the one shared animation token: `--animate-kenburns` (`kenburns 20s ease-out forwards`, scale 1 → 1.12, defined in `index.css`). Applied to hero media backgrounds only, never to content. `HomeContainer`'s hero and destination/package hero imagery are its sanctioned homes.
2. **Hover/reveal on interactive elements** - quick color/border/translate transitions on buttons, links, cards (150-300ms, `transition-all`/`transition-colors`), per the Elevation section. Includes reveal-on-scroll of interactive surfaces such as the floating-action launcher's existing scroll-threshold fade-in.
3. **Scroll-linked entrance for section headings** - headings/ledes may fade/rise into view once as they enter the viewport (and must respect `prefers-reduced-motion`).

**Explicitly NOT in the budget** (remove wherever later phases find them): shine sweeps, typewriter effects, decorative pulse/`animate-pulse` ambient orbs (e.g. the blurred `animate-pulse` circles in `LoginContainer.tsx` and `AssistantWidget`), bouncing download icons, and any other ambient loop that is not feedback to a user action. Hero zoom is the *only* ambient/entrance motion that runs without user interaction.

## Z-Index Scale

`index.css` defines ten named stacking tokens as fixed custom utilities (`z-base` … `z-modal`). They replace ad-hoc bare `z-50`/`z-[9999]` values - no new component may introduce a bare z-index. Two deliberately distinct tiers, per the comment in `index.css`:

### Local tokens (within-component layering; never leave their own relative/absolute containing block)

| Token | Value | For |
|---|---|---|
| `z-base` | 0 | Default layer - content with no local stacking need |
| `z-raised` | 10 | Content lifted above a same-block decorative layer (e.g. auth content above blurred orbs, `LoginContainer`) |
| `z-elevated` | 20 | Intermediate local layer above raised imagery |
| `z-lifted` | 30 | Top of a local stack - hero text above hero media/gradient layers (`HomeContainer` hero content) |
| `z-prominent` | 40 | Highest local layer inside a component |

### Global chrome tokens (escape local layout: fixed positioning, portals)

| Token | Value | For |
|---|---|---|
| `z-header` | 50 | The sticky site header |
| `z-dropdown` | 60 | Dropdown menus/popovers anchored under header or filter controls |
| `z-floating-action` | 70 | The floating action stack launcher (and its expanded menu) |
| `z-overlay` | 90 | Scrims/backdrops for modals and the mobile drawer |
| `z-modal` | 100 | Modal/drawer content above their own overlay (mobile menu portal, dialogs) |

## Components

> `src/components/ui/` holds the Phase 0 shadcn/Base UI primitives (button, card, input, select, dialog, sheet, tabs, badge, checkbox - all importing `cn` from `@/lib/utils`). These are the *only* sanctioned building blocks for new chrome; hand-rolled `fixed inset-0` modals, bespoke `<button className="bg-brand-600 rounded-lg…">` strings, and duplicated filter/range markup migrate onto them in later phases.

### Button
- **`button.tsx`**: variants `default` (solid primary - the ONE accent CTA per screen once wired to `brand-600`), `outline` (secondary actions, `bg-white` + `border-gray-200`), `secondary`, `ghost` (tertiary/inline), `destructive` (soft `bg-destructive/10` treatment), `link`. Sizes `default`/`sm`/`lg`/`xs` + icon-only sizes. Rule: one `default` per view; everything else on that view is `outline`/`ghost`. Radius converges to `--radius-button` (12px) when wired.

### Card
- **`card.tsx`**: `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent`/`CardFooter`, with a `size="sm"` variant. The base for every content tile and the future shared `PackageCard`. Elevation = `border-gray-200` hairline + `rounded-2xl` (`--radius-card`), never resting shadow.

### Input
- **`input.tsx`**: single `Input` primitive (`h-8`, border, focus ring). All text entry converges on it (with the same `--radius-input` 12px radius and visible brand-colored focus ring once wired). Legacy phone/date pickers keep their own overrides until their feature phase replaces them.

### Select
- **`select.tsx`**: `Select` family (`SelectTrigger`/`SelectContent`/`SelectItem`/…) - the sanctioned control for dropdown fields (cabin class, traveller counts, sort order, currency). Shares the control height and 12px radius of `Input`/`Button` so same-row controls align.

### Dialog
- **`dialog.tsx`**: `Dialog` family with real overlay/portal. The sanctioned modal - `rounded-3xl` (`--radius-modal`) surface, `z-overlay` scrim, `z-modal` content. Direct replacement for the hand-rolled `bg-white rounded-3xl shadow-2xl` surfaces (`BookingModal`, `ProfileEditModal`, request-list dialog) when their phases migrate.

### Sheet
- **`sheet.tsx`**: side-drawer primitive with backdrop. The sanctioned mobile/tablet filter drawer - Phase 1 replaces the hand-rolled `FilterPanelShell` + both `FiltersSidebar.tsx` copies with this.

### Tabs
- **`tabs.tsx`**: `Tabs`/`TabsList`/`TabsTrigger` with two list variants: `default` (segmented, `bg-muted` track + raised active pill, `h-8`) and `line` (underline indicator - for marketing content switching like the FAQ tab bar). Active state colors converge to the brand-green active treatment.

### Badge
- **`badge.tsx`**: pill (`rounded-4xl`, i.e. effectively `rounded-full`), variants `default`/`secondary`/`destructive`/`outline`/`ghost`/`link`. The `FEATURED`-style gold ribbon and semantic pills (deposit status, availability) are this primitive with brand-accent/brand fills - gold for "featured/premium" moments, green for positive confirmation, never both on one pill.

### Checkbox
- **`checkbox.tsx`**: the sanctioned checkbox for filter lists (destination regions, star ratings, price/duration ranges) - consumed by the shared `RangeFilterGroup` and the filter drawers in Phase 1.

## Do's and Don'ts

### Do
- Use `brand-600` for exactly one thing per view: the one primary action. If a screen shows multiple solid green CTAs, none of them is actually primary - demote the rest to `outline`/`ghost`.
- Reserve gold for featured/premium moments (`FEATURED` ribbon, status dots, tinted editorial panels) - never for a primary CTA fill.
- Elevate in-flow cards with a `gray-200` border; add shadow only to genuinely floating elements (dropdown/popover, launcher, modal/drawer).
- Give every heading the Fraunces it inherits by default, and every price the green it earns as an editorial figure.
- Stay inside the three-pattern motion budget - Ken Burns heroes, hover/reveal, scroll-linked headings - and respect `prefers-reduced-motion`.
- Use the named z-index utilities, never bare `z-50`/`z-[9999]`.

### Don't
- Don't introduce a second accent hue or a second neutral family. No blue anywhere; no cool-gray re-introduction; no teal.
- Don't use green→gold (or any two-hue) gradients on CTAs or chrome. Single-hue fades to transparent for photo scrims are fine; multi-hue gradient fills are the pattern this system replaces.
- Don't put `shadow-xl`/`shadow-2xl` on in-flow cards, and don't add `hover:scale`/`hover:shadow` micro-interactions to every card - see Elevation & Depth.
- Don't add shine sweeps, typewriter effects, decorative pulse, or any ambient animation outside the hero zoom.
- Don't set body copy in Fraunces, headings in Inter, or any user-readable text below 12px.
- Don't hand-roll a modal, drawer, or filter control when `dialog`/`sheet`/`tabs`/`checkbox`/`select` exist - and don't add a second radius on the same element kind.

## Known Gaps

- **Semantic tokens are not wired yet.** The `ui/` primitives reference shadcn semantic class names (`bg-primary`, `border-border`, `ring-ring`, `--radius-md`, …) that `index.css` does not define; the sanctioned mapping to the brand scales is in the Colors section above and lands with the phase that wires them. Until then the CSS scale utilities and this mapping together are the reference.
- **Radius tokens are specified, not defined.** `--radius-card`/`--radius-button`/`--radius-input`/`--radius-modal` and the two shadow custom properties are named here for later phases to add to `index.css` - Phase 0 does not touch the file beyond what is already committed.
- **The legacy `body { font-family: 'Open Sans' … }` rule is stale** (Open Sans no longer loads); it is corrected when a phase edits page styling.
- **Page code still contains bare `z-` values, gradient CTAs, hand-rolled modals, and inert `py-section-*` classes.** All are tracked by `docs/CLIENT-REWAMP-PLAN.md` phases and are intentionally out of scope here - this file is the target they converge on.

## Iteration Guide

1. Reference tokens by name/utility (`bg-brand-600`, `text-gray-600`, `rounded-2xl`, `z-modal`, `font-display`) - never a raw hex or one-off value.
2. When a new shared primitive lands in `components/ui/`, add its entry to the Components section in the same change - this file drifting out of sync is the one failure mode that kills the system.
3. When a feature phase finds a real gap (a needed token that doesn't exist), add it to `index.css` *and* document it here in the same change; don't invent inline values.
4. Before adding a color, ask whether it is a *shade of an existing scale* (extend brand/gray) or a genuinely new role (rare) - and whether it is interactive (must be green-family) or a highlight (may be gold).
5. When a legacy gradient CTA, hand-rolled modal, or decorative animation is encountered in a later phase, replace it per this file rather than preserving it.
