import axios from 'axios';

/**
 * @implements {import('./interface.js').HotelApiClient}
 *
 * LiteAPI hotel booking integration.
 * Auth: x-api-key header (API key)
 * Base URL: https://api.liteapi.travel/v3.0
 */
export class LiteApiClient {
  constructor() {
    this.#ensureConfig();
    console.info('[package-service] Using LiteApiClient — real hotel API integration.');
  }

  /** @param {import('./interface.js').HotelSearchParams} params */
  async searchHotels(params) {
    try {
      // LiteAPI expects children as array of ages (e.g. [5, 8]), not a count
      const occupancies = (params.occupancies || [{ adults: 1 }]).map((o) => ({
        adults: o.adults || 1,
        children: Array.isArray(o.children)
          ? o.children
          : o.children > 0
            ? Array(o.children).fill(8) // default age 8 when count is given
            : [],
      }));

      const body = {
        checkin: params.checkin,
        checkout: params.checkout,
        currency: params.currency || 'USD',
        guestNationality: params.guestNationality || 'US',
        occupancies,
        limit: params.limit || 20,
        maxRatesPerHotel: 1,
      };

      // Location: pick one method based on what's provided
      if (params.city) {
        body.cityName = params.city;
        body.countryCode = params.country || 'LK';
      } else if (params.latitude != null && params.longitude != null) {
        body.latitude = params.latitude;
        body.longitude = params.longitude;
        body.radius = params.radius || 10;
      } else if (params.iataCode) {
        body.iataCode = params.iataCode;
      }

      const { data } = await this.#client().post('/hotels/rates', body);
      return this.#normalizeOffers(data.data || []);
    } catch (err) {
      this.#unwrapError(err, 'Hotel search failed');
    }
  }

  /** @param {string} hotelId */
  async getHotelDetails(hotelId) {
    if (!hotelId) throw new Error('hotelId is required');
    try {
      const { data } = await this.#client().post('/data/hotel', { id: hotelId });
      return this.#normalizeDetails(data.data);
    } catch (err) {
      this.#unwrapError(err, 'Hotel details lookup failed');
    }
  }

