import { Shield, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Admin } from './AdminManagement';

export interface AdminDetailsModalProps {
  admin: Admin | null;
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
}

const AdminDetailsModal = ({ admin, isOpen, onClose, isSuperAdmin = false }: AdminDetailsModalProps) => {
  if (!admin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isSuperAdmin ? <Crown className="size-6 text-chart-3" /> : <Shield className="size-6 text-primary" />}
            {admin.name}
            {isSuperAdmin && (
              <Badge variant="secondary" className="gap-1 bg-chart-3/10 text-chart-3">
                <Crown className="size-3" />
                Super Admin
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSuperAdmin ? 'Super Administrator Details' : 'Administrator Details'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Email</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{admin.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Phone</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{admin.phone}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</p>
            <Badge variant="secondary" className="mt-1 bg-success/10 text-success">
              {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
            </Badge>
          </div>

          {isSuperAdmin && (
            <>
              <div className="col-span-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Permissions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-chart-3/10 text-chart-3">
                    All Permissions (Super Admin)
                  </Badge>
                </div>
              </div>
              <div className="col-span-2 rounded-lg border border-chart-3/20 bg-chart-3/10 p-3">
                <p className="flex items-center gap-1 text-xs font-medium text-chart-3">
                  <Crown className="size-3" />
                  Super Admin accounts have full system access and cannot be deleted.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDetailsModal;
