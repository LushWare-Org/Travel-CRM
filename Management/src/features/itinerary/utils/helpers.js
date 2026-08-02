/**
 * Helper functions for itinerary calculations and transformations
 * Aligned with backend data structure
 */

import { createDefaultDay } from '../types/index.js';
import { formatCurrency } from '../../../utils/currency.js';

/**
 * Generate days array based on duration
 * @param {number} days - Number of days (duration)
 * @param {array} currentDays - Current days array
 * @returns {array} - New days array
 */
export const generateDaysArray = (days, currentDays = []) => {
  const daysCount = parseInt(days, 10) || 0;

  if (daysCount <= 0) return [];

  let newDays = [...currentDays];

  // Add new days if needed
  if (currentDays.length < daysCount) {
    for (let i = currentDays.length + 1; i <= daysCount; i++) {
      newDays.push(createDefaultDay(i));
    }
  }
  // Remove extra days if needed
  else if (currentDays.length > daysCount) {
    newDays = newDays.slice(0, daysCount);
  }

  return newDays;
};

/**
 * Format duration string from days count
 * @param {number} days - Number of days
 * @returns {number} - Number of nights (days - 1)
 */
export const formatDuration = (days) => {
  return parseInt(days, 10) || 1;
};

/**
 * Parse duration string to extract days
 * @param {string|number} duration - Duration value
 * @returns {number} - Number of days
 */
export const parseDurationToDays = (duration) => {
  if (typeof duration === 'number') return duration;
  const match = duration?.match(/(\d+)\s*Days?/);
  return match ? parseInt(match[1], 10) : 1;
};

/**
 * Validate itinerary data (days array)
 * @param {array} days - Days array
 * @returns {object} - Errors object
 */
export const validateItinerary = (days) => {
  const errors = {};

  if (!Array.isArray(days) || days.length === 0) {
    errors.days = 'At least one day is required in itinerary.';
    return errors;
  }

  days.forEach((day, index) => {
    if (!day.title) {
      errors[`day${day.dayNumber}_title`] = `Day ${day.dayNumber} title is required.`;
    }
    if (!day.description) {
      errors[`day${day.dayNumber}_description`] = `Day ${day.dayNumber} description is required.`;
    }
  });

  return errors;
};

// ═══════════════════════════════════════════════════════════════════
// Pricing normalization helpers — shared by the ItineraryEditor cost
// subsections and the Price Calculation breakdown so both always use the
// exact same numbers.
// ═══════════════════════════════════════════════════════════════════

const getLegacyMealBooleans = (day) => {
  const meals = day?.meals && typeof day.meals === 'object' ? day.meals : null;
  if (!meals) return null;
  return {
    breakfast: Boolean(meals.breakfast),
    lunch: Boolean(meals.lunch),
    dinner: Boolean(meals.dinner),
  };
};

/**
 * Resolve a day's meal counts. Explicit count fields (written by the Costs &
 * Pricing subsection) win; otherwise fall back to the legacy boolean toggles.
 */
export const getMealCounts = (day) => {
  const booleans = getLegacyMealBooleans(day);
  return {
    breakfastCount: day?.breakfastCount ?? (booleans ? (booleans.breakfast ? 1 : 0) : 0),
    lunchCount: day?.lunchCount ?? (booleans ? (booleans.lunch ? 1 : 0) : 0),
    dinnerCount: day?.dinnerCount ?? (booleans ? (booleans.dinner ? 1 : 0) : 0),
    mealPriceOverride:
      day?.mealPriceOverride == null || day.mealPriceOverride === ''
        ? null
        : Number(day.mealPriceOverride),
  };
};

/**
 * Resolve a day's activities into [{ name, defaultCost, costOverride }].
 * Editor activities are display-name strings (or objects); cost overrides and
 * catalog default costs live in `day.activityCosts` and `_relational.activities`.
 */
