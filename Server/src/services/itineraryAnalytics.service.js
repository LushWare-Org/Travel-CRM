/**
 * Itinerary Analytics Service
 * Handles all analytics calculations for itineraries including
 * trends, performance metrics, and aggregated data
 */

import Itinerary from '../models/itinerary.model.js';
import Package from '../models/package.model.js';
import CustomizedPackage from '../models/customizedPackage.model.js';
import Lead from '../models/lead.model.js';
import logger from '../config/logger.js';

class ItineraryAnalyticsService {
  /**
   * Get overall itinerary analytics overview
   * Includes total published packages, inquiries, and conversions
   * @param {Object} filters - Filter options (timeRange, destination, category, etc.)
   * @returns {Promise<Object>} Analytics overview data
   */
  static async getAnalyticsOverview(filters = {}) {
    try {
      const { timeRange = 'monthly', destination, category } = filters;

      // Build query - only published packages
      const query = { status: 'published' };
      if (destination) query.destination = destination;
      if (category) query.category = category;

      // Get total published packages count
      const totalPackages = await Package.countDocuments(query);

      // Get published package IDs for filtering leads
      const publishedPackageIds = (await Package.find({ status: 'published' }).select('_id')).map(p => p._id);

      // Count inquiries (leads with published packages only)
      const totalInquiries = await Lead.countDocuments({
        package: { $in: publishedPackageIds }
      });

      // Count conversions (converted leads with published packages)
      const totalConversions = await Lead.countDocuments({
        package: { $in: publishedPackageIds },
        status: 'converted'
      });

      // Calculate conversion rate
      const conversionRate = totalInquiries > 0
        ? ((totalConversions / totalInquiries) * 100).toFixed(2)
        : 0;

      return {
        stats: {
          totalItineraries: totalPackages,
          totalInquiries,
          totalConversions,
          conversionRate: parseFloat(conversionRate),
        },
        trend: await this.getTrendData(timeRange),
      };
    } catch (error) {
      logger.error('Error in getAnalyticsOverview:', error);
      throw error;
    }
  }

