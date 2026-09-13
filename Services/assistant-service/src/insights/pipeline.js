import { gateInsights, summarizeDecisions } from './gate.js';
import { selectRanked } from './rank.js';
import { stableKey } from './keys.js';

// ─── The insight pipeline ─────────────────────────────────────────────────
// One entry point between "an adapter produced insights" and "the response
// carries a ranked briefing". Everything an operator sees passes through here,
// which is why identity lives here rather than in the engine:
//
//   adapter insights  → withIdentity (ruleId + stable key)
//                     → gateInsights (L0-L8, one decision each)
//                     → selectRanked (band order, diversity, budget)
//                     → { ranked, rankedOut, suppressedCriticals, counts,
//                         decisions, summary }
//
// The hand-written adapters never go through the rules engine's `runRules`, and
// the engine's own output is not the only source of insights, so putting
// identity in either of those places would have left half the surface without a
// key — and a missing key is a dropped insight, not an unranked one.

/**
 * Rule id from an insight's own id, used only when nothing more authoritative is
 * available. Handles both shapes: `lead-status` from a hand-written adapter and
 * the engine's legacy `<declarationIndex>:<ruleId>[:<recordId>]`.
 */
export function ruleIdFromInsightId(id) {
  const parts = String(id ?? '').split(':');
  if (parts.length > 1 && /^\d+$/.test(parts[0])) parts.shift();
  return parts[0] || null;
}

/**
 * Attach `ruleId` and the stable `key`.
 *
 * `entityRef` is deliberately NOT invented when an insight lacks one. A made-up
 * ref would let an unmigrated adapter's insight be ranked as if it were about
 * something, when the honest answer is that nobody said what it is about. The
 * gate reports those as `invalid_shape`, which is a named drop rather than a
 * silent pass.
 */
export function withIdentity(insight) {
  if (!insight || typeof insight !== 'object') return insight;
  const ruleId = insight.ruleId ?? ruleIdFromInsightId(insight.id);
  return {
    ...insight,
    ruleId,
    key: insight.key ?? stableKey({ ruleId, entityRef: insight.entityRef }),
  };
}

/**
 * The whole pipeline for a page's deterministic insights.
 *
 * @param {object} args
 * @param {Array} args.insights              raw adapter output
 * @param {Set<string>} args.evidenceIds     ids present in the final bundle
 * @param {Set<string>} [args.unauthorizedEvidenceIds]
 * @param {Map<string, object>} [args.priorState]   per-key acknowledgement state
 * @param {number} [args.unavailableSourceCount]
 * @param {number} [args.n]                  budget for the non-critical bands
 * @param {Date} [args.now]
 */
export function buildRankedInsights({
  insights = [],
  evidenceIds = new Set(),
  unauthorizedEvidenceIds = new Set(),
  priorState = new Map(),
  unavailableSourceCount = 0,
  n,
  floor,
  diversity,
  weights,
  criticalCeiling,
  now = new Date(),
} = {}) {
  const identified = insights.map(withIdentity);

  const { accepted, decisions } = gateInsights({
    candidates: identified,
    origin: 'rule',
    resolvableEvidenceIds: evidenceIds,
    unauthorizedEvidenceIds,
    priorState,
    now,
  });

  const selection = selectRanked({
    insights: accepted,
    ...(n === undefined ? {} : { n }),
    ...(floor === undefined ? {} : { floor }),
    ...(diversity === undefined ? {} : { diversity }),
    ...(weights === undefined ? {} : { weights }),
    ...(criticalCeiling === undefined ? {} : { criticalCeiling }),
    priorState,
    unavailableSourceCount,
    now,
  });

  return {
    ...selection,
    decisions,
    summary: summarizeDecisions(decisions),
  };
}
