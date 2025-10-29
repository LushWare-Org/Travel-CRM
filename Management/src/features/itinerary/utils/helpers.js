/**
 * Helper functions for itinerary calculations and transformations
 */

/**
 * Calculate middle days based on number of nights
 * @param {number} nights - Number of nights
 * @param {object} currentMiddle - Current middle days object
 * @returns {object} - New middle days configuration
 */
export const calculateMiddleDays = (nights, currentMiddle = {}) => {
  const desiredMiddleCount = Math.max(0, nights - 1);
  const currentMiddleKeys = Object.keys(currentMiddle)
    .map((key) => parseInt(key.split('_')[1], 10))
    .filter((num) => !isNaN(num));
  const currentMax = currentMiddleKeys.length > 0 ? Math.max(...currentMiddleKeys) : 0;

  let newMiddleDays = { ...currentMiddle };

  // Add new days
  if (desiredMiddleCount > currentMax) {
    for (let i = currentMax + 1; i <= desiredMiddleCount; i++) {
      const key = `day_${i}`;
      newMiddleDays[key] = '';
    }
  }
  // Remove extra days
  else if (desiredMiddleCount < currentMax) {
    for (let i = desiredMiddleCount + 1; i <= currentMax; i++) {
      const key = `day_${i}`;
      delete newMiddleDays[key];
    }
  }

  return newMiddleDays;
};

/**
 * Calculate middle day titles based on number of nights
 * @param {number} nights - Number of nights
 * @param {object} currentTitles - Current middle days titles object
 * @returns {object} - New middle days titles configuration
 */
export const calculateMiddleDayTitles = (nights, currentTitles = {}) => {
  const desiredMiddleCount = Math.max(0, nights - 1);
  const currentKeys = Object.keys(currentTitles)
    .map((key) => parseInt(key.split('_')[1], 10))
    .filter((num) => !isNaN(num));
  const currentMax = currentKeys.length > 0 ? Math.max(...currentKeys) : 0;

  let newTitles = { ...currentTitles };

  if (desiredMiddleCount > currentMax) {
    for (let i = currentMax + 1; i <= desiredMiddleCount; i++) {
      const key = `day_${i}`;
      newTitles[key] = `Day ${i} Title`;
    }
  } else if (desiredMiddleCount < currentMax) {
    for (let i = desiredMiddleCount + 1; i <= currentMax; i++) {
      const key = `day_${i}`;
      delete newTitles[key];
    }
  }

  return newTitles;
};

/**
 * Format duration string from nights count
 * @param {number} nights - Number of nights
 * @returns {string} - Formatted duration (e.g., "5 Days / 4 Nights")
 */
export const formatDuration = (nights) => {
  const days = parseInt(nights, 10) + 1;
  return `${days} Days / ${nights} Nights`;
};

/**
 * Parse duration string to extract nights
 * @param {string} duration - Duration string (e.g., "5 Days / 4 Nights")
 * @returns {number} - Number of nights
 */
export const parseDurationToNights = (duration) => {
  const match = duration.match(/(\d+)\s*Nights?/);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Sort middle days by day number
 * @param {object} middleDays - Middle days object
 * @returns {array} - Sorted array of day keys
 */
export const getSortedMiddleDayKeys = (middleDays = {}) => {
  return Object.keys(middleDays).sort(
    (a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10)
  );
};

/**
 * Validate itinerary data
 * @param {object} itinerary - Itinerary object
 * @returns {object} - Errors object
 */
export const validateItinerary = (itinerary) => {
  const errors = {};

  if (!itinerary.first_day) {
    errors.first_day = 'Arrival day itinerary is required.';
  }
  if (!itinerary.last_day) {
    errors.last_day = 'Departure day itinerary is required.';
  }

  Object.keys(itinerary.middle_days || {}).forEach((dayKey) => {
    if (!itinerary.middle_days[dayKey]) {
      errors[dayKey] = `Itinerary for ${dayKey} is required.`;
    }
  });

  return errors;
};

/**
 * Filter packages based on search term
 * @param {array} packages - Array of packages
 * @param {string} searchTerm - Search term
 * @returns {array} - Filtered packages
 */
export const filterPackages = (packages, searchTerm) => {
  return packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.region.toLowerCase().includes(searchTerm.toLowerCase())
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
