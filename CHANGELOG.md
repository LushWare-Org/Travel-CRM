# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.5.1.0] - 2026-09-10

### Changed
- The Management sidebar is about a fifth narrower, so more of the page you are working on fits on screen. Nav labels stay whole — the rail is sized to fit the longest one — and the brand block now stacks the logo above the company name instead of running them side by side.
- The company name shown throughout Management is now "Lush Travel Providers": the sidebar, the browser tab, and the default wording on generated documents all use it.
- The account panel at the bottom of the sidebar groups your name and role together, with a larger role icon and a roomier greeting.

### Fixed
- The sidebar's collapse animation now respects your operating system's "reduce motion" setting instead of always animating.
- A very wide organization logo can no longer push the sidebar's collapse button off the edge of the rail.

## [0.5.0.0] - 2026-09-09

### Added
- Assistant telemetry now correlates browser delivery and server resolution events by turn ID, with strict privacy-safe resolution metadata and a composite session/turn database index.
- Added an abstaining two-stage assistant intent router with independently disabled social/off-topic fast paths, stage agreement for low-risk travel guidance, and a live nested-fold replay command.
- Added a strict synthetic safety corpus for router development; synthetic rows are explicitly excluded from production enablement evidence.

## [0.4.0.0] - 2026-09-09

### Added
- The site-wide assistant can now respond naturally to greetings, thanks, farewells, and conversational repair requests, and warmly redirects unrelated questions back to travel help.
- Assistant replies now use a four-outcome response contract across the service, client, and usage telemetry, with reviewed company copy for social and off-topic responses.

### Changed
- Assistant requests now use a 27-second server deadline and 30-second client timeout, with one resolver attempt and no automatic retry for billed turns, avoiding duplicate AI calls after timeouts.
- The new conversational outcomes ship behind a disabled rollout flag: deploy the compatible Client first, verify cached-bundle propagation, then enable the outcomes and remove the temporary flag after one tested rollback window.

### Fixed
- Model output is now canonicalized into strict per-outcome arguments before dispatch, preventing unrelated or malformed generated fields from crossing the assistant trust boundary.

## [0.3.0.1] - 2026-09-05

### Fixed
- Fixed a real risk in the deploy infrastructure: an unrelated infrastructure change (e.g. a secret rotation or a memory limit bump) could have silently reverted every backend service to an older, already-superseded container image the next time infrastructure changes were applied — verified this can no longer happen.

### Added
- Infrastructure changes (Terraform) now get an automatic, read-only preview posted on every pull request, so a reviewer can see exactly what would change in the cloud environment before merging.
- Applying infrastructure changes for real now always requires a person to deliberately trigger it — nothing applies automatically on merge.

## [0.3.0.0] - 2026-09-05

### Added
- A floating "Ask us" assistant button now appears on every public page (home, packages, destinations, about, contact, career) — visitors can ask it to take them to a page or answer a policy/FAQ question (refunds, cancellations, baggage, etc.) without leaving the page they're on.
- The assistant can navigate you to any enabled page on the site by name, and answers policy questions by quoting the company's actual published policy text — it never invents an answer; when it doesn't have a confirmed answer, it says so and points you to the team.
- Anonymous usage telemetry (widget shown, opened, message sent, reply received, page-navigation clicked) now feeds a new internal event log, used to measure whether this assistant is worth expanding.

### Changed
- The trip-planning chatbot's policy-answer engine is now shared code reused by the new site-wide assistant, so a future policy-wording fix only has to happen in one place instead of two.
- Gemini API calls across the trip-planning chatbot and the new assistant now wait the exact amount of time Google's API asks for after a rate-limit response, instead of a fixed guess — quota-limited requests now recover instead of failing outright.

## [0.2.0.0] - 2026-09-04

### Added
- The trip-planning chatbot now asks for a way to reach you (email, phone, or WhatsApp) once it knows your destination and trip length, then automatically hands your conversation to the team as a lead — no more re-explaining your trip to an agent from scratch.
- Sales reps can see and claim customer conversations coming from the chatbot in a distinct "Pending Verification" queue in Management, visible to any rep until someone claims it, with the full conversation transcript attached.
- New filter controls in the lead list for filtering by source and platform, including the chatbot as a filterable source.

### Changed
- Leads created by the chatbot always start in a "Pending Verification" state and require a sales rep to actively claim them before entering the normal sales pipeline — the chatbot never books, confirms, or prices anything on its own.

### Fixed
- The lead list's source and platform filters, which previously had no effect, now actually filter results.

## [0.1.0.0] - 2026-09-04

### Added
- Per-day AI itinerary regeneration: a sparkle button on each day card in the trip planner (`PlanYourTripContainer`) and the package customization flow (`CustomizePackageContainer`) regenerates just that one day with AI, leaving every other day's edits untouched.
- Bulk "Generate remaining days with AI" action that fills every not-yet-planned day in one call, so a partially hand-built itinerary can be completed with AI instead of one day at a time.
- Success toast with an Undo action after any AI regeneration (per-day or bulk), so a worse result can be reverted immediately.
- New public, rate-limited endpoints `POST /packages/generate-day-preview` and `POST /packages/generate-days-preview` powering the above, aware of the trip's other already-planned days so the AI avoids repeating locations or activities.

### Changed
- AI-generated day content is now bounded to the same size limits used when that content is sent back as context for further regeneration, keeping repeated regenerate/fill cycles reliable on longer trips.

### Fixed
- The "Generate remaining days with AI" action no longer offers day numbers beyond the AI endpoints' 30-day limit on longer trips, so bulk-fill never fails with a validation error partway through.
