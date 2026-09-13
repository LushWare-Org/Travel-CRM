import { describe, it, expect } from 'vitest';
import { validateClaims, buildSources, insightsToClaims } from '../groundingValidator.js';

// Field-level evidence fixtures: one scalar citation item per allowlisted
// field, plus one computed (non-field) item. The legacy composite `lead:1`
// item no longer exists, so it must be invalid everywhere below.
const lifecycleItem = {
  id: 'lead:1:lifecycleStatus',
  type: 'record',
  label: 'Lead 1 · lifecycleStatus',
  value: 'NEW',
  recordRef: { kind: 'lead', id: '1' },
  fieldPaths: ['lifecycleStatus'],
  updatedAt: '2026-09-09T00:00:00Z',
  asOf: '2026-09-09T00:00:00Z',
};
const budgetItem = {
  id: 'lead:1:budget',
  type: 'record',
  label: 'Lead 1 · budget',
  value: 450000,
  recordRef: { kind: 'lead', id: '1' },
  fieldPaths: ['budget'],
  updatedAt: '2026-09-09T00:00:00Z',
  asOf: '2026-09-09T00:00:00Z',
};
const metricItem = {
  id: 'metric:conv',
  type: 'computed',
  label: 'Conversion rate',
  value: { conversionRate: 0.64 },
  asOf: '2026-09-09T00:00:00Z',
};

const bundle = {
  context: { pageKey: 'leads', scopeLabel: 'Lead 1', actorRole: 'salesRep', asOf: '2026-09-09T00:00:00Z' },
  record: { id: '1', lifecycleStatus: 'NEW', budget: 450000 },
  evidence: [lifecycleItem, budgetItem, metricItem],
  deterministicInsights: [],
  unavailableSources: [],
  notAuthorizedSources: [],
};

function claim(overrides = {}) {
  return {
    id: 'c1',
    section: 'attention',
    text: 'This lead needs follow-up.',
    facts: [],
    evidenceIds: ['lead:1:lifecycleStatus'],
    evidenceType: 'computed',
    severity: 'warning',
    ...overrides,
  };
}

// What the TURN computed. `tool:<name>:<n>` is minted by agentRunner and never shown
// to the model (the prompt prints {tool,result}), which is what the computed-answer
// path exists for. `metric:conv` above is deliberately NOT one of these: it is page
// evidence with a real id, so a claim about it must still cite.
const toolItem = {
  id: 'tool:getPackagePerformance:1',
  type: 'computed',
  label: 'Tool result getPackagePerformance',
  value: { stats: { totalInquiries: 12 }, mostInquired: [{ name: 'Japan Cultural Journey', inquiries: 5 }] },
  asOf: '2026-09-09T00:00:00Z',
};
const secondToolItem = {
  id: 'tool:getDashboardSnapshot:2',
  type: 'computed',
  label: 'Tool result getDashboardSnapshot',
  value: { leads: { total: 40 } },
  asOf: '2026-09-09T00:00:00Z',
};
const withTool = { ...bundle, evidence: [...bundle.evidence, toolItem] };
const withTwoTools = { ...bundle, evidence: [...bundle.evidence, toolItem, secondToolItem] };

