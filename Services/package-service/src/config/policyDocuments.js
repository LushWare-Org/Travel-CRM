// Fetches the admin-editable policy documents (refund policy, etc.) from
// user-service for the trip-planning wizard's answer_policy_question tool —
// same internal-token convention as orgSettings.js's getOrgSettings.
//
// Deliberately NOT cached (unlike getOrgSettings above): a caching layer for
// this exact read was proposed during eng review and explicitly declined as
// premature at current doc count/traffic — revisit only if real latency data
// justifies it (see docs/designs/ai-trip-planning-assistant.md's Eng Review
// Addendum, [P3]).

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';
const FETCH_TIMEOUT_MS = 3_000;

/**
 * All policy documents, or [] if user-service can't be reached — a fetch
 * failure degrades the wizard to its fixed "I don't have a confirmed
 * answer" fallback rather than ever blocking the turn or guessing.
 */
export async function fetchPolicyDocuments({ fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl(`${USER_SERVICE_URL}/api/v1/admin/internal/policy-documents`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_KEY },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.data?.documents) ? body.data.documents : [];
  } catch {
    return [];
  }
}
