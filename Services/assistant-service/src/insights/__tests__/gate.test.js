import { describe, it, expect } from 'vitest';
import { gateInsights, shouldSuppress, summarizeDecisions } from '../gate.js';
import { recordEntityRef, groupEntityRef } from '../keys.js';

const NOW = new Date('2026-09-12T12:00:00.000Z');
const EVIDENCE = new Set([
  'leads:lead:lead-1:assignedToId',
  'leads:lead:lead-2:destination',
  'leads:aggregate:destination-count:value',
]);

const candidate = (overrides = {}) => ({
  key: 'unassigned:record:lead-1',
  ruleId: 'unassigned',
  section: 'attention',
  severity: 'warning',
  text: 'Lead has no owner.',
  entityRef: recordEntityRef('lead-1'),
  evidenceIds: ['leads:lead:lead-1:assignedToId'],
  action: { kind: 'navigate', verb: 'claim', target: recordEntityRef('lead-1') },
  ...overrides,
});

const gate = (candidates, overrides = {}) => gateInsights({ candidates, now: NOW, resolvableEvidenceIds: EVIDENCE, ...overrides });

describe('L0 schema', () => {
  it('drops a candidate with no usable key', () => {
    const { accepted, decisions } = gate([candidate({ key: null })]);

    expect(accepted).toEqual([]);
    expect(decisions[0]).toMatchObject({ decision: 'dropped', reason: 'invalid_shape', layer: 'L0' });
  });

  it('drops a candidate whose entityRef is unusable, naming the layer', () => {
    const { decisions } = gate([candidate({ entityRef: { kind: 'customer', id: 'c-1' } })]);

    expect(decisions[0]).toMatchObject({ reason: 'invalid_shape', layer: 'L0' });
  });

  it('drops empty prose rather than letting a blank bubble through', () => {
    const { decisions } = gate([candidate({ text: '   ' })]);

    expect(decisions[0]).toMatchObject({ reason: 'invalid_shape', layer: 'L0' });
  });
});

describe('L1 evidence', () => {
  it('drops a candidate with no citation at all', () => {
    const { decisions } = gate([candidate({ evidenceIds: [] })]);

    expect(decisions[0]).toMatchObject({ reason: 'uncited', layer: 'L1' });
  });

  it('drops a candidate whose citations do not exist in the final bundle', () => {
    const { decisions } = gate([candidate({ evidenceIds: ['leads:lead:lead-9:assignedToId'] })]);

    expect(decisions[0]).toMatchObject({ reason: 'uncited', layer: 'L1' });
  });

  it('keeps only the resolvable citations on the accepted insight', () => {
    const { accepted } = gate([candidate({ evidenceIds: ['leads:lead:lead-1:assignedToId', 'gone:gone:gone:gone'] })]);

    expect(accepted[0].evidenceIds).toEqual(['leads:lead:lead-1:assignedToId']);
  });
});

describe('L2 authorization', () => {
  it('drops a candidate citing an id that came from a denied source', () => {
    const { decisions } = gate([candidate()], {
      unauthorizedEvidenceIds: new Set(['leads:lead:lead-1:assignedToId']),
    });

    expect(decisions[0]).toMatchObject({ reason: 'unauthorized', layer: 'L2' });
  });

  it('passes everything in normal operation, because a denied source contributes no evidence to cite', () => {
    const { accepted } = gate([candidate()]);

    expect(accepted).toHaveLength(1);
  });
});

describe('L3 actionability — the asymmetry between origins', () => {
  it('demotes a rule insight with no action, keeping it but marking it an observation', () => {
    const { accepted, decisions } = gate([candidate({ action: null })]);

    expect(accepted).toHaveLength(1);
    expect(accepted[0].observation).toBe(true);
    expect(decisions[0]).toMatchObject({ decision: 'accepted', reason: 'observation' });
  });

  it('does NOT demote a model claim, which can never carry an action', () => {
    const { accepted } = gate([candidate({ action: undefined })], { origin: 'model' });

    expect(accepted).toHaveLength(1);
    expect(accepted[0].observation).toBe(false);
    expect(accepted[0].origin).toBe('model');
  });
});

describe('L4 materiality — also rule-only', () => {
  it('drops a rule insight flagged below the materiality floor', () => {
    const { decisions } = gate([candidate({ belowMateriality: true })]);

    expect(decisions[0]).toMatchObject({ reason: 'below_materiality', layer: 'L4' });
  });

  it('ignores the flag for model claims, which have no declared threshold', () => {
    const { accepted } = gate([candidate({ belowMateriality: true })], { origin: 'model' });

    expect(accepted).toHaveLength(1);
  });
});

