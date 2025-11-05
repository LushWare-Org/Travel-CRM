import { useState, useEffect } from 'react';
import { X, Mail, Phone, Save, Loader2, Edit, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { leadAPI, packageAPI, manualItineraryAPI } from '../../../services/api';
import { PackageFormModal, NewEditPackageForm } from '../../../features/itinerary/components';
import { useImageUpload } from '../../../features/itinerary/hooks';
import { uploadPackageImages } from '../../../services/cloudinaryService';
import LocationAutocomplete from './LocationAutocomplete';
import ItineraryEditor from '../../itinerary/components/ItineraryEditor';
import LocationAutocompleteMulti from './LocationAutocompleteMulti';
import { createDefaultDay } from '../../itinerary/types/index.js';

const EditLeadDialog = ({ isOpen, onClose, lead, salesReps, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editPackageData, setEditPackageData] = useState(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const { images, setImages, removeImage } = useImageUpload();
  const [showManualItinerary, setShowManualItinerary] = useState(false);
  const [itineraryDays, setItineraryDays] = useState([]);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    whatsapp: "",
    salesRep: "",
    assignedTo: "",
    destination: "",
    platform: "",
    travelDate: "",
    time: "",
    package: "",
    packageName: "",
    status: "new",
  });

  // Fetch packages when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await packageAPI.getAll();
      
      if (response && response.success === true && response.data) {
        let packagesList = Array.isArray(response.data) ? response.data : [];
        packagesList = packagesList.filter(pkg => pkg.isActive !== false);
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
      setFormData({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        city: lead.city || "",
        whatsapp: lead.whatsapp || "",
        salesRep: lead.salesRep || lead.adviser || "",
        assignedTo: lead.assignedTo?._id || lead.assignedTo || "",
        destination: lead.destination || "",
        platform: lead.platform || "",
        travelDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : "",
        time: lead.time || "",
        package: lead.package?._id || lead.package || "",
        packageName: lead.packageName || lead.package?.name || "",
        status: lead.status || "new",
      });

      // Load manual itinerary if exists
      loadManualItinerary();
    }
  }, [lead]);

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
      const updateData = {
        name: formData.name?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        city: formData.city || undefined,
        whatsapp: formData.whatsapp || undefined,
        salesRep: formData.salesRep || undefined,
        assignedTo: formData.assignedTo || undefined,
        destination: formData.destination || undefined,
        platform: formData.platform || undefined,
        travelDate: formData.travelDate || undefined,
        time: formData.time || undefined,
        package: formData.package || null,
        packageName: formData.packageName || null,
        status: formData.status || 'new',
      };
      await leadAPI.updateLead(lead._id || lead.id, updateData);

      // Save manual itinerary if days exist
      const leadId = lead._id || lead.id;
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

    // Show confirmation dialog (Phase 6: UI/UX refinement)
    const result = await Swal.fire({
      title: 'Customize Package?',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>This will create a new customized package.</strong></p>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>The original package will remain unchanged</li>
            <li>A new package will be created for this lead</li>
            <li>You can modify all details including itinerary days</li>
          </ul>
        </div>
      `,
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
      // Fetch the package data
      const response = await packageAPI.getById(formData.package);
      if (response.success && response.data) {
        const pkg = response.data;
        
        // Fetch itinerary if it exists
        let days = [];
        if (pkg.itinerary?._id || pkg.itinerary) {
          // Get itinerary days if available
          days = pkg.itinerary.days || [];
        } else if (pkg.days) {
          days = pkg.days;
        }

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
        const originalPackageId = pkg._id || pkg.id;
        const editData = {
          ...pkg,
          _id: undefined, // Remove ID so it creates a new package
          id: undefined,
          name: `${pkg.name} (Customized)`, // Add indicator
          days: [...days],
          images: [...formattedImages],
          originalPackageId: originalPackageId, // Store for later use in save
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
    try {
      if (isUploadingImages) {
        Swal.fire('Please Wait', 'Images are still uploading. Please wait...', 'info');
        return;
      }

      // Validate required fields
      const requiredFields = {
        name: 'Package Name',
        category: 'Category',
        destination: 'Destination',
        description: 'Description'
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([key]) => !updatedPackageData[key])
        .map(([, label]) => label);

      if (missingFields.length > 0) {
        Swal.fire('Missing Required Fields', `Please fill in: ${missingFields.join(', ')}`, 'error');
        return;
      }

      // Clean up days data
      const cleanDays = (updatedPackageData.days || [])
        .filter(day => day.title && day.description)
        .map(day => {
          const cleanDay = { ...day };
          if (!cleanDay.transport || cleanDay.transport === '') {
            delete cleanDay.transport;
          }
          if (cleanDay.accommodation) {
            if (!cleanDay.accommodation.type || cleanDay.accommodation.type === '') {
              delete cleanDay.accommodation.type;
            }
            const hasValidData = Object.values(cleanDay.accommodation).some(v => v && v !== '');
            if (!hasValidData) {
              delete cleanDay.accommodation;
            }
          }
          return cleanDay;
        });

      // Filter valid images
      const validImages = images.filter(img => !img.isTemp && img.url && img.public_id);

      // Prepare data for NEW package creation (not updating original)
      // Phase 5: Add versioning/tracking fields
      const originalPackageId = updatedPackageData.originalPackageId || formData.package;
      const newPackageData = {
        ...updatedPackageData,
        _id: undefined, // Ensure it's a new package
        id: undefined,
        originalPackageId: undefined, // Remove from data before sending
        price: parseFloat(updatedPackageData.price) || 0,
        duration: parseInt(updatedPackageData.duration, 10) || 1,
        maxGroupSize: parseInt(updatedPackageData.maxGroupSize, 10) || 10,
        days: cleanDays,
        images: validImages,
        // Phase 5: Add tracking fields
        customizedForLead: lead._id || lead.id,
        originalPackage: originalPackageId,
        customizedBy: undefined, // Will be set by backend from req.user
        customizationNotes: `Customized from package "${updatedPackageData.name?.replace(' (Customized)', '') || 'Original'}" for lead "${lead.name || lead._id}"`,
      };

      // Create NEW package (not updating the original)
      const response = await packageAPI.create(newPackageData);

      if (response.success && response.data) {
        const newPackage = response.data;
        
        // Update lead to point to the new customized package
        await leadAPI.updateLead(lead._id || lead.id, {
          customizedPackage: newPackage._id || newPackage.id,
          packageName: newPackage.name,
          // Keep package field for backward compatibility
          package: null, // Clear regular package reference
        });

        // Update local form data
        setFormData(prev => ({
          ...prev,
          package: newPackage._id || newPackage.id,
          packageName: newPackage.name,
        }));

        setShowEditPackageDialog(false);
        setEditPackageData(null);
        setImages([]);
        
        Swal.fire('Success', 'Package customized and saved! A new package has been created.', 'success');
        onSuccess?.(); // Refresh leads
      } else {
        Swal.fire('Error', response.message || 'Failed to create customized package', 'error');
      }
    } catch (error) {
      console.error('Error saving customized package:', error);
      Swal.fire('Error', error.message || 'Failed to save customized package', 'error');
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Lead - {formData.name}</h2>
            <p className="text-gray-600 mt-1">Update lead information</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group">
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact No.</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
              <LocationAutocomplete
                value={formData.city}
                onChange={(value) => setFormData({...formData, city: value})}
                placeholder="e.g., Colombo, Sri Lanka"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail ID</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep</label>
              <select
                value={formData.assignedTo || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  const rep = salesReps.find(r => r.id === id);
                  setFormData({ ...formData, assignedTo: id, salesRep: rep ? rep.name : '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Sales Rep</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>{rep.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Package</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{loadingPackages ? 'Loading packages...' : 'Select Package'}</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id || pkg.id} value={pkg._id || pkg.id}>
                      {pkg.name || 'Unnamed Package'}
                    </option>
                  ))}
                </select>
                {formData.package && (
                  <button
                    onClick={handleEditPackage}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 relative"
                    title="Customize Package & Itinerary (Creates New Package)"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Customize Package</span>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white" title="Will create a new package"></span>
                  </button>
                )}
              </div>
              {packages.length === 0 && !loadingPackages && (
                <p className="text-xs text-gray-500 mt-1">No packages available</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Platform</option>
                <option value="Website Form">Website Form</option>
                <option value="Social Media">Social Media</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Referral">Referral</option>
                <option value="Email">Email</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date</label>
              <input
                type="date"
                value={formData.travelDate}
                onChange={(e) => setFormData({...formData, travelDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="quoted">Quoted</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
              <option value="not-interested">Not Interested</option>
            </select>
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
                  {showManualItinerary ? 'Hide Itinerary' : 'Add Manual Itinerary'}
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
                  useLocationAutocomplete={true}
                  LocationAutocompleteComponent={LocationAutocompleteMulti}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <a
              href={`mailto:${formData.email}`}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
            <a
              href={`https://wa.me/${formData.whatsapp?.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              WhatsApp
            </a>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
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
          subtitle={
            <div className="space-y-1 mt-2">
              <p className="text-sm font-semibold text-purple-700">⚠️ NEW PACKAGE WILL BE CREATED</p>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                <li>The original package will remain unchanged</li>
                <li>This lead will be linked to the new customized package</li>
                <li>You can modify all details including itinerary, price, and inclusions</li>
              </ul>
            </div>
          }
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
          />
        </PackageFormModal>
      )}
    </div>
  );
};

export default EditLeadDialog;

