import { useState, useEffect } from 'react';
import { User, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SalesRep {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  lastLogin?: string;
}

interface ActiveSalesRepsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requireActiveLogin48h: boolean;
}

const ActiveSalesRepsDialog = ({ isOpen, onClose, requireActiveLogin48h }: ActiveSalesRepsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [activeReps, setActiveReps] = useState<SalesRep[]>([]);
  const [inactiveReps, setInactiveReps] = useState<SalesRep[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchSalesReps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, requireActiveLogin48h]);

  const fetchSalesReps = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSalesReps();
      if (res.status === 'success' && res.data?.users) {
        const reps: SalesRep[] = res.data.users;

        // Filter by 1-hour login if setting is enabled
        if (requireActiveLogin48h) {
          const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
          const active = reps.filter((rep) => {
            if (!rep.lastLogin) return false;
            return new Date(rep.lastLogin) >= oneHourAgo;
          });
          const inactive = reps.filter((rep) => {
            if (!rep.lastLogin) return true;
            return new Date(rep.lastLogin) < oneHourAgo;
          });
          setActiveReps(active);
          setInactiveReps(inactive);
        } else {
          // If setting is disabled, show all active sales reps
          setActiveReps(reps);
          setInactiveReps([]);
        }
      }
    } catch (error) {
      console.error('Error fetching sales reps:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastLogin = (lastLogin: string | undefined) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? 'Just now' : `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Active Sales Representatives</DialogTitle>
          <DialogDescription>
            {requireActiveLogin48h
              ? 'Sales reps who logged in within the last 1 hour'
              : 'All active sales representatives'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Sales Reps */}
            {activeReps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Active {requireActiveLogin48h ? '(Logged in within 1h)' : ''}
                  </h3>
                  <span className="ml-auto bg-success/10 text-success text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {activeReps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {activeReps.map((rep) => (
                    <div
                      key={rep._id || rep.id}
                      className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center text-success-foreground font-semibold">
                          {rep.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{rep.name}</p>
                          <p className="text-sm text-muted-foreground">{rep.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatLastLogin(rep.lastLogin)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Sales Reps (only shown if 1h filter is enabled) */}
            {requireActiveLogin48h && inactiveReps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Inactive (Not logged in within 1h)
                  </h3>
                  <span className="ml-auto bg-muted text-muted-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {inactiveReps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {inactiveReps.map((rep) => (
                    <div
                      key={rep._id || rep.id}
                      className="flex items-center justify-between p-4 bg-muted border border-border rounded-lg opacity-75"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-muted-foreground/40 rounded-full flex items-center justify-center text-background font-semibold">
                          {rep.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{rep.name}</p>
                          <p className="text-sm text-muted-foreground">{rep.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatLastLogin(rep.lastLogin)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {activeReps.length === 0 && inactiveReps.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sales representatives found</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActiveSalesRepsDialog;