describe('validateClaims', () => {
  it('accepts a claim grounded in a field-level evidence ID', () => {
    const { claims, rejected } = validateClaims({ claims: [claim()], bundle, enableGuidance: false });
    expect(claims).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it('rejects the legacy composite lead:<id> evidence ID', () => {
    const { claims, rejected } = validateClaims({ claims: [claim({ evidenceIds: ['lead:1'] })], bundle, enableGuidance: false });
    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'no-valid-evidence' });
  });

  it('rejects a claim with no valid evidence IDs', () => {
    const { claims, rejected } = validateClaims({ claims: [claim({ evidenceIds: ['nope'] })], bundle, enableGuidance: false });
    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'no-valid-evidence' });
  });

  it('rejects a guidance claim when guidance is disabled', () => {
    const { claims, rejected } = validateClaims({ claims: [claim({ evidenceType: 'guidance' })], bundle, enableGuidance: false });
    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'guidance-disabled' });
  });

  it('accepts a guidance claim when guidance is enabled', () => {
    const { claims } = validateClaims({ claims: [claim({ evidenceType: 'guidance' })], bundle, enableGuidance: true });
    expect(claims).toHaveLength(1);
  });

  it('drops a fact whose value is not grounded in the cited field item', () => {
    const { claims } = validateClaims({
      claims: [
        claim({
          facts: [{ kind: 'amount', value: '999999', evidenceId: 'lead:1:budget' }],
          // The fact must cite evidence the CLAIM cites, or the client cannot
          // resolve it from the sources list. Citing it here keeps this test
          // about groundedness rather than about resolvability.
          evidenceIds: ['lead:1:budget'],
        }),
      ],
      bundle,
      enableGuidance: false,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].facts).toHaveLength(0);
  });

  it('drops a fact cited against the wrong field item', () => {
    const { claims } = validateClaims({
      claims: [
        claim({
          facts: [{ kind: 'amount', value: 'NEW', evidenceId: 'lead:1:budget' }],
          evidenceIds: ['lead:1:budget'],
        }),
      ],
      bundle,
      enableGuidance: false,
    });
    expect(claims[0].facts).toHaveLength(0);
  });

  it('keeps a fact whose value appears in the cited field item', () => {
    const { claims } = validateClaims({
      claims: [
        claim({
          facts: [{ kind: 'amount', value: '450000', evidenceId: 'lead:1:budget' }],
          evidenceIds: ['lead:1:budget'],
        }),
      ],
      bundle,
      enableGuidance: false,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].facts).toHaveLength(1);
  });

  // The rule this replaced rejected any claim containing a digit, which made
  // every counting question unanswerable. These four pin the replacement.
  it('accepts a number in prose that resolves to the cited evidence', () => {
    const { claims, rejected } = validateClaims({
      claims: [claim({ text: 'Budget is 450000 LKR.', evidenceIds: ['lead:1:budget'] })],
      bundle,
      enableGuidance: false,
    });

    expect(rejected).toHaveLength(0);
    expect(claims).toHaveLength(1);
  });

  it('rejects a number in prose that resolves to nothing the claim cites', () => {
    const { claims, rejected } = validateClaims({
      claims: [claim({ text: 'Budget is 999999 LKR.', evidenceIds: ['lead:1:budget'] })],
      bundle,
      enableGuidance: false,
    });

    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'unsupported-number' });
  });

  it('does not resolve a token that merely appears inside a longer value', () => {
    // 450000 contains "45"; substring matching would have accepted it.
    const { claims, rejected } = validateClaims({
      claims: [claim({ text: 'Roughly 45 leads are waiting.', evidenceIds: ['lead:1:budget'] })],
      bundle,
      enableGuidance: false,
    });

    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'unsupported-number' });
  });

  it('resolves a number carried by a declared derivation, which is how a count survives', () => {
    const { claims, rejected } = validateClaims({
      claims: [
        claim({
          text: 'This lead has been unedited for 62 days.',
          evidenceIds: ['lead:1:lifecycleStatus'],
          facts: [
            {
              kind: 'duration',
              value: '62',
              unit: 'days',
              derivation: 'elapsed-since',
              evidenceId: 'lead:1:lifecycleStatus',
            },
          ],
        }),
      ],
      bundle,
      enableGuidance: false,
    });

    expect(rejected).toHaveLength(0);
    expect(claims).toHaveLength(1);
    // Retained, not pruned: "62" is nowhere inside the cited NEW value, so the
    // groundedness check would have discarded it.
    expect(claims[0].facts).toHaveLength(1);
  });

  it('rejects the claim when the only support for its number was an invalid derivation', () => {
    const { claims, rejected } = validateClaims({
      claims: [
        claim({
          text: 'Unedited for 62 days.',
          evidenceIds: ['lead:1:lifecycleStatus'],
          facts: [
            { kind: 'duration', value: '62', derivation: 'elapsed-since', evidenceId: 'lead:1:lifecycleStatus', derivedFrom: ['lead:1:budget'] },
          ],
        }),
      ],
      bundle,
      enableGuidance: false,
    });

    // Dropping the derivation leaves "62" unsupported, so the whole claim goes.
    // That is the invariant working: no fabricated numbers, ever.
    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'unsupported-number' });
  });

  it('still refuses unsafe prose, by name rather than silently', () => {
    const { claims, rejected } = validateClaims({
      claims: [claim({ text: 'See LEAD-8F21 for the detail.' })],
      bundle,
      enableGuidance: false,
    });

    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'unsafe-prose' });
  });
});

