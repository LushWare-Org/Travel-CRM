/**
 * Helper functions for itinerary calculations and transformations
 * Aligned with backend data structure
 */

import { createDefaultDay } from '../types/index.js';

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
