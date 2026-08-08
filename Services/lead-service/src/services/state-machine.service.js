import { ALLOWED_TRANSITIONS } from '../constants/lead-states.js';

export class StateMachineError extends Error {
  constructor(message, code = 'INVALID_TRANSITION') {
    super(message);
    this.code = code;
    this.name = 'StateMachineError';
  }
}

/**
 * Validates a lifecycle status transition with gatekeeper rules.
 *
 * @param {Object} params
 * @param {string} params.currentStatus - Current lifecycleStatus (e.g. 'DRAFTING')
 * @param {string} params.nextStatus - Requested new status
 * @param {Object} [params.pricing={}] - LeadPricing-derived values:
 *   sellSubtotal, verifiedPaymentTotal, depositAmount,
 *   flightActualTotal, hotelActualTotal
 * @param {string} [params.lostReason] - Required when transitioning to CLOSED_LOST
 * @returns {{ nextStatus: string, recalculate: boolean }}
 * @throws {StateMachineError}
 */
export function validateTransition({ currentStatus, nextStatus, pricing = {}, lostReason }) {
  if (!currentStatus) {
    throw new StateMachineError('Lead has no current lifecycle status');
  }

  if (currentStatus === nextStatus) {
    return { nextStatus, recalculate: false };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) {
    throw new StateMachineError(`Unknown status '${currentStatus}'`);
  }

  if (!allowed.includes(nextStatus)) {
    throw new StateMachineError(
      `Transition from '${currentStatus}' to '${nextStatus}' is not allowed`,
    );
  }

  const p = pricing || {};
  const sellSubtotal = Number(p.sellSubtotal) || 0;
  const verifiedPaymentTotal = Number(p.verifiedPaymentTotal) || 0;
  const depositAmount = Number(p.depositAmount) || 0;
  const flightActualTotal = Number(p.flightActualTotal) || 0;
  const hotelActualTotal = Number(p.hotelActualTotal) || 0;

  // Gatekeeper: DRAFTING -> QUOTED requires quotedSellingPrice > 0
  if (currentStatus === 'DRAFTING' && nextStatus === 'QUOTED') {
    if (sellSubtotal <= 0) {
      throw new StateMachineError(
        'Cannot transition to QUOTED: sellSubtotal must be greater than 0',
        'GATEKEEPER_QUOTED_PRICE',
      );
    }
  }

  // Gatekeeper: QUOTED/REVISION -> APPROVED requires depositPaid > 0
  if ((currentStatus === 'QUOTED' || currentStatus === 'REVISION') && nextStatus === 'APPROVED') {
    const required = depositAmount > 0 ? depositAmount : 0;
    if (!(verifiedPaymentTotal > 0 && verifiedPaymentTotal >= required)) {
      throw new StateMachineError(
        'Cannot transition to APPROVED: a verified payment covering the deposit is required',
        'GATEKEEPER_APPROVED_DEPOSIT',
      );
    }
  }

  // Gatekeeper: BOOKING_IN_PROGRESS -> CONFIRMED requires both actual costs > 0
  if (currentStatus === 'BOOKING_IN_PROGRESS' && nextStatus === 'CONFIRMED') {
    if (flightActualTotal <= 0 || hotelActualTotal <= 0) {
      throw new StateMachineError(
        'Cannot transition to CONFIRMED: flight and hotel actuals must both be greater than 0',
        'GATEKEEPER_CONFIRMED_ACTUALS',
      );
    }
  }

  // Gatekeeper: any -> CLOSED_LOST requires lostReason
  if (nextStatus === 'CLOSED_LOST') {
    if (!lostReason || lostReason.trim().length === 0) {
      throw new StateMachineError(
        'Cannot transition to CLOSED_LOST: lostReason is required',
        'GATEKEEPER_LOST_REASON',
      );
    }
  }

  const recalculate = currentStatus === 'BOOKING_IN_PROGRESS' && nextStatus === 'CONFIRMED';

  return { nextStatus, recalculate };
}

/**
 * Traveler count drives every PER_PERSON line, so changing it after the lead
 * has been quoted is blocked — the rep must move back to DRAFTING first.
 *
 * @param {Object} params
 * @param {string} params.currentStatus - lifecycleStatus
 * @param {number} [params.previousTravelers]
 * @param {number} [params.nextTravelers]
 * @throws {StateMachineError}
 */
export const TRAVELER_LOCKED_STATUSES = [
  'QUOTED',
  'REVISION',
  'APPROVED',
  'BOOKING_IN_PROGRESS',
  'CONFIRMED',
  'BOOKING_FAILED',
];

function assertFieldEditable(currentStatus, fieldLabel, code) {
  if (TRAVELER_LOCKED_STATUSES.includes(currentStatus)) {
    throw new StateMachineError(
      `Cannot change ${fieldLabel} after QUOTED; move back to DRAFTING first`,
      code,
    );
  }
}

export function validateTravelerUpdate({ currentStatus, previousTravelers, nextTravelers }) {
  if (nextTravelers == null) return;
  if (Number(previousTravelers) === Number(nextTravelers)) return;
  assertFieldEditable(currentStatus, 'numberOfTravelers', 'GATEKEEPER_TRAVELERS_LOCKED');
}

/**
 * Package selection drives the itinerary blueprint, so it locks in step with
 * travelers — same rationale, same unlock path (move back to DRAFTING).
 */
export function validatePackageUpdate({ currentStatus, previousPackageId, nextPackageId }) {
  if (nextPackageId === undefined) return;
  if ((previousPackageId || null) === (nextPackageId || null)) return;
  assertFieldEditable(currentStatus, 'package', 'GATEKEEPER_PACKAGE_LOCKED');
}

/**
 * Travel dates shape the itinerary/pricing the same way package selection
 * does, so they share the traveler-lock window.
 */
export function validateTravelDatesUpdate({
  currentStatus,
  previousTravelDate,
  nextTravelDate,
  previousEndDate,
  nextEndDate,
}) {
  const normalize = (d) => (d ? new Date(d).toISOString().split('T')[0] : null);
  const travelChanged = nextTravelDate !== undefined && normalize(previousTravelDate) !== normalize(nextTravelDate);
  const endChanged = nextEndDate !== undefined && normalize(previousEndDate) !== normalize(nextEndDate);
  if (!travelChanged && !endChanged) return;
  assertFieldEditable(currentStatus, 'travel dates', 'GATEKEEPER_DATES_LOCKED');
}
