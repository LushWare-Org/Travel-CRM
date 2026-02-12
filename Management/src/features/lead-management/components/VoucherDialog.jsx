import { useState, useEffect } from 'react';
import { X, Save, Eye, Send, MessageCircle, Download, Plus, Trash2, Calendar, MapPin, Hotel, Utensils, FileText, Ticket, ChevronRight, User, Clock, Globe, Plane } from 'lucide-react';
import toast from 'react-hot-toast';
import { voucherAPI, packageAPI, customizedPackageAPI, itineraryAPI, quotationAPI, manualItineraryAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';
import { getThankYouMessage } from '../../../config/branding';
import { LOCALE } from '../../../utils/currency.js';

const VoucherDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentVoucherId, setCurrentVoucherId] = useState(null);
  const [existingVouchers, setExistingVouchers] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [allVouchers, setAllVouchers] = useState([]);
  const [loadingAllVouchers, setLoadingAllVouchers] = useState(false);
  const [selectedVoucherForDownload, setSelectedVoucherForDownload] = useState('');
  const [sendEmailAddress, setSendEmailAddress] = useState(lead?.email || lead?.customer?.email || '');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [itineraryData, setItineraryData] = useState(null);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [allLocations, setAllLocations] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');

  const [formData, setFormData] = useState({
    lead: lead?._id || lead?.id,
    package: lead?.package?._id || lead?.package || '',
    customizedPackage: lead?.customizedPackage?._id || lead?.customizedPackage || '',
    customer: { name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '', address: lead?.address || '' },
    locationDates: [],
    travelStartDate: '',
    travelEndDate: '',
    mealPlans: [],
    itinerarySummary: [],
    packageDetails: { name: '', destination: '', duration: 0, category: '', inclusions: [], exclusions: [], highlights: [] },
    notes: '',
    terms: [],
    specialInstructions: '',
  });

  // === ALL LOGIC FUNCTIONS PRESERVED ===
  useEffect(() => {
    if (isOpen && lead) {
      setFormData({
        lead: lead._id || lead.id,
        package: '',
        customizedPackage: '',
        customer: { name: lead.name || '', email: lead.email || '', phone: lead.phone || '', address: lead.address || '' },
        locationDates: [],
        travelStartDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
        travelEndDate: lead.endDate ? new Date(lead.endDate).toISOString().split('T')[0] : '',
        mealPlans: [],
        itinerarySummary: [],
        packageDetails: { name: '', destination: '', duration: 0, category: '', inclusions: [], exclusions: [], highlights: [], images: [], coverImage: null, price: 0 },
        notes: '',
        terms: [],
        specialInstructions: '',
      });
      setPackageData(null);
      setItineraryData(null);
      setAllLocations([]);
      setCurrentVoucher(null);
      setIsEditing(false);
      setSendEmailAddress(lead?.email || lead?.customer?.email || '');
      fetchExistingVouchers();
      fetchAllVouchers();
      loadPackageAndItinerary();
    }
  }, [isOpen, lead?._id]);

  const loadPackageAndItinerary = async () => {
    if (!lead) return;
    try {
      setLoadingPackage(true);
      let pkg = null;
      let itineraryId = null;

      if (lead.customizedPackage?._id || lead.customizedPackage) {
        const packageId = lead.customizedPackage._id || lead.customizedPackage;
        const response = await customizedPackageAPI.getById(packageId);
        if (response.success || response.status === 'success') {
          pkg = response.data || response;
          setPackageData(pkg);
          setFormData(prev => ({
            ...prev,
            customizedPackage: packageId,
            packageDetails: { name: pkg.name || '', destination: pkg.destination || '', duration: pkg.duration || 0, category: pkg.category || '', inclusions: pkg.inclusions || [], exclusions: pkg.exclusions || [], highlights: pkg.highlights || [] },
          }));
          itineraryId = pkg.itinerary?._id || pkg.itinerary?.id || pkg.itinerary;
        }
      } else if (lead.package?._id || lead.package) {
        const packageId = lead.package._id || lead.package;
        const response = await packageAPI.getById(packageId);
        if (response.success || response.status === 'success') {
          pkg = response.data || response;
          setPackageData(pkg);
          setFormData(prev => ({
            ...prev,
            package: packageId,
            packageDetails: { name: pkg.name || '', destination: pkg.destination || '', duration: pkg.duration || 0, category: pkg.category || '', inclusions: pkg.inclusions || [], exclusions: pkg.exclusions || [], highlights: pkg.highlights || [] },
          }));
          itineraryId = pkg.itinerary?._id || pkg.itinerary?.id || pkg.itinerary;
        }
      } else {
        try {
          const quotationResponse = await quotationAPI.getByLead(lead._id || lead.id);
          if (quotationResponse.success || quotationResponse.status === 'success') {
            const quotations = quotationResponse.data?.quotations || quotationResponse.data || [];
            let selectedQuotation = quotations.find(q => q.itinerary);
            if (!selectedQuotation && quotations.length > 0) selectedQuotation = quotations[0];
            if (selectedQuotation) {
              itineraryId = selectedQuotation.itinerary?._id || selectedQuotation.itinerary;
              if (!itineraryId && (lead.itinerary?._id || lead.itinerary)) itineraryId = lead.itinerary._id || lead.itinerary;
              const quoteImages = selectedQuotation.images?.length > 0 ? selectedQuotation.images.map(img => ({ url: img.url, isCover: img.isCover || false })) : (selectedQuotation.coverImage ? [{ url: selectedQuotation.coverImage, isCover: true }] : []);
              const coverImg = quoteImages.find(img => img.isCover) || quoteImages[0];
              setFormData(prev => ({
                ...prev,
                packageDetails: { name: selectedQuotation.package?.name || 'Manual Itinerary', destination: lead.destination || 'Custom Destination', duration: 0, category: 'Custom', inclusions: selectedQuotation.includedServices || [], exclusions: selectedQuotation.excludedServices || [], highlights: [], images: quoteImages, coverImage: coverImg ? { url: coverImg.url } : null, price: selectedQuotation.totalAmount || 0 },
              }));
            }
          }
        } catch (error) { console.error('[Voucher] Error loading manual itinerary:', error); }
      }

      if (itineraryId) {
        try {
          let itineraryResponse;
          if (!lead.package && !lead.customizedPackage) {
            itineraryResponse = await manualItineraryAPI.getByLead(lead._id || lead.id);
          } else {
            const itineraryIdString = typeof itineraryId === 'object' ? (itineraryId._id || itineraryId.id || null) : itineraryId;
            if (!itineraryIdString) return;
            itineraryResponse = await itineraryAPI.getById(itineraryIdString);
          }
          if (itineraryResponse.success || itineraryResponse.status === 'success') {
            const itinerary = itineraryResponse.data || itineraryResponse;
            setItineraryData(itinerary);
            if (!lead.package && !lead.customizedPackage && itinerary.days?.length) {
              setFormData(prev => ({ ...prev, packageDetails: { ...prev.packageDetails, duration: itinerary.days.length } }));
            }
            const locationsSet = new Set();
            itinerary.days?.forEach(day => { day.locations?.forEach(loc => { if (loc) locationsSet.add(loc); }); });
            setAllLocations(Array.from(locationsSet));
            if (itinerary.days?.length > 0) {
              const hotelBookings = [];
              let currentStay = null;
              const travelStartDate = lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '';
              const getDate = (offset) => { if (!travelStartDate) return ''; const date = new Date(travelStartDate); date.setDate(date.getDate() + offset); return date.toISOString().split('T')[0]; };
              itinerary.days.forEach((day) => {
                const hotelName = day.accommodation?.name;
                const location = day.locations?.length > 0 ? day.locations[0] : '';
                if (hotelName) {
                  if (currentStay && currentStay.hotelName === hotelName) { currentStay.endDayNum = day.dayNumber; }
                  else { if (currentStay) hotelBookings.push(currentStay); currentStay = { location: location || (currentStay ? currentStay.location : ''), hotelName, startDayNum: day.dayNumber, endDayNum: day.dayNumber }; }
                } else if (currentStay) { hotelBookings.push(currentStay); currentStay = null; }
              });
              if (currentStay) hotelBookings.push(currentStay);
              const newLocationDates = hotelBookings.map(stay => ({ location: stay.location, hotelName: stay.hotelName, checkIn: getDate(stay.startDayNum - 1), checkOut: getDate(stay.endDayNum) }));
              if (newLocationDates.length === 0 && Array.from(locationsSet).length > 0) Array.from(locationsSet).forEach(loc => { newLocationDates.push({ location: loc, hotelName: '', checkIn: '', checkOut: '' }); });
              setFormData(prev => ({ ...prev, locationDates: newLocationDates.length > 0 ? newLocationDates : prev.locationDates }));
            } else if (Array.from(locationsSet).length > 0) {
              setFormData(prev => { if (prev.locationDates.length === 0) return { ...prev, locationDates: Array.from(locationsSet).map(location => ({ location, hotelName: '', checkIn: '', checkOut: '' })) }; return prev; });
            }
            setFormData(prev => ({
              ...prev,
              mealPlans: itinerary.days?.map(day => ({ dayNumber: day.dayNumber, dayTitle: day.title || '', breakfast: day.meals?.breakfast || false, lunch: day.meals?.lunch || false, dinner: day.meals?.dinner || false })) || [],
              itinerarySummary: itinerary.days?.map(day => ({ dayNumber: day.dayNumber, title: day.title || '', locations: day.locations || [], activities: day.activities || [], accommodation: { name: day.accommodation?.name || '', type: day.accommodation?.type || '' } })) || [],
            }));
          }
        } catch (error) { console.error('Error loading itinerary:', error); }
      }
    } catch (error) { console.error('Error loading package:', error); toast.error('Failed to load package data'); }
    finally { setLoadingPackage(false); }
  };

  const fetchExistingVouchers = async () => {
    if (!lead?._id && !lead?.id) return;
    try { setLoadingExisting(true); const response = await voucherAPI.getByLead(lead._id || lead.id); if (response.success || response.status === 'success') { const vouchersData = response.data?.vouchers || response.data?.data || response.data || []; setExistingVouchers(Array.isArray(vouchersData) ? vouchersData : []); } } catch (error) { console.error('Error fetching existing vouchers:', error); } finally { setLoadingExisting(false); }
  };

  const fetchAllVouchers = async () => {
    try { setLoadingAllVouchers(true); const response = await voucherAPI.getAll({ limit: 1000, page: 1 }); if (response.success || response.status === 'success') setAllVouchers(Array.isArray(response.data) ? response.data : []); } catch (error) { console.error('Error fetching all vouchers:', error); } finally { setLoadingAllVouchers(false); }
  };

  const handleLocationDateChange = (index, field, value) => { setFormData(prev => { const newLocationDates = [...prev.locationDates]; newLocationDates[index] = { ...newLocationDates[index], [field]: value }; return { ...prev, locationDates: newLocationDates }; }); };
  const addLocationDate = () => { setFormData(prev => ({ ...prev, locationDates: [...prev.locationDates, { location: '', hotelName: '', checkIn: '', checkOut: '' }] })); };
  const removeLocationDate = (index) => { setFormData(prev => ({ ...prev, locationDates: prev.locationDates.filter((_, i) => i !== index) })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const cleanedFormData = { ...formData, package: formData.package?.trim() ? formData.package : undefined, customizedPackage: formData.customizedPackage?.trim() ? formData.customizedPackage : undefined, itinerarySummary: formData.itinerarySummary?.map(day => ({ dayNumber: day.dayNumber, title: day.title || '', locations: day.locations || [], activities: day.activities || [], accommodation: day.accommodation && typeof day.accommodation === 'object' ? { name: day.accommodation.name || '', type: day.accommodation.type || '' } : { name: '', type: '' } })) || [], travelStartDate: formData.travelStartDate?.trim() ? formData.travelStartDate : null, travelEndDate: formData.travelEndDate?.trim() ? formData.travelEndDate : null, locationDates: formData.locationDates?.filter(ld => ld.location?.trim()) || [] };
      if (!cleanedFormData.package && !cleanedFormData.customizedPackage) { if (!formData.mealPlans?.length) delete cleanedFormData.mealPlans; if (cleanedFormData.packageDetails) { if (!cleanedFormData.packageDetails.inclusions?.length) delete cleanedFormData.packageDetails.inclusions; if (!cleanedFormData.packageDetails.exclusions?.length) delete cleanedFormData.packageDetails.exclusions; } }
      let response;
      if (isEditing && currentVoucherId) response = await voucherAPI.update(currentVoucherId, cleanedFormData);
      else response = await voucherAPI.create(cleanedFormData);
      if (response.success || response.status === 'success') { const newVoucherId = response.data?._id || response.data?.id; setCurrentVoucherId(newVoucherId); toast.success(isEditing ? 'Voucher updated successfully' : 'Voucher created successfully'); if (onSuccess) onSuccess(); fetchExistingVouchers(); setIsEditing(true); }
      else toast.error(response.message || 'Failed to save voucher');
    } catch (error) { toast.error(error.message || 'Failed to save voucher'); } finally { setLoading(false); }
  };

  const handleDownloadPDF = async (voucherId = null) => { const idToDownload = voucherId || currentVoucherId || selectedVoucherForDownload; if (!idToDownload) { toast.error('Please select a voucher to download'); return; } try { await voucherAPI.downloadPDF(idToDownload); toast.success('Voucher PDF downloaded'); } catch (error) { toast.error('Failed to download voucher PDF'); } };
  const handlePreviewPDF = async () => { if (!currentVoucherId) { toast.error('Please save the voucher first'); return; } setShowPDFPreview(true); };
  const handleSendEmail = async () => { if (!currentVoucherId) { toast.error('Please save the voucher first'); return; } if (!sendEmailAddress.trim()) { toast.error('Please enter an email address'); return; } try { setSendingEmail(true); const response = await voucherAPI.sendEmail(currentVoucherId, sendEmailAddress); if (response.success || response.status === 'success') toast.success('Voucher sent via email successfully'); else toast.error(response.message || 'Failed to send email'); } catch (error) { toast.error(error.message || 'Failed to send email'); } finally { setSendingEmail(false); } };
  const handleSendWhatsApp = () => { if (!lead?.whatsapp && !lead?.phone) { toast.error('WhatsApp number not available'); return; } const whatsappNumber = lead.whatsapp || lead.phone; const message = encodeURIComponent(`Hello ${lead.name},\n\nYour travel voucher has been prepared. Please check your email for details.\n\nVoucher Number: ${formData.voucherNumber || 'Pending'}\n\n${getThankYouMessage()}`); window.open(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${message}`, '_blank'); };

  const loadExistingVoucher = async (voucherId) => {
    try { const response = await voucherAPI.getById(voucherId); if (response.success || response.status === 'success') { const voucher = response.data || response; setCurrentVoucher(voucher); setCurrentVoucherId(voucherId); setIsEditing(true); setFormData({ lead: voucher.lead?._id || voucher.lead || lead._id || lead.id, package: voucher.package?._id || voucher.package || '', customizedPackage: voucher.customizedPackage?._id || voucher.customizedPackage || '', customer: voucher.customer || { name: lead.name || '', email: lead.email || '', phone: lead.phone || '', address: lead.address || '' }, locationDates: voucher.locationDates || [], travelStartDate: voucher.travelStartDate ? new Date(voucher.travelStartDate).toISOString().split('T')[0] : '', travelEndDate: voucher.travelEndDate ? new Date(voucher.travelEndDate).toISOString().split('T')[0] : '', mealPlans: voucher.mealPlans || [], itinerarySummary: voucher.itinerarySummary || [], packageDetails: voucher.packageDetails || formData.packageDetails, notes: voucher.notes || '', terms: voucher.terms || [], specialInstructions: voucher.specialInstructions || '' }); setSendEmailAddress(voucher.customer?.email || lead?.email || ''); } } catch (error) { toast.error('Failed to load voucher'); }
  };

  if (!isOpen) return null;
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Ticket },
    { id: 'hotels', label: 'Hotels', icon: Hotel },
    { id: 'meals', label: 'Meals', icon: Utensils },
    { id: 'itinerary', label: 'Itinerary', icon: MapPin },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-3" onClick={handleBackdropClick}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-hidden flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 text-white flex flex-col shrink-0">
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
                  <option key={v._id || v.id} value={v._id || v.id} className="text-gray-900">
                    {v.voucherNumber || v._id?.slice(-6)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-16 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div>
              <h3 className="font-bold text-gray-900">{formData.packageDetails.name || 'Travel Package'}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" /> {formData.packageDetails.destination || 'Destination not set'}</p>
            </div>
            <div className="flex items-center gap-2">
              {loadingPackage && <span className="text-xs text-gray-400">Loading...</span>}
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
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
                      <div className="grid grid-cols-4 gap-4">
                        <div><p className="text-emerald-100 text-xs">Destination</p><p className="font-semibold">{formData.packageDetails.destination || '—'}</p></div>
                        <div><p className="text-emerald-100 text-xs">Duration</p><p className="font-semibold">{formData.packageDetails.duration || 0} Days</p></div>
                        <div><p className="text-emerald-100 text-xs">Category</p><p className="font-semibold">{formData.packageDetails.category || '—'}</p></div>
                        <div><p className="text-emerald-100 text-xs">Hotels</p><p className="font-semibold">{formData.locationDates.length} Properties</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Travel Dates - Big Cards */}
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <button type="button" onClick={addLocationDate} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-medium">
                      <Plus className="w-5 h-5" /> Add Hotel
                    </button>
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
                          <div className="p-5 grid grid-cols-4 gap-4">
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
                    <div className="grid grid-cols-3 gap-3">
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
                              {day.accommodation?.name && (<p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><Hotel className="w-3 h-3" /> {day.accommodation.name}</p>)}
                            </div>
                          </div>
                        ))}
                      </div>
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
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-4">📤 Send Voucher</h4>
                      <div className="flex gap-3">
                        <input type="email" value={sendEmailAddress} onChange={(e) => setSendEmailAddress(e.target.value)} placeholder="customer@example.com" className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <button type="button" onClick={handleSendEmail} disabled={sendingEmail} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"><Send className="w-4 h-4" />{sendingEmail ? 'Sending...' : 'Email'}</button>
                        <button type="button" onClick={handleSendWhatsApp} className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4" />WhatsApp</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Bottom Action Bar */}
          <div className="h-20 bg-white border-t border-gray-200 flex items-center justify-between px-6 shrink-0">
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
