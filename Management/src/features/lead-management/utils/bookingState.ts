export const ITEM_BOOKING_STATES = ['PENDING', 'READY_TO_BOOK', 'BOOKED', 'FAILED'] as const;

export type ItemBookingState = (typeof ITEM_BOOKING_STATES)[number];

export const ITEM_STATE_LABELS: Record<ItemBookingState, string> = {
  PENDING: 'Pending',
  READY_TO_BOOK: 'Ready to Book',
  BOOKED: 'Booked',
  FAILED: 'Failed',
};

// Signal Console semantic tokens (not raw Tailwind hues) - PENDING/muted,
// READY_TO_BOOK/primary (actionable-but-incomplete), BOOKED/success, FAILED/destructive.
export const ITEM_STATE_COLORS: Record<ItemBookingState, string> = {
  PENDING: 'bg-muted text-muted-foreground border-border',
  READY_TO_BOOK: 'bg-primary/10 text-primary border-primary/20',
  BOOKED: 'bg-success/10 text-success border-success/20',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function deriveItemState(
  leadLifecycleStatus: string,
  hasBooking = false,
  hasFailed = false,
): ItemBookingState {
  if (hasFailed) return 'FAILED';
  if (hasBooking) return 'BOOKED';
  if (leadLifecycleStatus === 'APPROVED' || leadLifecycleStatus === 'BOOKING_IN_PROGRESS') {
    return 'READY_TO_BOOK';
  }
  return 'PENDING';
}
