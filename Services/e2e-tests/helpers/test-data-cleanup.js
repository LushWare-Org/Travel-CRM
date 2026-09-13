import { apiClient } from './api-client.js';

// How to remove each resource type this suite creates, via the Gateway,
// using an admin token (every one of these routes is admin-only). Leads and
// quotations have real DELETE endpoints. Invoices and payment receipts do
// NOT — billing-service only exposes a "cancel" transition for them (by
// design, for audit-trail reasons), so cleanup here cancels rather than
// removes; the cancelled rows remain in the shared DB after a run. This is a
// real limitation of the underlying API, not an oversight in this suite —
// see README.md.
const CLEANUP_ACTIONS = {
  lead: (id) => apiClient.delete(`/leads/${id}`, { role: 'admin' }),
  quotation: (id) => apiClient.delete(`/billing/quotations/${id}`, { role: 'admin' }),
  invoice: (id) => apiClient.put(`/billing/invoices/${id}/cancel`, { role: 'admin' }),
  receipt: (id) => apiClient.put(`/billing/receipts/${id}/cancel`, { role: 'admin' }),
  'career-application': (id) => apiClient.delete(`/careers/submissions/${id}`, { role: 'admin' }),
};

const created = [];

export function trackForCleanup(type, id) {
  if (!CLEANUP_ACTIONS[type]) {
    throw new Error(`test-data-cleanup: unknown resource type "${type}" — add a CLEANUP_ACTIONS entry for it`);
  }
  created.push({ type, id });
}

export async function cleanupAll() {
  const results = [];
  // Reverse-creation order: later records (e.g. a receipt) reference earlier
  // ones (e.g. its invoice), so undo child-first.
  for (const { type, id } of [...created].reverse()) {
    try {
      const res = await CLEANUP_ACTIONS[type](id);
      if (!res.ok && res.status !== 404) {
        console.warn(`[e2e cleanup] ${type} ${id}: unexpected ${res.status}`, res.body);
      }
      results.push({ type, id, status: res.status });
    } catch (err) {
      // Idempotent-best-effort: log and continue so one failure doesn't
      // orphan the rest of the cleanup queue.
      console.warn(`[e2e cleanup] ${type} ${id} failed:`, err.message);
      results.push({ type, id, error: err.message });
    }
  }
  created.length = 0;
  return results;
}
