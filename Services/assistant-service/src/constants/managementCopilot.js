// The Management copilot's one server-side deadline, in milliseconds. It is the
// whole ask budget (the agent loop's generation AND its tool I/O) and the whole
// briefing generation — per attempt AND across its bounded retry, which is
// capped by this same number via `deadlineMs`, so retrying can never push the
// response past it. It is the number the Management client's 50s abort wraps,
// and it lives here so the loop budget and the briefing deadline cannot drift
// apart.
//
// 45s, not 17s: an ask spends this on the router, up to four tool-selection
// calls and the final answer - six model calls before it can speak. At the
// measured latency of the pinned flash-lite tier (~3-4s each) that sequence
// needs roughly 20-25s, and 17s left the loop ending itself with ~1.5s in hand
// ("generation step failed; ending the ask", remainingMs 1467) while the
// operator got the failure copy.
//
// The number is headroom, not a tight fit. Six calls is the worst case, but any
// one of them can run long, and a round that overruns must not cost the answer
// its turn - a timeout here is a failed answer the operator has to retry by
// hand. 45s covers the sequence about twice over and stays far inside Cloud
// Run's own request ceiling.
//
// Raise this and COPILOT_CLIENT_TIMEOUT_MS together: the client's abort must
// stay above this number, or it cuts off a generation the server still
// considers live.
export const MANAGEMENT_GENERATION_DEADLINE_MS = 45_000;
