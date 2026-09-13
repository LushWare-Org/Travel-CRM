# Landing Sections: Adaptive Destinations Grid + Paired Why-Travel-With-Us Items

## Context

Two landing-page sections on `Client/src/features/landing` render awkwardly. (1) "Explore the World Without Limits" (`DestinationsSection` → `InternationalGrid`) always uses a fixed `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` layout with `.slice(0, 12)`, so a non-multiple-of-columns item count leaves a sparse half-empty trailing row. (2) "Why Travel With Us?" (`WhyChooseUs`) maps over all 13 `REVIEW_VIDEOS` but only has 3 `features` + 3 `featureDescriptions`, so indices 3–12 render a video with blank/undefined title and description. End state: the destinations grid shows a fixed max of 6 cards with columns that collapse to the actual item count (centered, bounded, never a sparse row); and "Why Travel With Us?" shows exactly 3 items, each a complete video + title + description.

## Approach

### A — "Explore the World Without Limits" adaptive grid

All changes in `Client/src/features/landing/components/InternationalGrid.tsx`. No other file consumes `InternationalGrid` (its only importer is `DestinationsSection.tsx`); the full `/destinations-international` page uses separate `DestinationCard`/`DestinationListItem` components and is out of scope.

1. **Cap the count at 6.** Add `const MAX_DESTINATIONS = 6;` immediately after the imports (above the `InternationalGridProps` interface). Change line `const internationalDests = destinations.filter((d) => d.type === "international").slice(0, 12)` to slice with `MAX_DESTINATIONS`: `.slice(0, MAX_DESTINATIONS)`. Keep the `.filter((d) => d.type === "international")` unchanged (harmless — `normalizeDestination` always sets `type: 'international'`).

2. **Replace the fixed grid with auto-collapsing columns.** Replace the grid container `<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">` with `<div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}>`. `auto-fit` collapses empty tracks to the item count (6 items → 6 columns, 1 item → 1 column); `minmax(min(100%, 160px), 1fr)` keeps ~2 columns on mobile (160px floor) and ~6 on the 1350px desktop container, matching the prior breakpoints without the static classes.

3. **Delete the now-dead `<style>` block.** Remove the entire `return (<><style>{`…`}</style>…` wrapper's `<style>` element (the block containing the two `@media` rules targeting `.grid.grid-cols-2.md\:grid-cols-3.lg\:grid-cols-6`). Those selectors no longer match after step 2. Keep the JSX `<>…</>` fragment (or collapse it to a single parent) but do not retain the orphaned media queries.

4. **Bound and center sparse cards.** On the card `<button>` (the element with `className="group relative overflow-hidden rounded-2xl aspect-[5/7] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"`), append ` w-full max-w-[300px] justify-self-center` to the className. This keeps cards filling their track on a full 6-column row (tracks are ~200–260px wide) but caps a lone/paired card at 300px and centers it within an otherwise over-wide `1fr` track, so 1–2 destinations never render as a full-width portrait card.

### B — "Why Travel With Us?" video + two-text pairs

All changes in `Client/src/features/landing/components/WhyChooseUs.tsx`. Do **not** edit `Client/src/config/media.ts` or `REVIEW_VIDEOS` (still consumed by `ReviewsVideoSlider.tsx`); reference its elements instead.

1. **Replace the three parallel arrays + `videos` alias with a single paired array.** Delete `const videos = REVIEW_VIDEOS;`, the `features` array, and the `featureDescriptions` array. Add one constant above the component (or at module scope):

   ```ts
   const whyTravelWithUs = [
     {
       title: 'Personalized Itineraries',
       description: 'Every journey is uniquely crafted to match your dreams and preferences',
       video: REVIEW_VIDEOS[0],
     },
     {
       title: 'Expert Local Guides',
       description: 'Connect with authentic experiences through our expert local guides',
       video: REVIEW_VIDEOS[1],
     },
     {
       title: 'Best Price Guarantee',
       description: 'Transparent pricing with no hidden fees, your trust matters to us',
       video: REVIEW_VIDEOS[2],
     },
   ];
   ```

   `REVIEW_VIDEOS[0..2]` are, in order: Bali Tour (`/reviews/bali.mp4`), Maldives Tour (`/reviews/maldives7.mp4`), Thailand Tour (`/reviews/thailand2.mp4`). The title/description strings are copied verbatim from the current `features`/`featureDescriptions` arrays.

2. **Map over the paired array.** Change `{videos.map((video, index) => (` to `{whyTravelWithUs.map((item, index) => (`. Inside the row, replace every field read so no `index`-based lookup into a short array remains:
   - `<video src={video.file}` → `<video src={item.video.file}`.
   - `onClick={() => setSelectedVideo(video)}` → `onClick={() => setSelectedVideo(item.video)}`.
   - `{features[index]}` → `{item.title}`.
   - `{featureDescriptions[index]}` → `{item.description}`.

3. **Leave the modal and state unchanged.** `selectedVideo` remains typed `(typeof REVIEW_VIDEOS)[number] | null` and `setSelectedVideo(item.video)` stays type-correct; the modal reads `selectedVideo.file`, which the paired `video` objects still provide.

## Critical files & anchors

- `Client/src/features/landing/components/InternationalGrid.tsx` — grid container (currently line 44), the `<style>` block (lines 29–43), and the card `<button>` (line 46); cap constant added near the top. Re-read before editing.
- `Client/src/features/landing/components/WhyChooseUs.tsx` — `videos`/`features`/`featureDescriptions` (lines 7–14) and the `.map` body (lines 32–83); replace with the paired array. Re-read before editing.
- `Client/src/config/media.ts` — `REVIEW_VIDEOS` order (lines 9–23) confirming `[0]`=Bali, `[1]`=Maldives, `[2]`=Thailand. Reference only; do not modify.

## Verification

- `cd Client && npm run typecheck && npm run build` — both must pass; `typecheck` confirms the paired-array field renames and the removed `features`/`featureDescriptions` leave no dangling references.
- Live browser against the running stack (`hub` restart `client-dev`, then open `http://localhost:5173/`):
  - Scroll to "Explore the World Without Limits": confirm exactly 6 destination cards render in a single full-width row on desktop (no 7th card, no sparse trailing cell), each still showing name + "Starting from" price and navigating on click.
  - Scroll to "Why Travel With Us?": confirm exactly 3 rows, each with a visible video thumbnail (play icon) on one side and a green-check title + description on the other; confirm no row has an empty heading/description (the former 13-video/3-text bug).
- Regression: confirm the standalone reviews slider (directly below the destinations section, `ReviewsVideoSlider`) still shows its videos — it must be unaffected since `REVIEW_VIDEOS` is unchanged.

## Assumptions & contingencies

- **Cap = 6** and **3 pairs** are the user-selected counts; they are constants (`MAX_DESTINATIONS`, `whyTravelWithUs` length) and trivially changeable if the user later asks.
- The collapse behavior is delivered via CSS `auto-fit` (no JS item-count detection). If a deployment's live destination count is < 6, columns shrink to that count automatically; if the count is 1–2, cards cap at 300px and center — no additional branch is required.
- If `min(100%, 160px)` is rejected by the build's CSS tooling (it is standard CSS and inline, so it should not be), fall back to the equivalent inline value `minmax(160px, 1fr)` and accept a single column on very narrow (<344px) screens.
