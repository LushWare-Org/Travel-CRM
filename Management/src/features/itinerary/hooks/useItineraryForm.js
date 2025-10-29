/**
 * Custom hook for managing itinerary form data
 * Aligned with backend day-based structure
 */

import { useState, useCallback } from 'react';
import { generateDaysArray, formatDuration } from '../utils/helpers';

export const useItineraryForm = (initialFormData) => {
  const [formData, setFormData] = useState(initialFormData);
  const [showItinerary, setShowItinerary] = useState(false);
  const [isItinerarySubmitted, setIsItinerarySubmitted] = useState(false);

  const handleDurationChange = useCallback(
    (duration) => {
      const daysCount = parseInt(duration, 10) || 0;
      const newDays = generateDaysArray(daysCount, formData.days || []);

      setFormData((prev) => ({
        ...prev,
        duration: daysCount,
        days: newDays,
      }));
    },
    [formData.days]
  );

  const updateDay = useCallback(
    (dayNumber, dayData) => {
      setFormData((prev) => ({
        ...prev,
        days: prev.days.map((day) =>
          day.dayNumber === dayNumber ? { ...day, ...dayData } : day
        ),
      }));
    },
    []
  );

  const addDay = useCallback(() => {
    setFormData((prev) => {
      const newDayNumber = (prev.days?.length || 0) + 1;
      const { createDefaultDay } = require('../types/index.js');
      return {
        ...prev,
        duration: newDayNumber,
        days: [...(prev.days || []), createDefaultDay(newDayNumber)],
      };
    });
  }, []);

  const removeDay = useCallback(
    (dayNumber) => {
      setFormData((prev) => {
        const filteredDays = prev.days.filter((day) => day.dayNumber !== dayNumber);
        // Renumber remaining days
        const renumberedDays = filteredDays.map((day, index) => ({
          ...day,
          dayNumber: index + 1,
        }));
        return {
          ...prev,
          duration: renumberedDays.length,
          days: renumberedDays,
        };
      });
    },
    []
  );

  const resetItinerary = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      duration: 1,
      days: [],
    }));
    setShowItinerary(false);
    setIsItinerarySubmitted(false);
  }, []);

  return {
    formData,
    setFormData,
    showItinerary,
    setShowItinerary,
    isItinerarySubmitted,
    setIsItinerarySubmitted,
    handleDurationChange,
    updateDay,
    addDay,
    removeDay,
    resetItinerary,
  };
};
