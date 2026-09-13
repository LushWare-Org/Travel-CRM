import axios from 'axios';
import AppError from '../utils/appError.js';
import logger from '../config/logger.js';
import { BAD_REQUEST, SERVICE_UNAVAILABLE } from '../constants/httpStatus.js';
import {
  SEARCH_REQUIRED_FIELDS,
  OFFER_ID_REQUIRED,
  TRAVELERS_REQUIRED,
  TRAVELPORT_ORDER_ID_REQUIRED,
  PROVIDER_NOT_CONFIGURED_FRIENDLY,
  flightProviderFailure,
} from '../constants/errorMessages.js';

/**
 * Duffel API base URL.
 * @type {string}
 */
const DUFFEL_BASE_URL = 'https://api.duffel.com';

/**
 * @implements {import('./interface.js').FlightApiClient}
 *
 * Duffel Flights API integration.
 * Auth: Bearer token (API access key)
 * Version: Duffel-Version: v2 header required
 * Rate limit: 60 requests per 60 seconds
 *
 * Key differences from Travelport:
 * - API token auth instead of OAuth2
 * - Search returns priced offers immediately (no separate price step)
 * - Cancellation is two-step: create cancellation → confirm
 * - All request bodies wrapped in { data: {...} }
 */
export class DuffelClient {
  constructor() {
    this.#ensureConfig();
    logger.info('Using DuffelClient — live Duffel API integration');
  }

  // ── Public API (implements FlightApiClient) ──────────────────────

  /** @param {import('./interface.js').SearchParams} params */
  async searchFlights({ origin, destination, departureDate, returnDate, adults = 1, children = 0, infants = 0, cabinClass, tripType }) {
    if (!origin || !destination || !departureDate) {
      throw new AppError(SEARCH_REQUIRED_FIELDS, BAD_REQUEST);
    }

    const slices = this.#buildSlices({ origin, destination, departureDate, returnDate });
    const passengers = this.#buildPassengers({ adults, children, infants });

    try {
      const { data } = await this.#client().post('/air/offer_requests', {
        data: {
          slices,
          passengers,
          cabin_class: this.#mapCabinClass(cabinClass),
          return_offers: true,
        },
      });

