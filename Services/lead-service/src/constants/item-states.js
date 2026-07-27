export const ITEM_BOOKING_STATES = ['PENDING', 'READY_TO_BOOK', 'BOOKED', 'FAILED'];

export const ITEM_STATE_LABELS = {
  PENDING: 'Pending',
  READY_TO_BOOK: 'Ready to Book',
  BOOKED: 'Booked',
  FAILED: 'Failed',
};

export const ITEM_STATE_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  READY_TO_BOOK: 'bg-blue-100 text-blue-700',
  BOOKED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

/**
 * Derive the micro-state for an itinerary item based on lead lifecycle status
 * and whether bookings exist for that item.
 *
 * @param {string} leadLifecycleStatus - The lead's current lifecycleStatus
 * @param {boolean} hasBooking - Whether a confirmed booking exists for this item
 * @param {boolean} hasFailed - Whether any booking attempt failed for this item
 * @returns {string} One of: PENDING, READY_TO_BOOK, BOOKED, FAILED
 */
export function deriveItemState(leadLifecycleStatus, hasBooking = false, hasFailed = false) {
  if (hasFailed) return 'FAILED';
  if (hasBooking) return 'BOOKED';
  if (leadLifecycleStatus === 'APPROVED' || leadLifecycleStatus === 'BOOKING_IN_PROGRESS') {
    return 'READY_TO_BOOK';
  }
  return 'PENDING';
}
