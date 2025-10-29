/**
 * Enhanced Itinerary Form Hook
 * Manages itinerary form state with backend integration
 * Includes proper error handling and async operations
 */

import { useState, useCallback, useEffect } from 'react';
import ApiService from '../services/apiService';
import { createDefaultDay } from '../types/index';
import Swal from 'sweetalert2';

export const useItineraryForm = (packageId, initialData = null) => {
  // Validate packageId is a string
  const validPackageId = typeof packageId === 'string' ? packageId : null;

  // State management
  const [formData, setFormData] = useState(initialData || {
    package: validPackageId,
    days: [],
    status: 'draft',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [itineraryId, setItineraryId] = useState(initialData?._id || null);
  const [hasLoaded, setHasLoaded] = useState(false);

  /**
   * Load itinerary from backend
   */
  const loadItinerary = useCallback(async () => {
    // Guard: Only load if packageId is valid and not already loaded
    if (!validPackageId || hasLoaded || initialData) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getItineraryByPackage(validPackageId);
      
      if (response.success && response.data) {
        setFormData(response.data);
        setItineraryId(response.data._id);
        setUnsavedChanges(false);
      }
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading itinerary:', err);
      // Itinerary doesn't exist yet, start with empty days
      setFormData({
        package: validPackageId,
        days: [],
        status: 'draft',
      });
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [validPackageId, hasLoaded, initialData]);

  /**
   * Add a new day
   */
  const addDay = useCallback(() => {
    setFormData((prev) => {
      const newDayNumber = (prev.days?.length || 0) + 1;
      return {
        ...prev,
        days: [...(prev.days || []), createDefaultDay(newDayNumber)],
      };
    });
    setUnsavedChanges(true);
  }, []);

  /**
   * Remove a day
   */
  const removeDay = useCallback((dayNumber) => {
    setFormData((prev) => {
      const filteredDays = prev.days.filter((day) => day.dayNumber !== dayNumber);
      // Renumber remaining days
      const renumberedDays = filteredDays.map((day, index) => ({
        ...day,
        dayNumber: index + 1,
      }));
      return {
        ...prev,
        days: renumberedDays,
      };
    });
    setUnsavedChanges(true);
  }, []);

  /**
   * Update a specific day
   */
  const updateDay = useCallback((dayNumber, dayData) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.dayNumber === dayNumber ? { ...day, ...dayData } : day
      ),
    }));
    setUnsavedChanges(true);
  }, []);

  /**
   * Update itinerary status
   */
  const updateStatus = useCallback((status) => {
    setFormData((prev) => ({
      ...prev,
      status,
    }));
    setUnsavedChanges(true);
  }, []);

  /**
   * Save itinerary to backend
   */
  const saveItinerary = useCallback(async (status = 'draft') => {
    try {
      setLoading(true);
      setError(null);

      // Validate days
      if (!formData.days || formData.days.length === 0) {
        throw new Error('Add at least one day to the itinerary');
      }

      // Validate each day has required fields
      for (const day of formData.days) {
        if (!day.title || !day.description) {
          throw new Error(`Day ${day.dayNumber} is missing title or description`);
        }
      }

      const itineraryData = {
        ...formData,
        status,
      };

      let response;
      if (itineraryId) {
        // Update existing
        response = await ApiService.updateItinerary(itineraryId, itineraryData);
      } else {
        // Create new
        response = await ApiService.createItinerary(itineraryData);
        setItineraryId(response.data._id);
      }

      if (response.success) {
        setFormData(response.data);
        setUnsavedChanges(false);
        
        Swal.fire('Success', `Itinerary ${itineraryId ? 'updated' : 'created'} successfully`, 'success');
        return response.data;
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to save itinerary';
      setError(errorMsg);
      Swal.fire('Error', errorMsg, 'error');
      console.error('Error saving itinerary:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [formData, itineraryId]);

  /**
   * Publish itinerary
   */
  const publishItinerary = useCallback(async () => {
    return saveItinerary('published');
  }, [saveItinerary]);

  /**
   * Save as draft
   */
  const saveDraft = useCallback(async () => {
    return saveItinerary('draft');
  }, [saveItinerary]);

  /**
   * Delete itinerary
   */
  const deleteItinerary = useCallback(async () => {
    if (!itineraryId) return;

    try {
      const result = await Swal.fire({
        title: 'Delete Itinerary?',
        text: 'This action cannot be undone',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Delete',
      });

      if (!result.isConfirmed) return;

      setLoading(true);
      const response = await ApiService.deleteItinerary(itineraryId);

      if (response.success) {
        Swal.fire('Deleted', 'Itinerary deleted successfully', 'success');
        setFormData({
          package: packageId,
          days: [],
          status: 'draft',
        });
        setItineraryId(null);
        setUnsavedChanges(false);
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to delete itinerary', 'error');
      console.error('Error deleting itinerary:', err);
    } finally {
      setLoading(false);
    }
  }, [itineraryId, packageId]);

  /**
   * Download PDF
   */
  const downloadPDF = useCallback(async () => {
    if (!itineraryId) {
      Swal.fire('Info', 'Save itinerary first before downloading', 'info');
      return;
    }

    try {
      setLoading(true);
      const blob = await ApiService.downloadItineraryPDF(itineraryId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `itinerary-${itineraryId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Swal.fire('Success', 'PDF downloaded successfully', 'success');
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to download PDF', 'error');
      console.error('Error downloading PDF:', err);
    } finally {
      setLoading(false);
    }
  }, [itineraryId]);

  /**
   * Clone to another package
   */
  const cloneToPackage = useCallback(async (targetPackageId) => {
    if (!itineraryId) {
      Swal.fire('Info', 'Save itinerary first before cloning', 'info');
      return;
    }

    try {
      setLoading(true);
      const response = await ApiService.cloneItinerary(itineraryId, targetPackageId);

      if (response.success) {
        Swal.fire('Success', 'Itinerary cloned successfully', 'success');
        return response.data;
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to clone itinerary', 'error');
      console.error('Error cloning itinerary:', err);
    } finally {
      setLoading(false);
    }
  }, [itineraryId]);

  /**
   * Reset form
   */
  const resetForm = useCallback(() => {
    setFormData({
      package: packageId,
      days: [],
      status: 'draft',
    });
    setItineraryId(null);
    setUnsavedChanges(false);
    setError(null);
  }, [packageId]);

  return {
    // State
    formData,
    loading,
    error,
    unsavedChanges,
    itineraryId,

    // Setters
    setFormData,
    setError,

    // Day operations
    addDay,
    removeDay,
    updateDay,
    updateStatus,

    // Backend operations
    loadItinerary,
    saveItinerary,
    publishItinerary,
    saveDraft,
    deleteItinerary,
    downloadPDF,
    cloneToPackage,
    resetForm,
  };
};