describe('buildSources', () => {
  it('builds server-owned sources with the field target copied from the cited item', () => {
    const accepted = [claim({ evidenceIds: ['lead:1:budget'] })];
    const sources = buildSources(accepted, bundle);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: 'lead:1:budget',
      label: 'Lead 1 · budget',
      type: 'record',
      target: { kind: 'lead', id: '1', fieldPaths: ['budget'] },
      capturedValue: 450000,
    });
  });

  it('copies capturedValue only from a cited allowlisted field item', () => {
    const accepted = [claim({ evidenceIds: ['lead:1:lifecycleStatus'] })];
    const [source] = buildSources(accepted, bundle);
    expect(source.capturedValue).toBe('NEW');
    expect(source.capturedValue).toBe(lifecycleItem.value);
  });

  it('never fabricates a capturedValue for non-field evidence', () => {
    const accepted = [claim({ evidenceIds: ['metric:conv'] })];
    const [source] = buildSources(accepted, bundle);
    expect(source.target).toBeUndefined();
    expect(source).not.toHaveProperty('capturedValue');
  });

  it('does not emit sources for evidence IDs that were not accepted', () => {
    const sources = buildSources([], bundle);
    expect(sources).toHaveLength(0);
  });
});

describe('insightsToClaims', () => {
  it('carries field-level evidence IDs through from a deterministic insight', () => {
    const claims = insightsToClaims([
      {
        id: 'i1',
        section: 'current_state',
        severity: 'info',
        text: 'Lead is NEW',
        evidenceIds: ['lead:1:lifecycleStatus'],
      },
    ]);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({
      id: 'i1',
      section: 'current_state',
      evidenceType: 'computed',
      evidenceIds: ['lead:1:lifecycleStatus'],
    });
  });

  it('carries plural facts, preferring them over the singular primary', () => {
    const facts = [
      { kind: 'date', value: '2026-09-09', evidenceId: 'lead:1:lifecycleStatus' },
      { kind: 'duration', value: '62', unit: 'days', derivation: 'elapsed-since', evidenceId: 'lead:1:lifecycleStatus' },
    ];
    const [claim] = insightsToClaims([
      { id: 'i1', section: 'attention', severity: 'warning', text: 'Unedited for 62 days.', evidenceIds: ['lead:1:lifecycleStatus'], facts },
    ]);

    expect(claim.facts).toEqual(facts);
  });

  it('falls back to the singular fact for an insight that predates plural facts', () => {
    const fact = { kind: 'date', value: '2026-09-09', evidenceId: 'lead:1:lifecycleStatus' };
    const [claim] = insightsToClaims([
      { id: 'i1', section: 'attention', severity: 'warning', text: 'Stale.', evidenceIds: ['lead:1:lifecycleStatus'], fact },
    ]);

    expect(claim.facts).toEqual([fact]);
  });

  it('drops nothing: the mapped claim matches the ranked item for every shared field', async () => {
    // The parity contract. If this fails, a field was added to an insight and
    // forgotten here, and the degraded path silently loses it.
    const { enrich } = await import('../../insights/rank.js');

    const insight = {
      id: '3:unassigned',
      key: 'unassigned:record:lead-1',
      ruleId: 'unassigned',
      section: 'attention',
      severity: 'warning',
      text: 'Lead has no owner.',
      evidenceIds: ['lead:1:lifecycleStatus'],
      facts: [{ kind: 'date', value: '2026-09-09', evidenceId: 'lead:1:lifecycleStatus' }],
      entityRef: { kind: 'record', id: 'lead-1' },
      action: { kind: 'navigate', verb: 'claim', target: { kind: 'record', id: 'lead-1' } },
    };

    const ranked = enrich(insight, {});
    const [claim] = insightsToClaims([ranked]);

    for (const field of ['id', 'section', 'text', 'facts', 'evidenceIds', 'severity', 'key', 'ruleId', 'entityRef', 'action', 'score']) {
      expect(claim[field], `field '${field}' was dropped by insightsToClaims`).toEqual(ranked[field]);
    }
    expect(claim.scoreComponents).toEqual(ranked.components);
  });
});

