import { describe, it, expect } from 'vitest';
import { MockHotelClient } from '../mock.client.js';

describe('MockHotelClient', () => {
  const client = new MockHotelClient();

  describe('searchHotels', () => {
    it('should return offers for a valid search', async () => {
      const offers = await client.searchHotels({
        checkin: '2026-09-01', checkout: '2026-09-03',
        occupancies: [{ adults: 2 }], city: 'Colombo',
      });
      expect(Array.isArray(offers)).toBe(true);
      expect(offers.length).toBeGreaterThan(0);
      expect(offers[0]).toHaveProperty('hotelId');
      expect(offers[0]).toHaveProperty('name');
      expect(offers[0]).toHaveProperty('starRating');
      expect(offers[0].cheapestRate).toHaveProperty('totalAmount');
      expect(offers[0].cheapestRate).toHaveProperty('currency');
    });

    it('should multiply price by guest count', async () => {
      const solo = await client.searchHotels({ checkin: '2026-09-01', checkout: '2026-09-03', occupancies: [{ adults: 1 }] });
      const family = await client.searchHotels({ checkin: '2026-09-01', checkout: '2026-09-03', occupancies: [{ adults: 2, children: 1 }] });
      // Family total should be higher than solo
      expect(family[0].cheapestRate.totalAmount).toBeGreaterThan(solo[0].cheapestRate.totalAmount);
    });

    it('should throw when checkin/checkout missing', async () => {
      await expect(client.searchHotels({ checkin: '2026-09-01', checkout: '' })).rejects.toThrow('checkin');
    });
  });

  describe('getHotelDetails', () => {
    it('should return hotel details', async () => {
      const details = await client.getHotelDetails('MOCK-HOTEL-1');
      expect(details).toHaveProperty('hotelId', 'MOCK-HOTEL-1');
      expect(details).toHaveProperty('name');
      expect(details).toHaveProperty('amenities');
      expect(details.amenities.length).toBeGreaterThan(0);
    });
  });

  describe('prebook', () => {
    it('should return a prebook token', async () => {
      const r = await client.prebook({ rateId: 'rate-1', occupancies: [{ adults: 1 }] });
      expect(r).toHaveProperty('prebookId');
      expect(r).toHaveProperty('status', 'valid');
    });
  });

  describe('book', () => {
    it('should return a confirmed booking', async () => {
      const r = await client.book({
        prebookId: 'pb-1',
        guests: [{ firstName: 'John', lastName: 'Doe' }],
        contact: { email: 'john@test.com' },
      });
      expect(r).toHaveProperty('bookingId');
      expect(r.status).toBe('confirmed');
    });

    it('should throw when guests is empty', async () => {
      await expect(client.book({ prebookId: 'x', guests: [], contact: { email: 'a@b.com' } }))
        .rejects.toThrow('guest');
    });
  });

  describe('cancelBooking', () => {
    it('should return cancelled status', async () => {
      const r = await client.cancelBooking('book-1');
      expect(r.status).toBe('cancelled');
    });
  });
});
