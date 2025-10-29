/**
 * Custom hook for managing itinerary form data
 */

import { useState, useCallback } from 'react';
import {
  calculateMiddleDays,
  calculateMiddleDayTitles,
  formatDuration,
} from '../utils/helpers';

export const useItineraryForm = (initialFormData) => {
  const [formData, setFormData] = useState(initialFormData);
  const [nightsInput, setNightsInput] = useState('');
  const [showItinerary, setShowItinerary] = useState(false);
  const [isItinerarySubmitted, setIsItinerarySubmitted] = useState(false);

  const handleNightsChange = useCallback(
    (nights) => {
      setNightsInput(nights.toString());
      const middleDays = calculateMiddleDays(
        nights,
        formData.itinerary?.middle_days || {}
      );
      const middleTitles = calculateMiddleDayTitles(
        nights,
        formData.itineraryTitles?.middle_days || {}
      );

      setFormData((prev) => ({
        ...prev,
        duration: formatDuration(nights),
        itinerary: {
          ...prev.itinerary,
          middle_days: middleDays,
        },
        itineraryTitles: {
          ...prev.itineraryTitles,
          middle_days: middleTitles,
        },
      }));
    },
    [formData.itinerary?.middle_days, formData.itineraryTitles?.middle_days]
  );

  const updateItinerarySection = useCallback(
    (section, dayKey, value) => {
      if (section === 'middle_days' && dayKey) {
        setFormData((prev) => ({
          ...prev,
          itinerary: {
            ...prev.itinerary,
            middle_days: {
              ...prev.itinerary.middle_days,
              [dayKey]: value,
            },
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          itinerary: {
            ...prev.itinerary,
            [section]: value,
          },
        }));
      }
    },
    []
  );

  const updateItineraryTitle = useCallback(
    (section, dayKey, value) => {
      if (section === 'middle_days' && dayKey) {
        setFormData((prev) => ({
          ...prev,
          itineraryTitles: {
            ...prev.itineraryTitles,
            middle_days: {
              ...prev.itineraryTitles.middle_days,
              [dayKey]: value,
            },
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          itineraryTitles: {
            ...prev.itineraryTitles,
            [section]: value,
          },
        }));
      }
    },
    []
  );

  const resetItinerary = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      itinerary: { first_day: '', middle_days: {}, last_day: '' },
      itineraryTitles: { first_day: '', middle_days: {}, last_day: '' },
    }));
    setNightsInput('');
    setShowItinerary(false);
    setIsItinerarySubmitted(false);
  }, []);

  return {
    formData,
    setFormData,
    nightsInput,
    setNightsInput,
    showItinerary,
    setShowItinerary,
    isItinerarySubmitted,
    setIsItinerarySubmitted,
    handleNightsChange,
    updateItinerarySection,
    updateItineraryTitle,
    resetItinerary,
  };
};