describe('a computed answer', () => {
  it('accepts a claim that cites nothing when its number came from a tool result', () => {
    const { claims, rejected } = validateClaims({
      claims: [claim({ evidenceIds: [], text: 'Japan drew 5 inquiries.' })],
      bundle: withTool,
      enableGuidance: false,
    });

    expect(rejected).toEqual([]);
    expect(claims).toHaveLength(1);
    // Nothing was back-filled: these ids are not renderable fields, so a source
    // built from them would be a row the panel cannot reveal.
    expect(claims[0].evidenceIds).toEqual([]);
  });

  it('still refuses a number the tool result does not carry', () => {
    const { claims, rejected } = validateClaims({
      claims: [claim({ evidenceIds: [], text: 'Japan drew 9 inquiries.' })],
      bundle: withTool,
      enableGuidance: false,
    });

    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'unsupported-number' });
  });

  it('still refuses a citation-less claim when the turn computed nothing', () => {
    // `bundle` carries a page item with type 'computed' (metric:conv) — which is
    // exactly why the selector keys on id shape rather than on type. Nothing was
    // computed this turn, so the citation rule is untouched.
    const { claims, rejected } = validateClaims({
      claims: [claim({ evidenceIds: [], text: 'Japan drew 5 inquiries.' })],
      bundle,
      enableGuidance: false,
    });

    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'no-valid-evidence' });
  });

  it('draws on every computed result of the turn, not only a cited one', () => {
    // One sentence routinely covers two tool calls; requiring it to cite the exact
    // tool behind each figure would delete it for the same reason as before.
    const { claims, rejected } = validateClaims({
      claims: [claim({ evidenceIds: [], text: 'There are 40 leads in total.' })],
      bundle: withTwoTools,
      enableGuidance: false,
    });

    expect(rejected).toEqual([]);
    expect(claims).toHaveLength(1);
  });

  it('keeps a claim about real page evidence on the citation rule', () => {
    const { claims, rejected } = validateClaims({
      claims: [claim({ evidenceIds: ['metric:conv'], text: 'Conversion is 0.64.' })],
      bundle,
      enableGuidance: false,
    });

    expect(rejected).toEqual([]);
    expect(claims).toHaveLength(1);

    // And the same claim citing nothing is refused, so the page path keeps its
    // strictness even while the computed path is open.
    const uncited = validateClaims({
      claims: [claim({ evidenceIds: [], text: 'Conversion is 0.64.' })],
      bundle,
      enableGuidance: false,
    });
    expect(uncited.rejected).toContainEqual({ id: 'c1', reason: 'no-valid-evidence' });
  });

  it('accepts a computed claim that carries a fact pointing at the tool result', () => {
    // The model may guess the id correctly; a fact supported by a computed result
    // then survives, and its value can carry the number.
    const { claims, rejected } = validateClaims({
      claims: [
        claim({
          evidenceIds: [],
          text: 'The catalogue drew inquiries.',
          facts: [{ kind: 'count', value: '12', evidenceId: 'tool:getPackagePerformance:1' }],
        }),
      ],
      bundle: withTool,
      enableGuidance: false,
    });

    expect(rejected).toEqual([]);
    expect(claims[0].facts).toHaveLength(1);
  });
});
