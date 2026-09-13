import { describe, it, expect } from 'vitest';
import {
  collectionEntityRef,
  groupEntityRef,
  modelClaimKey,
  normalizeEntityRef,
  parseLegacyInsightId,
  recordEntityRef,
  stableKey,
} from '../keys.js';

describe('normalizeEntityRef', () => {
  it('accepts the three kinds and trims nothing it should not', () => {
    expect(normalizeEntityRef({ kind: 'record', id: 'lead-1' })).toEqual({ kind: 'record', id: 'lead-1' });
    expect(normalizeEntityRef({ kind: 'group', id: 'leads:destination:Bali' }).kind).toBe('group');
    expect(normalizeEntityRef({ kind: 'collection', id: 'leads:leads' }).kind).toBe('collection');
  });

  it('returns null for an unusable ref rather than throwing, so the gate can record a decision', () => {
    expect(normalizeEntityRef(null)).toBeNull();
    expect(normalizeEntityRef(undefined)).toBeNull();
    expect(normalizeEntityRef('lead-1')).toBeNull();
    expect(normalizeEntityRef(['record', 'lead-1'])).toBeNull();
    expect(normalizeEntityRef({ kind: 'customer', id: 'c-1' })).toBeNull();
    expect(normalizeEntityRef({ kind: 'record', id: '' })).toBeNull();
    expect(normalizeEntityRef({ kind: 'record', id: '   ' })).toBeNull();
    expect(normalizeEntityRef({ kind: 'record', id: 'x'.repeat(513) })).toBeNull();
  });
});

describe('entity ref constructors', () => {
  it('builds the documented id shapes', () => {
    expect(recordEntityRef('lead-1')).toEqual({ kind: 'record', id: 'lead-1' });
    expect(groupEntityRef({ source: 'leads', groupBy: 'destination', key: 'Bali' })).toEqual({
      kind: 'group',
      id: 'leads:destination:Bali',
    });
    expect(collectionEntityRef({ pageKey: 'billing', source: 'invoices' })).toEqual({
      kind: 'collection',
      id: 'billing:invoices',
    });
  });

  it('returns null when a constructor is handed nothing usable', () => {
    expect(recordEntityRef(null)).toBeNull();
    expect(groupEntityRef({ source: 'leads', groupBy: 'destination', key: '' })).toBeNull();
  });
});

describe('stableKey', () => {
  it('composes rule, kind and id', () => {
    expect(stableKey({ ruleId: 'unassigned', entityRef: recordEntityRef('lead-1') })).toBe('unassigned:record:lead-1');
    expect(stableKey({ ruleId: 'groupedCount', entityRef: groupEntityRef({ source: 'leads', groupBy: 'destination', key: 'Bali' }) })).toBe(
      'groupedCount:group:leads:destination:Bali',
    );
  });

  it('is unchanged by a descriptor reorder, which is the whole reason it exists', () => {
    // Today's ids come from `prefix(declarationIndex)`, so moving a rule in the
    // array renames every insight it produces. The stable key does not move.
    const beforeReorder = stableKey({ ruleId: 'unassigned', entityRef: recordEntityRef('lead-1') });
    const afterReorder = stableKey({ ruleId: 'unassigned', entityRef: recordEntityRef('lead-1') });

    expect(afterReorder).toBe(beforeReorder);
    // The two id shapes must stay tellable apart: a stable key never begins with
    // a declaration index, which is what lets the engine read old ids during the
    // transition without mistaking a new one for an old one.
    expect(/^\d+:/.test(beforeReorder)).toBe(false);
    expect(parseLegacyInsightId('3:unassigned')).toEqual({ declarationIndex: 3, ruleId: 'unassigned' });
  });

  it('returns null when the rule id or the ref is unusable', () => {
    expect(stableKey({ ruleId: '', entityRef: recordEntityRef('lead-1') })).toBeNull();
    expect(stableKey({ ruleId: 'unassigned', entityRef: null })).toBeNull();
    expect(stableKey({ ruleId: 'unassigned', entityRef: { kind: 'record', id: '' } })).toBeNull();
  });
});

describe('modelClaimKey', () => {
  it('is stable for the same prose and evidence', () => {
    const first = modelClaimKey({ text: 'Bali leads demand.', evidenceIds: ['a', 'b'] });
    const second = modelClaimKey({ text: 'Bali leads demand.', evidenceIds: ['b', 'a'] });

    expect(first).toBe(second);
    expect(first).toMatch(/^model:[0-9a-f]{24}$/);
  });

  it('ignores case and whitespace, so a rephrasing that is not a change is not treated as new', () => {
    const first = modelClaimKey({ text: 'Bali   LEADS demand.', evidenceIds: [] });
    const second = modelClaimKey({ text: 'bali leads demand.', evidenceIds: [] });

    expect(first).toBe(second);
  });

  it('changes when the claim or its evidence changes', () => {
    const base = modelClaimKey({ text: 'Bali leads demand.', evidenceIds: ['a'] });

    expect(modelClaimKey({ text: 'Goa leads demand.', evidenceIds: ['a'] })).not.toBe(base);
    expect(modelClaimKey({ text: 'Bali leads demand.', evidenceIds: ['a', 'b'] })).not.toBe(base);
  });

  it('returns null for a claim with neither prose nor evidence', () => {
    expect(modelClaimKey({ text: '', evidenceIds: [] })).toBeNull();
    expect(modelClaimKey({})).toBeNull();
  });
});

describe('parseLegacyInsightId', () => {
  it('reads the index-prefixed shape the engine emits today', () => {
    expect(parseLegacyInsightId('3:unassigned')).toEqual({ declarationIndex: 3, ruleId: 'unassigned' });
  });

  it('returns null for anything else', () => {
    expect(parseLegacyInsightId('unassigned')).toBeNull();
    expect(parseLegacyInsightId('')).toBeNull();
    expect(parseLegacyInsightId(null)).toBeNull();
  });
});
