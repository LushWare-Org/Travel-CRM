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
      claims: [claim({ facts: [{ kind: 'amount', value: '999999', evidenceId: 'lead:1:budget' }] })],
      bundle,
      enableGuidance: false,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].facts).toHaveLength(0);
  });

  it('drops a fact cited against the wrong field item', () => {
    const { claims } = validateClaims({
      claims: [claim({ facts: [{ kind: 'amount', value: 'NEW', evidenceId: 'lead:1:budget' }] })],
      bundle,
      enableGuidance: false,
    });
    expect(claims[0].facts).toHaveLength(0);
  });

  it('keeps a fact whose value appears in the cited field item', () => {
    const { claims } = validateClaims({
      claims: [claim({ facts: [{ kind: 'amount', value: '450000', evidenceId: 'lead:1:budget' }] })],
      bundle,
      enableGuidance: false,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].facts).toHaveLength(1);
  });

  it('rejects a claim whose prose embeds a numeric value (residual token)', () => {
    const { claims, rejected } = validateClaims({
      claims: [claim({ text: 'Budget is 450000 LKR.' })],
      bundle,
      enableGuidance: false,
    });
    expect(claims).toHaveLength(0);
    expect(rejected).toContainEqual({ id: 'c1', reason: 'residual-value-token' });
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
});
