/**
 * Duffel API — live integration tests.
 *
 * These tests hit the real Duffel sandbox (test environment).
 * No real money is charged — sandbox bookings are free.
 *
 * Prerequisites:
 *   DUFFEL_ACCESS_TOKEN=duffel_test_... in .env
 *
 * Run:
 *   npm test -- test/integration/duffel.live.test.js
 *
 * Skip in CI without credentials — the suite auto-skips when the
 * token is missing.
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Load .env from the service root before anything else
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { DuffelClient } from '../../src/clients/duffel.client.js';

// ═══════════════════════════════════════════════════════════════════
//  Test configuration
// ═══════════════════════════════════════════════════════════════════

/** Route used for all tests — a common one-way with good availability */
const TEST_ROUTE = {
  origin: 'LHR',
  destination: 'DXB',
  departureDate: (() => {
    // Always use a date ~60 days out so routes have availability
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  })(),
};

const TEST_PASSENGER = {
  given_name: 'Test',
  family_name: 'Traveler',
  born_on: '1990-01-15',
  email: 'test@example.com',
  phone_number: '+447700900000',
  gender: 'm',
  title: 'mr',
};

// ═══════════════════════════════════════════════════════════════════
//  Suite setup / teardown
// ═══════════════════════════════════════════════════════════════════

/** @type {DuffelClient|null} */
let client = null;

/** Track created booking IDs so we can clean them up */
const createdOrderIds = [];

beforeAll(() => {
  // Skip the entire suite if no token is configured
  if (!process.env.DUFFEL_ACCESS_TOKEN) {
    throw new Error(
      'SKIP_SUITE: DUFFEL_ACCESS_TOKEN not set. ' +
      'Set it in .env to run live Duffel integration tests.',
    );
  }

  client = new DuffelClient();
  console.log(`\n[Duffel live test] Token configured. Running against Duffel sandbox.`);
  console.log(`[Duffel live test] Test route: ${TEST_ROUTE.origin} → ${TEST_ROUTE.destination} on ${TEST_ROUTE.departureDate}`);
});

