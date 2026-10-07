import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InsightRow from '@/features/copilot/InsightRow';
import type { CopilotClaim } from '@/features/copilot/types';
import type { BusinessNotification } from './types';

// eslint-disable-next-line react-refresh/only-export-components
export function notificationToClaim(notification: BusinessNotification): CopilotClaim {
  return {
    id: notification.id,
    key: notification.key,
    section: notification.section,
    text: notification.text,
    facts: notification.facts,
    evidenceIds: [],
    evidenceType: 'computed',
    severity: notification.severity,
    ruleId: notification.id,
  };
}

type NotificationRowProps = {
  notification: BusinessNotification;
  announce: (message: string) => void;
  onView: (notification: BusinessNotification) => void;
  onAskCopilot?: (claim: CopilotClaim) => void;
  onDismiss: (notification: BusinessNotification) => void;
};

export default function NotificationRow({
  notification,
  announce,
  onView,
  onAskCopilot,
  onDismiss,
}: NotificationRowProps) {
  const claim = notificationToClaim(notification);
  const received = new Date(notification.firstSeenAt);
  const timestamp = Number.isNaN(received.getTime())
    ? null
    : received.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <article aria-label={notification.text} className="space-y-1.5">
      <div className="flex min-h-8 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {notification.unread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          )}
          <span>{notification.unread ? 'New' : 'Read'}</span>
          {timestamp && <span className="font-mono tabular-nums">{timestamp}</span>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(notification)}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      <InsightRow
        claim={claim}
        sources={[]}
        announce={announce}
        primaryAction={notification.target ? {
          label: notification.target.label,
          onClick: () => onView(notification),
        } : undefined}
        onChatAbout={onAskCopilot}
      />
    </article>
  );
}
