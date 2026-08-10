import { useState, useEffect, useRef } from 'react';
import {
  X, Mail, Phone, Save, Loader2, Edit, Calendar, MessageSquare, Plus, Copy,
  User, MapPin, Plane, Users, Globe, Package, ChevronDown, ChevronUp,
  Trash2, Check, Lock, RefreshCw, XCircle, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI, packageAPI } from '../../../services/api';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import LocationAutocomplete from './LocationAutocomplete';
import ItineraryEditor from '../../itinerary/components/ItineraryEditor';
import DestinationSelector from '../../itinerary/components/DestinationSelector';
import { createDefaultDay } from '../../itinerary/types/index.js';
import { reconcileFlightsForSave } from '../../itinerary/utils/flightSync';
import LeadFlightBookingsSection from './LeadFlightBookingsSection';
import LeadStatusBadge from './LeadStatusBadge';
import PricingSection from './PricingSection';
import { toEditorDays } from '../utils/toEditorDays';
import { isLeadFieldLocked } from '../utils/leadLocks';

// A lead can hold many packages at once, plus at most one manual
// (from-scratch) itinerary slot — this sentinel is the "add" picker's third
// option alongside real packages.
const MANUAL_ITINERARY_VALUE = '__manual__';

const emptySelectionPricing = {
  marginType: null,
  marginValue: 0,
  depositType: 'PERCENTAGE',
  depositValue: 30,
  discountType: 'none',
  discountValue: 0,
  serviceChargeRate: 0,
};

// Maps a /leads/:id/packages selection (server shape, materialized or
// derived) into the local editor-tab shape.
function mapSelection(raw) {
  return {
    id: raw.id,
    packageId: raw.packageId || null,
    isManual: Boolean(raw.isManual),
    packageName: raw.packageName || null,
    currentQuoteId: raw.currentQuoteId || null,
    isMaterialized: Boolean(raw.isMaterialized),
    itineraryDays: toEditorDays(raw.itineraryDays || []),
    pricingSettings: {
      marginType: raw.pricing?.marginType || null,
      marginValue: raw.pricing?.marginValue ?? 0,
      depositType: raw.pricing?.depositType || 'PERCENTAGE',
      depositValue: raw.pricing?.depositValue ?? 30,
      discountType: raw.pricing?.discountType || 'none',
      discountValue: raw.pricing?.discountValue ?? 0,
      serviceChargeRate: raw.pricing?.serviceChargeRate ?? 0,
    },
    dirty: false,
  };
}

// ── Module-level components (prevents remounting on re-render) ──

