import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { LIFECYCLE_STATUS_LABELS, LIFECYCLE_STATUS_INFO } from './LeadStatusBadge';
import type { LifecycleStatus } from './LeadStatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const ALLOWED_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  NEW: ['DRAFTING', 'CLOSED_LOST'],
  DRAFTING: ['QUOTED', 'CLOSED_LOST'],
  QUOTED: ['REVISION', 'APPROVED', 'CLOSED_LOST'],
  REVISION: ['DRAFTING', 'QUOTED', 'APPROVED', 'CLOSED_LOST'],
  APPROVED: ['BOOKING_IN_PROGRESS', 'CLOSED_LOST'],
  BOOKING_IN_PROGRESS: ['CONFIRMED', 'BOOKING_FAILED'],
  BOOKING_FAILED: ['BOOKING_IN_PROGRESS', 'REVISION', 'CLOSED_LOST'],
  CONFIRMED: ['CANCELLED'],
  CLOSED_LOST: [],
  CANCELLED: [],
};

function getGatekeeperReason(status: LifecycleStatus, pricing: Record<string, any> = {}): string | null {
  if (status === 'QUOTED') {
    if (!pricing.sellSubtotal || Number(pricing.sellSubtotal) <= 0) {
      return 'Requires sell subtotal > 0';
    }
  }

  if (status === 'APPROVED') {
    if (!pricing.paidAmount || Number(pricing.paidAmount) <= 0) {
      return 'Requires a verified payment covering the deposit';
    }
    if (Number(pricing.paidAmount) < Number(pricing.depositAmount || 0)) {
      return 'Verified payment must cover the deposit plan';
    }
  }

  if (status === 'CONFIRMED') {
    if (pricing.actualTotal == null || Number(pricing.actualTotal) <= 0) {
      return 'Requires flight and hotel actuals > 0';
    }
  }

  return null;
}

interface StatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: { name: string; lifecycleStatus?: LifecycleStatus; pricing?: Record<string, any> } | null;
  // Unused - StatusChangeDialog reads LIFECYCLE_STATUS_LABELS/INFO directly
  // rather than these; kept in the signature since the caller (LeadManagement
  // page) still passes them and dropping them isn't this migration's scope.
  statusLabels?: Record<string, string>;
  statusColors?: Record<string, string>;
  onStatusChange: (lead: any, status: LifecycleStatus, lostReason?: string) => void;
}

const StatusChangeDialog = ({ isOpen, onClose, lead, onStatusChange }: StatusChangeDialogProps) => {
  const [lostReason, setLostReason] = useState('');

  if (!lead) return null;

  const currentStatus = lead.lifecycleStatus || 'NEW';
  const allowedStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  const pricing = lead.pricing || {};

  const handleChange = (status: LifecycleStatus) => {
    if (status === 'CLOSED_LOST' && !lostReason.trim()) return;
    onStatusChange(lead, status, status === 'CLOSED_LOST' ? lostReason.trim() : undefined);
    setLostReason('');
  };

  const handleOpenChange = (open: boolean) => { if (!open) onClose(); };

  // Terminal state - no transitions available
  if (allowedStatuses.length === 0 && currentStatus !== 'NEW') {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>{lead.name}</DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground">{LIFECYCLE_STATUS_LABELS[currentStatus] || currentStatus} is a terminal state</p>
            <p className="text-sm text-muted-foreground mt-1">No further status changes are possible</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>{lead.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {allowedStatuses.map((status) => {
            const isCurrent = currentStatus === status;
            const label = LIFECYCLE_STATUS_LABELS[status] || status;
            const info = LIFECYCLE_STATUS_INFO[status] || '';
            const gatekeeper = getGatekeeperReason(status, pricing);
            const disabled = !!gatekeeper || isCurrent;

            return (
              <button
                key={status}
                onClick={() => !disabled && handleChange(status)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  disabled
                    ? 'bg-muted border-2 border-border opacity-60 cursor-not-allowed'
                    : 'border-2 border-border hover:border-ring hover:bg-muted'
                }`}
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${isCurrent ? 'bg-foreground' : 'bg-muted-foreground/40'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {isCurrent && (
                      <span className="text-xs text-muted-foreground font-medium">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{info}</p>
                  {gatekeeper && (
                    <p className="text-xs text-warning mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {gatekeeper}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {allowedStatuses.includes('CLOSED_LOST') && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-foreground mb-1">
                Loss Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why was this lead lost?"
                rows={2}
              />
              {lostReason.trim().length === 0 && (
                <p className="text-xs text-destructive mt-1">Loss reason is required</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusChangeDialog;
