# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
