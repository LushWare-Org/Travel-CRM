/**
 * Analytics Utilities
 * Shared helper functions and constants for all analytics controllers
 */

export const CONSTANTS = {
  STATUS_LABELS: {
    new: 'New',
    contacted: 'Contacted',
    interested: 'Interested',
    quoted: 'Quoted',
    converted: 'Converted',
    lost: 'Lost',
    'not-interested': 'Not Interested',
  },

  TREND_STATUSES: ['new', 'contacted', 'interested', 'converted'],

  MONTH_NAMES: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  CATEGORY_LABELS: {
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
  },

  CATEGORY_KEYS: ['honeymoon', 'budget', 'luxury', 'adventure', 'wildlife', 'family', 'beach', 'heritage', 'religious', 'other'],

  PRICE_BUCKETS: [
    { key: 'Below ₹50K', label: 'Below ₹50K', min: 0, max: 50000 },
    { key: '₹50K-₹2L', label: '₹50K-₹2L', min: 50000, max: 200000 },
    { key: '₹2L-₹5L', label: '₹2L-₹5L', min: 200000, max: 500000 },
    { key: '₹5L-₹10L', label: '₹5L-₹10L', min: 500000, max: 1000000 },
    { key: '₹10L-₹25L', label: '₹10L-₹25L', min: 1000000, max: 2500000 },
    { key: '₹25L+', label: '₹25L+', min: 2500000, max: Number.MAX_SAFE_INTEGER },
    { key: 'Unspecified', label: 'Unspecified', min: null, max: null },
  ],

  PAYMENT_STATUS_LABELS: {
    unpaid: 'Unpaid',
    partial: 'Partially Paid',
    paid: 'Paid',
    overpaid: 'Overpaid',
    refunded: 'Refunded',
  },

  INVOICE_CATEGORY_LABELS: {
    accommodation: 'Accommodation',
    transportation: 'Transportation',
    activity: 'Activities',
    food: 'Food & Beverage',
    guide: 'Guide Services',
    insurance: 'Insurance',
    visa: 'Visa & Documentation',
    package: 'Packages',
    other: 'Other',
  },
};

/**
 * Validate and clamp time range to allowed values
 */
export const clampTimeRange = (range) => {
  const allowed = ['daily', 'weekly', 'monthly', 'annual'];
  if (!range || !allowed.includes(range)) {
    return 'monthly';
  }
  return range;
};

/**
 * Get ISO week information for a given date
 */
export const getISOWeek = (date) => {
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

/**
 * Build time buckets based on the selected time range
 * Returns an array of time periods for grouping analytics data
 */
export const buildTimeBuckets = (range) => {
  const { MONTH_NAMES } = CONSTANTS;
  const now = new Date();
  now.setHours(23, 59, 59, 999); // Set to end of today
  const buckets = [];

  if (range === 'daily') {
    // Last 7 days including today
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      buckets.push({
        label: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        start: new Date(date),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      });
    }
  } else if (range === 'weekly') {
    // Last 12 weeks including current week
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i * 7);
      const { week, year } = getISOWeek(date);
      const weekDate = new Date(date);
      const day = weekDate.getDay();
      const diff = weekDate.getDate() - day + (day === 0 ? -6 : 1);
      weekDate.setDate(diff);
      weekDate.setHours(0, 0, 0, 0);
      buckets.push({
        label: `W${week} ${String(year).slice(-2)}`,
        isoWeek: week,
        isoWeekYear: year,
        start: new Date(weekDate),
        end: new Date(weekDate.getFullYear(), weekDate.getMonth(), weekDate.getDate() + 7),
      });
    }
  } else if (range === 'annual') {
    // Last 5 years including current year
    for (let i = 4; i >= 0; i -= 1) {
      const year = now.getFullYear() - i;
      buckets.push({
        label: `${year}`,
        year,
        start: new Date(year, 0, 1),
        end: new Date(year + 1, 0, 1),
      });
    }
  } else {
    // monthly default - last 6 months including current month
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      });
    }
  }

  return buckets;
};

/**
 * Build MongoDB grouping ID based on time range
 */
export const buildGroupId = (range) => {
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

/**
 * Build trend key from aggregation ID for map lookups
 */
export const buildTrendKey = (range, id) => {
  if (range === 'daily') {
    return `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
  }
  if (range === 'weekly') {
    return `${id.isoWeekYear}-${String(id.isoWeek).padStart(2, '0')}`;
  }
  if (range === 'annual') {
    return `${id.year}`;
  }
  return `${id.year}-${String(id.month).padStart(2, '0')}`;
};

/**
 * Build bucket key for time period lookups
 */
export const buildBucketKey = (range, bucket) => {
  if (range === 'daily') {
    return `${bucket.year}-${String(bucket.month).padStart(2, '0')}-${String(bucket.day).padStart(2, '0')}`;
  }
  if (range === 'weekly') {
    return `${bucket.isoWeekYear}-${String(bucket.isoWeek).padStart(2, '0')}`;
  }
  if (range === 'annual') {
    return `${bucket.year}`;
  }
  return `${bucket.year}-${String(bucket.month).padStart(2, '0')}`;
};
