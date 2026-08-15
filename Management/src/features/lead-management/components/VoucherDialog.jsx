import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save, Eye, Download, Plus, Trash2, Calendar, MapPin, Hotel, Utensils, FileText, Ticket, ChevronRight, User, Clock, Globe, Plane, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { voucherAPI, packageAPI, leadAPI } from '../../../services/api';
import { flightAPI } from '../../../services/flight.service';
import PDFPreviewDialog from './PDFPreviewDialog';
import SendDocumentPanel from './shared/SendDocumentPanel';
import { LOCALE } from '../../../utils/currency.js';

const buildHotelStaysFromDays = (days, travelStartDate) => {
  const hotelBookings = [];
  let currentStay = null;
  const getDate = (offset) => {
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

const emptyFormData = (lead) => ({
  leadId: lead?.id || lead?._id,
  packageId: '',
  customizedPackageId: '',
  customer: { name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '', address: '' },
  locationDates: [],
  travelStartDate: lead?.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
  travelEndDate: lead?.endDate ? new Date(lead.endDate).toISOString().split('T')[0] : '',
  mealPlans: [],
  itinerarySummary: [],
  flightSegments: [],
  packageDetails: { name: '', destination: '', duration: 0, category: '', inclusions: [], exclusions: [], highlights: [] },
  notes: '',
  terms: [],
  specialInstructions: '',
});

const VoucherDialog = ({ isOpen, onClose, lead, onSuccess, onEditLead, initialSelectionId }) => {
  const leadId = lead?.id || lead?._id;

  const [loading, setLoading] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentVoucherId, setCurrentVoucherId] = useState(null);
  const [existingVouchers, setExistingVouchers] = useState([]);
  const [currentVoucher, setCurrentVoucher] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const [selections, setSelections] = useState([]);
  const [activeSelectionId, setActiveSelectionId] = useState(null);
  const activeSelection = useMemo(
    () => selections.find((s) => s.id === activeSelectionId) || null,
    [selections, activeSelectionId],
  );

  const [channel, setChannel] = useState('email');
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState(emptyFormData(lead));

  const loadSelections = useCallback(async () => {
    if (!leadId) return;
    setLoadingPackage(true);
    try {
      const res = await leadAPI.getPackageSelections(leadId);
      const list = res?.data || [];
      setSelections(list);
      const mostRecentlyAccepted = [...list]
        .filter((s) => s.quoteAcceptedAt)
        .sort((a, b) => new Date(b.quoteAcceptedAt) - new Date(a.quoteAcceptedAt))[0];
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
      const flightSegments = bookings.flatMap((booking) =>
        [...(booking.segments || [])]
          .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
          .map((seg) => ({
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
      setCurrentVoucher(null);
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
      let packageDetails = {
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
        mealPlans: days.map((day) => ({
          dayNumber: day.dayNumber,
          dayTitle: day.title || '',
          breakfast: (day.breakfastCount || 0) > 0,
          lunch: (day.lunchCount || 0) > 0,
          dinner: (day.dinnerCount || 0) > 0,
        })),
        itinerarySummary: days.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title || '',
          locations: (day.places || []).map((p) => p.customName).filter(Boolean),
          activities: (day.activities || []).map((a) => a.name).filter(Boolean),
          accommodationName: day.accommodation?.name || '',
          accommodationType: day.accommodation?.type || '',
        })),
        locationDates: buildHotelStaysFromDays(days, prev.travelStartDate),
      }));
    })();
  }, [activeSelection]);

  const handleLocationDateChange = (index, field, value) => { setFormData(prev => { const newLocationDates = [...prev.locationDates]; newLocationDates[index] = { ...newLocationDates[index], [field]: value }; return { ...prev, locationDates: newLocationDates }; }); };
  const addLocationDate = () => { setFormData(prev => ({ ...prev, locationDates: [...prev.locationDates, { location: '', hotelName: '', checkIn: '', checkOut: '' }] })); };
  const removeLocationDate = (index) => { setFormData(prev => ({ ...prev, locationDates: prev.locationDates.filter((_, i) => i !== index) })); };

  const handleFlightSegmentChange = (index, field, value) => { setFormData(prev => { const segments = [...prev.flightSegments]; segments[index] = { ...segments[index], [field]: value }; return { ...prev, flightSegments: segments }; }); };
  const addFlightSegment = () => { setFormData(prev => ({ ...prev, flightSegments: [...prev.flightSegments, { dayNumber: '', marketingCarrier: '', flightNumber: '', origin: '', destination: '', departureAt: '', arrivalAt: '' }] })); };
  const removeFlightSegment = (index) => { setFormData(prev => ({ ...prev, flightSegments: prev.flightSegments.filter((_, i) => i !== index) })); };

  const handleSubmit = async (e) => {
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
        locationDates: formData.locationDates?.filter(ld => ld.location?.trim() || ld.hotelName?.trim()) || [],
        mealPlans: formData.mealPlans || [],
        itinerarySummary: (formData.itinerarySummary || []).map(day => ({
          dayNumber: day.dayNumber,
          title: day.title || '',
          locations: day.locations || [],
          activities: day.activities || [],
          accommodationName: day.accommodationName || '',
          accommodationType: day.accommodationType || '',
        })),
        flightSegments: (formData.flightSegments || []).filter(f => f.marketingCarrier?.trim() || f.flightNumber?.trim()),
      };

      let response;
      if (isEditing && currentVoucherId) response = await voucherAPI.update(currentVoucherId, cleanedFormData);
      else response = await voucherAPI.create(cleanedFormData);

      const newVoucherId = response.data?.id;
      setCurrentVoucherId(newVoucherId);
      setCurrentVoucher(response.data);
      toast.success(isEditing ? 'Voucher updated successfully' : 'Voucher created successfully');
      if (onSuccess) onSuccess();
      fetchExistingVouchers();
      setIsEditing(true);
    } catch (error) {
      toast.error(error.message || 'Failed to save voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (voucherId = null) => {
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
      const response = await voucherAPI.send(currentVoucherId, payload);
      if (response.data) setCurrentVoucher(response.data);
      toast.success(channel === 'email' ? 'Voucher emailed' : 'Voucher sent via WhatsApp');
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Failed to send voucher');
    } finally {
      setSending(false);
    }
  };

  const loadExistingVoucher = async (voucherId) => {
    try {
      const response = await voucherAPI.getById(voucherId);
      const voucher = response.data || response;
      setCurrentVoucher(voucher);
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

  if (!isOpen) return null;
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Ticket },
    { id: 'hotels', label: 'Hotels', icon: Hotel },
    { id: 'meals', label: 'Meals', icon: Utensils },
    { id: 'itinerary', label: 'Itinerary', icon: MapPin },
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-3" onClick={handleBackdropClick}>
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-6xl h-full sm:h-[92vh] overflow-hidden flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <div className="hidden md:flex w-64 bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 text-white flex-col shrink-0">
          {/* Logo Area */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Voucher</h2>
                <p className="text-emerald-200 text-xs">{isEditing ? 'Edit Mode' : 'Create New'}</p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{lead?.name || 'Guest'}</p>
                <p className="text-emerald-200 text-xs truncate">{lead?.email || 'No email'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <p className="text-emerald-200">Duration</p>
                <p className="font-semibold">{formData.packageDetails.duration || 0} Days</p>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <p className="text-emerald-200">Hotels</p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all text-left ${activeSection === section.id ? 'bg-white text-emerald-700 shadow-lg' : 'text-white/80 hover:bg-white/10'}`}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{section.label}</span>
                {activeSection === section.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </nav>

          {/* Package selector (only when the lead has more than one) */}
          {selections.length > 1 && (
            <div className="p-4 border-t border-white/10">
              <p className="text-xs text-emerald-200 mb-2">Package</p>
              <select
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                value={activeSelectionId || ''}
                onChange={(e) => setActiveSelectionId(e.target.value)}
              >
                {selections.map((s) => (
                  <option key={s.id} value={s.id} className="text-gray-900">
                    {s.isManual ? 'Manual Itinerary' : (s.packageName || 'Package')}{s.quoteAcceptedAt ? ' (accepted)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Existing Vouchers */}
          {existingVouchers.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <p className="text-xs text-emerald-200 mb-2">Existing Vouchers</p>
              <select
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                value={currentVoucherId || ''}
                onChange={(e) => e.target.value ? loadExistingVoucher(e.target.value) : (setIsEditing(false), setCurrentVoucherId(null), setCurrentVoucher(null))}
              >
                <option value="" className="text-gray-900">+ New Voucher</option>
                {existingVouchers.map((v) => (
                  <option key={v.id} value={v.id} className="text-gray-900">
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
          <div className="flex md:hidden overflow-x-auto border-b border-gray-200 bg-emerald-600 shrink-0">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-4 py-3 whitespace-nowrap text-sm font-medium transition-colors ${activeSection === section.id ? 'bg-white text-emerald-700 border-b-2 border-white' : 'text-white/80 hover:text-white'}`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
          {/* Top Bar */}
          <div className="h-14 sm:h-16 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shrink-0">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{formData.packageDetails.name || 'Travel Package'}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" /> {formData.packageDetails.destination || 'Destination not set'}</p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {loadingPackage && <span className="text-xs text-gray-400 hidden sm:inline">Loading...</span>}
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50">
            <form onSubmit={handleSubmit}>
              {/* OVERVIEW Section */}
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  {/* Package Summary - Full Width Banner */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="relative z-10">
                      <p className="text-emerald-100 text-sm mb-1">Package</p>
                      <h2 className="text-2xl font-bold mb-4">{formData.packageDetails.name || 'Untitled Package'}</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div><p className="text-emerald-100 text-xs">Destination</p><p className="font-semibold">{formData.packageDetails.destination || '—'}</p></div>
                        <div><p className="text-emerald-100 text-xs">Duration</p><p className="font-semibold">{formData.packageDetails.duration || 0} Days</p></div>
                        <div><p className="text-emerald-100 text-xs">Category</p><p className="font-semibold">{formData.packageDetails.category || '—'}</p></div>
                        <div><p className="text-emerald-100 text-xs">Hotels</p><p className="font-semibold">{formData.locationDates.length} Properties</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-4">Customer Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Name</label>
                        <input type="text" value={formData.customer.name} onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, name: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Email</label>
                        <input type="email" value={formData.customer.email} onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, email: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Phone</label>
                        <input type="tel" value={formData.customer.phone} onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, phone: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Address</label>
                        <input type="text" value={formData.customer.address} onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, address: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                  </div>

                  {/* Travel Dates - Big Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Departure</p>
                          <p className="font-bold text-lg text-gray-900">{formData.travelStartDate ? new Date(formData.travelStartDate).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Set'}</p>
                        </div>
                      </div>
                      <input type="date" value={formData.travelStartDate} onChange={(e) => setFormData(prev => ({ ...prev, travelStartDate: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                          <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Return</p>
                          <p className="font-bold text-lg text-gray-900">{formData.travelEndDate ? new Date(formData.travelEndDate).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Set'}</p>
                        </div>
                      </div>
                      <input type="date" value={formData.travelEndDate} onChange={(e) => setFormData(prev => ({ ...prev, travelEndDate: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>

                  {/* Inclusions/Exclusions Tags */}
                  {(formData.packageDetails.inclusions?.length > 0 || formData.packageDetails.exclusions?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {formData.packageDetails.inclusions?.length > 0 && (
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">✅ Inclusions</h4>
                          <div className="flex flex-wrap gap-2">{formData.packageDetails.inclusions.slice(0, 6).map((item, idx) => (<span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">{item}</span>))}{formData.packageDetails.inclusions.length > 6 && <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs">+{formData.packageDetails.inclusions.length - 6}</span>}</div>
                        </div>
                      )}
                      {formData.packageDetails.exclusions?.length > 0 && (
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">❌ Exclusions</h4>
                          <div className="flex flex-wrap gap-2">{formData.packageDetails.exclusions.slice(0, 6).map((item, idx) => (<span key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">{item}</span>))}{formData.packageDetails.exclusions.length > 6 && <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs">+{formData.packageDetails.exclusions.length - 6}</span>}</div>
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
                      <h3 className="text-xl font-bold text-gray-900">Hotel Accommodations</h3>
                      <p className="text-sm text-gray-500">{formData.locationDates.length} properties added</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEditLead?.(lead, activeSelectionId)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm">
                        <Pencil className="w-4 h-4" /> Manage in itinerary editor
                      </button>
                      <button type="button" onClick={addLocationDate} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-medium">
                        <Plus className="w-5 h-5" /> Add Hotel
                      </button>
                    </div>
                  </div>
                  {formData.locationDates.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                      <Hotel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No hotels added yet</p>
                      <p className="text-gray-400 text-sm mt-1">Click "Add Hotel" to add accommodations</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.locationDates.map((loc, index) => (
                        <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 flex justify-between items-center border-b border-amber-100">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">{index + 1}</span>
                              <span className="font-semibold text-gray-800">{loc.hotelName || 'Hotel Name'}</span>
                            </div>
                            <button type="button" onClick={() => removeLocationDate(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">City/Location</label>
                              <input type="text" value={loc.location} onChange={(e) => handleLocationDateChange(index, 'location', e.target.value)} placeholder="e.g. Paris" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Hotel Name</label>
                              <input type="text" value={loc.hotelName || ''} onChange={(e) => handleLocationDateChange(index, 'hotelName', e.target.value)} placeholder="e.g. Hilton Paris" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Check-in</label>
                              <input type="date" value={loc.checkIn} onChange={(e) => handleLocationDateChange(index, 'checkIn', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Check-out</label>
                              <input type="date" value={loc.checkOut} onChange={(e) => handleLocationDateChange(index, 'checkOut', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Meal Plans</h3>
                  {formData.mealPlans.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                      <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No meal plans available</p>
                      <p className="text-gray-400 text-sm mt-1">Meal plans are loaded from the itinerary</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {formData.mealPlans.map((plan, index) => (
                        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <span className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl flex items-center justify-center font-bold">{plan.dayNumber}</span>
                            <span className="text-xs text-gray-400">Day {plan.dayNumber}</span>
                          </div>
                          <div className="flex gap-2">
                            <div className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${plan.breakfast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>🌅 B</div>
                            <div className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${plan.lunch ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>☀️ L</div>
                            <div className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${plan.dinner ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>🌙 D</div>
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Itinerary Summary</h3>
                  {formData.itinerarySummary.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                      <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No itinerary available</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500 to-blue-500" />
                      <div className="space-y-4 pl-14">
                        {formData.itinerarySummary.map((day, index) => (
                          <div key={index} className="relative">
                            <div className="absolute -left-14 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">{day.dayNumber}</div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                              <h4 className="font-semibold text-gray-900">{day.title || `Day ${day.dayNumber}`}</h4>
                              {day.locations?.length > 0 && (<p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {day.locations.join(' → ')}</p>)}
                              {day.accommodationName && (<p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><Hotel className="w-3 h-3" /> {day.accommodationName}</p>)}
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
                      <h3 className="text-xl font-bold text-gray-900">Flight Segments</h3>
                      <p className="text-sm text-gray-500">{formData.flightSegments.length} segments added</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEditLead?.(lead, activeSelectionId)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm">
                        <Pencil className="w-4 h-4" /> Manage flights & itinerary
                      </button>
                      <button type="button" onClick={addFlightSegment} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-medium">
                        <Plus className="w-5 h-5" /> Add Flight
                      </button>
                    </div>
                  </div>
                  {formData.flightSegments.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                      <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No flight segments added yet</p>
                      <p className="text-gray-400 text-sm mt-1">Segments booked for this lead's itinerary load automatically, or add one manually</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.flightSegments.map((seg, index) => (
                        <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-5 py-3 flex justify-between items-center border-b border-sky-100">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-sky-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">{index + 1}</span>
                              <span className="font-semibold text-gray-800">{seg.marketingCarrier || ''} {seg.flightNumber || 'Flight'}</span>
                            </div>
                            <button type="button" onClick={() => removeFlightSegment(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Day</label>
                              <input type="number" min="1" value={seg.dayNumber ?? ''} onChange={(e) => handleFlightSegmentChange(index, 'dayNumber', e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Carrier</label>
                              <input type="text" value={seg.marketingCarrier || ''} onChange={(e) => handleFlightSegmentChange(index, 'marketingCarrier', e.target.value)} placeholder="e.g. UL" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Flight No.</label>
                              <input type="text" value={seg.flightNumber || ''} onChange={(e) => handleFlightSegmentChange(index, 'flightNumber', e.target.value)} placeholder="e.g. UL103" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div />
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Origin</label>
                              <input type="text" value={seg.origin || ''} onChange={(e) => handleFlightSegmentChange(index, 'origin', e.target.value)} placeholder="e.g. CMB" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Destination</label>
                              <input type="text" value={seg.destination || ''} onChange={(e) => handleFlightSegmentChange(index, 'destination', e.target.value)} placeholder="e.g. MLE" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Departs</label>
                              <input type="datetime-local" value={seg.departureAt ? new Date(seg.departureAt).toISOString().slice(0, 16) : ''} onChange={(e) => handleFlightSegmentChange(index, 'departureAt', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Arrives</label>
                              <input type="datetime-local" value={seg.arrivalAt ? new Date(seg.arrivalAt).toISOString().slice(0, 16) : ''} onChange={(e) => handleFlightSegmentChange(index, 'arrivalAt', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500" />
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
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><FileText className="w-4 h-4 text-blue-600" /></span>Special Instructions</h4>
                    <textarea value={formData.specialInstructions} onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))} rows="4" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 text-gray-700" placeholder="Enter any special instructions for the customer..." />
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">📝</span>Internal Notes</h4>
                    <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows="3" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 text-gray-700" placeholder="Internal notes (not visible on voucher)..." />
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
          <div className="h-auto sm:h-20 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-0 gap-2 sm:gap-0 shrink-0">
            <div className="flex items-center gap-3">
              {currentVoucherId && (
                <>
                  <button onClick={handlePreviewPDF} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm"><Eye className="w-4 h-4" />Preview</button>
                  <button onClick={() => handleDownloadPDF()} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"><Download className="w-4 h-4" />Download</button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium">Cancel</button>
              <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 font-bold shadow-lg shadow-emerald-200">
                <Save className="w-5 h-5" />{loading ? 'Saving...' : isEditing ? 'Update' : 'Create Voucher'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPDFPreview && currentVoucherId && (
        <PDFPreviewDialog isOpen={showPDFPreview} onClose={() => setShowPDFPreview(false)} pdfUrl={`/billing/vouchers/${currentVoucherId}/pdf`} documentName={`voucher-${currentVoucherId}`} onDownload={() => handleDownloadPDF(currentVoucherId)} />
      )}
    </div>
  );
};

export default VoucherDialog;
