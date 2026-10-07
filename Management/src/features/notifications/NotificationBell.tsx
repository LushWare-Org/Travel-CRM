import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { useOptionalNotifications } from './NotificationProvider';
import NotificationPanel from './NotificationPanel';

/** Session-scoped, because the bell remounts on every page navigation. */
const CRITICAL_AUTO_OPEN_KEY = 'management-notifications:v1:critical-auto-opened';

/**
 * Not "notifications need attention" — that phrase belongs to the unread badge, and
 * `NotificationBell.test.tsx` asserts its ABSENCE at zero unread. This marker makes a
 * different claim: seen, and not yet dealt with.
 */
const UNADDRESSED_LABEL = 'Critical notifications are still unaddressed.';

export default function NotificationBell() {
  const session = useOptionalNotifications();
  const [open, setOpen] = useState(false);
  const criticalUnread = session?.unreadCounts.critical ?? 0;
  const attentionCount = criticalUnread + (session?.unreadCounts.warning ?? 0);

  // Seen is not dealt with. The badge counts UNREAD, so opening the panel clears it
  // while every notification stays in the open set — this is the signal for work that
  // was read and not acted on. Criticals only: warnings are common enough that a dot
  // driven by them would be lit permanently and would then mean nothing.
  const unaddressedCriticals =
    session?.notifications.filter((notification) => notification.severity === 'critical').length ?? 0;
  const showUnaddressedDot = attentionCount === 0 && unaddressedCriticals > 0;

  // A critical raises the panel once per browser session — not once per page,
  // which is what a plain ref would have done given this remounts per route.
  // Unavailable storage means no auto-open rather than a panel that reopens on
  // every navigation.
  useEffect(() => {
    if (criticalUnread <= 0) return;
    try {
      if (sessionStorage.getItem(CRITICAL_AUTO_OPEN_KEY) === '1') return;
      sessionStorage.setItem(CRITICAL_AUTO_OPEN_KEY, '1');
    } catch {
      return;
    }
    setOpen(true);
  }, [criticalUnread]);

  if (!session?.canView) return null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) session.refresh();
  };

  return (
    <div className="relative shrink-0">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative shrink-0"
              aria-label="Notifications"
            />
          }
        >
          <Bell className="h-4.5 w-4.5" aria-hidden="true" />
          {attentionCount > 0 && (
            <Badge
              variant={criticalUnread > 0 ? 'destructive' : 'secondary'}
              className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 font-mono text-[10px] tabular-nums"
            >
              {attentionCount > 99 ? '99+' : attentionCount}
              <span className="sr-only"> notifications need attention</span>
            </Badge>
          )}
        </PopoverTrigger>
        <NotificationPanel open={open} onClose={() => setOpen(false)} />
      </Popover>

      {showUnaddressedDot && (
        // A sibling of the trigger, never a child: a button's contents are
        // presentational in the accessibility tree, so this marker and its accessible
        // name would never be announced from inside it. The same reason CopilotTrigger
        // places its attention marker beside the button.
        //
        // `pointer-events-none` because it overlaps the bell's corner, and the click
        // there belongs to the bell.
        <span
          role="img"
          aria-label={UNADDRESSED_LABEL}
          title={UNADDRESSED_LABEL}
          data-notification-unaddressed="true"
          className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card"
        />
      )}
    </div>
  );
}
