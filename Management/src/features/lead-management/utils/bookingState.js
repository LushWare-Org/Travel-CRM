export const ITEM_BOOKING_STATES = ['PENDING', 'READY_TO_BOOK', 'BOOKED', 'FAILED'];

export const ITEM_STATE_LABELS = {
  PENDING: 'Pending',
  READY_TO_BOOK: 'Ready to Book',
  BOOKED: 'Booked',
  FAILED: 'Failed',
};

export const ITEM_STATE_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
  READY_TO_BOOK: 'bg-blue-100 text-blue-700 border-blue-200',
  BOOKED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
};

/**
 * @param {string} leadLifecycleStatus
 * @param {boolean} hasBooking
 * @param {boolean} hasFailed
 * @returns {'PENDING'|'READY_TO_BOOK'|'BOOKED'|'FAILED'}
 */
export function deriveItemState(leadLifecycleStatus, hasBooking = false, hasFailed = false) {
  if (hasFailed) return 'FAILED';
  if (hasBooking) return 'BOOKED';
  if (leadLifecycleStatus === 'APPROVED' || leadLifecycleStatus === 'BOOKING_IN_PROGRESS') {
    return 'READY_TO_BOOK';
  }
  return 'PENDING';
}
