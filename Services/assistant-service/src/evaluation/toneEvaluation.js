import {
  HARD_RULES,
  LIMITS,
  SOFT_SIGNALS,
  TONE_VERSION,
  sentenceCount,
  wordCount,
} from './toneRules.v1.js';

// ─── Tone judge ───────────────────────────────────────────────────────────
// Deterministic, offline, no model call. Mirrors the shape of
// `managementBriefingEvaluation.js`: a pure judge plus a summarizer, so a
// fixture set can be asserted in `npm test` without quota.
//
// Judge PROSE only. Suggestion questions, action rows, evidence chips and score
// breakdowns are structured output and are supposed to be machine-shaped; the
// `structured` field is accepted and ignored on purpose, so a caller passing it
// cannot accidentally have it judged.

/**
 * @param {{ prose: string, structured?: unknown }} turn
 * @returns {{ passed: boolean, failures: Array<{id:string, why:string, excerpt:string}>, signals: Array<{id:string, why:string}> }}
 */
export function judgeTone({ prose, structured = null } = {}) {
  void structured;

  const text = typeof prose === 'string' ? prose.trim() : '';
  const failures = [];
  const signals = [];

  if (text === '') {
    return {
      passed: false,
      failures: [{ id: 'empty-prose', why: 'Prose is empty.', excerpt: '' }],
      signals,
    };
  }

  for (const rule of HARD_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      failures.push({ id: rule.id, why: rule.why, excerpt: match[0].slice(0, 80) });
    }
  }

  const words = wordCount(text);
  if (words > LIMITS.maxWords) {
    failures.push({
      id: 'too-long',
      why: `Prose is ${words} words; the limit is ${LIMITS.maxWords}. A panel bubble is not a document.`,
      excerpt: text.slice(0, 80),
    });
  }

  const sentences = sentenceCount(text);
  if (sentences > LIMITS.maxSentences) {
    failures.push({
      id: 'too-many-sentences',
      why: `${sentences} sentences; the limit is ${LIMITS.maxSentences}. One idea per sentence, and stop.`,
      excerpt: text.slice(0, 80),
    });
  }

  if (text.length > LIMITS.maxChars) {
    failures.push({
      id: 'too-many-chars',
      why: `${text.length} characters; the limit is ${LIMITS.maxChars}.`,
      excerpt: text.slice(0, 80),
    });
  }

  for (const signal of SOFT_SIGNALS) {
    const matched = signal.pattern.test(text);
    const present = signal.negative ? !matched : matched;
    if (!present) signals.push({ id: signal.id, why: signal.why });
  }

  return { passed: failures.length === 0, failures, signals };
}

/**
 * Aggregate a fixture run: how many turns are clean, which rules fired most, and
 * the raw pass rate. Shape matches `summarizeBriefingEvaluation` so both read
 * the same way in a report.
 */
export function summarizeToneEvaluation(results) {
  const total = results.length;
  const failed = results.filter((r) => !r.judged.passed).length;
  const byRule = new Map();
  const bySignal = new Map();

  for (const result of results) {
    for (const failure of result.judged.failures) {
      byRule.set(failure.id, (byRule.get(failure.id) || 0) + 1);
    }
    for (const signal of result.judged.signals) {
      bySignal.set(signal.id, (bySignal.get(signal.id) || 0) + 1);
    }
  }

  return {
    version: TONE_VERSION,
    total,
    passed: total - failed,
    failed,
    passRate: total === 0 ? 0 : Number(((total - failed) / total).toFixed(3)),
    failuresByRule: [...byRule.entries()].sort((a, b) => b[1] - a[1]),
    weakSignals: [...bySignal.entries()].sort((a, b) => b[1] - a[1]),
  };
}
