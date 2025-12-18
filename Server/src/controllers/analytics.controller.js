import Lead from '../models/lead.model.js';
import Invoice from '../models/invoice.model.js';
import Booking from '../models/booking.model.js';
import Itinerary from '../models/itinerary.model.js';
import Package from '../models/package.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { COUNTRY_NAMES, normalizeString } from '../utils/countryUtils.js';
import PackageAnalyticsService from '../services/itineraryAnalytics.service.js';

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  quoted: 'Quoted',
  converted: 'Converted',
  lost: 'Lost',
  'not-interested': 'Not Interested',
};

const TREND_STATUSES = ['new', 'contacted', 'interested', 'converted'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_LABELS = {
  honeymoon: 'Honeymoon',
  budget: 'Budget',
  luxury: 'Luxury',
  adventure: 'Adventure',
  wildlife: 'Wildlife',
  family: 'Family',
  beach: 'Beach',
  heritage: 'Heritage',
  religious: 'Religious',
  other: 'Other',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

const PRICE_BUCKETS = [
  { key: 'Below ₹50K', label: 'Below ₹50K', min: 0, max: 50000 },
  { key: '₹50K-₹2L', label: '₹50K-₹2L', min: 50000, max: 200000 },
  { key: '₹2L-₹5L', label: '₹2L-₹5L', min: 200000, max: 500000 },
  { key: '₹5L-₹10L', label: '₹5L-₹10L', min: 500000, max: 1000000 },
  { key: '₹10L-₹25L', label: '₹10L-₹25L', min: 1000000, max: 2500000 },
  { key: '₹25L+', label: '₹25L+', min: 2500000, max: Number.MAX_SAFE_INTEGER },
  { key: 'Unspecified', label: 'Unspecified', min: null, max: null },
];

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid',
  overpaid: 'Overpaid',
  refunded: 'Refunded',
};

const INVOICE_CATEGORY_LABELS = {
  accommodation: 'Accommodation',
  transportation: 'Transportation',
  activity: 'Activities',
  food: 'Food & Beverage',
  guide: 'Guide Services',
  insurance: 'Insurance',
  visa: 'Visa & Documentation',
  package: 'Packages',
  other: 'Other',
};

const clampTimeRange = (range) => {
  const allowed = ['daily', 'weekly', 'monthly', 'annual'];
  if (!range || !allowed.includes(range)) {
    return 'monthly';
  }
  return range;
};

const getISOWeek = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
  return {
    week: weekNo,
    year: tempDate.getUTCFullYear(),
  };
};

const buildTimeBuckets = (range) => {
  const now = new Date();
  const buckets = [];

  if (range === 'daily') {
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      buckets.push({
        label: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      });
    }
  } else if (range === 'weekly') {
    for (let i = 7; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i * 7);
      const { week, year } = getISOWeek(date);
      // Determine Monday of the ISO week
      const weekDate = new Date(date);
      const day = weekDate.getDay();
      const diff = weekDate.getDate() - day + (day === 0 ? -6 : 1);
      weekDate.setDate(diff);
      buckets.push({
        label: `W${week} ${String(year).slice(-2)}`,
        isoWeek: week,
        isoWeekYear: year,
        start: new Date(weekDate.getFullYear(), weekDate.getMonth(), weekDate.getDate()),
      });
    }
  } else if (range === 'annual') {
    for (let i = 4; i >= 0; i -= 1) {
      const year = now.getFullYear() - i;
      buckets.push({
        label: `${year}`,
        year,
        start: new Date(year, 0, 1),
      });
    }
  } else {
    // monthly default
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        start: new Date(date.getFullYear(), date.getMonth(), 1),
      });
    }
  }

  return buckets;
};

