/**
 * User Analytics Controller
 * Handles analytics for user management, sales rep performance, and user growth metrics
 */

import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';
import Booking from '../models/booking.model.js';
import Invoice from '../models/invoice.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  clampTimeRange,
  buildTimeBuckets,
  buildGroupId,
  buildTrendKey,
  buildBucketKey,
} from '../utils/analyticsUtils.js';

/**
 * @desc    Get user management analytics overview
 * @route   GET /api/v1/analytics/users/overview
 * @access  Private/Admin
 * @query   timeRange - 'daily', 'weekly', 'monthly', 'annual'
 */
export const getUserAnalyticsOverview = asyncHandler(async (req, res) => {
  const timeRange = clampTimeRange(req.query.timeRange);
  const buckets = buildTimeBuckets(timeRange);
  const startDate = buckets[0]?.start ? new Date(buckets[0].start) : new Date(0);

  const groupId = buildGroupId(timeRange);

  // Get user creation trend
  const userTrendAggregation = await User.aggregate([
    { $match: { createdAt: { $gte: startDate }, role: 'customer' } },
    {
      $group: {
        _id: groupId,
        newUsers: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
  ]);

  const userTrendMap = new Map();
  userTrendAggregation.forEach((item) => {
    const key = buildTrendKey(timeRange, item._id);
    userTrendMap.set(key, item);
  });

  // Get sales reps by role
  const salesRepTrendAggregation = await User.aggregate([
    { $match: { createdAt: { $gte: startDate }, role: 'salesRep', isActive: true } },
    {
      $group: {
        _id: groupId,
        salesReps: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
  ]);

  const salesRepTrendMap = new Map();
  salesRepTrendAggregation.forEach((item) => {
    const key = buildTrendKey(timeRange, item._id);
    salesRepTrendMap.set(key, item);
  });

  // Get booking conversion data (actual purchases)
  const bookingTrendAggregation = await Booking.aggregate([
    { $match: { createdAt: { $gte: startDate }, bookingStatus: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: groupId,
        purchasedCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
  ]);

  const bookingTrendMap = new Map();
  bookingTrendAggregation.forEach((item) => {
    const key = buildTrendKey(timeRange, item._id);
    bookingTrendMap.set(key, item);
  });

  // Build trend data combining users, purchases, and sales reps
  const trendData = buckets.map((bucket) => {
    const key = buildBucketKey(timeRange, bucket);
    const userItem = userTrendMap.get(key);
    const repItem = salesRepTrendMap.get(key);
    const bookingItem = bookingTrendMap.get(key);

    return {
      label: bucket.label,
      month: bucket.label.split(' ')[0],
      week: bucket.label,
      year: bucket.label,
      newUsers: userItem?.newUsers || 0,
      purchased: bookingItem?.purchasedCount || 0,
      salesReps: repItem?.salesReps || 0,
      revenue: bookingItem?.totalRevenue || 0,
    };
  });

  // Get overall user stats
  const totalNewUsers = await User.countDocuments({
    createdAt: { $gte: startDate },
    role: 'customer',
  });

  const totalActiveUsers = await User.countDocuments({
    role: 'customer',
    isActive: true,
  });

  // Get actual purchase data from bookings (more accurate than email verification)
  const totalPurchases = await Booking.countDocuments({
    bookingStatus: { $ne: 'cancelled' },
    createdAt: { $gte: startDate },
  });

  const totalRevenue = await Booking.aggregate([
    {
      $match: {
        bookingStatus: { $ne: 'cancelled' },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
      },
    },
  ]);

  const conversionRate = totalNewUsers > 0 
    ? ((totalPurchases / totalNewUsers) * 100).toFixed(1) 
    : 0;

  const totalSalesReps = await User.countDocuments({
    role: 'salesRep',
    isActive: true,
  });

  // Calculate trend for users
  const previousBucketStartDate = new Date(startDate);
  if (timeRange === 'daily') {
    previousBucketStartDate.setDate(previousBucketStartDate.getDate() - 7);
  } else if (timeRange === 'weekly') {
    previousBucketStartDate.setDate(previousBucketStartDate.getDate() - 49);
  } else if (timeRange === 'monthly') {
    previousBucketStartDate.setMonth(previousBucketStartDate.getMonth() - 6);
  } else if (timeRange === 'annual') {
    previousBucketStartDate.setFullYear(previousBucketStartDate.getFullYear() - 5);
  }

  const previousNewUsers = await User.countDocuments({
    createdAt: { $gte: previousBucketStartDate, $lt: startDate },
    role: 'customer',
  });

  const usersTrend = previousNewUsers > 0 
    ? (((totalNewUsers - previousNewUsers) / previousNewUsers) * 100).toFixed(1)
    : 0;

  // Get comprehensive user type distribution by role
  const roleBreakdown = await User.aggregate([
    {
      $group: {
        _id: '$role',
        totalCount: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
        inactiveCount: {
          $sum: { $cond: ['$isActive', 0, 1] },
        },
        emailVerifiedCount: {
          $sum: { $cond: ['$isEmailVerified', 1, 0] },
        },
      },
    },
    {
      $project: {
        role: '$_id',
        total: '$totalCount',
        active: '$activeCount',
        inactive: '$inactiveCount',
        emailVerified: '$emailVerifiedCount',
        _id: 0,
      },
    },
  ]);

  // Build user type distribution with all roles
  const userTypeDistribution = [
    {
      name: 'Customers',
      value: roleBreakdown.find((r) => r.role === 'customer')?.total || 0,
      role: 'customer',
      active: roleBreakdown.find((r) => r.role === 'customer')?.active || 0,
      inactive: roleBreakdown.find((r) => r.role === 'customer')?.inactive || 0,
      emailVerified: roleBreakdown.find((r) => r.role === 'customer')?.emailVerified || 0,
    },
    {
      name: 'Sales Representatives',
      value: roleBreakdown.find((r) => r.role === 'salesRep')?.total || 0,
      role: 'salesRep',
      active: roleBreakdown.find((r) => r.role === 'salesRep')?.active || 0,
      inactive: roleBreakdown.find((r) => r.role === 'salesRep')?.inactive || 0,
      emailVerified: roleBreakdown.find((r) => r.role === 'salesRep')?.emailVerified || 0,
    },
    {
      name: 'Vendors',
      value: roleBreakdown.find((r) => r.role === 'vendor')?.total || 0,
      role: 'vendor',
      active: roleBreakdown.find((r) => r.role === 'vendor')?.active || 0,
      inactive: roleBreakdown.find((r) => r.role === 'vendor')?.inactive || 0,
      emailVerified: roleBreakdown.find((r) => r.role === 'vendor')?.emailVerified || 0,
    },
    {
      name: 'Administrators',
      value: roleBreakdown.find((r) => r.role === 'admin')?.total || 0,
      role: 'admin',
      active: roleBreakdown.find((r) => r.role === 'admin')?.active || 0,
      inactive: roleBreakdown.find((r) => r.role === 'admin')?.inactive || 0,
      emailVerified: roleBreakdown.find((r) => r.role === 'admin')?.emailVerified || 0,
    },
  ].filter((item) => item.value > 0); // Only include roles that have users

  // Get user status distribution (Active vs Inactive)
  const userStatusDistribution = await User.aggregate([
    {
      $group: {
        _id: '$isActive',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        status: {
          $cond: ['$_id', 'Active', 'Inactive'],
        },
        value: '$count',
        _id: 0,
      },
    },
  ]);

  // Get email verification status distribution
  const emailVerificationDistribution = await User.aggregate([
    {
      $group: {
        _id: '$isEmailVerified',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        status: {
          $cond: ['$_id', 'Email Verified', 'Email Not Verified'],
        },
        value: '$count',
        _id: 0,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    data: {
      timeRange,
      generatedAt: new Date().toISOString(),
      stats: {
        totalNewUsers,
        totalPurchased: totalPurchases,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalActiveUsers,
        totalSalesReps,
        conversionRate,
        avgSalesReps: totalSalesReps > 0 ? (totalActiveUsers / totalSalesReps).toFixed(1) : 0,
        usersTrend,
        purchasedTrend: conversionRate,
      },
      trend: trendData,
      userTypeDistribution,
      userStatusDistribution,
      emailVerificationDistribution,
    },
  });
});

/**
 * @desc    Get sales rep performance analytics
 * @route   GET /api/v1/analytics/sales-reps/performance
 * @access  Private/Admin
 * @query   timeRange - 'daily', 'weekly', 'monthly', 'annual'
 * @query   limit - Number of top performers to return (default: 5)
 */
export const getSalesRepPerformanceAnalytics = asyncHandler(async (req, res) => {
  const timeRange = clampTimeRange(req.query.timeRange);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  const startDate = new Date();

  if (timeRange === 'daily') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeRange === 'weekly') {
    startDate.setDate(startDate.getDate() - 56);
  } else if (timeRange === 'monthly') {
    startDate.setMonth(startDate.getMonth() - 6);
  } else if (timeRange === 'annual') {
    startDate.setFullYear(startDate.getFullYear() - 5);
  }

  // Get all active sales reps
  const salesReps = await User.find({
    role: 'salesRep',
    isActive: true,
  }).select('_id name email createdAt');

  // Get comprehensive sales rep performance data
  const salesRepPerformance = await Promise.all(
    salesReps.map(async (rep) => {
      // Get leads assigned to this sales rep
      const totalLeads = await Lead.countDocuments({
        assignedTo: rep._id,
        createdAt: { $gte: startDate },
      });

      // Get converted leads
      const convertedLeads = await Lead.countDocuments({
        assignedTo: rep._id,
        status: 'converted',
        createdAt: { $gte: startDate },
      });

      // Get conversion rate
      const conversion = totalLeads > 0 
        ? Math.round((convertedLeads / totalLeads) * 100) 
        : 0;

      // Get revenue from bookings linked to leads assigned to this rep
      const revenueData = await Booking.aggregate([
        {
          $lookup: {
            from: 'leads',
            localField: 'user',
            foreignField: 'assignedTo',
            as: 'lead',
          },
        },
        {
          $match: {
            bookingStatus: { $ne: 'cancelled' },
            createdAt: { $gte: startDate },
            'lead.assignedTo': rep._id,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]);

      const revenue = revenueData[0]?.totalRevenue || 0;

      return {
        _id: rep._id,
        name: rep.name,
        email: rep.email,
        sales: totalLeads,
        convertedLeads,
        conversion,
        revenue,
      };
    })
  );

  // Sort by conversion first, then by sales
  const performanceByLeads = [...salesRepPerformance].sort((a, b) => {
    if (b.conversion !== a.conversion) {
      return b.conversion - a.conversion;
    }
    return b.sales - a.sales;
  });
  
  // Get top performers
  const topPerformers = performanceByLeads.slice(0, limit);

  // Calculate overall stats
  const avgConversion = salesRepPerformance.length > 0
    ? (salesRepPerformance.reduce((sum, rep) => sum + rep.conversion, 0) / salesRepPerformance.length).toFixed(1)
    : 0;

  const totalRevenue = salesRepPerformance.reduce((sum, rep) => sum + rep.revenue, 0);

  return res.status(200).json({
    success: true,
    data: {
      timeRange,
      generatedAt: new Date().toISOString(),
      performance: topPerformers,
      revenueRanking: [...topPerformers].sort((a, b) => b.revenue - a.revenue),
      stats: {
        totalSalesReps: salesReps.length,
        activeSalesReps: salesRepPerformance.filter(rep => rep.sales > 0).length,
        avgConversion,
        totalLeads: salesRepPerformance.reduce((sum, rep) => sum + rep.sales, 0),
        totalConvertedLeads: salesRepPerformance.reduce((sum, rep) => sum + rep.convertedLeads, 0),
        totalRevenue,
        avgRevenuePerRep: salesReps.length > 0 ? (totalRevenue / salesReps.length).toFixed(2) : 0,
        topPerformer: topPerformers[0]?.name || 'N/A',
        topPerformerRevenue: topPerformers[0]?.revenue || 0,
      },
    },
  });
});
