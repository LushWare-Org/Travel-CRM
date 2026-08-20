const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:3004';
const INTERNAL_EVENTS_TOKEN = process.env.INTERNAL_EVENTS_TOKEN || '';

/**
 * Hand a mapped Facebook Lead Ads submission to lead-service, which owns
 * lead creation/dedup/assignment. notification-service must not write to
 * lead-service's tables directly.
 */
export async function submitFacebookLead({ leadgenId, name, email, phone, message, fetchImpl = fetch }) {
  const res = await fetchImpl(`${LEAD_SERVICE_URL}/api/v1/leads/internal/facebook-lead`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': INTERNAL_EVENTS_TOKEN,
    },
    body: JSON.stringify({ leadgenId, name, email, phone, message }),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit Facebook lead to lead-service (status ${res.status})`);
  }
  return res.json();
}
