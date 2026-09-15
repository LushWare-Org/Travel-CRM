import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BusinessNotification } from '../types';

const { mockUseNotifications } = vi.hoisted(() => ({ mockUseNotifications: vi.fn() }));

vi.mock('../NotificationProvider', () => ({ useOptionalNotifications: mockUseNotifications }));
vi.mock('../NotificationPanel', () => ({ default: () => <div data-testid="notification-panel" /> }));

import NotificationBell from '../NotificationBell';

const notification = (severity: BusinessNotification['severity']): BusinessNotification => ({
  id: `n-${severity}`,
  key: `rule.${severity}`,
  category: 'risk',
  severity,
  section: 'attention',
  text: 'Something needs you.',
  facts: [],
  materialValue: '42',
  firstSeenAt: '2026-09-14T00:00:00.000Z',
  unread: false,
});

const session = (critical: number, warning: number, info = 0, notifications: BusinessNotification[] = []) => ({
  notifications,
  unreadCounts: { critical, warning, info },
  canView: true,
  scope: 'org' as const,
  currency: 'USD',
  loading: false,
  error: null,
  lastLoadedAt: null,
  unavailableSignals: [],
  refresh: vi.fn(),
  markRead: vi.fn(),
  acknowledge: vi.fn(),
  dismiss: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNotifications.mockReturnValue(session(0, 0));
});

describe('NotificationBell', () => {
  it('counts only unread criticals and warnings, never the folded tier', () => {
    mockUseNotifications.mockReturnValue(session(1, 2, 5));

    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/notifications need attention/)).toBeInTheDocument();
  });

  it('renders no badge when nothing needs attention', () => {
    render(<NotificationBell />);

    expect(screen.queryByText(/notifications need attention/)).not.toBeInTheDocument();
  });

  it('renders nothing when the provider reports no business access', () => {
    mockUseNotifications.mockReturnValue({ ...session(0, 0), canView: false });

    render(<NotificationBell />);

    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('renders nothing when the provider is absent', () => {
    mockUseNotifications.mockReturnValue(null);

    render(<NotificationBell />);

    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });
  it('marks unaddressed criticals once everything has been read', () => {
    mockUseNotifications.mockReturnValue(session(0, 0, 0, [notification('critical')]));

    render(<NotificationBell />);

    // Nothing is unread, so the badge is gone — the dot carries what is left: seen,
    // and not yet dealt with.
    expect(screen.queryByText(/notifications need attention/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /still unaddressed/i })).toBeInTheDocument();
  });

  it('leaves the bell unmarked when the only open items are warnings', () => {
    mockUseNotifications.mockReturnValue(session(0, 0, 0, [notification('warning'), notification('info')]));

    render(<NotificationBell />);

    // A dot driven by warnings would be lit permanently and would mean nothing.
    expect(screen.queryByRole('img', { name: /still unaddressed/i })).not.toBeInTheDocument();
  });

  it('never shows a second indicator while the unread badge is showing', () => {
    mockUseNotifications.mockReturnValue(session(0, 1, 0, [notification('critical')]));

    render(<NotificationBell />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /still unaddressed/i })).not.toBeInTheDocument();
  });

  it('drops the mark once the last unaddressed critical is gone', () => {
    mockUseNotifications.mockReturnValue(session(0, 0, 0, [notification('critical')]));
    const { rerender } = render(<NotificationBell />);
    expect(screen.getByRole('img', { name: /still unaddressed/i })).toBeInTheDocument();

    mockUseNotifications.mockReturnValue(session(0, 0, 0, []));
    rerender(<NotificationBell />);

    expect(screen.queryByRole('img', { name: /still unaddressed/i })).not.toBeInTheDocument();
  });
});
