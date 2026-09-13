import { describe, it, expect } from 'vitest';
import { CRITICAL_CEILING, DEFAULT_N, enrich, noveltyFromState, selectRanked } from '../rank.js';
import { recordEntityRef } from '../keys.js';

const NOW = new Date('2026-09-12T12:00:00.000Z');

const insight = (overrides = {}) => ({
  key: `unassigned:record:lead-${Math.random().toString(36).slice(2, 7)}`,
  ruleId: 'unassigned',
  section: 'attention',
  severity: 'warning',
  text: 'Lead has no owner.',
  entityRef: recordEntityRef(`lead-${Math.random().toString(36).slice(2, 7)}`),
  evidenceIds: ['leads:lead:lead-1:assignedToId'],
  action: { kind: 'navigate', verb: 'claim', target: recordEntityRef('lead-1') },
  ...overrides,
});

const select = (insights, overrides = {}) => selectRanked({ insights, now: NOW, ...overrides });

describe('the critical band is not budgeted', () => {
  it('shows every critical even when the budget is spent on warnings', () => {
    const { ranked, counts } = select([
      insight({ key: 'c1', severity: 'critical', text: 'Reminded three times and still unpaid.' }),
      insight({ key: 'c2', severity: 'critical', text: 'Ticketing deadline breached.' }),
      // Distinct rule ids, because the diversity cap allows only two per rule and
      // all these fixtures would otherwise share the default one — which is what
      // the first version of this test tripped over.
      insight({ key: 'w1', ruleId: 'r1' }),
      insight({ key: 'w2', ruleId: 'r2' }),
      insight({ key: 'w3', ruleId: 'r3' }),
      insight({ key: 'w4', ruleId: 'r4' }),
    ]);

    expect(ranked.filter((item) => item.severity === 'critical')).toHaveLength(2);
    expect(counts.ranked).toBe(5); // 2 criticals + the 3-item warning budget
    expect(ranked[0].severity).toBe('critical');
  });

  it('bounds a burst of criticals for reporting instead of dropping them silently', () => {
    const many = Array.from({ length: CRITICAL_CEILING + 2 }, (_, i) =>
      insight({ key: `c${i}`, severity: 'critical', text: `Critical ${i}` }),
    );

    const { ranked, suppressedCriticals, counts } = select(many);

    expect(ranked).toHaveLength(CRITICAL_CEILING);
    expect(suppressedCriticals).toHaveLength(2);
    expect(counts.suppressedCriticals).toBe(2);
    // The overflow carries enough to be actionable, not just a number.
    expect(suppressedCriticals[0]).toHaveProperty('text');
    expect(suppressedCriticals[0]).toHaveProperty('key');
  });

  it('never lets an info outrank a critical', () => {
    const { ranked } = select([
      insight({ key: 'i1', severity: 'info', text: 'No logo configured.' }),
      insight({ key: 'c1', severity: 'critical', action: null, text: 'Reminded three times.' }),
    ]);

    expect(ranked[0].key).toBe('c1');
  });
});

describe('severity floor', () => {
  it('keeps info out while warnings exist', () => {
    const { ranked, rankedOut } = select(
      [insight({ key: 'w1' }), insight({ key: 'i1', severity: 'info', text: 'No logo configured.' })],
      { n: 5 },
    );

    expect(ranked.map((item) => item.key)).toEqual(['w1']);
    expect(rankedOut.map((item) => item.key)).toContain('i1');
  });

  it('lets info through when nothing above it qualifies', () => {
    const { ranked } = select([insight({ key: 'i1', severity: 'info' })], { n: 3 });

    expect(ranked.map((item) => item.key)).toEqual(['i1']);
  });

  it('honours an explicit null floor', () => {
    const { ranked } = select([insight({ key: 'w1' }), insight({ key: 'i1', severity: 'info' })], { n: 5, floor: null });

    expect(ranked).toHaveLength(2);
  });
});

