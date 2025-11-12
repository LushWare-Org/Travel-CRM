/**
 * useItineraryAnalytics Hook
 * Manages itinerary analytics data fetching and state
 */

import { useState, useCallback, useEffect } from 'react';
import itineraryAnalyticsService from '../../../services/itineraryAnalytics.service';

export const useItineraryAnalytics = (timeRange = 'monthly') => {
  const [data, setData] = useState({
    overview: null,
    mostInquired: [],
    destinationPerformance: [],
    activityPreferences: [],
    hotelPreferences: [],
    completionStats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch comprehensive analytics
      const response = await itineraryAnalyticsService.getComprehensiveAnalytics({
        timeRange,
      });

      setData(response);
    } catch (err) {
      console.error('Error fetching itinerary analytics:', err);
      setError(err?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refetch = useCallback(() => {
    itineraryAnalyticsService.clearCache();
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};
