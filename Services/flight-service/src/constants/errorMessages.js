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
export const TRAVELPORT_ORDER_ID_REQUIRED = 'travelportOrderId is required';

// ── Auth ─────────────────────────────────────────────────────────────
export const NOT_AUTHORIZED = 'Not authorized to access this route';
export const ROLE_NOT_AUTHORIZED = (role) => `Role '${role}' is not authorized to access this route`;

// ── Provider failures (Duffel and Travelport) ────────────────────────
// Written for a traveller, not an operator. Each one answers "what do I do now?"
// and never names the supplier, repeats the supplier's error text, or mentions an
// environment variable. The provider's own payload is logged by the client that
// caught it, so nothing is lost for debugging — it just does not reach a browser.
export const PROVIDER_NOT_CONFIGURED_FRIENDLY =
  'Flight search is temporarily unavailable. Please try again in a moment.';
export const FLIGHT_SERVICE_UNAVAILABLE =
  'Flight service is temporarily unavailable. Please try again in a moment.';

const SEARCH_REJECTED =
  "We couldn't find flights for that search. Check the dates and airports and try again.";
const SEARCH_UNAVAILABLE = 'Flight search is temporarily unavailable. Please try again in a moment.';
const FARE_GONE = 'That fare is no longer available. Please search again.';
const FARE_UNAVAILABLE = "We couldn't confirm that fare right now. Please try again in a moment.";
const BOOKING_REJECTED =
  "The airline couldn't confirm this booking. Check the passenger details and try again.";
const BOOKING_UNAVAILABLE = 'Booking is temporarily unavailable. Please try again in a moment.';
const BOOKING_GONE = "We couldn't find that flight booking.";
const BOOKING_LOAD_UNAVAILABLE = "We couldn't load that flight booking right now. Please try again.";
const CANCEL_REJECTED =
  "The airline wouldn't accept that cancellation. Please check the booking and try again.";
const CANCEL_UNAVAILABLE = "We couldn't cancel that booking right now. Please try again in a moment.";

/**
 * Maps a provider failure to the status, code and sentence a client is shown.
 *
 * A 4xx the traveller cannot act on collapses to a retryable 502, so the frontend
 * never has to explain a supplier's validation vocabulary. The codes separate the
 * two situations the UI treats differently: PROVIDER_REJECTED means the request
 * needs changing, PROVIDER_UNAVAILABLE means retrying later will help.
 *
 * @param {'search'|'price'|'book'|'retrieve'|'cancel'} operation
 * @param {number|undefined} providerStatus the provider's HTTP status, if it responded
 * @returns {{ statusCode: number, code: string, message: string }}
 */
export function flightProviderFailure(operation, providerStatus) {
  const status = Number.isFinite(providerStatus) ? providerStatus : undefined;
  const clientError = status >= 400 && status < 500;

  switch (operation) {
    case 'search':
      return clientError
        ? { statusCode: 400, code: 'PROVIDER_REJECTED', message: SEARCH_REJECTED }
        : { statusCode: 502, code: 'PROVIDER_UNAVAILABLE', message: SEARCH_UNAVAILABLE };
    case 'price':
      return status === 404 || status === 409
        ? { statusCode: 404, code: 'NOT_FOUND', message: FARE_GONE }
        : { statusCode: 502, code: 'PROVIDER_UNAVAILABLE', message: FARE_UNAVAILABLE };
    case 'book':
      return clientError
        ? { statusCode: 400, code: 'PROVIDER_REJECTED', message: BOOKING_REJECTED }
        : { statusCode: 502, code: 'PROVIDER_UNAVAILABLE', message: BOOKING_UNAVAILABLE };
    case 'retrieve':
      return status === 404
        ? { statusCode: 404, code: 'NOT_FOUND', message: BOOKING_GONE }
        : { statusCode: 502, code: 'PROVIDER_UNAVAILABLE', message: BOOKING_LOAD_UNAVAILABLE };
    case 'cancel':
      return clientError
        ? { statusCode: 400, code: 'PROVIDER_REJECTED', message: CANCEL_REJECTED }
        : { statusCode: 502, code: 'PROVIDER_UNAVAILABLE', message: CANCEL_UNAVAILABLE };
    default:
      return { statusCode: 502, code: 'PROVIDER_UNAVAILABLE', message: FLIGHT_SERVICE_UNAVAILABLE };
  }
}
