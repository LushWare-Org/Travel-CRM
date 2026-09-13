import ApiService from './api.js';

class AnalyticsService {
  /**
   * Get Package Analytics Overview
   * Fetches analytics for published packages including:
   * - Inquiries: Leads created from booking/customization requests on published packages
   * - Conversions: Leads with status='converted' for published packages
   * - Trends showing inquiry and conversion counts over time
   * 
   * Note: Website contact form leads (without package reference) are excluded.
   * Only published packages (status='published') are tracked in these metrics.
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
   * Get All Sales Reps Performance (admin only)
   */
  static async getAllSalesRepsPerformance(timeRange = 'monthly') {
    try {
      const response = await ApiService.fetch(
        `/analytics/salesreps/performance?timeRange=${timeRange}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch sales rep performance');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching all sales reps performance:', error);
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
