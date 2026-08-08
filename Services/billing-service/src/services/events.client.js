const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:3004';
const INTERNAL_EVENTS_TOKEN = process.env.INTERNAL_EVENTS_TOKEN || '';

/**
 * Emit a lifecycle event to lead-service. The lead service owns lifecycle
 * transitions; billing only reports document/payment facts.
 */
export async function emitLeadEvent({
  type,
  leadId,
  payload = {},
  id,
  occurredAt,
  fetchImpl = fetch,
}) {
  const eventId = id || `${type}-${leadId}-${Date.now()}`;
  const res = await fetchImpl(`${LEAD_SERVICE_URL}/api/v1/leads/internal/events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': INTERNAL_EVENTS_TOKEN,
    },
    body: JSON.stringify({
      event: { id: eventId, type, leadId, payload, occurredAt: occurredAt || new Date().toISOString() },
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to emit ${type} event to lead-service`);
  }
  return res.json();
}
