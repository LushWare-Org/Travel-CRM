/**
 * User Analytics Controller
 * Handles analytics for user management, sales rep performance, and user growth metrics
 */

import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';
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

  // Build trend data combining users and sales reps
  const trendData = buckets.map((bucket) => {
    const key = buildBucketKey(timeRange, bucket);
    const userItem = userTrendMap.get(key);
    const repItem = salesRepTrendMap.get(key);

    return {
      label: bucket.label,
      month: bucket.label.split(' ')[0],
      week: bucket.label,
      year: bucket.label,
      newUsers: userItem?.newUsers || 0,
      purchased: 0, // This field requires invoice/booking data which is not directly available
      salesReps: repItem?.salesReps || 0,
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

  const totalEmailVerified = await User.countDocuments({
    role: 'customer',
    isEmailVerified: true,
  });

  const totalSalesReps = await User.countDocuments({
    role: 'salesRep',
    isActive: true,
  });

  // Calculate conversion rate (customers who made purchases - we'll estimate as email verified)
  const conversionRate = totalActiveUsers > 0 
    ? ((totalEmailVerified / totalActiveUsers) * 100).toFixed(1) 
    : 0;

  // Get role distribution
  const roleDistribution = await User.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get sales rep stats
  const salesRepStats = await User.aggregate([
    { $match: { role: 'salesRep', isActive: true } },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              totalSales: { $sum: 1 },
              avgActiveSalesReps: { $avg: 1 },
            },
          },
        ],
        topPerformers: [
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
            },
          },
        ],
      },
    },
  ]);

  const stats = salesRepStats[0]?.stats[0] || {};
  const topPerformers = salesRepStats[0]?.topPerformers || [];

  // Calculate trends
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
        totalPurchased: totalEmailVerified, // Using email verified as proxy for purchased
        totalActiveUsers,
        totalSalesReps,
        conversionRate,
        avgSalesReps: totalSalesReps > 0 ? (totalActiveUsers / totalSalesReps).toFixed(1) : 0,
        usersTrend,
        purchasedTrend: conversionRate,
      },
      trend: trendData,
      roleDistribution,
      topPerformers,
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

  // Get sales reps with their lead counts
  const salesReps = await User.find({
    role: 'salesRep',
    isActive: true,
  }).select('_id name email createdAt');

  // Get lead counts for each sales rep
  const salesRepPerformance = await Promise.all(
    salesReps.map(async (rep) => {
      const totalLeads = await Lead.countDocuments({
        salesRep: rep.name, // Using name field as leads use salesRep string field
        createdAt: { $gte: startDate },
      });

      const convertedLeads = await Lead.countDocuments({
        salesRep: rep.name,
        status: 'converted',
        createdAt: { $gte: startDate },
      });

      const conversion = totalLeads > 0 
        ? Math.round((convertedLeads / totalLeads) * 100) 
        : 0;

      return {
        _id: rep._id,
        name: rep.name,
        email: rep.email,
        sales: totalLeads,
        convertedLeads,
        conversion,
        revenue: 0, // Revenue calculation would require invoice data
      };
    })
  );

  // Sort by number of sales
  const performanceByLeads = [...salesRepPerformance].sort((a, b) => b.sales - a.sales);
  
  // Get top performers
  const topPerformers = performanceByLeads.slice(0, limit);

  return res.status(200).json({
    success: true,
    data: {
      timeRange,
      generatedAt: new Date().toISOString(),
      performance: topPerformers,
      revenueRanking: topPerformers,
      stats: {
        totalSalesReps: salesReps.length,
        avgConversion: (
          salesRepPerformance.reduce((sum, rep) => sum + rep.conversion, 0) / 
          (salesRepPerformance.length || 1)
        ).toFixed(1),
        topPerformer: topPerformers[0]?.name || 'N/A',
        topPerformerRevenue: topPerformers[0]?.revenue || 0,
      },
    },
  });
});
