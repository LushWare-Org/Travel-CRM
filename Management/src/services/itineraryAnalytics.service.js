/**
 * Itinerary Analytics Service (Frontend)
 * Handles all analytics-related API calls and data transformations for itineraries
 */

import { analyticsAPI } from './api';

class ItineraryAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive itinerary analytics
   * @param {Object} params - Query parameters
   * @param {string} params.timeRange - Time range: 'daily', 'weekly', 'monthly', 'annual'
   * @returns {Promise<Object>} Comprehensive analytics data
   */
  async getComprehensiveAnalytics(params = {}) {
    try {
      const cacheKey = `itinerary-analytics-comprehensive-${params.timeRange || 'monthly'}`;

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getItineraryComprehensive(params);

      // Store in cache
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching comprehensive itinerary analytics:', error);
      throw error;
    }
  }

  /**
   * Get itinerary analytics overview
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Analytics overview data
   */
  async getOverview(params = {}) {
    try {
      const cacheKey = `itinerary-analytics-overview-${params.timeRange || 'monthly'}`;

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getItineraryOverview(params);

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching itinerary analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get most inquired itineraries
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Most inquired itineraries data
   */
  async getMostInquired(params = {}) {
    try {
      const cacheKey = `itinerary-analytics-most-inquired-${params.limit || 5}`;

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getMostInquired(params);

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching most inquired itineraries:', error);
      throw error;
    }
  }

  /**
   * Get destination performance metrics
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Destination performance data
   */
  async getDestinationPerformance(params = {}) {
    try {
      const cacheKey = `itinerary-analytics-destination-${params.limit || 5}`;

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getDestinationPerformance(params);

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching destination performance:', error);
      throw error;
    }
  }

  /**
   * Get activity preferences
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Activity preference data
   */
  async getActivityPreferences(params = {}) {
    try {
      const cacheKey = `itinerary-analytics-activities-${params.limit || 5}`;

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getActivityPreferences(params);

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching activity preferences:', error);
      throw error;
    }
  }

  /**
   * Get hotel/accommodation preferences
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Hotel preference data
   */
  async getHotelPreferences(params = {}) {
    try {
      const cacheKey = `itinerary-analytics-hotels-${params.limit || 5}`;

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getHotelPreferences(params);

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching hotel preferences:', error);
      throw error;
    }
  }

  /**
   * Get trend data
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Trend data
   */
  async getTrends(params = {}) {
    try {
      const cacheKey = `itinerary-analytics-trends-${params.timeRange || 'monthly'}`;

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getItineraryTrends(params);

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching trend data:', error);
      throw error;
    }
  }

  /**
   * Get completion statistics
   * @returns {Promise<Object>} Completion statistics
   */
  async getCompletionStats() {
    try {
      const cacheKey = 'itinerary-analytics-completion-stats';

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getCompletionStats();

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching completion stats:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   * @param {string} type - Type of cache to clear ('all', or specific type)
   */
  clearCache(type = 'all') {
    if (type === 'all') {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.includes(type)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Transform data for frontend display
   * @param {Object} analyticsData - Raw analytics data from API
   * @returns {Object} Transformed data
   */
  transformAnalyticsData(analyticsData) {
    if (!analyticsData) {
      return null;
    }

    return {
      overview: analyticsData.overview || {},
      mostInquired: analyticsData.mostInquired || [],
      destinationPerformance: analyticsData.destinationPerformance || [],
      activityPreferences: analyticsData.activityPreferences || [],
      hotelPreferences: analyticsData.hotelPreferences || [],
      completionStats: analyticsData.completionStats || {},
    };
  }

  /**
   * Format number with comma separators
   * @param {number} value - Value to format
   * @returns {string} Formatted number
   */
  formatNumber(value) {
    return Number(value).toLocaleString('en-US');
  }

  /**
   * Format percentage
   * @param {number} value - Value to format
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted percentage
   */
  formatPercentage(value, decimals = 1) {
    return `${Number(value).toFixed(decimals)}%`;
  }

  /**
   * Calculate growth rate
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {number} Growth rate percentage
   */
  calculateGrowthRate(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}

export default new ItineraryAnalyticsService();
