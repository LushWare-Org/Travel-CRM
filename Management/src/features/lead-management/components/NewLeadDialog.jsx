import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Calendar, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { leadAPI, packageAPI, manualItineraryAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import LocationAutocomplete from './LocationAutocomplete';
import ItineraryEditor from '../../itinerary/components/ItineraryEditor';
import DestinationSelector from '../../itinerary/components/DestinationSelector';
import { createDefaultDay } from '../../itinerary/types/index.js';

const NewLeadDialog = ({ isOpen, onClose, salesReps, onSuccess }) => {
  const { user } = useAuth();
  const isSalesRep = user?.role === 'salesRep';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showManualItinerary, setShowManualItinerary] = useState(false);
  const [itineraryDays, setItineraryDays] = useState([]);
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
    remarks: [{ text: "", date: "" }],
  });

  // Fetch packages when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
      // Auto-assign to current user if they are a sales rep
      if (isSalesRep && user?._id) {
        setFormData(prev => ({
          ...prev,
          assignedTo: user._id,
          salesRep: user.name || ''
        }));
      }
    }
  }, [isOpen, isSalesRep, user]);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      
      // Fetch all packages (without isActive filter since it needs to be boolean, we'll filter client-side)
      // Validator only allows limit up to 100, so we'll fetch up to 100 and filter client-side
      const response = await packageAPI.getAll();
      
      if (response && response.success === true && response.data) {
        // response.data is already the packages array from the controller
        let packagesList = Array.isArray(response.data) ? response.data : [];
        
        // Filter to only show active and published packages
        packagesList = packagesList.filter(pkg => 
          pkg.isActive !== false && pkg.status === 'published'
        );
        
        setPackages(packagesList);
      } else {
        console.error('Unexpected response format:', response);
        setPackages([]);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
      // Only show error if it's not an auth issue (401/403)
      if (error.message && !error.message.includes('401') && !error.message.includes('403')) {
        toast.error('Failed to load packages');
      }
    } finally {
      setLoadingPackages(false);
    }
  };

  const addRemarkField = () => {
    setFormData({
      ...formData,
      remarks: [...formData.remarks, { text: "", date: "" }],
    });
  };

  const updateRemark = (index, field, value) => {
    const updatedRemarks = [...formData.remarks];
    updatedRemarks[index] = { ...updatedRemarks[index], [field]: value };
    setFormData({
      ...formData,
      remarks: updatedRemarks,
    });
  };

  const removeRemark = (index) => {
    const updatedRemarks = formData.remarks.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      remarks: updatedRemarks.length > 0 ? updatedRemarks : [{ text: "", date: "" }],
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      // If sales rep, always assign to themselves
      const assignedTo = isSalesRep && user?._id ? user._id : (formData.assignedTo || undefined);
      const salesRepName = isSalesRep && user?.name ? user.name : (formData.salesRep || undefined);
      
      const leadData = {
        name: formData.name?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        whatsapp: formData.whatsapp || undefined,
        salesRep: salesRepName,
        assignedTo: assignedTo,
        destination: formData.destination || undefined,
        platform: formData.platform || "Manual Entry",
        source: "manual",
        travelDate: formData.travelDate || undefined,
        endDate: formData.endDate || undefined,
        package: formData.package || undefined,
        packageName: formData.packageName || undefined,
        numberOfTravelers: formData.numberOfTravelers ? Number(formData.numberOfTravelers) : undefined,
        remarks: formData.remarks.filter((r) => r.text.trim() !== "").map(r => ({
          text: r.text.trim(),
          date: r.date || new Date().toISOString().split("T")[0]
        })),
        status: "new"
      };

      const response = await leadAPI.createLead(leadData);
      const leadId = response.data?._id || response.data?.id;

      // Save manual itinerary if days exist
      if (showManualItinerary && itineraryDays.length > 0) {
        try {
          await manualItineraryAPI.createOrUpdate(leadId, itineraryDays);
        } catch (itineraryError) {
          console.error('Error saving manual itinerary:', itineraryError);
          // Don't fail the entire operation if itinerary save fails
          toast.error('Lead created but itinerary save failed');
        }
      }

      toast.success('Lead created successfully');
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        numberOfTravelers: 1,
        city: "",
        whatsapp: "",
        salesRep: "",
        assignedTo: "",
        destination: "",
        platform: "",
        travelDate: "",
        endDate: "",
        package: "",
        packageName: "",
        remarks: [{ text: "", date: "" }],
      });
      setItineraryDays([]);
      setShowManualItinerary(false);

      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`Failed to create lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center rounded-t-xl shadow-lg z-10">
          <div>
            <h2 className="text-2xl font-bold">Add New Lead</h2>
            <p className="text-sm text-blue-100 mt-1">Fill in all lead information to create a new lead</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group"
          >
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
                  <option value="Email">Email</option>
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
                  {packages && packages.length > 0 ? (
                    packages.map((pkg) => (
                      <option key={pkg._id || pkg.id} value={pkg._id || pkg.id}>
                        {pkg.name || 'Unnamed Package'}
                      </option>
                    ))
                  ) : (
                    !loadingPackages && <option value="" disabled>No packages found</option>
                  )}
                </select>
                {packages.length === 0 && !loadingPackages && (
                  <p className="text-xs text-gray-500 mt-1">No packages available</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sales Representative
                </label>
                {!isSalesRep ? (
                  <select
                    value={formData.assignedTo || ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      const rep = salesReps.find(r => r.id === id);
                      setFormData({ ...formData, assignedTo: id, salesRep: rep ? rep.name : '' });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">Select Sales Rep</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>{rep.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
              <p className="text-xs text-gray-500 mt-1">Optional remarks and notes</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
              <div className="space-y-3">
                {formData.remarks.map((remark, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={remark.text}
                      onChange={(e) => updateRemark(index, "text", e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder={`Remark ${index + 1}`}
                    />
                    <input
                      type="date"
                      value={remark.date}
                      onChange={(e) => updateRemark(index, "date", e.target.value)}
                      className="w-40 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    {formData.remarks.length > 1 && (
                      <button
                        onClick={() => removeRemark(index)}
                        className="px-3 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addRemarkField}
                  className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 font-medium"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Remark
                </button>
              </div>
            </div>
          </div>

          {/* Manual Itinerary Section */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manual Itinerary</h3>
                <p className="text-xs text-gray-500 mt-1">Optional: Create a custom itinerary for this lead</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManualItinerary(!showManualItinerary);
                  if (!showManualItinerary && itineraryDays.length === 0) {
                    setItineraryDays([createDefaultDay(1)]);
                  }
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2 shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                {showManualItinerary ? 'Hide Itinerary' : 'Add Manual Itinerary'}
              </button>
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Lead...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewLeadDialog;

