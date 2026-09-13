import { pageEvidenceId } from '@travel-crm/contracts';

// ─── Aggregation ──────────────────────────────────────────────────────────
// Answers a counting or grouping question without a new endpoint and without a
// second fetch.
//
// Three decisions from the design are load-bearing here:
//
//   1. INTENT IS DETECTED DETERMINISTICALLY. A model call to decide "is this a
//      counting question" would spend part of a 17-second budget to answer a
//      question a regex answers exactly, and would make the behaviour
//      ungradeable. The patterns below are the whole classifier.
//
//   2. GROUPING HAPPENS OVER ROWS ALREADY IN MEMORY. The page has already
//      fetched them to build its briefing, so re-reading the same rows would
//      double the work on the slowest path (PERF-1A). The rows are the same rows
//      the panel is describing, which also means the count and the panel cannot
//      disagree.
//
//   3. A TRUNCATED READ IS LABELLED, NEVER PRESENTED AS COMPLETE. "12 leads want
//      Bali" is only true if all the leads were seen. When the read was capped,
//      the caller learns `truncated: true` and can say so.

export const MIN_GROUP_SIZE = 3;
export const DEFAULT_AGGREGATE_LIMIT = 10;

// Deterministic question shapes. Deliberately generous: a false positive costs
// one wasted grouping over rows already in memory, while a false negative sends
// a counting question down the path that cannot answer it.
const AGGREGATE_PATTERNS = [
  /\bhow many\b/i,
  /\bcount of\b/i,
  /\bhow much\b/i,
  /\bmost\b/i,
  /\bleast\b/i,
  /\btop\s+\d+/i,
  /\bhighest\b/i,
  /\blargest\b/i,
  /\bbiggest\b/i,
  /\bbreakdown\b/i,
  /\bbroken down by\b/i,
  /\bgrouped by\b/i,
  /\bcluster(ing)?\b/i,
  /\bdistribution\b/i,
  // "rank packages by conversion" puts words between rank and by, so matching the
  // fixed phrase missed it. Ranking is ranking whatever sits in the middle.
  /\brank(ed|ing)?\b/i,
  /\bby (destination|source|status|customer|owner|rep|platform|city|country|category)\b/i,
];

// Fields a page can group by, in the names an operator would actually use. The
// hint only guides which field to prefer when several are available; the caller
// validates it against the page's own declaration before grouping.
const GROUPABLE_HINTS = [
  ['destination', 'destination'],
  ['source', 'source'],
  ['platform', 'platform'],
  ['status', 'lifecycleStatus'],
  ['lifecycle', 'lifecycleStatus'],
  ['owner', 'assignedToId'],
  ['rep', 'assignedToId'],
  ['assigned', 'assignedToId'],
  ['customer', 'customerName'],
  ['payment', 'paymentStatus'],
  ['city', 'city'],
  ['country', 'country'],
  ['category', 'category'],
];

/** Does this question ask for a count, a ranking or a grouping? */
export function detectAggregateIntent(question) {
  const text = String(question ?? '');
  const wantsAggregate = AGGREGATE_PATTERNS.some((pattern) => pattern.test(text));
  if (!wantsAggregate) return { wantsAggregate: false, groupByHint: null, limit: null };
  return { wantsAggregate: true, groupByHint: groupByHintFrom(text), limit: limitFrom(text) };
}

export function isAggregateQuestion(question) {
  return detectAggregateIntent(question).wantsAggregate;
}

/** The first groupable field the operator's own words point at. */
export function groupByHintFrom(question) {
  const text = String(question ?? '').toLowerCase();
  const hit = GROUPABLE_HINTS.find(([word]) => text.includes(word));
  return hit ? hit[1] : null;
}

/** "top 5", "5 most", "the 3 biggest" — otherwise the default page size. */
export function limitFrom(question, fallback = DEFAULT_AGGREGATE_LIMIT) {
  const text = String(question ?? '');
  const match = /\btop\s+(\d+)\b/i.exec(text) ?? /\b(\d+)\s+(?:most|biggest|largest|highest)\b/i.exec(text);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 1 ? Math.min(value, 1000) : fallback;
}

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

