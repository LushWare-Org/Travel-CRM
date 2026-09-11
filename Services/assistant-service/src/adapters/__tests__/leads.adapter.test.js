import { describe, it, expect, vi } from 'vitest';
import { LEAD_COPILOT_FIELDS, leadEvidenceId } from '@travel-crm/contracts';
import { leadsAdapter } from '../leads.adapter.js';
import { leadsPageAdapter } from '../pages/leads.adapter.js';
import { leadsCollectionAdapter } from '../pages/leadsCollection.adapter.js';

const ctx = {
  user: { id: 'rep-1', role: 'salesRep', permissions: [] },
  headers: { 'x-user-id': 'rep-1', 'x-user-role': 'salesRep', 'x-user-permissions': '[]', 'x-user-is-super-admin': 'false' },
};

const scope = { leadId: 'lead-1' };

const LEAD = {
  id: 'lead-1',
  lifecycleStatus: 'NEW',
  assignedToId: 'rep-1',
  name: 'Jane',
  destination: 'Bali',
  budget: 450000,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-08T00:00:00Z',
  passwordHash: 'SHOULD-NOT-LEAK',
  bankDetails: 'SHOULD-NOT-LEAK',
};

function stubLead(lead) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: lead }),
  });
}

async function bundleFor(lead = LEAD) {
  stubLead(lead);
  return leadsAdapter.loadEvidence(ctx, scope);
}

const expectedFieldIds = (lead) =>
  LEAD_COPILOT_FIELDS.filter((field) => lead[field] !== null && lead[field] !== undefined).map((field) =>
    leadEvidenceId(lead.id, field),
  );

describe('leadsAdapter.parseScope', () => {
  it('accepts a valid single-lead scope', () => {
    expect(leadsAdapter.parseScope({ leadId: 'lead-1' })).toEqual({ leadId: 'lead-1' });
  });

  it('rejects a scope with unknown fields', () => {
    expect(() => leadsAdapter.parseScope({ leadId: 'lead-1', bogus: true })).toThrow(/Invalid leads scope/);
  });

  it('rejects a missing leadId', () => {
    expect(() => leadsAdapter.parseScope({})).toThrow(/Invalid leads scope/);
  });
});

describe('leadsAdapter.loadEvidence', () => {
  it('propagates a 403 into notAuthorizedSources (no evidence)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const bundle = await leadsAdapter.loadEvidence(ctx, scope);
    expect(bundle.notAuthorizedSources).toContain('leads');
    expect(bundle.evidence).toHaveLength(0);
    expect(bundle.record).toBeNull();
  });

  it('propagates a 404 into notAuthorizedSources', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const bundle = await leadsAdapter.loadEvidence(ctx, scope);
    expect(bundle.notAuthorizedSources).toContain('leads');
  });

  it('records a 5xx into unavailableSources (not authorized denial)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const bundle = await leadsAdapter.loadEvidence(ctx, scope);
    expect(bundle.unavailableSources).toContain('leads');
    expect(bundle.notAuthorizedSources).toHaveLength(0);
  });

  it('emits one scalar citation-only item per non-null allowlisted field', async () => {
    const bundle = await bundleFor();
    expect(bundle.evidence.map((item) => item.id).sort()).toEqual(expectedFieldIds(LEAD).sort());
    for (const item of bundle.evidence) {
      expect(item.type).toBe('record');
      expect(item.recordRef).toEqual({ kind: 'lead', id: 'lead-1' });
      expect(item.fieldPaths).toHaveLength(1);
      // Field items are citation-only: value must be a scalar, never the record.
      expect(['string', 'number', 'boolean']).toContain(typeof item.value);
      expect(item.updatedAt).toBe(LEAD.updatedAt);
    }
  });

  it('drift guard: emitted field IDs equal leadEvidenceId over LEAD_COPILOT_FIELDS', async () => {
    const bundle = await bundleFor();
    const emitted = new Set(bundle.evidence.map((item) => item.id));
    // The record surface publishes the same set through the shared producer.
    const expected = new Set(expectedFieldIds(LEAD));
    expect(emitted).toEqual(expected);
    expect(emitted).toEqual(new Set(LEAD_COPILOT_FIELDS.map((field) => leadEvidenceId(LEAD.id, field))));
  });

  it('removes the legacy composite lead:<id> evidence item', async () => {
    const bundle = await bundleFor();
    expect(bundle.evidence.some((item) => item.id === `lead:${LEAD.id}`)).toBe(false);
  });

  it('excludes non-allowlisted fields and holds the fetched record on bundle.record', async () => {
    const bundle = await bundleFor();
    expect(JSON.stringify(bundle.evidence)).not.toContain('passwordHash');
    expect(JSON.stringify(bundle.evidence)).not.toContain('bankDetails');
    expect(bundle.record).toMatchObject({ id: 'lead-1', lifecycleStatus: 'NEW' });
    // The record is minimised too: it is never the raw fetch payload.
    expect(bundle.record).not.toHaveProperty('passwordHash');
    expect(bundle.record).not.toHaveProperty('bankDetails');
  });

  it('skips null allowlisted fields instead of emitting non-scalar holes', async () => {
    const bundle = await bundleFor({ ...LEAD, assignedToId: null });
    expect(bundle.evidence.some((item) => item.id === leadEvidenceId('lead-1', 'assignedToId'))).toBe(false);
    expect(bundle.evidence).toHaveLength(LEAD_COPILOT_FIELDS.length - 1);
  });
});

