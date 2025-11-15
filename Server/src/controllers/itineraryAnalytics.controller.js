/**
 * Itinerary Analytics Controller
 * Handles HTTP requests for itinerary analytics endpoints
 */

import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import ItineraryAnalyticsService from '../services/itineraryAnalytics.service.js';
import logger from '../config/logger.js';

/**
 * @desc    Get itinerary analytics overview
 * @route   GET /api/v1/analytics/itineraries/overview
 * @access  Public
 */
export const getItineraryAnalyticsOverview = asyncHandler(async (req, res, next) => {
  const { timeRange = 'monthly', destination, category } = req.query;

  const overview = await ItineraryAnalyticsService.getAnalyticsOverview({
    timeRange,
    destination,
    category,
  });

  res.status(200).json({
    success: true,
    data: overview,
  });
});

/**
 * @desc    Get most inquired itineraries
 * @route   GET /api/v1/analytics/itineraries/most-inquired
 * @access  Public
 */
export const getMostInquired = asyncHandler(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const mostInquired = await ItineraryAnalyticsService.getMostInquired(
    parseInt(limit, 10),
  );

  res.status(200).json({
    success: true,
    count: mostInquired.length,
    data: mostInquired,
  });
});

/**
 * @desc    Get destination performance metrics
 * @route   GET /api/v1/analytics/itineraries/destination-performance
 * @access  Public
 */
export const getDestinationPerformance = asyncHandler(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const performance = await ItineraryAnalyticsService.getDestinationPerformance(
    parseInt(limit, 10),
  );

  res.status(200).json({
    success: true,
    count: performance.length,
    data: performance,
  });
});

/**
 * @desc    Get activity preferences from itineraries
 * @route   GET /api/v1/analytics/itineraries/activity-preferences
 * @access  Public
 */
export const getActivityPreferences = asyncHandler(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const preferences = await ItineraryAnalyticsService.getActivityPreferences(
    parseInt(limit, 10),
  );

  res.status(200).json({
    success: true,
    count: preferences.length,
    data: preferences,
  });
});

/**
 * @desc    Get hotel/accommodation preferences
 * @route   GET /api/v1/analytics/itineraries/hotel-preferences
 * @access  Public
 */
export const getHotelPreferences = asyncHandler(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const preferences = await ItineraryAnalyticsService.getHotelPreferences(
    parseInt(limit, 10),
  );

  res.status(200).json({
    success: true,
    count: preferences.length,
    data: preferences,
  });
});

/**
 * @desc    Get itinerary trend data
 * @route   GET /api/v1/analytics/itineraries/trends
 * @access  Public
 */
export const getTrends = asyncHandler(async (req, res, next) => {
  const { timeRange = 'monthly' } = req.query;

  const trends = await ItineraryAnalyticsService.getTrendData(timeRange);

  res.status(200).json({
    success: true,
    count: trends.length,
    data: trends,
  });
});

/**
 * @desc    Get itinerary completion statistics
 * @route   GET /api/v1/analytics/itineraries/completion-stats
 * @access  Public
 */
export const getCompletionStats = asyncHandler(async (req, res, next) => {
  const stats = await ItineraryAnalyticsService.getCompletionStats();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @desc    Get comprehensive itinerary analytics (all data at once)
 * @route   GET /api/v1/analytics/itineraries
 * @access  Public
 */
export const getComprehensiveAnalytics = asyncHandler(async (req, res, next) => {
  const {
    timeRange = 'monthly',
    destination,
    category,
  } = req.query;

  const [overview, mostInquired, performance, activities, hotels, stats] = await Promise.all([
    ItineraryAnalyticsService.getAnalyticsOverview({
      timeRange,
      destination,
      category,
    }),
    ItineraryAnalyticsService.getMostInquired(5),
    ItineraryAnalyticsService.getDestinationPerformance(5),
    ItineraryAnalyticsService.getActivityPreferences(5),
    ItineraryAnalyticsService.getHotelPreferences(5),
    ItineraryAnalyticsService.getCompletionStats(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview,
      mostInquired,
      destinationPerformance: performance,
      activityPreferences: activities,
      hotelPreferences: hotels,
      completionStats: stats,
    },
  });
});
