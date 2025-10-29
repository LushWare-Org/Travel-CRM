/**
 * Custom hook for Package State with API Integration
 * Manages packages with backend synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import ApiService from '../services/apiService';
import { toBackendFormat, toFrontendFormat } from '../utils/dataAdapters';

export const usePackageStateWithAPI = (initialPackages = []) => {
  const [packages, setPackages] = useState(initialPackages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch packages from backend
   */
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.getPackages();
      const backendPackages = response.data || [];
      
      // Convert each package to frontend format
      const frontendPackages = await Promise.all(
        backendPackages.map(async (pkg) => {
          try {
            // Try to fetch itinerary for this package
            const itineraryResponse = await ApiService.getItineraryByPackage(pkg._id);
            return toFrontendFormat.package(pkg, itineraryResponse.data);
          } catch (err) {
            // No itinerary exists, that's okay
            return toFrontendFormat.package(pkg);
          }
        })
      );
      
      setPackages(frontendPackages);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
      setError(err.message);
      Swal.fire('Error', 'Failed to load packages. Using local data.', 'error');
      // Fall back to initial packages
      setPackages(initialPackages);
    } finally {
      setLoading(false);
    }
  }, [initialPackages]);

  /**
   * Create new package with itinerary
   */
  const createPackage = useCallback(async (packageData) => {
    setLoading(true);
    setError(null);

    try {
      // Convert to backend format
      const backendPackage = toBackendFormat.package(packageData);
      
      // Create package
      const packageResponse = await ApiService.createPackage(backendPackage);
      const createdPackage = packageResponse.data;

      // Create itinerary if package has itinerary data
      if (packageData.itinerary) {
        const backendItinerary = toBackendFormat.itinerary(packageData, createdPackage._id);
        await ApiService.createItinerary(backendItinerary);
      }

      // Fetch updated packages
      await fetchPackages();

      return createdPackage;
    } catch (err) {
      console.error('Failed to create package:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPackages]);

  /**
   * Update existing package and itinerary
   */
  const updatePackage = useCallback(async (id, packageData) => {
    setLoading(true);
    setError(null);

    try {
      // Convert to backend format
      const backendPackage = toBackendFormat.package(packageData);
      
      // Update package
      await ApiService.updatePackage(id, backendPackage);

      // Update or create itinerary
      try {
        const itineraryResponse = await ApiService.getItineraryByPackage(id);
        const itineraryId = itineraryResponse.data._id;
        
        // Update existing itinerary
        const backendItinerary = toBackendFormat.itinerary(packageData, id);
        await ApiService.updateItinerary(itineraryId, backendItinerary);
      } catch (err) {
        // Itinerary doesn't exist, create it
        if (packageData.itinerary) {
          const backendItinerary = toBackendFormat.itinerary(packageData, id);
          await ApiService.createItinerary(backendItinerary);
        }
      }

      // Fetch updated packages
      await fetchPackages();
    } catch (err) {
      console.error('Failed to update package:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPackages]);

  /**
   * Delete package and its itinerary
   */
  const deletePackage = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      // Try to get and delete itinerary first
      try {
        const itineraryResponse = await ApiService.getItineraryByPackage(id);
        await ApiService.deleteItinerary(itineraryResponse.data._id);
      } catch (err) {
        // No itinerary to delete, that's okay
      }

      // Delete package
      await ApiService.deletePackage(id);

      // Update local state
      setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
    } catch (err) {
      console.error('Failed to delete package:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Duplicate package
   */
  const duplicatePackage = useCallback(async (packageData) => {
    setLoading(true);
    setError(null);

    try {
      // Create new package with modified data
      const duplicatedData = {
        ...packageData,
        name: `${packageData.name} (Copy)`,
        status: 'draft',
        bookings: 0,
        rating: 0,
        reviews: 0,
      };

      await createPackage(duplicatedData);
    } catch (err) {
      console.error('Failed to duplicate package:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [createPackage]);

  /**
   * Download PDF
   */
  const downloadPDF = useCallback(async (packageId, packageName) => {
    setLoading(true);
    setError(null);

    try {
      // Get itinerary ID
      const itineraryResponse = await ApiService.getItineraryByPackage(packageId);
      const itineraryId = itineraryResponse.data._id;

      // Download PDF
      const blob = await ApiService.downloadItineraryPDF(itineraryId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packageName}_Itinerary.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      Swal.fire('Success', `Itinerary for ${packageName} downloaded successfully.`, 'success');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setError(err.message);
      Swal.fire('Error', 'Failed to download PDF. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    packages,
    setPackages,
    loading,
    error,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
    duplicatePackage,
    downloadPDF,
  };
};
