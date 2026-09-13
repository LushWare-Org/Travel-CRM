import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('../api', () => ({
  default: { get: mockGet },
}));

import adminService from '../admin.service';

describe('adminService.getAllAdmins', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('merges admin and superAdmin lists, superAdmins first', async () => {
    mockGet.mockImplementation((_endpoint, params) => {
      if (params.role === 'superAdmin') {
        return Promise.resolve({ status: 'success', data: [{ id: 'sa-1' }], pagination: { total: 1, page: 1, limit: 100, pages: 1 } });
      }
      return Promise.resolve({ status: 'success', data: [{ id: 'a-1' }], pagination: { total: 1, page: 1, limit: 100, pages: 1 } });
    });

    const result = await adminService.getAllAdmins();

    expect(result.data.users).toEqual([{ id: 'sa-1' }, { id: 'a-1' }]);
  });

  it('reads pagination from the top level of the raw envelope, not data.pagination (regression)', async () => {
    mockGet.mockResolvedValue({
      status: 'success',
      data: [{ id: 'a-1' }],
      pagination: { total: 5, page: 1, limit: 100, pages: 1 },
    });

    const result = await adminService.getAllAdmins();

    expect(result.data.pagination).toEqual({ total: 5, page: 1, limit: 100, pages: 1 });
  });

  it('falls back to a computed total when the backend sends no pagination', async () => {
    mockGet.mockResolvedValue({ status: 'success', data: [{ id: 'a-1' }] });

    const result = await adminService.getAllAdmins();

    expect(result.data.pagination).toEqual({ total: 2 });
  });
});
