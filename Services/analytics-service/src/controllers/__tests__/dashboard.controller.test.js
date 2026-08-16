import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPool } = vi.hoisted(() => ({ mockPool: { query: vi.fn() } }));
vi.mock('../../db/pool.js', () => ({ default: mockPool }));

const { getDashboardStats } = await import('../dashboard.controller.js');

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const rows = (r) => ({ rows: r });

describe('getDashboardStats', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('queries lifecycleStatus (not the removed status column) and returns real counts', async () => {
    mockPool.query
      .mockResolvedValueOnce(rows([{ total: '10', new_leads: '3', converted: '2' }]))
      .mockResolvedValueOnce(rows([{ total: '5', confirmed: '3', pending: '2' }]))
      .mockResolvedValueOnce(rows([{ total_revenue: '9000', collected: '7000' }]))
      .mockResolvedValueOnce(rows([{ total: '4', published: '4' }]))
      .mockResolvedValueOnce(rows([{ id: 'lead-1', name: 'Jane', email: 'j@test.com', status: 'NEW' }]))
      .mockResolvedValueOnce(rows([{ id: 'b1', packageName: 'Bali Escape' }]))
      .mockResolvedValueOnce(rows([{ status: 'NEW', count: '3' }]));

    const res = mockRes();
    await getDashboardStats({}, res, vi.fn());

    const data = res.json.mock.calls[0][0].data;
    expect(data.leads).toEqual({ total: 10, new: 3, converted: 2 });
    expect(data.bookings).toEqual({ total: 5, confirmed: 3, pending: 2 });
    expect(data.revenue).toEqual({ total: 9000, collected: 7000 });
    expect(data.packages).toEqual({ total: 4, published: 4 });
    expect(data.recentLeads).toHaveLength(1);
    expect(data.recentBookings[0].packageName).toBe('Bali Escape');
    expect(data.leadsByStatus).toEqual([{ status: 'NEW', count: '3' }]);

    for (const call of mockPool.query.mock.calls) {
      expect(call[0]).not.toMatch(/\bstatus\s*=\s*'new'/i);
      expect(call[0]).not.toMatch(/\bstatus\s*=\s*'converted'/i);
      expect(call[0]).not.toMatch(/p\.name/);
    }
  });

  it('does not error and reports 0 revenue when there is no billing data (SUM returns NULL)', async () => {
    mockPool.query
      .mockResolvedValueOnce(rows([{ total: '0', new_leads: '0', converted: '0' }]))
      .mockResolvedValueOnce(rows([{ total: '0', confirmed: '0', pending: '0' }]))
      .mockResolvedValueOnce(rows([{ total_revenue: null, collected: null }]))
      .mockResolvedValueOnce(rows([{ total: '0', published: '0' }]))
      .mockResolvedValueOnce(rows([]))
      .mockResolvedValueOnce(rows([]))
      .mockResolvedValueOnce(rows([]));

    const res = mockRes();
    await getDashboardStats({}, res, vi.fn());

    expect(res.json.mock.calls[0][0].data.revenue).toEqual({ total: 0, collected: 0 });
  });
});
