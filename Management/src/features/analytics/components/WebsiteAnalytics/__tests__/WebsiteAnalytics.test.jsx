import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetWebsiteAnalyticsOverview } = vi.hoisted(() => ({ mockGetWebsiteAnalyticsOverview: vi.fn() }));

vi.mock('../../../../../services/analytics.service.js', () => ({
  default: { getWebsiteAnalyticsOverview: mockGetWebsiteAnalyticsOverview },
}));

vi.mock('react-hot-toast', () => ({ default: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import WebsiteAnalytics from '../WebsiteAnalytics.tsx';

const overview = {
  stats: { totalSearches: 30, totalBookings: 6, uniqueDestinations: 5, uniqueActivities: 4, conversionRate: 20 },
  trend: [{ label: 'Aug 2026', searches: 30, conversions: 6 }],
  topDestinations: [{ destination: 'Bali', searches: 15, conversions: 3 }],
  accommodationTypes: [{ name: 'FAMILY', value: 5 }],
  durationPreferences: [{ duration: '4-7 days', searches: 10, bookings: 2 }],
  priceRanges: [{ range: '$5K–$10K', searches: 8 }],
};

beforeEach(() => vi.clearAllMocks());

describe('WebsiteAnalytics', () => {
  it('renders stats from the API response — website-sourced lead inquiries, not raw search-log data', async () => {
    mockGetWebsiteAnalyticsOverview.mockResolvedValue(overview);
    render(<WebsiteAnalytics />);

    await waitFor(() => expect(screen.getByText('30')).toBeInTheDocument());
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('does not throw a ReferenceError from handleExportPDF reading `data` before its declaration', async () => {
    mockGetWebsiteAnalyticsOverview.mockResolvedValue(overview);
    expect(() => render(<WebsiteAnalytics />)).not.toThrow();
  });

  it('shows an error panel when the fetch rejects', async () => {
    mockGetWebsiteAnalyticsOverview.mockRejectedValue(new Error('Service unavailable'));
    render(<WebsiteAnalytics />);

    await waitFor(() => expect(screen.getByText('Service unavailable')).toBeInTheDocument());
    expect(screen.getByText(/error loading analytics/i)).toBeInTheDocument();
  });
});
