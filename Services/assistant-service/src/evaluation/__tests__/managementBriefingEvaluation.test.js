import { describe, it, expect, vi } from 'vitest';
import { leadsAdapter } from '../../adapters/leads.adapter.js';
import { insightsToClaims } from '../../ai/groundingValidator.js';
import {
  ManagementBriefingCannedRowSchema,
  evaluateCannedBriefing,
  judgeBriefingSubstance,
  summarizeBriefingEvaluation,
} from '../managementBriefingEvaluation.js';
import { CANNED_MANAGEMENT_BRIEFINGS } from './fixtures/managementBriefing.canned.js';

const ctx = {
  user: { id: 'rep-1', role: 'salesRep', permissions: [] },
  headers: { 'x-user-id': 'rep-1', 'x-user-role': 'salesRep', 'x-user-permissions': '[]', 'x-user-is-super-admin': 'false' },
};

async function loadBundleFor(lead) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: lead }),
  });
  return leadsAdapter.loadEvidence(ctx, { leadId: lead.id });
}

describe('management briefing content gate', () => {
  it('fixtures conform to the canned row schema', () => {
    for (const row of CANNED_MANAGEMENT_BRIEFINGS) {
      expect(() => ManagementBriefingCannedRowSchema.parse(row)).not.toThrow();
    }
  });

  for (const row of CANNED_MANAGEMENT_BRIEFINGS) {
    it(`${row.id} — ${row.description ?? 'canned briefing'}`, async () => {
      const bundle = await loadBundleFor(row.lead);
      const result = evaluateCannedBriefing(row, { bundle, adapter: leadsAdapter });
      expect(result.failureKeys).toEqual([...row.expectedFailures].sort());
      expect(result.passed).toBe(row.expectedFailures.length === 0);
    });
  }

  it('fails a technically grounded but substantively empty briefing', async () => {
    const row = CANNED_MANAGEMENT_BRIEFINGS.find((item) => item.id === 'grounded-but-empty');
    const bundle = await loadBundleFor(row.lead);
    const result = evaluateCannedBriefing(row, { bundle, adapter: leadsAdapter });

    // Every claim passed the real validator — grounding alone is not the bar.
    expect(result.acceptedClaims.map((claim) => claim.id)).toEqual(['c-empty-1', 'c-empty-2']);
    expect(result.passed).toBe(false);
    expect(result.failureKeys).toEqual(['c-empty-1:empty-claim', 'c-empty-2:empty-claim']);
  });

  it('requires a field citation, so claims cannot lean on non-field evidence', async () => {
    const row = CANNED_MANAGEMENT_BRIEFINGS.find((item) => item.id === 'substantive-briefing');
    const loaded = await loadBundleFor(row.lead);
    const bundle = {
      ...loaded,
      evidence: [
        ...loaded.evidence,
        { id: 'metric:conv', type: 'computed', label: 'Conversion rate', value: { conversionRate: 0.64 }, asOf: row.boundary },
      ],
    };
    const judged = judgeBriefingSubstance({
      claims: [
        {
          id: 'c-metric',
          section: 'experienced_view',
          text: 'Conversion rate is strong.',
          facts: [],
          evidenceIds: ['metric:conv'],
          evidenceType: 'computed',
          severity: 'info',
        },
      ],
      bundle,
      boundary: new Date(row.boundary),
    });
    expect(judged.passed).toBe(false);
    expect(judged.failures).toEqual([{ claimId: 'c-metric', reason: 'no-field-citation' }]);
  });

  it('passes the adapter deterministic insight rules for a changed, stale lead', async () => {
    const bundle = await loadBundleFor({
      id: 'lead-9',
      lifecycleStatus: 'NEW',
      assignedToId: null,
      name: 'Sam',
      destination: 'Kandy',
      budget: 120000,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2026-09-08T00:00:00Z',
    });
    const boundary = new Date('2026-09-05T00:00:00Z');
    const insights = leadsAdapter.computeInsights(bundle, boundary);
    expect(insights.map((insight) => insight.id).sort()).toEqual([
      'lead-changed',
      'lead-freshness',
      'lead-stale',
      'lead-status',
    ]);

    const judged = judgeBriefingSubstance({ claims: insightsToClaims(insights), bundle, boundary });
    expect(judged.failures).toEqual([]);
    expect(judged.passed).toBe(true);
  });

  it('passes the adapter deterministic insight rules for an unclaimed lead', async () => {
    const bundle = await loadBundleFor({
      id: 'lead-10',
      lifecycleStatus: 'PENDING_VERIFICATION',
      assignedToId: null,
      name: 'Sam',
      destination: 'Kandy',
      budget: 120000,
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z',
    });
    const boundary = new Date('2026-09-05T00:00:00Z');
    const insights = leadsAdapter.computeInsights(bundle, boundary);
    expect(insights.some((insight) => insight.id === 'lead-unclaimed')).toBe(true);

    const judged = judgeBriefingSubstance({ claims: insightsToClaims(insights), bundle, boundary });
    expect(judged.failures).toEqual([]);
    expect(judged.passed).toBe(true);
  });

  it('rolls fixture results into a gate verdict', async () => {
    const results = [];
    for (const row of CANNED_MANAGEMENT_BRIEFINGS) {
      const bundle = await loadBundleFor(row.lead);
      results.push(evaluateCannedBriefing(row, { bundle, adapter: leadsAdapter }));
    }
    const summary = summarizeBriefingEvaluation(results);
    expect(summary.total).toBe(CANNED_MANAGEMENT_BRIEFINGS.length);
    expect(summary.failed).toContain('grounded-but-empty');
    expect(summary.failed).toContain('changed-outside-window');
    expect(summary.failed).toContain('legacy-composite-evidence-id');
    expect(summary.gate).toBe('fail');
  });
});
