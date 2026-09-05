import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchPolicyDocuments, _resetPolicyDocumentsCache } from '../src/index.js';

function mockFetch(documents, { ok = true } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => ({ data: { documents } }),
  });
}

describe('fetchPolicyDocuments', () => {
  beforeEach(() => {
    _resetPolicyDocumentsCache();
  });

  it('returns the documents from a successful fetch', async () => {
    const fetchImpl = mockFetch([{ id: 'd1', title: 'A', body: 'x' }]);
    const docs = await fetchPolicyDocuments({ fetchImpl });
    expect(docs).toEqual([{ id: 'd1', title: 'A', body: 'x' }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caches the result for subsequent calls within the TTL', async () => {
    const fetchImpl = mockFetch([{ id: 'd1', title: 'A', body: 'x' }]);
    await fetchPolicyDocuments({ fetchImpl });
    await fetchPolicyDocuments({ fetchImpl });
    await fetchPolicyDocuments({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache when skipCache is true', async () => {
    const fetchImpl = mockFetch([{ id: 'd1', title: 'A', body: 'x' }]);
    await fetchPolicyDocuments({ fetchImpl });
    await fetchPolicyDocuments({ fetchImpl, skipCache: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('returns [] when the response is not ok and there is no prior cache', async () => {
    const fetchImpl = mockFetch([], { ok: false });
    const docs = await fetchPolicyDocuments({ fetchImpl });
    expect(docs).toEqual([]);
  });

  it('returns [] when the response body is malformed and there is no prior cache', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await fetchPolicyDocuments({ fetchImpl })).toEqual([]);
  });

  it('falls back to the last-known-good cache when a later fetch throws', async () => {
    const goodFetch = mockFetch([{ id: 'd1', title: 'A', body: 'x' }]);
    await fetchPolicyDocuments({ fetchImpl: goodFetch });

    const throwingFetch = vi.fn().mockRejectedValue(new Error('network down'));
    const docs = await fetchPolicyDocuments({ fetchImpl: throwingFetch, skipCache: true });
    expect(docs).toEqual([{ id: 'd1', title: 'A', body: 'x' }]);
  });

  it('returns [] when a fetch throws and there is no prior cache', async () => {
    _resetPolicyDocumentsCache();
    const throwingFetch = vi.fn().mockRejectedValue(new Error('network down'));
    const docs = await fetchPolicyDocuments({ fetchImpl: throwingFetch });
    expect(docs).toEqual([]);
  });
});
