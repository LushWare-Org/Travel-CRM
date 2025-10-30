/**
 * ItineraryGeneration Container Component
 * Main container that manages state and orchestrates all sub-components
 */

import { useState, useEffect } from 'react';
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
import ApiService from '../services/apiService';

// Utils
import {
  filterPackages,
  calculatePackageStats,
  parseDurationToDays,
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

  /**
   * Load packages from API on component mount
   */
  useEffect(() => {
    const loadPackages = async () => {
      try {
        const response = await ApiService.getPackages();
        if (response.success && Array.isArray(response.data)) {
          setPackages(response.data);
        }
      } catch (error) {
        console.error('Error loading packages:', error);
        // Keep using sample data if API fails
      }
    };

    loadPackages();
  }, []);

  // Handlers
  const handleNewPackageDialogOpen = () => {
    setNewFormData(createDefaultPackage());
    setImages([]);
    setShowNewPackageDialog(true);
  };

  const handleViewPackage = (pkg) => {
    setSelectedPackage(pkg);
  };

  const handleEditPackage = (pkg) => {
    console.log('[DEBUG] Edit package clicked. Package object:', pkg);
    console.log('[DEBUG] Package _id:', pkg._id, 'Package id:', pkg.id);
    
    // Extract days from itinerary if present
    const days = pkg.days || pkg.itinerary?.days || [];
    
    const editData = {
      ...pkg,
      days: [...days],
      images: [...(pkg.images || [])],
    };
    
    console.log('[DEBUG] Edit data prepared:', editData);
    console.log('[DEBUG] Edit data _id:', editData._id, 'Edit data id:', editData.id);
    
    setEditPackageData(editData);
    setShowEditPackageDialog(true);
    setImages(pkg.images || []);
  };

  const handleSaveNewPackage = async (formData) => {
    try {
      // Validate required fields
      const requiredFields = {
        name: 'Package Name',
        category: 'Category',
        destination: 'Destination',
        description: 'Description'
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([key]) => !formData[key])
        .map(([, label]) => label);

      if (missingFields.length > 0) {
        const message = `Please fill in these required fields:\n${missingFields.map(f => `• ${f}`).join('\n')}`;
        Swal.fire('Missing Required Fields', message, 'error');
        return;
      }

      // Clean up days data - remove invalid enum values and incomplete days
      const cleanDays = (formData.days || [])
        .filter(day => day.title && day.description) // Only include days with required fields
        .map(day => {
          const cleanDay = { ...day };
          
          // Remove empty transport enum
          if (!cleanDay.transport || cleanDay.transport === '') {
            delete cleanDay.transport;
          }
          
          // Remove or fix accommodation with empty type
          if (cleanDay.accommodation) {
            if (!cleanDay.accommodation.type || cleanDay.accommodation.type === '') {
              delete cleanDay.accommodation.type;
            }
            // If accommodation object is now empty or only has empty values, remove it
            const hasValidData = Object.values(cleanDay.accommodation).some(v => v && v !== '');
            if (!hasValidData) {
              delete cleanDay.accommodation;
            }
          }
          
          return cleanDay;
        });

      // Ensure numeric fields are numbers
      const sanitizedData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration, 10) || 1,
        maxGroupSize: parseInt(formData.maxGroupSize, 10) || 10,
        days: cleanDays, // Use cleaned days
      };

      // Call API to save package
      const response = await ApiService.createPackage(sanitizedData);

      if (response.success) {
        // Update local state with the newly created package from API
        setPackages((prev) => [...prev, response.data]);
        setShowNewPackageDialog(false);
        setNewFormData(createDefaultPackage());
        setImages([]);
        Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_CREATED, 'success');
      } else {
        Swal.fire('Error', response.message || 'Failed to create package', 'error');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      
      // Show detailed validation errors if available
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        const errorList = error.errors
          .map((err) => `• ${err.param || err.field}: ${err.msg}`)
          .join('\n');
        
        console.log('%c=== VALIDATION ERRORS ===', 'color: red; font-weight: bold; font-size: 14px;');
        error.errors.forEach((err, idx) => {
          console.log(`%c❌ Error ${idx + 1}:`, 'color: red; font-weight: bold;');
          console.log('   Field:', err.param || err.field || 'unknown');
          console.log('   Message:', err.msg || err.message || 'No message');
          console.log('   Value received:', err.value);
          console.log('   Type:', typeof err.value);
          console.log('   Location:', err.location || 'body');
        });
        
        Swal.fire('Validation Error', `Please fix the following:\n\n${errorList}`, 'error');
      } else {
        Swal.fire('Error', error.message || 'Failed to save package to database', 'error');
      }
    }
  };

  const handleSaveEditPackage = async (formData) => {
    try {
      console.log('[DEBUG] handleSaveEditPackage called');
      console.log('[DEBUG] formData received:', formData);
      console.log('[DEBUG] formData._id:', formData._id, 'formData.id:', formData.id);
      
      // Validate required fields
      const requiredFields = {
        name: 'Package Name',
        category: 'Category',
        destination: 'Destination',
        description: 'Description'
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([key]) => !formData[key] || formData[key].toString().trim() === '')
        .map(([, label]) => label);

      if (missingFields.length > 0) {
        Swal.fire('Validation Error', `Please fill in: ${missingFields.join(', ')}`, 'error');
        return;
      }

      if (!formData._id && !formData.id) {
        console.error('[DEBUG] No ID found in formData!');
        Swal.fire('Error', 'Package ID is missing', 'error');
        return;
      }

      const packageId = formData._id || formData.id;
      console.log('[DEBUG] Using packageId:', packageId);
      
      // Clean up days data - remove invalid enum values and incomplete days
      const cleanDays = (formData.days || [])
        .filter(day => day.title && day.description) // Only include days with required fields
        .map(day => {
          const cleanDay = { ...day };
          
          // Remove empty transport enum
          if (!cleanDay.transport || cleanDay.transport === '') {
            delete cleanDay.transport;
          }
          
          // Remove or fix accommodation with empty type
          if (cleanDay.accommodation) {
            if (!cleanDay.accommodation.type || cleanDay.accommodation.type === '') {
              delete cleanDay.accommodation.type;
            }
            // If accommodation object is now empty or only has empty values, remove it
            const hasValidData = Object.values(cleanDay.accommodation).some(v => v && v !== '');
            if (!hasValidData) {
              delete cleanDay.accommodation;
            }
          }
          
          return cleanDay;
        });
      
      // Sanitize data - ensure numeric fields are numbers
      const sanitizedData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration, 10) || 1,
        maxGroupSize: parseInt(formData.maxGroupSize, 10) || 1,
        days: cleanDays, // Use cleaned days
      };
      
      const response = await ApiService.updatePackage(packageId, sanitizedData);

      if (response.success) {
        // Update local state
        updatePackage(packageId, response.data);
        setShowEditPackageDialog(false);
        setEditPackageData(null);
        Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_UPDATED, 'success');
      } else {
        Swal.fire('Error', response.message || 'Failed to update package', 'error');
      }
    } catch (error) {
      console.error('[Container] Error updating package:', error);
      Swal.fire('Error', error.message || 'Failed to update package', 'error');
    }
  };

  const handleDownloadPackage = (pkg) => {
    generateAndDownloadPDF(pkg);
  };

  const handleDeletePackage = (id) => {
    const pkg = packages.find((p) => p._id === id || p.id === id);
    if (!pkg) return;

    Swal.fire({
      title: `Delete ${pkg.name}?`,
      text: 'This will permanently remove the package.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e3342f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const packageId = pkg._id || pkg.id;
          const response = await ApiService.deletePackage(packageId);

          if (response.success) {
            deletePackage(packageId);
            if (selectedPackage?._id === packageId || selectedPackage?.id === packageId) {
              setSelectedPackage(null);
            }
            Swal.fire('Deleted', `${pkg.name} ${VALIDATION_MESSAGES.PACKAGE_DELETED}`, 'success');
          } else {
            Swal.fire('Error', response.message || 'Failed to delete package', 'error');
          }
        } catch (error) {
          console.error('Error deleting package:', error);
          Swal.fire('Error', error.message || 'Failed to delete package', 'error');
        }
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
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Remove MongoDB _id if present to create a new document
          const duplicateData = {
            ...pkg,
            name: `${pkg.name} (Copy)`,
            status: 'draft',
            bookings: 0,
            rating: 0,
            reviews: 0,
          };
          
          // Remove _id to let backend create a new one
          delete duplicateData._id;

          const response = await ApiService.createPackage(duplicateData);

          if (response.success) {
            setPackages((prev) => [...prev, response.data]);
            Swal.fire('Success', `${pkg.name} has been duplicated successfully.`, 'success');
          } else {
            Swal.fire('Error', response.message || 'Failed to duplicate package', 'error');
          }
        } catch (error) {
          console.error('Error duplicating package:', error);
          Swal.fire('Error', error.message || 'Failed to duplicate package', 'error');
        }
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
    // No longer needed with new structure
  };

  const handleTitleChange = (e, section, dayKey) => {
    // No longer needed with new structure
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
            onSave={(updatedData) => handleSaveNewPackage(updatedData || newFormData)}
            onCancel={() => setShowNewPackageDialog(false)}
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
              onSave={(updatedData) => handleSaveEditPackage(updatedData || editPackageData)}
              onCancel={() => setShowEditPackageDialog(false)}
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
