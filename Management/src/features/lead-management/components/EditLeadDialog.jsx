import { useState, useEffect } from 'react';
import {
  X, Mail, Phone, Save, Loader2, Edit, Calendar, MessageSquare, Plus, XCircle, Copy,
  User, MapPin, Plane, Users, Globe, Package, ChevronDown, ChevronUp, Sparkles,
  Trash2, Check
} from 'lucide-react';
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
import LeadFlightBookingsSection from './LeadFlightBookingsSection';
import LeadHotelBookingsSection from './LeadHotelBookingsSection';
import LeadStatusBadge from './LeadStatusBadge';
import PricingSection from './PricingSection';

// ── Module-level components (prevents remounting on re-render) ──

function EditInputField({ label, required, icon: Icon, children }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function EditSectionHeader({ icon: Icon, title, subtitle, section, gradient, count, expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(section)}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${expanded
          ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${expanded ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
          <Icon className={`w-5 h-5 ${expanded ? 'text-white' : 'text-gray-600'}`} />
        </div>
        <div className="text-left">
          <h3 className="font-semibold flex items-center gap-2">
            {title}
            {count !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${expanded ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                {count}
              </span>
            )}
          </h3>
          <p className={`text-xs ${expanded ? 'text-white/70' : 'text-gray-500'}`}>{subtitle}</p>
        </div>
      </div>
      {expanded ? (
        <ChevronUp className="w-5 h-5" />
      ) : (
        <ChevronDown className="w-5 h-5" />
      )}
    </button>
  );
}

const EditLeadDialog = ({ isOpen, onClose, lead, salesReps, onSuccess }) => {
  const { user } = useAuth();
  const { hasPermission } = usePermission();

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
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    travel: true,
    package: true,
    remarks: false,
    itinerary: false,
  });
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

      setRemarks(lead.remarks || []);
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
        if (response.data.days && response.data.days.length > 0) {
          setExpandedSections(prev => ({ ...prev, itinerary: true }));
        }
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

      if (showManualItinerary && itineraryDays.length > 0) {
        try {
          await manualItineraryAPI.createOrUpdate(leadId, itineraryDays);
        } catch (itineraryError) {
          console.error('Error saving manual itinerary:', itineraryError);
          toast.error('Lead updated but itinerary save failed');
        }
      } else if (showManualItinerary && itineraryDays.length === 0) {
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
      toast.error(`Failed to update lead: ${error.message}`);
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
    const isCustomizedSelected =
      !!customPackageId && selectedPackageId === customPackageId;

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
      const response = isCustomizedSelected
        ? await customizedPackageAPI.getById(selectedPackageId)
        : await packageAPI.getById(selectedPackageId);

      const pkg = response?.data?.data || response?.data || response;

      if (response?.success && pkg) {
        let days = [];

        if (pkg.itinerary?.days) {
          days = pkg.itinerary.days;
        } else if (Array.isArray(pkg.days)) {
          days = pkg.days;
        }

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
          _id: undefined,
          id: undefined,
          name: displayName,
          days: [...days],
          images: [...formattedImages],
          originalPackageId: originalPackageId,
          existingPackageId: selectedPackageId,
          baseName,
          customizationSequence: sequence,
        };

        setEditPackageData(editData);
        setImages(formattedImages);
        setShowEditPackageDialog(true);
      } else {
        toast.error('Failed to load package data');
      }
    } catch (error) {
      console.error('Error loading package:', error);
      toast.error('Failed to load package for editing');
    }
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const uploadedImages = await uploadPackageImages(files);

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

      const cleanDays = (updatedPackageData.days || []).map((day, index) => {
        const cleanDay = { ...day };
        if (!cleanDay.dayNumber) cleanDay.dayNumber = index + 1;

        if (!cleanDay.transport || cleanDay.transport === '') {
          delete cleanDay.transport;
        }

        if (cleanDay.activities && Array.isArray(cleanDay.activities)) {
          cleanDay.activities = cleanDay.activities.filter(a => a && typeof a === 'string' && a.trim() !== '');
        }

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
        name: sanitizedBaseName,
      };

      const customizedForLead = lead._id || lead.id;
      const isUpdatingExistingCustom =
        !!customPackageId &&
        (editPackageData?.existingPackageId === customPackageId ||
          formData.package === customPackageId);

      if (isUpdatingExistingCustom) {
        const updatePayload = {
          ...basePayload,
          customizedForLead,
          days: cleanDays,
        };
        updatePayload.customizationSequence =
          editPackageData?.customizationSequence || lead.customizedPackage?.customizationSequence || 1;

        if (originalPackageRef) {
          updatePayload.originalPackage = originalPackageRef;
        }

        if (!updatePayload.customizationNotes) {
          updatePayload.customizationNotes = `Customized for lead "${lead.name || customizedForLead}"`;
        }

        const response = await customizedPackageAPI.update(customPackageId, updatePayload);

        if (response?.success && response.data) {
          const updatedPackage = response.data.data || response.data;
          const updatedPackageId = updatedPackage._id || updatedPackage.id;

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
          Swal.fire('Error', response?.message || 'Failed to update customized package', 'error');
        }
      } else {
        const creationPayload = {
          ...basePayload,
          customizedForLead,
          originalPackage: originalPackageRef,
          customizedBy: undefined,
          days: cleanDays,
          customizationNotes:
            basePayload.customizationNotes ||
            `Customized from package "${updatedPackageData.name?.replace(' (Customized)', '') || 'Original'}" for lead "${lead.name || customizedForLead}"`,
        };

        const response = await packageAPI.create(creationPayload);

        if (response.success && response.data) {
          const newPackage = response.data;
          const newPackageId = newPackage._id || newPackage.id;

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
          Swal.fire('Error', response.message || 'Failed to create customized package', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving customized package:', error);
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-4 sm:p-6 shrink-0">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl">
                <Edit className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Edit Lead</h2>
                <p className="text-emerald-100 text-sm mt-0.5">{formData.name || 'Lead Details'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/15 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <EditSectionHeader
              expanded={expandedSections.personal}
              onToggle={toggleSection}
              icon={User}
              title="Personal Information"
              subtitle="Contact details of the lead"
              section="personal"
              gradient="from-blue-500 to-blue-600"
            />

            {expandedSections.personal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <EditInputField label="Full Name" required icon={User}>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="Enter full name"
                  />
                </EditInputField>

                <EditInputField label="Email Address" icon={Mail}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="email@example.com"
                  />
                </EditInputField>

                <EditInputField label="Contact Number" required icon={Phone}>
                  <PhoneInput
                    international
                    defaultCountry="LK"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value || "" })}
                    className="phone-input-wrapper"
                    placeholder="Enter phone number"
                  />
                </EditInputField>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Phone className="w-4 h-4 text-gray-400" />
                      WhatsApp Number
                    </label>
                    {formData.phone && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, whatsapp: formData.phone })}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
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
            )}
          </div>

          {/* Travel Details Section */}
          <div className="space-y-4">
            <EditSectionHeader
              expanded={expandedSections.travel}
              onToggle={toggleSection}
              icon={Plane}
              title="Travel Details"
              subtitle="Trip information and dates"
              section="travel"
              gradient="from-purple-500 to-purple-600"
            />

            {expandedSections.travel && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                <EditInputField label="Departure City" icon={MapPin}>
                  <LocationAutocomplete
                    value={formData.city}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                    placeholder="e.g., Colombo, Sri Lanka"
                    destination={formData.destination}
                  />
                </EditInputField>

                <EditInputField label="Destination" icon={MapPin}>
                  <DestinationSelector
                    value={formData.destination}
                    onChange={(event) =>
                      setFormData({ ...formData, destination: event.target.value })
                    }
                  />
                </EditInputField>

                <EditInputField label="Travel Date (Start)" icon={Calendar}>
                  <input
                    type="date"
                    value={formData.travelDate}
                    onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                  />
                </EditInputField>

                <EditInputField label="End Date" icon={Calendar}>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.travelDate || undefined}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                  />
                </EditInputField>

                <EditInputField label="Number of Travelers" icon={Users}>
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
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                    placeholder="e.g., 2"
                  />
                </EditInputField>

                <EditInputField label="Platform / Source" icon={Globe}>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                  >
                    <option value="">Select Platform</option>
                    <option value="Website Form">🌐 Website Form</option>
                    <option value="Social Media">📱 Social Media</option>
                    <option value="Phone Call">📞 Phone Call</option>
                    <option value="Referral">🤝 Referral</option>
                    <option value="Email">📧 Email</option>
                    <option value="Walk-in">🚶 Walk-in</option>
                  </select>
                </EditInputField>
              </div>
            )}
          </div>

          {/* Package & Assignment Section */}
          <div className="space-y-4">
            <EditSectionHeader
              expanded={expandedSections.package}
              onToggle={toggleSection}
              icon={Package}
              title="Package & Assignment"
              subtitle="Select package and sales representative"
              section="package"
              gradient="from-emerald-500 to-teal-600"
            />

            {expandedSections.package && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div className="space-y-3">
                  <EditInputField label="Package" icon={Package}>
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
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  </EditInputField>
                  {formData.package && (
                    <button
                      onClick={handleEditPackage}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-medium flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                      type="button"
                    >
                      <Edit className="w-4 h-4" />
                      Customize Package
                    </button>
                  )}
                </div>

                <EditInputField label="Sales Representative" icon={User}>
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
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  >
                    <option value="">Select Sales Rep</option>
                    {formData.salesRep && (!formData.assignedTo || formData.assignedTo === '__name_only') && (
                      <option value="__name_only">{formData.salesRep}</option>
                    )}
                    {salesReps.map((rep) => (
                      <option key={rep.id || rep._id} value={rep.id || rep._id}>{rep.name}</option>
                    ))}
                  </select>
                </EditInputField>
              </div>
            )}
          </div>

          {/* Remarks Section */}
          <div className="space-y-4">
            <EditSectionHeader
              expanded={expandedSections.remarks}
              onToggle={toggleSection}
              icon={MessageSquare}
              title="Remarks & Notes"
              subtitle="Add comments about this lead"
              section="remarks"
              gradient="from-amber-500 to-orange-500"
              count={remarks.length}
            />

            {expandedSections.remarks && (
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-4">
                {/* Add New Remark Button */}
                {!showAddRemark && (
                  <button
                    type="button"
                    onClick={() => setShowAddRemark(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-amber-300 text-amber-700 rounded-xl hover:bg-amber-100 hover:border-amber-400 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Remark
                  </button>
                )}

                {/* Add Remark Form */}
                {showAddRemark && (
                  <div className="p-4 bg-white rounded-xl border-2 border-amber-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">New Remark</label>
                    <textarea
                      value={newRemarkText}
                      onChange={(e) => setNewRemarkText(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none mb-3 transition-all"
                      rows={3}
                      placeholder="Enter your remark here..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddRemark(false);
                          setNewRemarkText('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      >
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
                          toast.success('Remark added');
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Add Remark
                      </button>
                    </div>
                  </div>
                )}

                {/* Remarks List */}
                <div className="space-y-3">
                  {remarks.length > 0 ? (
                    remarks.map((remark, index) => (
                      <div key={index} className="p-4 bg-white rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all group">
                        {editingRemarkIndex === index ? (
                          <div className="space-y-3">
                            <textarea
                              value={editRemarkText}
                              onChange={(e) => setEditRemarkText(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none transition-all"
                              rows={3}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRemarkIndex(null);
                                  setEditRemarkText('');
                                }}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                              >
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
                                  toast.success('Remark updated');
                                }}
                                className="px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-1.5"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-gray-800 flex-1">{remark.text}</p>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRemarkIndex(index);
                                    setEditRemarkText(remark.text || '');
                                  }}
                                  className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4 text-amber-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedRemarks = remarks.filter((_, i) => i !== index);
                                    setRemarks(updatedRemarks);
                                    toast.success('Remark deleted');
                                  }}
                                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                              <span>
                                {remark.date ? new Date(remark.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }) : 'No date'}
                              </span>
                              <span className="font-medium">#{index + 1}</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-xl border-2 border-dashed border-gray-200">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium">No remarks yet</p>
                      <p className="text-xs mt-1 text-gray-400">Add your first note</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Manual Itinerary Section */}
          <div className="space-y-4">
            <EditSectionHeader
              expanded={expandedSections.itinerary}
              onToggle={toggleSection}
              icon={Calendar}
              title="Manual Itinerary"
              subtitle={itineraryDays.length > 0 ? `${itineraryDays.length} day${itineraryDays.length > 1 ? 's' : ''} planned` : 'Custom day-by-day plan'}
              section="itinerary"
              gradient="from-indigo-500 to-violet-600"
              count={itineraryDays.length > 0 ? itineraryDays.length : undefined}
            />

            {expandedSections.itinerary && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">
                    Create a custom day-by-day itinerary for this lead
                  </p>
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
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                    >
                      <Calendar className="w-4 h-4" />
                      {showManualItinerary ? 'Hide Editor' : (itineraryDays.length > 0 ? 'Show Itinerary' : 'Create Itinerary')}
                    </button>
                  )}
                </div>

                {showManualItinerary && (
                  <div className="p-4 bg-white rounded-xl border border-indigo-200">
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
            )}
          </div>

          {/* Lifecycle Status & Pricing — only shown for existing leads */}
          {(lead?._id || lead?.id) && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Lifecycle Status</h3>
                  <LeadStatusBadge status={lead.lifecycleStatus ?? lead.status} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Trigger the parent's status change dialog
                    const event = new CustomEvent('open-status-change', { detail: lead });
                    window.dispatchEvent(event);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  Change Status
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Pricing</h3>
                <PricingSection
                  leadId={lead._id || lead.id}
                  financials={lead.financials}
                  onFinancialsUpdated={(updated) => {
                    if (lead._id || lead.id) {
                      lead.financials = updated;
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Flight & Hotel Bookings — only shown for existing leads */}
          {(lead?._id || lead?.id) && (
            <>
              <LeadFlightBookingsSection
                leadId={lead._id || lead.id}
                leadStatus={lead.lifecycleStatus ?? lead.status}
                itineraryDays={itineraryDays}
                travelDate={formData.travelDate}
                onUpdateDay={(dayNumber, updates) => {
                  setItineraryDays(prev =>
                    prev.map(day =>
                      day.dayNumber === dayNumber ? { ...day, ...updates } : day
                    )
                  );
                }}
              />

              <LeadHotelBookingsSection
                leadId={lead._id || lead.id}
                leadStatus={lead.lifecycleStatus ?? lead.status}
                itineraryDays={itineraryDays}
                travelDate={formData.travelDate}
                endDate={formData.endDate}
                onUpdateDay={(dayNumber, updates) => {
                  setItineraryDays(prev =>
                    prev.map(day =>
                      day.dayNumber === dayNumber ? { ...day, ...updates } : day
                    )
                  );
                }}
              />
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
            type="button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
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
