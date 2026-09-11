// The Management copilot's one server-side deadline, in milliseconds. It is the
// whole ask budget (the agent loop's generation AND its tool I/O) and the whole
// briefing generation — per attempt AND across its bounded retry, which is
// capped by this same number via `deadlineMs`, so retrying can never push the
// response past it. It is the number the Management client's 20s abort wraps,
// and it lives here so the loop budget and the briefing deadline cannot drift
// apart.
export const MANAGEMENT_GENERATION_DEADLINE_MS = 17_000;