describe('leadsAdapter.computeInsights', () => {
  it('returns an empty list without a fetched record', () => {
    expect(leadsAdapter.computeInsights({ record: null, evidence: [] }, new Date())).toEqual([]);
  });

  it('emits a changed insight only when updatedAt is at or after the resolved boundary', async () => {
    const bundle = await bundleFor(); // updatedAt 2026-09-08
    const inWindow = leadsAdapter.computeInsights(bundle, new Date('2026-09-05T00:00:00Z'));
    expect(inWindow.some((insight) => insight.id === 'lead-changed')).toBe(true);

    const exactlyAtBoundary = leadsAdapter.computeInsights(bundle, new Date('2026-09-08T00:00:00Z'));
    expect(exactlyAtBoundary.some((insight) => insight.id === 'lead-changed')).toBe(true);

    const outOfWindow = leadsAdapter.computeInsights(bundle, new Date('2026-09-09T00:00:00Z'));
    expect(outOfWindow.some((insight) => insight.id === 'lead-changed')).toBe(false);
  });

  it('cites the field-specific evidence id that grounds each insight', async () => {
    const bundle = await bundleFor({ ...LEAD, lifecycleStatus: 'PENDING_VERIFICATION' });
    const insights = leadsAdapter.computeInsights(bundle, new Date('2026-09-05T00:00:00Z'));
    const unclaimed = insights.find((insight) => insight.id === 'lead-unclaimed');
    expect(unclaimed.evidenceIds).toEqual([leadEvidenceId('lead-1', 'lifecycleStatus')]);

    const changed = insights.find((insight) => insight.id === 'lead-changed');
    expect(changed.evidenceIds).toEqual([leadEvidenceId('lead-1', 'updatedAt')]);

    for (const insight of insights) {
      for (const id of insight.evidenceIds) {
        expect(bundle.evidence.some((item) => item.id === id)).toBe(true);
      }
    }
  });

  it('flags a PENDING_VERIFICATION lead as unclaimed', async () => {
    const bundle = await bundleFor({ ...LEAD, lifecycleStatus: 'PENDING_VERIFICATION' });
    const insights = leadsAdapter.computeInsights(bundle, new Date());
    expect(insights.some((insight) => insight.id === 'lead-unclaimed')).toBe(true);
  });

  it('keeps the 7-day freshness warning now-relative, in the attention section', async () => {
    const stale = await bundleFor({ ...LEAD, updatedAt: '2020-01-02T00:00:00Z' });
    const insights = leadsAdapter.computeInsights(stale, new Date());
    const freshness = insights.find((insight) => insight.id === 'lead-freshness');
    expect(freshness.section).toBe('attention');
    expect(freshness.severity).toBe('warning');

    const fresh = await bundleFor({ ...LEAD, updatedAt: new Date().toISOString() });
    expect(leadsAdapter.computeInsights(fresh, new Date()).find((i) => i.id === 'lead-freshness').severity).toBe('info');
  });

  it('keeps the 7-day stale attention warning now-relative', async () => {
    const stale = await bundleFor({ ...LEAD, createdAt: '2020-01-01T00:00:00Z', updatedAt: new Date().toISOString() });
    expect(leadsAdapter.computeInsights(stale, new Date()).find((i) => i.id === 'lead-stale').severity).toBe('warning');

    const fresh = await bundleFor({ ...LEAD, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    expect(leadsAdapter.computeInsights(fresh, new Date()).some((i) => i.id === 'lead-stale')).toBe(false);
  });
});

describe('leadsAdapter.defaultQuestions', () => {
  it('reads the fetched record, not the field evidence items', async () => {
    const bundle = await bundleFor({ ...LEAD, lifecycleStatus: 'CONVERTED' });
    expect(leadsAdapter.defaultQuestions(bundle)[0]).toContain('CONVERTED');
  });

  it('returns no questions without a fetched record', () => {
    expect(leadsAdapter.defaultQuestions({ record: null, evidence: [] })).toEqual([]);
  });
});

describe('leads ask vocabulary is resolved per scope (S6)', () => {
  it('gives a record scope the record vocabulary', () => {
    expect(leadsPageAdapter.askTools({ leadId: 'lead-1' })).toEqual(['getLead', 'listLeads']);
    expect(leadsAdapter.askTools({ leadId: 'lead-1' })).toEqual(['getLead', 'listLeads']);
  });

  it('gives the collection scope the collection vocabulary, without getLead', () => {
    expect(leadsPageAdapter.askTools({})).toEqual(['listLeads']);
    expect(leadsCollectionAdapter.askTools({})).toEqual(['listLeads']);
  });

  it('discriminates on the scope, not the page key', () => {
    // `/leads` is one key with two vocabularies; a key-based resolution cannot
    // express that and would leak getLead onto the collection scope.
    expect(leadsPageAdapter.askTools({ leadId: 'lead-1' })).not.toEqual(leadsPageAdapter.askTools({}));
  });

  it('treats a blank leadId as the collection scope, the same branch loadEvidence uses', () => {
    expect(leadsPageAdapter.askTools({ leadId: '   ' })).toEqual(['listLeads']);
  });
});
