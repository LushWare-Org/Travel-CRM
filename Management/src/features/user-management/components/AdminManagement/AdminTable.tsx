import { Eye, Edit, Trash, Mail, RotateCcw, CheckCircle, Clock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '../../utils/helpers';
import type { Admin } from './AdminManagement';

export interface AdminTableProps {
  admins: Admin[];
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
  onView: (admin: Admin) => void;
  onResendInvite: (admin: Admin) => void;
  onForcePasswordReset: (admin: Admin) => void;
}

const AdminTable = ({ admins, onEdit, onDelete, onView, onResendInvite, onForcePasswordReset }: AdminTableProps) => {
  const getStatusBadge = (admin: Admin) => {
    if (admin.status === 'invited') {
      return (
        <Badge variant="secondary" className="w-fit gap-1 bg-warning/10 text-warning">
          <Clock className="size-3" />
          Pending Invite
        </Badge>
      );
    }
    if (admin.status === 'password_reset_required') {
      return (
        <Badge variant="secondary" className="w-fit gap-1 bg-warning/10 text-warning">
          <RotateCcw className="size-3" />
          Reset Required
        </Badge>
      );
    }
    if (admin.status === 'active') {
      return (
        <Badge variant="secondary" className="w-fit gap-1 bg-success/10 text-success">
          <CheckCircle className="size-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">
        Inactive
      </Badge>
    );
  };

  const getAccountStatusLabel = (accountStatus?: string) => {
    switch (accountStatus) {
      case 'verified':
        return <span className="text-xs font-medium text-success">Verified</span>;
      case 'pending_first_login':
        return <span className="text-xs font-medium text-primary">Pending First Login</span>;
      case 'pending_password_reset':
        return <span className="text-xs font-medium text-warning">Password Reset Required</span>;
      case 'pending_password_change':
        return <span className="text-xs font-medium text-warning">Password Change Required</span>;
      default:
        return <span className="text-xs text-muted-foreground">{accountStatus}</span>;
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Account Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Last Active</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((admin, index) => (
              <tr key={admin.id || `admin-${index}-${admin.email}`} className="transition-colors hover:bg-muted/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-foreground">
                        {admin.name || '—'}
                        {admin.isSuperAdmin && (
                          <Badge variant="secondary" className="gap-1 bg-chart-3/10 text-chart-3">
                            <Crown className="size-3" />
                            Super Admin
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{admin.phone || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{admin.email || '—'}</td>
                <td className="px-6 py-4">{getStatusBadge(admin)}</td>
                <td className="px-6 py-4">{getAccountStatusLabel(admin.accountStatus)}</td>
                <td className="px-6 py-4">
                  <Badge variant="secondary">{(admin.permissions || []).length} permissions</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {admin.lastActive ? (
                    <div className="font-mono text-xs tabular-nums">{formatDate(admin.lastActive)}</div>
                  ) : (
                    <span className="text-muted-foreground/70">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    {admin.isSuperAdmin ? (
                      <>
                        <span className="rounded bg-chart-3/10 px-2 py-1 text-xs font-semibold text-chart-3">
                          Protected Account
                        </span>
                        <Button variant="ghost" size="icon-sm" title="View Details" onClick={() => onView(admin)}>
                          <Eye className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {admin.status === 'invited' && (
                          <Button variant="ghost" size="icon-sm" title="Resend Invitation" onClick={() => onResendInvite(admin)}>
                            <Mail className="size-4" />
                          </Button>
                        )}
                        {(admin.status === 'password_reset_required' || admin.status === 'active') && (
                          <Button variant="ghost" size="icon-sm" title="Force Password Reset" onClick={() => onForcePasswordReset(admin)}>
                            <RotateCcw className="size-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" title="View Details" onClick={() => onView(admin)}>
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Edit Admin" onClick={() => onEdit(admin)}>
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete Admin"
                          disabled={!admin.canBeDeleted}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDelete(admin)}
                        >
                          <Trash className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {admins.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg">No admins found</p>
        </div>
      )}
    </div>
  );
};

export default AdminTable;
