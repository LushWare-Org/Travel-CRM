import { describe, it, expect } from 'vitest';
import { buildRankedInsights } from '../pipeline.js';
import { recordEntityRef, groupEntityRef } from '../keys.js';

// ─── Golden ranking fixtures ───────────────────────────────────────────────
// The plan's success criteria as executables: precision@3, critical recall,
// determinism, and suppression. These are the fixtures that make the criteria
// falsifiable rather than aspirational.
//
// Two shapes of page, because they fail differently:
//
//   leads (collection)  warnings plus an informational grouping, which is where
//                       the severity floor and the diversity caps do the work
//   billing             a critical among warnings, which is where the band
//                       invariant and the critical ceiling do

const NOW = new Date('2026-09-12T12:00:00.000Z');
const EVIDENCE = (ids) => new Set(ids);

const leadInsight = (index, severity, ruleId, overrides = {}) => ({
  id: `${ruleId}:lead-${index}`,
  section: 'attention',
  severity,
  ruleId,
  text: `${ruleId} on lead ${index}.`,
  evidenceIds: [`leads:record:lead-${index}:assignedToId`],
  entityRef: recordEntityRef(`lead-${index}`),
  ...overrides,
});

const invoiceInsight = (index, severity, ruleId, overrides = {}) => ({
  id: `${ruleId}:inv-${index}`,
  section: 'attention',
  severity,
  ruleId,
  text: `${ruleId} on invoice ${index}.`,
  evidenceIds: [`billing:record:inv-${index}:dueDate`],
  entityRef: recordEntityRef(`inv-${index}`),
  ...overrides,
});

const run = (insights, overrides = {}) =>
  buildRankedInsights({
    insights,
    evidenceIds: EVIDENCE(insights.flatMap((i) => i.evidenceIds)),
    now: NOW,
    ...overrides,
  });

describe('leads collection — floor and diversity', () => {
  // Three warnings from three different rules, plus one repeated grouping that
  // reads as information rather than as work.
  const fixture = [
    leadInsight(1, 'warning', 'unassigned'),
    leadInsight(2, 'warning', 'unassigned'),
    leadInsight(3, 'warning', 'unassigned'),
    leadInsight(4, 'warning', 'staleForDays'),
    leadInsight(5, 'warning', 'stuckInStatus'),
    {
      id: 'groupedCount:leads:destination:Bali',
      section: 'experienced_view',
      severity: 'info',
      ruleId: 'groupedCount',
      text: '12 leads are asking for the same destination: Bali.',
      evidenceIds: ['leads:record:lead-1:assignedToId'],
      entityRef: groupEntityRef({ source: 'leads', groupBy: 'destination', key: 'Bali' }),
      facts: [{ kind: 'count', value: '12', derivation: 'grouped-by', evidenceId: 'leads:record:lead-1:assignedToId' }],
      action: null,
    },
  ];

  it('ranks the top 3 from the warnings and keeps the informational grouping out', () => {
    const { ranked } = run(fixture);

    expect(ranked).toHaveLength(3);
    expect(ranked.every((item) => item.severity === 'warning')).toBe(true);
    expect(ranked.map((item) => item.key)).not.toContain('groupedCount:group:leads:destination:Bali');
  });

  it('applies the diversity cap so one rule family cannot take the whole panel', () => {
    const { ranked } = run(fixture);
    const unassigned = ranked.filter((item) => item.ruleId === 'unassigned');

    expect(unassigned.length).toBeLessThanOrEqual(2);
  });

  it('names the fate of every candidate, including the ones it did not show', () => {
    const { ranked, rankedOut, decisions, summary } = run(fixture);

    expect(ranked.length + rankedOut.length).toBe(fixture.length);
    expect(decisions).toHaveLength(fixture.length);
    // The grouping is excluded by the floor, not by silence: its decision exists
    // and the summary counts it.
    expect(summary.total).toBe(fixture.length);
  });
});

describe('billing — the critical band', () => {
  const fixture = [
    invoiceInsight(1, 'warning', 'overdueBy'),
    invoiceInsight(2, 'critical', 'overdueBy', { text: 'Invoice is past its due date and still not settled.' }),
    invoiceInsight(3, 'warning', 'expiringWithin'),
    invoiceInsight(4, 'info', 'ratioBelow'),
  ];

  it('puts the critical first and never lets an info outrank it', () => {
    const { ranked } = run(fixture);

    expect(ranked[0].severity).toBe('critical');
    expect(ranked.findIndex((item) => item.severity === 'info')).toBe(-1);
  });

  it('keeps a critical first even when the actionability multiplier has shrunk its score', () => {
    const withBareCritical = fixture.map((item) =>
      item.severity === 'critical' ? { ...item, action: null } : item,
    );

    const { ranked } = run(withBareCritical);

    // Every item here is an observation (no action descriptor yet), so the
    // multiplier applies to all of them and the scores stay comparable. The
    // assertion that matters is the one below: band order placed the critical
    // first regardless of what the arithmetic did.
    expect(ranked[0].severity).toBe('critical');
    expect(ranked[0].actionability).toBe(0.4);

    // And the multiplier really did cost it: the same insight with an action
    // would score higher. This is why severity cannot be a summed term.
    const withAction = run(withBareCritical.map((item) =>
      item.severity === 'critical' ? { ...item, action: { kind: 'navigate', verb: 'call', target: item.entityRef } } : item,
    ));
    expect(withAction.ranked[0].score).toBeGreaterThan(ranked[0].score);
  });

  it('reports critical overflow rather than dropping it', () => {
    const many = Array.from({ length: 4 }, (_, i) => invoiceInsight(i, 'critical', 'overdueBy'));

    const { ranked, suppressedCriticals, counts } = run(many, { criticalCeiling: 3 });

    expect(ranked).toHaveLength(3);
    expect(suppressedCriticals).toHaveLength(1);
    expect(counts.suppressedCriticals).toBe(1);
  });
});

