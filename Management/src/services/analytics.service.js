import ApiService from './api.js';

class AnalyticsService {
  /**
   * Get Package Analytics Overview
   */
  static async getPackageAnalyticsOverview(timeRange = 'monthly') {
    try {
      const response = await ApiService.fetch(
        `/analytics/packages/overview?timeRange=${timeRange}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch package analytics');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching package analytics:', error);
      throw error;
    }
  }

  /**
   * Get Lead Analytics Overview
   */
  static async getLeadAnalyticsOverview(timeRange = 'monthly') {
    try {
      const response = await ApiService.fetch(
        `/analytics/leads/overview?timeRange=${timeRange}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch lead analytics');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching lead analytics:', error);
      throw error;
    }
  }

  /**
   * Get Billing Analytics Overview
   */
  static async getBillingAnalyticsOverview(timeRange = 'monthly') {
    try {
      const response = await ApiService.fetch(
        `/analytics/billing/overview?timeRange=${timeRange}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch billing analytics');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching billing analytics:', error);
      throw error;
    }
  }

  /**
   * Get User Analytics Overview
   */
  static async getUserAnalyticsOverview(timeRange = 'monthly') {
    try {
      const response = await ApiService.fetch(
        `/analytics/users/overview?timeRange=${timeRange}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch user analytics');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  }

  /**
   * Get SalesRep Personal Performance
   */
  static async getSalesRepPerformance(timeRange = 'monthly') {
    try {
      const response = await ApiService.fetch(
        `/analytics/salesreps/me/performance?timeRange=${timeRange}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch salesrep performance');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching salesrep performance:', error);
      throw error;
    }
  }

  /**
   * Get Website Analytics Overview
   */
  static async getWebsiteAnalyticsOverview(timeRange = 'monthly') {
    try {
      const response = await ApiService.fetch(
        `/analytics/website/overview?timeRange=${timeRange}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch website analytics');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching website analytics:', error);
      throw error;
    }
  }
}

export default AnalyticsService;
