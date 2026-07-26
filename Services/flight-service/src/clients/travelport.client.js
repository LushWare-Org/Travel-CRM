import axios from 'axios';
import AppError from '../utils/appError.js';
import logger from '../config/logger.js';
import { BAD_REQUEST, BAD_GATEWAY, SERVICE_UNAVAILABLE } from '../constants/httpStatus.js';
import {
  SEARCH_REQUIRED_FIELDS,
  OFFER_ID_REQUIRED,
  TRAVELERS_REQUIRED,
  TRAVELPORT_NOT_CONFIGURED,
  TRAVELPORT_AUTH_FAILED,
  TRAVELPORT_SEARCH_FAILED,
  TRAVELPORT_PRICE_FAILED,
  TRAVELPORT_BOOK_FAILED,
  TRAVELPORT_ORDER_ID_REQUIRED,
  TRAVELPORT_ORDER_RETRIEVE_FAILED,
  TRAVELPORT_CANCEL_FAILED,
} from '../constants/errorMessages.js';

/**
 * @implements {import('./interface.js').FlightApiClient}
 *
 * Live Travelport+ GDS integration via OAuth2 client credentials.
 */
export class TravelportClient {
  constructor() {
    /** @type {string|null} */
    this._cachedToken = null;
    /** @type {number} */
    this._cachedTokenExpiresAt = 0;
    logger.info('Using TravelportClient — real GDS integration');
  }

  // ── Public API (implements FlightApiClient) ──────────────────────

  /** @param {import('./interface.js').SearchParams} params */
  async searchFlights({ origin, destination, departureDate, returnDate, adults = 1, children = 0, infants = 0, cabinClass, tripType }) {
    if (!origin || !destination || !departureDate) {
      throw new AppError(SEARCH_REQUIRED_FIELDS, BAD_REQUEST);
    }

    try {
      const client = await this.#getClient();
      // NOTE: exact Travelport+ catalog-search endpoint/request shape must be
      // confirmed against live API docs once sandbox credentials are issued.
      const { data } = await client.post('/air/catalogsearch', {
        origin, destination, departureDate, returnDate, adults, children, infants, cabinClass, tripType,
      });
      return data;
    } catch (err) {
      this.#unwrapError(err, TRAVELPORT_SEARCH_FAILED);
    }
  }

  /** @param {string} offerId */
  async priceOffer(offerId) {
    if (!offerId) throw new AppError(OFFER_ID_REQUIRED, BAD_REQUEST);

    try {
      const client = await this.#getClient();
      const { data } = await client.post('/air/price', { offerId });
      return data;
    } catch (err) {
      this.#unwrapError(err, TRAVELPORT_PRICE_FAILED);
    }
  }

  /** @param {import('./interface.js').CreateOrderParams} params */
  async createOrder({ offerId, travelers, contact }) {
    if (!offerId) throw new AppError(OFFER_ID_REQUIRED, BAD_REQUEST);
    if (!Array.isArray(travelers) || travelers.length === 0) {
      throw new AppError(TRAVELERS_REQUIRED, BAD_REQUEST);
    }

    try {
      const client = await this.#getClient();
      const { data } = await client.post('/order', { offerId, travelers, contact });
      return data;
    } catch (err) {
      this.#unwrapError(err, TRAVELPORT_BOOK_FAILED);
    }
  }

  /** @param {string} travelportOrderId */
  async getOrder(travelportOrderId) {
    if (!travelportOrderId) throw new AppError(TRAVELPORT_ORDER_ID_REQUIRED, BAD_REQUEST);

    try {
      const client = await this.#getClient();
      const { data } = await client.get(`/order/${travelportOrderId}`);
      return data;
    } catch (err) {
      this.#unwrapError(err, TRAVELPORT_ORDER_RETRIEVE_FAILED);
    }
  }

  /** @param {string} travelportOrderId */
  async cancelOrder(travelportOrderId) {
    if (!travelportOrderId) throw new AppError(TRAVELPORT_ORDER_ID_REQUIRED, BAD_REQUEST);

    try {
      const client = await this.#getClient();
      const { data } = await client.post(`/order/${travelportOrderId}/cancel`);
      return data;
    } catch (err) {
      this.#unwrapError(err, TRAVELPORT_CANCEL_FAILED);
    }
  }

  /** @param {import('./interface.js').FlightDetailsParams} params */
  async getFlightDetails({ flightNumber, departureDate, origin, destination }) {
    try {
      const client = await this.#getClient();
      const { data } = await client.get('/air/flightdetails', {
        params: { flightNumber, departureDate, origin, destination },
      });
      return data;
    } catch (err) {
      this.#unwrapError(err, 'Flight details lookup failed');
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  async #getAccessToken() {
    const now = Date.now();
    if (this._cachedToken && now < this._cachedTokenExpiresAt - 30_000) {
      return this._cachedToken;
    }

    const { TRAVELPORT_TOKEN_URL, TRAVELPORT_CLIENT_ID, TRAVELPORT_CLIENT_SECRET } = process.env;
    if (!TRAVELPORT_TOKEN_URL || !TRAVELPORT_CLIENT_ID || !TRAVELPORT_CLIENT_SECRET) {
      throw new AppError(TRAVELPORT_NOT_CONFIGURED, SERVICE_UNAVAILABLE);
    }

    try {
      const response = await axios.post(
        TRAVELPORT_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: TRAVELPORT_CLIENT_ID,
          client_secret: TRAVELPORT_CLIENT_SECRET,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      this._cachedToken = response.data.access_token;
      this._cachedTokenExpiresAt = now + (response.data.expires_in || 1800) * 1000;
      return this._cachedToken;
    } catch (err) {
      throw new AppError(
        `${TRAVELPORT_AUTH_FAILED}: ${err.response?.data?.error_description || err.message}`,
        BAD_GATEWAY,
      );
    }
  }

  async #getClient() {
    const token = await this.#getAccessToken();
    return axios.create({
      baseURL: process.env.TRAVELPORT_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(process.env.TRAVELPORT_ACCESS_GROUP && {
          'XAUTH_TRAVELPORT_ACCESSGROUP': process.env.TRAVELPORT_ACCESS_GROUP,
        }),
      },
    });
  }

  #unwrapError(err, fallbackMessage) {
    if (err instanceof AppError) throw err;
    const status = err.response?.status || 502;
    const message =
      err.response?.data?.Messages?.[0]?.Text ||
      err.response?.data?.message ||
      err.message ||
      fallbackMessage;
    throw new AppError(
      `Travelport error: ${message}`,
      status >= 400 && status < 600 ? status : BAD_GATEWAY,
    );
  }
}
