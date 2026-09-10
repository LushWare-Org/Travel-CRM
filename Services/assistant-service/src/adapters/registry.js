// ─── Page adapter registry ────────────────────────────────────────────────
// Maps a Management page key to its adapter. Every adapter implements the
// same deep interface:
//
//   key           — the ManagementPageKey it owns
//   parseScope    — (input: unknown) => S  — strict per-key validation;
//                   throws AppError(400) on unknown filters/IDs/record kinds
//   loadEvidence  — (ctx, scope) => Promise<EvidenceBundle> — partial allowed;
//                   fetches under the caller's forwarded x-user-* identity.
//                   The bundle is { context, record, evidence, ... }:
//                   `record` holds the page's own fetched object (the only
//                   place to read domain values); `evidence` holds one
//                   citation-only item per allowlisted field — a scalar
//                   `value`, `fieldPaths: [field]`, `recordRef`, and an ID
//                   from that page's shared evidence-ID producer (e.g.
//                   leadEvidenceId). Never read domain values out of
//                   `evidence`, and never dereference an evidence `value` as
//                   an object.
//   computeInsights — (bundle, since) => DeterministicInsight[]; `since` is
//                   the resolved Date boundary, so a `changed` insight means
//                   "changed since the operator last acknowledged this
//                   scope", never "changed recently"
//   defaultQuestions — (bundle) => string[]
//
// loadEvidence must propagate a downstream service's 403/404 verbatim into
// `notAuthorizedSources` — never pre-check ownership itself, because the
// ownership model has carve-outs (e.g. the unclaimed PENDING_VERIFICATION
// lead queue is openable by any salesRep).

import AppError from '../utils/appError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { leadsAdapter } from './leads.adapter.js';
import { billingAdapter } from './pages/billing.adapter.js';

const adapters = new Map();

function register(adapter) {
  if (adapters.has(adapter.key)) throw new Error(`Duplicate page adapter: ${adapter.key}`);
  adapters.set(adapter.key, adapter);
}

register(leadsAdapter);
register(billingAdapter);

export function getAdapter(key) {
  const adapter = adapters.get(key);
  if (!adapter) throw new AppError(`No adapter registered for page key '${key}'`, BAD_REQUEST);
  return adapter;
}

export function registeredKeys() {
  return [...adapters.keys()];
}