const buildGroupId = (range) => {
  if (range === 'daily') {
    return {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' },
    };
  }
  if (range === 'weekly') {
    return {
      isoWeekYear: { $isoWeekYear: '$createdAt' },
      isoWeek: { $isoWeek: '$createdAt' },
    };
  }
  if (range === 'annual') {
    return {
      year: { $year: '$createdAt' },
    };
  }
  return {
    year: { $year: '$createdAt' },
    month: { $month: '$createdAt' },
  };
};

const buildTrendKey = (range, id) => {
  if (range === 'daily') {
    return `${id.year}-${id.month}-${id.day}`;
  }
  if (range === 'weekly') {
    return `${id.isoWeekYear}-${id.isoWeek}`;
  }
  if (range === 'annual') {
    return `${id.year}`;
  }
  return `${id.year}-${id.month}`;
};

const buildBucketKey = (range, bucket) => {
  if (range === 'daily') {
    return `${bucket.year}-${bucket.month}-${bucket.day}`;
  }
  if (range === 'weekly') {
    return `${bucket.isoWeekYear}-${bucket.isoWeek}`;
  }
  if (range === 'annual') {
    return `${bucket.year}`;
  }
  return `${bucket.year}-${bucket.month}`;
};

export const getLeadAnalyticsOverview = asyncHandler(async (req, res) => {
  const timeRange = clampTimeRange(req.query.timeRange);
  const buckets = buildTimeBuckets(timeRange);
  const startDate = buckets[0]?.start ? new Date(buckets[0].start) : new Date(0);

  const groupId = buildGroupId(timeRange);

  const trendAggregation = await Lead.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: groupId,
        total: { $sum: 1 },
        ...TREND_STATUSES.reduce((acc, status) => {
          acc[status] = {
            $sum: {
              $cond: [{ $eq: ['$status', status] }, 1, 0],
            },
          };
          return acc;
        }, {}),
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
  ]);

  const trendMap = new Map();
  trendAggregation.forEach((item) => {
    const key = buildTrendKey(timeRange, item._id);
    trendMap.set(key, item);
  });

  const trendData = buckets.map((bucket) => {
    const key = buildBucketKey(timeRange, bucket);
    const item = trendMap.get(key);
    const trendEntry = {
      label: bucket.label,
    };
    TREND_STATUSES.forEach((status) => {
      trendEntry[status] = item?.[status] ?? 0;
    });
    return trendEntry;
  });

  const statusCounts = await Lead.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalsByStatus = statusCounts.reduce((acc, item) => {
    if (item?._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});

  const totalLeads = statusCounts.reduce((sum, item) => sum + (item.count || 0), 0);

  const stats = {
    totalLeads,
    new: totalsByStatus.new || 0,
    contacted: totalsByStatus.contacted || 0,
    interested: totalsByStatus.interested || 0,
    converted: totalsByStatus.converted || 0,
    quoted: totalsByStatus.quoted || 0,
  };

  const statusDistribution = Object.entries(STATUS_LABELS).map(([status, label]) => ({
    name: label,
    value: totalsByStatus[status] || 0,
    status,
  }));

  const detailedAggregation = await Lead.aggregate([
    {
      $lookup: {
        from: 'customizedpackages',
        localField: 'customizedPackage',
        foreignField: '_id',
        as: 'customizedPackage',
      },
    },
    {
      $lookup: {
        from: 'packages',
        localField: 'package',
        foreignField: '_id',
        as: 'package',
      },
    },
    {
      $lookup: {
        from: 'manualitineraries',
        localField: '_id',
        foreignField: 'lead',
        as: 'manualItinerary',
      },
    },
    {
      $addFields: {
        customizedDoc: { $arrayElemAt: ['$customizedPackage', 0] },
        packageDoc: { $arrayElemAt: ['$package', 0] },
        manualDoc: { $arrayElemAt: ['$manualItinerary', 0] },
      },
    },
    {
      $addFields: {
        leadCategory: {
          $ifNull: [
            '$customizedDoc.category',
            { $ifNull: ['$packageDoc.category', 'other'] },
          ],
        },
        effectivePrice: {
          $cond: [
            { $and: ['$customizedDoc.price', { $gt: ['$customizedDoc.price', 0] }] },
            '$customizedDoc.price',
            {
              $cond: [
                { $and: ['$packageDoc.price', { $gt: ['$packageDoc.price', 0] }] },
                '$packageDoc.price',
                {
                  $cond: [
                    { $and: ['$quoteAmount', { $gt: ['$quoteAmount', 0] }] },
                    '$quoteAmount',
                    null,
                  ],
                },
              ],
            },
          ],
        },
        effectiveDestination: {
          $ifNull: [
            '$destination',
            {
              $ifNull: [
                '$customizedDoc.destination',
                {
                  $ifNull: [
                    '$packageDoc.destination',
                    {
                      $let: {
                        vars: {
                          flattenedLocations: {
                            $reduce: {
                              input: { $ifNull: ['$manualDoc.days', []] },
                              initialValue: [],
                              in: {
                                $concatArrays: [
                                  '$$value',
                                  {
                                    $filter: {
                                      input: { $ifNull: ['$$this.locations', []] },
                                      as: 'loc',
                                      cond: { $ne: ['$$loc', ''] },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                        in: {
                          $arrayElemAt: ['$$flattenedLocations', 0],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        effectiveOrigin: { $ifNull: ['$fromCountry', '$destinationCountry'] },
        isConverted: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
      },
    },
    {
      $facet: {
        categoryCounts: [
          {
            $group: {
              _id: '$leadCategory',
              count: { $sum: 1 },
            },
          },
        ],
        priceRanges: [
          {
            $project: {
              priceBucket: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $and: [
                          { $gte: ['$effectivePrice', 50000] },
                          { $lt: ['$effectivePrice', 200000] },
                        ],
                      },
                      then: '₹50K-₹2L',
                    },
                    {
                      case: {
                        $and: [
                          { $gte: ['$effectivePrice', 200000] },
                          { $lt: ['$effectivePrice', 500000] },
                        ],
                      },
                      then: '₹2L-₹5L',
                    },
                    {
                      case: {
                        $and: [
                          { $gte: ['$effectivePrice', 500000] },
                          { $lt: ['$effectivePrice', 1000000] },
                        ],
                      },
                      then: '₹5L-₹10L',
                    },
                    {
                      case: {
                        $and: [
                          { $gte: ['$effectivePrice', 1000000] },
                          { $lt: ['$effectivePrice', 2500000] },
                        ],
                      },
                      then: '₹10L-₹25L',
                    },
                    {
                      case: { $gte: ['$effectivePrice', 2500000] },
                      then: '₹25L+',
                    },
                  ],
                  default: {
                    $cond: [
                      { $and: ['$effectivePrice', { $gt: ['$effectivePrice', 0] }] },
                      'Below ₹50K',
                      'Unspecified',
                    ],
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: '$priceBucket',
              count: { $sum: 1 },
            },
          },
        ],
        topDestinations: [
          {
            $group: {
              _id: '$effectiveDestination',
              leads: { $sum: 1 },
              converted: { $sum: '$isConverted' },
            },
          },
          {
            $match: {
              _id: { $nin: [null, ''] },
            },
          },
          { $sort: { leads: -1 } },
          { $limit: 10 },
        ],
        topCountries: [
          {
            $group: {
              _id: '$effectiveOrigin',
              leads: { $sum: 1 },
              converted: { $sum: '$isConverted' },
            },
          },
          {
            $match: {
              _id: { $nin: [null, ''] },
            },
          },
          { $sort: { leads: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const detailed = detailedAggregation?.[0] || {};

  const categoryCounts = (detailed.categoryCounts || []).reduce((acc, item) => {
    const key = item?._id && CATEGORY_KEYS.includes(item._id) ? item._id : 'other';
    acc[key] = (acc[key] || 0) + (item.count || 0);
    return acc;
  }, {});

  const categoryDistribution = CATEGORY_KEYS.map((key) => ({
    category: key,
    name: CATEGORY_LABELS[key],
    value: categoryCounts[key] || 0,
  }));

  const priceCounts = (detailed.priceRanges || []).reduce((acc, item) => {
    if (item?._id) {
      acc[item._id] = item.count || 0;
    }
    return acc;
  }, {});

  const priceRangeDistribution = PRICE_BUCKETS.map((bucket) => ({
    range: bucket.label,
    value: priceCounts[bucket.key] || 0,
    key: bucket.key,
  }));

  const countrySet = new Set(COUNTRY_NAMES);
  const combinedCountryCounts = {};

  const accumulateCountryCounts = (countryName, leads = 0, converted = 0) => {
    if (!countryName) {
      return;
    }
    const normalized = normalizeString(countryName);
    if (!normalized || !countrySet.has(normalized)) {
      return;
    }
    if (!combinedCountryCounts[normalized]) {
      combinedCountryCounts[normalized] = {
        country: countryName
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' '),
        leads: 0,
        converted: 0,
      };
    }
    combinedCountryCounts[normalized].leads += leads || 0;
    combinedCountryCounts[normalized].converted += converted || 0;
  };

  const topDestinations = (detailed.topDestinations || [])
    .map((item) => {
      const raw = item?._id || '';
      const normalized = normalizeString(raw);
      if (!raw || !normalized) {
        return null;
      }

      if (countrySet.has(normalized)) {
        accumulateCountryCounts(raw, item?.leads || 0, item?.converted || 0);
        return null;
      }

      const parts = raw.split(',').map((part) => part.trim());
      if (parts.length > 1) {
        const lastPart = normalizeString(parts[parts.length - 1]);
        if (countrySet.has(lastPart)) {
          accumulateCountryCounts(parts[parts.length - 1], item?.leads || 0, item?.converted || 0);
          parts.pop();
        }
      }

      const cleanedDestination = parts.join(', ').trim();
      if (!cleanedDestination) {
        return null;
      }

      return {
        destination: cleanedDestination,
        leads: item?.leads || 0,
        conversion: item?.leads ? Math.round(((item.converted || 0) / item.leads) * 100) : 0,
      };
    })
    .filter(Boolean);

  (detailed.topCountries || []).forEach((item) => {
    accumulateCountryCounts(item?._id, item?.leads || 0, item?.converted || 0);
  });

  const topCountries = Object.values(combinedCountryCounts)
    .map((entry) => ({
      country: entry.country || 'Unknown',
      leads: entry.leads || 0,
      conversion: entry.leads ? Math.round((entry.converted / entry.leads) * 100) : 0,
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 10);

  return res.status(200).json({
    success: true,
    data: {
      timeRange,
      generatedAt: new Date().toISOString(),
      stats,
      trend: trendData,
      statusDistribution,
      categoryDistribution,
      priceRangeDistribution,
      topDestinations,
      topCountries,
    },
  });
});

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

/**
 * Get Package Analytics Overview
 * Returns comprehensive analytics for packages including trends, performance metrics
 */
/**
 * Get Package Analytics Overview
 * Returns comprehensive analytics for published packages including trends, performance metrics
 * Shows inquiries (leads with published packages) and conversions (lead conversions)
 */
export const getPackageAnalyticsOverview = asyncHandler(async (req, res) => {
  const { timeRange = 'monthly' } = req.query;

  try {
    // Get analytics overview from service
    const overview = await PackageAnalyticsService.getAnalyticsOverview({
      timeRange: timeRange || 'monthly',
    });

    // Get most inquired packages
    const mostInquired = await PackageAnalyticsService.getMostInquired(5);

    // Get destination performance with time range filter
    const destinationPerformance = await PackageAnalyticsService.getDestinationPerformance(100, timeRange);

    return res.status(200).json({
      success: true,
      data: {
        timeRange,
        generatedAt: new Date().toISOString(),
        stats: overview.stats,
        trend: overview.trend,
        mostInquired,
        destinationPerformance,
      },
    });
  } catch (error) {
    console.error('Package analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching package analytics',
      error: error.message,
    });
  }
});

/**
 * Get User Analytics Overview
 * Returns comprehensive user management analytics including growth trends, user distribution by role, and activity metrics
 * @route GET /api/v1/analytics/users/overview
 * @access Private/Admin
 * @query timeRange - 'daily', 'weekly', 'monthly', 'annual' (default: 'monthly')
 */
export const getUserAnalyticsOverview = asyncHandler(async (req, res) => {
  const User = (await import('../models/user.model.js')).default;
  const Booking = (await import('../models/booking.model.js')).default;
  
  const timeRange = clampTimeRange(req.query.timeRange);
  const buckets = buildTimeBuckets(timeRange);
  const startDate = buckets[0]?.start ? new Date(buckets[0].start) : new Date(0);

  const groupId = buildGroupId(timeRange);

  try {
    // 1. User Growth Trend
    const userGrowthAggregation = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: groupId,
          totalNewUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] },
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
          },
          vendorUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'vendor'] }, 1, 0] },
          },
          salesRepUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'salesRep'] }, 1, 0] },
          },
          customerUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
    ]);

    // Build trend data map
    const trendMap = new Map();
    userGrowthAggregation.forEach((item) => {
      const key = buildTrendKey(timeRange, item._id);
      trendMap.set(key, item);
    });

    // Fill in missing buckets
    const trendData = buckets.map((bucket) => {
      const key = buildBucketKey(timeRange, bucket);
      const data = trendMap.get(key) || {
        totalNewUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        adminUsers: 0,
        vendorUsers: 0,
        salesRepUsers: 0,
        customerUsers: 0,
      };
      return {
        label: bucket.label,
        ...data,
      };
    });

    // 2. Overall User Statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const inactiveUsers = totalUsers - activeUsers;

    // 3. Users by Role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const roleDistribution = usersByRole.map((item) => ({
      role: item._id || 'unassigned',
      count: item.count,
    }));

    // 4. Users with Bookings (Conversion)
    const usersWithBookings = await Booking.countDocuments();
    const conversionRate = totalUsers > 0 ? parseFloat(((usersWithBookings / totalUsers) * 100).toFixed(2)) : 0;

    // 5. Average Users Per Time Period
    const avgNewUsersPerPeriod = trendData.length > 0
      ? Math.round(trendData.reduce((sum, item) => sum + item.totalNewUsers, 0) / trendData.length)
      : 0;

    // 6. New Users This Period (Last item in trend data)
    const currentPeriod = trendData[trendData.length - 1] || {};
    const previousPeriod = trendData[trendData.length - 2] || {};

    const newUsersTrend = previousPeriod.totalNewUsers
      ? ((currentPeriod.totalNewUsers - previousPeriod.totalNewUsers) / previousPeriod.totalNewUsers * 100).toFixed(1)
      : 0;

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      usersWithBookings,
      conversionRate,
      avgNewUsersPerPeriod,
    };

    // 7. Top performing roles (by count)
    const topRoles = roleDistribution
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 8. User Status Distribution - Proper categorization
    // Website Users = All registered users in the system
    // Registered Users = Email verified users (actively engaged)
    // Converted Users = Users with bookings (made a purchase/booking)
    const userStatusDistribution = [
      { 
        name: 'Website Users', 
        value: totalUsers,
        description: 'All registered users in the system',
        color: '#3b82f6'
      },
      { 
        name: 'Registered Users', 
        value: verifiedUsers,
        description: 'Users with verified email',
        color: '#10b981'
      },
      { 
        name: 'Converted Users', 
        value: usersWithBookings,
        description: 'Users with bookings',
        color: '#f59e0b'
      },
    ];

    // Additional distribution for active/inactive status
    const statusDistribution = [
      { name: 'Active', value: activeUsers, status: 'active' },
      { name: 'Inactive', value: inactiveUsers, status: 'inactive' },
      { name: 'Verified', value: verifiedUsers, status: 'verified' },
      { name: 'Unverified', value: totalUsers - verifiedUsers, status: 'unverified' },
    ];

    return res.status(200).json({
      success: true,
      data: {
        timeRange,
        generatedAt: new Date().toISOString(),
        stats,
        trendData,
        roleDistribution,
        topRoles,
        statusDistribution,
        userStatusDistribution,
      },
    });
  } catch (error) {
    console.error('User analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user analytics',
      error: error.message,
    });
  }
});

