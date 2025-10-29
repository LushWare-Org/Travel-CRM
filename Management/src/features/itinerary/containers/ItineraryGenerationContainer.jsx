/**
 * ItineraryGeneration Container Component
 * Main container that manages state and orchestrates all sub-components
 * Supports both API mode and local mode
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Swal from 'sweetalert2';

// Hooks
import { usePackageState, useItineraryForm, useImageUpload } from '../hooks';
import { usePackageStateWithAPI } from '../hooks/usePackageStateWithAPI';

// Components
import {
  PageHeader,
  SearchBar,
  PackageStats,
  PackagesGrid,
  PackageDetailsModal,
  PackageFormModal,
  NewEditPackageForm,
} from '../components';

// Services
import { generateAndDownloadPDF } from '../services/pdfService';
import { uploadImage } from '../services/imageService';

// Utils
import {
  filterPackages,
  calculatePackageStats,
  parseDurationToNights,
  validateItinerary,
} from '../utils/helpers';
import { VALIDATION_MESSAGES, CATEGORY_COLORS, STATUS_COLORS } from '../utils/constants';
import { createDefaultPackage } from '../types';

// Sample data
import { SAMPLE_PACKAGES } from './sampleData';

// Configuration
const USE_API = import.meta.env.VITE_USE_API === 'true' || false; // Set to true to use API

const ItineraryGenerationContainer = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editPackageData, setEditPackageData] = useState(null);

  // Use either API hook or local hook based on configuration
  const localHook = usePackageState(SAMPLE_PACKAGES);
  const apiHook = usePackageStateWithAPI(SAMPLE_PACKAGES);
  
  const {
    packages,
    setPackages,
    updatePackage,
    deletePackage,
    createPackage,
    duplicatePackage,
    downloadPDF,
    loading,
    error,
    fetchPackages,
  } = USE_API ? apiHook : { ...localHook, loading: false, error: null, fetchPackages: () => {}, createPackage: null, duplicatePackage: null, downloadPDF: null };

  // Fetch packages on mount if using API
  useEffect(() => {
    if (USE_API && fetchPackages) {
      fetchPackages();
    }
  }, [USE_API, fetchPackages]);
  const {
    formData: newFormData,
    setFormData: setNewFormData,
    nightsInput,
    setNightsInput,
    showItinerary,
    setShowItinerary,
    isItinerarySubmitted,
    setIsItinerarySubmitted,
    updateItinerarySection,
    updateItineraryTitle,
  } = useItineraryForm(createDefaultPackage());

  const {
    images,
    setImages,
    handleUpload: handleImageUploadHook,
    removeImage,
  } = useImageUpload();

  // Filter packages
  const filteredPackages = filterPackages(packages, searchTerm);
  const stats = calculatePackageStats(packages);

  // Handlers
  const handleNewPackageDialogOpen = () => {
    setNewFormData(createDefaultPackage());
    setNightsInput('');
    setShowItinerary(false);
    setIsItinerarySubmitted(false);
    setImages([]);
    setShowNewPackageDialog(true);
  };

  const handleViewPackage = (pkg) => {
    setSelectedPackage(pkg);
  };

  const handleEditPackage = (pkg) => {
    setEditPackageData({
      ...pkg,
      itinerary: { ...pkg.itinerary },
      itineraryTitles: { ...pkg.itineraryTitles },
      images: [...(pkg.images || [])],
    });
    setNightsInput(parseDurationToNights(pkg.duration) || '');
    setShowEditPackageDialog(true);
    setShowItinerary(true);
    setIsItinerarySubmitted(true);
    setImages(pkg.images || []);
  };

  const handleSaveNewPackage = async () => {
    try {
      if (USE_API && createPackage) {
        await createPackage(newFormData);
      } else {
        const newPackage = {
          ...newFormData,
          id: Math.max(...packages.map((p) => p.id || 0), 0) + 1,
          createdDate: new Date().toISOString().split('T')[0],
        };
        setPackages((prev) => [...prev, newPackage]);
      }
      setShowNewPackageDialog(false);
      Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_CREATED, 'success');
    } catch (err) {
      Swal.fire('Error', 'Failed to create package. Please try again.', 'error');
    }
  };

  const handleSaveEditPackage = async () => {
    try {
      if (USE_API) {
        await updatePackage(editPackageData.id, editPackageData);
      } else {
        updatePackage(editPackageData.id, editPackageData);
      }
      setShowEditPackageDialog(false);
      setEditPackageData(null);
      Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_UPDATED, 'success');
    } catch (err) {
      Swal.fire('Error', 'Failed to update package. Please try again.', 'error');
    }
  };

  const handleDownloadPackage = async (pkg) => {
    if (USE_API && downloadPDF) {
      try {
        await downloadPDF(pkg.id, pkg.name);
      } catch (err) {
        // Fall back to local PDF generation
        generateAndDownloadPDF(pkg);
      }
    } else {
      generateAndDownloadPDF(pkg);
    }
  };

  const handleDeletePackage = async (id) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;

    const result = await Swal.fire({
      title: `Delete ${pkg.name}?`,
      text: 'This will permanently remove the package.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e3342f',
    });

    if (result.isConfirmed) {
      try {
        if (USE_API) {
          await deletePackage(id);
        } else {
          deletePackage(id);
        }
        if (selectedPackage?.id === id) {
          setSelectedPackage(null);
        }
        Swal.fire('Deleted', `${pkg.name} ${VALIDATION_MESSAGES.PACKAGE_DELETED}`, 'success');
      } catch (err) {
        Swal.fire('Error', 'Failed to delete package. Please try again.', 'error');
      }
    }
  };

  const handleDuplicatePackage = async (pkg) => {
    const result = await Swal.fire({
      title: `Duplicate ${pkg.name}?`,
      text: 'This will create a copy of the package.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, duplicate it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3b82f6',
    });

    if (result.isConfirmed) {
      try {
        if (USE_API && duplicatePackage) {
          await duplicatePackage(pkg);
        } else {
          const duplicatedPackage = {
            ...pkg,
            id: Math.max(...packages.map((p) => p.id || 0), 0) + 1,
            name: `${pkg.name} (Copy)`,
            status: 'draft',
            createdDate: new Date().toISOString().split('T')[0],
            updatedDate: new Date().toISOString().split('T')[0],
            bookings: 0,
            rating: 0,
            reviews: 0,
          };
          setPackages((prev) => [...prev, duplicatedPackage]);
        }
        Swal.fire('Success', `${pkg.name} has been duplicated successfully.`, 'success');
      } catch (err) {
        Swal.fire('Error', 'Failed to duplicate package. Please try again.', 'error');
      }
    }
  };

  const handleImageUpload = async (files) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const tempUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, tempUrl]);

      try {
        const uploadedUrl = await uploadImage(file);
        setImages((prev) =>
          prev.map((url) => (url === tempUrl ? uploadedUrl : url))
        );
      } catch (error) {
        removeImage(images.indexOf(tempUrl));
        Swal.fire(
          'Error',
          VALIDATION_MESSAGES.IMAGE_UPLOAD_FAILED,
          'error'
        );
      }
    }
  };

  const handleImageRemove = (index) => {
    removeImage(index);
  };

  const handleItineraryChange = (e, section, dayKey) => {
    updateItinerarySection(section, dayKey, e.target.value);
  };

  const handleTitleChange = (e, section, dayKey) => {
    updateItineraryTitle(section, dayKey, e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-700">Loading...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader onNewPackage={handleNewPackageDialogOpen} />

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <PackageStats stats={stats} />
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Search */}
        <SearchBar value={searchTerm} onChange={setSearchTerm} />

        {/* Packages Grid */}
        <PackagesGrid
          packages={filteredPackages}
          onView={handleViewPackage}
          onEdit={handleEditPackage}
          onDownload={handleDownloadPackage}
          onDelete={handleDeletePackage}
          onDuplicate={handleDuplicatePackage}
        />

        {/* Package Details Modal */}
        <PackageDetailsModal
          pkg={selectedPackage}
          onClose={() => setSelectedPackage(null)}
        />

        {/* New Package Dialog */}
        <PackageFormModal
          isOpen={showNewPackageDialog}
          title="Create New Travel Package"
          subtitle="Build a new itinerary with destinations, activities, and pricing"
          onClose={() => setShowNewPackageDialog(false)}
        >
          <NewEditPackageForm
            formData={newFormData}
            setFormData={setNewFormData}
            onSave={() => handleSaveNewPackage(newFormData)}
            onCancel={() => setShowNewPackageDialog(false)}
            nightsInput={nightsInput}
            setNightsInput={setNightsInput}
            showItinerary={showItinerary}
            setShowItinerary={setShowItinerary}
            isItinerarySubmitted={isItinerarySubmitted}
            setIsItinerarySubmitted={setIsItinerarySubmitted}
            onItineraryChange={handleItineraryChange}
            onTitleChange={handleTitleChange}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
          />
        </PackageFormModal>

        {/* Edit Package Dialog */}
        <PackageFormModal
          isOpen={showEditPackageDialog}
          title="Edit Travel Package"
          subtitle="Update package details and itinerary"
          onClose={() => setShowEditPackageDialog(false)}
        >
          {editPackageData && (
            <NewEditPackageForm
              formData={editPackageData}
              setFormData={setEditPackageData}
              onSave={() => handleSaveEditPackage(editPackageData)}
              onCancel={() => setShowEditPackageDialog(false)}
              nightsInput={nightsInput}
              setNightsInput={setNightsInput}
              showItinerary={showItinerary}
              setShowItinerary={setShowItinerary}
              isItinerarySubmitted={isItinerarySubmitted}
              setIsItinerarySubmitted={setIsItinerarySubmitted}
              onItineraryChange={handleItineraryChange}
              onTitleChange={handleTitleChange}
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
            />
          )}
        </PackageFormModal>
      </div>
    </div>
  );
};

export default ItineraryGenerationContainer;