afterAll(async () => {
  // Clean up: cancel any bookings we created during testing
  for (const orderId of createdOrderIds) {
    try {
      await client.cancelOrder(orderId);
      console.log(`[Duffel live test] Cleaned up booking: ${orderId}`);
    } catch (err) {
      console.warn(`[Duffel live test] Could not cancel ${orderId}: ${err.message}`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
//  Tests — full booking workflow
// ═══════════════════════════════════════════════════════════════════

describe('Duffel — search', () => {
  it('should return flight offers for a valid route', async () => {
    const offers = await client.searchFlights({
      origin: TEST_ROUTE.origin,
      destination: TEST_ROUTE.destination,
      departureDate: TEST_ROUTE.departureDate,
      adults: 1,
      cabinClass: 'Economy',
    });

    expect(offers).toBeInstanceOf(Array);
    expect(offers.length).toBeGreaterThan(0);

    const first = offers[0];
    // Verify normalised shape
    expect(first).toHaveProperty('offerId');
    expect(first).toHaveProperty('airline');
    expect(first).toHaveProperty('airlineCode');
    expect(first).toHaveProperty('currency');
    expect(first).toHaveProperty('fareTotal');
    expect(typeof first.fareTotal).toBe('number');
    expect(first.fareTotal).toBeGreaterThan(0);
    expect(first).toHaveProperty('segments');
    expect(first.segments.length).toBeGreaterThan(0);
    expect(first.segments[0]).toHaveProperty('origin');
    expect(first.segments[0]).toHaveProperty('destination');
    expect(first.segments[0]).toHaveProperty('departureAt');
    expect(first.segments[0]).toHaveProperty('arrivalAt');
    expect(first.segments[0]).toHaveProperty('flightNumber');
    expect(first.segments[0]).toHaveProperty('marketingCarrier');

    console.log(`[Duffel live test] Found ${offers.length} offers. First: ${first.airline} ${first.flightNumber || first.segments[0]?.flightNumber} — ${first.currency} ${first.fareTotal}`);
  }, 30_000);

  it('should return offers with passenger IDs for booking', async () => {
    const offers = await client.searchFlights({
      origin: TEST_ROUTE.origin,
      destination: TEST_ROUTE.destination,
      departureDate: TEST_ROUTE.departureDate,
      adults: 1,
    });

    expect(offers.length).toBeGreaterThan(0);
    // The normalized response should include passengerId mapping
    const first = offers[0];
    expect(first).toHaveProperty('passengerIds');
    expect(Array.isArray(first.passengerIds)).toBe(true);
  }, 30_000);
});

describe('Duffel — price', () => {
  /** @type {string} */
  let testOfferId;

  beforeAll(async () => {
    const offers = await client.searchFlights({
      origin: TEST_ROUTE.origin,
      destination: TEST_ROUTE.destination,
      departureDate: TEST_ROUTE.departureDate,
      adults: 1,
    });
    testOfferId = offers[0].offerId;
  });

  it('should revalidate an offer and return price status', async () => {
    const result = await client.priceOffer(testOfferId);

    expect(result).toHaveProperty('offerId', testOfferId);
    expect(result).toHaveProperty('revalidated');
    expect(result).toHaveProperty('priceChanged');
    expect(typeof result.priceChanged).toBe('boolean');
  }, 15_000);
});

describe('Duffel — book, retrieve, cancel', () => {
  /** @type {string} */
  let bookedOrderId;
  /** @type {string} */
  let bookedPnr;

  it('should create a booking (order) and return PNR', async () => {
    // Step 1: Search for offers
    const offers = await client.searchFlights({
      origin: TEST_ROUTE.origin,
      destination: TEST_ROUTE.destination,
      departureDate: TEST_ROUTE.departureDate,
      adults: 1,
    });

    expect(offers.length).toBeGreaterThan(0);

    // Step 2: Book the first offer
    const offer = offers[0];
    console.log(`[Duffel live test] Booking offer: ${offer.offerId}, ${offer.airline}, ${offer.currency} ${offer.fareTotal}`);
    console.log(`[Duffel live test] Passenger IDs from search:`, offer.passengerIds);

    const travelerPayload = {
      type: 'adult',
      title: TEST_PASSENGER.title,
      firstName: TEST_PASSENGER.given_name,
      lastName: TEST_PASSENGER.family_name,
      dob: TEST_PASSENGER.born_on,
      gender: TEST_PASSENGER.gender === 'm' ? 'M' : 'F',
    };

    // Pass the passengerId from the search if available
    const passengerIds = offer.passengerIds;
    if (passengerIds?.length > 0) {
      travelerPayload.passengerId = passengerIds[0];
      console.log(`[Duffel live test] Using passenger ID: ${passengerIds[0]}`);
    }

    const result = await client.createOrder({
      offerId: offer.offerId,
      travelers: [travelerPayload],
      totalAmount: offer.fareTotal,
      currency: offer.currency,
      contact: {
        name: `${TEST_PASSENGER.given_name} ${TEST_PASSENGER.family_name}`,
        email: TEST_PASSENGER.email,
      },
    });

    expect(result).toHaveProperty('pnr');
    expect(result).toHaveProperty('travelportOrderId');
    expect(result).toHaveProperty('status');
    expect(result.status).toMatch(/confirmed|pending/);
    expect(result.pnr).toBeTruthy();

    bookedOrderId = result.travelportOrderId;
    bookedPnr = result.pnr;
    createdOrderIds.push(bookedOrderId);

    console.log(`[Duffel live test] Booked: PNR=${bookedPnr}, Order=${bookedOrderId}, Status=${result.status}`);
  }, 45_000);

  it('should retrieve the booking by order ID', async () => {
    expect(bookedOrderId).toBeTruthy();

    const booking = await client.getOrder(bookedOrderId);

    expect(booking).toHaveProperty('pnr');
    expect(booking).toHaveProperty('travelportOrderId', bookedOrderId);
    expect(booking).toHaveProperty('status');
  }, 15_000);

  it('should cancel the booking', async () => {
    expect(bookedOrderId).toBeTruthy();

    const result = await client.cancelOrder(bookedOrderId);

    expect(result).toHaveProperty('status', 'cancelled');
    expect(result).toHaveProperty('travelportOrderId', bookedOrderId);

    // Remove from cleanup list — already cancelled
    const idx = createdOrderIds.indexOf(bookedOrderId);
    if (idx >= 0) createdOrderIds.splice(idx, 1);

    console.log(`[Duffel live test] Cancelled: Order=${bookedOrderId}`);
  }, 30_000);
});

describe('Duffel — validation & error handling', () => {
  it('should throw for missing origin', async () => {
    await expect(
      client.searchFlights({
        origin: '',
        destination: 'DXB',
        departureDate: TEST_ROUTE.departureDate,
      }),
    ).rejects.toThrow('origin');
  });

  it('should throw for empty travelers array', async () => {
    await expect(
      client.createOrder({
        offerId: 'off_nonexistent',
        travelers: [],
        contact: { email: 'test@test.com' },
      }),
    ).rejects.toThrow('traveler');
  });

  it('should throw a meaningful error for an invalid offer ID', async () => {
    await expect(
      client.createOrder({
        offerId: 'off_nonexistent_12345',
        travelers: [
          { type: 'adult', firstName: 'Test', lastName: 'User' },
        ],
        contact: { email: 'test@test.com', name: 'Test' },
      }),
    ).rejects.toThrow();
  }, 15_000);
});