describe('the gates the design promises', () => {
  const fixture = [
    leadInsight(1, 'warning', 'unassigned'),
    leadInsight(2, 'warning', 'staleForDays'),
    invoiceInsight(9, 'critical', 'overdueBy'),
  ];

  it('determinism: the same fixture serializes identically twice', () => {
    const first = JSON.stringify(run(fixture).ranked);
    const second = JSON.stringify(run(fixture).ranked);

    expect(second).toBe(first);
  });

  it('critical recall: every critical is ranked or explicitly counted as overflow', () => {
    const { ranked, suppressedCriticals } = run(fixture);
    const criticals = fixture.filter((item) => item.severity === 'critical');

    expect(ranked.filter((item) => item.severity === 'critical')).toHaveLength(criticals.length);
    expect(suppressedCriticals).toEqual([]);
  });

  it('suppression replay: an acknowledged insight leaves the ranked list and is counted', () => {
    const key = 'unassigned:record:lead-1';
    const priorState = new Map([[key, { acknowledgedAt: new Date(NOW.getTime() - 3_600_000) }]]);

    const { ranked, decisions } = run(fixture, { priorState });

    expect(ranked.map((item) => item.key)).not.toContain(key);
    expect(decisions.find((entry) => entry.key === key)).toMatchObject({
      decision: 'suppressed',
      reason: 'suppressed_unchanged',
    });
  });

  it('escaping the window: the same insight comes back', () => {
    const key = 'unassigned:record:lead-1';
    const priorState = new Map([
      [key, { acknowledgedAt: new Date(NOW.getTime() - 8 * 86_400_000), lastMaterialValue: undefined }],
    ]);

    const { ranked } = run(fixture, { priorState });

    expect(ranked.map((item) => item.key)).toContain(key);
  });

  it('no unsupported values: a prose number with no fact behind it is refused', () => {
    // The pipeline itself does not police prose (the validator does), so this
    // fixture pins the place where the two meet: a rule that prints a number must
    // carry the fact, exactly as the derivation tests require.
    const bare = leadInsight(7, 'warning', 'staleForDays', { text: 'Unedited for 62 days.' });

    const { ranked } = run([bare]);

    // Ranked, because the pipeline's job is ordering. The validator is what
    // rejects it at the boundary, and `derivationFacts.test.js` covers that the
    // rules always emit the fact so this never has to happen.
    expect(ranked).toHaveLength(1);
    expect(ranked[0].facts ?? []).toEqual([]);
  });
});

describe('precision@3 on the leads fixture', () => {
  it('matches the expected set exactly', () => {
    const fixture = [
      leadInsight(1, 'warning', 'unassigned'),
      leadInsight(2, 'warning', 'staleForDays'),
      leadInsight(3, 'warning', 'stuckInStatus'),
      leadInsight(4, 'warning', 'missingField'),
      {
        id: 'groupedCount:leads:destination:Bali',
        section: 'experienced_view',
        severity: 'info',
        ruleId: 'groupedCount',
        text: '12 leads are asking for the same destination: Bali.',
        evidenceIds: ['leads:record:lead-1:assignedToId'],
        entityRef: groupEntityRef({ source: 'leads', groupBy: 'destination', key: 'Bali' }),
        action: null,
      },
    ];

    const { ranked } = run(fixture);
    const actual = new Set(ranked.map((item) => item.key));

    // These four warnings score IDENTICALLY: same severity, no date to derive
    // urgency from, no amount to derive materiality from. So the tie-break
    // decides, and the tie-break is the stable key, which is alphabetical:
    // missingField < staleForDays < stuckInStatus < unassigned.
    //
    // That is deterministic, which the design requires, but it is not
    // SEMANTICALLY meaningful — "missing a field" outranks "nobody owns this
    // lead" for no reason an operator would recognise. Real pages rarely tie
    // this way because dates and amounts differentiate them; a page that did
    // would want a declared priority, not an alphabetic accident.
    const expected = new Set([
      'missingField:record:lead-4',
      'staleForDays:record:lead-2',
      'stuckInStatus:record:lead-3',
    ]);

    expect(actual).toEqual(expected);
    expect(actual.size).toBe(3);
    // The grouping and the fourth warning are absent by design (floor, budget).
    expect(actual.has('groupedCount:group:leads:destination:Bali')).toBe(false);
    expect(actual.has('unassigned:record:lead-1')).toBe(false);
  });
});
