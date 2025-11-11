/**
 * Lead Analytics Controller
 * Handles analytics for lead management, status tracking, and lead-related metrics
 */

import Lead from '../models/lead.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { COUNTRY_NAMES, normalizeString } from '../utils/countryUtils.js';
import {
  CONSTANTS,
  clampTimeRange,
  buildTimeBuckets,
  buildGroupId,
  buildTrendKey,
  buildBucketKey,
} from '../utils/analyticsUtils.js';

const { STATUS_LABELS, TREND_STATUSES, CATEGORY_LABELS, CATEGORY_KEYS, PRICE_BUCKETS } = CONSTANTS;

/**
 * @desc    Get lead analytics overview with status distribution and trends
 * @route   GET /api/v1/analytics/leads/overview
 * @access  Private/Admin, SalesRep
 * @query   timeRange - 'daily', 'weekly', 'monthly', 'annual'
 */
export const getLeadAnalyticsOverview = asyncHandler(async (req, res) => {
  const timeRange = clampTimeRange(req.query.timeRange);
  const buckets = buildTimeBuckets(timeRange);
  const startDate = buckets[0]?.start ? new Date(buckets[0].start) : new Date(0);

  const groupId = buildGroupId(timeRange);

  // OPTIMIZATION 1: Get trend data and status counts in parallel
  const [trendAggregation, statusCounts, detailedAggregation] = await Promise.all([
    // Query 1: Trend data (fast - no lookups)
    Lead.aggregate([
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
    ]),

    // Query 2: Status counts (fast - no lookups)
    Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Query 3: Detailed analytics with optimized lookups
    Lead.aggregate([
      // OPTIMIZATION 2: Only do lookups if fields exist (reduce document processing)
      {
        $lookup: {
          from: 'customizedpackages',
          localField: 'customizedPackage',
          foreignField: '_id',
          as: 'customizedPackage',
          pipeline: [
            { $project: { category: 1, price: 1, destination: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: 'packages',
          localField: 'package',
          foreignField: '_id',
          as: 'package',
          pipeline: [
            { $project: { category: 1, price: 1, destination: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: 'manualitineraries',
          localField: '_id',
          foreignField: 'lead',
          as: 'manualItinerary',
          pipeline: [
            { $project: { days: 1 } },
            { $limit: 1 }, // Only get the first itinerary
          ],
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
          // OPTIMIZATION 3: Simplified price calculation
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
          // OPTIMIZATION 4: Simplified destination extraction
          effectiveDestination: {
            $ifNull: [
              '$destination',
              {
                $ifNull: [
                  '$customizedDoc.destination',
                  { $ifNull: ['$packageDoc.destination', ''] },
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
          // Category distribution
          categoryCounts: [
            {
              $group: {
                _id: '$leadCategory',
                count: { $sum: 1 },
              },
            },
          ],
          // Price ranges
          priceRanges: [
            {
              $project: {
                priceBucket: {
                  $switch: {
                    branches: [
                      { case: { $and: [{ $gte: ['$effectivePrice', 50000] }, { $lt: ['$effectivePrice', 200000] }] }, then: '₹50K-₹2L' },
                      { case: { $and: [{ $gte: ['$effectivePrice', 200000] }, { $lt: ['$effectivePrice', 500000] }] }, then: '₹2L-₹5L' },
                      { case: { $and: [{ $gte: ['$effectivePrice', 500000] }, { $lt: ['$effectivePrice', 1000000] }] }, then: '₹5L-₹10L' },
                      { case: { $and: [{ $gte: ['$effectivePrice', 1000000] }, { $lt: ['$effectivePrice', 2500000] }] }, then: '₹10L-₹25L' },
                      { case: { $gte: ['$effectivePrice', 2500000] }, then: '₹25L+' },
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
          // Top destinations
          topDestinations: [
            {
              $match: {
                effectiveDestination: { $nin: [null, ''] },
              },
            },
            {
              $group: {
                _id: '$effectiveDestination',
                leads: { $sum: 1 },
                converted: { $sum: '$isConverted' },
              },
            },
            { $sort: { leads: -1 } },
            { $limit: 10 },
          ],
          // Top countries
          topCountries: [
            {
              $match: {
                effectiveOrigin: { $nin: [null, ''] },
              },
            },
            {
              $group: {
                _id: '$effectiveOrigin',
                leads: { $sum: 1 },
                converted: { $sum: '$isConverted' },
              },
            },
            { $sort: { leads: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]),
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