  /** @param {import('./interface.js').PrebookParams} params */
  async prebook(params) {
    if (!params.offerId) throw new Error('offerId is required');
    try {
      const { data } = await this.#client().post('/rates/prebook', {
        offerId: params.offerId,
        usePaymentSdk: true,
      });
      const d = data.data;
      return { prebookId: d.prebookId || d.id, status: d.status || 'valid', expiresAt: d.expiresAt };
    } catch (err) {
      this.#unwrapError(err, 'Hotel prebook failed');
    }
  }

  /** @param {import('./interface.js').BookParams} params */
  async book(params) {
    if (!params.prebookId) throw new Error('prebookId is required');
    if (!params.guests?.length) throw new Error('At least one guest is required');
    if (!params.contact?.email) throw new Error('contact.email is required');
    try {
      const { data } = await this.#client().post('/rates/book', params);
      return this.#normalizeBooking(data.data);
    } catch (err) {
      this.#unwrapError(err, 'Hotel booking failed');
    }
  }

  /** @param {import('./interface.js').ListBookingsParams} params */
  async listBookings(params = {}) {
    try {
      const { data } = await this.#client().get('/bookings');
      const bookings = Array.isArray(data.data) ? data.data : [];
      return bookings.map((b) => this.#normalizeBooking(b));
    } catch (err) {
      this.#unwrapError(err, 'Hotel bookings list failed');
    }
  }

  /** @param {string} bookingId */
  async getBooking(bookingId) {
    if (!bookingId) throw new Error('bookingId is required');
    try {
      const { data } = await this.#client().get(`/bookings/${bookingId}`);
      return this.#normalizeBooking(data.data);
    } catch (err) {
      this.#unwrapError(err, 'Hotel booking retrieval failed');
    }
  }

  /** @param {string} bookingId @param {string} [reason] */
  async cancelBooking(bookingId, reason) {
    if (!bookingId) throw new Error('bookingId is required');
    try {
      await this.#client().put(`/bookings/${bookingId}`);
      return { bookingId, status: 'cancelled' };
    } catch (err) {
      this.#unwrapError(err, 'Hotel cancellation failed');
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  #ensureConfig() {
    if (!process.env.LITEAPI_API_KEY) {
      throw new Error('LITEAPI_API_KEY is not configured');
    }
    this._apiKey = process.env.LITEAPI_API_KEY;
  }

  #client() {
    return axios.create({
      baseURL: 'https://api.liteapi.travel/v3.0',
      headers: {
        'x-api-key': this._apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  #normalizeOffers(offers) {
    if (!Array.isArray(offers)) return [];
    return offers.map((hotel) => {
      // LiteAPI v3.0 shape: { hotelId, roomTypes: [{ rates: [{ rateId, boardType, retailRate, ... }] }] }
      // hotel details (name, photos, starRating) are NOT in search response — use /data/hotel to fetch
      const firstRate = hotel.roomTypes?.[0]?.rates?.[0] || {};
      const retail = firstRate.retailRate || {};

      // total/currency are arrays of objects: [{ amount: 233.24, currency: "USD" }]
      const totalItem = Array.isArray(retail.total) ? retail.total[0] : retail.total;
      const taxItem = Array.isArray(retail.taxesAndFees) ? retail.taxesAndFees[0] : retail.taxesAndFees;

      return {
        hotelId: hotel.hotelId,
        name: hotel.name || hotel.hotel?.name || 'Unknown',
        address: hotel.address || hotel.hotel?.address || null,
        starRating: hotel.starRating || hotel.hotel?.starRating || 0,
        images: hotel.photos || hotel.hotel?.photos || [],
        distance: hotel.distance || null,
        latitude: hotel.latitude || hotel.hotel?.location?.latitude || null,
        longitude: hotel.longitude || hotel.hotel?.location?.longitude || null,
        cheapestRate: {
          roomType: firstRate.name || firstRate.roomTypeId || 'Standard',
          boardType: firstRate.boardType || firstRate.boardName || 'RO',
          currency: totalItem?.currency || hotel.currency || 'USD',
          totalAmount: parseFloat(totalItem?.amount || 0) || 0,
          taxes: parseFloat(taxItem?.amount || 0) || 0,
          refundable: firstRate.cancellationPolicies
            ? (Array.isArray(firstRate.cancellationPolicies)
                ? !firstRate.cancellationPolicies.some((p) => p?.nonRefundable)
                : !firstRate.cancellationPolicies?.nonRefundable)
            : true,
          offerId: firstRate.rateId || null,
        },
      };
    });
  }

  #normalizeDetails(d) {
    if (!d) return null;
    return {
      hotelId: d.hotelId || d.id,
      name: d.name || 'Unknown',
      address: d.address || null,
      starRating: d.starRating || 3,
      images: d.images || [],
      amenities: d.amenities || d.facilities || [],
      checkinTime: d.checkinTime || d.checkInTime || null,
      checkoutTime: d.checkoutTime || d.checkOutTime || null,
      description: d.description || null,
      policies: d.policies || [],
      latitude: d.latitude || null,
      longitude: d.longitude || null,
    };
  }

  #normalizeBooking(b) {
    return {
      bookingId: b.bookingId || b.id,
      pnr: b.pnr || b.confirmationCode || null,
      status: b.status || 'confirmed',
      hotelName: b.hotelName || b.hotel?.name || 'Unknown',
      checkin: b.checkin || b.checkIn || null,
      checkout: b.checkout || b.checkOut || null,
      totalAmount: parseFloat(b.totalAmount || b.total || 0),
      currency: b.currency || 'USD',
      cancelledAt: b.cancelledAt || null,
      cancellationReason: b.cancellationReason || null,
    };
  }

  #unwrapError(err, fallbackMessage) {
    if (err.message?.startsWith('LITEAPI_') || err.message?.includes('required')) throw err;
    const status = err.response?.status || 502;
    const raw = err.response?.data?.message || err.response?.data?.error || err.message || fallbackMessage;
    const message = typeof raw === 'object' ? JSON.stringify(raw) : raw;
    throw new Error(`LiteAPI error (${status}): ${message}`);
  }
}
