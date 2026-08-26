import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetLeadOverview } = vi.hoisted(() => ({ mockGetLeadOverview: vi.fn() }));

vi.mock('../../../../../services/api.js', () => ({
  analyticsAPI: { getLeadOverview: mockGetLeadOverview },
}));

vi.mock('@/lib/toast', () => ({ default: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import LeadAnalytics from '../LeadAnalytics.tsx';

const fixture = {
  success: true,
  data: {
    stats: { totalLeads: 42, contacted: 30, interested: 12, converted: 8, new: 5, quoted: 6 },
    trend: [{ label: 'Jul 2026', new: 5, contacted: 20, interested: 10, converted: 4 }],
    statusDistribution: [{ name: 'NEW', value: 5 }],
    categoryDistribution: [{ name: 'Website Form', value: 10 }],
    topCountries: [{ country: 'USA', leads: 20, conversion: 25 }],
    topDestinations: [{ destination: 'Bali', leads: 15, conversion: 30 }],
    priceRangeDistribution: [{ range: '$5K–$10K', value: 6 }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LeadAnalytics', () => {
  it('renders real stat values from the API response', async () => {
    mockGetLeadOverview.mockResolvedValue(fixture);
    render(<LeadAnalytics />);

    await waitFor(() => expect(screen.getAllByText('42').length).toBeGreaterThan(0));
    expect(screen.getAllByText('30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('renders the top country name from the fetched data', async () => {
    mockGetLeadOverview.mockResolvedValue(fixture);
    render(<LeadAnalytics />);

    await waitFor(() => expect(screen.getByText('Usa')).toBeInTheDocument());
  });

  it('shows "No data available" messaging when every array in the response is empty', async () => {
    mockGetLeadOverview.mockResolvedValue({
      success: true,
      data: { stats: { totalLeads: 0, contacted: 0, interested: 0, converted: 0, new: 0, quoted: 0 }, trend: [], statusDistribution: [], categoryDistribution: [], topCountries: [], topDestinations: [], priceRangeDistribution: [] },
    });
    render(<LeadAnalytics />);

    await waitFor(() => expect(screen.getByText(/no country data available/i)).toBeInTheDocument());
    expect(screen.getByText(/no category data available/i)).toBeInTheDocument();
    expect(screen.getByText(/no destination data available/i)).toBeInTheDocument();
  });

  it('shows the error message inline when the fetch rejects', async () => {
    mockGetLeadOverview.mockRejectedValue(new Error('Network down'));
    render(<LeadAnalytics />);

    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument());
  });
});
