import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save, Eye, Download, Plus, Trash2, Calendar, MapPin, Hotel, Utensils, FileText, Ticket, ChevronRight, User, Clock, Globe, Plane, Pencil } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { voucherAPI, packageAPI, leadAPI } from '../../../services/api';
import { flightAPI } from '../../../services/flight.service';
import PDFPreviewDialog from './PDFPreviewDialog';
import SendDocumentPanel from './shared/SendDocumentPanel';
import { LOCALE } from '../../../utils/currency.js';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const buildHotelStaysFromDays = (days: any[], travelStartDate: string) => {
  const hotelBookings: any[] = [];
  let currentStay: any = null;
  const getDate = (offset: number) => {
    if (!travelStartDate) return '';
    const date = new Date(travelStartDate);
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  };
  (days || []).forEach((day) => {
    const hotelName = day.accommodation?.name;
    const location = day.places?.[0]?.customName || '';
    if (hotelName) {
      if (currentStay && currentStay.hotelName === hotelName) {
        currentStay.endDayNum = day.dayNumber;
      } else {
        if (currentStay) hotelBookings.push(currentStay);
        currentStay = { location: location || (currentStay ? currentStay.location : ''), hotelName, startDayNum: day.dayNumber, endDayNum: day.dayNumber };
      }
    } else if (currentStay) {
      hotelBookings.push(currentStay);
      currentStay = null;
    }
  });
  if (currentStay) hotelBookings.push(currentStay);
  return hotelBookings.map((stay) => ({
    location: stay.location,
    hotelName: stay.hotelName,
    checkIn: getDate(stay.startDayNum - 1),
    checkOut: getDate(stay.endDayNum),
  }));
};

const emptyFormData = (lead: any) => ({
  leadId: lead?.id || lead?._id,
  packageId: '',
  customizedPackageId: '',
  customer: { name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '', address: '' },
  locationDates: [] as any[],
  travelStartDate: lead?.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
  travelEndDate: lead?.endDate ? new Date(lead.endDate).toISOString().split('T')[0] : '',
  mealPlans: [] as any[],
  itinerarySummary: [] as any[],
  flightSegments: [] as any[],
  packageDetails: { name: '', destination: '', duration: 0, category: '', inclusions: [] as string[], exclusions: [] as string[], highlights: [] as string[] } as any,
  notes: '',
  terms: [] as any[],
  specialInstructions: '',
});

interface VoucherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onSuccess?: () => void;
  onEditLead?: (lead: any, selectionId: string | null) => void;
  initialSelectionId?: string;
}

