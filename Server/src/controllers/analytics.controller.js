import Lead from '../models/lead.model.js';
import Invoice from '../models/invoice.model.js';
import User from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { COUNTRY_NAMES, normalizeString } from '../utils/countryUtils.js';

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

  const userTypeDistribution = [
    { name: 'Customers', value: totalActiveUsers },
    { name: 'Sales Reps', value: totalSalesReps },
    { name: 'Email Verified', value: totalEmailVerified },
  ];

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


