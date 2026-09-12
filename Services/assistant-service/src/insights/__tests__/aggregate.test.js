import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AGGREGATE_LIMIT,
  MIN_GROUP_SIZE,
  aggregateFromRecords,
  buildGroupEvidence,
  detectAggregateIntent,
  groupByHintFrom,
  groupCount,
  groupSum,
  isAggregateQuestion,
  limitFrom,
} from '../aggregate.js';

const AS_OF = '2026-09-12T12:00:00.000Z';
const lead = (destination, source = 'website') => ({ id: `${destination}-${Math.random()}`, destination, source });

const RECORDS = [
  ...Array.from({ length: 12 }, () => lead('Bali')),
  ...Array.from({ length: 8 }, () => lead('Dubai', 'referral')),
  ...Array.from({ length: 2 }, () => lead('Paris', 'referral')),
  { id: 'blank', destination: null, source: 'website' },
  { id: 'blankish', destination: '   ', source: 'website' },
];

describe('detectAggregateIntent', () => {
  it('recognises the question shapes operators actually use', () => {
    for (const question of [
      'which destinations have the most leads?',
      'how many leads want Bali?',
      'what is outstanding by customer?',
      'top 5 destinations',
      'where is demand clustering?',
      'give me a breakdown of leads by source',
      'rank packages by conversion',
    ]) {
      expect(isAggregateQuestion(question), question).toBe(true);
    }
  });

  it('leaves an ordinary question alone', () => {
    for (const question of [
      'is the deposit paid?',
      'what needs my attention today?',
      'did we send the voucher?',
      'who owns this lead?',
    ]) {
      expect(isAggregateQuestion(question), question).toBe(false);
    }
  });

  it('reads a group-by hint from the words, not a fixed list', () => {
    expect(detectAggregateIntent('most leads by destination').groupByHint).toBe('destination');
    expect(detectAggregateIntent('outstanding by customer').groupByHint).toBe('customerName');
    expect(detectAggregateIntent('grouped by owner').groupByHint).toBe('assignedToId');
  });

  it('returns no hint when the question does not name a field', () => {
    expect(detectAggregateIntent('how many leads are there?').groupByHint).toBeNull();
  });

  it('handles a missing or empty question without throwing', () => {
    expect(detectAggregateIntent(undefined).wantsAggregate).toBe(false);
    expect(detectAggregateIntent('').limit).toBeNull();
    expect(groupByHintFrom(null)).toBeNull();
  });
});

describe('limitFrom', () => {
  it('reads an explicit number the operator asked for', () => {
    expect(limitFrom('top 5 destinations')).toBe(5);
    expect(limitFrom('the 3 biggest clusters')).toBe(3);
  });

  it('falls back to the default page size', () => {
    expect(limitFrom('which destinations have the most leads?')).toBe(DEFAULT_AGGREGATE_LIMIT);
    expect(limitFrom('', 7)).toBe(7);
  });

  it('refuses an absurd or zero limit rather than obeying it', () => {
    expect(limitFrom('top 0 destinations')).toBe(DEFAULT_AGGREGATE_LIMIT);
    expect(limitFrom('top 99999 destinations')).toBe(1000);
  });
});

describe('groupCount', () => {
  it('counts per value, most first, then alphabetically', () => {
    expect(groupCount(RECORDS, 'destination')).toEqual([
      { key: 'Bali', count: 12 },
      { key: 'Dubai', count: 8 },
      { key: 'Paris', count: 2 },
    ]);
  });

  it('excludes blanks instead of creating an unnamed bucket', () => {
    const keys = groupCount(RECORDS, 'destination').map((group) => group.key);

    expect(keys).not.toContain('');
    // Two records have no destination and neither is counted.
    expect(groupCount(RECORDS, 'destination').reduce((sum, g) => sum + g.count, 0)).toBe(22);
  });

  it('is deterministic for equal counts', () => {
    const first = groupCount([lead('B'), lead('A')], 'destination');
    const second = groupCount([lead('A'), lead('B')], 'destination');

    expect(first).toEqual(second);
    expect(first.map((g) => g.key)).toEqual(['A', 'B']);
  });

  it('handles no records and a missing field', () => {
    expect(groupCount([], 'destination')).toEqual([]);
    expect(groupCount(RECORDS, 'nope')).toEqual([]);
  });
});

describe('groupSum', () => {
  it('totals a numeric field per group', () => {
    const rows = [
      { customer: 'Acme', amount: 100 },
      { customer: 'Acme', amount: 50 },
      { customer: 'Beta', amount: 400 },
      { customer: 'Gamma', amount: null },
    ];

    expect(groupSum(rows, 'customer', 'amount')).toEqual([
      { key: 'Beta', count: 400 },
      { key: 'Acme', count: 150 },
    ]);
  });

  it('skips non-numeric amounts rather than coercing them to zero', () => {
    expect(groupSum([{ c: 'a', amount: 'lots' }], 'c', 'amount')).toEqual([]);
  });
});

