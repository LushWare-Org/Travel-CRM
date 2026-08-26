import { Lock, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PermissionDeniedViewProps {
  section?: string;
  requiredPermission?: string;
  message?: string | null;
}

const DEFAULT_MESSAGES: Record<string, string> = {
  manage_users: 'manage website users and customer accounts',
  manage_sales_reps: 'manage sales representatives',
  manage_vendors: 'manage vendor partnerships',
  manage_admins: 'manage admin accounts and permissions',
  view_reports: 'view system reports',
  manage_billing: 'manage billing operations',
};

/**
 * PermissionDeniedView Component
 * Shows a friendly message when user lacks permission to access a section
 */
const PermissionDeniedView = ({
  section = 'this section',
  requiredPermission = 'manage_users',
  message = null,
}: PermissionDeniedViewProps) => {
  const actionMessage = DEFAULT_MESSAGES[requiredPermission] || `access ${section}`;

  return (
    <div className="w-full rounded-lg border border-border bg-card p-12 text-center">
      {/* Icon */}
      <div className="mb-6 flex justify-center">
        <div className="rounded-full border-2 border-destructive/20 bg-destructive/10 p-6">
          <Lock className="size-12 text-destructive" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="mb-3 font-heading text-2xl font-bold text-foreground">Access Restricted</h2>

      {/* Message */}
      <div className="mx-auto mb-8 max-w-md">
        <p className="mb-4 text-base text-muted-foreground">
          {message || (
            <>
              You don't have permission to <span className="font-semibold text-foreground">{actionMessage}</span>.
            </>
          )}
        </p>

        {/* Info Box */}
        <div className="rounded-lg border border-border bg-muted p-4 text-left">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="mb-1 font-semibold text-foreground">Required Permission</p>
              <p className="inline-block rounded bg-accent px-2 py-1 font-mono text-xs text-accent-foreground">
                {requiredPermission}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-4">
        <Button className="w-full" onClick={() => { window.location.href = '/'; }}>
          Go to Dashboard
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const text = `Permission Request: ${requiredPermission}\n\nI would like to request access to ${actionMessage}.`;
            navigator.clipboard.writeText(text);
            alert('Permission request template copied to clipboard');
          }}
        >
          <Mail className="size-4" />
          Request Access
        </Button>
      </div>

      {/* Footer Help Text */}
      <p className="mx-auto mt-8 max-w-md text-xs text-muted-foreground">
        If you believe this is a mistake, please contact your system administrator or submit a help request through
        the support portal.
      </p>
    </div>
  );
};

export default PermissionDeniedView;
