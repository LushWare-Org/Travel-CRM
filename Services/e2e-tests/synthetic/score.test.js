import { describe, it, expect } from 'vitest';
import {
  isAnswered,
  rankedTexts,
  readProse,
  scoreBandOrder,
  scoreCounts,
  scoreOrder,
  scoreTopN,
  scoreTurn,
  statedCounts,
  summarizeScenarios,
} from './score.js';

const claim = (text, severity = 'warning') => ({ id: text, text, severity, section: 'attention' });

describe('rankedTexts', () => {
  it('reads `ranked` when the ranked contract is present', () => {
    expect(rankedTexts({ ranked: [claim('Bali leads with 12')] })).toEqual(['Bali leads with 12']);
  });

  it('falls back to `claims` so the suite runs before the ranking work lands', () => {
    expect(rankedTexts({ claims: [claim('Lead has no owner.'), claim('Two invoices overdue.')] })).toEqual([
      'Lead has no owner.',
      'Two invoices overdue.',
    ]);
  });

  it('returns nothing for a malformed response rather than throwing', () => {
    expect(rankedTexts(null)).toEqual([]);
    expect(rankedTexts({ claims: 'nope' })).toEqual([]);
    expect(rankedTexts({ claims: [{ text: '   ' }] })).toEqual([]);
  });
});

describe('readProse and isAnswered', () => {
  it('joins answer blocks for an ask turn', () => {
    const response = { answerBlocks: [claim('Bali has 12 open leads.'), claim('Dubai has 8.')] };

    expect(readProse(response)).toBe('Bali has 12 open leads. Dubai has 8.');
    expect(isAnswered(response)).toBe(true);
  });

  it('treats an empty answer block list as not answered', () => {
    expect(isAnswered({ answerBlocks: [] })).toBe(false);
    expect(isAnswered({ claims: [] })).toBe(false);
  });
});

describe('scoreTopN', () => {
  it('passes when every expected item is present regardless of order', () => {
    const scored = scoreTopN({
      expected: ['no owner', 'overdue 60'],
      actual: ['Two invoices overdue 60 days', 'Lead has no owner'],
    });

    expect(scored.pass).toBe(true);
    expect(scored.missing).toEqual([]);
  });

  it('reports what is missing and what was extra', () => {
    const scored = scoreTopN({ expected: ['bali'], actual: ['Goa leads demand'] });

    expect(scored.pass).toBe(false);
    expect(scored.missing).toEqual(['bali']);
    expect(scored.extra).toEqual(['goa leads demand']);
  });

  it('matches case-insensitively without exact-string brittleness', () => {
    expect(scoreTopN({ expected: ['BALI'], actual: ['bali has 12'] }).pass).toBe(true);
  });
});

describe('scoreOrder', () => {
  it('passes on the exact order and reports the first departure otherwise', () => {
    expect(scoreOrder({ expected: ['a', 'b'], actual: ['a is here', 'b is here'] }).pass).toBe(true);

    const bad = scoreOrder({ expected: ['a', 'b'], actual: ['b is here', 'a is here'] });
    expect(bad.pass).toBe(false);
    expect(bad.firstMismatchIndex).toBe(0);
    expect(bad.expected).toBe('a');
  });

  it('fails when the actual list is shorter than the expected one', () => {
    const short = scoreOrder({ expected: ['a', 'b'], actual: ['a is here'] });

    expect(short.pass).toBe(false);
    expect(short.firstMismatchIndex).toBe(1);
    expect(short.actual).toBeNull();
  });
});

