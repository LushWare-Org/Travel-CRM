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
import { uploadPackageImages } from '../../../services/cloudinaryService';
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
  const [isUploadingImages, setIsUploadingImages] = useState(false); // Track upload state

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
    // Extract days from itinerary if present
    const days = pkg.days || pkg.itinerary?.days || [];
    
    // Ensure images are properly formatted - no blob URLs for existing images
    const formattedImages = (pkg.images || []).map(img => {
      // If it's already an image object with url and public_id, keep it
      if (typeof img === 'object' && img.url) {
        return img;
      }
      // If it's a string URL, convert to object format
      if (typeof img === 'string') {
        return {
          url: img,
          public_id: img.split('/').pop()?.split('.')[0] || 'unknown',
        };
      }
      return img;
    });
    
    const editData = {
      ...pkg,
      days: [...days],
      images: [...formattedImages],
    };
    
    setEditPackageData(editData);
    setShowEditPackageDialog(true);
    setImages(formattedImages); // Use formatted images, not raw pkg.images
  };

  const handleSaveNewPackage = async (formData) => {
    try {
      // Prevent saving while images are uploading
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      // Filter out any temporary images (safety check)
      const validImages = images.filter(img => !img.isTemp && img.url && img.public_id);

      // Validate required fields with detailed checks
      const validationErrors = [];

      if (!formData.name || !formData.name.trim()) {
        validationErrors.push('Package Name is required');
      } else if (formData.name.trim().length < 3 || formData.name.trim().length > 100) {
        validationErrors.push('Package Name must be between 3 and 100 characters');
      }

      if (!formData.category || !formData.category.trim()) {
        validationErrors.push('Category is required');
      }

      if (!formData.destination || !formData.destination.trim()) {
        validationErrors.push('Destination is required');
      } else if (formData.destination.trim().length < 2 || formData.destination.trim().length > 100) {
        validationErrors.push('Destination must be between 2 and 100 characters');
      }

      if (!formData.description || !formData.description.trim()) {
        validationErrors.push('Description is required');
      } else if (formData.description.trim().length < 10) {
        validationErrors.push(`Description must be at least 10 characters (currently ${formData.description.trim().length} characters)`);
      } else if (formData.description.trim().length > 2000) {
        validationErrors.push('Description must not exceed 2000 characters');
      }

      if (!formData.price || parseFloat(formData.price) < 0) {
        validationErrors.push('Valid Price is required');
      }

      if (!formData.duration || parseInt(formData.duration, 10) < 1) {
        validationErrors.push('Duration must be at least 1 day');
      }

      if (validationErrors.length > 0) {
        const message = `Please fix the following errors:\n${validationErrors.map(f => `• ${f}`).join('\n')}`;
        Swal.fire('Validation Errors', message, 'error');
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

      // Ensure numeric fields are numbers and remove _id for new packages
      const sanitizedData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration, 10) || 1,
        maxGroupSize: parseInt(formData.maxGroupSize, 10) || 10,
        days: cleanDays, // Use cleaned days
        images: validImages, // Use only valid images (no temp blobs)
      };

      // Remove _id field for new packages (should not be included in POST request)
      delete sanitizedData._id;
      delete sanitizedData.id;
      delete sanitizedData._v;
      delete sanitizedData.__v;

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
      // Show detailed validation errors if available
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        const errorList = error.errors
          .map((err) => `• ${err.param || err.field}: ${err.msg}`)
          .join('\n');
        
        Swal.fire('Validation Error', `Please fix the following:\n\n${errorList}`, 'error');
      } else {
        Swal.fire('Error', error.message || 'Failed to save package to database', 'error');
      }
    }
  };

  const handleSaveEditPackage = async (formData) => {
    try {
      // Prevent saving while images are uploading
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      // Filter out any temporary images (safety check)
      const validImages = images.filter(img => !img.isTemp && img.url && img.public_id);

      // Validate required fields with detailed checks
      const validationErrors = [];

      if (!formData.name || !formData.name.trim()) {
        validationErrors.push('Package Name is required');
      } else if (formData.name.trim().length < 3 || formData.name.trim().length > 100) {
        validationErrors.push('Package Name must be between 3 and 100 characters');
      }

      if (!formData.category || !formData.category.trim()) {
        validationErrors.push('Category is required');
      }

      if (!formData.destination || !formData.destination.trim()) {
        validationErrors.push('Destination is required');
      } else if (formData.destination.trim().length < 2 || formData.destination.trim().length > 100) {
        validationErrors.push('Destination must be between 2 and 100 characters');
      }

      if (!formData.description || !formData.description.trim()) {
        validationErrors.push('Description is required');
      } else if (formData.description.trim().length < 10) {
        validationErrors.push(`Description must be at least 10 characters (currently ${formData.description.trim().length} characters)`);
      } else if (formData.description.trim().length > 2000) {
        validationErrors.push('Description must not exceed 2000 characters');
      }

      if (!formData.price || parseFloat(formData.price) < 0) {
        validationErrors.push('Valid Price is required');
      }

      if (!formData.duration || parseInt(formData.duration, 10) < 1) {
        validationErrors.push('Duration must be at least 1 day');
      }

      if (validationErrors.length > 0) {
        const message = `Please fix the following errors:\n${validationErrors.map(f => `• ${f}`).join('\n')}`;
        Swal.fire('Validation Errors', message, 'error');
        return;
      }

      if (!formData._id && !formData.id) {
        Swal.fire('Error', 'Package ID is missing', 'error');
        return;
      }

      const packageId = formData._id || formData.id;
      
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
        images: validImages, // Use only valid images (no temp blobs)
      };

      // Remove internal fields that should not be updated
      delete sanitizedData._id;
      delete sanitizedData._v;
      delete sanitizedData.__v;
      delete sanitizedData.createdAt;
      delete sanitizedData.createdBy;
      delete sanitizedData.slug; // Let backend regenerate if needed
      
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
      Swal.fire('Error', error.message || 'Failed to update package', 'error');
    }
  };

  const handleDownloadPackage = async (pkg) => {
    try {
      Swal.fire({
        title: 'Generating PDF',
        html: 'Please wait while we prepare your itinerary PDF...',
        allowOutsideClick: false,
        didOpen: async () => {
          Swal.showLoading();
          try {
            await generateAndDownloadPDF(pkg);
          } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.hideLoading();
            Swal.fire('Error', 'Failed to generate PDF. Please try again.', 'error');
          }
        }
      });
    } catch (error) {
      console.error('Error in handleDownloadPackage:', error);
      Swal.fire('Error', 'Failed to prepare PDF download', 'error');
    }
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
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Set uploading state to prevent saving during upload
    setIsUploadingImages(true);
    
    // Create temporary image objects for immediate feedback
    const tempImages = fileArray.map(file => ({
      url: URL.createObjectURL(file),
      public_id: 'temp-' + Date.now() + '-' + Math.random(),
      isTemp: true,
    }));
    setImages((prev) => [...prev, ...tempImages]);

    try {
      // Upload all images to Cloudinary - now returns full image objects
      const uploadedImages = await uploadPackageImages(files, (progress) => {
        // Progress tracking
      });

      // Replace temporary image objects with actual Cloudinary image objects
      setImages((prev) => {
        // Filter out ALL temp images first
        const withoutTemp = prev.filter(img => !img.isTemp);
        // Add all uploaded images
        const finalImages = [...withoutTemp, ...uploadedImages];
        return finalImages;
      });
      
      // Clean up temporary URLs
      tempImages.forEach(img => URL.revokeObjectURL(img.url));

      Swal.fire('Success', `${uploadedImages.length} image(s) uploaded successfully!`, 'success');
    } catch (error) {
      
      // Remove temporary images on error
      setImages((prev) => prev.filter(img => !img.isTemp));
      tempImages.forEach(img => URL.revokeObjectURL(img.url));
      
      // Show more specific error message
      let errorMessage = 'Failed to upload images';
      if (error.message.includes('500')) {
        errorMessage = 'Server error occurred. Please check if the server is running and Cloudinary credentials are configured.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Swal.fire(
        'Error',
        errorMessage,
        'error'
      );
    } finally {
      // Always reset uploading state
      setIsUploadingImages(false);
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
            images={images}
            isUploadingImages={isUploadingImages}
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
              images={images}
              isUploadingImages={isUploadingImages}
            />
          )}
        </PackageFormModal>
      </div>
    </div>
  );
};

export default ItineraryGenerationContainer;