export const getDayActivities = (day) => {
  const raw = Array.isArray(day?.activities)
    ? day.activities
    : (typeof day.activities === 'string'
      ? day.activities.split(',').map((s) => s.trim()).filter(Boolean)
      : []);
  const relational = Array.isArray(day?._relational?.activities) ? day._relational.activities : [];
  const costMap = day?.activityCosts && typeof day.activityCosts === 'object' ? day.activityCosts : {};

  return raw.map((a) => {
    const isObj = a && typeof a === 'object';
    const name = isObj ? (a.name || a.activity?.name || '') : (a || '');
    const stored = relational.find(
      (row) =>
        (row.activity?.name || row.name) === name ||
        (isObj && a.activityId && row.activityId === a.activityId)
    );
    const fromMap = name ? costMap[name] : null;

    return {
      name,
      defaultCost: Number(
        fromMap?.defaultCost ??
        (isObj ? a.defaultCost ?? a.activity?.defaultCost : undefined) ??
        stored?.activity?.defaultCost ??
        0
      ),
      costOverride:
        fromMap?.costOverride != null && fromMap.costOverride !== ''
          ? Number(fromMap.costOverride)
          : (isObj && a.costOverride != null ? Number(a.costOverride) : null),
    };
  }).filter((a) => a.name);
};

/**
 * Resolve a day's transport rows (editor rows win over relational rows loaded
 * from the API). Each row keeps the pricingModel/unitCost/distanceKm fields.
 */
export const getDayTransports = (day) => {
  if (Array.isArray(day?.transports) && day.transports.length > 0) {
    return day.transports.map(normalizeTransportRow);
  }
  if (Array.isArray(day?._relational?.transports) && day._relational.transports.length > 0) {
    return day._relational.transports.map(normalizeTransportRow);
  }
  return [];
};

function normalizeTransportRow(t) {
  return {
    routeType: t.routeType || 'DAILY_ROUTING',
    transportMode: t.transportMode || 'CAR',
    pricingModel: t.pricingModel || 'PER_VEHICLE',
    unitCost: t.unitCost == null || t.unitCost === '' ? 0 : Number(t.unitCost),
    distanceKm: t.distanceKm == null || t.distanceKm === '' ? null : Number(t.distanceKm),
  };
}

/** Compute one transport row's cost using the pricing engine's PER_* rules. */
export const getTransportRowCost = (transport, groupSize = 1) => {
  const unitCost = transport.unitCost || 0;
  switch (transport.pricingModel) {
    case 'PER_KM':
      return unitCost * (transport.distanceKm || 0);
    case 'PER_PERSON':
      return unitCost * groupSize;
    case 'PER_VEHICLE':
    default:
      return unitCost;
  }
};

/** Total accommodation cost for one day (each day books one per-night stay). */
export const getAccommodationTotal = (day) => {
  const amount = Number(day?.accommodation?.totalAmount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

/**
 * Filter packages based on search term
 * @param {array} packages - Array of packages
 * @param {string} searchTerm - Search term
 * @returns {array} - Filtered packages
 */
export const filterPackages = (packages, searchTerm) => {
  if (!searchTerm.trim()) return packages;

  const term = searchTerm.toLowerCase();
  return packages.filter(
    (pkg) =>
      pkg.name?.toLowerCase().includes(term) ||
      pkg.destination?.toLowerCase().includes(term) ||
      pkg.category?.toLowerCase().includes(term)
  );
};

/**
 * Calculate package statistics
 * @param {array} packages - Array of packages
 * @returns {object} - Statistics object
 */
export const calculatePackageStats = (packages) => {
  return {
    total: packages.length,
    published: packages.filter((p) => p.status === 'published').length,
    draft: packages.filter((p) => p.status === 'draft').length,
    archived: packages.filter((p) => p.status === 'archived').length,
    totalBookings: packages.reduce((sum, p) => sum + (p.bookings || 0), 0),
    avgRating: packages.length > 0
      ? (packages.reduce((sum, p) => sum + (p.rating || 0), 0) / packages.length).toFixed(1)
      : 0,
  };
};

/**
 * Format price value into Indian Rupees currency
 * @param {number|string} value - Price value to format
 * @returns {string} - Formatted currency string or empty string
 */
export const formatPriceINR = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  let numericValue;

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    numericValue = cleaned ? Number(cleaned) : Number.NaN;
  }

  if (!Number.isFinite(numericValue)) {
    return typeof value === 'string' ? value : '';
  }

  // Determine decimal places based on value
  const hasDecimals = !Number.isInteger(numericValue);

  return formatCurrency(numericValue, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
  });
};