  /**
   * Get most inquired published packages
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top inquired packages
   */
  static async getMostInquired(limit = 5) {
    try {
      // Get all leads with published packages grouped by package
      const leadAggregation = await Lead.aggregate([
        {
          $match: { package: { $exists: true, $ne: null } },
        },
        {
          $group: {
            _id: '$package',
            inquiries: { $sum: 1 },
            conversions: {
              $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
            },
          },
        },
        {
          $sort: { inquiries: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      // Populate package details
      const results = await Promise.all(
        leadAggregation.map(async (item) => {
          const pkg = await Package.findById(item._id)
            .select('name destination price rating status');

          // Only include published packages
          if (!pkg || pkg.status !== 'published') {
            return null;
          }

          return {
            name: pkg.name,
            inquiries: item.inquiries,
            conversions: item.conversions,
            rating: pkg.rating || 4.5,
          };
        })
      );

      return results.filter((item) => item !== null);
    } catch (error) {
      logger.error('Error in getMostInquired:', error);
      throw error;
    }
  }

  /**
   * Get destination performance from published packages
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top destinations
   */
  static async getDestinationPerformance(limit = 5) {
    try {
      const destinations = await Package.aggregate([
        {
          $match: { status: 'published' },
        },
        {
          $group: {
            _id: '$destination',
            avgPrice: { $avg: '$price' },
            totalPackages: { $sum: 1 },
          },
        },
        {
          $sort: { totalPackages: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      // Enrich with inquiry and conversion data from leads
      const enriched = await Promise.all(
        destinations.map(async (dest) => {
          // Find published packages for this destination
          const packagesForDestination = await Package.find({ 
            destination: dest._id,
            status: 'published',
          }).select('_id');
          
          const packageIds = packagesForDestination.map(p => p._id);

          // Count leads that reference these packages
          const leads = await Lead.countDocuments({
            package: { $in: packageIds }
          });

          const conversions = await Lead.countDocuments({
            package: { $in: packageIds },
            status: 'converted',
          });

          return {
            destination: dest._id || 'Unknown',
            inquiries: leads || 0,
            conversions: conversions || 0,
            avgPrice: Math.round(dest.avgPrice || 0),
            totalPackages: dest.totalPackages || 0,
          };
        })
      );

      return enriched.filter(item => item.destination !== 'Unknown');
    } catch (error) {
      logger.error('Error in getDestinationPerformance:', error);
      throw error;
    }
  }

  /**
   * Get activity preferences
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top activities
   */
  /**
   * Get activity preferences from published packages
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top activities
   */
  static async getActivityPreferences(limit = 5) {
    try {
      // Get published package IDs
      const publishedPackageIds = (await Package.find({ status: 'published' }).select('_id')).map(p => p._id);

      // Aggregate activities from published itineraries only
      const activities = await Itinerary.aggregate([
        {
          $match: { package: { $in: publishedPackageIds } },
        },
        {
          $unwind: '$days',
        },
        {
          $unwind: '$days.activities',
        },
        {
          $group: {
            _id: '$days.activities',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      // Get conversion ratio from published packages
      const totalPublishedInquiries = await Lead.countDocuments({ package: { $in: publishedPackageIds } });
      const totalPublishedConversions = await Lead.countDocuments({ package: { $in: publishedPackageIds }, status: 'converted' });
      const conversionRatio = totalPublishedInquiries > 0 ? totalPublishedConversions / totalPublishedInquiries : 0;

      // Map activities with inquiry and actual conversion counts
      const result = activities.map((activity) => ({
        name: activity._id || 'Activity',
        inquiries: activity.count,
        conversions: Math.round(activity.count * conversionRatio),
      }));

      return result;
    } catch (error) {
      logger.error('Error in getActivityPreferences:', error);
      throw error;
    }
  }

  /**
   * Get hotel preferences
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top hotels
   */
  static async getHotelPreferences(limit = 5) {
    try {
      // Aggregate hotels from itineraries
      const hotels = await Itinerary.aggregate([
        {
          $unwind: '$days',
        },
        {
          $match: {
            'days.accommodation.name': { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$days.accommodation.type',
            count: { $sum: 1 },
            hotelNames: { $addToSet: '$days.accommodation.name' },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      // Format hotel preferences
      const result = hotels.map((hotel) => ({
        name: hotel._id
          ? hotel._id.charAt(0).toUpperCase() + hotel._id.slice(1)
          : 'Accommodation',
        inquiries: hotel.count,
        purchases: Math.round(hotel.count * 0.7), // Estimate 70% conversion
      }));

      return result;
    } catch (error) {
      logger.error('Error in getHotelPreferences:', error);
      throw error;
    }
  }

  /**
   * Get trend data based on time range
   * @param {string} timeRange - Time range (daily, weekly, monthly, annual)
   * @returns {Promise<Array>} Trend data
   */
  static async getTrendData(timeRange = 'monthly') {
    try {
      const now = new Date();
      let startDate = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Set start date based on time range
      if (timeRange === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'monthly') {
        startDate.setMonth(now.getMonth() - 5); // Last 6 months
      } else if (timeRange === 'annual') {
        startDate.setFullYear(now.getFullYear() - 1);
      } else {
        startDate.setDate(now.getDate() - 1); // Daily
      }

      // Get published package IDs
      const publishedPackageIds = (await Package.find({ status: 'published' }).select('_id')).map(p => p._id);

      // Get leads created in the time range for published packages only
      const trendData = await Lead.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: now },
            package: { $in: publishedPackageIds },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            inquiries: { $sum: 1 },
            conversions: {
              $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
            },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      // Format trend data
      return trendData.map((item) => ({
        month: months[item._id.month - 1] || 'Unknown',
        inquiries: item.inquiries,
        conversions: item.conversions,
      }));
    } catch (error) {
      logger.error('Error in getTrendData:', error);
      throw error;
    }
  }

  /**
   * Get package completion stats
   * @returns {Promise<Object>} Completion statistics
   */
  static async getCompletionStats() {
    try {
      const stats = await Itinerary.aggregate([
        {
          $group: {
            _id: null,
            totalItineraries: { $sum: 1 },
            publishedItineraries: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
            },
            draftItineraries: {
              $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] },
            },
            avgCompletionPercentage: { $avg: '$completionPercentage' },
          },
        },
      ]);

      return stats[0] || {
        totalItineraries: 0,
        publishedItineraries: 0,
        draftItineraries: 0,
        avgCompletionPercentage: 0,
      };
    } catch (error) {
      logger.error('Error in getCompletionStats:', error);
      throw error;
    }
  }
}

export default ItineraryAnalyticsService;
