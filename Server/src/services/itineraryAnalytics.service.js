/**
 * Package Analytics Service
 * Handles analytics calculations for published packages including:
 * - Inquiries: Leads created from booking/customization requests for published packages
 * - Conversions: Leads with status='converted' for published packages
 * - Trends, performance metrics, and aggregated data
 *
 * Note: Only published packages (status='published') are included in analytics.
 * Website contact form leads (no package reference) are excluded.
 */

import Itinerary from '../models/itinerary.model.js';
import Package from '../models/package.model.js';
import CustomizedPackage from '../models/customizedPackage.model.js';
import Lead from '../models/lead.model.js';
import logger from '../config/logger.js';

class PackageAnalyticsService {
  /**
   * Get overall package analytics overview
   * Tracks published packages, inquiries (leads from bookings/customizations), and conversions
   *
   * @param {Object} filters - Filter options (timeRange, destination, category, etc.)
   * @returns {Promise<Object>} Analytics overview with stats and trend data
   *
   * Metrics:
   * - totalItineraries: Count of published packages
   * - totalInquiries: Count of leads linked to published packages (booking/customization inquiries)
   * - totalConversions: Count of leads with status='converted' for published packages
   * - conversionRate: Percentage of inquiries that became conversions
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
      const publishedPackageIds = (await Package.find(query).select('_id')).map((p) => p._id);

      // Count inquiries = leads with published packages
      // These are leads created from booking/customization requests (sources: 'booking', 'website')
      const totalInquiries = await Lead.countDocuments({
        package: { $in: publishedPackageIds },
      });

      // Count conversions = leads with status='converted' for published packages
      const totalConversions = await Lead.countDocuments({
        package: { $in: publishedPackageIds },
        status: 'converted',
      });

      // Calculate conversion rate: (conversions / inquiries) * 100
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
   * Ranks packages by number of leads (booking/customization inquiries) received
   * Only includes packages with status='published'
   * Filters leads based on the specified time range
   *
   * @param {number} limit - Number of results to return (default: 5)
   * @param {string} timeRange - Time range: 'daily', 'weekly', 'monthly', 'annual' (default: 'monthly')
   * @returns {Promise<Array>} Top inquired packages with inquiry/conversion counts
   */
  static async getMostInquired(limit = 5, timeRange = 'monthly') {
    try {
      // Calculate time range
      const now = new Date();
      const startDate = new Date();

      if (timeRange === 'daily') {
        startDate.setDate(now.getDate() - 1);
      } else if (timeRange === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'monthly') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeRange === 'annual') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Get published package IDs
      const publishedPackageIds = (await Package.find({ status: 'published' }).select('_id')).map((p) => p._id);

      // Get leads with published packages grouped by package, filtered by time range
      const leadAggregation = await Lead.aggregate([
        {
          $match: {
            package: { $in: publishedPackageIds },
            createdAt: { $gte: startDate, $lte: now },
          },
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

          // Skip if package not found (should not happen since we filtered by published IDs)
          if (!pkg) {
            return null;
          }

          return {
            name: pkg.name,
            inquiries: item.inquiries,
            conversions: item.conversions,
            rating: pkg.rating || 4.5,
          };
        }),
      );

      return results.filter((item) => item !== null);
    } catch (error) {
      logger.error('Error in getMostInquired:', error);
      throw error;
    }
  }

  /**
   * Get destination performance from published packages
   * Shows inquiry and conversion metrics grouped by destination for all destinations
   * Filters results based on time range and returns all destinations sorted by inquiries
   * Only includes published packages and their associated leads
   *
   * @param {number} limit - Maximum number of results to return (default: 5, not enforced for all destinations)
   * @param {string} timeRange - Time range: 'daily', 'weekly', 'monthly', 'annual' (default: 'monthly')
   * @returns {Promise<Array>} All destinations with performance metrics sorted by inquiries
   */
  static async getDestinationPerformance(limit = 5, timeRange = 'monthly') {
    try {
      // Calculate time range
      const now = new Date();
      const startDate = new Date();

      if (timeRange === 'daily') {
        startDate.setDate(now.getDate() - 1);
      } else if (timeRange === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'monthly') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeRange === 'annual') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Get all published packages grouped by destination (NO LIMIT on aggregation)
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
      ]);

      // Enrich with inquiry and conversion data from leads
      const enriched = await Promise.all(
        destinations.map(async (dest) => {
          // Find published packages for this destination
          const packagesForDestination = await Package.find({
            destination: dest._id,
            status: 'published',
          }).select('_id');

          const packageIds = packagesForDestination.map((p) => p._id);

          // Count leads (inquiries) that reference these packages within time range
          const inquiries = await Lead.countDocuments({
            package: { $in: packageIds },
            createdAt: { $gte: startDate, $lte: now },
          });

          // Count conversions for these packages within time range
          const conversions = await Lead.countDocuments({
            package: { $in: packageIds },
            status: 'converted',
            createdAt: { $gte: startDate, $lte: now },
          });

          return {
            destination: dest._id || 'Unknown',
            inquiries: inquiries || 0,
            conversions: conversions || 0,
            avgPrice: Math.round(dest.avgPrice || 0),
            totalPackages: dest.totalPackages || 0,
          };
        }),
      );

      return enriched
        .filter((item) => item.destination !== 'Unknown')
        .sort((a, b) => b.inquiries - a.inquiries);
    } catch (error) {
      logger.error('Error in getDestinationPerformance:', error);
      throw error;
    }
  }

  /**
   * Get activity preferences from published packages
   * Shows most common activities across all published itineraries
   * and estimates conversion counts based on overall conversion ratio
   *
   * @param {number} limit - Number of results to return (default: 5)
   * @returns {Promise<Array>} Top activities with inquiry/conversion estimates
   */
  static async getActivityPreferences(limit = 5) {
    try {
      // Get published package IDs
      const publishedPackageIds = (await Package.find({ status: 'published' }).select('_id')).map((p) => p._id);

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
      // This is used to estimate conversions per activity
      const totalPublishedInquiries = await Lead.countDocuments({ package: { $in: publishedPackageIds } });
      const totalPublishedConversions = await Lead.countDocuments({ package: { $in: publishedPackageIds }, status: 'converted' });
      const conversionRatio = totalPublishedInquiries > 0 ? totalPublishedConversions / totalPublishedInquiries : 0;

      // Map activities with inquiry count and estimated conversion count
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
   * Get trend data showing inquiries and conversions over time
   * Only includes leads for published packages in the specified time range
   * Groups data appropriately based on time range:
   * - daily: groups by day
   * - weekly: groups by week
   * - monthly: groups by month
   * - annual: groups by month
   *
   * @param {string} timeRange - Time range: 'daily', 'weekly', 'monthly', 'annual' (default: 'monthly')
   * @returns {Promise<Array>} Trend data with inquiries and conversions grouped by time period
   */
  static async getTrendData(timeRange = 'monthly') {
    try {
      const now = new Date();
      const startDate = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Set start date and grouping strategy based on time range
      let groupConfig = {
        month: { $month: '$createdAt' },
        year: { $year: '$createdAt' },
      };
      let sortConfig = { '_id.year': 1, '_id.month': 1 };
      let formatFn = (item) => `${months[item._id.month - 1]}`;

      if (timeRange === 'daily') {
        // Last 7 days, group by day
        startDate.setDate(now.getDate() - 7);
        groupConfig = {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        };
        sortConfig = { '_id.date': 1 };
        formatFn = (item) => item._id.date;
      } else if (timeRange === 'weekly') {
        // Last 4 weeks, group by week
        startDate.setDate(now.getDate() - 28);
        groupConfig = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        sortConfig = { '_id.year': 1, '_id.week': 1 };
        formatFn = (item) => `W${item._id.week}`;
      } else if (timeRange === 'monthly') {
        // Last 6 months, group by month
        startDate.setMonth(now.getMonth() - 5);
        groupConfig = {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        };
        sortConfig = { '_id.year': 1, '_id.month': 1 };
        formatFn = (item) => `${months[item._id.month - 1]}`;
      } else if (timeRange === 'annual') {
        // Last 12 months, group by month
        startDate.setFullYear(now.getFullYear() - 1);
        groupConfig = {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        };
        sortConfig = { '_id.year': 1, '_id.month': 1 };
        formatFn = (item) => `${months[item._id.month - 1]} ${item._id.year}`;
      }

      // Get published package IDs
      const publishedPackageIds = (await Package.find({ status: 'published' }).select('_id')).map((p) => p._id);

      // Get leads (inquiries) created in the time range for published packages only
      const trendData = await Lead.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: now },
            package: { $in: publishedPackageIds },
          },
        },
        {
          $group: {
            _id: groupConfig,
            inquiries: { $sum: 1 },
            conversions: {
              $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
            },
          },
        },
        {
          $sort: sortConfig,
        },
      ]);

      // Format trend data with dynamic label based on time range
      return trendData.map((item) => ({
        month: formatFn(item),
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

export default PackageAnalyticsService;
