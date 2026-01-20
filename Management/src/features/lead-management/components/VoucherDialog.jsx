import { useState, useEffect } from 'react';
import { X, Save, Eye, Send, MessageCircle, Download, Plus, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { voucherAPI, packageAPI, customizedPackageAPI, itineraryAPI, quotationAPI, manualItineraryAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';

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

  const [formData, setFormData] = useState({
    lead: lead?._id || lead?.id,
    package: lead?.package?._id || lead?.package || '',
    customizedPackage: lead?.customizedPackage?._id || lead?.customizedPackage || '',
    customer: {
      name: lead?.name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      address: lead?.address || '',
    },
    locationDates: [],
    travelStartDate: '',
    travelEndDate: '',
    mealPlans: [],
    itinerarySummary: [],
    packageDetails: {
      name: '',
      destination: '',
      duration: 0,
      category: '',
      inclusions: [],
      exclusions: [],
      highlights: [],
    },
    notes: '',
    terms: [],
    specialInstructions: '',
  });

  useEffect(() => {
    if (isOpen && lead) {
      // RESET FORM DATA to initial state to prevent data mix-up between leads
      setFormData({
        lead: lead._id || lead.id,
        package: '',
        customizedPackage: '',
        customer: {
          name: lead.name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          address: lead.address || '',
        },
        locationDates: [],
        travelStartDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '',
        travelEndDate: lead.endDate ? new Date(lead.endDate).toISOString().split('T')[0] : '',
        mealPlans: [],
        itinerarySummary: [],
        packageDetails: {
          name: '',
          destination: '',
          duration: 0,
          category: '',
          inclusions: [],
          exclusions: [],
          highlights: [],
          images: [],
          coverImage: null,
          price: 0
        },
        notes: '',
        terms: [],
        specialInstructions: '',
      });

      // Reset other states
      setPackageData(null);
      setItineraryData(null);
      setAllLocations([]);
      setCurrentVoucher(null);
      setIsEditing(false);
      setSendEmailAddress(lead?.email || lead?.customer?.email || '');

      // Load fresh data
      fetchExistingVouchers();
      fetchAllVouchers();
      loadPackageAndItinerary();
    }
  }, [isOpen, lead?._id]); // Depend on lead._id specifically to trigger on lead change

  const loadPackageAndItinerary = async () => {
    if (!lead) return;

    try {
      setLoadingPackage(true);
      let pkg = null;
      let itineraryId = null;

      // Check for customized package first
      if (lead.customizedPackage?._id || lead.customizedPackage) {
        const packageId = lead.customizedPackage._id || lead.customizedPackage;
        const response = await customizedPackageAPI.getById(packageId);
        if (response.success || response.status === 'success') {
          pkg = response.data || response;
          setPackageData(pkg);
          setFormData(prev => ({
            ...prev,
            customizedPackage: packageId,
            packageDetails: {
              name: pkg.name || '',
              destination: pkg.destination || '',
              duration: pkg.duration || 0,
              category: pkg.category || '',
              inclusions: pkg.inclusions || [],
              exclusions: pkg.exclusions || [],
              highlights: pkg.highlights || [],
            },
          }));
          // Extract itinerary ID - handle both populated object and ID string
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
            packageDetails: {
              name: pkg.name || '',
              destination: pkg.destination || '',
              duration: pkg.duration || 0,
              category: pkg.category || '',
              inclusions: pkg.inclusions || [],
              exclusions: pkg.exclusions || [],
              highlights: pkg.highlights || [],
            },
          }));
          // Extract itinerary ID - handle both populated object and ID string
          itineraryId = pkg.itinerary?._id || pkg.itinerary?.id || pkg.itinerary;
        }
      } else {
        // MANUAL ITINERARY: Check for quotations with manual itinerary
        console.log('[Voucher] No package found, checking for manual itinerary in quotations');
        try {
          const quotationResponse = await quotationAPI.getByLead(lead._id || lead.id);
          console.log('[Voucher] Quotation response:', quotationResponse);

          if (quotationResponse.success || quotationResponse.status === 'success') {
            const quotations = quotationResponse.data?.quotations || quotationResponse.data || [];
            console.log('[Voucher] Found quotations:', quotations.length);

            // Find the most recent quotation (prefer ones with itinerary, but fallback to any)
            let selectedQuotation = quotations.find(q => q.itinerary);
            if (!selectedQuotation && quotations.length > 0) {
              selectedQuotation = quotations[0]; // Fallback to most recent
            }

            console.log('[Voucher] Selected quotation:', selectedQuotation);

            if (selectedQuotation) {
              itineraryId = selectedQuotation.itinerary?._id || selectedQuotation.itinerary;
              console.log('[Voucher] Itinerary ID from quotation:', itineraryId);

              // If no itinerary on quotation, check if lead has one
              if (!itineraryId && (lead.itinerary?._id || lead.itinerary)) {
                itineraryId = lead.itinerary._id || lead.itinerary;
                console.log('[Voucher] Itinerary ID from lead:', itineraryId);
              }

              // Extract images
              const quoteImages = selectedQuotation.images && selectedQuotation.images.length > 0
                ? selectedQuotation.images.map(img => ({
                  url: img.url,
                  isCover: img.isCover || false
                }))
                : (selectedQuotation.coverImage ? [{ url: selectedQuotation.coverImage, isCover: true }] : []);

              // Find cover image
              const coverImg = quoteImages.find(img => img.isCover) || quoteImages[0];
              const coverImgUrl = coverImg ? coverImg.url : null;

              console.log('[Voucher] Extracted images:', quoteImages.length);
              console.log('[Voucher] Quotation includedServices:', selectedQuotation.includedServices);
              console.log('[Voucher] Quotation excludedServices:', selectedQuotation.excludedServices);

              // Set package details from quotation
              // We'll update duration after loading the itinerary
              setFormData(prev => ({
                ...prev,
                packageDetails: {
                  name: selectedQuotation.package?.name || 'Manual Itinerary',
                  destination: lead.destination || 'Custom Destination',
                  duration: 0, // Will be updated after itinerary loads
                  category: 'Custom',
                  inclusions: selectedQuotation.includedServices || [],
                  exclusions: selectedQuotation.excludedServices || [],
                  highlights: [],
                  // Ensure images are passed
                  images: quoteImages,
                  coverImage: coverImgUrl ? { url: coverImgUrl } : null,
                  price: selectedQuotation.totalAmount || 0
                },
              }));

              console.log('[Voucher] Using manual quotation:', selectedQuotation._id, 'Itinerary:', itineraryId);
            } else {
              console.warn('[Voucher] No quotation found for manual itinerary lead');
            }
          }
        } catch (error) {
          console.error('[Voucher] Error loading manual itinerary:', error);
        }
      }

      // Load itinerary if available
      if (itineraryId) {
        console.log('[Voucher] Loading itinerary:', itineraryId);
        try {
          // For manual itineraries, we need to fetch by lead ID, not itinerary ID
          // because manualItineraryAPI doesn't have a getById method
          let itineraryResponse;

          if (!lead.package && !lead.customizedPackage) {
            // Manual itinerary - fetch by lead
            console.log('[Voucher] Fetching manual itinerary by lead ID');
            itineraryResponse = await manualItineraryAPI.getByLead(lead._id || lead.id);
          } else {
            // Regular itinerary - fetch by ID
            const itineraryIdString = typeof itineraryId === 'object'
              ? (itineraryId._id || itineraryId.id || null)
              : itineraryId;

            if (!itineraryIdString) {
              console.warn('Invalid itinerary ID:', itineraryId);
              return;
            }
            itineraryResponse = await itineraryAPI.getById(itineraryIdString);
          }

          console.log('[Voucher] Itinerary response:', itineraryResponse);

          if (itineraryResponse.success || itineraryResponse.status === 'success') {
            const itinerary = itineraryResponse.data || itineraryResponse;
            console.log('[Voucher] Loaded itinerary with', itinerary.days?.length, 'days');
            setItineraryData(itinerary);

            // Update duration for manual itineraries
            if (!lead.package && !lead.customizedPackage && itinerary.days?.length) {
              setFormData(prev => ({
                ...prev,
                packageDetails: {
                  ...prev.packageDetails,
                  duration: itinerary.days.length
                }
              }));
            }

            // Extract locations from all days
            const locationsSet = new Set();
            itinerary.days?.forEach(day => {
              day.locations?.forEach(loc => {
                if (loc) locationsSet.add(loc);
              });
            });
            const uniqueLocations = Array.from(locationsSet);
            setAllLocations(uniqueLocations);

            // Initialize location dates automatically from itinerary with SMART HOTEL DETECTION
            if (itinerary.days && itinerary.days.length > 0) {
              const hotelBookings = [];
              let currentStay = null;

              // Helper to calculate date from start date + day offset (0-indexed)
              // Use lead's travel date directly to avoid stale closure data
              const travelStartDate = lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : '';
              const getDate = (offset) => {
                if (!travelStartDate) return '';
                const date = new Date(travelStartDate);
                date.setDate(date.getDate() + offset);
                return date.toISOString().split('T')[0];
              };

              itinerary.days.forEach((day, index) => {
                const hotelName = day.accommodation?.name;
                const location = day.locations && day.locations.length > 0 ? day.locations[0] : '';

                if (hotelName) {
                  if (currentStay && currentStay.hotelName === hotelName) {
                    // Continue current stay
                    currentStay.endDayNum = day.dayNumber;
                  } else {
                    // Push previous stay if exists
                    if (currentStay) hotelBookings.push(currentStay);

                    // Start new stay
                    currentStay = {
                      location: location || (currentStay ? currentStay.location : ''), // Fallback to prev location if missing
                      hotelName: hotelName,
                      startDayNum: day.dayNumber,
                      endDayNum: day.dayNumber
                    };
                  }
                } else if (currentStay) {
                  // If hotel name is missing but we have a current stay, should we end it? 
                  // Let's assume if no hotel is listed, the previous stay ended.
                  hotelBookings.push(currentStay);
                  currentStay = null;
                }
              });
              // Push last stay
              if (currentStay) hotelBookings.push(currentStay);

              console.log('[Voucher] Detected', hotelBookings.length, 'hotel bookings');

              // Map to form data structure
              const newLocationDates = hotelBookings.map(stay => ({
                location: stay.location,
                hotelName: stay.hotelName,
                checkIn: getDate(stay.startDayNum - 1), // Day 1 is offset 0
                checkOut: getDate(stay.endDayNum) // Check-out is the day AFTER the last night usually? 
                // OR if Day 1 is stay, Check-out is Day 2.
                // If stay is Day 1 & 2. Check-in Day 1. Check-out Day 3.
                // Let's assume endDayNum is the last day BY NUMBER.
                // So Check-out is (endDayNum - 1) + 1 = endDayNum offset.
              }));

              // If no hotels found, fallback to unique locations
              if (newLocationDates.length === 0 && uniqueLocations.length > 0) {
                uniqueLocations.forEach(loc => {
                  newLocationDates.push({
                    location: loc,
                    hotelName: '',
                    checkIn: '',
                    checkOut: ''
                  });
                });
              }

              setFormData(prev => ({
                ...prev,
                locationDates: newLocationDates.length > 0 ? newLocationDates : prev.locationDates
              }));
            } else if (uniqueLocations.length > 0) {
              setFormData(prev => {
                if (prev.locationDates.length === 0) {
                  return {
                    ...prev,
                    locationDates: uniqueLocations.map(location => ({
                      location,
                      hotelName: '',
                      checkIn: '',
                      checkOut: '',
                    })),
                  };
                }
                return prev;
              });
            }


            // Extract meal plans
            const mealPlans = itinerary.days?.map(day => ({
              dayNumber: day.dayNumber,
              dayTitle: day.title || '',
              breakfast: day.meals?.breakfast || false,
              lunch: day.meals?.lunch || false,
              dinner: day.meals?.dinner || false,
            })) || [];
            console.log('[Voucher] Extracted', mealPlans.length, 'meal plans');
            setFormData(prev => ({ ...prev, mealPlans }));

            // Extract itinerary summary
            const itinerarySummary = itinerary.days?.map(day => ({
              dayNumber: day.dayNumber,
              title: day.title || '',
              locations: day.locations || [],
              activities: day.activities || [],
              accommodation: {
                name: day.accommodation?.name || '',
                type: day.accommodation?.type || '',
              },
            })) || [];
            console.log('[Voucher] Extracted', itinerarySummary.length, 'itinerary days');
            setFormData(prev => ({ ...prev, itinerarySummary }));
          } else {
            console.warn('[Voucher] Failed to load itinerary:', itineraryResponse);
          }
        } catch (error) {
          console.error('Error loading itinerary:', error);
        }
      } else {
        console.warn('[Voucher] No itinerary ID found');
      }
    } catch (error) {
      console.error('Error loading package:', error);
      toast.error('Failed to load package data');
    } finally {
      setLoadingPackage(false);
    }
  };

  const fetchExistingVouchers = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingExisting(true);
      const response = await voucherAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const vouchersData = response.data?.vouchers || response.data?.data || response.data || [];
        const vouchersArray = Array.isArray(vouchersData) ? vouchersData : [];
        setExistingVouchers(vouchersArray);
      }
    } catch (error) {
      console.error('Error fetching existing vouchers:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  const fetchAllVouchers = async () => {
    try {
      setLoadingAllVouchers(true);
      const response = await voucherAPI.getAll({ limit: 1000, page: 1 });
      if (response.success || response.status === 'success') {
        const vouchersData = response.data || [];
        const vouchersArray = Array.isArray(vouchersData) ? vouchersData : [];
        setAllVouchers(vouchersArray);
      }
    } catch (error) {
      console.error('Error fetching all vouchers:', error);
      toast.error('Failed to fetch vouchers');
    } finally {
      setLoadingAllVouchers(false);
    }
  };

  const handleLocationDateChange = (index, field, value) => {
    setFormData(prev => {
      const newLocationDates = [...prev.locationDates];
      if (field === 'location') {
        newLocationDates[index] = { ...newLocationDates[index], location: value };
      } else if (field === 'hotelName') {
        newLocationDates[index] = { ...newLocationDates[index], hotelName: value };
      } else if (field === 'checkIn') {
        newLocationDates[index] = { ...newLocationDates[index], checkIn: value };
      } else if (field === 'checkOut') {
        newLocationDates[index] = { ...newLocationDates[index], checkOut: value };
      }
      return { ...prev, locationDates: newLocationDates };
    });
  };

  const addLocationDate = () => {
    setFormData(prev => ({
      ...prev,
      locationDates: [
        ...prev.locationDates,
        {
          location: '',
          hotelName: '',
          checkIn: '',
          checkOut: '',
        },
      ],
    }));
  };

  const removeLocationDate = (index) => {
    setFormData(prev => ({
      ...prev,
      locationDates: prev.locationDates.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // All fields are optional - no validation required

    try {
      setLoading(true);

      // Clean up form data before sending
      const cleanedFormData = {
        ...formData,
        // Convert empty strings to null/undefined for ObjectId fields
        package: formData.package && formData.package.trim() !== '' ? formData.package : undefined,
        customizedPackage: formData.customizedPackage && formData.customizedPackage.trim() !== '' ? formData.customizedPackage : undefined,
        // Ensure accommodation in itinerarySummary is properly formatted
        itinerarySummary: formData.itinerarySummary?.map(day => ({
          dayNumber: day.dayNumber,
          title: day.title || '',
          locations: day.locations || [],
          activities: day.activities || [],
          accommodation: day.accommodation && typeof day.accommodation === 'object'
            ? {
              name: day.accommodation.name || '',
              type: day.accommodation.type || '',
            }
            : {
              name: '',
              type: '',
            },
        })) || [],
        // Convert empty date strings to null
        travelStartDate: formData.travelStartDate && formData.travelStartDate.trim() !== '' ? formData.travelStartDate : null,
        travelEndDate: formData.travelEndDate && formData.travelEndDate.trim() !== '' ? formData.travelEndDate : null,
        // Clean location dates - remove empty locations
        locationDates: formData.locationDates?.filter(ld => ld.location && ld.location.trim() !== '') || [],
      };

      let response;
      if (isEditing && currentVoucherId) {
        response = await voucherAPI.update(currentVoucherId, cleanedFormData);
      } else {
        response = await voucherAPI.create(cleanedFormData);
      }

      if (response.success || response.status === 'success') {
        toast.success(isEditing ? 'Voucher updated successfully' : 'Voucher created successfully');
        if (onSuccess) onSuccess();
        fetchExistingVouchers();
        setIsEditing(false);
        setCurrentVoucherId(null);
      } else {
        toast.error(response.message || 'Failed to save voucher');
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      toast.error(error.message || 'Failed to save voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (voucherId = null) => {
    const idToDownload = voucherId || currentVoucherId || selectedVoucherForDownload;

    if (!idToDownload) {
      toast.error('Please select a voucher to download');
      return;
    }

    try {
      await voucherAPI.downloadPDF(idToDownload);
      toast.success('Voucher PDF downloaded');
    } catch (error) {
      console.error('Error downloading voucher PDF:', error);
      toast.error('Failed to download voucher PDF');
    }
  };

  const handlePreviewPDF = async () => {
    if (!currentVoucherId) {
      toast.error('Please save the voucher first');
      return;
    }
    setShowPDFPreview(true);
    setCurrentVoucherId(currentVoucherId);
  };

  const handleSendEmail = async () => {
    if (!currentVoucherId) {
      toast.error('Please save the voucher first');
      return;
    }
    if (!sendEmailAddress.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setSendingEmail(true);
      const response = await voucherAPI.sendEmail(currentVoucherId, sendEmailAddress);
      if (response.success || response.status === 'success') {
        toast.success('Voucher sent via email successfully');
      } else {
        toast.error(response.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending voucher email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!lead?.whatsapp && !lead?.phone) {
      toast.error('WhatsApp number not available for this lead');
      return;
    }
    const whatsappNumber = lead.whatsapp || lead.phone;
    const message = encodeURIComponent(
      `Hello ${lead.name},\n\nYour travel voucher has been prepared. Please check your email for details.\n\nVoucher Number: ${formData.voucherNumber || 'Pending'}\n\nThank you for choosing Trip Sky Way!`
    );
    window.open(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const loadExistingVoucher = async (voucherId) => {
    try {
      const response = await voucherAPI.getById(voucherId);
      if (response.success || response.status === 'success') {
        const voucher = response.data || response;
        setCurrentVoucher(voucher);
        setCurrentVoucherId(voucherId);
        setIsEditing(true);
        setFormData({
          lead: voucher.lead?._id || voucher.lead || lead._id || lead.id,
          package: voucher.package?._id || voucher.package || '',
          customizedPackage: voucher.customizedPackage?._id || voucher.customizedPackage || '',
          customer: voucher.customer || {
            name: lead.name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            address: lead.address || '',
          },
          locationDates: voucher.locationDates || [],
          travelStartDate: voucher.travelStartDate ? new Date(voucher.travelStartDate).toISOString().split('T')[0] : '',
          travelEndDate: voucher.travelEndDate ? new Date(voucher.travelEndDate).toISOString().split('T')[0] : '',
          mealPlans: voucher.mealPlans || [],
          itinerarySummary: voucher.itinerarySummary || [],
          packageDetails: voucher.packageDetails || formData.packageDetails,
          notes: voucher.notes || '',
          terms: voucher.terms || [],
          specialInstructions: voucher.specialInstructions || '',
        });
        setSendEmailAddress(voucher.customer?.email || lead?.email || '');
      }
    } catch (error) {
      console.error('Error loading voucher:', error);
      toast.error('Failed to load voucher');
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center rounded-t-lg z-10">
          <h2 className="text-2xl font-bold">Travel Voucher</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Download Voucher Section */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Download Voucher PDF
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={selectedVoucherForDownload}
                onChange={(e) => setSelectedVoucherForDownload(e.target.value)}
                disabled={loadingAllVouchers}
              >
                <option value="">Select a voucher to download...</option>
                {allVouchers.map((voucher) => (
                  <option key={voucher._id || voucher.id} value={voucher._id || voucher.id}>
                    {voucher.voucherNumber || 'Voucher'} - {voucher.customer?.name || voucher.lead?.name || 'N/A'}
                    {voucher.travelStartDate ? ` (${new Date(voucher.travelStartDate).toLocaleDateString()})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedVoucherForDownload)}
                disabled={!selectedVoucherForDownload || loadingAllVouchers}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Existing Vouchers */}
        {existingVouchers.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Existing Vouchers (for this lead)
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={currentVoucherId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  loadExistingVoucher(e.target.value);
                } else {
                  setIsEditing(false);
                  setCurrentVoucherId(null);
                  setCurrentVoucher(null);
                }
              }}
            >
              <option value="">Create New Voucher</option>
              {existingVouchers.map((voucher) => (
                <option key={voucher._id || voucher.id} value={voucher._id || voucher.id}>
                  {voucher.voucherNumber || voucher._id || voucher.id} - {new Date(voucher.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Package Details Section */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5">
            <h3 className="text-lg font-bold text-purple-800 mb-4">Package Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Package Name:</span>
                <span className="ml-2 font-medium text-gray-900">{formData.packageDetails.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Destination:</span>
                <span className="ml-2 font-medium text-gray-900">{formData.packageDetails.destination || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2 font-medium text-gray-900">{formData.packageDetails.duration || 0} days</span>
              </div>
              <div>
                <span className="text-gray-600">Category:</span>
                <span className="ml-2 font-medium text-gray-900">{formData.packageDetails.category || 'N/A'}</span>
              </div>
            </div>

            {/* Inclusions */}
            {formData.packageDetails.inclusions && formData.packageDetails.inclusions.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">Inclusions:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {formData.packageDetails.inclusions.map((inclusion, idx) => (
                    <li key={idx}>{inclusion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Travel Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Travel Start Date
              </label>
              <input
                type="date"
                value={formData.travelStartDate}
                onChange={(e) => setFormData(prev => ({ ...prev, travelStartDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Travel End Date
              </label>
              <input
                type="date"
                value={formData.travelEndDate}
                onChange={(e) => setFormData(prev => ({ ...prev, travelEndDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Hotel Bookings */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-orange-800">Hotel Bookings</h3>
              <button
                type="button"
                onClick={addLocationDate}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Hotel Booking
              </button>
            </div>
            <div className="space-y-4">
              {formData.locationDates.map((locationDate, index) => (
                <div key={index} className="bg-white border-2 border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-orange-700">Hotel Booking {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeLocationDate(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">City/Location</label>
                      <input
                        type="text"
                        value={locationDate.location}
                        onChange={(e) => handleLocationDateChange(index, 'location', e.target.value)}
                        placeholder="Enter city"
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Hotel Name</label>
                      <input
                        type="text"
                        value={locationDate.hotelName || ''}
                        onChange={(e) => handleLocationDateChange(index, 'hotelName', e.target.value)}
                        placeholder="Enter hotel name"
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Check-in Date</label>
                      <input
                        type="date"
                        value={locationDate.checkIn}
                        onChange={(e) => handleLocationDateChange(index, 'checkIn', e.target.value)}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Check-out Date</label>
                      <input
                        type="date"
                        value={locationDate.checkOut}
                        onChange={(e) => handleLocationDateChange(index, 'checkOut', e.target.value)}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meal Plans */}
          {formData.mealPlans.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Meal Plans (Day-wise)</h3>
              <div className="space-y-3">
                {formData.mealPlans.map((mealPlan, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="font-semibold text-gray-700 mb-2">
                      Day {mealPlan.dayNumber}: {mealPlan.dayTitle}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className={mealPlan.breakfast ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {mealPlan.breakfast ? '✓' : '✗'} Breakfast
                      </span>
                      <span className={mealPlan.lunch ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {mealPlan.lunch ? '✓' : '✗'} Lunch
                      </span>
                      <span className={mealPlan.dinner ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {mealPlan.dinner ? '✓' : '✗'} Dinner
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itinerary Summary */}
          {formData.itinerarySummary.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Itinerary Summary</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.itinerarySummary.map((day, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="font-semibold text-gray-700 mb-2">
                      Day {day.dayNumber}: {day.title}
                    </div>
                    {day.locations && day.locations.length > 0 && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Locations:</span> {day.locations.join(', ')}
                      </div>
                    )}
                    {day.activities && day.activities.length > 0 && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Activities:</span> {day.activities.slice(0, 3).join(', ')}
                        {day.activities.length > 3 && '...'}
                      </div>
                    )}
                    {day.accommodation?.name && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Accommodation:</span> {day.accommodation.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              value={formData.specialInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special instructions or notes for the customer..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Internal notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : isEditing ? 'Update Voucher' : 'Create Voucher'}
            </button>
            {currentVoucherId && (
              <>
                <button
                  type="button"
                  onClick={handlePreviewPDF}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  PDF
                </button>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={sendEmailAddress}
                    onChange={(e) => setSendEmailAddress(e.target.value)}
                    placeholder="Email address"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !sendEmailAddress.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium text-sm"
                  >
                    {sendingEmail ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Email
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm font-medium text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>

      {/* PDF Preview Dialog */}
      {showPDFPreview && currentVoucherId && (
        <PDFPreviewDialog
          isOpen={showPDFPreview}
          onClose={() => setShowPDFPreview(false)}
          pdfUrl={`/billing/vouchers/${currentVoucherId}/pdf`}
          documentName={`voucher-${currentVoucherId}`}
          onDownload={() => handleDownloadPDF(currentVoucherId)}
        />
      )}
    </div>
  );
};

export default VoucherDialog;

