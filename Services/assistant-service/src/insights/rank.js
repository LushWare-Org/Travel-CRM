import {
  DEFAULT_WEIGHTS,
  actionabilityMultiplier,
  bandOf,
  compareForRanking,
  confidenceScore,
  orderForRanking,
  percentileMateriality,
  scoreInsight,
  urgencyFromFact,
} from './score.js';
import { RANKING_VERSION } from './score.js';

// ─── Selection ────────────────────────────────────────────────────────────
// Ranking alone answers "what scores highest". Selection answers "what does the
// operator see", which is a different question: the top five most overdue
// invoices is a technically correct and operationally useless answer.
//
// Applied in order:
//   1. severity floor    — nothing below the page's floor is eligible
//   2. diversity caps    — at most 2 per rule, at most 2 per entity,
//                          and try for 2 distinct sections
//   3. budget            — N items, with a critical band that is NOT budgeted
//   4. critical ceiling  — a reporting bound, so a burst of criticals cannot
//                          produce an unbounded panel but is never silent either

export const DEFAULT_N = 3;
export const CRITICAL_CEILING = 10;
export const DIVERSITY = Object.freeze({ perRuleId: 2, perEntityRef: 2, minSections: 2 });

/**
 * Score and order a gated set, then cut it to what an operator should see.
 *
 * @param {object} args
 * @param {Array} args.insights              accepted insights from the gate
 * @param {number} [args.n]                  budget for non-critical bands
 * @param {'warning'|'info'|null} [args.floor]  severity floor; null means no floor
 * @param {number} [args.criticalCeiling]
 * @param {Map<string, object>} [args.priorState]
 * @param {number} [args.unavailableSourceCount]
 * @param {Date} [args.now]
 * @returns {{ ranked: Array, rankedOut: Array, suppressedCriticals: Array, counts: object, rankingVersion: string }}
 */
export function selectRanked({
  insights = [],
  n = DEFAULT_N,
  floor = 'warning',
  criticalCeiling = CRITICAL_CEILING,
  diversity = DIVERSITY,
  weights = DEFAULT_WEIGHTS,
  priorState = new Map(),
  unavailableSourceCount = 0,
  now = new Date(),
} = {}) {
  const scored = insights.map((insight) => enrich(insight, { weights, priorState, unavailableSourceCount, now }));

  const criticals = scored.filter((item) => item.severity === 'critical');
  const rest = scored.filter((item) => item.severity !== 'critical');

  // ── 1. severity floor ───────────────────────────────────────────────────
  // The floor is CONDITIONAL, which the first version of this got wrong: `info`
  // is excluded only while something above it exists. A page whose rules are all
  // informational is quiet, not empty, and suppressing its only findings would
  // show an operator nothing at all.
  //
  // The critical band above is never subject to it.
  const floorBand = floor === null ? null : bandOf(floor);
  const hasAboveFloor = floorBand !== null && rest.some((item) => bandOf(item.severity) <= floorBand);
  const eligible = floorBand === null || !hasAboveFloor ? rest : rest.filter((item) => bandOf(item.severity) <= floorBand);
  // Excluded items go to `rankedOut`, not to nowhere: an item that leaves both
  // lists disappears from the response and its fate becomes unanswerable.
  const floorExcluded = floorBand === null || !hasAboveFloor ? [] : rest.filter((item) => bandOf(item.severity) > floorBand);

  // ── 2 and 3. diversity caps, then the budget ────────────────────────────
  const ordered = orderForRanking(eligible);
  const picked = [];
  const skipped = [];
  const perRule = new Map();
  const perEntity = new Map();

  for (const item of ordered) {
    if (picked.length >= n) {
      skipped.push(item);
      continue;
    }
    const ruleCount = perRule.get(item.ruleId) ?? 0;
    const entityId = item.entityRef?.id ?? '';
    const entityCount = perEntity.get(entityId) ?? 0;

    if (ruleCount >= diversity.perRuleId || entityCount >= diversity.perEntityRef) {
      skipped.push(item);
      continue;
    }

    picked.push(item);
    perRule.set(item.ruleId, ruleCount + 1);
    perEntity.set(entityId, entityCount + 1);
  }

  // ── section spread ──────────────────────────────────────────────────────
  // A panel of three items from one section tells the operator one thing three
  // times. If a qualifying candidate exists in another section, promote it over
  // the weakest selection, but only when that actually adds a section.
  const withSpread = applySectionSpread(picked, skipped, diversity.minSections);

  // ── 4. the critical band, bounded for reporting rather than ranking ─────
  const orderedCriticals = orderForRanking(criticals);
  const shownCriticals = orderedCriticals.slice(0, criticalCeiling);
  const suppressedCriticals = orderedCriticals.slice(criticalCeiling).map((item) => ({
    key: item.key,
    severity: item.severity,
    text: item.text,
    score: item.score,
  }));

  const ranked = [...shownCriticals, ...withSpread.picked];
  const rankedOut = [...skipped, ...withSpread.returned, ...floorExcluded];

  return {
    ranked,
    rankedOut,
    suppressedCriticals,
    counts: {
      candidates: insights.length,
      ranked: ranked.length,
      criticals: shownCriticals.length,
      suppressedCriticals: suppressedCriticals.length,
      rankedOut: rankedOut.length,
      sections: new Set(ranked.map((item) => item.section)).size,
    },
    rankingVersion: RANKING_VERSION,
  };
}

