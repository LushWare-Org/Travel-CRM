import type { ReactNode } from 'react';
import NotificationBell from '@/features/notifications/NotificationBell';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

/**
 * The Management page bar: one title, page-owned actions, and the site-wide
 * business notification control at the far right.
 */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
      <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2 pl-14 sm:px-6 md:pl-6">
        <div className="min-w-0 py-1">
          <h1 className="truncate font-heading text-lg font-bold text-foreground sm:text-xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {actions}
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
