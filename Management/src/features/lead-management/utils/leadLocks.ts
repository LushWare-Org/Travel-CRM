/**
 * Statuses where numberOfTravelers, packageId and travel dates are locked —
 * all three shape the itinerary/pricing, so they share one unlock window.
 * Must stay in sync with TRAVELER_LOCKED_STATUSES in
 * Services/lead-service/src/services/state-machine.service.js.
 */
export const FIELD_LOCKED_STATUSES = [
  'QUOTED',
  'REVISION',
  'APPROVED',
  'BOOKING_IN_PROGRESS',
  'CONFIRMED',
  'BOOKING_FAILED',
];

export function isLeadFieldLocked(lifecycleStatus: string | undefined | null): boolean {
  return FIELD_LOCKED_STATUSES.includes(lifecycleStatus as string);
}
