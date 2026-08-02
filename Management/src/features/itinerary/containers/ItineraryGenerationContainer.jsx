/**
 * ItineraryGeneration Container Component - Redesigned
 * Modern layout with left sidebar navigation and unique component structure
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import Swal from 'sweetalert2';
import {
  Package, Plus, Sparkles, Search, ChevronRight, MapPin,
  Calendar, Star, Users, Eye, Edit, Download, Copy, Trash2,
  Image as ImageIcon, Filter, Grid, List, LayoutGrid, BookOpen, Menu, X
} from 'lucide-react';

// Hooks
import { usePackageState, useItineraryForm, useImageUpload } from '../hooks';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermission } from '../../../contexts/PermissionContext';

// Components
import {
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
  formatPriceINR,
} from '../utils/helpers';
import { VALIDATION_MESSAGES, CATEGORY_COLORS, STATUS_COLORS } from '../utils/constants';
import { createDefaultPackage } from '../types';

// Sample data
import { SAMPLE_PACKAGES } from './sampleData';

const ItineraryGenerationContainer = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editPackageData, setEditPackageData] = useState(null);
  const [showAIPackageDialog, setShowAIPackageDialog] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState({
    isOpen: false,
    blob: null,
    fileName: '',
    packageData: null,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [itemsPerPage] = useState(12);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    featured: 0,
    avgRating: 0,
  });

  const isSalesRep = user?.role === 'salesRep';
  const canEditPackages = user?.role === 'superAdmin' || (user?.role === 'admin' && hasPermission('manage_packages'));

  // Use custom hooks
  const { packages, setPackages, updatePackage, deletePackage } = usePackageState(SAMPLE_PACKAGES);
  const { formData: newFormData, setFormData: setNewFormData } = useItineraryForm(createDefaultPackage());
  const { images, setImages, handleUpload: handleImageUploadHook, removeImage } = useImageUpload();

  // Filter packages
  let filteredPackages = filterPackages(packages, searchTerm);

  // Status filter tabs
  const statusTabs = [
    { id: null, label: 'All Packages', count: stats.total, gradient: 'from-slate-500 to-slate-600', color: 'slate' },
    { id: 'active', label: 'Active', count: stats.active, gradient: 'from-emerald-500 to-teal-600', color: 'emerald' },
    { id: 'featured', label: 'Featured', count: stats.featured, gradient: 'from-purple-500 to-pink-600', color: 'purple' },
  ];

  const visibleTabs = statusTabs;

  /**
   * Load package stats from API
   */
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await ApiService.getPackageStats();
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error loading package stats:', error);
      }
    };
    loadStats();
  }, [packages]);

  /**
   * Load packages from API
   */
  useEffect(() => {
    const loadPackages = async (page = 1) => {
      try {
        const params = { page, limit: itemsPerPage };
        if (statusFilter === 'active') params.isActive = true;
        if (statusFilter === 'featured') params.isFeatured = true;

        const response = isSalesRep
          ? await ApiService.getPackagesProtected(params)
          : await ApiService.getPackages(params);

        if (response.success && Array.isArray(response.data)) {
          setPackages(response.data);
          if (response.pagination) {
            setPagination(response.pagination);
          }
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      }
    };
    loadPackages(currentPage);
  }, [isSalesRep, currentPage, itemsPerPage, statusFilter]);

  // Handlers
  const handleNewPackageDialogOpen = () => {
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to create packages.', 'info');
      return;
    }
    setNewFormData(createDefaultPackage());
    setImages([]);
    setShowNewPackageDialog(true);
  };

  const handleAIPackageDialogOpen = () => {
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to create packages.', 'info');
      return;
    }
    setShowAIPackageDialog(true);
  };

  const handleAIPackageGenerated = (generatedPackageData) => {
    // /generate-ai already persists the package + itinerary in one shot, so this must
    // flow into the edit path (PUT, same id) rather than the new-package create path —
    // routing it through "New Package" would create a second, itinerary-less duplicate.
    setPackages((prev) => [generatedPackageData, ...prev]);

    const days = generatedPackageData.days || generatedPackageData.itinerary?.days || [];
    const formattedImages = (generatedPackageData.images || []).map(img => {
      if (typeof img === 'object' && img.url) return img;
      if (typeof img === 'string') {
        return { url: img, public_id: img.split('/').pop()?.split('.')[0] || 'unknown' };
      }
      return img;
    });

    setEditPackageData({ ...generatedPackageData, days: [...days], images: [...formattedImages] });
    setImages(formattedImages);
    setShowAIPackageDialog(false);
    setShowEditPackageDialog(true);
  };

  const handleViewPackage = async (pkg) => {
    try {
      const packageId = pkg._id || pkg.id;
      const response = await ApiService.getPackage(packageId);
      if (response.success && response.data) {
        setSelectedPackage(response.data);
      } else {
        setSelectedPackage(pkg);
      }
    } catch (error) {
      console.error('Error fetching package details:', error);
      setSelectedPackage(pkg);
    }
  };

  const handleEditPackage = async (pkg) => {
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to edit packages.', 'info');
      return;
    }

    try {
      const packageId = pkg._id || pkg.id;
      const response = await ApiService.getPackage(packageId);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch package details');
      }

      const fullPackage = response.data;

      // Map API relational itineraryDays → editor-friendly days
      const days = (fullPackage.itineraryDays || []).map(apiDay => ({
        dayNumber: apiDay.dayNumber,
        title: apiDay.title || '',
        description: apiDay.description || '',
        meals: {
          breakfast: apiDay.breakfastCount > 0,
          lunch: apiDay.lunchCount > 0,
          dinner: apiDay.dinnerCount > 0,
        },
        mealPriceOverride: apiDay.mealPriceOverride,
        locations: (apiDay.places || []).map(p => p.place?.name || p.customName).filter(Boolean),
        activities: (apiDay.activities || []).map(a => a.activity?.name || '').filter(Boolean),
        places: (apiDay.places || []).map(p => ({
          name: p.place?.name || p.customName || '',
          placeId: p.placeId,
        })),
        accommodation: null,
        _relational: {
          places: apiDay.places || [],
          activities: apiDay.activities || [],
          transports: apiDay.transports || [],
        },
        images: [],
        notes: '',
      }));

      const formattedImages = (fullPackage.images || []).map(img => {
        if (typeof img === 'object' && img.url) return img;
        if (typeof img === 'string') {
          return { url: img, public_id: img.split('/').pop()?.split('.')[0] || 'unknown' };
        }
        return img;
      });

      const editData = { ...fullPackage, days: [...days], images: [...formattedImages] };
      setEditPackageData(editData);
      setShowEditPackageDialog(true);
      setImages(formattedImages);
    } catch (error) {
      console.error('Failed to fetch package for editing:', error);
      Swal.fire('Error', 'Failed to load package details for editing. Please try again.', 'error');
    }
  };

  const handleSaveNewPackage = async (formData) => {
    try {
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      const validImages = images.filter(img => !img.isTemp && img.url && img.public_id);
      const validationErrors = [];

      if (formData.name && formData.name.trim().length > 100) validationErrors.push('Package Name must not exceed 100 characters');
      if (formData.destination && formData.destination.trim().length > 100) validationErrors.push('Destination must not exceed 100 characters');
      if (formData.description && formData.description.trim().length > 2000) validationErrors.push('Description must not exceed 2000 characters');
      if (formData.price && parseFloat(formData.price) < 0) validationErrors.push('Price must be a non-negative number');
      if (formData.duration && parseInt(formData.duration, 10) < 0) validationErrors.push('Duration must be a non-negative number');

      if (validationErrors.length > 0) {
        Swal.fire('Validation Errors', `Please fix the following errors:\n${validationErrors.map(f => `• ${f}`).join('\n')}`, 'error');
        return;
      }

      const cleanDays = (formData.days || []).filter(day => day && (day.title || day.dayNumber)).map(day => {
        const cleanDay = { ...day };
        if (!cleanDay.dayNumber && cleanDay.title) {
          const dayMatch = cleanDay.title.match(/day\s*(\d+)/i);
          cleanDay.dayNumber = dayMatch ? parseInt(dayMatch[1], 10) : 1;
        }
        if (!cleanDay.title && cleanDay.dayNumber) cleanDay.title = `Day ${cleanDay.dayNumber}`;
        if (cleanDay.description === undefined || cleanDay.description === null) cleanDay.description = '';
        if (cleanDay.accommodation) {
          if (!cleanDay.accommodation.type || cleanDay.accommodation.type === '') delete cleanDay.accommodation.type;
          const hasValidData = Object.values(cleanDay.accommodation).some(v => v && v !== '');
          if (!hasValidData) delete cleanDay.accommodation;
        }
        return cleanDay;
      });

      const sanitizedData = {
        ...formData,
        category: formData.category || 'FAMILY',
        basePrice: formData.basePrice ?? formData.price ?? 0,
        durationDays: formData.durationDays || formData.duration || 1,
        days: cleanDays,
        images: (validImages.length > 0 ? validImages : (formData.images || [])).map(img => ({ url: img.url, altText: img.altText })),
      };

      delete sanitizedData._id;
      delete sanitizedData.id;
      delete sanitizedData._v;
      delete sanitizedData.__v;

      const response = await ApiService.createPackage(sanitizedData);

      if (response.success) {
        setPackages((prev) => [response.data, ...prev]);
        setShowNewPackageDialog(false);
        setNewFormData(createDefaultPackage());
        setImages([]);
        setCurrentPage(1);
        Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_CREATED, 'success');
      } else {
        Swal.fire('Error', response.message || 'Failed to create package', 'error');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        const errorList = error.errors.map((err) => `• ${err.param || err.field}: ${err.msg}`).join('\n');
        Swal.fire('Validation Error', `Please fix the following:\n\n${errorList}`, 'error');
      } else {
        Swal.fire('Error', error.message || 'Failed to save package to database', 'error');
      }
    }
  };

  const handleSaveEditPackage = async (formData) => {
    try {
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      const validImages = images.filter(img => !img.isTemp && img.url && img.public_id);
      const validationErrors = [];

      if (formData.name && formData.name.trim().length > 100) validationErrors.push('Package Name must not exceed 100 characters');
      if (formData.destination && formData.destination.trim().length > 100) validationErrors.push('Destination must not exceed 100 characters');
      if (formData.description && formData.description.trim().length > 2000) validationErrors.push('Description must not exceed 2000 characters');
      if (formData.price && parseFloat(formData.price) < 0) validationErrors.push('Price must be a non-negative number');
      if (formData.duration && parseInt(formData.duration, 10) < 0) validationErrors.push('Duration must be a non-negative number');

      if (validationErrors.length > 0) {
        Swal.fire('Validation Errors', `Please fix the following errors:\n${validationErrors.map(f => `• ${f}`).join('\n')}`, 'error');
        return;
      }

      if (!formData._id && !formData.id) {
        Swal.fire('Error', 'Package ID is missing', 'error');
        return;
      }

      const packageId = formData._id || formData.id;

      const cleanDays = (formData.days || []).filter(day => day && (day.title || day.dayNumber)).map(day => {
        const cleanDay = { ...day };
        if (!cleanDay.dayNumber && cleanDay.title) {
          const dayMatch = cleanDay.title.match(/day\s*(\d+)/i);
          cleanDay.dayNumber = dayMatch ? parseInt(dayMatch[1], 10) : 1;
        }
        if (!cleanDay.title && cleanDay.dayNumber) cleanDay.title = `Day ${cleanDay.dayNumber}`;
        if (cleanDay.description === undefined || cleanDay.description === null) cleanDay.description = '';
        if (cleanDay.accommodation) {
          if (!cleanDay.accommodation.type || cleanDay.accommodation.type === '') delete cleanDay.accommodation.type;
          const hasValidData = Object.values(cleanDay.accommodation).some(v => v && v !== '');
          if (!hasValidData) delete cleanDay.accommodation;
        }
        return cleanDay;
      });

      const sanitizedData = {
        ...formData,
        category: formData.category || 'FAMILY',
        basePrice: formData.basePrice ?? formData.price ?? 0,
        durationDays: formData.durationDays || formData.duration || 1,
        days: cleanDays,
        images: (validImages.length > 0 ? validImages : (formData.images || [])).map(img => ({ url: img.url, altText: img.altText })),
      };

      delete sanitizedData._id;
      delete sanitizedData._v;
      delete sanitizedData.__v;
      delete sanitizedData.createdAt;
      delete sanitizedData.createdBy;
      delete sanitizedData.slug;

      const response = await ApiService.updatePackage(packageId, sanitizedData);

      if (response.success) {
        updatePackage(packageId, response.data);
        setShowEditPackageDialog(false);
        setEditPackageData(null);
        Swal.fire('Success', VALIDATION_MESSAGES.PACKAGE_UPDATED, 'success');
      } else {
        Swal.fire('Error', response.message || 'Failed to update package', 'error');
      }
    } catch (error) {
      console.error('Error updating package:', error);
      Swal.fire('Error', error.message || 'Failed to update package', 'error');
    }
  };

  const handleDownloadPackage = async (pkg) => {
    try {
      setPdfPreviewData({ isOpen: true, blob: null, fileName: '', packageData: pkg });
      setIsGeneratingPdf(true);

      const { blob, fileName, packageData } = await createPackagePdfBlob(pkg, { fetchLatest: true });
      setPdfPreviewData({ isOpen: true, blob, fileName, packageData });
    } catch (error) {
      console.error('Error generating package PDF:', error);
      setPdfPreviewData({ isOpen: false, blob: null, fileName: '', packageData: null });
      Swal.fire('Error', 'Failed to generate PDF preview. Please try again.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDeletePackage = (id) => {
    const pkg = packages.find((p) => p._id === id || p.id === id);
    if (!pkg) return;

    Swal.fire({
      title: `Delete ${pkg.title}?`,
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
            Swal.fire('Deleted', `${pkg.title} ${VALIDATION_MESSAGES.PACKAGE_DELETED}`, 'success');
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
    if (isSalesRep) {
      Swal.fire('Access Denied', 'Sales Representatives do not have permission to duplicate packages.', 'info');
      return;
    }

    Swal.fire({
      title: `Duplicate ${pkg.title}?`,
      text: 'This will create a copy of the package.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, duplicate it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3b82f6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const duplicateData = { ...pkg, title: `${pkg.title} (Copy)`, isActive: false, bookings: 0, rating: 0, numReviews: 0 };
          delete duplicateData._id;

          const response = await ApiService.createPackage(duplicateData);

          if (response.success) {
            setPackages((prev) => [response.data, ...prev]);
            setCurrentPage(1);
            Swal.fire('Success', `${pkg.title} has been duplicated successfully.`, 'success');
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
    setIsUploadingImages(true);

    const tempImages = fileArray.map(file => ({
      url: URL.createObjectURL(file),
      public_id: 'temp-' + Date.now() + '-' + Math.random(),
      isTemp: true,
    }));
    setImages((prev) => [...prev, ...tempImages]);

    try {
      const uploadedImages = await uploadPackageImages(files, (progress) => {
        console.log(`Upload progress: ${progress.current}/${progress.total}`);
      });

      setImages((prev) => {
        const withoutTemp = prev.filter(img => !img.isTemp);
        return [...withoutTemp, ...uploadedImages];
      });

      tempImages.forEach(img => URL.revokeObjectURL(img.url));
      Swal.fire('Success', `${uploadedImages.length} image(s) uploaded successfully!`, 'success');
    } catch (error) {
      console.error('Upload error:', error);
      setImages((prev) => prev.filter(img => !img.isTemp));
      tempImages.forEach(img => URL.revokeObjectURL(img.url));

      let errorMessage = 'Failed to upload images';
      if (error.message.includes('500')) {
        errorMessage = 'Server error occurred. Please check if the server is running.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageRemove = (index) => {
    removeImage(index);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Package Card Component
  const PackageCard = ({ pkg }) => {
    if (!pkg || typeof pkg !== 'object') return null;
    const displayPrice = pkg.sellPrice ?? pkg.basePrice;
    const formattedPrice = displayPrice ? formatPriceINR(displayPrice) : null;
    const status = pkg.isActive ? 'published' : 'draft';
    const statusLabel = pkg.isActive ? 'Published' : 'Draft';

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all group">
        {/* Image */}
        <div
          className="h-44 relative overflow-hidden flex items-center justify-center"
          style={
            pkg.images && pkg.images.length > 0
              ? {
                backgroundImage: `url(${typeof pkg.images[0] === 'string' ? pkg.images[0] : pkg.images[0].url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
              : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {!(pkg.images && pkg.images.length > 0) && (
            <ImageIcon className="w-12 h-12 text-white/50" />
          )}

          {/* Status Badge */}
          <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${status === 'published' ? 'bg-emerald-500/90 text-white' :
              status === 'draft' ? 'bg-amber-500/90 text-white' :
                'bg-slate-500/90 text-white'
            }`}>
            {statusLabel}
          </span>

          {/* Price */}
          <div className="absolute bottom-3 left-3">
            <p className="text-2xl font-bold text-white drop-shadow-lg">{formattedPrice || 'Contact us'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1">{pkg.title}</h3>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[pkg.category] || 'bg-slate-100 text-slate-700'}`}>
              {pkg.category}
            </span>
            {pkg.region && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {pkg.region}
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm text-slate-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{pkg.durationDays || 'N/A'} days</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="line-clamp-1">{Array.isArray(pkg.destinations) ? pkg.destinations.join(', ') : pkg.region || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-800">{pkg.rating || 0}</span>
              <span className="text-xs text-slate-400">({pkg.numReviews || 0})</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Users className="w-4 h-4" />
              <span>{pkg.bookings || 0}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleViewPackage(pkg)}
              className="flex-1 px-3 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm shadow-sm"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            {canEditPackages && (
              <button
                onClick={() => handleEditPackage(pkg)}
                className="flex-1 px-3 py-2.5 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm shadow-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleDownloadPackage(pkg)}
              className="flex-1 px-3 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            {canEditPackages && (
              <>
                <button
                  onClick={() => handleDuplicatePackage(pkg)}
                  className="flex-1 px-3 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={() => handleDeletePackage(pkg._id || pkg.id)}
                  className="px-3 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium flex items-center justify-center shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative flex">
        {/* Sidebar Backdrop (mobile) */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Sidebar */}
        <aside className={`
          w-72 min-h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col
          md:sticky md:top-0
          ${isMobile ? 'fixed inset-y-0 left-0 z-30 transition-transform duration-300 ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'sticky top-0'}
        `}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Packages</h1>
                <p className="text-xs text-slate-500">Travel Itineraries</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-lg font-bold text-emerald-600">{stats.published}</p>
                <p className="text-[10px] text-emerald-600/70 uppercase tracking-wider">Published</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-lg font-bold text-amber-600">{stats.draft}</p>
                <p className="text-[10px] text-amber-600/70 uppercase tracking-wider">Drafts</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isSalesRep && (
            <div className="p-4 space-y-2 border-b border-slate-200/60">
              <button
                onClick={handleNewPackageDialogOpen}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                New Package
              </button>
              <button
                onClick={handleAIPackageDialogOpen}
                className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-xl transition-all"
              >
                <Sparkles className="w-5 h-5" />
                AI Generate
              </button>
            </div>
          )}

          {/* Filter Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter by Status</p>

            {visibleTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id || 'all'}
                  onClick={() => { handleStatusFilterChange(tab.id); if (isMobile) setSidebarOpen(false); }}
                  className={`w-full group rounded-xl transition-all duration-300 ${isActive ? 'shadow-lg' : 'hover:bg-slate-50'}`}
                >
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isActive ? `bg-gradient-to-r ${tab.gradient} text-white` : 'text-slate-600'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : `bg-${tab.color}-50`}`}>
                      <BookOpen className={`w-5 h-5 ${isActive ? 'text-white' : `text-${tab.color}-600`}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-700'}`}>{tab.label}</p>
                      <p className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{tab.count} packages</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-white/80' : 'text-slate-300 group-hover:translate-x-1'}`} />
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200/60">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-600">Pro Tip</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Use AI Generate to quickly create packages with destinations and itineraries.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Content Header */}
          <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/60 px-4 sm:px-8 py-4 sm:py-6 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 sm:gap-4 pl-10 md:pl-0">
                {/* Packages sidebar toggle - mobile only */}
                <button
                  onClick={toggleSidebar}
                  className="md:hidden p-2 bg-violet-100 hover:bg-violet-200 rounded-lg transition-colors"
                  title="Toggle packages sidebar"
                >
                  {sidebarOpen ? <X className="w-4 h-4 text-violet-700" /> : <Menu className="w-4 h-4 text-violet-700" />}
                </button>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {statusFilter ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Packages` : 'All Packages'}
                  </h2>
                  <p className="text-sm text-slate-500">{filteredPackages.length} packages found</p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            {!isSalesRep && (
              <div className="flex md:hidden gap-2 mb-4">
                <button
                  onClick={handleNewPackageDialogOpen}
                  className="flex-1 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Package
                </button>
                <button
                  onClick={handleAIPackageDialogOpen}
                  className="flex-1 px-3 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Generate
                </button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search packages by name or region..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full py-3 pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-8">
            {filteredPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium text-slate-600">No packages found</p>
                <p className="text-sm">Create your first package to get started</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredPackages.map((pkg) => (
                  <PackageCard key={pkg._id || pkg.id} pkg={pkg} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.pages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={pagination.total}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <PackageDetailsModal pkg={selectedPackage} onClose={() => setSelectedPackage(null)} />

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

      <AIPackageDialog
        isOpen={showAIPackageDialog}
        onClose={() => setShowAIPackageDialog(false)}
        onPackageGenerated={handleAIPackageGenerated}
      />

      <PackagePDFPreviewDialog
        isOpen={pdfPreviewData.isOpen}
        onClose={() => setPdfPreviewData({ isOpen: false, blob: null, fileName: '', packageData: null })}
        pdfBlob={pdfPreviewData.blob}
        fileName={pdfPreviewData.fileName}
        packageData={pdfPreviewData.packageData}
        isGenerating={!pdfPreviewData.blob && isGeneratingPdf}
      />
    </div>
  );
};

export default ItineraryGenerationContainer;
