import { describe, it, expect, vi } from 'vitest';
import { fetchPolicyDocuments } from '../policyDocuments.js';

function fakeResponse({ ok = true, documents = [] } = {}) {
  return { ok, json: async () => ({ status: 'success', data: { documents } }) };
}

describe('fetchPolicyDocuments', () => {
  it('returns the documents array from a successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ documents: [{ id: 'doc-1', title: 'Refunds', body: 'text' }] }));
    const result = await fetchPolicyDocuments({ fetchImpl });
    expect(result).toEqual([{ id: 'doc-1', title: 'Refunds', body: 'text' }]);
  });

  it('returns [] without throwing when user-service responds with a non-2xx status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ ok: false }));
    expect(await fetchPolicyDocuments({ fetchImpl })).toEqual([]);
  });

  it('returns [] without throwing when the fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    expect(await fetchPolicyDocuments({ fetchImpl })).toEqual([]);
  });

  it('returns [] when the response body is malformed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await fetchPolicyDocuments({ fetchImpl })).toEqual([]);
  });
});
