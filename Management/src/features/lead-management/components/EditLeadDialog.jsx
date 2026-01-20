import { useState, useEffect } from 'react';
import { X, Mail, Phone, Save, Loader2, Edit, Calendar, MessageSquare, Plus, XCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { leadAPI, packageAPI, manualItineraryAPI, customizedPackageAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermission } from '../../../contexts/PermissionContext';
import { PackageFormModal, NewEditPackageForm } from '../../../features/itinerary/components';
import { useImageUpload } from '../../../features/itinerary/hooks';
import { uploadPackageImages } from '../../../services/cloudinaryService';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import LocationAutocomplete from './LocationAutocomplete';
import { getCountryCodeFromDestination } from '../../itinerary/utils/destinationMapping';
import ItineraryEditor from '../../itinerary/components/ItineraryEditor';
import DestinationSelector from '../../itinerary/components/DestinationSelector';
import { createDefaultDay } from '../../itinerary/types/index.js';

const EditLeadDialog = ({ isOpen, onClose, lead, salesReps, onSuccess }) => {
  const { user } = useAuth();
  const { hasPermission } = usePermission();

  // Determine if user can edit leads
  // Sales Reps can view/edit their own assigned leads
  // Admins/SuperAdmins with manage_leads permission can edit any lead
  const isSalesRep = user?.role === 'salesRep';
  const canManageLeads = user?.role === 'superAdmin' || (user?.role === 'admin' && hasPermission('manage_leads'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [customPackageId, setCustomPackageId] = useState(
    lead?.customizedPackage?._id || lead?.customizedPackage || null,
  );
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editPackageData, setEditPackageData] = useState(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const { images, setImages, removeImage } = useImageUpload();
  const [showManualItinerary, setShowManualItinerary] = useState(false);
  const [itineraryDays, setItineraryDays] = useState([]);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [remarks, setRemarks] = useState([]);
  const [editingRemarkIndex, setEditingRemarkIndex] = useState(null);
  const [editRemarkText, setEditRemarkText] = useState('');
  const [newRemarkText, setNewRemarkText] = useState('');
  const [showAddRemark, setShowAddRemark] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    numberOfTravelers: 1,
    city: "",
    salesRep: "",
    assignedTo: "",
    destination: "",
    platform: "",
    travelDate: "",
    endDate: "",
    package: "",
    packageName: "",
    status: "new",
  });

  const formatCustomizedLabel = (baseName = '', sequence = 1) => {
    const cleanBase = `${baseName}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();
    return sequence > 1 ? `${cleanBase} (Customized-${sequence})` : `${cleanBase} (Customized)`;
  };

  // Fetch packages when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen, customPackageId]);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await packageAPI.getAll();

      if (response && response.success === true && response.data) {
        let packagesList = Array.isArray(response.data) ? response.data : [];
        // Filter to only show active and published packages
        packagesList = packagesList.filter((pkg) =>
          pkg.isActive !== false && pkg.status === 'published'
        );

        if (customPackageId) {
          try {
            const customResponse = await customizedPackageAPI.getById(customPackageId);
            if (customResponse && (customResponse.success === true || customResponse.status === 'success')) {
              const customData = customResponse.data?.data || customResponse.data || customResponse;
              if (customData) {
                const customId = customData._id || customData.id;
                const sequence = customData.customizationSequence || 1;
                const baseName = `${customData.name || ''}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim() || (customData.baseName || customData.name);
                const formattedName = sequence > 1 ? `${baseName} (Customized-${sequence})` : `${baseName} (Customized)`;
                const customOption = {
                  ...customData,
                  _id: customId,
                  id: customId,
                  name: formattedName,
                  baseName,
                  customizationSequence: sequence,
                  isCustomizedPackage: true,
                };
                packagesList = [
                  customOption,
                  ...packagesList.filter((pkg) => (pkg._id || pkg.id) !== customId),
                ];
              }
            }
          } catch (customError) {
            console.error('Error fetching customized package:', customError);
          }
        }

        setPackages(packagesList);
      } else {
        setPackages([]);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Initialize form when lead changes
  useEffect(() => {
    if (lead) {
      const primaryPackageId = lead.package?._id || lead.package || '';
      const customizedId = lead.customizedPackage?._id || lead.customizedPackage || '';
      const defaultPackageId = primaryPackageId || customizedId || '';
      let defaultPackageName =
        lead.packageName ||
        lead.package?.name ||
        lead.customizedPackage?.name ||
        '';

      if (customizedId) {
        const sequence =
          lead.customizedPackage?.customizationSequence ||
          lead.customizationSequence ||
          lead.customizedPackage?.sequence ||
          1;
        const baseName = lead.customizedPackage?.baseName || defaultPackageName;
        defaultPackageName = formatCustomizedLabel(baseName, sequence);
      } else if (primaryPackageId && defaultPackageName.includes('(Customized')) {
        const baseName = defaultPackageName.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();
        defaultPackageName = baseName;
      }

      setCustomPackageId(customizedId || null);
      const assignedToId = lead.assignedTo?._id || lead.assignedTo || lead.assignedTo?.id || '';
      let salesRepName = lead.salesRep || lead.adviser || '';

      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        whatsapp: lead.whatsapp || '',
        numberOfTravelers: lead.numberOfTravelers || 1,
        city: lead.city || '',
        salesRep: salesRepName,
        assignedTo: assignedToId || (salesRepName ? '__name_only' : ''),
        destination: lead.destination || '',
        platform: lead.platform || '',
        travelDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
        endDate: lead.endDate ? new Date(lead.endDate).toISOString().split('T')[0] : '',
        package: defaultPackageId,
        packageName: defaultPackageName,
        status: lead.status || 'new',
      });

      // Initialize remarks
      setRemarks(lead.remarks || []);

      // Load manual itinerary if exists
      loadManualItinerary();
    }
  }, [lead, salesReps]);

  const loadManualItinerary = async () => {
    if (!lead?._id && !lead?.id) return;

    try {
      setLoadingItinerary(true);
      const leadId = lead._id || lead.id;
      const response = await manualItineraryAPI.getByLead(leadId);

      if (response.success && response.data) {
        setItineraryDays(response.data.days || []);
        setShowManualItinerary(response.data.days && response.data.days.length > 0);
      } else {
        setItineraryDays([]);
        setShowManualItinerary(false);
      }
    } catch (error) {
      console.error('Error loading manual itinerary:', error);
      setItineraryDays([]);
      setShowManualItinerary(false);
    } finally {
      setLoadingItinerary(false);
    }
  };

  const handleSave = async () => {
    if (!lead) return;

    try {
      setIsSubmitting(true);
      // Only Sales Reps cannot change the assigned sales rep
      // Admins/SuperAdmins with manage_leads permission can change it freely
      const leadId = lead._id || lead.id;
      if (formData.assignedTo === '') {
        try {
          await leadAPI.assignLead(leadId, null);
        } catch (err) {
          console.error('Failed to unassign on server:', err);
          toast.error('Failed to unassign sales representative');
        }
      }
      const updateData = {
        name: formData.name?.trim() || undefined,
        phone: formData.phone || undefined,
        numberOfTravelers: formData.numberOfTravelers ? Number(formData.numberOfTravelers) : undefined,
        city: formData.city || undefined,
        destination: formData.destination || undefined,
        platform: formData.platform || undefined,
        travelDate: formData.travelDate || undefined,
        endDate: formData.endDate || undefined,
        whatsapp: formData.whatsapp || undefined,
        package: formData.package || null,
        packageName: formData.packageName || null,
        status: formData.status || 'new',
        remarks: remarks.length > 0 ? remarks : undefined,
      };
      if (formData.assignedTo && formData.assignedTo !== '' && formData.assignedTo !== '__name_only') {
        const rep = salesReps.find(r => r.id === formData.assignedTo || r._id === formData.assignedTo);
        updateData.assignedTo = formData.assignedTo;
        updateData.salesRep = rep ? rep.name : formData.salesRep || undefined;
      }
      await leadAPI.updateLead(leadId, updateData);

      // Save manual itinerary if days exist
      if (showManualItinerary && itineraryDays.length > 0) {
        try {
          await manualItineraryAPI.createOrUpdate(leadId, itineraryDays);
        } catch (itineraryError) {
          console.error('Error saving manual itinerary:', itineraryError);
          toast.error('Lead updated but itinerary save failed');
        }
      } else if (showManualItinerary && itineraryDays.length === 0) {
        // If itinerary was shown but is now empty, delete it
        try {
          const itineraryResponse = await manualItineraryAPI.getByLead(leadId);
          if (itineraryResponse.success && itineraryResponse.data?._id) {
            await manualItineraryAPI.delete(itineraryResponse.data._id);
          }
        } catch (deleteError) {
          console.error('Error deleting manual itinerary:', deleteError);
        }
      }

      toast.success('Lead updated successfully');
      try {
        const refreshed = await leadAPI.getLead(leadId);
        const freshLead = refreshed?.data || refreshed;
        if (freshLead) {
          const primaryPackageId = freshLead.package?._id || freshLead.package || '';
          const customizedId = freshLead.customizedPackage?._id || freshLead.customizedPackage || '';
          const defaultPackageId = primaryPackageId || customizedId || '';
          let defaultPackageName =
            freshLead.packageName ||
            freshLead.package?.name ||
            freshLead.customizedPackage?.name ||
            '';

          if (customizedId) {
            const sequence =
              freshLead.customizedPackage?.customizationSequence ||
              freshLead.customizationSequence ||
              freshLead.customizedPackage?.sequence ||
              1;
            const baseName = freshLead.customizedPackage?.baseName || defaultPackageName;
            defaultPackageName = formatCustomizedLabel(baseName, sequence);
          } else if (primaryPackageId && defaultPackageName.includes('(Customized')) {
            const baseName = defaultPackageName.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();
            defaultPackageName = baseName;
          }

          setCustomPackageId(customizedId || null);
          const refreshedAssignedId = freshLead.assignedTo?._id || freshLead.assignedTo || freshLead.assignedTo?.id || '';
          let refreshedSalesRepName = freshLead.salesRep || freshLead.adviser || '';
          if (!refreshedSalesRepName && refreshedAssignedId && Array.isArray(salesReps)) {
            const matchedRef = salesReps.find(r => r.id === refreshedAssignedId || r._id === refreshedAssignedId);
            if (matchedRef) refreshedSalesRepName = matchedRef.name || '';
          }

          setFormData({
            name: freshLead.name || '',
            email: freshLead.email || '',
            phone: freshLead.phone || '',
            whatsapp: freshLead.whatsapp || '',
            numberOfTravelers: freshLead.numberOfTravelers || 1,
            city: freshLead.city || '',
            salesRep: refreshedSalesRepName,
            assignedTo: refreshedAssignedId || (refreshedSalesRepName ? '__name_only' : ''),
            destination: freshLead.destination || '',
            platform: freshLead.platform || '',
            travelDate: freshLead.travelDate ? new Date(freshLead.travelDate).toISOString().split('T')[0] : '',
            endDate: freshLead.endDate ? new Date(freshLead.endDate).toISOString().split('T')[0] : '',
            package: defaultPackageId,
            packageName: defaultPackageName,
            status: freshLead.status || 'new',
          });

          setRemarks(freshLead.remarks || []);
        }
      } catch (fetchErr) {
        console.error('Failed to reload lead after save:', fetchErr);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`Failed to update lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPackage = async () => {
    if (!formData.package) {
      toast.error('Please select a package first');
      return;
    }

    const selectedPackageId = formData.package;
    console.log('🎯 handleEditPackage called');
    console.log('🎯 formData.package:', formData.package);
    console.log('🎯 customPackageId state:', customPackageId);
    console.log('🎯 selectedPackageId:', selectedPackageId);

    const isCustomizedSelected =
      !!customPackageId && selectedPackageId === customPackageId;

    console.log('🎯 isCustomizedSelected:', isCustomizedSelected);

    const confirmationHtml = isCustomizedSelected
      ? `
        <div class="text-left">
          <p class="mb-2"><strong>This will update the existing customized package.</strong></p>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Changes will be applied to the current customized package</li>
            <li>The lead will keep the same customized package reference</li>
            <li>You can modify all details including itinerary days</li>
          </ul>
        </div>
      `
      : `
        <div class="text-left">
          <p class="mb-2"><strong>This will create a new customized package.</strong></p>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>The original package will remain unchanged</li>
            <li>A new package will be created for this lead</li>
            <li>You can modify all details including itinerary days</li>
          </ul>
        </div>
      `;

    // Show confirmation dialog (Phase 6: UI/UX refinement)
    const result = await Swal.fire({
      title: 'Customize Package?',
      html: confirmationHtml,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#9333ea',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Customize Package',
      cancelButtonText: 'Cancel',
      width: '500px',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      console.log('🔍 Loading package for editing. Selected ID:', selectedPackageId);
      console.log('🔍 Is customized package?', isCustomizedSelected);

      const response = isCustomizedSelected
        ? await customizedPackageAPI.getById(selectedPackageId)
        : await packageAPI.getById(selectedPackageId);

      console.log('📦 API Response:', response);

      const pkg = response?.data?.data || response?.data || response;

      console.log('📦 Extracted package:', pkg);
      console.log('📦 Package itinerary:', pkg?.itinerary);
      console.log('📦 Package days:', pkg?.days);

      if (response?.success && pkg) {
        let days = [];

        if (pkg.itinerary?.days) {
          days = pkg.itinerary.days;
          console.log('✅ Loaded days from pkg.itinerary.days:', days.length, 'days');
        } else if (Array.isArray(pkg.days)) {
          days = pkg.days;
          console.log('✅ Loaded days from pkg.days:', days.length, 'days');
        } else {
          console.warn('⚠️ No days found in package!');
        }

        console.log('📋 Final days array:', days);

        // Format images
        const formattedImages = (pkg.images || []).map(img => {
          if (typeof img === 'object' && img.url) {
            return img;
          }
          if (typeof img === 'string') {
            return {
              url: img,
              public_id: img.split('/').pop()?.split('.')[0] || 'unknown',
            };
          }
          return img;
        });

        // Prepare package data for editing (remove _id so it creates a new one)
        // Store original package ID for tracking
        const originalPackageId =
          (pkg.originalPackage && (pkg.originalPackage._id || pkg.originalPackage.id || pkg.originalPackage)) ||
          pkg.originalPackageId ||
          pkg.originalPackage?._id ||
          pkg._id ||
          pkg.id;

        const sequence =
          pkg.customizationSequence ||
          pkg.sequence ||
          (isCustomizedSelected ? lead.customizedPackage?.customizationSequence : 1) ||
          1;
        const baseName =
          pkg.baseName ||
          `${pkg.name || ''}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim() ||
          pkg.name ||
          'Customized Package';

        const displayName = isCustomizedSelected
          ? formatCustomizedLabel(baseName, sequence)
          : `${baseName} (Customized)`;

        const editData = {
          ...pkg,
          _id: undefined, // Remove ID so it creates a new package unless we explicitly update
          id: undefined,
          name: displayName,
          days: [...days],
          images: [...formattedImages],
          originalPackageId: originalPackageId, // Store for later use in save
          existingPackageId: selectedPackageId,
          baseName,
          customizationSequence: sequence,
        };

        console.log('📝 Setting editData with', editData.days?.length || 0, 'days');
        console.log('📝 Edit data:', editData);

        setEditPackageData(editData);
        setImages(formattedImages);
        setShowEditPackageDialog(true);
      } else {
        console.error('❌ Failed to load package. Response:', response);
        toast.error('Failed to load package data');
      }
    } catch (error) {
      console.error('❌ Error loading package:', error);
      toast.error('Failed to load package for editing');
    }
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const uploadedImages = await uploadPackageImages(files);

      // Format as expected by the form
      const formattedImages = uploadedImages.map(img => ({
        url: img.url,
        public_id: img.public_id,
      }));

      setImages(prev => [...prev, ...formattedImages]);
      toast.success(`${uploadedImages.length} image(s) uploaded successfully!`);
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageRemove = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditedPackage = async (updatedPackageData) => {
    console.log('🎁 handleSaveEditedPackage received data:', updatedPackageData);
    console.log('🎁 updatedPackageData.days:', updatedPackageData.days);
    console.log('🎁 updatedPackageData.days length:', updatedPackageData.days?.length || 0);

    try {
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      const requiredFields = {
        name: 'Package Name',
        category: 'Category',
        destination: 'Destination',
        description: 'Description',
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([key]) => !updatedPackageData[key])
        .map(([, label]) => label);

      if (missingFields.length > 0) {
        Swal.fire('Missing Required Fields', `Please fill in: ${missingFields.join(', ')}`, 'error');
        return;
      }

      console.log('📦 updatedPackageData.days before cleaning:', updatedPackageData.days);

      // Don't filter out days - save all days to preserve customizations
      // Users might add locations/activities without filling title/description
      const cleanDays = (updatedPackageData.days || []).map((day, index) => {
        const cleanDay = { ...day };
        // Ensure dayNumber exists for backend validation
        if (!cleanDay.dayNumber) cleanDay.dayNumber = index + 1;

        // Clean up transport if empty
        if (!cleanDay.transport || cleanDay.transport === '') {
          delete cleanDay.transport;
        }

        // Clean up activities
        if (cleanDay.activities && Array.isArray(cleanDay.activities)) {
          cleanDay.activities = cleanDay.activities.filter(a => a && typeof a === 'string' && a.trim() !== '');
        }

        // Clean up accommodation if no valid data
        if (cleanDay.accommodation) {
          if (!cleanDay.accommodation.type || cleanDay.accommodation.type === '') {
            delete cleanDay.accommodation.type;
          }
          const hasValidData = Object.values(cleanDay.accommodation).some((v) => v && v !== '');
          if (!hasValidData) {
            delete cleanDay.accommodation;
          }
        }

        return cleanDay;
      });

      console.log('📦 Saving customized package with days:', cleanDays.length);
      console.log('📦 cleanDays:', cleanDays);

      const validImages = images.filter((img) => !img.isTemp && img.url && img.public_id);

      const originalPackageRef =
        updatedPackageData.originalPackageId ||
        updatedPackageData.originalPackage?._id ||
        updatedPackageData.originalPackage ||
        editPackageData?.originalPackageId ||
        editPackageData?.originalPackage?._id ||
        editPackageData?.originalPackage ||
        formData.package ||
        customPackageId;

      const baseName =
        updatedPackageData.baseName ||
        editPackageData?.baseName ||
        updatedPackageData.name ||
        editPackageData?.name ||
        'Customized Package';
      const sanitizedBaseName = `${baseName}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();

      const sanitizeCategory = (cat) => {
        if (!cat) return 'family';
        const validCategories = ['honeymoon', 'couple', 'family', 'group', 'wild safari'];
        const lowered = cat.toLowerCase();
        return validCategories.includes(lowered) ? lowered : 'family';
      };

      const sanitizePackageType = (pt) => {
        if (!pt) return 'Standard';
        // Ensure Title Case: 'standard' -> 'Standard'
        const lower = pt.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      };

      const basePayload = {
        ...updatedPackageData,
        _id: undefined,
        id: undefined,
        existingPackageId: undefined,
        originalPackageId: undefined,
        price: parseFloat(updatedPackageData.price) || 0,
        duration: parseInt(updatedPackageData.duration, 10) || 1,
        maxGroupSize: parseInt(updatedPackageData.maxGroupSize, 10) || 10,
        days: cleanDays,
        images: validImages,
        baseName: sanitizedBaseName,
        category: sanitizeCategory(updatedPackageData.category),
        packageType: sanitizePackageType(updatedPackageData.packageType),
        name: sanitizedBaseName, // Ensure name is set
      };

      const customizedForLead = lead._id || lead.id;
      const isUpdatingExistingCustom =
        !!customPackageId &&
        (editPackageData?.existingPackageId === customPackageId ||
          formData.package === customPackageId);

      if (isUpdatingExistingCustom) {
        // UPDATE EXISTING CUSTOMIZED PACKAGE
        const updatePayload = {
          ...basePayload,
          customizedForLead,
          days: cleanDays, // ✅ Explicitly include days for update
        };
        updatePayload.customizationSequence =
          editPackageData?.customizationSequence || lead.customizedPackage?.customizationSequence || 1;

        if (originalPackageRef) {
          updatePayload.originalPackage = originalPackageRef;
        }

        if (!updatePayload.customizationNotes) {
          updatePayload.customizationNotes = `Customized for lead "${lead.name || customizedForLead}"`;
        }

        console.log('🔄 Updating customized package:', customPackageId, 'with', cleanDays.length, 'days');

        const response = await customizedPackageAPI.update(customPackageId, updatePayload);

        if (response?.success && response.data) {
          const updatedPackage = response.data.data || response.data;
          const updatedPackageId = updatedPackage._id || updatedPackage.id;

          console.log('✅ Customized package updated successfully:', updatedPackageId);

          await leadAPI.updateLead(lead._id || lead.id, {
            customizedPackage: updatedPackageId,
            packageName: updatedPackage.name,
            package: null,
          });

          setCustomPackageId(updatedPackageId);
          setFormData((prev) => ({
            ...prev,
            package: updatedPackageId,
            packageName: updatedPackage.name,
          }));

          setShowEditPackageDialog(false);
          setEditPackageData(null);
          setImages([]);

          Swal.fire('Success', 'Customized package updated successfully!', 'success');
          await fetchPackages();
          onSuccess?.();
        } else {
          console.error('❌ Update failed:', response);
          Swal.fire('Error', response?.message || 'Failed to update customized package', 'error');
        }
      } else {
        // CREATE NEW CUSTOMIZED PACKAGE
        const creationPayload = {
          ...basePayload,
          customizedForLead,
          originalPackage: originalPackageRef,
          customizedBy: undefined,
          days: cleanDays, // ✅ Explicitly include days for creation
          customizationNotes:
            basePayload.customizationNotes ||
            `Customized from package "${updatedPackageData.name?.replace(' (Customized)', '') || 'Original'}" for lead "${lead.name || customizedForLead}"`,
        };

        console.log('➕ Creating new customized package with', cleanDays.length, 'days');

        const response = await packageAPI.create(creationPayload);

        if (response.success && response.data) {
          const newPackage = response.data;
          const newPackageId = newPackage._id || newPackage.id;

          console.log('✅ New customized package created:', newPackageId);

          await leadAPI.updateLead(lead._id || lead.id, {
            customizedPackage: newPackageId,
            packageName: newPackage.name,
            package: null,
          });

          setCustomPackageId(newPackageId);
          setFormData((prev) => ({
            ...prev,
            package: newPackageId,
            packageName: newPackage.name,
          }));

          setShowEditPackageDialog(false);
          setEditPackageData(null);
          setImages([]);

          Swal.fire('Success', 'Package customized and saved! A new package has been created.', 'success');
          await fetchPackages();
          onSuccess?.();
        } else {
          console.error('❌ Creation failed:', response);
          Swal.fire('Error', response.message || 'Failed to create customized package', 'error');
        }
      }
    } catch (error) {
      console.error('❌ Error saving customized package:', error);
      Swal.fire('Error', error.message || 'Failed to save customized package', 'error');
    }
  };

  if (!isOpen || !lead) return null;

  const isEditingExistingCustomizedPackage =
    !!customPackageId && formData.package === customPackageId;

  const packageModalSubtitle = isEditingExistingCustomizedPackage ? (
    <div className="space-y-1 mt-2">
      <p className="text-sm font-semibold text-purple-700">✏️ UPDATING EXISTING CUSTOMIZED PACKAGE</p>
      <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
        <li>The current customized package will be updated in place</li>
        <li>The lead will keep the same customized package reference</li>
        <li>You can modify all details including itinerary, price, and inclusions</li>
      </ul>
    </div>
  ) : (
    <div className="space-y-1 mt-2">
      <p className="text-sm font-semibold text-purple-700">⚠️ NEW PACKAGE WILL BE CREATED</p>
      <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
        <li>The original package will remain unchanged</li>
        <li>This lead will be linked to the new customized package</li>
        <li>You can modify all details including itinerary, price, and inclusions</li>
      </ul>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center rounded-t-xl shadow-lg z-10">
          <div>
            <h2 className="text-2xl font-bold">Edit Lead - {formData.name || 'Lead'}</h2>
            <p className="text-sm text-blue-100 mt-1">Update lead information and details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group">
            <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              <p className="text-xs text-gray-500 mt-1">Basic contact details of the lead</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  international
                  defaultCountry="LK"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value || "" })}
                  className="phone-input-wrapper"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    WhatsApp Number
                  </label>
                  {formData.phone && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, whatsapp: formData.phone })}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      title="Copy contact number to WhatsApp"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy from Contact
                    </button>
                  )}
                </div>
                <PhoneInput
                  international
                  defaultCountry="LK"
                  value={formData.whatsapp}
                  onChange={(value) => setFormData({ ...formData, whatsapp: value || "" })}
                  className="phone-input-wrapper"
                  placeholder="Enter WhatsApp number"
                />
              </div>
            </div>
          </div>

          {/* Travel Details Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Travel Details</h3>
              <p className="text-xs text-gray-500 mt-1">Information about the travel requirements</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Departure City
                </label>
                <LocationAutocomplete
                  value={formData.city}
                  onChange={(value) => setFormData({ ...formData, city: value })}
                  placeholder="e.g., Colombo, Sri Lanka"
                  destination={formData.destination}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Destination
                </label>
                <DestinationSelector
                  value={formData.destination}
                  onChange={(event) =>
                    setFormData({ ...formData, destination: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Travel Date (Start)
                </label>
                <input
                  type="date"
                  value={formData.travelDate}
                  onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.travelDate || undefined}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Travelers
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.numberOfTravelers}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      numberOfTravelers: value === '' ? '' : Math.max(1, Number(value)),
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g., 2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Platform/Source
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">Select Platform</option>
                  <option value="Website Form">Website Form</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-in">Walk-in</option>
                </select>
              </div>
            </div>
          </div>

          {/* Package & Assignment Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Package & Assignment</h3>
              <p className="text-xs text-gray-500 mt-1">Select package and assign sales representative</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Package
                </label>
                <div className="space-y-2">
                  <select
                    value={formData.package || ''}
                    onChange={(e) => {
                      const packageId = e.target.value;
                      const selectedPackage = packages.find(pkg => (pkg._id || pkg.id) === packageId);
                      setFormData({
                        ...formData,
                        package: packageId,
                        packageName: selectedPackage?.name || '',
                        destination: selectedPackage?.destination || formData.destination
                      });
                    }}
                    disabled={loadingPackages}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{loadingPackages ? 'Loading packages...' : 'Select Package'}</option>
                    {packages.map((pkg) => {
                      const optionId = pkg._id || pkg.id;
                      const baseName =
                        pkg.baseName ||
                        `${pkg.name || 'Unnamed Package'}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();
                      const sequence = pkg.customizationSequence || pkg.sequence || 0;
                      let label = baseName || 'Unnamed Package';
                      if (pkg.customizedForLead || pkg.isCustomizedPackage) {
                        label = sequence > 1 ? `${label} (Customized-${sequence})` : `${label} (Customized)`;
                      }
                      return (
                        <option key={optionId} value={optionId}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  {formData.package && (
                    <button
                      onClick={handleEditPackage}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium flex items-center justify-center gap-2 shadow-sm"
                      type="button"
                    >
                      <Edit className="w-4 h-4" />
                      Customize Package
                    </button>
                  )}
                </div>
                {packages.length === 0 && !loadingPackages && (
                  <p className="text-xs text-gray-500 mt-1">No packages available</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sales Representative
                </label>
                <select
                  value={formData.assignedTo || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id === '__name_only') {
                      setFormData(prev => ({ ...prev, assignedTo: '__name_only' }));
                      return;
                    }

                    if (id === '') {
                      setFormData(prev => ({ ...prev, assignedTo: '', salesRep: '' }));
                      return;
                    }

                    const rep = salesReps.find(r => r.id === id || r._id === id);
                    setFormData(prev => ({ ...prev, assignedTo: id, salesRep: rep ? rep.name : '' }));
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">Select Sales Rep</option>
                  {formData.salesRep && (!formData.assignedTo || formData.assignedTo === '__name_only') && (
                    <option value="__name_only">{formData.salesRep}</option>
                  )}
                  {salesReps.map((rep) => (
                    <option key={rep.id || rep._id} value={rep.id || rep._id}>{rep.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          {/* Remarks Section */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Remarks ({remarks.length})
                </h3>
                <p className="text-xs text-gray-500 mt-1">Add notes and comments about this lead</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddRemark(!showAddRemark);
                  if (!showAddRemark) {
                    setNewRemarkText('');
                  }
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                {showAddRemark ? 'Cancel' : 'Add Remark'}
              </button>
            </div>

            {/* Add New Remark */}
            {showAddRemark && (
              <div className="mb-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-3">New Remark</label>
                <textarea
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-4 transition-all"
                  rows={4}
                  placeholder="Enter your remark here..."
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRemark(false);
                      setNewRemarkText('');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newRemarkText.trim()) {
                        toast.error('Remark text cannot be empty');
                        return;
                      }
                      const newRemark = {
                        text: newRemarkText.trim(),
                        date: new Date(),
                        addedAt: new Date(),
                      };
                      setRemarks([...remarks, newRemark]);
                      setNewRemarkText('');
                      setShowAddRemark(false);
                      toast.success('Remark added successfully');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Add Remark
                  </button>
                </div>
              </div>
            )}

            {/* Remarks List */}
            <div className="space-y-4">
              {remarks.length > 0 ? (
                remarks.map((remark, index) => (
                  <div key={index} className="p-5 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                    {editingRemarkIndex === index ? (
                      // Edit mode
                      <div className="space-y-3">
                        <textarea
                          value={editRemarkText}
                          onChange={(e) => setEditRemarkText(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                          rows={4}
                          placeholder="Enter remark text..."
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {remark.date ? new Date(remark.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'No date'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRemarkIndex(null);
                                setEditRemarkText('');
                              }}
                              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editRemarkText.trim()) {
                                  toast.error('Remark text cannot be empty');
                                  return;
                                }
                                const updatedRemarks = [...remarks];
                                updatedRemarks[index] = {
                                  ...updatedRemarks[index],
                                  text: editRemarkText.trim(),
                                  date: updatedRemarks[index].date || new Date(),
                                  addedAt: updatedRemarks[index].addedAt || updatedRemarks[index].date || new Date(),
                                  addedBy: updatedRemarks[index].addedBy || updatedRemarks[index].addedBy?._id || updatedRemarks[index].addedBy?.id,
                                  ...(updatedRemarks[index]._id && { _id: updatedRemarks[index]._id }),
                                };
                                setRemarks(updatedRemarks);
                                setEditingRemarkIndex(null);
                                setEditRemarkText('');
                                toast.success('Remark updated successfully');
                              }}
                              className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-sm"
                            >
                              <Save className="w-4 h-4" />
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm text-gray-900 flex-1">{remark.text}</p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedRemarks = remarks.filter((_, i) => i !== index);
                                setRemarks(updatedRemarks);
                                toast.success('Remark deleted');
                              }}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                              title="Delete remark"
                            >
                              <XCircle className="w-4 h-4 text-gray-500 group-hover:text-red-600 transition-colors" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRemarkIndex(index);
                                setEditRemarkText(remark.text || '');
                              }}
                              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors group"
                              title="Edit remark"
                            >
                              <Edit className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-500">
                            {remark.date ? new Date(remark.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'No date'}
                          </span>
                          <span className="text-xs font-medium text-gray-600">
                            Remark #{index + 1}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium">No remarks yet</p>
                  <p className="text-xs mt-1 text-gray-400">Click "Add Remark" to add your first note</p>
                </div>
              )}
            </div>
          </div>

          {/* Manual Itinerary Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Manual Itinerary</h3>
              {loadingItinerary ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowManualItinerary(!showManualItinerary);
                    if (!showManualItinerary && itineraryDays.length === 0) {
                      setItineraryDays([createDefaultDay(1)]);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  {showManualItinerary ? 'Hide Itinerary' : (itineraryDays.length > 0 ? 'Show Manual Itinerary' : 'Add Manual Itinerary')}
                </button>
              )}
            </div>

            {showManualItinerary && (
              <div className="mt-4">
                <ItineraryEditor
                  days={itineraryDays}
                  onDayChange={(dayNumber, dayData) => {
                    setItineraryDays(prev =>
                      prev.map(day =>
                        day.dayNumber === dayNumber ? { ...day, ...dayData } : day
                      )
                    );
                  }}
                  onAddDay={() => {
                    const newDayNumber = itineraryDays.length + 1;
                    setItineraryDays([...itineraryDays, createDefaultDay(newDayNumber)]);
                  }}
                  onRemoveDay={(dayNumber) => {
                    const filteredDays = itineraryDays.filter(day => day.dayNumber !== dayNumber);
                    const renumberedDays = filteredDays.map((day, index) => ({
                      ...day,
                      dayNumber: index + 1,
                    }));
                    setItineraryDays(renumberedDays);
                  }}
                  destination={formData.destination}
                  hideTitleAndDescription={true}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Package Dialog */}
      {editPackageData && (
        <PackageFormModal
          isOpen={showEditPackageDialog}
          title="Customize Package & Itinerary"
          subtitle={packageModalSubtitle}
          onClose={() => {
            setShowEditPackageDialog(false);
            setEditPackageData(null);
            setImages([]);
          }}
        >
          <NewEditPackageForm
            formData={editPackageData}
            setFormData={setEditPackageData}
            onSave={handleSaveEditedPackage}
            onCancel={() => {
              setShowEditPackageDialog(false);
              setEditPackageData(null);
              setImages([]);
            }}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            images={images}
            isUploadingImages={isUploadingImages}
            hideLeadManagementButtons={true}
            onlyItineraryEditable={true}
          />
        </PackageFormModal>
      )}
    </div>
  );
};

export default EditLeadDialog;

