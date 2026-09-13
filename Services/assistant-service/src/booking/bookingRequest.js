import { WebsiteBookingRequest } from '@travel-crm/contracts';
import { domainAuthHeader } from '../utils/cloudRunAuth.js';
import logger from '../config/logger.js';

// ─── Website booking submission ───────────────────────────────────────────
// The only outbound WRITE on the public assistant path, and the only call that
// cannot reuse `toolRegistry.js`'s `fetchJson`: that helper takes no method or
// body, and it collapses every non-OK status into `{ unavailable: true }`. For a
// booking that distinction is the whole answer — a 400 means the visitor's date
// or address was rejected and they can fix it, while a 5xx means nothing was
// written and they should try later. Telling them the wrong one either discards
// a correctable form or invites a retry that was never going to work.
//
// The call itself copies `fetchJson`'s shape deliberately: the base URL is the
// ID-token audience (`domainAuthHeader(base)`), and a redirect is refused rather
// than followed, because following one would re-send the Authorization header to
// whatever origin the target names.

/** Caps the whole call regardless of what the turn had left. */
const BOOKING_TIMEOUT_MS = 10_000;

/**
 * Read at call time, not import time, so a test or deployment can point this at
 * another host without re-importing the module — the convention the other
 * service-URL helpers in `toolRegistry.js` follow. Declared here rather than
 * there because that file is the management copilot's tool registry and this is
 * a public-path write.
 */
function bookingServiceUrl() {
  return process.env.BOOKING_SERVICE_URL || 'http://localhost:3005';
}

/**
 * Submits one booking request.
 *
 * `reason` is what the caller turns into copy:
 *   rejected       the service refused the payload (a 400 — the visitor can fix it)
 *   not_authorized we could not reach the container at all (a missing grant, not a bad request)
 *   unavailable    nothing was written; a retry is the right advice
 *
 * `bookingId` is null when the service answered without one — the booking exists
 * either way, so the caller must not treat a missing id as a failure.
 */
export async function submitWebsiteBooking(payload, { signal } = {}) {
  // Validated here so a malformed payload is our own logged refusal rather than
  // a 400 we would then have to explain to the visitor as their mistake.
  const parsed = WebsiteBookingRequest.safeParse(payload);
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues },
      'Refused to send a booking request that does not match the wire contract',
    );
    return { ok: false, reason: 'rejected' };
  }

  const base = bookingServiceUrl();
  const timeout = AbortSignal.timeout(BOOKING_TIMEOUT_MS);
  const bounded = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    const auth = await domainAuthHeader(base);
    const res = await fetch(new URL('/api/v1/bookings/website', base).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify(parsed.data),
      redirect: 'error',
      signal: bounded,
    });

    if (res.status === 201 || res.status === 200) {
      const json = await res.json().catch(() => null);
      const bookingId = json?.data?.bookingId;
      return { ok: true, bookingId: typeof bookingId === 'string' ? bookingId : null };
    }
    if (res.status === 400) return { ok: false, reason: 'rejected' };
    if (res.status === 403 || res.status === 404) {
      logger.warn({ status: res.status, base }, 'Booking service refused the assistant call at the platform edge');
      return { ok: false, reason: 'not_authorized' };
    }
    return { ok: false, reason: 'unavailable' };
  } catch (err) {
    logger.error({ err, base }, 'Failed to submit a booking request for the assistant');
    return { ok: false, reason: 'unavailable' };
  }
}
