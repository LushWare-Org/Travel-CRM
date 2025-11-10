/**
 * Analytics Service
 * Handles all analytics-related API calls and data transformations
 */

import { analyticsAPI } from './api';

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get user analytics overview
   * @param {Object} params - Query parameters
   * @param {string} params.timeRange - Time range: 'daily', 'weekly', 'monthly', 'annual'
   * @returns {Promise<Object>} User analytics data
   */
  async getUserAnalyticsOverview(params = {}) {
    try {
      const cacheKey = `user-analytics-${params.timeRange || 'monthly'}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getUserOverview(params);
      
      // Store in cache
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error('Error fetching user analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get sales rep performance analytics
   * @param {Object} params - Query parameters
   * @param {string} params.timeRange - Time range: 'daily', 'weekly', 'monthly', 'annual'
   * @param {number} params.limit - Number of top performers (default: 5)
   * @returns {Promise<Object>} Sales rep performance data
   */
  async getSalesRepPerformance(params = {}) {
    try {
      const cacheKey = `sales-rep-performance-${params.timeRange || 'monthly'}-${params.limit || 5}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await analyticsAPI.getSalesRepPerformance(params);
      
      // Store in cache
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error('Error fetching sales rep performance:', error);
      throw error;
    }
  }

  /**
   * Get lead analytics overview
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Lead analytics data
   */
  async getLeadAnalyticsOverview(params = {}) {
    try {
      const response = await analyticsAPI.getLeadOverview(params);
      return response;
    } catch (error) {
      console.error('Error fetching lead analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get billing analytics overview
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Billing analytics data
   */
  async getBillingAnalyticsOverview(params = {}) {
    try {
      const response = await analyticsAPI.getBillingOverview(params);
      return response;
    } catch (error) {
      console.error('Error fetching billing analytics overview:', error);
      throw error;
    }
  }

  /**
   * Transform user analytics data for frontend display
   * @param {Object} analyticsData - Raw analytics data from API
   * @returns {Object} Transformed data
   */
  transformUserAnalytics(analyticsData) {
    if (!analyticsData || !analyticsData.data) {
      return null;
    }

    const { stats, trend, userTypeDistribution } = analyticsData.data;

    return {
      stats: {
        totalNewUsers: stats?.totalNewUsers || 0,
        totalPurchased: stats?.totalPurchased || 0,
        conversionRate: stats?.conversionRate || 0,
        avgSalesReps: stats?.avgSalesReps || 0,
        usersTrend: stats?.usersTrend || 0,
        purchasedTrend: stats?.purchasedTrend || 0,
      },
      trend: (trend || []).map((item) => ({
        label: item.label,
        month: item.month,
        week: item.week,
        year: item.year,
        newUsers: item.newUsers || 0,
        purchased: item.purchased || 0,
        salesReps: item.salesReps || 0,
      })),
      userTypeDistribution: userTypeDistribution || [],
    };
  }

  /**
   * Transform sales rep performance data for frontend display
   * @param {Object} performanceData - Raw performance data from API
   * @returns {Object} Transformed data
   */
  transformSalesRepPerformance(performanceData) {
    if (!performanceData || !performanceData.data) {
      return null;
    }

    const { performance, stats } = performanceData.data;

    return {
      performance: (performance || []).map((rep) => ({
        rep: rep.name,
        name: rep.name,
        email: rep.email,
        sales: rep.sales || 0,
        conversion: rep.conversion || 0,
        revenue: rep.revenue || 0,
      })),
      stats: {
        totalSalesReps: stats?.totalSalesReps || 0,
        avgConversion: stats?.avgConversion || 0,
        topPerformer: stats?.topPerformer || 'N/A',
        topPerformerRevenue: stats?.topPerformerRevenue || 0,
      },
    };
  }

  /**
   * Clear cache for analytics data
   * @param {string} type - Type of analytics to clear ('user', 'sales-rep', 'all')
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
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  }

  /**
   * Format number as percentage
   * @param {number} value - Value to format
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted percentage
   */
  formatPercentage(value, decimals = 1) {
    return `${Number(value).toFixed(decimals)}%`;
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
   * Calculate growth rate between two values
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {number} Growth rate percentage
   */
  calculateGrowthRate(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}

export default new AnalyticsService();
