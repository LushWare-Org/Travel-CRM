/**
 * useUserAnalytics Hook
 * Manages user analytics data fetching and state
 */

import { useState, useEffect, useCallback } from 'react';
import analyticsService from '../../../services/analytics.service';

export const useUserAnalytics = (timeRange = 'monthly') => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [salesRepData, setSalesRepData] = useState(null);

  const fetchUserAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user analytics overview
      const userAnalyticsResponse = await analyticsService.getUserAnalyticsOverview({
        timeRange,
      });

      // Fetch sales rep performance
      const salesRepResponse = await analyticsService.getSalesRepPerformance({
        timeRange,
        limit: 5,
      });

      const transformedUserData = analyticsService.transformUserAnalytics(
        userAnalyticsResponse
      );
      const transformedSalesRepData = analyticsService.transformSalesRepPerformance(
        salesRepResponse
      );

      setData(transformedUserData);
      setSalesRepData(transformedSalesRepData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchUserAnalytics();
  }, [fetchUserAnalytics]);

  const refetch = useCallback(() => {
    analyticsService.clearCache('user');
    fetchUserAnalytics();
  }, [fetchUserAnalytics]);

  return {
    loading,
    error,
    data,
    salesRepData,
    refetch,
  };
};

/**
 * Hook to get user growth trend data
 */
export const useUserGrowthTrend = (timeRange = 'monthly') => {
  const { data, loading, error } = useUserAnalytics(timeRange);

  return {
    trendData: data?.trend || [],
    loading,
    error,
  };
};

/**
 * Hook to get user statistics
 */
export const useUserStats = (timeRange = 'monthly') => {
  const { data, loading, error } = useUserAnalytics(timeRange);

  return {
    stats: data?.stats || {},
    loading,
    error,
  };
};

/**
 * Hook to get sales rep performance data
 */
export const useSalesRepPerformance = (timeRange = 'monthly') => {
  const { salesRepData, loading, error } = useUserAnalytics(timeRange);

  return {
    performance: salesRepData?.performance || [],
    stats: salesRepData?.stats || {},
    loading,
    error,
  };
};

/**
 * Hook to get user type distribution
 */
export const useUserTypeDistribution = (timeRange = 'monthly') => {
  const { data, loading, error } = useUserAnalytics(timeRange);

  return {
    distribution: data?.userTypeDistribution || [],
    loading,
    error,
  };
};
