// The Management copilot's one server-side deadline, in milliseconds. It bounds
// the WHOLE turn, not just generation: the evidence-bundle load and the ask's
// aggregate precompute run before any model call and are charged to it too, so
// each phase is handed only the turn's remaining share (see
// `remainingTurnBudgetMs` in managementCopilot.controller.js). Generation gets
// it per attempt AND across a bounded retry, which is capped by the same number
// via `deadlineMs`, so retrying can never push the response past it. It is the
// number the Management client's 50s abort wraps, and it lives here so the loop
// budget and the briefing deadline cannot drift apart.
//
// 45s, not 17s, and the whole-turn accounting above is why: this number is the
// headroom on top of a budget that now actually holds, not a substitute for it.
// An ask still spends up to six model calls — the router, four tool-selection
// rounds and the final answer — at the pinned flash-lite tier's measured ~3-4s
// each, so the sequence needs roughly 20-25s, and a round that runs long must
// not cost the answer its turn: a timeout here is a failed answer the operator
// has to retry by hand. 45s covers the sequence about twice over and stays far
// inside Cloud Run's own request ceiling.
//
// Raise this and COPILOT_CLIENT_TIMEOUT_MS together: the client's abort must
// stay above this number, or it cuts off a generation the server still
// considers live.
export const MANAGEMENT_GENERATION_DEADLINE_MS = 45_000;

// The smallest slice of the turn budget worth starting a generation on. A call
// handed less than this cannot produce an answer before the client gives up, so
// the turn stops honestly (limitation block / deterministic fallback) instead.
export const MANAGEMENT_MIN_CALL_TIMEOUT_MS = 1_000;
