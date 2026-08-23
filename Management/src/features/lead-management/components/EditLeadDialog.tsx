import { useState, useEffect, useRef } from 'react';
import {
  X, Mail, Phone, Save, Loader2, Edit, Calendar, MessageSquare, Plus, Copy,
  User, MapPin, Plane, Users, Globe, Package, ChevronDown, ChevronUp,
  Trash2, Check, Lock, RefreshCw, XCircle, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// A lead can hold many packages at once, plus at most one manual
// (from-scratch) itinerary slot — this sentinel is the "add" picker's third
// option alongside real packages.
const MANUAL_ITINERARY_VALUE = '__manual__';

// Maps a /leads/:id/packages selection (server shape, materialized or
// derived) into the local editor-tab shape.
function mapSelection(raw: any) {
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

interface EditInputFieldProps {
  label: string;
  required?: boolean;
  icon?: LucideIcon;
  locked?: boolean;
  children: React.ReactNode;
  testId?: string;
}

function EditInputField({ label, required, icon: Icon, locked, children, testId }: EditInputFieldProps) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        {label}
        {required && <span className="text-destructive">*</span>}
        {locked && (
          <span className="flex items-center gap-1 text-xs text-warning font-normal" title="Locked after QUOTED — move the lead back to DRAFTING to edit">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

interface EditSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  section: string;
  count?: number;
  expanded: boolean;
  onToggle: (section: string) => void;
}

function EditSectionHeader({ icon: Icon, title, subtitle, section, count, expanded, onToggle }: EditSectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(section)}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
        expanded ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${expanded ? 'bg-primary-foreground/20' : 'bg-card shadow-sm'}`}>
          <Icon className={`w-5 h-5 ${expanded ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
        </div>
        <div className="text-left">
          <h3 className="font-semibold flex items-center gap-2">
            {title}
            {count !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${expanded ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
                {count}
              </span>
            )}
          </h3>
          <p className={`text-xs ${expanded ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{subtitle}</p>
        </div>
      </div>
      {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
    </button>
  );
}

const emptyFormData = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  numberOfTravelers: 1 as number | string,
  city: '',
  salesRep: '',
  assignedTo: '',
  destination: '',
  platform: '',
  travelDate: '',
  endDate: '',
  lifecycleStatus: 'NEW',
};

interface EditLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  salesReps: any[];
  onSuccess?: () => void;
  initialSelectionId?: string;
}

const EditLeadDialog = ({ isOpen, onClose, lead, salesReps, onSuccess, initialSelectionId }: EditLeadDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showItineraryEditor, setShowItineraryEditor] = useState(false);
  // One entry per attached package (plus the manual slot, if any) — see
  // mapSelection() for the shape. `dirty` marks a tab whose itinerary/pricing
  // has been edited locally and needs saving.
  const [selections, setSelections] = useState<any[]>([]);
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null);
  const [addingPackage, setAddingPackage] = useState(false);
  const [refreshingSelectionId, setRefreshingSelectionId] = useState<string | null>(null);
  // Bumped whenever a transfer flight is added/edited/removed — those persist
  // straight to the DB and never touch itineraryDays/pricingSettings, so the
  // live pricing preview has no other way to know it needs to recompute.
  const [pricingRefreshToken, setPricingRefreshToken] = useState(0);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [editingRemarkIndex, setEditingRemarkIndex] = useState<number | null>(null);
  const [editRemarkText, setEditRemarkText] = useState('');
  const [newRemarkText, setNewRemarkText] = useState('');
  const [showAddRemark, setShowAddRemark] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true,
    travel: true,
    package: true,
    remarks: false,
  });
  const [formData, setFormData] = useState(emptyFormData);

  // Snapshot of everything the dialog loaded, so Cancel can revert in place
  // (the dialog stays mounted across open/close cycles, so React alone won't
  // reset it if the `lead` prop reference happens not to change).
  const snapshotRef = useRef<any>(null);

  const isLocked = isLeadFieldLocked(lead?.lifecycleStatus);
  const activeSelection = selections.find((s) => s.id === activeSelectionId) || null;

  // Day-linked flight preferences live in day.flights[] but only day.transports[]
  // feeds cost lines — reconcile flights into a priced transport row (real price
  // wins when set, else the existing manual transport cost is preserved) before
  // this reaches pricing calculation or persistence. Same transform the package
  // editor already applies at save time (Management/src/features/itinerary/services/apiService.js).
  const reconcileDays = (days: any[]) => (days || []).map((day) => ({
    ...day,
    transports: reconcileFlightsForSave({ flights: day.flights || [], transports: day.transports || [] }),
  }));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
          .filter((pkg: any) => pkg.isActive !== false);
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
      const preferredSelectionId = nextSelections.some((s: any) => s.id === initialSelectionId)
        ? initialSelectionId
        : nextSelections[0]?.id ?? null;
      setSelections(nextSelections);
      setActiveSelectionId(preferredSelectionId);

      snapshotRef.current = {
        formData: nextFormData,
        remarks: lead.remarks || [],
        selections: nextSelections,
        activeSelectionId: preferredSelectionId,
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

  const updateActiveSelection = (patch: any) => {
    setSelections((prev) => prev.map((s) => (
      s.id === activeSelectionId ? { ...s, ...patch, dirty: true } : s
    )));
  };

  const handleAddPackage = async (value: string) => {
    if (!lead || !value) return;
    const leadId = lead._id || lead.id;
    const isManual = value === MANUAL_ITINERARY_VALUE;

    try {
      const createRes = await leadAPI.addPackageSelection(leadId, isManual ? { isManual: true } : { packageId: value });
      const createdId = (createRes?.data?.data || createRes?.data)?.id;
      const detailRes = await leadAPI.getPackageSelection(leadId, createdId);
      const detail = detailRes?.data?.data || detailRes?.data;
      const newSelection = mapSelection(detail);
      setSelections((prev) => [...prev, newSelection]);
      setActiveSelectionId(newSelection.id);
      setAddingPackage(false);
      setShowItineraryEditor(true);
      toast.success(isManual ? 'Manual itinerary added' : 'Package added');
    } catch (err: any) {
      toast.error(`Failed to add package: ${err.message}`);
    }
  };

  const handleRemoveSelection = async (selection: any) => {
    if (!lead || !selection) return;
    if (!window.confirm(`Remove ${selection.isManual ? 'the manual itinerary' : (selection.packageName || 'this package')} from this lead?`)) {
      return;
    }
    const leadId = lead._id || lead.id;
    try {
      await leadAPI.removePackageSelection(leadId, selection.id);
      setSelections((prev) => {
        const next = prev.filter((s) => s.id !== selection.id);
        if (activeSelectionId === selection.id) {
          setActiveSelectionId(next[0]?.id ?? null);
        }
        return next;
      });
      toast.success('Package removed');
    } catch (err: any) {
      toast.error(`Failed to remove package: ${err.message}`);
    }
  };

  const handleRefreshSelection = async (selection: any, force = false) => {
    if (!lead || !selection) return;
    const leadId = lead._id || lead.id;
    setRefreshingSelectionId(selection.id);
    try {
      await leadAPI.refreshPackageSelection(leadId, selection.id, force);
      const detailRes = await leadAPI.getPackageSelection(leadId, selection.id);
      const detail = detailRes?.data?.data || detailRes?.data;
      setSelections((prev) => prev.map((s) => (s.id === selection.id ? mapSelection(detail) : s)));
      toast.success('Reverted to the original package');
    } catch (err: any) {
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
      const dirtySelections = selections.filter((s) => s.dirty);
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

      const updateData: any = {
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
        const rep = salesReps.find((r) => r.id === formData.assignedTo || r._id === formData.assignedTo);
        updateData.assignedTo = formData.assignedTo;
        updateData.salesRep = rep ? rep.name : formData.salesRep || undefined;
      }
      await leadAPI.updateLead(leadId, updateData);

      toast.success('Lead updated successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
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
      <div className="bg-card rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-[var(--shadow-modal)] flex flex-col">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 sm:p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-foreground/15 rounded-2xl">
                <Edit className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Edit Lead</h2>
                <p className="text-primary-foreground/80 text-sm mt-0.5">{formData.name || 'Lead Details'}</p>
              </div>
            </div>
            <button onClick={handleCancel} className="p-2.5 hover:bg-primary-foreground/15 rounded-xl transition-all">
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
            />

            {expandedSections.personal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-muted/50 rounded-2xl border border-border">
                <EditInputField label="Full Name" required icon={User} testId="edit-lead-name">
                  <Input
                    type="text"
                    aria-label="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </EditInputField>

                <EditInputField label="Email Address" icon={Mail}>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </EditInputField>

                <EditInputField label="Contact Number" required icon={Phone} testId="edit-lead-phone">
                  <PhoneInput
                    international
                    defaultCountry="LK"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                    className="phone-input-wrapper"
                    placeholder="Enter phone number"
                  />
                </EditInputField>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      WhatsApp Number
                    </label>
                    {formData.phone && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, whatsapp: formData.phone })}
                        className="text-primary hover:text-primary"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </Button>
                    )}
                  </div>
                  <PhoneInput
                    international
                    defaultCountry="LK"
                    value={formData.whatsapp}
                    onChange={(value) => setFormData({ ...formData, whatsapp: value || '' })}
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
            />

            {expandedSections.travel && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-muted/50 rounded-2xl border border-border">
                <EditInputField label="Departure City" icon={MapPin}>
                  <LocationAutocomplete
                    value={formData.city}
                    onChange={(value: string) => setFormData({ ...formData, city: value })}
                    placeholder="e.g., Colombo, Sri Lanka"
                    destination={formData.destination}
                  />
                </EditInputField>

                <EditInputField label="Destination" icon={MapPin}>
                  <DestinationSelector
                    value={formData.destination}
                    onChange={(event: any) =>
                      setFormData({ ...formData, destination: event.target.value })
                    }
                  />
                </EditInputField>

                <EditInputField label="Travel Date (Start)" icon={Calendar} locked={isLocked}>
                  <Input
                    type="date"
                    aria-label="Travel Date (Start)"
                    value={formData.travelDate}
                    onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                    disabled={isLocked}
                  />
                </EditInputField>

                <EditInputField label="End Date" icon={Calendar} locked={isLocked}>
                  <Input
                    type="date"
                    aria-label="End Date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.travelDate || undefined}
                    disabled={isLocked}
                  />
                </EditInputField>

                <EditInputField label="Number of Travelers" icon={Users} locked={isLocked}>
                  <Input
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
                    placeholder="e.g., 2"
                  />
                </EditInputField>

                <EditInputField label="Budget" icon={Wallet}>
                  <Input
                    type="text"
                    readOnly
                    aria-label="Budget"
                    value={lead?.budget || '—'}
                    title="Auto-filled from the primary package's quoted total"
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Auto-filled from the primary package total</p>
                </EditInputField>

                <EditInputField label="Platform / Source" icon={Globe}>
                  <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: String(v) })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select Platform" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website_Form">🌐 Website Form</SelectItem>
                      <SelectItem value="Social_Media">📱 Social Media</SelectItem>
                      <SelectItem value="Phone_Call">📞 Phone Call</SelectItem>
                      <SelectItem value="Referral">🤝 Referral</SelectItem>
                      <SelectItem value="Email">📧 Email</SelectItem>
                      <SelectItem value="Walk_in">🚶 Walk-in</SelectItem>
                    </SelectContent>
                  </Select>
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
            />

            {expandedSections.package && (
              <>
                <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-4">
                  <EditInputField label="Sales Representative" icon={User}>
                    <Select
                      value={formData.assignedTo || '__none__'}
                      onValueChange={(idValue) => {
                        const id = String(idValue);
                        if (id === '__none__') {
                          setFormData((prev) => ({ ...prev, assignedTo: '', salesRep: '' }));
                          return;
                        }
                        if (id === '__name_only') {
                          setFormData((prev) => ({ ...prev, assignedTo: '__name_only' }));
                          return;
                        }
                        const rep = salesReps.find((r) => r.id === id || r._id === id);
                        setFormData((prev) => ({ ...prev, assignedTo: id, salesRep: rep ? rep.name : '' }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Sales Rep">
                          {(value: string) => {
                            if (value === '__name_only') return formData.salesRep;
                            const rep = salesReps.find((r) => r.id === value || r._id === value);
                            return rep ? rep.name : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select Sales Rep</SelectItem>
                        {formData.salesRep && (!formData.assignedTo || formData.assignedTo === '__name_only') && (
                          <SelectItem value="__name_only">{formData.salesRep}</SelectItem>
                        )}
                        {salesReps.map((rep) => (
                          <SelectItem key={rep.id || rep._id} value={rep.id || rep._id}>{rep.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EditInputField>

                  {/* Package tabs — a lead can hold many packages at once, plus one manual slot */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      Packages
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {selections.map((selection) => {
                        const label = selection.isManual ? 'Manual Itinerary' : (selection.packageName || 'Package');
                        const isActive = selection.id === activeSelectionId;
                        return (
                          <div
                            key={selection.id}
                            className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${
                              isActive ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'bg-card border-border text-foreground hover:border-primary/40'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => { setActiveSelectionId(selection.id); setShowItineraryEditor(true); }}
                              className="flex items-center gap-1.5"
                            >
                              {label}
                              {selection.currentQuoteId && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary-foreground/20' : 'bg-success/10 text-success'}`}>
                                  Quoted
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSelection(selection)}
                              className={`p-0.5 rounded-full ${isActive ? 'hover:bg-primary-foreground/20' : 'hover:bg-destructive/10'}`}
                              title="Remove package"
                            >
                              <XCircle className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground group-hover:text-destructive'}`} />
                            </button>
                          </div>
                        );
                      })}

                      {!addingPackage ? (
                        <button
                          type="button"
                          onClick={() => setAddingPackage(true)}
                          disabled={loadingPackages}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          Add Package
                        </button>
                      ) : (
                        // Kept a real native <select> (not the Base UI Select
                        // primitive) - this dialog's own component test drives
                        // it with RTL's user.selectOptions and
                        // getByLabelText('Add package'), which needs a genuine
                        // <select>/<option> DOM tree.
                        <select
                          aria-label="Add package"
                          autoFocus
                          value=""
                          onChange={(e) => handleAddPackage(e.target.value)}
                          onBlur={() => setAddingPackage(false)}
                          disabled={loadingPackages}
                          className="h-8 px-3 bg-transparent border-2 border-primary/30 rounded-xl text-sm focus:outline-none focus-visible:border-primary"
                        >
                          <option value="">{loadingPackages ? 'Loading packages...' : 'Select a package…'}</option>
                          {!selections.some((s) => s.isManual) && (
                            <option value={MANUAL_ITINERARY_VALUE}>Manual Itinerary (No Package)</option>
                          )}
                          {packages
                            .filter((pkg) => !selections.some((s) => s.packageId === (pkg._id || pkg.id)))
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
                      <p className="text-xs text-muted-foreground mt-2">No packages attached yet — add one to start building an itinerary and quotation.</p>
                    )}
                  </div>
                </div>

                {/* Itinerary editor for the active tab — collapsed so the dialog stays clean */}
                {activeSelection && (
                  <div className="mt-4 bg-card rounded-2xl border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowItineraryEditor((v) => !v)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Calendar className="w-4 h-4 text-primary" />
                        Itinerary Editor — {activeSelection.isManual ? 'Manual Itinerary' : (activeSelection.packageName || 'Package')}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({activeSelection.itineraryDays.length || 0} day{activeSelection.itineraryDays.length === 1 ? '' : 's'})
                        </span>
                      </span>
                      {showItineraryEditor ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {showItineraryEditor && (
                      <div className="p-4 border-t border-border space-y-3">
                        {!activeSelection.isManual && (
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-muted-foreground">
                              {activeSelection.isMaterialized
                                ? 'This itinerary has been customized for this lead.'
                                : 'Showing the original package itinerary — edit any field to customize it for this lead.'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefreshSelection(activeSelection)}
                              disabled={!activeSelection.isMaterialized || refreshingSelectionId === activeSelection.id}
                              title={activeSelection.isMaterialized ? 'Discard customizations and revert to the original package' : 'Nothing to refresh — this is already the original package'}
                            >
                              {refreshingSelectionId === activeSelection.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              Refresh from original package
                            </Button>
                          </div>
                        )}
                        <ItineraryEditor
                          days={activeSelection.itineraryDays}
                          onDayChange={(dayNumber: number, dayData: any) => {
                            updateActiveSelection({
                              itineraryDays: (activeSelection.itineraryDays || []).filter(Boolean).map((day: any) =>
                                day.dayNumber === dayNumber ? { ...day, ...dayData } : day
                              ),
                            });
                          }}
                          onAddDay={() => {
                            const newDayNumber = activeSelection.itineraryDays.length + 1;
                            updateActiveSelection({ itineraryDays: [...activeSelection.itineraryDays, createDefaultDay(newDayNumber)] });
                          }}
                          onRemoveDay={(dayNumber: number) => {
                            const filteredDays = activeSelection.itineraryDays.filter((day: any) => day.dayNumber !== dayNumber);
                            const renumberedDays = filteredDays.map((day: any, index: number) => ({ ...day, dayNumber: index + 1 }));
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
              count={remarks.length}
            />

            {expandedSections.remarks && (
              <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-4">
                {/* Add New Remark Button */}
                {!showAddRemark && (
                  <Button type="button" variant="outline" onClick={() => setShowAddRemark(true)} className="w-full">
                    <Plus className="w-4 h-4" />
                    Add New Remark
                  </Button>
                )}

                {/* Add Remark Form */}
                {showAddRemark && (
                  <div className="p-4 bg-card rounded-xl border-2 border-primary/20 shadow-sm">
                    <label className="block text-sm font-semibold text-foreground mb-3">New Remark</label>
                    <Textarea
                      value={newRemarkText}
                      onChange={(e) => setNewRemarkText(e.target.value)}
                      className="resize-none mb-3"
                      rows={3}
                      placeholder="Enter your remark here..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowAddRemark(false);
                          setNewRemarkText('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
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
                      >
                        <Check className="w-4 h-4" />
                        Add Remark
                      </Button>
                    </div>
                  </div>
                )}

                {/* Remarks List */}
                <div className="space-y-3">
                  {remarks.length > 0 ? (
                    remarks.map((remark, index) => (
                      <div key={index} className="p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-[var(--shadow-card)] transition-all group">
                        {editingRemarkIndex === index ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editRemarkText}
                              onChange={(e) => setEditRemarkText(e.target.value)}
                              className="resize-none"
                              rows={3}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setEditingRemarkIndex(null);
                                  setEditRemarkText('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
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
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-foreground flex-1">{remark.text}</p>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRemarkIndex(index);
                                    setEditRemarkText(remark.text || '');
                                  }}
                                  className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4 text-primary" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedRemarks = remarks.filter((_, i) => i !== index);
                                    setRemarks(updatedRemarks);
                                    toast.success('Remark deleted');
                                  }}
                                  className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
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
                    <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No remarks yet</p>
                      <p className="text-xs mt-1 text-muted-foreground">Add your first note</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lifecycle Status, Flight Bookings, then Pricing — existing leads only */}
          {(lead?._id || lead?.id) && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Lifecycle Status</h3>
                  <LeadStatusBadge status={lead.lifecycleStatus} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Trigger the parent's status change dialog
                    const event = new CustomEvent('open-status-change', { detail: lead });
                    window.dispatchEvent(event);
                  }}
                >
                  Change Status
                </Button>
              </div>

              {activeSelection ? (
                <>
                  <LeadFlightBookingsSection
                    leadId={lead._id || lead.id}
                    selectionId={activeSelection.id}
                    leadStatus={lead.lifecycleStatus}
                    itineraryDays={activeSelection.itineraryDays}
                    travelDate={formData.travelDate}
                    onUpdateDay={(dayNumber: number, updates: any) => {
                      updateActiveSelection({
                        itineraryDays: (activeSelection.itineraryDays || []).filter(Boolean).map((day: any) =>
                          day.dayNumber === dayNumber ? { ...day, ...updates } : day
                        ),
                      });
                    }}
                    onFlightsChanged={() => setPricingRefreshToken((t) => t + 1)}
                  />

                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Pricing — {activeSelection.isManual ? 'Manual Itinerary' : (activeSelection.packageName || 'Package')}
                    </h3>
                    <PricingSection
                      leadId={lead._id || lead.id}
                      selectionId={activeSelection.id}
                      days={reconcileDays(activeSelection.itineraryDays)}
                      travelers={Number(formData.numberOfTravelers) || 1}
                      pricing={activeSelection.pricingSettings}
                      refreshToken={pricingRefreshToken}
                      onSettingsChange={(settings: any) => updateActiveSelection({ pricingSettings: settings })}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Add a package above to manage its itinerary and pricing</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 bg-muted border-t border-border flex gap-3 shrink-0">
          <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSubmitting} className="flex-1">
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
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditLeadDialog;
