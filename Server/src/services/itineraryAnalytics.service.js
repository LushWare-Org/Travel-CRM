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
   * Includes total itineraries, inquiries, purchases, and hotel bookings
   * @param {Object} filters - Filter options (timeRange, destination, category, etc.)
   * @returns {Promise<Object>} Analytics overview data
   */
  static async getAnalyticsOverview(filters = {}) {
    try {
      const { timeRange = 'monthly', destination, category } = filters;

      // Build query
      const query = {};
      if (destination) query.destination = destination;
      if (category) query.category = category;

      // Get total packages count (not itineraries)
      const totalPackages = await Package.countDocuments(query);

      // Get leads associated with packages for inquiries and purchases
      const leads = await Lead.find()
        .select('status currentItinerary package')
        .populate('currentItinerary');

      // Count inquiries (all leads with package reference)
      const totalInquiries = leads.filter((lead) => lead.package).length;

      // Count purchases (converted leads with package)
      const totalPurchases = leads.filter(
        (lead) => lead.package && lead.status === 'converted'
      ).length;

      // Count hotel bookings from itineraries
      const hotelBookings = await Itinerary.aggregate([
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
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]);

      const totalHotels = hotelBookings[0]?.count || 0;

      // Calculate conversion rate
      const conversionRate = totalInquiries > 0
        ? ((totalPurchases / totalInquiries) * 100).toFixed(2)
        : 0;

      return {
        stats: {
          totalItineraries: totalPackages,
          totalInquiries,
          totalPurchases,
          totalHotels,
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
   * Get most inquired itineraries
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top inquired itineraries
   */
  static async getMostInquired(limit = 5) {
    try {
      // Get all leads grouped by package/itinerary
      const leadAggregation = await Lead.aggregate([
        {
          $match: { currentItinerary: { $exists: true, $ne: null } },
        },
        {
          $group: {
            _id: '$currentItinerary',
            inquiries: { $sum: 1 },
            purchases: {
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

      // Populate itinerary and package details
      const results = await Promise.all(
        leadAggregation.map(async (item) => {
          const itinerary = await Itinerary.findById(item._id)
            .populate('package', 'name destination price rating');

          if (!itinerary || !itinerary.package) {
            return null;
          }

          return {
            name: itinerary.package.name,
            inquiries: item.inquiries,
            purchases: item.purchases,
            rating: itinerary.package.rating || 4.5,
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
   * Get destination performance
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top destinations
   */
  static async getDestinationPerformance(limit = 5) {
    try {
      const destinations = await Package.aggregate([
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

      // Enrich with inquiry and purchase data from leads
      const enriched = await Promise.all(
        destinations.map(async (dest) => {
          // Find packages for this destination
          const packagesForDestination = await Package.find({ 
            destination: dest._id 
          }).select('_id');
          
          const packageIds = packagesForDestination.map(p => p._id);

          // Count leads that reference these packages
          const leads = await Lead.countDocuments({
            package: { $in: packageIds }
          });

          const purchases = await Lead.countDocuments({
            package: { $in: packageIds },
            status: 'converted',
          });

          return {
            destination: dest._id || 'Unknown',
            inquiries: leads || 0,
            purchases: purchases || 0,
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
  static async getActivityPreferences(limit = 5) {
    try {
      // Aggregate activities from itineraries
      const activities = await Itinerary.aggregate([
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

      // Map activities with inquiry and purchase counts
      const result = activities.map((activity, idx) => ({
        name: activity._id || `Activity ${idx + 1}`,
        inquiries: activity.count,
        purchases: Math.round(activity.count * 0.6), // Estimate 60% conversion
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

      // Get leads created in the time range
      const trendData = await Lead.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            inquiries: { $sum: 1 },
            purchases: {
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
        purchases: item.purchases,
        hotels: Math.round(item.purchases * 0.95), // Most purchases include hotels
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