/**
 * Get SalesRep Personal Performance Analytics
 * Returns personal performance metrics for the logged-in sales representative
 * @route GET /api/v1/analytics/salesreps/me/performance
 * @access Private/SalesRep
 * @query timeRange - 'daily', 'weekly', 'monthly', 'annual' (default: 'monthly')
 */
export const getSalesRepPersonalPerformance = asyncHandler(async (req, res) => {
  // Verify user is a sales rep
  if (req.user.role !== 'salesRep') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only accessible to sales representatives',
    });
  }

  const timeRange = clampTimeRange(req.query.timeRange);
  const buckets = buildTimeBuckets(timeRange);
  const startDate = buckets[0]?.start ? new Date(buckets[0].start) : new Date(0);
  const groupId = buildGroupId(timeRange);
  const salesRepId = req.user._id;

  try {
    // Get trend data for assigned leads
    const trendAggregation = await Lead.aggregate([
      {
        $match: {
          assignedTo: salesRepId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupId,
          total: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
          },
          contacted: {
            $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] },
          },
          interested: {
            $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] },
          },
          new: {
            $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
    ]);

    // Map trend data to time buckets
    const trendMap = new Map();
    trendAggregation.forEach((item) => {
      const key = buildTrendKey(timeRange, item._id);
      trendMap.set(key, item);
    });

    const trendData = buckets.map((bucket) => {
      const key = buildBucketKey(timeRange, bucket);
      const item = trendMap.get(key);
      const assigned = item?.total || 0;
      const converted = item?.converted || 0;
      const conversionRate = assigned > 0 ? Math.round((converted / assigned) * 100) : 0;

      return {
        label: bucket.label,
        assigned,
        converted,
        conversionRate,
        contacted: item?.contacted || 0,
        interested: item?.interested || 0,
      };
    });

    // Get overall statistics
    const allLeadsAggregation = await Lead.aggregate([
      { $match: { assignedTo: salesRepId } },
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: null,
                totalAssignedLeads: { $sum: 1 },
                totalConvertedLeads: {
                  $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
                },
              },
            },
          ],
          statusDistribution: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const detailed = allLeadsAggregation?.[0] || {};
    const statsData = detailed.stats?.[0] || { totalAssignedLeads: 0, totalConvertedLeads: 0 };
    const statusData = detailed.statusDistribution || [];

    const totalAssignedLeads = statsData.totalAssignedLeads || 0;
    const totalConvertedLeads = statsData.totalConvertedLeads || 0;
    const conversionRate = totalAssignedLeads > 0 
      ? parseFloat(((totalConvertedLeads / totalAssignedLeads) * 100).toFixed(2))
      : 0;

    // Calculate estimated earnings based on commission rate
    const commissionRate = req.user.commissionRate || 5;
    const estimatedEarnings = Math.round(totalConvertedLeads * (commissionRate * 1000));

    // Map status distribution
    const statusDistribution = statusData.map((item) => ({
      status: item._id || 'unknown',
      name: STATUS_LABELS[item._id] || item._id,
      count: item.count || 0,
    }));

    const stats = {
      totalAssignedLeads,
      totalConvertedLeads,
      conversionRate,
      estimatedEarnings,
      commissionRate,
    };

    return res.status(200).json({
      success: true,
      data: {
        timeRange,
        generatedAt: new Date().toISOString(),
        stats,
        trend: trendData,
        statusDistribution,
      },
    });
  } catch (error) {
    console.error('SalesRep performance analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching sales rep performance analytics',
      error: error.message,
    });
  }
});

