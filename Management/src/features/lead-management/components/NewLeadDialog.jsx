import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
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
    numberOfTravelers: 1,
    city: "",
    whatsapp: "",
    salesRep: "",
    assignedTo: "",
    destination: "",
    platform: "",
    travelDate: "",
    endDate: "",
    time: "",
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
        
        // Filter to only show active packages
        packagesList = packagesList.filter(pkg => pkg.isActive !== false);
        
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
        phone: formData.phone?.trim() || undefined,
        city: formData.city || undefined,
        whatsapp: formData.whatsapp || undefined,
        salesRep: salesRepName,
        assignedTo: assignedTo,
        destination: formData.destination || undefined,
        platform: formData.platform || "Manual Entry",
        source: "manual",
        travelDate: formData.travelDate || undefined,
        endDate: formData.endDate || undefined,
        time: formData.time || undefined,
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
        time: "",
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
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Lead</h2>
            <p className="text-sm text-gray-600 mt-1">Fill in all lead information</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          >
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact No.</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1-555-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Travelers</label>
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
              <LocationAutocomplete
                value={formData.city}
                onChange={(value) => setFormData({ ...formData, city: value })}
                placeholder="e.g., Colombo, Sri Lanka"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail ID</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1-555-0000"
              />
            </div>
            {!isSalesRep && (
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
            )}
            {isSalesRep && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Package</label>
              <select
                value={formData.package || ''}
                onChange={(e) => {
                  const packageId = e.target.value;
                  const selectedPackage = packages.find(pkg => (pkg._id || pkg.id) === packageId);
                  setFormData({ 
                    ...formData, 
                    package: packageId,
                    packageName: selectedPackage?.name || '',
                    destination: selectedPackage?.destination || formData.destination // Auto-fill destination if package has one
                  });
                }}
                disabled={loadingPackages}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                <p className="text-xs text-gray-500 mt-1">No packages available (Found {packages.length} packages)</p>
              )}
              {packages.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{packages.length} package(s) available</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
              <DestinationSelector
                value={formData.destination}
                onChange={(event) =>
                  setFormData({ ...formData, destination: event.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date (Start)</label>
              <input
                type="date"
                value={formData.travelDate}
                onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.travelDate || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 10:30 AM or 14:00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <div className="space-y-2">
              {formData.remarks.map((remark, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={remark.text}
                    onChange={(e) => updateRemark(index, "text", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Remark ${index + 1}`}
                  />
                  <input
                    type="date"
                    value={remark.date}
                    onChange={(e) => updateRemark(index, "date", e.target.value)}
                    className="w-40 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.remarks.length > 1 && (
                    <button
                      onClick={() => removeRemark(index)}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addRemarkField}
                className="w-full px-3 py-2 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Remark
              </button>
            </div>
          </div>

          {/* Manual Itinerary Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Manual Itinerary</h3>
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

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Lead"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewLeadDialog;

