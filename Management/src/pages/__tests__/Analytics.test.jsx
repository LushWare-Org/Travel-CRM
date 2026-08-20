import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('../../contexts/AuthContext.jsx', () => ({ useAuth: mockUseAuth }));

vi.mock('../../features/analytics/components', () => ({
  LeadAnalytics: () => <div>Lead Analytics Content</div>,
  BillingAnalytics: () => <div>Billing Analytics Content</div>,
  UserAnalytics: () => <div>User Analytics Content</div>,
  PackageAnalytics: () => <div>Package Analytics Content</div>,
  WebsiteAnalytics: () => <div>Website Analytics Content</div>,
}));

import Analytics from '../Analytics.jsx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Analytics — tab visibility by role', () => {
  it('hides Package, Website, and Users analytics tabs for a salesRep user', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'salesRep' } });
    render(<Analytics />);

    expect(screen.getAllByText('Lead Analytics').length).toBeGreaterThan(0);
    expect(screen.getByText('Billing Analytics')).toBeInTheDocument();
    expect(screen.queryByText('Package Analytics')).not.toBeInTheDocument();
    expect(screen.queryByText('Website Analytics')).not.toBeInTheDocument();
    expect(screen.queryByText('User Analytics')).not.toBeInTheDocument();
  });

  it('shows every analytics tab for an admin user', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });
    render(<Analytics />);

    expect(screen.getAllByText('Lead Analytics').length).toBeGreaterThan(0);
    expect(screen.getByText('Billing Analytics')).toBeInTheDocument();
    expect(screen.getByText('Package Analytics')).toBeInTheDocument();
    expect(screen.getByText('Website Analytics')).toBeInTheDocument();
    expect(screen.getByText('User Analytics')).toBeInTheDocument();
  });
});
