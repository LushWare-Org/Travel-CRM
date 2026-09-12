import { describe, it, expect } from 'vitest';
import { buildRankedInsights, ruleIdFromInsightId, withIdentity } from '../pipeline.js';
import { recordEntityRef } from '../keys.js';

const NOW = new Date('2026-09-12T12:00:00.000Z');

const insight = (overrides = {}) => ({
  id: 'unassigned:lead-1',
  section: 'attention',
  severity: 'warning',
  text: 'Lead has no owner.',
  evidenceIds: ['leads:record:lead-1:assignedToId'],
  entityRef: recordEntityRef('lead-1'),
  action: { kind: 'navigate', verb: 'claim', target: recordEntityRef('lead-1') },
  ...overrides,
});

const EVIDENCE = new Set(['leads:record:lead-1:assignedToId', 'leads:record:lead-2:destination', 'invoices:record:inv-1:dueDate']);

const run = (insights, overrides = {}) =>
  buildRankedInsights({ insights, evidenceIds: EVIDENCE, now: NOW, ...overrides });

describe('ruleIdFromInsightId', () => {
  it('uses the whole id when there is no separator', () => {
    expect(ruleIdFromInsightId('lead-status')).toBe('lead-status');
  });

  it('strips the engine legacy declaration index', () => {
    // The engine prefixes ids with the position of the rule in a descriptor
    // array, which is the unstable part this whole change removes.
    expect(ruleIdFromInsightId('3:unassigned:lead-1')).toBe('unassigned');
    expect(ruleIdFromInsightId('12:groupedCount:leads:destination:Bali')).toBe('groupedCount');
  });

  it('takes the prefix of a hand-written composite id', () => {
    expect(ruleIdFromInsightId('reminders-exhausted:inv-1')).toBe('reminders-exhausted');
  });

  it('returns null for nothing usable', () => {
    expect(ruleIdFromInsightId(null)).toBeNull();
    expect(ruleIdFromInsightId('')).toBeNull();
  });
});

describe('withIdentity', () => {
  it('keeps a ruleId the engine already attached', () => {
    expect(withIdentity(insight({ ruleId: 'unassigned' })).ruleId).toBe('unassigned');
  });

  it('derives the ruleId when only an id is present', () => {
    expect(withIdentity({ id: 'lead-status', entityRef: recordEntityRef('lead-1') }).ruleId).toBe('lead-status');
  });

  it('builds a key that ignores the legacy declaration index', () => {
    const first = withIdentity(insight({ id: '1:unassigned:lead-1', ruleId: 'unassigned' }));
    const afterReorder = withIdentity(insight({ id: '9:unassigned:lead-1', ruleId: 'unassigned' }));

    expect(afterReorder.key).toBe(first.key);
    expect(first.key).toBe('unassigned:record:lead-1');
  });

  it('leaves the key null when nothing said what the insight is about', () => {
    // Deliberately not invented: a made-up ref would let an unconverted adapter's
    // insight be ranked as if it were about something.
    const identified = withIdentity({ id: 'mystery', section: 'attention', severity: 'info', text: 'x', evidenceIds: ['a'] });

    expect(identified.key).toBeNull();
    expect(identified.entityRef).toBeUndefined();
  });

  it('passes through junk rather than throwing', () => {
    expect(withIdentity(null)).toBeNull();
    expect(withIdentity(undefined)).toBeUndefined();
  });
});

describe('buildRankedInsights', () => {
  it('ranks what it accepts, applies the severity floor, and still records every candidate', () => {
    const result = run([
      insight({ id: 'i1', severity: 'info', text: 'No logo configured.', entityRef: recordEntityRef('lead-2'), evidenceIds: ['leads:record:lead-2:destination'] }),
      insight({ id: 'i2', severity: 'critical', text: 'Reminded three times.' }),
      insight({ id: 'i3' }),
    ]);

    // Two, not three: the floor keeps `info` out while something more urgent
    // exists, which is the point of having a floor at all.
    expect(result.ranked).toHaveLength(2);
    expect(result.ranked[0].severity).toBe('critical');
    expect(result.rankedOut.map((item) => item.severity)).toContain('info');

    // Every candidate is still accounted for exactly once, whether it was ranked
    // or ranked out. An item that reaches neither list has vanished silently.
    expect(result.decisions).toHaveLength(3);
    expect(result.summary.total).toBe(3);
    expect(result.counts.candidates).toBe(3);
  });

  it('drops a candidate that cites nothing resolvable, by name', () => {
    const result = run([insight({ id: 'i1', evidenceIds: ['gone:gone:gone:gone'] })]);

    expect(result.ranked).toEqual([]);
    expect(result.decisions[0]).toMatchObject({ decision: 'dropped', reason: 'uncited', layer: 'L1' });
  });

  it('drops a candidate that never said what it is about', () => {
    const result = run([insight({ id: 'i1', entityRef: undefined })]);

    expect(result.ranked).toEqual([]);
    expect(result.decisions[0]).toMatchObject({ reason: 'invalid_shape', layer: 'L0' });
  });

  it('attaches the score components to everything it ranks, so the panel can explain itself', () => {
    const [first] = run([insight({ id: 'i1' })]).ranked;

    expect(Number.isFinite(first.score)).toBe(true);
    expect(first.components).toMatchObject({ severity: 0.6, actionability: 1 });
  });

  it('never lets a critical be out-ranked, even against an actionable info', () => {
    const result = run([
      insight({ id: 'info', severity: 'info', text: 'No logo configured.', entityRef: recordEntityRef('lead-1'), evidenceIds: ['leads:record:lead-1:assignedToId'] }),
      insight({ id: 'crit', severity: 'critical', text: 'Reminded three times.', action: null }),
    ]);

    expect(result.ranked[0].severity).toBe('critical');
  });

  it('reports suppressed criticals instead of dropping them silently', () => {
    const many = Array.from({ length: 3 }, (_, i) =>
      insight({ id: `c${i}`, severity: 'critical', text: `Critical ${i}`, entityRef: recordEntityRef(`lead-${i}`), evidenceIds: ['leads:record:lead-1:assignedToId'] }),
    );

    const result = run(many, { criticalCeiling: 2 });

    expect(result.ranked).toHaveLength(2);
    expect(result.suppressedCriticals).toHaveLength(1);
  });

  it('handles no insights at all without inventing a panel', () => {
    const result = run([]);

    expect(result.ranked).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.counts.candidates).toBe(0);
    expect(result.rankingVersion).toBe('insight-ranking.v1');
  });

  it('is deterministic across runs', () => {
    const inputs = [insight({ id: 'a', severity: 'warning' }), insight({ id: 'b', severity: 'info', entityRef: recordEntityRef('lead-2'), evidenceIds: ['leads:record:lead-2:destination'] })];

    const first = run(inputs).ranked.map((item) => item.key);
    const second = run(inputs).ranked.map((item) => item.key);

    expect(first).toEqual(second);
  });
});
