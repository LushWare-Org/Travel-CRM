import axios from 'axios';
import AppError from '../utils/appError.js';

// ── Mode ─────────────────────────────────────────────────────────────────
// Sandbox credentials aren't available yet. While TRAVELPORT_MOCK_MODE=true
// every export below returns realistic fake data instead of calling
// Travelport, so the rest of the stack (routes, persistence, UI) can be
// built and tested now. Flip the flag once real credentials exist — only
// this file needs to change.
const isMockMode = () => process.env.TRAVELPORT_MOCK_MODE !== 'false';

if (isMockMode()) {
  console.warn('[flight-service] TRAVELPORT_MOCK_MODE is enabled — returning fake Travelport data.');
}

// ── OAuth2 token cache ───────────────────────────────────────────────────
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (isMockMode()) return 'mock-access-token';

  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 30_000) return cachedToken;

  const { TRAVELPORT_TOKEN_URL, TRAVELPORT_CLIENT_ID, TRAVELPORT_CLIENT_SECRET } = process.env;
  if (!TRAVELPORT_TOKEN_URL || !TRAVELPORT_CLIENT_ID || !TRAVELPORT_CLIENT_SECRET) {
    throw new AppError('Travelport is not configured (missing TRAVELPORT_TOKEN_URL/CLIENT_ID/CLIENT_SECRET)', 503);
  }

  try {
    const response = await axios.post(
      TRAVELPORT_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: TRAVELPORT_CLIENT_ID,
        client_secret: TRAVELPORT_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    cachedToken = response.data.access_token;
    cachedTokenExpiresAt = now + (response.data.expires_in || 1800) * 1000;
    return cachedToken;
  } catch (err) {
    throw new AppError(
      `Failed to authenticate with Travelport: ${err.response?.data?.error_description || err.message}`,
      502
    );
  }
}

async function travelportClient() {
  const token = await getAccessToken();
  return axios.create({
    baseURL: process.env.TRAVELPORT_API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(process.env.TRAVELPORT_ACCESS_GROUP && { 'XAUTH_TRAVELPORT_ACCESSGROUP': process.env.TRAVELPORT_ACCESS_GROUP }),
    },
  });
}

function unwrapTravelportError(err, fallbackMessage) {
  if (err instanceof AppError) throw err;
  const status = err.response?.status || 502;
  const message = err.response?.data?.Messages?.[0]?.Text || err.response?.data?.message || err.message || fallbackMessage;
  throw new AppError(`Travelport error: ${message}`, status >= 400 && status < 600 ? status : 502);
}

// ── Mock data builders ──────────────────────────────────────────────────
const AIRLINES = [
  { code: 'BA', name: 'British Airways' },
  { code: 'EK', name: 'Emirates' },
  { code: 'QR', name: 'Qatar Airways' },
  { code: 'SQ', name: 'Singapore Airlines' },
];

function buildMockSegment({ origin, destination, departureDate, sequence, airline }) {
  const depHour = 6 + ((sequence * 3) % 14);
  const durationMinutes = 120 + ((sequence * 47) % 480);
  const departureAt = new Date(`${departureDate}T${String(depHour).padStart(2, '0')}:00:00Z`);
  const arrivalAt = new Date(departureAt.getTime() + durationMinutes * 60_000);

  return {
    sequence,
    marketingCarrier: airline.code,
    operatingCarrier: airline.code,
    flightNumber: `${airline.code}${100 + sequence * 37}`,
    bookingClass: 'Y',
    origin,
    destination,
    departureAt: departureAt.toISOString(),
    arrivalAt: arrivalAt.toISOString(),
    durationMinutes,
    stops: 0,
  };
}

function buildMockOffer({ origin, destination, departureDate, returnDate, cabinClass, index }) {
  const airline = AIRLINES[index % AIRLINES.length];
  const baseFare = 220 + index * 65;
  const taxes = Math.round(baseFare * 0.18);
  const segments = [buildMockSegment({ origin, destination, departureDate, sequence: 1, airline })];
  if (returnDate) {
    segments.push(buildMockSegment({ origin: destination, destination: origin, departureDate: returnDate, sequence: 2, airline }));
  }

  return {
    offerId: `MOCK-OFFER-${origin}${destination}-${departureDate}-${index}`,
    airline: airline.name,
    airlineCode: airline.code,
    cabinClass: cabinClass || 'Economy',
    currency: 'USD',
    baseFare,
    taxes,
    fareTotal: baseFare + taxes,
    refundable: index % 2 === 0,
    segments,
  };
}

// ── Public API ───────────────────────────────────────────────────────────

export async function searchFlights({ origin, destination, departureDate, returnDate, adults = 1, children = 0, infants = 0, cabinClass, tripType }) {
  if (!origin || !destination || !departureDate) {
    throw new AppError('origin, destination and departureDate are required', 400);
  }

  if (isMockMode()) {
    const paxMultiplier = adults + children + infants;
    return Array.from({ length: 5 }, (_, index) => {
      const offer = buildMockOffer({ origin, destination, departureDate, returnDate, cabinClass, index });
      offer.baseFare *= paxMultiplier;
      offer.taxes *= paxMultiplier;
      offer.fareTotal = offer.baseFare + offer.taxes;
      return offer;
    });
  }

  try {
    const client = await travelportClient();
    // NOTE: exact Travelport+ catalog-search endpoint/request shape must be
    // confirmed against live API docs once sandbox credentials are issued.
    const { data } = await client.post('/air/catalogsearch', {
      origin, destination, departureDate, returnDate, adults, children, infants, cabinClass, tripType,
    });
    return data;
  } catch (err) {
    unwrapTravelportError(err, 'Flight search failed');
  }
}

export async function priceOffer(offerId) {
  if (!offerId) throw new AppError('offerId is required', 400);

  if (isMockMode()) {
    return { offerId, revalidated: true, priceChanged: false };
  }

  try {
    const client = await travelportClient();
    const { data } = await client.post('/air/price', { offerId });
    return data;
  } catch (err) {
    unwrapTravelportError(err, 'Flight pricing failed');
  }
}

export async function createOrder({ offerId, travelers, contact }) {
  if (!offerId) throw new AppError('offerId is required', 400);
  if (!Array.isArray(travelers) || travelers.length === 0) {
    throw new AppError('At least one traveler is required', 400);
  }

  if (isMockMode()) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      pnr: `MOCK${suffix}`,
      travelportOrderId: `MOCK-ORDER-${suffix}`,
      status: 'confirmed',
      ticketingDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  try {
    const client = await travelportClient();
    const { data } = await client.post('/order', { offerId, travelers, contact });
    return data;
  } catch (err) {
    unwrapTravelportError(err, 'Flight booking failed');
  }
}

export async function getOrder(travelportOrderId) {
  if (!travelportOrderId) throw new AppError('travelportOrderId is required', 400);

  if (isMockMode()) {
    return { travelportOrderId, status: 'confirmed' };
  }

  try {
    const client = await travelportClient();
    const { data } = await client.get(`/order/${travelportOrderId}`);
    return data;
  } catch (err) {
    unwrapTravelportError(err, 'Failed to retrieve order');
  }
}

export async function cancelOrder(travelportOrderId) {
  if (!travelportOrderId) throw new AppError('travelportOrderId is required', 400);

  if (isMockMode()) {
    return { travelportOrderId, status: 'cancelled' };
  }

  try {
    const client = await travelportClient();
    const { data } = await client.post(`/order/${travelportOrderId}/cancel`);
    return data;
  } catch (err) {
    unwrapTravelportError(err, 'Failed to cancel order');
  }
}
