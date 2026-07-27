/**
 * LiteAPI — live integration tests.
 * Auto-skips when LITEAPI_API_KEY is not set.
 *
 * Run: npm test -- test/integration/hotels.liteapi.live.test.js
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { LiteApiClient } from '../../src/hotels/clients/liteapi.client.js';

const TEST = {
  checkin: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
  checkout: (() => { const d = new Date(); d.setDate(d.getDate() + 33); return d.toISOString().split('T')[0]; })(),
  city: 'Colombo',
  occupancies: [{ adults: 1 }],
};

let client;
const createdBookingIds = [];

beforeAll(() => {
  if (!process.env.LITEAPI_API_KEY) {
    throw new Error('SKIP_SUITE: LITEAPI_API_KEY not set');
  }
  client = new LiteApiClient();
  console.log(`[LiteAPI live] Token configured. Test: ${TEST.city}, ${TEST.checkin} → ${TEST.checkout}`);
});

afterAll(async () => {
  for (const id of createdBookingIds) {
    try { await client.cancelBooking(id); console.log(`[LiteAPI live] Cleaned: ${id}`); } catch (_) {}
  }
});

describe('LiteAPI — search', () => {
  it('should return real hotel offers', async () => {
    const offers = await client.searchHotels(TEST);
    expect(Array.isArray(offers)).toBe(true);
    if (offers.length === 0) {
      console.warn('[LiteAPI live] No hotel offers returned for test criteria — skipping assertions (may be data availability issue)');
      return;
    }
    expect(offers[0]).toHaveProperty('hotelId');
    expect(offers[0]).toHaveProperty('name');
    expect(offers[0].starRating).toBeGreaterThanOrEqual(1);
    expect(offers[0].cheapestRate.totalAmount).toBeGreaterThan(0);
    console.log(`[LiteAPI live] Found ${offers.length} hotels. First: ${offers[0].name}, ${offers[0].starRating}*, ${offers[0].cheapestRate.currency} ${offers[0].cheapestRate.totalAmount}`);
  }, 30_000);
});

describe('LiteAPI — details', () => {
  let testHotelId;
  beforeAll(async () => {
    const offers = await client.searchHotels(TEST);
    if (offers.length > 0) testHotelId = offers[0].hotelId;
  });

  it('should return hotel details', async () => {
    if (!testHotelId) return; // no hotels available
    const details = await client.getHotelDetails(testHotelId);
    expect(details).toHaveProperty('name');
    expect(details).toHaveProperty('hotelId', testHotelId);
  }, 15_000);
});

describe('LiteAPI — prebook + book', () => {
  let testOfferId;
  let prebookToken;

  beforeAll(async () => {
    const offers = await client.searchHotels(TEST);
    if (offers.length > 0) {
      testOfferId = offers[0].cheapestRate.offerId;
      console.log(`[LiteAPI live] Offer selected: ${testOfferId}`);
    }
  });

  it('should prebook and return a token', async () => {
    if (!testOfferId) return;
    const result = await client.prebook({ offerId: testOfferId });
    expect(result).toHaveProperty('prebookId');
    expect(result.status).toBe('valid');
    prebookToken = result.prebookId;
    console.log(`[LiteAPI live] Prebook token: ${prebookToken}`);
  }, 20_000);

  it('should book with prebook token', async () => {
    if (!prebookToken) return;
    try {
      const booking = await client.book({
        prebookId: prebookToken,
        guests: [{ firstName: 'Test', lastName: 'User', title: 'Mr' }],
        contact: { email: 'test@example.com' },
      });
      expect(booking).toHaveProperty('bookingId');
      expect(booking.status).toBe('confirmed');
      createdBookingIds.push(booking.bookingId);
      console.log(`[LiteAPI live] Booked: ${booking.bookingId}, Hotel: ${booking.hotelName}`);
    } catch (err) {
      if (err.message.includes('trust') || err.message.includes('403') || err.message.includes('402')) {
        console.warn(`[LiteAPI live] Book skipped — account trust level may not allow live booking: ${err.message}`);
        return;
      }
      throw err;
    }
  }, 30_000);

  it('should retrieve the created booking', async () => {
    if (createdBookingIds.length === 0) return;
    const result = await client.getBooking(createdBookingIds[0]);
    expect(result).toHaveProperty('bookingId');
    expect(result.status).toBe('confirmed');
  }, 15_000);

  it('should cancel the booking', async () => {
    if (createdBookingIds.length === 0) return;
    const result = await client.cancelBooking(createdBookingIds[0]);
    expect(result.status).toBe('cancelled');
    console.log(`[LiteAPI live] Cancelled: ${createdBookingIds[0]}`);
  }, 15_000);
});

describe('LiteAPI — validation', () => {
  it('should throw for missing hotelId in details', async () => {
    await expect(client.getHotelDetails('')).rejects.toThrow('required');
  });

  it('should throw for missing offerId in prebook', async () => {
    await expect(client.prebook({})).rejects.toThrow('offerId');
  });

  it('should throw for empty guests in book', async () => {
    await expect(client.book({ prebookId: 'x', guests: [], contact: { email: 'a@b.com' } }))
      .rejects.toThrow('guest');
  });
});
