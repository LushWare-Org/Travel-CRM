import { Ban, ListChecks, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { STATUS_TABS, fmtDate, fmtMoney } from './helpers';
import type { FlightBookingRecord } from './types';

// Grouped by meaning, same convention as StatusBadge/LeadStatusBadge:
// cancelled/failed are terminal-negative, confirmed/ticketed is the
// positive milestone, quoted/pending are still in motion.
const STATUS_STYLES: Record<string, string> = {
  cancelled: 'bg-destructive/10 text-destructive',
  failed: 'bg-destructive/10 text-destructive',
  confirmed: 'bg-success/10 text-success',
  ticketed: 'bg-success/10 text-success',
  quoted: 'bg-warning/10 text-warning',
  pending: 'bg-warning/10 text-warning',
};

function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

interface CancelDialogState {
  id: string;
  reason: string;
}

interface BookingsPanelProps {
  bookings: FlightBookingRecord[];
  filteredBookings: FlightBookingRecord[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  statusCounts: Record<string, number>;
  search: string;
  setSearch: (value: string) => void;
  cancelDialog: CancelDialogState | null;
  setCancelDialog: (value: CancelDialogState | null) => void;
  onCancel: (id: string, reason: string) => void;
}

export default function BookingsPanel({
  bookings,
  filteredBookings,
  loading,
  statusFilter,
  setStatusFilter,
  statusCounts,
  search,
  setSearch,
  cancelDialog,
  setCancelDialog,
  onCancel,
}: BookingsPanelProps) {
  const columns: DataTableColumn<FlightBookingRecord>[] = [
    { key: 'pnr', header: 'PNR', className: 'font-mono font-medium text-foreground', render: (b) => b.pnr || '-' },
    {
      key: 'route',
      header: 'Route',
      render: (b) => `${b.segments?.[0]?.origin ?? ''} → ${b.segments?.[(b.segments?.length ?? 1) - 1]?.destination ?? ''}`,
    },
    { key: 'departure', header: 'Departure', numeric: true, render: (b) => fmtDate(b.segments?.[0]?.departureAt) },
    { key: 'travelers', header: 'Travelers', numeric: true, render: (b) => b.travelers?.length || 0 },
    { key: 'fare', header: 'Fare', numeric: true, render: (b) => fmtMoney(b.totalAmount, b.currency) },
    { key: 'status', header: 'Status', render: (b) => <BookingStatusBadge status={b.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (b) =>
        b.status !== 'cancelled' ? (
          <button
            type="button"
            onClick={() => setCancelDialog({ id: b.id, reason: '' })}
            className="flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:text-destructive/80"
          >
            <Ban className="h-3.5 w-3.5" /> Cancel
          </button>
        ) : null,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label} <span className="opacity-70">{statusCounts[tab.id]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Input
            type="text"
            placeholder="Search by PNR or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
          <p className="text-sm">Loading bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-16 text-center">
          <ListChecks className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-lg font-semibold text-muted-foreground">
            {bookings.length === 0 ? 'No flight bookings yet' : 'No matching bookings'}
          </h3>
          <p className="text-sm text-muted-foreground/80">
            {bookings.length === 0 ? 'Search and book flights to see them here' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={filteredBookings} getRowKey={(b) => b.id} className="rounded-none border-0 shadow-none" />
          {filteredBookings.length > 10 && (
            <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
              Showing {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}

      <Dialog open={cancelDialog !== null} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this booking? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancellation (optional)"
            value={cancelDialog?.reason ?? ''}
            onChange={(e) => cancelDialog && setCancelDialog({ ...cancelDialog, reason: e.target.value })}
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={() => cancelDialog && onCancel(cancelDialog.id, cancelDialog.reason)}>
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
