/**
 * Centralised error messages for the flight service.
 * @module constants/errorMessages
 */

// ── Search ───────────────────────────────────────────────────────────
export const SEARCH_REQUIRED_FIELDS = 'origin, destination and departureDate are required';

// ── Pricing ──────────────────────────────────────────────────────────
export const OFFER_ID_REQUIRED = 'offerId is required';

// ── Booking ──────────────────────────────────────────────────────────
export const OFFER_REQUIRED = 'offer is required';
export const TRAVELERS_REQUIRED = 'At least one traveler is required';
export const CONTACT_EMAIL_REQUIRED = 'contact.email is required';
export const BOOKING_NOT_FOUND = 'Flight booking not found';
export const BOOKING_ALREADY_CANCELLED = 'Booking is already cancelled';

// ── Travelport ───────────────────────────────────────────────────────
export const TRAVELPORT_NOT_CONFIGURED =
  'Travelport is not configured (missing TRAVELPORT_TOKEN_URL/CLIENT_ID/CLIENT_SECRET)';
export const TRAVELPORT_AUTH_FAILED = 'Failed to authenticate with Travelport';
export const TRAVELPORT_SEARCH_FAILED = 'Flight search failed';
export const TRAVELPORT_PRICE_FAILED = 'Flight pricing failed';
export const TRAVELPORT_BOOK_FAILED = 'Flight booking failed';
export const TRAVELPORT_ORDER_ID_REQUIRED = 'travelportOrderId is required';
export const TRAVELPORT_ORDER_RETRIEVE_FAILED = 'Failed to retrieve order';
export const TRAVELPORT_CANCEL_FAILED = 'Failed to cancel order';

// ── Duffel ───────────────────────────────────────────────────────────
export const DUFFEL_NOT_CONFIGURED =
  'Duffel is not configured (missing DUFFEL_ACCESS_TOKEN)';
export const DUFFEL_SEARCH_FAILED = 'Duffel flight search failed';
export const DUFFEL_BOOK_FAILED = 'Duffel flight booking failed';
export const DUFFEL_ORDER_RETRIEVE_FAILED = 'Duffel order retrieval failed';
export const DUFFEL_CANCEL_FAILED = 'Duffel order cancellation failed';

// ── Auth ─────────────────────────────────────────────────────────────
export const NOT_AUTHORIZED = 'Not authorized to access this route';
export const ROLE_NOT_AUTHORIZED = (role) => `Role '${role}' is not authorized to access this route`;
