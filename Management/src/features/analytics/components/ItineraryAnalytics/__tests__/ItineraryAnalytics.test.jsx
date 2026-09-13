import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetPackageAnalyticsOverview } = vi.hoisted(() => ({ mockGetPackageAnalyticsOverview: vi.fn() }));

vi.mock('../../../../../services/analytics.service.js', () => ({
  default: { getPackageAnalyticsOverview: mockGetPackageAnalyticsOverview },
}));

vi.mock('@/lib/toast', () => ({ default: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import PackageAnalytics from '../ItineraryAnalytics.tsx';

const overview = {
  stats: { totalItineraries: 18, totalInquiries: 40, totalConversions: 9 },
  trend: [{ month: 'Aug 2026', inquiries: 40, conversions: 9 }],
  destinationPerformance: [{ destination: 'Bali', inquiries: 20, conversions: 5 }],
  mostInquired: [{ name: 'Bali Escape', inquiries: 20, conversions: 5 }],
};

beforeEach(() => vi.clearAllMocks());

describe('PackageAnalytics (ItineraryAnalytics)', () => {
  it('renders real inquiry/conversion totals from the Lead→Package join, not the old totalItineraries=0 default', async () => {
    mockGetPackageAnalyticsOverview.mockResolvedValue(overview);
    render(<PackageAnalytics />);

    await waitFor(() => expect(screen.getByText('18')).toBeInTheDocument());
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('renders the top package name from mostInquired', async () => {
    mockGetPackageAnalyticsOverview.mockResolvedValue(overview);
    render(<PackageAnalytics />);

    await waitFor(() => expect(screen.getByText('Bali Escape')).toBeInTheDocument());
  });

  it('shows "No data available" states when every array is empty', async () => {
    mockGetPackageAnalyticsOverview.mockResolvedValue({
      stats: { totalItineraries: 0, totalInquiries: 0, totalConversions: 0 },
      trend: [],
      destinationPerformance: [],
      mostInquired: [],
    });
    render(<PackageAnalytics />);

    await waitFor(() => expect(screen.getByText(/no trend data available/i)).toBeInTheDocument());
    expect(screen.getByText(/no destination data available/i)).toBeInTheDocument();
    expect(screen.getByText(/no package data available/i)).toBeInTheDocument();
  });
});