function EditInputField({ label, required, icon: Icon, locked, children }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
        {locked && (
          <span className="flex items-center gap-1 text-xs text-amber-600 font-normal" title="Locked after QUOTED — move the lead back to DRAFTING to edit">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        )}
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

const emptyFormData = {
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
  lifecycleStatus: "NEW",
};

const EditLeadDialog = ({ isOpen, onClose, lead, salesReps, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showItineraryEditor, setShowItineraryEditor] = useState(false);
  // One entry per attached package (plus the manual slot, if any) — see
  // mapSelection() for the shape. `dirty` marks a tab whose itinerary/pricing
  // has been edited locally and needs saving.
  const [selections, setSelections] = useState([]);
  const [activeSelectionId, setActiveSelectionId] = useState(null);
  const [addingPackage, setAddingPackage] = useState(false);
  const [refreshingSelectionId, setRefreshingSelectionId] = useState(null);
  // Bumped whenever a transfer flight is added/edited/removed — those persist
  // straight to the DB and never touch itineraryDays/pricingSettings, so the
  // live pricing preview has no other way to know it needs to recompute.
  const [pricingRefreshToken, setPricingRefreshToken] = useState(0);
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
  });
  const [formData, setFormData] = useState(emptyFormData);

  // Snapshot of everything the dialog loaded, so Cancel can revert in place
  // (the dialog stays mounted across open/close cycles, so React alone won't
  // reset it if the `lead` prop reference happens not to change).
  const snapshotRef = useRef(null);

  const isLocked = isLeadFieldLocked(lead?.lifecycleStatus);
  const activeSelection = selections.find(s => s.id === activeSelectionId) || null;

  // Day-linked flight preferences live in day.flights[] but only day.transports[]
  // feeds cost lines — reconcile flights into a priced transport row (real price
  // wins when set, else the existing manual transport cost is preserved) before
  // this reaches pricing calculation or persistence. Same transform the package
  // editor already applies at save time (Management/src/features/itinerary/services/apiService.js).
  const reconcileDays = (days) => (days || []).map(day => ({
    ...day,
    transports: reconcileFlightsForSave({ flights: day.flights || [], transports: day.transports || [] }),
  }));

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
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await packageAPI.getAll();

      if (response && response.success === true && response.data) {
        const packagesList = (Array.isArray(response.data) ? response.data : [])
          .filter((pkg) => pkg.isActive !== false);
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
      loadLeadIntoForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, salesReps]);

  const loadLeadIntoForm = async () => {
    const leadId = lead._id || lead.id;
    const assignedToId = lead.assignedTo?._id || lead.assignedTo || lead.assignedTo?.id || '';
    const salesRepName = lead.salesRep || lead.adviser || '';

    const nextFormData = {
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
      lifecycleStatus: lead.lifecycleStatus || 'NEW',
    };
    setFormData(nextFormData);
    setRemarks(lead.remarks || []);

    if (!leadId) {
      setSelections([]);
      setActiveSelectionId(null);
      snapshotRef.current = { formData: nextFormData, remarks: lead.remarks || [], selections: [] };
      return;
    }

    try {
      const selRes = await leadAPI.getPackageSelections(leadId);
      const rawSelections = selRes?.data?.data || selRes?.data || [];
      const nextSelections = rawSelections.map(mapSelection);
      setSelections(nextSelections);
      setActiveSelectionId(nextSelections[0]?.id ?? null);

      snapshotRef.current = {
        formData: nextFormData,
        remarks: lead.remarks || [],
        selections: nextSelections,
        activeSelectionId: nextSelections[0]?.id ?? null,
      };
    } catch (error) {
      console.error('Error loading lead package selections:', error);
      setSelections([]);
      setActiveSelectionId(null);
      snapshotRef.current = { formData: nextFormData, remarks: lead.remarks || [], selections: [] };
    }
  };

  const handleCancel = () => {
    const snapshot = snapshotRef.current;
    if (snapshot) {
      setFormData(snapshot.formData);
      setRemarks(snapshot.remarks);
      setSelections(snapshot.selections || []);
      setActiveSelectionId(snapshot.activeSelectionId ?? (snapshot.selections?.[0]?.id ?? null));
    }
    onClose();
  };

  const updateActiveSelection = (patch) => {
    setSelections(prev => prev.map(s => (
      s.id === activeSelectionId ? { ...s, ...patch, dirty: true } : s
    )));
  };

  const handleAddPackage = async (value) => {
    if (!lead || !value) return;
    const leadId = lead._id || lead.id;
    const isManual = value === MANUAL_ITINERARY_VALUE;

    try {
      const createRes = await leadAPI.addPackageSelection(leadId, isManual ? { isManual: true } : { packageId: value });
      const createdId = (createRes?.data?.data || createRes?.data)?.id;
      const detailRes = await leadAPI.getPackageSelection(leadId, createdId);
      const detail = detailRes?.data?.data || detailRes?.data;
      const newSelection = mapSelection(detail);
      setSelections(prev => [...prev, newSelection]);
      setActiveSelectionId(newSelection.id);
      setAddingPackage(false);
      setShowItineraryEditor(true);
      toast.success(isManual ? 'Manual itinerary added' : 'Package added');
    } catch (err) {
      toast.error(`Failed to add package: ${err.message}`);
    }
  };

  const handleRemoveSelection = async (selection) => {
    if (!lead || !selection) return;
    if (!window.confirm(`Remove ${selection.isManual ? 'the manual itinerary' : (selection.packageName || 'this package')} from this lead?`)) {
      return;
    }
    const leadId = lead._id || lead.id;
    try {
      await leadAPI.removePackageSelection(leadId, selection.id);
      setSelections(prev => {
        const next = prev.filter(s => s.id !== selection.id);
        if (activeSelectionId === selection.id) {
          setActiveSelectionId(next[0]?.id ?? null);
        }
        return next;
      });
      toast.success('Package removed');
    } catch (err) {
      toast.error(`Failed to remove package: ${err.message}`);
    }
  };

  const handleRefreshSelection = async (selection, force = false) => {
    if (!lead || !selection) return;
    const leadId = lead._id || lead.id;
    setRefreshingSelectionId(selection.id);
    try {
      await leadAPI.refreshPackageSelection(leadId, selection.id, force);
      const detailRes = await leadAPI.getPackageSelection(leadId, selection.id);
      const detail = detailRes?.data?.data || detailRes?.data;
      setSelections(prev => prev.map(s => (s.id === selection.id ? mapSelection(detail) : s)));
      toast.success('Reverted to the original package');
    } catch (err) {
      if (err.status === 409 && err.data?.code === 'REFRESH_BLOCKED_QUOTED') {
        const confirmed = window.confirm(
          'This package has already been quoted — refreshing will make the saved itinerary no longer match what the customer was quoted. Continue?'
        );
        if (confirmed) {
          setRefreshingSelectionId(null);
          await handleRefreshSelection(selection, true);
          return;
        }
      } else {
        toast.error(`Failed to refresh: ${err.message}`);
      }
    } finally {
      setRefreshingSelectionId(null);
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

      // Persist each edited selection's itinerary + pricing before the
      // general lead update, mirroring the old single-package flow.
      const dirtySelections = selections.filter(s => s.dirty);
      for (const selection of dirtySelections) {
        try {
          await leadAPI.updatePackageSelectionItinerary(leadId, selection.id, {
            days: reconcileDays(selection.itineraryDays),
            pricing: selection.pricingSettings,
          });
        } catch (itineraryError) {
          console.error('Error saving itinerary:', itineraryError);
          toast.error(`Failed to save itinerary for ${selection.packageName || 'the manual itinerary'}`);
          setIsSubmitting(false);
          return;
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
        lifecycleStatus: formData.lifecycleStatus || 'NEW',
        remarks: remarks.length > 0 ? remarks : undefined,
      };
      if (formData.assignedTo && formData.assignedTo !== '' && formData.assignedTo !== '__name_only') {
        const rep = salesReps.find(r => r.id === formData.assignedTo || r._id === formData.assignedTo);
        updateData.assignedTo = formData.assignedTo;
        updateData.salesRep = rep ? rep.name : formData.salesRep || undefined;
      }
      await leadAPI.updateLead(leadId, updateData);

      toast.success('Lead updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(`Failed to update lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
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
              onClick={handleCancel}
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
                    aria-label="Full Name"
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

                <EditInputField label="Travel Date (Start)" icon={Calendar} locked={isLocked}>
                  <input
                    type="date"
                    aria-label="Travel Date (Start)"
                    value={formData.travelDate}
                    onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                    disabled={isLocked}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </EditInputField>

                <EditInputField label="End Date" icon={Calendar} locked={isLocked}>
                  <input
                    type="date"
                    aria-label="End Date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.travelDate || undefined}
                    disabled={isLocked}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </EditInputField>

                <EditInputField label="Number of Travelers" icon={Users} locked={isLocked}>
                  <input
                    type="number"
                    min="1"
                    aria-label="Number of Travelers"
                    value={formData.numberOfTravelers}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        numberOfTravelers: value === '' ? '' : Math.max(1, Number(value)),
                      });
                    }}
                    disabled={isLocked}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="e.g., 2"
                  />
                </EditInputField>

                <EditInputField label="Budget" icon={Wallet}>
                  <input
                    type="text"
                    readOnly
                    aria-label="Budget"
                    value={lead?.budget || '—'}
                    title="Auto-filled from the primary package's quoted total"
                    className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 cursor-not-allowed focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Auto-filled from the primary package total</p>
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
              <>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
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

                  {/* Package tabs — a lead can hold many packages at once, plus one manual slot */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      Packages
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {selections.map((selection) => {
                        const label = selection.isManual ? 'Manual Itinerary' : (selection.packageName || 'Package');
                        const isActive = selection.id === activeSelectionId;
                        return (
                          <div
                            key={selection.id}
                            className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${isActive
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => { setActiveSelectionId(selection.id); setShowItineraryEditor(true); }}
                              className="flex items-center gap-1.5"
                            >
                              {label}
                              {selection.currentQuoteId && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                                  Quoted
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSelection(selection)}
                              className={`p-0.5 rounded-full ${isActive ? 'hover:bg-white/20' : 'hover:bg-red-100'}`}
                              title="Remove package"
                            >
                              <XCircle className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-gray-400 group-hover:text-red-500'}`} />
                            </button>
                          </div>
                        );
                      })}

                      {!addingPackage ? (
                        <button
                          type="button"
                          onClick={() => setAddingPackage(true)}
                          disabled={loadingPackages}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          Add Package
                        </button>
                      ) : (
                        <select
                          aria-label="Add package"
                          autoFocus
                          value=""
                          onChange={(e) => handleAddPackage(e.target.value)}
                          onBlur={() => setAddingPackage(false)}
                          disabled={loadingPackages}
                          className="px-3 py-2 bg-white border-2 border-emerald-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">{loadingPackages ? 'Loading packages...' : 'Select a package…'}</option>
                          {!selections.some(s => s.isManual) && (
                            <option value={MANUAL_ITINERARY_VALUE}>Manual Itinerary (No Package)</option>
                          )}
                          {packages
                            .filter((pkg) => !selections.some(s => s.packageId === (pkg._id || pkg.id)))
                            .map((pkg) => {
                              const optionId = pkg._id || pkg.id;
                              const label = pkg.title || pkg.name || 'Unnamed Package';
                              return (
                                <option key={optionId} value={optionId}>{label}</option>
                              );
                            })}
                        </select>
                      )}
                    </div>
                    {selections.length === 0 && (
                      <p className="text-xs text-gray-400 mt-2">No packages attached yet — add one to start building an itinerary and quotation.</p>
                    )}
                  </div>
                </div>

                {/* Itinerary editor for the active tab — collapsed so the dialog stays clean */}
                {activeSelection && (
                  <div className="mt-4 bg-white rounded-2xl border border-emerald-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowItineraryEditor(v => !v)}
                      className="w-full flex items-center justify-between p-4 hover:bg-emerald-50/50 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        Itinerary Editor — {activeSelection.isManual ? 'Manual Itinerary' : (activeSelection.packageName || 'Package')}
                        <span className="text-xs font-normal text-gray-400">
                          ({activeSelection.itineraryDays.length || 0} day{activeSelection.itineraryDays.length === 1 ? '' : 's'})
                        </span>
                      </span>
                      {showItineraryEditor ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>

                    {showItineraryEditor && (
                      <div className="p-4 border-t border-emerald-100 space-y-3">
                        {!activeSelection.isManual && (
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-gray-500">
                              {activeSelection.isMaterialized
                                ? 'This itinerary has been customized for this lead.'
                                : 'Showing the original package itinerary — edit any field to customize it for this lead.'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRefreshSelection(activeSelection)}
                              disabled={!activeSelection.isMaterialized || refreshingSelectionId === activeSelection.id}
                              title={activeSelection.isMaterialized ? 'Discard customizations and revert to the original package' : 'Nothing to refresh — this is already the original package'}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {refreshingSelectionId === activeSelection.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              Refresh from original package
                            </button>
                          </div>
                        )}
                        <ItineraryEditor
                          days={activeSelection.itineraryDays}
                          onDayChange={(dayNumber, dayData) => {
                            updateActiveSelection({
                              itineraryDays: (activeSelection.itineraryDays || []).filter(Boolean).map(day =>
                                day.dayNumber === dayNumber ? { ...day, ...dayData } : day
                              ),
                            });
                          }}
                          onAddDay={() => {
                            const newDayNumber = activeSelection.itineraryDays.length + 1;
                            updateActiveSelection({ itineraryDays: [...activeSelection.itineraryDays, createDefaultDay(newDayNumber)] });
                          }}
                          onRemoveDay={(dayNumber) => {
                            const filteredDays = activeSelection.itineraryDays.filter(day => day.dayNumber !== dayNumber);
                            const renumberedDays = filteredDays.map((day, index) => ({ ...day, dayNumber: index + 1 }));
                            updateActiveSelection({ itineraryDays: renumberedDays });
                          }}
                          destination={formData.destination}
                          hideTitleAndDescription={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
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

          {/* Lifecycle Status, Flight Bookings, then Pricing — existing leads only */}
          {(lead?._id || lead?.id) && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Lifecycle Status</h3>
                  <LeadStatusBadge status={lead.lifecycleStatus} />
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

              {activeSelection ? (
                <>
                  <LeadFlightBookingsSection
                    leadId={lead._id || lead.id}
                    selectionId={activeSelection.id}
                    leadStatus={lead.lifecycleStatus}
                    itineraryDays={activeSelection.itineraryDays}
                    travelDate={formData.travelDate}
                    onUpdateDay={(dayNumber, updates) => {
                      updateActiveSelection({
                        itineraryDays: (activeSelection.itineraryDays || []).filter(Boolean).map(day =>
                          day.dayNumber === dayNumber ? { ...day, ...updates } : day
                        ),
                      });
                    }}
                    onFlightsChanged={() => setPricingRefreshToken(t => t + 1)}
                  />

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Pricing — {activeSelection.isManual ? 'Manual Itinerary' : (activeSelection.packageName || 'Package')}
                    </h3>
                    <PricingSection
                      leadId={lead._id || lead.id}
                      selectionId={activeSelection.id}
                      days={reconcileDays(activeSelection.itineraryDays)}
                      travelers={formData.numberOfTravelers || 1}
                      pricing={activeSelection.pricingSettings}
                      refreshToken={pricingRefreshToken}
                      onSettingsChange={(settings) => updateActiveSelection({ pricingSettings: settings })}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Add a package above to manage its itinerary and pricing</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={handleCancel}
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
    </div>
  );
};

export default EditLeadDialog;
