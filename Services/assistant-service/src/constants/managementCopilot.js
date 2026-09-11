// The Management copilot's one server-side deadline, in milliseconds. It is the
// whole ask budget (the agent loop's generation AND its tool I/O) and the
// briefing phase's single generation attempt — the same number the Management
// client's 20s abort wraps. It lives here so the loop budget and the briefing
// deadline cannot drift apart.
export const MANAGEMENT_GENERATION_DEADLINE_MS = 17_000;
