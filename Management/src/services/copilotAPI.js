import { API_BASE_URL } from "./api.js";

// Management Context Copilot client. Thin fetch wrapper over
// POST /api/v1/assistant/management/turn, reusing the app's bearer-token
// convention (localStorage/sessionStorage), never storing a transcript.

function authHeaders() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function turn(payload) {
  const res = await fetch(`${API_BASE_URL}/assistant/management/turn`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const message = body?.message || `Copilot request failed (HTTP ${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

// mode='deterministic' — fast, no model. Returns the context stamp + insights.
export function copilotDeterministic({ pageKey, scope, since = "last_visit", lastSeenAt = undefined }) {
  return turn({ mode: "deterministic", page: { key: pageKey, scope, since, lastSeenAt } });
}

// mode='briefing' — model claims appended to the deterministic phase.
export function copilotBriefing({ pageKey, scope, since = "last_visit", lastSeenAt = undefined }) {
  return turn({ mode: "briefing", page: { key: pageKey, scope, since, lastSeenAt } });
}

// mode='ask' — bounded tool loop answering a follow-up.
export function copilotAsk({ pageKey, scope, since = "last_visit", lastSeenAt = undefined, messages, priorClaims = undefined }) {
  return turn({ mode: "ask", page: { key: pageKey, scope, since, lastSeenAt }, messages, priorClaims });
}
