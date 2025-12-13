/**
 * ItineraryGeneration Container Component
 * Main container that manages state and orchestrates all sub-components
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Swal from 'sweetalert2';

// Hooks
import { usePackageState, useItineraryForm, useImageUpload } from '../hooks';
import { useAuth } from '../../../contexts/AuthContext';

// Components
import {
  PageHeader,
  SearchBar,
  PackageStats,
  PackagesGrid,
  PackageDetailsModal,
  PackageFormModal,
  NewEditPackageForm,
  PackagePDFPreviewDialog,
  AIPackageDialog,
} from '../components';
import Pagination from '../../user-management/components/Common/Pagination';

// Services
import { createPackagePdfBlob } from '../services/pdfService';
import { uploadPackageImages } from '../../../services/cloudinaryService';
import ApiService from '../services/apiService';

// Utils
import {
  filterPackages,
  parseDurationToDays,
  validateItinerary,
} from '../utils/helpers';
import { VALIDATION_MESSAGES, CATEGORY_COLORS, STATUS_COLORS } from '../utils/constants';
import { createDefaultPackage } from '../types';

// Sample data
import { SAMPLE_PACKAGES } from './sampleData';

const ItineraryGenerationContainer = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null); // null = all, 'draft', 'published', 'archived'
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editPackageData, setEditPackageData] = useState(null);
  const [showAIPackageDialog, setShowAIPackageDialog] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false); // Track upload state
  const [pdfPreviewData, setPdfPreviewData] = useState({
    isOpen: false,
    blob: null,
    fileName: '',
    packageData: null,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [itemsPerPage] = useState(12); // 12 items per page for better grid layout (3 columns x 4 rows)
  
  // Stats state - fetch from API instead of calculating from local packages
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    totalBookings: 0,
    avgRating: 0,
  });

  // Check if user is a salesRep (read-only access)
  const isSalesRep = user?.role === 'salesRep';

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

  // Filter packages by search term only (status filtering is done server-side)
  let filteredPackages = filterPackages(packages, searchTerm);

  /**
   * Load package stats from API
   */
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await ApiService.getPackageStats();
        if (response.success && response.data) {
          setStats(response.data);
          console.log('[Stats] Loaded from API:', response.data);
        }
      } catch (error) {
        console.error('Error loading package stats:', error);
      }
    };

    loadStats();
  }, [packages]); // Reload stats when packages change (after create/update/delete)

  /**
   * Load packages from API on component mount
   */
  useEffect(() => {
    const loadPackages = async (page = 1) => {
      try {
        // Build query params with pagination and status filter
        const params = { 
          page, 
          limit: itemsPerPage 
        };
        
        // Add status filter if selected
        if (statusFilter) {
          params.status = statusFilter;
        }
        
        // For salesReps, use the protected endpoint which will automatically filter published packages
        // For other roles, use the standard endpoint
        const response = isSalesRep 
          ? await ApiService.getPackagesProtected(params)
          : await ApiService.getPackages(params);
        
        if (response.success && Array.isArray(response.data)) {
          setPackages(response.data);
          
          // Store pagination metadata
          if (response.pagination) {
            setPagination(response.pagination);
            console.log('[Pagination] Loaded page', response.pagination.page, 'of', response.pagination.pages);
            console.log('[Pagination] Total packages:', response.pagination.total);
          }
        }
      } catch (error) {
        console.error('Error loading packages:', error);
        // Keep using sample data if API fails
      }
    };

    loadPackages(currentPage);
  }, [isSalesRep, currentPage, itemsPerPage, statusFilter]); // Added statusFilter to dependencies

  // Handlers
  const handleNewPackageDialogOpen = () => {
    // Prevent salesReps from creating new packages
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to create packages.', 'info');
      return;
    }
    
    setNewFormData(createDefaultPackage());
    setImages([]);
    setShowNewPackageDialog(true);
  };

  const handleAIPackageDialogOpen = () => {
    // Prevent salesReps from creating new packages
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to create packages.', 'info');
      return;
    }
    
    setShowAIPackageDialog(true);
  };

  const handleAIPackageGenerated = (generatedPackageData) => {
    // Populate the form with AI-generated data
    setNewFormData({
      ...createDefaultPackage(),
      ...generatedPackageData,
      status: 'draft', // Ensure it's saved as draft
      price: 0, // Leave price empty for manual entry
      images: [], // Leave images empty for manual upload
    });
    
    // Close AI dialog and open the package form for editing
    setShowAIPackageDialog(false);
    setShowNewPackageDialog(true);
  };

  const handleViewPackage = (pkg) => {
    setSelectedPackage(pkg);
  };

  const handleEditPackage = (pkg) => {
    // Prevent salesReps from editing packages
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to edit packages.', 'info');
      return;
    }

    console.log('[DEBUG] Edit package clicked. Package object:', pkg);
    console.log('[DEBUG] Package _id:', pkg._id, 'Package id:', pkg.id);
    console.log('[DEBUG] Package images:', pkg.images);
    
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
    
    console.log('[DEBUG] Edit data prepared:', editData);
    console.log('[DEBUG] Formatted images:', formattedImages);
    
    setEditPackageData(editData);
    setShowEditPackageDialog(true);
    setImages(formattedImages); // Use formatted images, not raw pkg.images
  };

  const handleSaveNewPackage = async (formData) => {
    try {
      // Debug: Log incoming status
      console.log('[Container] handleSaveNewPackage called');
      console.log('[Container] formData.status:', formData.status);
      
      // Prevent saving while images are uploading
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      // Filter out any temporary images (safety check)
      const validImages = images.filter(img => !img.isTemp && img.url && img.public_id);
      
      console.log('[DEBUG] handleSaveNewPackage - All images:', images);
      console.log('[DEBUG] handleSaveNewPackage - Valid images:', validImages);

      // Validate field lengths only (no required fields)
      const validationErrors = [];

      if (formData.name && formData.name.trim().length > 100) {
        validationErrors.push('Package Name must not exceed 100 characters');
      }

      if (formData.destination && formData.destination.trim().length > 100) {
        validationErrors.push('Destination must not exceed 100 characters');
      }

      if (formData.description && formData.description.trim().length > 2000) {
        validationErrors.push('Description must not exceed 2000 characters');
      }

      if (formData.price && parseFloat(formData.price) < 0) {
        validationErrors.push('Price must be a non-negative number');
      }

      if (formData.duration && parseInt(formData.duration, 10) < 0) {
        validationErrors.push('Duration must be a non-negative number');
      }

      if (validationErrors.length > 0) {
        const message = `Please fix the following errors:\n${validationErrors.map(f => `• ${f}`).join('\n')}`;
        Swal.fire('Validation Errors', message, 'error');
        return;
      }

      // Clean up days data - remove invalid enum values and incomplete days
      const cleanDays = (formData.days || [])
        .filter(day => day && (day.title || day.dayNumber)) // Include days with title or dayNumber
        .map(day => {
          const cleanDay = { ...day };
          
          // Ensure dayNumber exists
          if (!cleanDay.dayNumber && cleanDay.title) {
            // Try to extract day number from title, or use index
            const dayMatch = cleanDay.title.match(/day\s*(\d+)/i);
            cleanDay.dayNumber = dayMatch ? parseInt(dayMatch[1], 10) : 1;
          }
          
          // Ensure title exists
          if (!cleanDay.title && cleanDay.dayNumber) {
            cleanDay.title = `Day ${cleanDay.dayNumber}`;
          }
          
          // Ensure description exists (can be empty string)
          if (cleanDay.description === undefined || cleanDay.description === null) {
            cleanDay.description = '';
          }
          
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

      // Map category to valid backend enum values
      const categoryMap = {
        'adventure': 'family',
        'budget': 'family',
        'luxury': 'family',
        'religious': 'family',
        'wildlife': 'wild safari',
        'beach': 'family',
        'heritage': 'family',
        'other': 'family',
        'honeymoon': 'honeymoon',
        'couple': 'couple',
        'family': 'family',
        'group': 'group',
        'wild safari': 'wild safari',
      };
      const validCategory = categoryMap[formData.category?.toLowerCase()] || 'family';

      // Ensure numeric fields are numbers and remove _id for new packages
      const sanitizedData = {
        ...formData,
        category: validCategory, // Use mapped category
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration, 10) || 1,
        maxGroupSize: parseInt(formData.maxGroupSize, 10) || 10,
        days: cleanDays, // Use cleaned days
        images: validImages, // Use only valid images (no temp blobs)
        status: formData.status || 'draft', // Explicitly preserve status
      };

      // Remove _id field for new packages (should not be included in POST request)
      delete sanitizedData._id;
      delete sanitizedData.id;
      delete sanitizedData._v;
      delete sanitizedData.__v;

      console.log('[DEBUG] ==> SAVING PACKAGE <==');
      console.log('[DEBUG] Status:', sanitizedData.status);
      console.log('[DEBUG] Valid images to save:', validImages);
      console.log('[DEBUG] Images count:', validImages?.length);
      console.log('[DEBUG] First image:', validImages?.[0]);
      console.log('[DEBUG] Sanitized data images:', sanitizedData.images);
      console.log('[DEBUG] Days to save:', cleanDays);
      console.log('[DEBUG] Days count:', cleanDays?.length);

      // Call API to save package
      const response = await ApiService.createPackage(sanitizedData);

      if (response.success) {
        // Add newly created package to the top of the list
        setPackages((prev) => [response.data, ...prev]);
        setShowNewPackageDialog(false);
        setNewFormData(createDefaultPackage());
        setImages([]);
        setCurrentPage(1); // Reset to first page to see the new package
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
      // Debug: Log incoming status
      console.log('[Container] handleSaveEditPackage called');
      console.log('[Container] formData.status:', formData.status);
      
      // Prevent saving while images are uploading
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      // Filter out any temporary images (safety check)
      const validImages = images.filter(img => !img.isTemp && img.url && img.public_id);
      
      console.log('[DEBUG] handleSaveEditPackage - All images:', images);
      console.log('[DEBUG] handleSaveEditPackage - Valid images:', validImages);

      console.log('[DEBUG] handleSaveEditPackage called');
      console.log('[DEBUG] formData received:', formData);
      console.log('[DEBUG] formData._id:', formData._id, 'formData.id:', formData.id);
      
      // Validate field lengths only (no required fields)
      const validationErrors = [];

      if (formData.name && formData.name.trim().length > 100) {
        validationErrors.push('Package Name must not exceed 100 characters');
      }

      if (formData.destination && formData.destination.trim().length > 100) {
        validationErrors.push('Destination must not exceed 100 characters');
      }

      if (formData.description && formData.description.trim().length > 2000) {
        validationErrors.push('Description must not exceed 2000 characters');
      }

      if (formData.price && parseFloat(formData.price) < 0) {
        validationErrors.push('Price must be a non-negative number');
      }

      if (formData.duration && parseInt(formData.duration, 10) < 0) {
        validationErrors.push('Duration must be a non-negative number');
      }

      if (validationErrors.length > 0) {
        const message = `Please fix the following errors:\n${validationErrors.map(f => `• ${f}`).join('\n')}`;
        Swal.fire('Validation Errors', message, 'error');
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
        .filter(day => day && (day.title || day.dayNumber)) // Include days with title or dayNumber
        .map(day => {
          const cleanDay = { ...day };
          
          // Ensure dayNumber exists
          if (!cleanDay.dayNumber && cleanDay.title) {
            // Try to extract day number from title, or use index
            const dayMatch = cleanDay.title.match(/day\s*(\d+)/i);
            cleanDay.dayNumber = dayMatch ? parseInt(dayMatch[1], 10) : 1;
          }
          
          // Ensure title exists
          if (!cleanDay.title && cleanDay.dayNumber) {
            cleanDay.title = `Day ${cleanDay.dayNumber}`;
          }
          
          // Ensure description exists (can be empty string)
          if (cleanDay.description === undefined || cleanDay.description === null) {
            cleanDay.description = '';
          }
          
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
      
      // Map category to valid backend enum values
      const categoryMap = {
        'adventure': 'family',
        'budget': 'family',
        'luxury': 'family',
        'religious': 'family',
        'wildlife': 'wild safari',
        'beach': 'family',
        'heritage': 'family',
        'other': 'family',
        'honeymoon': 'honeymoon',
        'couple': 'couple',
        'family': 'family',
        'group': 'group',
        'wild safari': 'wild safari',
      };
      const validCategory = categoryMap[formData.category?.toLowerCase()] || 'family';

      // Sanitize data - ensure numeric fields are numbers
      const sanitizedData = {
        ...formData,
        category: validCategory, // Use mapped category
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration, 10) || 1,
        maxGroupSize: parseInt(formData.maxGroupSize, 10) || 1,
        days: cleanDays, // Use cleaned days
        images: validImages, // Use only valid images (no temp blobs)
        status: formData.status || 'draft', // Explicitly preserve status
      };

      // Remove internal fields that should not be updated
      delete sanitizedData._id;
      delete sanitizedData._v;
      delete sanitizedData.__v;
      delete sanitizedData.createdAt;
      delete sanitizedData.createdBy;
      delete sanitizedData.slug; // Let backend regenerate if needed

      console.log('[DEBUG] ==> UPDATING PACKAGE <==');
      console.log('[DEBUG] Status:', sanitizedData.status);
      console.log('[DEBUG] Valid images to save:', validImages);
      console.log('[DEBUG] Images count:', validImages?.length);
      console.log('[DEBUG] Sanitized data images:', sanitizedData.images);
      
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

  const handleDownloadPackage = async (pkg) => {
    try {
      setPdfPreviewData({
        isOpen: true,
        blob: null,
        fileName: '',
        packageData: pkg,
      });
      setIsGeneratingPdf(true);

      const { blob, fileName, packageData } = await createPackagePdfBlob(pkg, {
        fetchLatest: true,
      });

      setPdfPreviewData({
        isOpen: true,
        blob,
        fileName,
        packageData,
      });
    } catch (error) {
      console.error('Error generating package PDF:', error);
      setPdfPreviewData({
        isOpen: false,
        blob: null,
        fileName: '',
        packageData: null,
      });
      Swal.fire('Error', 'Failed to generate PDF preview. Please try again.', 'error');
    } finally {
      setIsGeneratingPdf(false);
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
    // Prevent salesReps from duplicating packages
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to duplicate packages.', 'info');
      return;
    }

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
            setPackages((prev) => [response.data, ...prev]);
            setCurrentPage(1); // Reset to first page to see the duplicated package
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
      console.log('[DEBUG] Starting upload for', fileArray.length, 'files');
      
      // Upload all images to Cloudinary - now returns full image objects
      const uploadedImages = await uploadPackageImages(files, (progress) => {
        console.log(`Upload progress: ${progress.current}/${progress.total}`);
      });

      console.log('[DEBUG] Uploaded images from Cloudinary:', uploadedImages);

      // Replace temporary image objects with actual Cloudinary image objects
      setImages((prev) => {
        // Filter out ALL temp images first
        const withoutTemp = prev.filter(img => !img.isTemp);
        // Add all uploaded images
        const finalImages = [...withoutTemp, ...uploadedImages];
        console.log('[DEBUG] Final images state after upload:', finalImages);
        return finalImages;
      });
      
      // Clean up temporary URLs
      tempImages.forEach(img => URL.revokeObjectURL(img.url));

      Swal.fire('Success', `${uploadedImages.length} image(s) uploaded successfully!`, 'success');
    } catch (error) {
      console.error('[DEBUG] Upload error:', error);
      console.error('[DEBUG] Error message:', error.message);
      console.error('[DEBUG] Error stack:', error.stack);
      
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

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top when changing pages
  };

  // Handle status filter change - reset to page 1 when filter changes
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  // Handle search change - reset to page 1 when searching
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader 
        onNewPackage={handleNewPackageDialogOpen}
        onAIPackage={handleAIPackageDialogOpen}
      />

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <PackageStats 
          stats={stats} 
          onFilterChange={handleStatusFilterChange}
          activeFilter={statusFilter}
        />
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Search */}
        <SearchBar value={searchTerm} onChange={handleSearchChange} />

        {/* Packages Grid */}
        <PackagesGrid
          packages={filteredPackages}
          onView={handleViewPackage}
          onEdit={handleEditPackage}
          onDownload={handleDownloadPackage}
          onDelete={handleDeletePackage}
          onDuplicate={handleDuplicatePackage}
        />

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={pagination.total}
          />
        )}

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

        {/* AI Package Generation Dialog */}
        <AIPackageDialog
          isOpen={showAIPackageDialog}
          onClose={() => setShowAIPackageDialog(false)}
          onPackageGenerated={handleAIPackageGenerated}
        />

        <PackagePDFPreviewDialog
          isOpen={pdfPreviewData.isOpen}
          onClose={() =>
            setPdfPreviewData({
              isOpen: false,
              blob: null,
              fileName: '',
              packageData: null,
            })
          }
          pdfBlob={pdfPreviewData.blob}
          fileName={pdfPreviewData.fileName}
          packageData={pdfPreviewData.packageData}
          isGenerating={!pdfPreviewData.blob && isGeneratingPdf}
        />
      </div>
    </div>
  );
};

export default ItineraryGenerationContainer;