describe('statedCounts and scoreCounts', () => {
  it('parses plain, comma-grouped and symbol-prefixed numbers', () => {
    expect(statedCounts('12 leads want Bali, 1,500 outstanding, EUR 5,000 over 60 days')).toEqual([
      12, 1500, 5000, 60,
    ]);
  });

  it('passes when every expected count appears and reports unexpected ones', () => {
    const ok = scoreCounts({ expected: [12, 8], prose: 'Bali has 12, Dubai 8.' });
    expect(ok.pass).toBe(true);
    expect(ok.stated).toEqual([12, 8]);

    const bad = scoreCounts({ expected: [12], prose: 'Bali has 11.' });
    expect(bad.pass).toBe(false);
    expect(bad.missing).toEqual([12]);
    expect(bad.unexpected).toEqual([11]);
  });

  it('does not count a number that came from the question itself', () => {
    const scored = scoreCounts({ expected: [12], prose: 'The top 10 destinations show 12 leads for Bali.' });

    expect(scored.pass).toBe(true);
    expect(scored.unexpected).toEqual([10]);
  });
});

describe('scoreBandOrder', () => {
  it('passes when criticals lead and warnings follow', () => {
    const scored = scoreBandOrder({ ranked: [claim('urgent', 'critical'), claim('soon', 'warning'), claim('fyi', 'info')] });

    expect(scored.pass).toBe(true);
  });

  it('fails when an info item appears above a critical one', () => {
    const scored = scoreBandOrder({ ranked: [claim('fyi', 'info'), claim('urgent', 'critical')] });

    expect(scored.pass).toBe(false);
    expect(scored.violation.severity).toBe('critical');
  });

  it('treats an unknown severity as the lowest band rather than passing it silently', () => {
    expect(scoreBandOrder({ ranked: [claim('odd', 'weird'), claim('urgent', 'critical')] }).pass).toBe(false);
  });
});

describe('scoreTurn', () => {
  it('scores an honest refusal as correct when the question is expected to refuse', () => {
    const scored = scoreTurn({ expectAnswered: false }, { answerBlocks: [] });

    expect(scored.answeredOk).toBe(true);
    expect(scored.topN.pass).toBe(true);
    expect(scored.counts.pass).toBe(true);
  });

  it('scores a missing answer as a failure when an answer was expected', () => {
    const scored = scoreTurn({ expectAnswered: true }, { answerBlocks: [] });

    expect(scored.answeredOk).toBe(false);
  });

  it('wires the tone judge in, so a machine-shaped answer fails the turn', () => {
    const scored = scoreTurn(
      { expectedCounts: [12] },
      { answerBlocks: [claim('{"tool": "listLeads", "count": 12}')] },
    );

    expect(scored.counts.pass).toBe(true);
    expect(scored.tone.passed).toBe(false);
    expect(scored.tone.failures.map((f) => f.id)).toContain('raw-json');
  });

  it('skips order and count scoring when nothing is expected', () => {
    const scored = scoreTurn({}, { claims: [claim('Lead has no owner.')] });

    expect(scored.order.pass).toBe(true);
    expect(scored.counts.pass).toBe(true);
  });
});

describe('summarizeScenarios', () => {
  it('reports pass rate, band cleanliness and latency percentiles', () => {
    const results = [
      { latencyMs: 900, scored: { answeredOk: true, topN: { pass: true }, order: { pass: true }, counts: { pass: true }, bands: { pass: true }, tone: { passed: true } } },
      { latencyMs: 1200, scored: { answeredOk: true, topN: { pass: true }, order: { pass: true }, counts: { pass: true }, bands: { pass: true }, tone: { passed: true } } },
      { latencyMs: 3000, scored: { answeredOk: false, topN: { pass: false }, order: { pass: false }, counts: { pass: true }, bands: { pass: true }, tone: { passed: false } } },
    ];

    const summary = summarizeScenarios(results);

    expect(summary.total).toBe(3);
    expect(summary.answeredOk).toBe(2);
    expect(summary.correctOk).toBe(2);
    expect(summary.toneClean).toBe(2);
    expect(summary.passRate).toBe(66.7);
    expect(summary.p50Ms).toBe(1200);
    expect(summary.p95Ms).toBe(3000);
  });

  it('handles an empty run without dividing by zero', () => {
    const summary = summarizeScenarios([]);

    expect(summary.passRate).toBe(0);
    expect(summary.p50Ms).toBeNull();
    expect(summary.p95Ms).toBeNull();
  });
});
