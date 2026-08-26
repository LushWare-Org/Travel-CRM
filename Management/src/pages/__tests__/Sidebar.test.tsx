import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockUseAuth, mockUsePermission, mockNavigate, mockGetOrganizationBranding } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUsePermission: vi.fn(),
  mockNavigate: vi.fn(),
  mockGetOrganizationBranding: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../../contexts/PermissionContext', () => ({ usePermission: mockUsePermission }));
vi.mock('../../services/api', () => ({ adminAPI: { getOrganizationBranding: mockGetOrganizationBranding } }));
vi.mock('@/lib/toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
// AppearanceToggle needs a ThemeProvider ancestor and isn't the concern of
// this test file (see AppearanceToggle.test.tsx) — stub it out.
vi.mock('../../components/AppearanceToggle', () => ({ default: () => <div>Appearance</div> }));

import Sidebar from '../Sidebar';

const STORAGE_KEY = 'management-sidebar-open';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  setViewportWidth(1280);
  mockUseAuth.mockReturnValue({
    user: { name: 'Alice Admin', role: 'admin', isSuperAdmin: false },
    logout: vi.fn(),
  });
  mockUsePermission.mockReturnValue({ hasPermission: () => true });
  mockGetOrganizationBranding.mockResolvedValue({ status: 'success', data: { branding: null } });
});

describe('Sidebar collapse state', () => {
  it('stays expanded after clicking a nav item', async () => {
    const user = userEvent.setup();
    const { container } = render(<Sidebar />);

    await user.click(screen.getByTitle('Dashboard'));

    expect(container.firstChild).toHaveClass('w-72');
  });

  it('collapses when Ctrl+B is pressed, and expands again on a second press', () => {
    const { container } = render(<Sidebar />);

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(container.firstChild).toHaveClass('w-20');

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(container.firstChild).toHaveClass('w-72');
  });

  it('persists the collapsed state to localStorage and restores it on remount', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<Sidebar />);

    await user.click(screen.getByLabelText('Collapse sidebar'));

    expect(container.firstChild).toHaveClass('w-20');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');

    unmount();
    const { container: container2 } = render(<Sidebar />);
    expect(container2.firstChild).toHaveClass('w-20');
  });

  it('does not let a mobile session overwrite the desktop-persisted preference', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setViewportWidth(500);

    render(<Sidebar />);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });
});
