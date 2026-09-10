// ─── Page adapter registry ────────────────────────────────────────────────
// Maps a Management page key to its adapter. Every adapter implements the
// same deep interface:
//
//   key           — the ManagementPageKey it owns
//   parseScope    — (input: unknown) => S  — strict per-key validation;
//                   throws AppError(400) on unknown filters/IDs/record kinds
//   loadEvidence  — (ctx, scope) => Promise<EvidenceBundle> — partial allowed;
//                   fetches under the caller's forwarded x-user-* identity
//   computeInsights — (bundle, since) => DeterministicInsight[]
//   defaultQuestions — (bundle) => string[]
//
// loadEvidence must propagate a downstream service's 403/404 verbatim into
// `notAuthorizedSources` — never pre-check ownership itself, because the
// ownership model has carve-outs (e.g. the unclaimed PENDING_VERIFICATION
// lead queue is openable by any salesRep).

import AppError from '../utils/appError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { leadsAdapter } from './leads.adapter.js';

const adapters = new Map();

function register(adapter) {
  if (adapters.has(adapter.key)) throw new Error(`Duplicate page adapter: ${adapter.key}`);
  adapters.set(adapter.key, adapter);
}

register(leadsAdapter);

export function getAdapter(key) {
  const adapter = adapters.get(key);
  if (!adapter) throw new AppError(`No adapter registered for page key '${key}'`, BAD_REQUEST);
  return adapter;
}

export function registeredKeys() {
  return [...adapters.keys()];
}
