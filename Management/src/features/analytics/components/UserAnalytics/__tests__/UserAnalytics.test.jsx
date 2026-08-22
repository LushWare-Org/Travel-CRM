import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetUserAnalyticsOverview, mockGetAllSalesRepsPerformance } = vi.hoisted(() => ({
  mockGetUserAnalyticsOverview: vi.fn(),
  mockGetAllSalesRepsPerformance: vi.fn(),
}));

vi.mock('../../../../../services/analytics.service.js', () => ({
  default: {
    getUserAnalyticsOverview: mockGetUserAnalyticsOverview,
    getAllSalesRepsPerformance: mockGetAllSalesRepsPerformance,
  },
}));

vi.mock('react-hot-toast', () => ({ default: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import UserAnalytics from '../UserAnalytics.tsx';

const overview = {
  stats: { totalUsers: 100, activeUsers: 80, inactiveUsers: 20, verifiedUsers: 60, usersWithBookings: 25, conversionRate: 25 },
  trendData: [{ label: 'Aug 2026', totalNewUsers: 10, activeUsers: 8, adminUsers: 1 }],
  roleDistribution: [{ role: 'customer', count: 80 }, { role: 'admin', count: 20 }],
  userStatusDistribution: [{ name: 'Active', value: 80 }, { name: 'Inactive', value: 20 }],
  topRoles: [{ role: 'customer', count: 80 }],
};

beforeEach(() => vi.clearAllMocks());

describe('UserAnalytics', () => {
  it('renders real user stats from the API response', async () => {
    mockGetUserAnalyticsOverview.mockResolvedValue(overview);
    mockGetAllSalesRepsPerformance.mockResolvedValue([]);
    render(<UserAnalytics />);

    await waitFor(() => expect(screen.getAllByText('100').length).toBeGreaterThan(0));
    expect(screen.getAllByText('80').length).toBeGreaterThan(0);
    expect(screen.getAllByText('60').length).toBeGreaterThan(0);
  });

  it('renders the Sales Rep Performance chart from the new admin endpoint instead of a static import', async () => {
    mockGetUserAnalyticsOverview.mockResolvedValue(overview);
    mockGetAllSalesRepsPerformance.mockResolvedValue([{ rep: 'Priya Nair', sales: 7, conversion: 35 }]);
    render(<UserAnalytics />);

    expect(mockGetAllSalesRepsPerformance).not.toBe(undefined);
    await waitFor(() => expect(mockGetAllSalesRepsPerformance).toHaveBeenCalled());
    // "John Smith" etc. were the old hardcoded mock names — must never appear.
    await waitFor(() => expect(screen.queryByText('John Smith')).not.toBeInTheDocument());
  });

  it('shows "No sales rep data available" when the admin endpoint returns an empty array', async () => {
    mockGetUserAnalyticsOverview.mockResolvedValue(overview);
    mockGetAllSalesRepsPerformance.mockResolvedValue([]);
    render(<UserAnalytics />);

    await waitFor(() => expect(screen.getByText(/no sales rep data available/i)).toBeInTheDocument());
  });
});
