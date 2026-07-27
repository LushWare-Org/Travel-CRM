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
 * @param {Object} [params.financials={}] - Lead.financials JSON
 * @param {string} [params.lostReason] - Required when transitioning to CLOSED_LOST
 * @returns {{ nextStatus: string, recalculate: boolean }}
 * @throws {StateMachineError}
 */
export function validateTransition({ currentStatus, nextStatus, financials = {}, lostReason }) {
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

  const fp = financials || {};
  const cp = fp.clientPricing || {};
  const act = fp.actual || {};

  // Gatekeeper: DRAFTING -> QUOTED requires quotedSellingPrice > 0
  if (currentStatus === 'DRAFTING' && nextStatus === 'QUOTED') {
    const qsp = cp.quotedSellingPrice;
    if (!qsp || qsp <= 0) {
      throw new StateMachineError(
        'Cannot transition to QUOTED: quotedSellingPrice must be greater than 0',
        'GATEKEEPER_QUOTED_PRICE',
      );
    }
  }

  // Gatekeeper: QUOTED/REVISION -> APPROVED requires depositPaid > 0
  if ((currentStatus === 'QUOTED' || currentStatus === 'REVISION') && nextStatus === 'APPROVED') {
    const deposit = cp.depositPaid;
    if (!deposit || deposit <= 0) {
      throw new StateMachineError(
        'Cannot transition to APPROVED: depositPaid must be greater than 0',
        'GATEKEEPER_APPROVED_DEPOSIT',
      );
    }
  }

  // Gatekeeper: BOOKING_IN_PROGRESS -> CONFIRMED requires both actual costs > 0
  if (currentStatus === 'BOOKING_IN_PROGRESS' && nextStatus === 'CONFIRMED') {
    const flightCost = act.actualFlightCost;
    const hotelCost = act.actualHotelCost;
    if (!flightCost || flightCost <= 0 || !hotelCost || hotelCost <= 0) {
      throw new StateMachineError(
        'Cannot transition to CONFIRMED: both actualFlightCost and actualHotelCost must be greater than 0',
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
