import { describe, it, expect } from 'vitest';
import { validateClaims, buildSources, insightsToClaims } from '../groundingValidator.js';

const bundle = {
  context: { pageKey: 'leads', scopeLabel: 'Lead 1', actorRole: 'salesRep', asOf: '2026-09-09T00:00:00Z' },
  evidence: [
    { id: 'lead:1', type: 'record', label: 'Lead 1', value: { id: '1', lifecycleStatus: 'NEW', budget: 450000 }, asOf: '2026-09-09T00:00:00Z' },
    { id: 'metric:conv', type: 'computed', label: 'Conversion rate', value: { conversionRate: 0.64 }, asOf: '2026-09-09T00:00:00Z' },
  ],
  deterministicInsights: [],
  unavailableSources: [],
  notAuthorizedSources: [],
};

function claim(overrides = {}) {
  return {
    id: 'c1',
    section: 'attention',
    text: 'Follow-up overdue.',
    facts: [],
    evidenceIds: ['lead:1'],
    evidenceType: 'computed',
    severity: 'warning',
    ...overrides,
  };
}

describe('validateClaims', () => {
  it('accepts a grounded claim', () => {
    const { claims, rejected } = validateClaims({ claims: [claim()], bundle, enableGuidance: false });
    expect(claims).toHaveLength(1);
    expect(rejected).toHaveLength(0);
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

  it('drops a fact whose value is not grounded in cited evidence', () => {
    const { claims } = validateClaims({
      claims: [claim({ facts: [{ kind: 'amount', value: '999999', evidenceId: 'lead:1' }] })],
      bundle,
      enableGuidance: false,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].facts).toHaveLength(0);
  });

  it('keeps a fact whose value appears in cited evidence', () => {
    const { claims } = validateClaims({
      claims: [claim({ facts: [{ kind: 'amount', value: '450000', evidenceId: 'lead:1' }] })],
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
  it('builds server-owned sources from accepted evidence IDs only', () => {
    const accepted = [claim({ evidenceIds: ['lead:1'] })];
    const sources = buildSources(accepted, bundle);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: 'lead:1', label: 'Lead 1', type: 'record' });
  });

  it('does not emit sources for evidence IDs that were not accepted', () => {
    const sources = buildSources([], bundle);
    expect(sources).toHaveLength(0);
  });
});

describe('insightsToClaims', () => {
  it('converts a deterministic insight into a claim', () => {
    const claims = insightsToClaims([
      { id: 'i1', section: 'current_state', severity: 'info', text: 'Lead is NEW', evidenceIds: ['lead:1'] },
    ]);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ id: 'i1', section: 'current_state', evidenceType: 'computed' });
  });
});
