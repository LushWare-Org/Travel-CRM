// The Management copilot's one server-side deadline, in milliseconds. It bounds
// the WHOLE turn, not just generation: the evidence-bundle load and the ask's
// aggregate precompute run before any model call and are charged to it too, so
// each phase is handed only the turn's remaining share (see
// `remainingTurnBudgetMs` in managementCopilot.controller.js). Generation gets
// it per attempt AND across a bounded retry, which is capped by the same number
// via `deadlineMs`, so retrying can never push the response past it. It is the
// number the Management client's 20s abort wraps, and it lives here so the loop
// budget and the briefing deadline cannot drift apart.
export const MANAGEMENT_GENERATION_DEADLINE_MS = 17_000;

// The smallest slice of the turn budget worth starting a generation on. A call
// handed less than this cannot produce an answer before the client gives up, so
// the turn stops honestly (limitation block / deterministic fallback) instead.
export const MANAGEMENT_MIN_CALL_TIMEOUT_MS = 1_000;
