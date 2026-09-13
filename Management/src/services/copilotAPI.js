import { API_BASE_URL } from "./api.js";

// Management Context Copilot client. Thin fetch wrapper over the authenticated
// management assistant routes, reusing the app's bearer-token convention
// (localStorage/sessionStorage) and never storing a transcript.
//
// Every call accepts an optional AbortSignal and is additionally bounded by a
// client timeout above the server's 17s generation deadline. A caller abort and
// a timeout are distinct: an abort is silent (the caller moved on), a timeout is
// a recoverable failure with Retry.

// Above the server's MANAGEMENT_GENERATION_DEADLINE_MS (17s) so a legitimate
// generation is never cut off before the server gives up on it.
export const COPILOT_CLIENT_TIMEOUT_MS = 20_000;

export const COPILOT_ABORT_CODE = "COPILOT_ABORTED";
export const COPILOT_TIMEOUT_CODE = "COPILOT_TIMEOUT";

/**
 * @typedef {object} CopilotCallOptions
 * @property {string} pageKey
 * @property {Record<string, unknown>} scope
 * @property {"last_visit" | "today" | "7_days"} [since]
 * @property {string} [lastSeenAt] First-visit-only fallback; the stored row wins.
 * @property {AbortSignal} [signal]
 */

function authHeaders() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function abortError() {
  const err = new Error("Copilot request cancelled");
  err.name = "AbortError";
  err.code = COPILOT_ABORT_CODE;
  err.aborted = true;
  return err;
}

function timeoutError() {
  const err = new Error("The copilot took too long to respond. Try again.");
  err.name = "TimeoutError";
  err.code = COPILOT_TIMEOUT_CODE;
  return err;
}

/**
 * A cancelled (caller-aborted) request must never render as an error, so every
 * consumer branches on this instead of on the shape of a thrown Error.
 * @param {unknown} err
 */
export function isCopilotAbort(err) {
  const candidate = /** @type {{ aborted?: boolean, code?: string, name?: string } | null} */ (err);
  return Boolean(candidate) && (candidate.aborted === true || candidate.code === COPILOT_ABORT_CODE || candidate.name === "AbortError");
}

/**
 * @param {string} path
 * @param {unknown} payload
 * @param {AbortSignal} [signal]
 */
async function request(path, payload, signal) {
  if (signal?.aborted) throw abortError();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, COPILOT_CLIENT_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener?.("abort", forwardAbort);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
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
  } catch (err) {
    if (err?.name === "AbortError" || err?.code === COPILOT_ABORT_CODE) {
      // Distinguish "the caller abandoned this request" from "the client
      // deadline fired": only the latter is a failure the agent can retry.
      if (signal?.aborted) throw abortError();
      if (timedOut) throw timeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.("abort", forwardAbort);
  }
}

/**
 * mode='deterministic' — fast, no model. Returns the context stamp + insights.
 * @param {CopilotCallOptions} options
 */
export function copilotDeterministic({ pageKey, scope, since = "last_visit", lastSeenAt, signal }) {
  return request("/assistant/management/turn", { mode: "deterministic", page: { key: pageKey, scope, since, lastSeenAt } }, signal);
}

/**
 * mode='briefing' — model claims appended to the deterministic phase.
 * @param {CopilotCallOptions} options
 */
export function copilotInsights({ pageKey, scope, since = "last_visit", lastSeenAt, signal }) {
  return request("/assistant/management/turn", { mode: "insights", page: { key: pageKey, scope, since, lastSeenAt } }, signal);
}

/**
 * mode='ask' — bounded tool loop answering a follow-up.
 * @param {CopilotCallOptions & { messages: Array<{ role: string, content: string }>, priorClaims?: unknown[] }} options
 */
export function copilotAsk({ pageKey, scope, since = "last_visit", lastSeenAt, messages, priorClaims, signal }) {
  return request(
    "/assistant/management/turn",
    { mode: "ask", page: { key: pageKey, scope, since, lastSeenAt }, messages, priorClaims },
    signal
  );
}

/**
 * The acknowledgement that a grounded briefing was actually presented. No
 * client timestamp: the server stamps it, and repeated calls only move the
 * window forward. Deliberately the only write in this feature.
 * @param {{ pageKey: string, scope: Record<string, unknown>, signal?: AbortSignal }} options
 */
export function copilotSeen({ pageKey, scope, signal }) {
  return request("/assistant/management/seen", { page: { key: pageKey, scope } }, signal);
}
