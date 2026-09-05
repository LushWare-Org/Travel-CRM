# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