describe('buildGroupEvidence', () => {
  const groups = [
    { key: 'Bali', count: 12 },
    { key: 'Dubai', count: 2 },
  ];

  it('produces citation-capable items: a scalar value with fieldPaths', () => {
    const { evidence } = buildGroupEvidence({ groups, pageKey: 'leads', source: 'leads', groupBy: 'destination', asOf: AS_OF });

    // Without fieldPaths the substance judge refuses the item and a correct count
    // is dropped for lack of a citation.
    expect(evidence[0]).toMatchObject({
      type: 'computed',
      value: 12,
      fieldPaths: ['count'],
      recordRef: { kind: 'group', id: 'leads:destination:Bali' },
    });
    expect(evidence[0].id).toBe('leads:aggregate:leads:destination:Bali:value');
  });

  it('drops groups below the minimum and says how many it dropped', () => {
    const { evidence, suppressedGroups } = buildGroupEvidence({
      groups,
      pageKey: 'leads',
      source: 'leads',
      groupBy: 'destination',
      minGroupSize: MIN_GROUP_SIZE,
    });

    expect(evidence.map((item) => item.value)).toEqual([12]);
    expect(suppressedGroups).toBe(1);
  });

  it('honours the limit and reports nothing dropped for it as suppressed groups', () => {
    const many = [{ key: 'a', count: 9 }, { key: 'b', count: 8 }, { key: 'c', count: 7 }];

    const { shown, evidence } = buildGroupEvidence({ groups: many, pageKey: 'leads', source: 'leads', groupBy: 'destination', limit: 2 });

    expect(shown).toBe(2);
    expect(evidence).toHaveLength(2);
  });
});

describe('aggregateFromRecords', () => {
  const base = { records: RECORDS, pageKey: 'leads', source: 'leads', groupBy: 'destination', asOf: AS_OF };

  it('groups the rows already in memory, with no second read', () => {
    const result = aggregateFromRecords({ ...base, question: 'which destinations have the most leads?', upstreamTotal: 24 });

    // Two groups, not three: Paris has 2 leads and the minimum group size is 3.
    // A group that small is a record wearing a summary's clothes, so it is
    // dropped and counted rather than shown.
    expect(result.groupCount).toBe(2);
    expect(result.suppressedGroups).toBe(1);
    expect(result.rowsConsidered).toBe(RECORDS.length);
    expect(result.evidence[0].value).toBe(12);
  });

  it('shows a small group when the caller lowers the minimum deliberately', () => {
    const result = aggregateFromRecords({ ...base, minGroupSize: 2, upstreamTotal: 24 });

    expect(result.groupCount).toBe(3);
    expect(result.suppressedGroups).toBe(0);
  });

  it('labels a capped read as truncated rather than presenting the count as complete', () => {
    const capped = aggregateFromRecords({ ...base, upstreamTotal: 400 });

    expect(capped.truncated).toBe(true);
    expect(capped.upstreamTotal).toBe(400);
  });

  it('treats an unknown upstream total as incomplete, not as proof of completeness', () => {
    expect(aggregateFromRecords({ ...base, upstreamTotal: null }).truncated).toBe(true);
  });

  it('accepts a read as complete only when the total matches what it saw', () => {
    expect(aggregateFromRecords({ ...base, upstreamTotal: RECORDS.length }).truncated).toBe(false);
  });

  it('sums when asked to, using the declared field', () => {
    const rows = [
      { customerName: 'Acme', amount: 10 },
      { customerName: 'Acme', amount: 5 },
      { customerName: 'Beta', amount: 3 },
      { customerName: 'Beta', amount: 3 },
      { customerName: 'Beta', amount: 3 },
    ];

    const result = aggregateFromRecords({
      records: rows,
      pageKey: 'billing',
      source: 'invoices',
      groupBy: 'customerName',
      metric: 'sum',
      sumField: 'amount',
      upstreamTotal: 5,
    });

    expect(result.evidence[0].value).toBe(15);
  });

  it('returns nothing usable for an empty read, rather than a zero that looks measured', () => {
    const result = aggregateFromRecords({ ...base, records: [] });

    expect(result.evidence).toEqual([]);
    expect(result.groupCount).toBe(0);
    expect(result.truncated).toBe(false);
  });

  it('does nothing without a group-by field', () => {
    expect(aggregateFromRecords({ ...base, groupBy: null }).evidence).toEqual([]);
  });

  it('honours a limit the operator asked for', () => {
    const result = aggregateFromRecords({ ...base, question: 'top 1 destination' });

    expect(result.limit).toBe(1);
    expect(result.evidence).toHaveLength(1);
  });
});