      return this.#normalizeOffers(data.data);
    } catch (err) {
      this.#unwrapError(err, 'search');
    }
  }

  /**
   * Duffel offers are priced at search time. Price revalidation fetches the
   * latest offer state (price may have changed since search).
   * @param {string} offerId
   */
  async priceOffer(offerId) {
    if (!offerId) throw new AppError(OFFER_ID_REQUIRED, BAD_REQUEST);

    try {
      const { data } = await this.#client().get(`/air/offers/${offerId}`, {
        params: { return_available_services: false },
      });

      const offer = data.data;
      return {
        offerId: offer.id,
        revalidated: true,
        priceChanged: offer.total_amount !== offer.base_amount,
      };
    } catch (err) {
      this.#unwrapError(err, 'price');
    }
  }

  /** @param {import('./interface.js').CreateOrderParams & { totalAmount?: number, currency?: string }} params */
  async createOrder({ offerId, travelers, contact, totalAmount, currency }) {
    if (!offerId) throw new AppError(OFFER_ID_REQUIRED, BAD_REQUEST);
    if (!Array.isArray(travelers) || travelers.length === 0) {
      throw new AppError(TRAVELERS_REQUIRED, BAD_REQUEST);
    }

    try {
      const { data } = await this.#client().post('/air/orders', {
        data: {
          type: 'instant',
          selected_offers: [offerId],
          passengers: this.#normalizePassengersForOrder(travelers),
          payments: [
            {
              type: 'balance',
              amount: totalAmount != null ? String(totalAmount) : '0.00',
              currency: currency || 'USD',
            },
          ],
        },
      });

      return this.#normalizeOrder(data.data);
    } catch (err) {
      this.#unwrapError(err, 'book');
    }
  }

  /** @param {string} orderId */
  async getOrder(orderId) {
    if (!orderId) throw new AppError(TRAVELPORT_ORDER_ID_REQUIRED, BAD_REQUEST);

    try {
      const { data } = await this.#client().get(`/air/orders/${orderId}`);
      return this.#normalizeOrder(data.data);
    } catch (err) {
      this.#unwrapError(err, 'retrieve');
    }
  }

  /**
   * Duffel cancellation is two-step:
   * 1. POST /air/order_cancellations → get preview + cancellation ID
   * 2. POST /air/order_cancellations/:id/actions/confirm → finalise
   * @param {string} orderId
   */
  async cancelOrder(orderId) {
    if (!orderId) throw new AppError(TRAVELPORT_ORDER_ID_REQUIRED, BAD_REQUEST);

    try {
      // Step 1: Create pending cancellation
      const { data: cancellation } = await this.#client().post('/air/order_cancellations', {
        data: { order_id: orderId },
      });

      // Step 2: Confirm immediately (irreversible)
      await this.#client().post(
        `/air/order_cancellations/${cancellation.data.id}/actions/confirm`,
      );

      return {
        travelportOrderId: orderId,
        status: 'cancelled',
        refundAmount: cancellation.data.refund_amount,
        refundCurrency: cancellation.data.refund_currency,
      };
    } catch (err) {
      this.#unwrapError(err, 'cancel');
    }
  }

  /** @param {import('./interface.js').FlightDetailsParams} params */
  async getFlightDetails({ flightNumber, departureDate, origin, destination }) {
    // Duffel doesn't provide real-time flight status. Return a stub
    // directing users to use airline-specific tools for live tracking.
    return {
      flightNumber,
      status: 'SCHEDULED',
      aircraft: null,
      departure: {
        airport: origin || null,
        scheduled: departureDate ? `${departureDate}T00:00:00Z` : null,
      },
      arrival: { airport: destination || null },
      baggage: null,
      seatMap: { available: false },
      mealService: false,
      wifiAvailable: false,
      note: 'Live flight details are not available via Duffel. Use airline-specific status APIs.',
    };
  }

  // ── Private: config ──────────────────────────────────────────────

  #ensureConfig() {
    const token = process.env.DUFFEL_ACCESS_TOKEN;
    if (!token) {
      throw new AppError(PROVIDER_NOT_CONFIGURED_FRIENDLY, SERVICE_UNAVAILABLE, {
        code: 'PROVIDER_UNAVAILABLE',
      });
    }
    this._token = token;
  }

  #client() {
    return axios.create({
      baseURL: DUFFEL_BASE_URL,
      headers: {
        Authorization: `Bearer ${this._token}`,
        'Duffel-Version': 'v2',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  // ── Private: data transforms ─────────────────────────────────────

  /**
   * Build Duffel slices from our search params.
   * @returns {Array<{origin: string, destination: string, departure_date: string}>}
   */
  #buildSlices({ origin, destination, departureDate, returnDate }) {
    const slices = [
      { origin: origin.toUpperCase(), destination: destination.toUpperCase(), departure_date: departureDate },
    ];

    if (returnDate) {
      slices.push({
        origin: destination.toUpperCase(),
        destination: origin.toUpperCase(),
        departure_date: returnDate,
      });
    }

    return slices;
  }

  /**
   * Duffel requires passenger type and age at search time.
   * @returns {Array<{type?: string, age?: number}>}
   */
  #buildPassengers({ adults, children, infants }) {
    const passengers = [];

    for (let i = 0; i < adults; i++) {
      passengers.push({ type: 'adult' });
    }
    for (let i = 0; i < children; i++) {
      // Children: use age instead of type per Duffel API
      passengers.push({ age: 8 });
    }
    for (let i = 0; i < infants; i++) {
      passengers.push({ type: 'infant_without_seat' });
    }

    return passengers;
  }

  /** @param {string} [cabinClass] */
  #mapCabinClass(cabinClass) {
    const map = {
      Economy: 'economy',
      'Premium Economy': 'premium_economy',
      Business: 'business',
      First: 'first',
    };
    return map[cabinClass] || 'economy';
  }

  /**
   * Normalise Duffel offer response → our FlightOffer shape.
   */
  #normalizeOffers(offerRequest) {
    const offers = offerRequest.offers || [];
    const passengers = offerRequest.passengers || [];

    return offers.map((offer) => {
      const firstSlice = offer.slices?.[0];
      const firstSegment = firstSlice?.segments?.[0];
      const lastSlice = offer.slices?.[offer.slices.length - 1];
      const lastSegment = lastSlice?.segments?.[lastSlice.segments.length - 1];

      return {
        offerId: offer.id,
        airline: offer.owner?.name || 'Unknown',
        airlineCode: offer.owner?.iata_code || 'XX',
        legCount: (offer.slices || []).length,
        cabinClass: firstSlice?.cabin_class || 'economy',
        currency: offer.total_currency,
        baseFare: parseFloat(offer.base_amount) || 0,
        taxes: parseFloat(offer.tax_amount) || 0,
        fareTotal: parseFloat(offer.total_amount) || 0,
        refundable: offer.conditions?.refund_before_departure?.allowed ?? false,
        passengerIds: passengers.map((p) => p.id),
        segments: (offer.slices || []).flatMap((slice, sliceIdx) =>
          (slice.segments || []).map((seg, segIdx) => ({
            sequence: sliceIdx * 100 + segIdx + 1,
            marketingCarrier: seg.marketing_carrier?.iata_code || 'XX',
            operatingCarrier: seg.operating_carrier?.iata_code || seg.marketing_carrier?.iata_code || null,
            flightNumber: `${seg.marketing_carrier?.iata_code || 'XX'}${seg.marketing_carrier_flight_number || ''}`,
            bookingClass: null,
            origin: seg.origin?.iata_code || '',
            destination: seg.destination?.iata_code || '',
            departureAt: seg.departing_at,
            arrivalAt: seg.arriving_at,
            durationMinutes: seg.duration ? this.#parseDuration(seg.duration) : null,
            stops: slice.segments.length - 1,
          })),
        ),
      };
    });
  }

  /**
   * Normalise Duffel order response → our OrderResult shape.
   */
  #normalizeOrder(order) {
    return {
      pnr: order.booking_reference,
      travelportOrderId: order.id,
      status: order.cancelled_at ? 'cancelled' : 'confirmed',
      ticketingDeadline: null,
      totalAmount: parseFloat(order.total_amount) || 0,
      currency: order.total_currency,
      cancelledAt: order.cancelled_at || null,
      cancellationReason: null,
    };
  }

  #normalizePassengersForOrder(travelers) {
    return travelers.map((t, idx) => ({
      id: t.passengerId || `pas_${idx}`,
      given_name: t.firstName,
      family_name: t.lastName,
      born_on: t.dob || '1990-01-01',
      email: t.email || 'traveler@example.com',
      phone_number: t.phone && /^\+[1-9]\d{6,14}$/.test(t.phone)
        ? t.phone
        : '+442080160508', // valid London landline test number
      gender: t.gender === 'M' ? 'm' : t.gender === 'F' ? 'f' : 'm',
      title: (t.title || 'mr').toLowerCase(),
    }));
  }

  /**
   * Convert ISO 8601 duration string (e.g. "PT2H30M") to minutes.
   */
  #parseDuration(iso) {
    const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return null;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return hours * 60 + minutes;
  }

  // ── Private: error handling ───────────────────────────────────────

  /**
   * Turns a provider failure into a user-facing AppError.
   *
   * The provider's payload is logged here and nowhere else; what reaches the caller
   * carries only a sentence written for a traveller. `operation` selects which one,
   * because "that fare has gone" and "search is down" need different advice.
   *
   * @param {unknown} err
   * @param {'search'|'price'|'book'|'retrieve'|'cancel'} operation
   */
  #unwrapError(err, operation) {
    if (err instanceof AppError) throw err;

    logger.error(
      { status: err.response?.status, data: err.response?.data, operation },
      'Duffel API error details',
    );

    const { statusCode, code, message } = flightProviderFailure(operation, err.response?.status);
    throw new AppError(message, statusCode, { code });
  }
}
