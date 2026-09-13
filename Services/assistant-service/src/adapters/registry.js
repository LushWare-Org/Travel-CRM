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
//                   What the model may ASK does not belong here: the vocabulary
//                   is the actor's, resolved from `ManagementToolAccess` in
//                   insights/catalogue.js, so a page cannot widen or narrow a
//                   question.
//
// loadEvidence must propagate a downstream service's 403/404 verbatim into
// `notAuthorizedSources` — never pre-check ownership itself, because the
// ownership model has carve-outs (e.g. the unclaimed PENDING_VERIFICATION
// lead queue is openable by any salesRep).

import AppError from '../utils/appError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { leadsPageAdapter } from './pages/leads.adapter.js';
import { billingAdapter } from './pages/billing.adapter.js';
import { overviewAdapter } from './pages/overview.adapter.js';
import { analyticsAdapter } from './pages/analytics.adapter.js';
import { packagesAdapter } from './pages/packages.adapter.js';
import { flightsAdapter } from './pages/flights.adapter.js';
import { hotelsAdapter } from './pages/hotels.adapter.js';
import { usersAdapter } from './pages/users.adapter.js';
import { careerAdapter } from './pages/career.adapter.js';
import { settingsAdapter } from './pages/settings.adapter.js';

const adapters = new Map();

function register(adapter) {
  if (adapters.has(adapter.key)) throw new Error(`Duplicate page adapter: ${adapter.key}`);
  adapters.set(adapter.key, adapter);
}

// One adapter per page key — all ten Management page keys are registered here,
// so `MANAGEMENT_COPILOT_PAGE_KEYS` is the only thing that decides which of them
// actually serves a request.
register(leadsPageAdapter);
register(billingAdapter);
register(overviewAdapter);
register(analyticsAdapter);
register(packagesAdapter);
register(flightsAdapter);
register(hotelsAdapter);
register(usersAdapter);
register(careerAdapter);
register(settingsAdapter);

export function getAdapter(key) {
  const adapter = adapters.get(key);
  if (!adapter) throw new AppError(`No adapter registered for page key '${key}'`, BAD_REQUEST);
  return adapter;
}

export function registeredKeys() {
  return [...adapters.keys()];
}