const VoucherDialog = ({ isOpen, onClose, lead, onSuccess, onEditLead, initialSelectionId }: VoucherDialogProps) => {
  const leadId = lead?.id || lead?._id;

  const [loading, setLoading] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentVoucherId, setCurrentVoucherId] = useState<string | null>(null);
  const [existingVouchers, setExistingVouchers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const [selections, setSelections] = useState<any[]>([]);
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null);
  const activeSelection = useMemo(
    () => selections.find((s) => s.id === activeSelectionId) || null,
    [selections, activeSelectionId],
  );

  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState(emptyFormData(lead));

  const loadSelections = useCallback(async () => {
    if (!leadId) return;
    setLoadingPackage(true);
    try {
      const res = await leadAPI.getPackageSelections(leadId);
      const list: any[] = res?.data || [];
      setSelections(list);
      const mostRecentlyAccepted = [...list]
        .filter((s) => s.quoteAcceptedAt)
        .sort((a, b) => new Date(b.quoteAcceptedAt).getTime() - new Date(a.quoteAcceptedAt).getTime())[0];
      const preferred = list.find((s) => s.id === initialSelectionId)
        || mostRecentlyAccepted
        || list.find((s) => s.id === lead?.primarySelectionId)
        || list[0];
      setActiveSelectionId(preferred ? preferred.id : null);
    } catch (error) {
      console.error('[Voucher] Failed to load package selections:', error);
      toast.error('Failed to load packages for this lead');
      setSelections([]);
    } finally {
      setLoadingPackage(false);
    }
  }, [leadId, lead?.primarySelectionId, initialSelectionId]);

  const fetchExistingVouchers = useCallback(async () => {
    if (!leadId) return;
    try {
      const response = await voucherAPI.getByLead(leadId);
      setExistingVouchers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching existing vouchers:', error);
    }
  }, [leadId]);

  const loadFlightSegments = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await flightAPI.getItineraryFlights(leadId);
      const bookings = res?.data || [];
      const flightSegments = bookings.flatMap((booking: any) =>
        [...(booking.segments || [])]
          .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
          .map((seg: any) => ({
            dayNumber: booking.dayNumber,
            marketingCarrier: seg.marketingCarrier || '',
            flightNumber: seg.flightNumber || '',
            origin: seg.origin || '',
            destination: seg.destination || '',
            departureAt: seg.departureAt || '',
            arrivalAt: seg.arrivalAt || '',
          })));
      setFormData((prev) => ({ ...prev, flightSegments }));
    } catch (error) {
      console.error('[Voucher] Failed to load flight segments:', error);
    }
  }, [leadId]);

  // Reset the form and reload everything whenever the dialog is (re)opened for a lead.
  useEffect(() => {
    if (isOpen && lead) {
      setFormData(emptyFormData(lead));
      setSelections([]);
      setActiveSelectionId(null);
      setCurrentVoucherId(null);
      setIsEditing(false);
      setChannel('email');
      setSendEmail(lead?.email || '');
      setSendPhone(lead?.whatsapp || lead?.phone || '');
      fetchExistingVouchers();
      loadSelections();
      loadFlightSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leadId]);

  // Rebuild package/hotel/meal/itinerary data whenever the active selection changes.
  useEffect(() => {
    if (!activeSelection) return;
    (async () => {
      let packageDetails: any = {
        name: activeSelection.packageName || (activeSelection.isManual ? 'Manual Itinerary' : ''),
        destination: '',
        duration: activeSelection.itineraryDays?.length || 0,
        category: '',
        inclusions: [],
        exclusions: [],
        highlights: [],
      };
      if (!activeSelection.isManual && activeSelection.packageId) {
        try {
          const res = await packageAPI.getById(activeSelection.packageId);
          const pkg = res?.data || res;
          packageDetails = {
            name: pkg.title || packageDetails.name,
            destination: pkg.destination || '',
            duration: pkg.durationDays || activeSelection.itineraryDays?.length || 0,
            category: pkg.category || '',
            inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
            exclusions: Array.isArray(pkg.exclusions) ? pkg.exclusions : [],
            highlights: [],
            price: Number(pkg.basePrice) || 0,
            coverImage: pkg.coverImage ? { url: pkg.coverImage } : null,
          };
        } catch (error) {
          console.error('[Voucher] Failed to load package details:', error);
        }
      }

      const days = activeSelection.itineraryDays || [];
      setFormData((prev) => ({
        ...prev,
        packageId: activeSelection.isManual ? '' : (activeSelection.packageId || ''),
        customizedPackageId: '',
        packageDetails,
        mealPlans: days.map((day: any) => ({
          dayNumber: day.dayNumber,
          dayTitle: day.title || '',
          breakfast: (day.breakfastCount || 0) > 0,
          lunch: (day.lunchCount || 0) > 0,
          dinner: (day.dinnerCount || 0) > 0,
        })),
        itinerarySummary: days.map((day: any) => ({
          dayNumber: day.dayNumber,
          title: day.title || '',
          locations: (day.places || []).map((p: any) => p.customName).filter(Boolean),
          activities: (day.activities || []).map((a: any) => a.name).filter(Boolean),
          accommodationName: day.accommodation?.name || '',
          accommodationType: day.accommodation?.type || '',
        })),
        locationDates: buildHotelStaysFromDays(days, prev.travelStartDate),
      }));
    })();
  }, [activeSelection]);

  const handleLocationDateChange = (index: number, field: string, value: string) => { setFormData((prev) => { const newLocationDates = [...prev.locationDates]; newLocationDates[index] = { ...newLocationDates[index], [field]: value }; return { ...prev, locationDates: newLocationDates }; }); };
  const addLocationDate = () => { setFormData((prev) => ({ ...prev, locationDates: [...prev.locationDates, { location: '', hotelName: '', checkIn: '', checkOut: '' }] })); };
  const removeLocationDate = (index: number) => { setFormData((prev) => ({ ...prev, locationDates: prev.locationDates.filter((_, i) => i !== index) })); };

  const handleFlightSegmentChange = (index: number, field: string, value: any) => { setFormData((prev) => { const segments = [...prev.flightSegments]; segments[index] = { ...segments[index], [field]: value }; return { ...prev, flightSegments: segments }; }); };
  const addFlightSegment = () => { setFormData((prev) => ({ ...prev, flightSegments: [...prev.flightSegments, { dayNumber: '', marketingCarrier: '', flightNumber: '', origin: '', destination: '', departureAt: '', arrivalAt: '' }] })); };
  const removeFlightSegment = (index: number) => { setFormData((prev) => ({ ...prev, flightSegments: prev.flightSegments.filter((_, i) => i !== index) })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer.name.trim() || !formData.customer.email.trim()) {
      toast.error('Customer name and email are required');
      return;
    }
    try {
      setLoading(true);
      const cleanedFormData = {
        leadId,
        packageId: formData.packageId?.trim() || undefined,
        customizedPackageId: formData.customizedPackageId?.trim() || undefined,
        customerName: formData.customer.name,
        customerEmail: formData.customer.email,
        customerPhone: formData.customer.phone || undefined,
        customerAddress: formData.customer.address || undefined,
        packageDetails: formData.packageDetails,
        travelStartDate: formData.travelStartDate?.trim() ? formData.travelStartDate : null,
        travelEndDate: formData.travelEndDate?.trim() ? formData.travelEndDate : null,
        notes: formData.notes,
        terms: formData.terms,
        specialInstructions: formData.specialInstructions,
        locationDates: formData.locationDates?.filter((ld) => ld.location?.trim() || ld.hotelName?.trim()) || [],
        mealPlans: formData.mealPlans || [],
        itinerarySummary: (formData.itinerarySummary || []).map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title || '',
          locations: day.locations || [],
          activities: day.activities || [],
          accommodationName: day.accommodationName || '',
          accommodationType: day.accommodationType || '',
        })),
        flightSegments: (formData.flightSegments || []).filter((f) => f.marketingCarrier?.trim() || f.flightNumber?.trim()),
      };

      let response;
      if (isEditing && currentVoucherId) response = await voucherAPI.update(currentVoucherId, cleanedFormData);
      else response = await voucherAPI.create(cleanedFormData);

      const newVoucherId = response.data?.id;
      setCurrentVoucherId(newVoucherId);
      toast.success(isEditing ? 'Voucher updated successfully' : 'Voucher created successfully');
      if (onSuccess) onSuccess();
      fetchExistingVouchers();
      setIsEditing(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (voucherId: string | null = null) => {
    const idToDownload = voucherId || currentVoucherId;
    if (!idToDownload) { toast.error('Please save the voucher first'); return; }
    try {
      await voucherAPI.downloadPDF(idToDownload);
      toast.success('Voucher PDF downloaded');
    } catch (error) {
      toast.error('Failed to download voucher PDF');
    }
  };

  const handlePreviewPDF = async () => {
    if (!currentVoucherId) { toast.error('Please save the voucher first'); return; }
    setShowPDFPreview(true);
  };

  const handleSend = async () => {
    if (!currentVoucherId) { toast.error('Please save the voucher first'); return; }
    const recipient = channel === 'email' ? sendEmail.trim() : sendPhone.trim();
    if (!recipient) {
      toast.error(channel === 'email' ? 'Enter a recipient email' : 'Enter a WhatsApp number');
      return;
    }
    setSending(true);
    try {
      const payload = channel === 'email' ? { channel, email: recipient } : { channel, phone: recipient };
      await voucherAPI.send(currentVoucherId, payload);
      toast.success(channel === 'email' ? 'Voucher emailed' : 'Voucher sent via WhatsApp');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send voucher');
    } finally {
      setSending(false);
    }
  };

  const loadExistingVoucher = async (voucherId: string) => {
    try {
      const response = await voucherAPI.getById(voucherId);
      const voucher = response.data || response;
      setCurrentVoucherId(voucherId);
      setIsEditing(true);
      setFormData({
        leadId: voucher.leadId || leadId,
        packageId: voucher.packageId || '',
        customizedPackageId: voucher.customizedPackageId || '',
        customer: {
          name: voucher.customerName || lead?.name || '',
          email: voucher.customerEmail || lead?.email || '',
          phone: voucher.customerPhone || lead?.phone || '',
          address: voucher.customerAddress || '',
        },
        locationDates: voucher.locationDates || [],
        travelStartDate: voucher.travelStartDate ? new Date(voucher.travelStartDate).toISOString().split('T')[0] : '',
        travelEndDate: voucher.travelEndDate ? new Date(voucher.travelEndDate).toISOString().split('T')[0] : '',
        mealPlans: voucher.mealPlans || [],
        itinerarySummary: voucher.itinerarySummary || [],
        flightSegments: voucher.flightSegments || [],
        packageDetails: voucher.packageDetails || emptyFormData(lead).packageDetails,
        notes: voucher.notes || '',
        terms: voucher.terms || [],
        specialInstructions: voucher.specialInstructions || '',
      });
      setSendEmail(voucher.customerEmail || lead?.email || '');
      setSendPhone(voucher.customerPhone || lead?.whatsapp || lead?.phone || '');
    } catch (error) {
      toast.error('Failed to load voucher');
    }
  };

  const sections: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Overview', icon: Ticket },
    { id: 'hotels', label: 'Hotels', icon: Hotel },
    { id: 'meals', label: 'Meals', icon: Utensils },
    { id: 'itinerary', label: 'Itinerary', icon: MapPin },
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent showCloseButton={false} className="p-0 gap-0 w-full max-w-6xl h-full sm:h-[92vh] rounded-none sm:rounded-3xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Sidebar */}
          <div className="hidden md:flex w-64 bg-primary text-primary-foreground flex-col shrink-0">
            {/* Logo Area */}
            <div className="p-6 border-b border-primary-foreground/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Voucher</h2>
                  <p className="text-primary-foreground/70 text-xs">{isEditing ? 'Edit Mode' : 'Create New'}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-5 border-b border-primary-foreground/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{lead?.name || 'Guest'}</p>
                  <p className="text-primary-foreground/70 text-xs truncate">{lead?.email || 'No email'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-primary-foreground/10 rounded-lg px-3 py-2">
                  <p className="text-primary-foreground/70">Duration</p>
                  <p className="font-semibold">{formData.packageDetails.duration || 0} Days</p>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg px-3 py-2">
                  <p className="text-primary-foreground/70">Hotels</p>
                  <p className="font-semibold">{formData.locationDates.length}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all text-left ${
                    activeSection === section.id ? 'bg-primary-foreground text-primary shadow-[var(--shadow-dropdown)]' : 'text-primary-foreground/80 hover:bg-primary-foreground/10'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{section.label}</span>
                  {activeSection === section.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </nav>

            {/* Package selector (only when the lead has more than one) */}
            {selections.length > 1 && (
              <div className="p-4 border-t border-primary-foreground/10">
                <p className="text-xs text-primary-foreground/70 mb-2">Package</p>
                <select
                  className="w-full h-8 px-3 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg text-primary-foreground text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30"
                  value={activeSelectionId || ''}
                  onChange={(e) => setActiveSelectionId(e.target.value)}
                >
                  {selections.map((s) => (
                    <option key={s.id} value={s.id} className="text-foreground">
                      {s.isManual ? 'Manual Itinerary' : (s.packageName || 'Package')}{s.quoteAcceptedAt ? ' (accepted)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Existing Vouchers */}
            {existingVouchers.length > 0 && (
              <div className="p-4 border-t border-primary-foreground/10">
                <p className="text-xs text-primary-foreground/70 mb-2">Existing Vouchers</p>
                <select
                  className="w-full h-8 px-3 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg text-primary-foreground text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30"
                  value={currentVoucherId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      loadExistingVoucher(e.target.value);
                    } else {
                      setIsEditing(false);
                      setCurrentVoucherId(null);
                    }
                  }}
                >
                  <option value="" className="text-foreground">+ New Voucher</option>
                  {existingVouchers.map((v) => (
                    <option key={v.id} value={v.id} className="text-foreground">
                      {v.voucherNumber || v.id?.slice(-6)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Section Nav */}
            <div className="flex md:hidden overflow-x-auto border-b border-border bg-primary shrink-0">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 whitespace-nowrap text-sm font-medium transition-colors ${
                    activeSection === section.id ? 'bg-primary-foreground text-primary border-b-2 border-primary-foreground' : 'text-primary-foreground/80 hover:text-primary-foreground'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </div>
            {/* Top Bar */}
            <div className="h-14 sm:h-16 bg-muted border-b border-border flex items-center justify-between px-3 sm:px-6 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-foreground text-sm sm:text-base truncate">{formData.packageDetails.name || 'Travel Package'}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> {formData.packageDetails.destination || 'Destination not set'}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {loadingPackage && <span className="text-xs text-muted-foreground hidden sm:inline">Loading...</span>}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/30">
              <form onSubmit={handleSubmit}>
                {/* OVERVIEW Section */}
                {activeSection === 'overview' && (
                  <div className="space-y-6">
                    {/* Package Summary - Full Width Banner */}
                    <div className="bg-primary rounded-2xl p-6 text-primary-foreground relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-primary-foreground/80 text-sm mb-1">Package</p>
                        <h2 className="text-2xl font-bold mb-4">{formData.packageDetails.name || 'Untitled Package'}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div><p className="text-primary-foreground/80 text-xs">Destination</p><p className="font-semibold">{formData.packageDetails.destination || '—'}</p></div>
                          <div><p className="text-primary-foreground/80 text-xs">Duration</p><p className="font-semibold">{formData.packageDetails.duration || 0} Days</p></div>
                          <div><p className="text-primary-foreground/80 text-xs">Category</p><p className="font-semibold">{formData.packageDetails.category || '—'}</p></div>
                          <div><p className="text-primary-foreground/80 text-xs">Hotels</p><p className="font-semibold">{formData.locationDates.length} Properties</p></div>
                        </div>
                      </div>
                    </div>

                    {/* Customer details */}
                    <div className="bg-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border">
                      <h4 className="font-bold text-foreground mb-4">Customer Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Name</label>
                          <Input type="text" value={formData.customer.name} onChange={(e) => setFormData((prev) => ({ ...prev, customer: { ...prev.customer, name: e.target.value } }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Email</label>
                          <Input type="email" value={formData.customer.email} onChange={(e) => setFormData((prev) => ({ ...prev, customer: { ...prev.customer, email: e.target.value } }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Phone</label>
                          <Input type="tel" value={formData.customer.phone} onChange={(e) => setFormData((prev) => ({ ...prev, customer: { ...prev.customer, phone: e.target.value } }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Address</label>
                          <Input type="text" value={formData.customer.address} onChange={(e) => setFormData((prev) => ({ ...prev, customer: { ...prev.customer, address: e.target.value } }))} />
                        </div>
                      </div>
                    </div>

                    {/* Travel Dates - Big Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Departure</p>
                            <p className="font-bold text-lg text-foreground">{formData.travelStartDate ? new Date(formData.travelStartDate).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Set'}</p>
                          </div>
                        </div>
                        <Input type="date" value={formData.travelStartDate} onChange={(e) => setFormData((prev) => ({ ...prev, travelStartDate: e.target.value }))} />
                      </div>
                      <div className="bg-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-warning" />
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Return</p>
                            <p className="font-bold text-lg text-foreground">{formData.travelEndDate ? new Date(formData.travelEndDate).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Set'}</p>
                          </div>
                        </div>
                        <Input type="date" value={formData.travelEndDate} onChange={(e) => setFormData((prev) => ({ ...prev, travelEndDate: e.target.value }))} />
                      </div>
                    </div>

                    {/* Inclusions/Exclusions Tags */}
                    {(formData.packageDetails.inclusions?.length > 0 || formData.packageDetails.exclusions?.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formData.packageDetails.inclusions?.length > 0 && (
                          <div className="bg-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border">
                            <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">✅ Inclusions</h4>
                            <div className="flex flex-wrap gap-2">{formData.packageDetails.inclusions.slice(0, 6).map((item: string, idx: number) => (<span key={idx} className="px-3 py-1.5 bg-success/10 text-success rounded-full text-xs font-medium">{item}</span>))}{formData.packageDetails.inclusions.length > 6 && <span className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs">+{formData.packageDetails.inclusions.length - 6}</span>}</div>
                          </div>
                        )}
                        {formData.packageDetails.exclusions?.length > 0 && (
                          <div className="bg-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border">
                            <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">❌ Exclusions</h4>
                            <div className="flex flex-wrap gap-2">{formData.packageDetails.exclusions.slice(0, 6).map((item: string, idx: number) => (<span key={idx} className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">{item}</span>))}{formData.packageDetails.exclusions.length > 6 && <span className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs">+{formData.packageDetails.exclusions.length - 6}</span>}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* HOTELS Section */}
                {activeSection === 'hotels' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Hotel Accommodations</h3>
                        <p className="text-sm text-muted-foreground">{formData.locationDates.length} properties added</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEditLead?.(lead, activeSelectionId)}>
                          <Pencil className="w-4 h-4" /> Manage in itinerary editor
                        </Button>
                        <Button type="button" size="sm" onClick={addLocationDate}>
                          <Plus className="w-5 h-5" /> Add Hotel
                        </Button>
                      </div>
                    </div>
                    {formData.locationDates.length === 0 ? (
                      <div className="bg-card rounded-2xl p-12 text-center border-2 border-dashed border-border">
                        <Hotel className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No hotels added yet</p>
                        <p className="text-muted-foreground text-sm mt-1">Click "Add Hotel" to add accommodations</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.locationDates.map((loc: any, index: number) => (
                          <div key={index} className="bg-card rounded-2xl shadow-[var(--shadow-card)] border border-border overflow-hidden">
                            <div className="bg-muted px-5 py-3 flex justify-between items-center border-b border-border">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-sm">{index + 1}</span>
                                <span className="font-semibold text-foreground">{loc.hotelName || 'Hotel Name'}</span>
                              </div>
                              <button type="button" onClick={() => removeLocationDate(index)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">City/Location</label>
                                <Input type="text" value={loc.location} onChange={(e) => handleLocationDateChange(index, 'location', e.target.value)} placeholder="e.g. Paris" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Hotel Name</label>
                                <Input type="text" value={loc.hotelName || ''} onChange={(e) => handleLocationDateChange(index, 'hotelName', e.target.value)} placeholder="e.g. Hilton Paris" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Check-in</label>
                                <Input type="date" value={loc.checkIn} onChange={(e) => handleLocationDateChange(index, 'checkIn', e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Check-out</label>
                                <Input type="date" value={loc.checkOut} onChange={(e) => handleLocationDateChange(index, 'checkOut', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* MEALS Section */}
                {activeSection === 'meals' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground mb-2">Meal Plans</h3>
                    {formData.mealPlans.length === 0 ? (
                      <div className="bg-card rounded-2xl p-12 text-center border-2 border-dashed border-border">
                        <Utensils className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No meal plans available</p>
                        <p className="text-muted-foreground text-sm mt-1">Meal plans are loaded from the itinerary</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {formData.mealPlans.map((plan: any, index: number) => (
                          <div key={index} className="bg-card rounded-xl p-4 shadow-[var(--shadow-card)] border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <span className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold">{plan.dayNumber}</span>
                              <span className="text-xs text-muted-foreground">Day {plan.dayNumber}</span>
                            </div>
                            <div className="flex gap-2">
                              <div className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${plan.breakfast ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>🌅 B</div>
                              <div className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${plan.lunch ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>☀️ L</div>
                              <div className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${plan.dinner ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>🌙 D</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ITINERARY Section */}
                {activeSection === 'itinerary' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground mb-2">Itinerary Summary</h3>
                    {formData.itinerarySummary.length === 0 ? (
                      <div className="bg-card rounded-2xl p-12 text-center border-2 border-dashed border-border">
                        <MapPin className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No itinerary available</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-primary/30" />
                        <div className="space-y-4 pl-14">
                          {formData.itinerarySummary.map((day: any, index: number) => (
                            <div key={index} className="relative">
                              <div className="absolute -left-14 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-[var(--shadow-dropdown)]">{day.dayNumber}</div>
                              <div className="bg-card rounded-xl p-4 shadow-[var(--shadow-card)] border border-border">
                                <h4 className="font-semibold text-foreground">{day.title || `Day ${day.dayNumber}`}</h4>
                                {day.locations?.length > 0 && (<p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {day.locations.join(' → ')}</p>)}
                                {day.accommodationName && (<p className="text-xs text-primary mt-2 flex items-center gap-1"><Hotel className="w-3 h-3" /> {day.accommodationName}</p>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FLIGHTS Section */}
                {activeSection === 'flights' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Flight Segments</h3>
                        <p className="text-sm text-muted-foreground">{formData.flightSegments.length} segments added</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEditLead?.(lead, activeSelectionId)}>
                          <Pencil className="w-4 h-4" /> Manage flights & itinerary
                        </Button>
                        <Button type="button" size="sm" onClick={addFlightSegment}>
                          <Plus className="w-5 h-5" /> Add Flight
                        </Button>
                      </div>
                    </div>
                    {formData.flightSegments.length === 0 ? (
                      <div className="bg-card rounded-2xl p-12 text-center border-2 border-dashed border-border">
                        <Plane className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No flight segments added yet</p>
                        <p className="text-muted-foreground text-sm mt-1">Segments booked for this lead's itinerary load automatically, or add one manually</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.flightSegments.map((seg: any, index: number) => (
                          <div key={index} className="bg-card rounded-2xl shadow-[var(--shadow-card)] border border-border overflow-hidden">
                            <div className="bg-muted px-5 py-3 flex justify-between items-center border-b border-border">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-sm">{index + 1}</span>
                                <span className="font-semibold text-foreground">{seg.marketingCarrier || ''} {seg.flightNumber || 'Flight'}</span>
                              </div>
                              <button type="button" onClick={() => removeFlightSegment(index)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Day</label>
                                <Input type="number" min="1" value={seg.dayNumber ?? ''} onChange={(e) => handleFlightSegmentChange(index, 'dayNumber', e.target.value ? Number(e.target.value) : '')} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Carrier</label>
                                <Input type="text" value={seg.marketingCarrier || ''} onChange={(e) => handleFlightSegmentChange(index, 'marketingCarrier', e.target.value)} placeholder="e.g. UL" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Flight No.</label>
                                <Input type="text" value={seg.flightNumber || ''} onChange={(e) => handleFlightSegmentChange(index, 'flightNumber', e.target.value)} placeholder="e.g. UL103" />
                              </div>
                              <div />
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Origin</label>
                                <Input type="text" value={seg.origin || ''} onChange={(e) => handleFlightSegmentChange(index, 'origin', e.target.value)} placeholder="e.g. CMB" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Destination</label>
                                <Input type="text" value={seg.destination || ''} onChange={(e) => handleFlightSegmentChange(index, 'destination', e.target.value)} placeholder="e.g. MLE" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Departs</label>
                                <Input type="datetime-local" value={seg.departureAt ? new Date(seg.departureAt).toISOString().slice(0, 16) : ''} onChange={(e) => handleFlightSegmentChange(index, 'departureAt', e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Arrives</label>
                                <Input type="datetime-local" value={seg.arrivalAt ? new Date(seg.arrivalAt).toISOString().slice(0, 16) : ''} onChange={(e) => handleFlightSegmentChange(index, 'arrivalAt', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* NOTES Section */}
                {activeSection === 'notes' && (
                  <div className="space-y-6">
                    <div className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)] border border-border">
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2"><span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></span>Special Instructions</h4>
                      <Textarea value={formData.specialInstructions} onChange={(e) => setFormData((prev) => ({ ...prev, specialInstructions: e.target.value }))} rows={4} className="resize-none" placeholder="Enter any special instructions for the customer..." />
                    </div>
                    <div className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)] border border-border">
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2"><span className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">📝</span>Internal Notes</h4>
                      <Textarea value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} rows={3} className="resize-none" placeholder="Internal notes (not visible on voucher)..." />
                    </div>
                    {currentVoucherId && (
                      <SendDocumentPanel
                        channel={channel}
                        onChannelChange={setChannel}
                        email={sendEmail}
                        onEmailChange={setSendEmail}
                        phone={sendPhone}
                        onPhoneChange={setSendPhone}
                        onSend={handleSend}
                        sending={sending}
                      />
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Bottom Action Bar */}
            <div className="h-auto sm:h-20 bg-card border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-0 gap-2 sm:gap-0 shrink-0">
              <div className="flex items-center gap-3">
                {currentVoucherId && (
                  <>
                    <Button variant="secondary" size="sm" onClick={handlePreviewPDF}><Eye className="w-4 h-4" />Preview</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF()}><Download className="w-4 h-4" />Download</Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  <Save className="w-5 h-5" />{loading ? 'Saving...' : isEditing ? 'Update' : 'Create Voucher'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showPDFPreview && currentVoucherId && (
        <PDFPreviewDialog isOpen={showPDFPreview} onClose={() => setShowPDFPreview(false)} pdfUrl={`/billing/vouchers/${currentVoucherId}/pdf`} documentName={`voucher-${currentVoucherId}`} onDownload={() => handleDownloadPDF(currentVoucherId)} />
      )}
    </>
  );
};

export default VoucherDialog;
