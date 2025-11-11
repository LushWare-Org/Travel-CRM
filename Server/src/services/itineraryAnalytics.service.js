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
      if (destination) query['package.destination'] = destination;
      if (category) query['package.category'] = category;

      // Get total itineraries count
      const totalItineraries = await Itinerary.countDocuments();

      // Get leads associated with itineraries for inquiries and purchases
      const leads = await Lead.find()
        .select('status currentItinerary package')
        .populate('currentItinerary');

      // Count inquiries (all leads with itinerary reference)
      const totalInquiries = leads.filter((lead) => lead.currentItinerary).length;

      // Count purchases (converted leads with itinerary)
      const totalPurchases = leads.filter(
        (lead) => lead.currentItinerary && lead.status === 'converted'
      ).length;

      // Count hotel bookings
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
          totalItineraries,
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
      // Get all leads
      const leads = await Lead.find()
        .select('currentItinerary status package')
        .populate({
          path: 'currentItinerary',
          select: 'days package',
          populate: {
            path: 'package',
            select: 'name destination duration price category',
          },
        });

      // Count inquiries by itinerary
      const inquiryMap = new Map();

      leads.forEach((lead) => {
        if (lead.currentItinerary && lead.currentItinerary.package) {
          const itinId = lead.currentItinerary._id.toString();

          if (!inquiryMap.has(itinId)) {
            inquiryMap.set(itinId, {
              id: itinId,
              name: lead.currentItinerary.package.name,
              destination: lead.currentItinerary.package.destination,
              duration: lead.currentItinerary.package.duration,
              price: lead.currentItinerary.package.price,
              rating: 4.5,
              inquiries: 0,
              purchases: 0,
            });
          }

          const item = inquiryMap.get(itinId);
          item.inquiries += 1;

          // Count purchases
          if (lead.status === 'converted') {
            item.purchases += 1;
          }
        }
      });

      // Sort by inquiries and return top N
      const sorted = Array.from(inquiryMap.values())
        .sort((a, b) => b.inquiries - a.inquiries)
        .slice(0, limit);

      return sorted;
    } catch (error) {
      logger.error('Error in getMostInquired:', error);
      throw error;
    }
  }

  /**
   * Get destination performance metrics
   * @param {number} limit - Number of destinations to return
   * @returns {Promise<Array>} Destination performance data
   */
  static async getDestinationPerformance(limit = 5) {
    try {
      // Get all packages with itineraries
      const packages = await Package.find()
        .select('name destination duration price category itinerary');

      // Get leads to count inquiries and purchases per destination
      const leads = await Lead.find()
        .select('status currentItinerary')
        .populate({
          path: 'currentItinerary',
          select: 'package',
          populate: {
            path: 'package',
            select: 'destination',
          },
        });

      // Count by destination
      const destinationMap = new Map();

      leads.forEach((lead) => {
        if (lead.currentItinerary && lead.currentItinerary.package) {
          const dest = lead.currentItinerary.package.destination;

          if (!destinationMap.has(dest)) {
            destinationMap.set(dest, {
              destination: dest,
              inquiries: 0,
              purchases: 0,
              avgPrice: 0,
              packageCount: 0,
            });
          }

          const item = destinationMap.get(dest);
          item.inquiries += 1;

          if (lead.status === 'converted') {
            item.purchases += 1;
          }
        }
      });

      // Calculate average price per destination
      packages.forEach((pkg) => {
        if (destinationMap.has(pkg.destination)) {
          const item = destinationMap.get(pkg.destination);
          item.packageCount += 1;
          item.avgPrice = Math.round(
            (item.avgPrice * (item.packageCount - 1) + pkg.price) / item.packageCount,
          );
        }
      });

      // Sort by inquiries and return top N
      const sorted = Array.from(destinationMap.values())
        .sort((a, b) => b.inquiries - a.inquiries)
        .slice(0, limit);

      return sorted;
    } catch (error) {
      logger.error('Error in getDestinationPerformance:', error);
      throw error;
    }
  }

  /**
   * Get activity preferences from itineraries
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Activity preference data
   */
  static async getActivityPreferences(limit = 5) {
    try {
      // Aggregate activities from all itineraries
      const activityData = await Itinerary.aggregate([
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

      // Get purchase/inquiry stats for activities
      const leads = await Lead.find()
        .select('status currentItinerary')
        .populate({
          path: 'currentItinerary',
          select: 'days',
        });

      const activityStats = {};
      activityData.forEach((activity) => {
        activityStats[activity._id] = {
          name: activity._id,
          inquiries: 0,
          purchases: 0,
        };
      });

      leads.forEach((lead) => {
        if (lead.currentItinerary && lead.currentItinerary.days) {
          const activities = new Set();

          lead.currentItinerary.days.forEach((day) => {
            if (day.activities) {
              day.activities.forEach((activity) => {
                activities.add(activity);
              });
            }
          });

          activities.forEach((activity) => {
            if (activityStats[activity]) {
              activityStats[activity].inquiries += 1;

              if (lead.status === 'converted') {
                activityStats[activity].purchases += 1;
              }
            }
          });
        }
      });

      const result = Object.values(activityStats)
        .sort((a, b) => b.inquiries - a.inquiries)
        .slice(0, limit);

      return result;
    } catch (error) {
      logger.error('Error in getActivityPreferences:', error);
      throw error;
    }
  }

  /**
   * Get hotel/accommodation preferences
   * @param {number} limit - Number of hotels to return
   * @returns {Promise<Array>} Hotel preference data
   */
  static async getHotelPreferences(limit = 5) {
    try {
      // Aggregate accommodations from all itineraries
      const hotelData = await Itinerary.aggregate([
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
            _id: {
              name: '$days.accommodation.name',
              type: '$days.accommodation.type',
            },
            count: { $sum: 1 },
            avgRating: { $avg: '$days.accommodation.rating' },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      // Get purchase/inquiry stats for hotels
      const leads = await Lead.find()
        .select('status currentItinerary')
        .populate({
          path: 'currentItinerary',
          select: 'days',
        });

      const hotelStats = {};
      hotelData.forEach((hotel) => {
        const key = hotel._id.name;
        hotelStats[key] = {
          name: hotel._id.name,
          type: hotel._id.type,
          rating: hotel.avgRating || 0,
          inquiries: 0,
          purchases: 0,
        };
      });

      leads.forEach((lead) => {
        if (lead.currentItinerary && lead.currentItinerary.days) {
          const hotels = new Set();

          lead.currentItinerary.days.forEach((day) => {
            if (day.accommodation && day.accommodation.name) {
              hotels.add(day.accommodation.name);
            }
          });

          hotels.forEach((hotel) => {
            if (hotelStats[hotel]) {
              hotelStats[hotel].inquiries += 1;

              if (lead.status === 'converted') {
                hotelStats[hotel].purchases += 1;
              }
            }
          });
        }
      });

      const result = Object.values(hotelStats)
        .sort((a, b) => b.inquiries - a.inquiries)
        .slice(0, limit);

      return result;
    } catch (error) {
      logger.error('Error in getHotelPreferences:', error);
      throw error;
    }
  }

  /**
   * Get trend data for specified time range
   * @param {string} timeRange - 'daily', 'weekly', 'monthly', 'annual'
   * @returns {Promise<Array>} Trend data
   */
  static async getTrendData(timeRange = 'monthly') {
    try {
      const leads = await Lead.find()
        .select('status createdAt currentItinerary')
        .populate('currentItinerary');

      // Group data by time range
      const trendMap = new Map();

      leads.forEach((lead) => {
        if (!lead.currentItinerary) return;

        const date = new Date(lead.createdAt);
        let key;

        switch (timeRange) {
          case 'daily':
            key = date.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
          default:
            key = date.toISOString().substring(0, 7); // YYYY-MM
            break;
          case 'annual':
            key = date.getFullYear().toString();
            break;
        }

        if (!trendMap.has(key)) {
          trendMap.set(key, {
            month: key,
            inquiries: 0,
            purchases: 0,
            hotels: 0,
          });
        }

        const item = trendMap.get(key);
        item.inquiries += 1;

        if (lead.status === 'converted') {
          item.purchases += 1;
        }

        // Count hotel bookings
        if (lead.currentItinerary.days) {
          lead.currentItinerary.days.forEach((day) => {
            if (day.accommodation && day.accommodation.name) {
              item.hotels += 1;
            }
          });
        }
      });

      // Sort by key and return
      const sorted = Array.from(trendMap.values()).sort((a, b) => {
        const dateA = new Date(`${a.month}-01`);
        const dateB = new Date(`${b.month}-01`);
        return dateA - dateB;
      });

      return sorted;
    } catch (error) {
      logger.error('Error in getTrendData:', error);
      throw error;
    }
  }

  /**
   * Get itinerary completion statistics
   * @returns {Promise<Object>} Completion statistics
   */
  static async getCompletionStats() {
    try {
      const itineraries = await Itinerary.find().select('days version status');

      const stats = {
        draft: 0,
        published: 0,
        archived: 0,
        avgCompletion: 0,
        totalDays: 0,
      };

      let totalCompletion = 0;
      let daysCount = 0;

      itineraries.forEach((itinerary) => {
        stats[itinerary.status] = (stats[itinerary.status] || 0) + 1;
        stats.totalDays += itinerary.days?.length || 0;
        daysCount += itinerary.days?.length || 0;

        // Calculate completion based on required fields
        let filledFields = 0;
        let totalFields = 0;

        itinerary.days?.forEach((day) => {
          totalFields += 4; // dayNumber, title, description, activities
          if (day.dayNumber) filledFields += 1;
          if (day.title) filledFields += 1;
          if (day.description) filledFields += 1;
          if (day.activities?.length > 0) filledFields += 1;
        });

        if (totalFields > 0) {
          totalCompletion += (filledFields / totalFields) * 100;
        }
      });

      stats.avgCompletion = itineraries.length > 0
        ? Math.round(totalCompletion / itineraries.length)
        : 0;

      return stats;
    } catch (error) {
      logger.error('Error in getCompletionStats:', error);
      throw error;
    }
  }
}

export default ItineraryAnalyticsService;
