import { useState, useEffect } from 'react';
import {
  X, Plus, Loader2, Calendar, Copy, User, Mail, Phone,
  MapPin, Plane, Users, Globe, Package, MessageSquare,
  ChevronDown, ChevronUp, Sparkles, Save, ArrowRightLeft,
  Settings2, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { leadAPI, packageAPI, manualItineraryAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import LocationAutocomplete from './LocationAutocomplete';
import AirportAutocomplete from '../../../components/AirportAutocomplete';
import CountrySelect from '../../../components/CountrySelect';
import ItineraryEditor from '../../itinerary/components/ItineraryEditor';
import { createDefaultDay } from '../../itinerary/types/index.js';
import { FlightSelectionModal } from '../../shared';

// ── Module-level components (NOT inside NewLeadDialog — prevents remounting) ──

function InputField({ label, required, icon: Icon, children }) {
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

function SectionHeader({ icon: Icon, title, subtitle, section, gradient, expanded, onToggle }) {
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
          <h3 className="font-semibold">{title}</h3>
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

function FlightPreferenceCard({ prefs, onEdit, onRemove }) {
  if (!prefs) return null;
  return (
    <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {prefs.origin || '?'} → {prefs.destination || '?'}
            </div>
            <div className="text-xs text-gray-500">
              {prefs.cabinClass || 'Economy'}{prefs.airlinePreference ? ` · ${prefs.airlinePreference}` : ''}{prefs.departureTime ? ` · ${prefs.departureTime}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title="Edit preferences"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 hover:text-red-700 font-medium px-2"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

const NewLeadDialog = ({ isOpen, onClose, salesReps, onSuccess }) => {
  const { user } = useAuth();
  const isSalesRep = user?.role === 'salesRep';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showManualItinerary, setShowManualItinerary] = useState(false);
  const [itineraryDays, setItineraryDays] = useState([]);
  const [showTransferFlightModal, setShowTransferFlightModal] = useState(false);
  const [transferFlightType, setTransferFlightType] = useState('inbound'); // 'inbound' | 'outbound'
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    travel: true,
    package: true,
    remarks: false,
    itinerary: false,
    transfers: false,
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
    fromCountry: "",
    platform: "",
    travelDate: "",
    endDate: "",
    package: "",
    packageName: "",
    // Flight preference objects from template modal
    inboundFlightPrefs: null,
    outboundFlightPrefs: null,
    remarks: [{ text: "", date: "" }],
  });

  // Fetch packages when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
      if (isSalesRep && user?._id) {
        setFormData(prev => ({
          ...prev,
          assignedTo: user._id,
          salesRep: user.name || ''
        }));
      }
    }
  }, [isOpen, isSalesRep, user?._id]);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await packageAPI.getAll();

      if (response && response.success === true && response.data) {
        let packagesList = Array.isArray(response.data) ? response.data : [];
        packagesList = packagesList.filter(pkg =>
          pkg.isActive !== false && pkg.status === 'published'
        );
        setPackages(packagesList);
      } else {
        setPackages([]);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubmit = async (lifecycleStatus = 'NEW') => {
    try {
      setIsSubmitting(true);
      const assignedTo = isSalesRep && user?._id ? user._id : (formData.assignedTo || undefined);
      const salesRepName = isSalesRep && user?.name ? user.name : (formData.salesRep || undefined);

      const leadData = {
        name: formData.name?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        fromCountry: formData.fromCountry || undefined,
        whatsapp: formData.whatsapp || undefined,
        salesRep: salesRepName,
        assignedTo: assignedTo,
        platform: formData.platform || "Manual Entry",
        source: "manual",
        travelDate: formData.travelDate || undefined,
        endDate: formData.endDate || undefined,
        packageId: formData.package || undefined,
        packageName: formData.packageName || undefined,
        numberOfTravelers: formData.numberOfTravelers ? Number(formData.numberOfTravelers) : undefined,
        remarks: formData.remarks.filter((r) => r.text.trim() !== "").map(r => ({
          text: r.text.trim(),
          date: r.date || new Date().toISOString().split("T")[0]
        })),
        lifecycleStatus,
      };

      const response = await leadAPI.createLead(leadData);
      const leadId = response.data?._id || response.data?.id;

      if (showManualItinerary && itineraryDays.length > 0) {
        try {
          await manualItineraryAPI.createOrUpdate(leadId, itineraryDays);
        } catch (itineraryError) {
          console.error('Error saving manual itinerary:', itineraryError);
          toast.error('Lead created but itinerary save failed');
        }
      }

      toast.success('Lead created successfully');

      setFormData({
        name: "",
        email: "",
        phone: "",
        numberOfTravelers: 1,
        city: "",
        whatsapp: "",
        salesRep: "",
        assignedTo: "",
        fromCountry: "",
        platform: "",
        travelDate: "",
        endDate: "",
        package: "",
        packageName: "",
        inboundFlightPrefs: null,
        outboundFlightPrefs: null,
        remarks: [{ text: "", date: "" }],
      });
      setItineraryDays([]);
      setShowManualItinerary(false);

      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(`Failed to create lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-4 sm:p-6 shrink-0">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Create New Lead</h2>
                <p className="text-blue-100 text-sm mt-0.5">Fill in the details to add a new lead</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <SectionHeader
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
                <InputField label="Full Name" required icon={User}>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="Enter full name"
                  />
                </InputField>

                <InputField label="Email Address" icon={Mail}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="email@example.com"
                  />
                </InputField>

                <InputField label="Contact Number" required icon={Phone}>
                  <PhoneInput
                    international
                    defaultCountry="LK"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value || "" })}
                    className="phone-input-wrapper"
                    placeholder="Enter phone number"
                  />
                </InputField>

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
            <SectionHeader
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
                <InputField label="Departure City" icon={MapPin}>
                  <LocationAutocomplete
                    value={formData.city}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                    placeholder="e.g., Colombo, Sri Lanka"
                  />
                </InputField>

                <InputField label="Country of Residence" icon={Globe}>
                  <CountrySelect
                    value={formData.fromCountry}
                    onChange={(code) => setFormData({ ...formData, fromCountry: code })}
                    placeholder="Search country..."
                  />
                </InputField>

                <InputField label="Travel Date" icon={Calendar}>
                  <input
                    type="date"
                    value={formData.travelDate}
                    onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                  />
                </InputField>

                <InputField label="Return Date" icon={Calendar}>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.travelDate || undefined}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                  />
                </InputField>

                <InputField label="Number of Travelers" icon={Users}>
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
                </InputField>

                <InputField label="Lead Source" icon={Globe}>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                  >
                    <option value="">Select Source</option>
                    <option value="Website Form">🌐 Website Form</option>
                    <option value="Social Media">📱 Social Media</option>
                    <option value="Phone Call">📞 Phone Call</option>
                    <option value="Referral">🤝 Referral</option>
                    <option value="Email">📧 Email</option>
                    <option value="Walk-in">🚶 Walk-in</option>
                  </select>
                </InputField>
              </div>
            )}
          </div>

          {/* Package & Assignment Section */}
          <div className="space-y-4">
            <SectionHeader
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
                <InputField label="Package" icon={Package}>
                  <select
                    value={formData.package || ''}
                    onChange={async (e) => {
                      const packageId = e.target.value;
                      const selectedPackage = packages.find(pkg => (pkg._id || pkg.id) === packageId);
                      setFormData({
                        ...formData,
                        package: packageId,
                        packageName: selectedPackage?.name || '',
                        destination: selectedPackage?.destination || formData.destination
                      });

                      // Load package itinerary into the manual itinerary editor
                      if (packageId && selectedPackage) {
                        try {
                          const response = await packageAPI.getById(packageId);
                          if (response.success || response.status === 'success') {
                            const pkg = response.data?.data || response.data;
                            let days = [];
                            if (pkg?.itinerary?.days) {
                              days = pkg.itinerary.days;
                            } else if (Array.isArray(pkg?.days)) {
                              days = pkg.days;
                            }
                            if (days.length > 0) {
                              setItineraryDays(days);
                              setShowManualItinerary(true);
                              setExpandedSections(prev => ({ ...prev, itinerary: true }));
                            }
                          }
                        } catch (err) {
                          console.error('Error loading package itinerary:', err);
                        }
                      }
                    }}
                    disabled={loadingPackages}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                </InputField>

                <InputField label="Sales Representative" icon={User}>
                  {!isSalesRep ? (
                    <select
                      value={formData.assignedTo || ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        const rep = salesReps.find(r => r.id === id);
                        setFormData({ ...formData, assignedTo: id, salesRep: rep ? rep.name : '' });
                      }}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
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
                      className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 cursor-not-allowed"
                    />
                  )}
                </InputField>
              </div>
            )}
          </div>

          {/* Remarks Section */}
          <div className="space-y-4">
            <SectionHeader
              expanded={expandedSections.remarks}
              onToggle={toggleSection}
              icon={MessageSquare}
              title="Remarks & Notes"
              subtitle="Add optional comments about this lead"
              section="remarks"
              gradient="from-amber-500 to-orange-500"
            />

            {expandedSections.remarks && (
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
                {formData.remarks.map((remark, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={remark.text}
                      onChange={(e) => updateRemark(index, "text", e.target.value)}
                      className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                      placeholder={`Remark ${index + 1}`}
                    />
                    <input
                      type="date"
                      value={remark.date}
                      onChange={(e) => updateRemark(index, "date", e.target.value)}
                      className="w-full sm:w-44 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    />
                    {formData.remarks.length > 1 && (
                      <button
                        onClick={() => removeRemark(index)}
                        className="p-3 text-red-500 hover:bg-red-100 rounded-xl transition-colors"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addRemarkField}
                  className="w-full px-4 py-3 border-2 border-dashed border-amber-300 text-amber-700 rounded-xl hover:bg-amber-100 hover:border-amber-400 transition-colors flex items-center justify-center gap-2 font-medium"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Remark
                </button>
              </div>
            )}
          </div>

          {/* Manual Itinerary Section */}
          <div className="space-y-4">
            <SectionHeader
              expanded={expandedSections.itinerary}
              onToggle={toggleSection}
              icon={Calendar}
              title="Manual Itinerary"
              subtitle="Optional: Create a custom itinerary"
              section="itinerary"
              gradient="from-indigo-500 to-violet-600"
            />

            {expandedSections.itinerary && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">
                    Create a custom day-by-day itinerary for this lead
                  </p>
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
                    {showManualItinerary ? 'Hide Editor' : 'Open Editor'}
                  </button>
                </div>

                {showManualItinerary && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-200">
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
          {/* Transfer Flights Section */}
          <div className="space-y-4">
            <SectionHeader
              expanded={expandedSections.transfers}
              onToggle={toggleSection}
              icon={ArrowRightLeft}
              title="Transfer Flights"
              subtitle="Optional: flight route preferences to reach the trip and return home"
              section="transfers"
              gradient="from-cyan-500 to-blue-600"
            />

            {expandedSections.transfers && (
              <div className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100 space-y-4">
                {/* Inbound Transfer */}
                <div className="bg-white rounded-xl border border-cyan-200 p-4">
                  <h4 className="text-sm font-semibold text-cyan-800 mb-3">Inbound Transfer — Getting to the Trip</h4>
                  {formData.inboundFlightPrefs ? (
                    <FlightPreferenceCard
                      prefs={formData.inboundFlightPrefs}
                      onEdit={() => {
                        setTransferFlightType('inbound');
                        setShowTransferFlightModal(true);
                      }}
                      onRemove={() => setFormData({ ...formData, inboundFlightPrefs: null })}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTransferFlightType('inbound');
                        setShowTransferFlightModal(true);
                      }}
                      className="w-full py-3 border-2 border-dashed border-cyan-300 text-cyan-700 rounded-xl hover:bg-cyan-50 hover:border-cyan-400 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Inbound Flight Preferences
                    </button>
                  )}
                </div>

                {/* Outbound Transfer */}
                <div className="bg-white rounded-xl border border-cyan-200 p-4">
                  <h4 className="text-sm font-semibold text-cyan-800 mb-3">Outbound Transfer — Returning Home</h4>
                  {formData.outboundFlightPrefs ? (
                    <FlightPreferenceCard
                      prefs={formData.outboundFlightPrefs}
                      onEdit={() => {
                        setTransferFlightType('outbound');
                        setShowTransferFlightModal(true);
                      }}
                      onRemove={() => setFormData({ ...formData, outboundFlightPrefs: null })}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTransferFlightType('outbound');
                        setShowTransferFlightModal(true);
                      }}
                      className="w-full py-3 border-2 border-dashed border-cyan-300 text-cyan-700 rounded-xl hover:bg-cyan-50 hover:border-cyan-400 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Outbound Flight Preferences
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transfer Flight Preference Modal (template mode — saves preferences only, no booking) */}
        <FlightSelectionModal
          isOpen={showTransferFlightModal}
          onClose={() => setShowTransferFlightModal(false)}
          mode="template"
          initialData={transferFlightType === 'inbound' ? (formData.inboundFlightPrefs || {}) : (formData.outboundFlightPrefs || {})}
          onSelectTemplate={(prefs) => {
            if (transferFlightType === 'inbound') {
              setFormData({ ...formData, inboundFlightPrefs: prefs });
            } else {
              setFormData({ ...formData, outboundFlightPrefs: prefs });
            }
            setShowTransferFlightModal(false);
          }}
        />

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit('DRAFTING')}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
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
                Save & Draft
              </>
            )}
          </button>
          <button
            onClick={() => handleSubmit('NEW')}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            type="button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Lead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewLeadDialog;
