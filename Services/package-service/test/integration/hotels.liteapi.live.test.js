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
    if (offers.length > 0) {
      expect(offers[0]).toHaveProperty('hotelId');
      expect(offers[0]).toHaveProperty('name');
      expect(offers[0].starRating).toBeGreaterThanOrEqual(1);
      expect(offers[0].cheapestRate.totalAmount).toBeGreaterThan(0);
      console.log(`[LiteAPI live] Found ${offers.length} hotels. First: ${offers[0].name}, ${offers[0].starRating}*, ${offers[0].cheapestRate.currency} ${offers[0].cheapestRate.totalAmount}`);
    }
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
  let rateId;

  beforeAll(async () => {
    const offers = await client.searchHotels(TEST);
    if (offers.length > 0) rateId = offers[0].cheapestRate.roomType || 'Standard';
  });

  it('should prebook and return a token', async () => {
    if (!rateId) return;
    const result = await client.prebook({ rateId, occupancies: TEST.occupancies });
    expect(result).toHaveProperty('prebookId');
    expect(result.status).toBe('valid');
  }, 20_000);

  it.skip('should book with prebook token', async () => {
    // Booking requires a real prebook token from LiteAPI which is rate-specific.
    // This test is skipped by default — unskip when you have a valid prebookId.
    const pre = await client.prebook({ rateId, occupancies: TEST.occupancies });
    if (!pre.prebookId) return;
    const booking = await client.book({
      prebookId: pre.prebookId,
      guests: [{ firstName: 'Test', lastName: 'User', title: 'Mr' }],
      contact: { email: 'test@example.com' },
    });
    expect(booking).toHaveProperty('bookingId');
    expect(booking.status).toBe('confirmed');
    createdBookingIds.push(booking.bookingId);
    console.log(`[LiteAPI live] Booked: ${booking.bookingId}, Hotel: ${booking.hotelName}`);
  }, 30_000);
});

describe('LiteAPI — validation', () => {
  it('should throw for missing hotelId in details', async () => {
    await expect(client.getHotelDetails('')).rejects.toThrow('required');
  });

  it('should throw for missing rateId in prebook', async () => {
    await expect(client.prebook({})).rejects.toThrow('rateId');
  });

  it('should throw for empty guests in book', async () => {
    await expect(client.book({ prebookId: 'x', guests: [], contact: { email: 'a@b.com' } }))
      .rejects.toThrow('guest');
  });
});
