import ApiService from './api.js';

/**
 * Itinerary Analytics Service
 * Handles all API calls for itinerary analytics
 */
const ItineraryAnalyticsService = {
  /**
   * Get itinerary analytics overview
   * @param {Object} params - Query parameters
   * @param {string} params.timeRange - Time range (daily, weekly, monthly, annual)
   * @param {string} params.destination - Filter by destination
   * @param {string} params.category - Filter by category
   * @returns {Promise<Object>} Analytics overview data
   */
  getOverview: async (params = {}) => {
    const api = new ApiService();
    return api.get('/analytics/itineraries/overview', params);
  },

  /**
   * Get most inquired itineraries
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of results to return (default: 5)
   * @returns {Promise<Object>} Most inquired itineraries
   */
  getMostInquired: async (params = {}) => {
    const api = new ApiService();
    return api.get('/analytics/itineraries/most-inquired', params);
  },

  /**
   * Get destination performance metrics
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of results to return (default: 5)
   * @returns {Promise<Object>} Destination performance data
   */
  getDestinationPerformance: async (params = {}) => {
    const api = new ApiService();
    return api.get('/analytics/itineraries/destination-performance', params);
  },

  /**
   * Get activity preferences
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of results to return (default: 5)
   * @returns {Promise<Object>} Activity preference data
   */
  getActivityPreferences: async (params = {}) => {
    const api = new ApiService();
    return api.get('/analytics/itineraries/activity-preferences', params);
  },

  /**
   * Get hotel/accommodation preferences
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of results to return (default: 5)
   * @returns {Promise<Object>} Hotel preference data
   */
  getHotelPreferences: async (params = {}) => {
    const api = new ApiService();
    return api.get('/analytics/itineraries/hotel-preferences', params);
  },

  /**
   * Get itinerary trend data
   * @param {Object} params - Query parameters
   * @param {string} params.timeRange - Time range (daily, weekly, monthly, annual)
   * @returns {Promise<Object>} Trend data
   */
  getTrends: async (params = {}) => {
    const api = new ApiService();
    return api.get('/analytics/itineraries/trends', params);
  },

  /**
   * Get itinerary completion statistics
   * @returns {Promise<Object>} Completion statistics
   */
  getCompletionStats: async () => {
    const api = new ApiService();
    return api.get('/analytics/itineraries/completion-stats');
  },

  /**
   * Get comprehensive analytics (all data at once)
   * @param {Object} params - Query parameters
   * @param {string} params.timeRange - Time range (daily, weekly, monthly, annual)
   * @param {string} params.destination - Filter by destination
   * @param {string} params.category - Filter by category
   * @returns {Promise<Object>} All analytics data
   */
  getComprehensive: async (params = {}) => {
    const api = new ApiService();
    return api.get('/analytics/itineraries', params);
  },
};

export default ItineraryAnalyticsService;
