/**
 * ItineraryGeneration Container Component
 * Main container that manages state and orchestrates all sub-components
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import Swal from 'sweetalert2';

// Hooks
import { usePackageState, useItineraryForm, useImageUpload } from '../hooks';

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

const ItineraryGenerationContainer = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editPackageData, setEditPackageData] = useState(null);

  // Use custom hooks
  const { packages, setPackages, updatePackage, deletePackage } = usePackageState(
    SAMPLE_PACKAGES
  );
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

  const handleSaveNewPackage = (formData) => {
    const newPackage = {
      ...formData,
      id: Math.max(...packages.map((p) => p.id || 0), 0) + 1,
      createdDate: new Date().toISOString().split('T')[0],
    };
    setPackages((prev) => [...prev, newPackage]);
    setShowNewPackageDialog(false);
    Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_CREATED, 'success');
  };

  const handleSaveEditPackage = (formData) => {
    updatePackage(formData.id, formData);
    setShowEditPackageDialog(false);
    setEditPackageData(null);
    Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_UPDATED, 'success');
  };

  const handleDownloadPackage = (pkg) => {
    generateAndDownloadPDF(pkg);
  };

  const handleDeletePackage = (id) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;

    Swal.fire({
      title: `Delete ${pkg.name}?`,
      text: 'This will permanently remove the package.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e3342f',
    }).then((result) => {
      if (result.isConfirmed) {
        deletePackage(id);
        if (selectedPackage?.id === id) {
          setSelectedPackage(null);
        }
        Swal.fire('Deleted', `${pkg.name} ${VALIDATION_MESSAGES.PACKAGE_DELETED}`, 'success');
      }
    });
  };

  const handleDuplicatePackage = (pkg) => {
    Swal.fire({
      title: `Duplicate ${pkg.name}?`,
      text: 'This will create a copy of the package.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, duplicate it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3b82f6',
    }).then((result) => {
      if (result.isConfirmed) {
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
        Swal.fire('Success', `${pkg.name} has been duplicated successfully.`, 'success');
      }
    });
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