describe('L5 novelty and suppression', () => {
  const hour = 3_600_000;

  it('suppresses an unchanged insight acknowledged inside its window', () => {
    const priorState = new Map([['unassigned:record:lead-1', { acknowledgedAt: new Date(NOW.getTime() - hour) }]]);
    const { decisions } = gate([candidate()], { priorState });

    expect(decisions[0]).toMatchObject({ decision: 'suppressed', reason: 'suppressed_unchanged', layer: 'L5' });
  });

  it('never suppresses a critical, because a hidden critical is worse than a repeat', () => {
    const priorState = new Map([['unassigned:record:lead-1', { acknowledgedAt: new Date(NOW.getTime() - hour) }]]);
    const { accepted } = gate([candidate({ severity: 'critical' })], { priorState });

    expect(accepted).toHaveLength(1);
  });

  it('lets it through again once the window has elapsed', () => {
    const priorState = new Map([['unassigned:record:lead-1', { acknowledgedAt: new Date(NOW.getTime() - 8 * 86_400_000) }]]);
    const { accepted } = gate([candidate()], { priorState });

    expect(accepted).toHaveLength(1);
  });

  it('treats a moved material value as news, beating the window', () => {
    const priorState = new Map([
      ['unassigned:record:lead-1', { acknowledgedAt: new Date(NOW.getTime() - hour), lastMaterialValue: '62' }],
    ]);
    const { accepted } = gate([candidate({ materialValue: 91 })], { priorState });

    expect(accepted).toHaveLength(1);
  });

  it('still suppresses when the material value is unchanged', () => {
    const priorState = new Map([
      ['unassigned:record:lead-1', { acknowledgedAt: new Date(NOW.getTime() - hour), lastMaterialValue: '62' }],
    ]);
    const { decisions } = gate([candidate({ materialValue: 62 })], { priorState });

    expect(decisions[0].reason).toBe('suppressed_unchanged');
  });

  it('does not suppress without prior state at all', () => {
    expect(shouldSuppress(candidate(), {}, NOW)).toBe(false);
  });
});

describe('L6 dedupe and conflict', () => {
  it('merges two candidates with the same key and lets the stricter severity win', () => {
    const { accepted, decisions } = gate([
      candidate({ severity: 'info', text: 'Lead has no owner.' }),
      candidate({ severity: 'critical', text: 'Lead has no owner and is past SLA.' }),
    ]);

    expect(accepted).toHaveLength(1);
    expect(accepted[0].severity).toBe('critical');
    expect(decisions[1]).toMatchObject({ decision: 'merged', reason: 'conflict_resolved', layer: 'L6' });
  });

  it('unions the citations of everything it merges', () => {
    const { accepted } = gate([
      candidate({ evidenceIds: ['leads:lead:lead-1:assignedToId'] }),
      candidate({ evidenceIds: ['leads:lead:lead-2:destination'] }),
    ]);

    expect(accepted[0].evidenceIds.sort()).toEqual(['leads:lead:lead-1:assignedToId', 'leads:lead:lead-2:destination']);
  });

  it('keys model claims on prose plus evidence, so the same answer twice is one answer', () => {
    const claim = candidate({ key: undefined, text: 'Bali leads with 12 open leads.' });
    const { accepted, decisions } = gate([claim, { ...claim }], { origin: 'model' });

    expect(accepted).toHaveLength(1);
    expect(decisions[1].decision).toBe('merged');
  });
});

describe('L8 safety', () => {
  it('drops prose carrying a raw record id', () => {
    const { decisions } = gate([candidate({ text: 'LEAD-8F21 is unclaimed.' })]);

    expect(decisions[0]).toMatchObject({ reason: 'rejected_safety', layer: 'L8' });
  });

  it('drops prose carrying evidence plumbing', () => {
    expect(gate([candidate({ text: 'Checked tool:listLeads:1 for this.' })]).decisions[0].reason).toBe('rejected_safety');
    expect(gate([candidate({ text: 'The claim cites evidenceIds.' })]).decisions[0].reason).toBe('rejected_safety');
  });

  it('DROPS nothing for a grounded number in prose — that is the whole point of the numeric work', () => {
    const { accepted } = gate([candidate({ text: 'Bali has 12 open leads, ahead of Dubai at 8.' })]);

    expect(accepted).toHaveLength(1);
  });
});

describe('summarizeDecisions', () => {
  it('reports the fates by reason and by layer', () => {
    const { decisions } = gate([
      candidate(),
      candidate({ key: null }),
      candidate({ key: 'unassigned:record:lead-2', evidenceIds: [] }),
    ]);

    const summary = summarizeDecisions(decisions);

    expect(summary.total).toBe(3);
    expect(summary.byReason).toContainEqual(['ok', 1]);
    expect(summary.byReason).toContainEqual(['invalid_shape', 1]);
    expect(summary.byReason).toContainEqual(['uncited', 1]);
    expect(summary.byLayer.map(([layer]) => layer)).toEqual(['L0', 'L1']);
  });

  it('handles an empty run', () => {
    expect(summarizeDecisions([]).total).toBe(0);
  });
});

describe('decision recording', () => {
  it('emits exactly one decision per candidate, whatever its fate', () => {
    const inputs = [
      candidate(),
      candidate({ key: 'groupedCount:group:leads:destination:Bali', entityRef: groupEntityRef({ source: 'leads', groupBy: 'destination', key: 'Bali' }), action: null }),
      candidate({ key: null }),
      candidate({ key: 'unassigned:record:lead-3', evidenceIds: [] }),
    ];

    expect(gate(inputs).decisions).toHaveLength(inputs.length);
  });
});
