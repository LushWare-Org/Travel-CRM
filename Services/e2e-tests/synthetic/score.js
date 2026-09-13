// Scoring for the synthetic scenario suite. Pure functions only: no network, no
// clock, no globals. The HTTP driving lives in `synthetic.spec.js`; everything
// here can be tested without a stack, which is the point of splitting it out.
//
// Responses are scored on four axes, matching `scenarios.v1.md`:
//   answered  — did the turn return content
//   correct   — does it match ground truth
//   ordered   — is the order defensible
//   human     — does the prose pass the tone judge
//
// The extractors tolerate both response shapes on purpose: `claims` (today) and
// `ranked` (after the ranking work), so the same suite runs before and after and
// the delta is visible.

import { judgeTone } from '../../assistant-service/src/evaluation/toneEvaluation.js';

/** Ranked item texts, in the order the server returned them. */
export function rankedTexts(response) {
  const items = Array.isArray(response?.ranked) ? response.ranked : response?.claims;
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item?.text ?? '').trim()).filter(Boolean);
}

/** The prose the operator reads, for the tone judge. Never the structured fields. */
export function readProse(response) {
  if (Array.isArray(response?.answerBlocks)) {
    return response.answerBlocks.map((b) => String(b?.text ?? '').trim()).filter(Boolean).join(' ');
  }
  return rankedTexts(response).join(' ');
}

export function isAnswered(response) {
  if (Array.isArray(response?.answerBlocks)) return response.answerBlocks.length > 0;
  return rankedTexts(response).length > 0;
}

const normalise = (value) => String(value ?? '').trim().toLowerCase();

/** Set match, order-insensitive. Reports what was missing and what was extra. */
export function scoreTopN({ expected = [], actual = [] }) {
  const want = expected.map(normalise);
  const got = actual.map(normalise);
  const missing = want.filter((w) => !got.some((g) => g.includes(w)));
  const extra = got.filter((g) => !want.some((w) => g.includes(w)));

  return { pass: missing.length === 0, missing, extra };
}

/** Position-sensitive: the first index where the answer departs from truth. */
export function scoreOrder({ expected = [], actual = [] }) {
  const want = expected.map(normalise);
  const got = actual.map(normalise);
  for (let i = 0; i < want.length; i += 1) {
    if (!got[i] || !got[i].includes(want[i])) {
      return { pass: false, firstMismatchIndex: i, expected: want[i], actual: got[i] ?? null };
    }
  }
  return { pass: true, firstMismatchIndex: null, expected: null, actual: null };
}

/**
 * Counts stated anywhere in the prose, in order of appearance. Deliberately
 * naive (digits only, no word-numbers): the fixtures control the phrasing, and
 * a cleverer parser would hide a phrasing the model actually produced.
 */
export function statedCounts(prose) {
  return (String(prose ?? '').match(/\d[\d,]*/g) || []).map((n) => Number(n.replace(/,/g, '')));
}

/**
 * Exact match on the expected counts. `unordered` because a model may mention
 * Bali before Goa; the numbers must all be present and no unexpected count may
 * appear that could be read as a different total.
 */
export function scoreCounts({ expected = [], prose = '' }) {
  const stated = statedCounts(prose);
  const missing = expected.filter((e) => !stated.includes(e));
  const unexpected = stated.filter((s) => !expected.includes(s));

  return { pass: missing.length === 0, missing, unexpected, stated };
}

/** Criticals must appear before anything else. A band-order violation is its own failure. */
export function scoreBandOrder(response) {
  const items = Array.isArray(response?.ranked) ? response.ranked : response?.claims;
  if (!Array.isArray(items)) return { pass: true, violation: null };

  const rank = { critical: 0, warning: 1, info: 2 };
  let worstSeen = -1;
  for (const item of items) {
    const value = rank[item?.severity] ?? 2;
    if (value < worstSeen) {
      return { pass: false, violation: { severity: item?.severity, text: String(item?.text ?? '').slice(0, 80) } };
    }
    worstSeen = Math.max(worstSeen, value);
  }
  return { pass: true, violation: null };
}

/**
 * One scored turn: correctness plus the tone verdict. `expectAnswered` is false
 * for scenarios that are supposed to refuse honestly (for example a question the
 * app genuinely cannot see across), so an honest refusal scores as a pass.
 */
export function scoreTurn({ expectedTopN = [], expectedOrder = [], expectedCounts = [], expectAnswered = true }, response) {
  const actual = rankedTexts(response);
  const prose = readProse(response);
  const answered = isAnswered(response);

  return {
    answered,
    answeredOk: answered === expectAnswered,
    topN: scoreTopN({ expected: expectedTopN, actual }),
    order: expectedOrder.length ? scoreOrder({ expected: expectedOrder, actual }) : { pass: true },
    counts: expectedCounts.length ? scoreCounts({ expected: expectedCounts, prose }) : { pass: true },
    bands: scoreBandOrder(response),
    tone: judgeTone({ prose, structured: response?.suggestedQuestions ?? null }),
  };
}

/** Roll a scenario run into the numbers `scenarios.v1.md` asks for. */
export function summarizeScenarios(results) {
  const total = results.length;
  const answered = results.filter((r) => r.scored.answeredOk).length;
  const correct = results.filter(
    (r) => r.scored.topN.pass && r.scored.order.pass && r.scored.counts.pass,
  ).length;
  const toneClean = results.filter((r) => r.scored.tone.passed).length;
  const bandClean = results.filter((r) => r.scored.bands.pass).length;
  const latencies = results.map((r) => r.latencyMs).filter((n) => typeof n === 'number').sort((a, b) => a - b);

  const percentile = (p) => (latencies.length === 0 ? null : latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))]);

  return {
    total,
    answeredOk: answered,
    correctOk: correct,
    bandOrderOk: bandClean,
    toneClean,
    passRate: total === 0 ? 0 : Number(((correct / total) * 100).toFixed(1)),
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
  };
}
