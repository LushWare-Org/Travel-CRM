import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

import ProtectedRoute from '../ProtectedRoute.jsx';

// Rendered under a real <Routes> (with a /login destination), matching how
// ProtectedRoute is actually used in App.jsx — otherwise a redirecting
// <Navigate> with no matching Route keeps re-rendering this same element on
// every navigation, looping forever.
function renderWithRouter(ui) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute — role-gated access', () => {
  it('shows Access Denied instead of the guarded page when a salesRep lacks a required role', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false, user: { role: 'salesRep' } });

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin', 'superAdmin']}>
        <div>User Management Page</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('User Management Page')).not.toBeInTheDocument();
  });

  it('renders the guarded page for an admin user', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false, user: { role: 'admin' } });

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin', 'superAdmin']}>
        <div>User Management Page</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('User Management Page')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  it('redirects to /login when the user is not authenticated, before checking role', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false, user: null });

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin']}>
        <div>User Management Page</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('User Management Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });
});