/**
 * Count records per distinct value of one field. Blank values are EXCLUDED, not
 * counted as a bucket of their own: the adversarial corpus has a lead with no
 * destination precisely because "unknown" is not a destination and must not
 * compete with real ones.
 *
 * Sorted by count descending, then key ascending, so the order is total and two
 * runs agree.
 */
export function groupCount(records = [], field) {
  const counts = new Map();
  for (const record of records) {
    const key = record?.[field];
    if (isBlank(key)) continue;
    const normalised = String(key).trim();
    counts.set(normalised, (counts.get(normalised) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/** Sum a numeric field per distinct value of another. Blank and non-numeric rows are skipped. */
export function groupSum(records = [], groupByField, sumField) {
  const totals = new Map();
  for (const record of records) {
    const key = record?.[groupByField];
    const amount = record?.[sumField];
    if (isBlank(key) || !Number.isFinite(amount)) continue;
    const normalised = String(key).trim();
    totals.set(normalised, (totals.get(normalised) ?? 0) + amount);
  }
  return [...totals.entries()]
    .map(([key, total]) => ({ key, count: total }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * Turn grouped rows into evidence the answer can cite.
 *
 * Each group becomes one item carrying `fieldPaths` and a scalar `value`, which
 * is what the substance judge requires of a citation-capable item — the same
 * shape the per-source baselines already use. Without `fieldPaths` a group claim
 * would fail that judge and be dropped, which is how a correct count disappears.
 */
export function buildGroupEvidence({
  groups = [],
  pageKey,
  source,
  groupBy,
  label = null,
  limit = DEFAULT_AGGREGATE_LIMIT,
  minGroupSize = MIN_GROUP_SIZE,
  asOf = new Date().toISOString(),
} = {}) {
  const eligible = groups.filter((group) => group.count >= minGroupSize);
  const suppressedGroups = groups.length - eligible.length;
  const selected = eligible.slice(0, limit);

  const evidence = selected.map((group) => {
    const id = pageEvidenceId(pageKey, 'aggregate', `${source}:${groupBy}:${group.key}`, 'value');
    const groupRef = { kind: 'group', id: `${source}:${groupBy}:${group.key}` };
    return {
      id,
      type: 'computed',
      label: label ? `${label}: ${group.key}` : `${groupBy} ${group.key}`,
      value: group.count,
      fieldPaths: ['count'],
      recordRef: groupRef,
      asOf,
    };
  });

  return { evidence, shown: selected.length, suppressedGroups, eligible: eligible.length };
}

/**
 * The whole precompute for a page whose rows are already loaded.
 *
 * `truncated` is passed in by the caller from the bundle's own record of the
 * upstream total. This module never assumes completeness: it can only report
 * what it was told.
 */
export function aggregateFromRecords({
  records = [],
  pageKey,
  source,
  groupBy,
  metric = 'count',
  sumField,
  question = '',
  minGroupSize = MIN_GROUP_SIZE,
  asOf = new Date().toISOString(),
  upstreamTotal = null,
}) {
  if (!Array.isArray(records) || records.length === 0 || !groupBy) {
    return { evidence: [], suppressedGroups: 0, groupCount: 0, rowsConsidered: 0, truncated: false, limit: null };
  }

  const groups = metric === 'sum' && sumField ? groupSum(records, groupBy, sumField) : groupCount(records, groupBy);
  const limit = limitFrom(question);
  const built = buildGroupEvidence({ groups, pageKey, source, groupBy, limit, minGroupSize, asOf });

  // A read is complete only when the caller can prove it: an unknown total is not
  // evidence of completeness, so it counts as truncated rather than passing.
  const truncated = !Number.isFinite(upstreamTotal) || upstreamTotal > records.length;

  return {
    evidence: built.evidence,
    suppressedGroups: built.suppressedGroups,
    groupCount: built.eligible,
    rowsConsidered: records.length,
    upstreamTotal: Number.isFinite(upstreamTotal) ? upstreamTotal : null,
    truncated,
    limit,
    groupBy,
    metric,
  };
}
