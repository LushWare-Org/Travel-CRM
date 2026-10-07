import type { ClaimSection, ClaimSeverity, CopilotFact } from '@/features/copilot/types';

export type NotificationCategory = 'revenue' | 'pipeline' | 'operations' | 'customer' | 'risk';

export type BusinessNotification = {
  id: string;
  key: string;
  category: NotificationCategory;
  severity: ClaimSeverity;
  section: ClaimSection;
  text: string;
  facts: CopilotFact[];
  materialValue: string;
  target?: { path: string; query?: Record<string, string>; label: string };
  firstSeenAt: string;
  unread: boolean;
};

export type UnreadCounts = Record<ClaimSeverity, number>;

export type NotificationSession = {
  notifications: BusinessNotification[];
  unreadCounts: UnreadCounts;
  /** The actor may see business notifications at all. */
  canView: boolean;
  scope: 'org' | 'own';
  currency: string;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
  unavailableSignals: string[];
  refresh: () => void;
  markRead: (keys: string[]) => void;
  acknowledge: (notification: BusinessNotification) => void;
  dismiss: (notification: BusinessNotification) => void;
};
