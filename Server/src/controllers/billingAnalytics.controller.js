/**
 * Billing Analytics Controller
 * Handles analytics for invoices, payments, revenue, and financial metrics
 */

import Invoice from '../models/invoice.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  CONSTANTS,
  clampTimeRange,
  buildTimeBuckets,
  buildGroupId,
  buildTrendKey,
  buildBucketKey,
} from '../utils/analyticsUtils.js';

const { PAYMENT_STATUS_LABELS, INVOICE_CATEGORY_LABELS } = CONSTANTS;

/**
 * @desc    Get billing analytics overview with revenue trends and payment status
 * @route   GET /api/v1/analytics/billing/overview
 * @access  Private/Admin, SalesRep
 * @query   timeRange - 'daily', 'weekly', 'monthly', 'annual'
 */
export const getBillingAnalyticsOverview = asyncHandler(async (req, res) => {
  const timeRange = clampTimeRange(req.query.timeRange);
  const buckets = buildTimeBuckets(timeRange);
  const startDate = buckets[0]?.start ? new Date(buckets[0].start) : new Date(0);

  const groupId = buildGroupId(timeRange);
  const matchStage = {
    issueDate: { $gte: startDate },
    status: { $nin: ['cancelled', 'refunded'] },
  };

  const revenueAggregation = await Invoice.aggregate([
    { $match: matchStage },
    {
      $addFields: {
        paidValue: {
          $max: [
            {
              $subtract: [
                { $ifNull: ['$totalAmount', 0] },
                { $ifNull: ['$outstandingAmount', 0] },
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        outstandingValue: { $ifNull: ['$outstandingAmount', 0] },
        potentialValue: {
          $max: [
            {
              $subtract: [
                { $ifNull: ['$totalAmount', 0] },
                '$paidValue',
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: '$paidValue' },
        outstanding: { $sum: '$outstandingValue' },
        potential: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  ['draft', 'sent', 'viewed', 'partial', 'overdue'],
                ],
              },
              '$totalAmount',
              '$outstandingValue',
            ],
          },
        },
        invoices: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
  ]);

  const revenueMap = new Map();
  revenueAggregation.forEach((item) => {
    const key = buildTrendKey(timeRange, item._id);
    revenueMap.set(key, item);
  });

  let totalRevenue = 0;
  let totalOutstanding = 0;
  let totalPotential = 0;

  const revenueTrend = buckets.map((bucket) => {
    const key = buildBucketKey(timeRange, bucket);
    const item = revenueMap.get(key);
    const revenue = item?.revenue || 0;
    const outstanding = item?.outstanding || 0;
    const potential = item?.potential || 0;
    totalRevenue += revenue;
    totalOutstanding += outstanding;
    totalPotential += potential;
    return {
      label: bucket.label,
      revenue,
      target: Math.round(revenue * 1.1),
      invoices: item?.invoices || 0,
    };
  });

  const outstandingTrend = buckets.map((bucket) => {
    const key = buildBucketKey(timeRange, bucket);
    const item = revenueMap.get(key);
    return {
      label: bucket.label,
      outstanding: item?.outstanding || 0,
      potentialRevenue: item?.potential || 0,
    };
  });

  const pendingInvoices = await Invoice.countDocuments({
    issueDate: { $gte: startDate },
    outstandingAmount: { $gt: 0 },
    status: { $nin: ['cancelled', 'refunded'] },
  });

  const paymentStatusAggregation = await Invoice.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
      },
    },
  ]);

  const paymentStatusDistribution = Object.entries(PAYMENT_STATUS_LABELS).map(([status, name]) => {
    const match = paymentStatusAggregation.find((item) => item?._id === status);
    return {
      status,
      name,
      count: match?.count || 0,
      totalAmount: match?.totalAmount || 0,
      value: match?.totalAmount || 0,
    };
  });

  const categoryAggregation = await Invoice.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        revenue: { $sum: { $ifNull: ['$items.totalPrice', 0] } },
        invoices: { $addToSet: '$_id' },
      },
    },
    {
      $project: {
        category: { $ifNull: ['$_id', 'other'] },
        revenue: 1,
        invoicesCount: { $size: '$invoices' },
      },
    },
  ]);

  const invoiceCategoryBreakdown = categoryAggregation
    .map((entry) => ({
      category: entry.category || 'other',
      name:
        INVOICE_CATEGORY_LABELS[entry.category] ||
        entry.category
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' '),
      revenue: entry.revenue || 0,
      invoices: entry.invoicesCount || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return res.status(200).json({
    success: true,
    data: {
      timeRange,
      generatedAt: new Date().toISOString(),
      stats: {
        totalRevenue,
        totalOutstanding,
        totalPotentialRevenue: totalPotential,
        pendingInvoices,
      },
      revenueTrend,
      outstandingTrend,
      paymentStatusDistribution,
      invoiceCategoryBreakdown,
    },
  });
});
