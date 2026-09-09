import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leadsAdapter } from '../leads.adapter.js';

const ctx = {
  user: { id: 'rep-1', role: 'salesRep', permissions: [] },
  headers: { 'x-user-id': 'rep-1', 'x-user-role': 'salesRep', 'x-user-permissions': '[]', 'x-user-is-super-admin': 'false' },
};

const scope = { leadId: 'lead-1' };

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
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates a 403 into notAuthorizedSources (no evidence)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const bundle = await leadsAdapter.loadEvidence(ctx, scope);
    expect(bundle.notAuthorizedSources).toContain('leads');
    expect(bundle.evidence).toHaveLength(0);
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

  it('serializes an allowlisted lead record into evidence', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: 'lead-1', lifecycleStatus: 'NEW', assignedToId: 'rep-1', name: 'Jane', destination: 'Bali', budget: 450000, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-08T00:00:00Z', passwordHash: 'SHOULD-NOT-LEAK', bankDetails: 'SHOULD-NOT-LEAK' },
      }),
    });
    const bundle = await leadsAdapter.loadEvidence(ctx, scope);
    expect(bundle.evidence).toHaveLength(1);
    const item = bundle.evidence[0];
    expect(item.type).toBe('record');
    // Field allowlist: sensitive fields must be excluded before the model sees them.
    expect(JSON.stringify(item.value)).not.toContain('passwordHash');
    expect(JSON.stringify(item.value)).not.toContain('bankDetails');
    expect(item.value).toMatchObject({ id: 'lead-1', lifecycleStatus: 'NEW' });
  });
});

describe('leadsAdapter.computeInsights', () => {
  it('returns an empty list for an empty bundle', () => {
    const bundle = { evidence: [] };
    expect(leadsAdapter.computeInsights(bundle, new Date())).toEqual([]);
  });

  it('flags a PENDING_VERIFICATION lead as unclaimed', () => {
    const bundle = {
      evidence: [{ id: 'lead:1', type: 'record', label: 'Lead 1', value: { id: '1', lifecycleStatus: 'PENDING_VERIFICATION' }, asOf: '2026-09-09T00:00:00Z' }],
    };
    const insights = leadsAdapter.computeInsights(bundle, new Date());
    expect(insights.some((i) => i.id === 'lead-unclaimed')).toBe(true);
  });
});
