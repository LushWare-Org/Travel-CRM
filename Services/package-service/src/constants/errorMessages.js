// ── Hotel Search ─────────────────────────────────────────────────
export const SEARCH_CHECKIN_CHECKOUT = 'checkin and checkout are required';
export const SEARCH_COORDINATES_OR_LOCATION = 'Provide coordinates (lat/lng), city, country, or IATA code';

// ── Hotel Booking ────────────────────────────────────────────────
export const HOTEL_ID_REQUIRED = 'hotelId is required';
export const PREBOOK_ID_REQUIRED = 'prebookId is required';
export const GUESTS_REQUIRED = 'At least one guest is required';
export const CONTACT_EMAIL_REQUIRED = 'contact.email is required';
export const BOOKING_NOT_FOUND = 'Hotel booking not found';
export const BOOKING_ALREADY_CANCELLED = 'Booking is already cancelled';

// ── Auth ─────────────────────────────────────────────────────────
export const NOT_AUTHORIZED = 'Not authorized to access this route';
export const ROLE_NOT_AUTHORIZED = (role) => `Role '${role}' is not authorized to access this route`;