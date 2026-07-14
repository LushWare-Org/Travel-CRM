/**
 * Flight API Service
 * Handles Travelport-backed flight search, pricing and booking calls
 */

import api from './api';

class FlightService {
  constructor() {
    this.api = api;
  }

  async search(params) {
    try {
      return await this.api.post('/flights/search', params);
    } catch (error) {
      console.error('Error searching flights:', error);
      throw error;
    }
  }

  async priceOffer(offerId) {
    try {
      return await this.api.post('/flights/price', { offerId });
    } catch (error) {
      console.error('Error pricing flight offer:', error);
      throw error;
    }
  }

  async book(payload) {
    try {
      return await this.api.post('/flights/book', payload);
    } catch (error) {
      console.error('Error booking flight:', error);
      throw error;
    }
  }

  async listBookings(params = {}) {
    try {
      return await this.api.get('/flights/bookings', params);
    } catch (error) {
      console.error('Error fetching flight bookings:', error);
      throw error;
    }
  }

  async getBooking(id) {
    try {
      return await this.api.get(`/flights/bookings/${id}`);
    } catch (error) {
      console.error('Error fetching flight booking:', error);
      throw error;
    }
  }

  async cancelBooking(id, reason) {
    try {
      return await this.api.post(`/flights/bookings/${id}/cancel`, { reason });
    } catch (error) {
      console.error('Error cancelling flight booking:', error);
      throw error;
    }
  }
}

export const flightAPI = new FlightService();
export default flightAPI;