/**
 * Score one insight and attach the components that put it where it is. The
 * components ride the response, so "why is this first?" is answerable from the
 * payload instead of from a developer's memory.
 */
export function enrich(insight, { weights = DEFAULT_WEIGHTS, priorState = new Map(), unavailableSourceCount = 0, now = new Date() } = {}) {
  const urgency = Number.isFinite(insight.urgency) ? insight.urgency : urgencyFromFact(insight.fact, now);
  const materiality = Number.isFinite(insight.materiality)
    ? insight.materiality
    : percentileMateriality(insight.materialityValue, insight.peers);

  const state = priorState.get(insight.key);
  const novelty = insight.novelty ?? noveltyFromState(state, insight);

  const confidence = Number.isFinite(insight.confidence)
    ? insight.confidence
    : confidenceScore({ unavailableSourceCount });

  const { score, components } = scoreInsight(
    {
      severity: insight.severity,
      urgency,
      materiality,
      novelty,
      confidence,
      action: insight.action,
      staleSurfacings: state?.surfacedCount ?? 0,
    },
    { weights },
  );

  return {
    ...insight,
    score,
    components,
    urgency,
    materiality: materiality === null ? undefined : materiality,
    novelty,
    confidence,
    actionability: actionabilityMultiplier(insight.action),
  };
}

/** Never surfaced is fully novel; changed since acknowledgement is half; else nothing. */
export function noveltyFromState(state, insight) {
  if (!state) return 1.0;
  if (state.lastMaterialValue !== undefined && insight.materialValue !== undefined) {
    return String(state.lastMaterialValue) === String(insight.materialValue) ? 0.0 : 0.5;
  }
  return state.acknowledgedAt || state.lastSurfacedAt ? 0.0 : 1.0;
}

/**
 * Ensure the selection spans at least `minSections` sections when candidates
 * exist for that many. Implemented as a single swap so the change is explainable:
 * the weakest selected item gives way to the strongest candidate from a section
 * that is otherwise unrepresented.
 */
function applySectionSpread(picked, skipped, minSections) {
  const selected = [...picked];
  const spare = [...skipped];
  const returned = [];

  if (selected.length < 2) return { picked: selected, returned };

  while (new Set(selected.map((item) => item.section)).size < minSections) {
    const present = new Set(selected.map((item) => item.section));
    const replacementIndex = spare.findIndex((item) => !present.has(item.section));
    if (replacementIndex === -1) break;

    // The weakest selection: last in band order, which is also the lowest score.
    const weakestIndex = selected.length - 1;
    const weakest = selected[weakestIndex];
    const replacement = spare[replacementIndex];

    if (bandOf(replacement.severity) > bandOf(weakest.severity)) break;

    selected[weakestIndex] = replacement;
    spare.splice(replacementIndex, 1);
    returned.push(weakest);

    // Re-sort so the swap cannot leave the list out of band order.
    selected.sort(compareForRanking);
  }

  return { picked: selected, returned };
}
