// ─── Deterministic scoring ────────────────────────────────────────────────
// Pure arithmetic over already-loaded data. No I/O, no model, no clock beyond an
// injected `now`, so the same inputs always produce byte-identical output and a
// fixture can pin the order.
//
// THE ONE STRUCTURAL RULE: severity is the PRIMARY sort key. `rankScore` orders
// *within* a band. This is not a preference. The actionability multiplier is
// applied after the weighted sum, so a critical observation scores ~0.254 while
// an info item with an action scores ~0.410 — meaning that if score were the
// primary key, an `info` could outrank a `critical`, and the stated guarantee
// ("a critical is never out-ranked by an info") would be arithmetically
// impossible to satisfy. Banding makes it true by construction.

export const RANKING_VERSION = 'insight-ranking.v1';

export const SEVERITY_BANDS = Object.freeze({ critical: 0, warning: 1, info: 2 });
export const SEVERITY_VALUES = Object.freeze({ critical: 1.0, warning: 0.6, info: 0.25 });
export const DEFAULT_MATERIALITY = 0.3;

export const DEFAULT_WEIGHTS = Object.freeze({
  severity: 0.3,
  urgency: 0.25,
  materiality: 0.2,
  novelty: 0.1,
  confidence: 0.1,
});

export const DEFAULT_STALE_PENALTY = 0.05;
export const MAX_STALE_PENALTY = 0.2;

/** Unknown severities fall to the lowest band rather than passing as critical. */
export function bandOf(severity) {
  return SEVERITY_BANDS[severity] ?? SEVERITY_BANDS.info;
}

export function severityValue(severity) {
  return SEVERITY_VALUES[severity] ?? SEVERITY_VALUES.info;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Urgency from a deadline. A breached deadline is the most urgent thing there is
 * (1.0), and "no date" is the least (0.1) rather than zero, so an undated item
 * still competes instead of being silently eliminated.
 */
export function urgencyFromDeadline(deadline, now = new Date()) {
  if (!deadline) return 0.1;
  const at = deadline instanceof Date ? deadline.getTime() : Date.parse(deadline);
  if (!Number.isFinite(at)) return 0.1;
  const msUntil = at - now.getTime();
  if (msUntil <= 0) return 1.0;
  if (msUntil <= HOUR_MS * 24) return 1.0;
  if (msUntil <= DAY_MS * 3) return 0.8;
  if (msUntil <= DAY_MS * 7) return 0.5;
  if (msUntil <= DAY_MS * 30) return 0.25;
  return 0.1;
}

/**
 * Urgency from a rule's own fact, when it carries a date. Kept separate from the
 * deadline helper so a caller can pass an explicit deadline when it knows one.
 */
export function urgencyFromFact(fact, now = new Date()) {
  if (!fact || fact.kind !== 'date') return 0.1;
  return urgencyFromDeadline(fact.value, now);
}

/**
 * Page-relative magnitude, as the fraction of peers at or below this value. This
 * is the only term that cannot be declared locally: whether 400 EUR is a lot
 * depends entirely on the page it sits on. Returns null when it cannot be
 * computed, and the caller substitutes DEFAULT_MATERIALITY, so "undeclared"
 * never silently outranks a declared value.
 */
export function percentileMateriality(value, peers) {
  const numbers = (peers ?? []).filter((n) => Number.isFinite(n));
  if (!Number.isFinite(value) || numbers.length === 0) return null;
  const atOrBelow = numbers.filter((n) => n <= value).length;
  return Math.min(1, Math.max(0, atOrBelow / numbers.length));
}

/**
 * Confidence in a claim, lowered when the page could not be read in full. A
 * partial read must not look as sure as a complete one.
 */
export function confidenceScore({ unavailableSourceCount = 0 } = {}) {
  const count = Number.isFinite(unavailableSourceCount) ? Math.max(0, unavailableSourceCount) : 0;
  if (count === 0) return 1.0;
  return Math.max(0.5, 1 - count * 0.25);
}

/** 1.0 when the insight carries a usable action, 0.40 when it is an observation. */
export function actionabilityMultiplier(action) {
  return action ? 1.0 : 0.4;
}

/**
 * The score, with its components returned alongside so the response can explain
 * why an item is where it is. `staleSurfacings` counts how many times this
 * insight has been shown without being acknowledged; the penalty makes a
 * chronically ignored item sink rather than shout forever.
 */
export function scoreInsight(
  {
    severity,
    urgency = 0.1,
    materiality = null,
    novelty = 1.0,
    confidence = 1.0,
    action = null,
    staleSurfacings = 0,
  } = {},
  { weights = DEFAULT_WEIGHTS, stalePenalty = DEFAULT_STALE_PENALTY } = {},
) {
  const S = severityValue(severity);
  const U = clamp01(urgency);
  const M = materiality === null || materiality === undefined ? DEFAULT_MATERIALITY : clamp01(materiality);
  const N = clamp01(novelty);
  const C = clamp01(confidence);
  const A = actionabilityMultiplier(action);

  const weighted = weights.severity * S + weights.urgency * U + weights.materiality * M + weights.novelty * N + weights.confidence * C;
  const penalty = Math.min(MAX_STALE_PENALTY, Math.max(0, staleSurfacings) * stalePenalty);

  return {
    score: round3(weighted * A - penalty),
    components: { severity: S, urgency: U, materiality: M, novelty: N, confidence: C, actionability: A, penalty: round3(penalty) },
  };
}

/**
 * The total order: band first, then score, then the tie-breakers. Total means two
 * processes ranking the same candidates agree, which is what makes the output
 * reproducible across deploys.
 */
export function compareForRanking(left, right) {
  const bandDiff = bandOf(left.severity) - bandOf(right.severity);
  if (bandDiff !== 0) return bandDiff;

  const scoreDiff = (right.score ?? 0) - (left.score ?? 0);
  if (scoreDiff !== 0) return scoreDiff;

  const urgencyDiff = (right.urgency ?? 0) - (left.urgency ?? 0);
  if (urgencyDiff !== 0) return urgencyDiff;

  const materialityDiff = (right.materiality ?? 0) - (left.materiality ?? 0);
  if (materialityDiff !== 0) return materialityDiff;

  return String(left.key ?? '').localeCompare(String(right.key ?? ''));
}

/** Band-primary ordering. Stable by construction because the comparison is total. */
export function orderForRanking(items) {
  return [...items].sort(compareForRanking);
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