describe('budget and diversity', () => {
  it('cuts to the budget and reports the rest as ranked out', () => {
    const { ranked, rankedOut } = select([
      insight({ key: 'w1', ruleId: 'r1' }),
      insight({ key: 'w2', ruleId: 'r2' }),
      insight({ key: 'w3', ruleId: 'r3' }),
      insight({ key: 'w4', ruleId: 'r4' }),
    ]);

    expect(ranked).toHaveLength(DEFAULT_N);
    expect(rankedOut).toHaveLength(1);
  });

  it('caps how much one rule family can dominate', () => {
    const { ranked } = select(
      Array.from({ length: 5 }, (_, i) =>
        insight({ key: `f${i}`, ruleId: 'staleForDays', entityRef: recordEntityRef(`lead-${i}`) }),
      ),
      { n: 5 },
    );

    expect(ranked).toHaveLength(2);
  });

  it('caps how much one entity can dominate', () => {
    const sameEntity = recordEntityRef('lead-1');
    const { ranked } = select(
      [
        insight({ key: 'a', ruleId: 'ruleA', entityRef: sameEntity }),
        insight({ key: 'b', ruleId: 'ruleB', entityRef: sameEntity }),
        insight({ key: 'c', ruleId: 'ruleC', entityRef: sameEntity }),
      ],
      { n: 5 },
    );

    expect(ranked).toHaveLength(2);
  });

  it('spreads across sections rather than telling the operator one thing three times', () => {
    const { ranked, counts } = select([
      insight({ key: 'w1', section: 'attention', ruleId: 'r1' }),
      insight({ key: 'w2', section: 'attention', ruleId: 'r2' }),
      insight({ key: 'w3', section: 'attention', ruleId: 'r3' }),
      insight({ key: 'e1', section: 'experienced_view', ruleId: 'r4', text: '12 leads want Bali.' }),
    ]);

    expect(counts.sections).toBeGreaterThanOrEqual(2);
    expect(ranked.map((item) => item.section)).toContain('experienced_view');
    // The swap must not leave the list out of band order.
    const bands = ranked.map((item) => (item.severity === 'critical' ? 0 : item.severity === 'warning' ? 1 : 2));
    expect([...bands].sort()).toEqual(bands);
  });
});

describe('enrich', () => {
  it('attaches a score, its components, and the derived urgency and materiality', () => {
    const enriched = enrich(insight({ fact: { kind: 'date', value: '2026-09-13T06:00:00.000Z' } }), { now: NOW });

    expect(enriched.score).toBeGreaterThan(0);
    expect(enriched.components.actionability).toBe(1);
    expect(enriched.urgency).toBe(1.0);
    expect(enriched.materiality).toBeUndefined(); // no peers ⇒ default applied, not fabricated
    expect(enriched.components.materiality).toBe(0.3);
  });

  it('uses a page-relative materiality when peers are available', () => {
    const enriched = enrich(insight({ materialityValue: 5000, peers: [100, 1000, 5000] }), { now: NOW });

    expect(enriched.materiality).toBe(1);
  });

  it('penalises an item that keeps being shown without being acknowledged', () => {
    const state = new Map([['unassigned:record:lead-1', { surfacedCount: 3, acknowledgedAt: null }]]);
    const withState = enrich(insight({ key: 'unassigned:record:lead-1' }), { now: NOW, priorState: state });
    const without = enrich(insight({ key: 'unassigned:record:lead-1' }), { now: NOW });

    expect(withState.score).toBeLessThan(without.score);
    expect(withState.components.penalty).toBeGreaterThan(0);
  });

  it('lowers confidence when the page could not be read in full', () => {
    const partial = enrich(insight(), { now: NOW, unavailableSourceCount: 2 });

    expect(partial.confidence).toBe(0.5);
    expect(partial.components.confidence).toBe(0.5);
  });
});

describe('noveltyFromState', () => {
  it('rates a never-surfaced insight as fully novel', () => {
    expect(noveltyFromState(undefined, insight())).toBe(1.0);
  });

  it('rates an acknowledged, unchanged insight as not novel', () => {
    expect(noveltyFromState({ acknowledgedAt: NOW }, insight())).toBe(0.0);
  });

  it('rates a moved material value as half novel', () => {
    expect(noveltyFromState({ acknowledgedAt: NOW, lastMaterialValue: '62' }, insight({ materialValue: 91 }))).toBe(0.5);
  });
});

describe('output contract', () => {
  it('stamps the ranking version so an eval run is attributable', () => {
    expect(select([insight()]).rankingVersion).toBe('insight-ranking.v1');
  });

  it('reports the counts the response needs, including sections', () => {
    const { counts } = select([insight({ key: 'w1' }), insight({ key: 'i1', severity: 'info' })]);

    expect(counts).toMatchObject({ candidates: 2, ranked: 1, suppressedCriticals: 0 });
    expect(counts.sections).toBe(1);
  });

  it('is deterministic: the same input twice produces the same order', () => {
    const items = [
      insight({ key: 'a', ruleId: 'r1', severity: 'warning' }),
      insight({ key: 'b', ruleId: 'r2', severity: 'warning' }),
      insight({ key: 'c', ruleId: 'r3', severity: 'info' }),
      insight({ key: 'd', ruleId: 'r4', severity: 'critical' }),
    ];

    const first = select(items).ranked.map((item) => item.key);
    const second = select(items).ranked.map((item) => item.key);

    expect(first).toEqual(second);
  });

  it('handles an empty candidate set without inventing anything', () => {
    const { ranked, rankedOut, counts } = select([]);

    expect(ranked).toEqual([]);
    expect(rankedOut).toEqual([]);
    expect(counts.candidates).toBe(0);
    expect(counts.sections).toBe(0);
  });
});