/**
 * Get Website Analytics Overview
 * Returns comprehensive website analytics including lead trends, destination analysis
 * Shows actual lead inquiries (searches), bookings (conversions), and customer preferences
 * @route GET /api/v1/analytics/website/overview
 * @access Private/Admin
 * @query timeRange - 'daily', 'weekly', 'monthly', 'annual' (default: 'monthly')
 */
export const getWebsiteAnalyticsOverview = asyncHandler(async (req, res) => {
  const timeRange = clampTimeRange(req.query.timeRange);
  const buckets = buildTimeBuckets(timeRange);
  const startDate = buckets[0]?.start ? new Date(buckets[0].start) : new Date(0);

  const groupId = buildGroupId(timeRange);

  // Get lead trends (inquiries) and booking data
  const leadTrendAggregation = await Lead.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: groupId,
        searches: { $sum: 1 }, // Total leads created = searches/inquiries
        conversions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'converted'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
  ]);

  // Get booking data (actual conversions)
  const bookingTrendAggregation = await Booking.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: groupId,
        bookings: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.isoWeek': 1 } },
  ]);

  // Create trend maps
  const leadTrendMap = new Map();
  leadTrendAggregation.forEach((item) => {
    const key = buildTrendKey(timeRange, item._id);
    leadTrendMap.set(key, item);
  });

  const bookingTrendMap = new Map();
  bookingTrendAggregation.forEach((item) => {
    const key = buildTrendKey(timeRange, item._id);
    bookingTrendMap.set(key, item);
  });

  const trendData = buckets.map((bucket) => {
    const key = buildBucketKey(timeRange, bucket);
    const leadItem = leadTrendMap.get(key);
    const bookingItem = bookingTrendMap.get(key);

    return {
      label: bucket.label,
      searches: leadItem?.searches ?? 0,
      conversions: bookingItem?.bookings ?? 0,
    };
  });

  // Get destination analysis with package lookup
  const destinationAggregation = await Lead.aggregate([
    {
      $lookup: {
        from: 'packages',
        localField: 'package',
        foreignField: '_id',
        as: 'packageData',
      },
    },
    {
      $lookup: {
        from: 'customizedpackages',
        localField: 'customizedPackage',
        foreignField: '_id',
        as: 'customizedData',
      },
    },
    {
      $addFields: {
        effectiveDestination: {
          $ifNull: [
            '$destination',
            {
              $ifNull: [
                { $arrayElemAt: ['$customizedData.destination', 0] },
                { $arrayElemAt: ['$packageData.destination', 0] },
              ],
            },
          ],
        },
      },
    },
    { $match: { effectiveDestination: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$effectiveDestination',
        searches: { $sum: 1 },
        conversions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'converted'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { searches: -1 } },
    { $limit: 10 },
  ]);

  const topDestinations = destinationAggregation.map((item) => ({
    destination: item._id || 'Unknown',
    searches: item.searches,
    conversions: item.conversions,
    conversionRate: item.searches > 0 ? parseFloat(((item.conversions / item.searches) * 100).toFixed(1)) : 0,
  }));

  // Get accommodation types from itineraries
  const accommodationAggregation = await Itinerary.aggregate([
    { $unwind: '$days' },
    { $match: { 'days.accommodation.type': { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$days.accommodation.type',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const accommodationTypes = accommodationAggregation.map((item) => ({
    name: item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Other',
    value: item.count,
  }));

  // Get duration preferences
  const durationAggregation = await Lead.aggregate([
    { $match: { package: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'packages',
        localField: 'package',
        foreignField: '_id',
        as: 'packageData',
      },
    },
    { $unwind: '$packageData' },
    {
      $group: {
        _id: '$packageData.duration',
        searches: { $sum: 1 },
        bookings: {
          $sum: {
            $cond: [{ $eq: ['$status', 'converted'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const durationData = durationAggregation
    .map((item) => {
      let durationLabel = 'Unknown';
      if (item._id) {
        durationLabel = item._id <= 5 ? '3-5 Days' : item._id <= 7 ? '5-7 Days' : item._id <= 10 ? '7-10 Days' : item._id <= 14 ? '10-14 Days' : '14+ Days';
      }
      return {
        duration: durationLabel,
        searches: item.searches,
        bookings: item.bookings,
      };
    })
    .filter((item, index, arr) => arr.findIndex((x) => x.duration === item.duration) === index); // Remove duplicates by duration label

  // Get price range distribution
  const priceAggregation = await Lead.aggregate([
    {
      $lookup: {
        from: 'packages',
        localField: 'package',
        foreignField: '_id',
        as: 'packageData',
      },
    },
    {
      $lookup: {
        from: 'customizedpackages',
        localField: 'customizedPackage',
        foreignField: '_id',
        as: 'customizedData',
      },
    },
    {
      $addFields: {
        effectivePrice: {
          $cond: [
            { $and: [{ $arrayElemAt: ['$customizedData.price', 0] }, { $gt: [{ $arrayElemAt: ['$customizedData.price', 0] }, 0] }] },
            { $arrayElemAt: ['$customizedData.price', 0] },
            {
              $cond: [
                { $and: [{ $arrayElemAt: ['$packageData.price', 0] }, { $gt: [{ $arrayElemAt: ['$packageData.price', 0] }, 0] }] },
                { $arrayElemAt: ['$packageData.price', 0] },
                { $cond: [{ $and: ['$quoteAmount', { $gt: ['$quoteAmount', 0] }] }, '$quoteAmount', null] },
              ],
            },
          ],
        },
      },
    },
    { $match: { effectivePrice: { $exists: true, $ne: null } } },
    {
      $project: {
        priceBucket: {
          $switch: {
            branches: [
              { case: { $lt: ['$effectivePrice', 50000] }, then: 'Below ₹50K' },
              { case: { $lt: ['$effectivePrice', 200000] }, then: '₹50K-₹2L' },
              { case: { $lt: ['$effectivePrice', 500000] }, then: '₹2L-₹5L' },
              { case: { $lt: ['$effectivePrice', 1000000] }, then: '₹5L-₹10L' },
              { case: { $lt: ['$effectivePrice', 2500000] }, then: '₹10L-₹25L' },
            ],
            default: '₹25L+',
          },
        },
      },
    },
    {
      $group: {
        _id: '$priceBucket',
        searches: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const priceRanges = priceAggregation.map((item) => ({
    range: item._id,
    searches: item.searches,
  }));

  // Calculate overall stats
  const totalLeads = await Lead.countDocuments();
  const totalBookings = await Booking.countDocuments();
  const uniqueDestinations = await Lead.distinct('destination');
  const uniqueActivitiesData = await Itinerary.distinct('days.activities');
  const uniqueActivities = uniqueActivitiesData.filter((a) => a && a !== '').length;
  const convertedLeads = await Lead.countDocuments({ status: 'converted' });

  const stats = {
    totalSearches: totalLeads,
    totalBookings: totalBookings,
    uniqueDestinations: uniqueDestinations.filter((d) => d !== null && d !== undefined).length,
    uniqueActivities: uniqueActivities,
    conversionRate:
      totalLeads > 0
        ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(2))
        : 0,
  };

  return res.status(200).json({
    success: true,
    data: {
      timeRange,
      generatedAt: new Date().toISOString(),
      stats,
      trend: trendData,
      topDestinations,
      accommodationTypes,
      durationPreferences: durationData,
      priceRanges,
    },
  });
});


