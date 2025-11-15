import { useState, useEffect, useCallback } from 'react';
import ItineraryAnalyticsService from '../../services/itineraryAnalytics.service.js';

/**
 * Custom hook for fetching itinerary analytics data
 * @param {string} timeRange - Time range for analytics (default: 'monthly')
 * @returns {Object} Analytics data and loading state
 */
export const useItineraryAnalytics = (timeRange = 'monthly') => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    overview: null,
    trendData: [],
    mostInquired: [],
    destinationPerformance: [],
    activityPreferences: [],
    hotelPreferences: [],
    completionStats: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [
        overviewRes,
        trendsRes,
        inquiredRes,
        destinationRes,
        activitiesRes,
        hotelsRes,
        statsRes,
      ] = await Promise.all([
        ItineraryAnalyticsService.getOverview({ timeRange }),
        ItineraryAnalyticsService.getTrends({ timeRange }),
        ItineraryAnalyticsService.getMostInquired({ limit: 5 }),
        ItineraryAnalyticsService.getDestinationPerformance({ limit: 5 }),
        ItineraryAnalyticsService.getActivityPreferences({ limit: 5 }),
        ItineraryAnalyticsService.getHotelPreferences({ limit: 5 }),
        ItineraryAnalyticsService.getCompletionStats(),
      ]);

      // Extract data from responses, handle both success and error responses
      const overview = overviewRes?.data || overviewRes;
      const trendData = trendsRes?.data || trendsRes || [];
      const mostInquired = inquiredRes?.data || inquiredRes || [];
      const destinationPerformance = destinationRes?.data || destinationRes || [];
      const activityPreferences = activitiesRes?.data || activitiesRes || [];
      const hotelPreferences = hotelsRes?.data || hotelsRes || [];
      const completionStats = statsRes?.data || statsRes;

      setData({
        overview,
        trendData: Array.isArray(trendData) ? trendData : [],
        mostInquired: Array.isArray(mostInquired) ? mostInquired : [],
        destinationPerformance: Array.isArray(destinationPerformance)
          ? destinationPerformance
          : [],
        activityPreferences: Array.isArray(activityPreferences)
          ? activityPreferences
          : [],
        hotelPreferences: Array.isArray(hotelPreferences) ? hotelPreferences : [],
        completionStats,
      });
    } catch (err) {
      console.error('Error fetching itinerary analytics:', err);
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchData,
  };
};

export default useItineraryAnalytics;
