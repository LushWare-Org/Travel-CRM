import { describe, it, expect } from 'vitest';
import { unwrapList } from '../apiResponse';

describe('unwrapList', () => {
  it('returns the flat data array and top-level pagination', () => {
    const response = {
      status: 'success',
      data: [{ id: '1' }, { id: '2' }],
      pagination: { total: 2, page: 1, limit: 10, pages: 1 },
    };

    expect(unwrapList(response)).toEqual({
      items: [{ id: '1' }, { id: '2' }],
      pagination: { total: 2, page: 1, limit: 10, pages: 1 },
    });
  });

  it('returns an empty items array when data is not an array (regression for the nested { data: { users } } shape)', () => {
    const response = { status: 'success', data: { users: [{ id: '1' }] } };

    expect(unwrapList(response).items).toEqual([]);
  });

  it('returns null pagination when the response has none', () => {
    const response = { status: 'success', data: [] };

    expect(unwrapList(response).pagination).toBeNull();
  });

  it('handles a null/undefined response without throwing', () => {
    expect(unwrapList(undefined)).toEqual({ items: [], pagination: null });
    expect(unwrapList(null)).toEqual({ items: [], pagination: null });
  });
});
