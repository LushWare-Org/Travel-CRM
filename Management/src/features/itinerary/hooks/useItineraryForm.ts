/**
 * Enhanced Itinerary Form Hook
 * Manages itinerary form state with backend integration
 * Includes proper error handling and async operations
 */

import { useState, useCallback } from 'react';
import ApiService from '../services/apiService';
import { createDefaultDay } from '../types/index';
import Swal from 'sweetalert2';

// NOTE: the backend-integration methods below (loadItinerary, saveItinerary,
// publishItinerary, saveDraft, deleteItinerary, downloadPDF, cloneToPackage)
// call ApiService.{getItineraryByPackage,updateItinerary,createItinerary,
// deleteItinerary,downloadItineraryPDF,cloneItinerary} — none of which exist
// on ApiService (see services/apiService.ts): itinerary days are persisted as
// part of the Package record (`itineraryDays`), not as a separate Itinerary
// entity with its own CRUD. This was already true before this migration
// (confirmed: the only real consumer, ItineraryGenerationContainer, destructures
// only `formData`/`setFormData` and never calls these methods) — flagged here
// rather than silently invented, since adding fake method stubs would hide
// that this code path has always been dead/would throw if ever exercised.
const LegacyApiService = ApiService as any;

export const useItineraryForm = (packageId?: string | null, initialData: any = null) => {
  // Validate packageId is a string
  const validPackageId = typeof packageId === 'string' ? packageId : null;

  // State management
  const [formData, setFormData] = useState<any>(initialData || {
    package: validPackageId,
    days: [],
    status: 'draft',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const response = await LegacyApiService.getItineraryByPackage(validPackageId);

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
    setFormData((prev: any) => {
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
  const removeDay = useCallback((dayNumber: number) => {
    setFormData((prev: any) => {
      const filteredDays = prev.days.filter((day: any) => day.dayNumber !== dayNumber);
      // Renumber remaining days
      const renumberedDays = filteredDays.map((day: any, index: number) => ({
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
  const updateDay = useCallback((dayNumber: number, dayData: any) => {
    setFormData((prev: any) => ({
      ...prev,
      days: prev.days.map((day: any) =>
        day.dayNumber === dayNumber ? { ...day, ...dayData } : day
      ),
    }));
    setUnsavedChanges(true);
  }, []);

  /**
   * Update itinerary status
   */
  const updateStatus = useCallback((status: string) => {
    setFormData((prev: any) => ({
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
        response = await LegacyApiService.updateItinerary(itineraryId, itineraryData);
      } else {
        // Create new
        response = await LegacyApiService.createItinerary(itineraryData);
        setItineraryId(response.data._id);
      }

      if (response.success) {
        setFormData(response.data);
        setUnsavedChanges(false);

        Swal.fire('Success', `Itinerary ${itineraryId ? 'updated' : 'created'} successfully`, 'success');
        return response.data;
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to save itinerary';
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
      const response = await LegacyApiService.deleteItinerary(itineraryId);

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
      Swal.fire('Error', (err as Error).message || 'Failed to delete itinerary', 'error');
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
      const blob = await LegacyApiService.downloadItineraryPDF(itineraryId);

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
      Swal.fire('Error', (err as Error).message || 'Failed to download PDF', 'error');
      console.error('Error downloading PDF:', err);
    } finally {
      setLoading(false);
    }
  }, [itineraryId]);

  /**
   * Clone to another package
   */
  const cloneToPackage = useCallback(async (targetPackageId: string) => {
    if (!itineraryId) {
      Swal.fire('Info', 'Save itinerary first before cloning', 'info');
      return;
    }

    try {
      setLoading(true);
      const response = await LegacyApiService.cloneItinerary(itineraryId, targetPackageId);

      if (response.success) {
        Swal.fire('Success', 'Itinerary cloned successfully', 'success');
        return response.data;
      }
    } catch (err) {
      Swal.fire('Error', (err as Error).message || 'Failed to clone itinerary', 'error');
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
