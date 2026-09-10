import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../../pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));

import HomeRoute from '../HomeRoute.tsx';

// Rendered under a real <Routes> with a /leads destination, matching how
// HomeRoute is used in App.jsx — a redirecting <Navigate> with no matching
// Route keeps re-rendering the same element on every navigation, looping.
function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/leads" element={<div>Lead Management Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomeRoute — role-aware landing', () => {
  it('sends a sales rep to Leads instead of the Dashboard', () => {
    // The Dashboard is not in an agent's sidebar, so landing on it would put
    // them on a page they cannot navigate back to.
    mockUseAuth.mockReturnValue({ user: { role: 'salesRep' } });

    renderHome();

    expect(screen.getByText('Lead Management Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('does not show an Access Denied screen to an agent at login', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'salesRep' } });

    renderHome();

    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it.each(['admin', 'superAdmin'])('keeps the Dashboard for %s', (role) => {
    mockUseAuth.mockReturnValue({ user: { role } });

    renderHome();

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Lead Management Page')).not.toBeInTheDocument();
  });
});
