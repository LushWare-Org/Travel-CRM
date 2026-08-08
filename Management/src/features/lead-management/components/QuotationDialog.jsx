import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Calculator, Eye, ToggleLeft, ToggleRight, Download, Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotationAPI, packageAPI, customizedPackageAPI, manualItineraryAPI, uploadAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';
import { getThankYouMessage } from '../../../config/branding';
import { formatCurrency, getCurrencySymbol, CURRENCY_CODE, LOCALE } from '../../../utils/currency.js';

const QuotationDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentQuotationId, setCurrentQuotationId] = useState(null);
  const [existingQuotations, setExistingQuotations] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [currentQuotation, setCurrentQuotation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDetailedMode, setIsDetailedMode] = useState(false);
  const [detectedPackage, setDetectedPackage] = useState(null);
  const [detectedPackageType, setDetectedPackageType] = useState(null); // 'package', 'customized', 'manual'
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [hasInitializedNew, setHasInitializedNew] = useState(false);
  const [sendEmailAddress, setSendEmailAddress] = useState(lead?.email || lead?.customer?.email || '');
  const [sendingEmail, setSendingEmail] = useState(false);

  // NEW: Track available plan options and selected plan
  const [availablePlans, setAvailablePlans] = useState([]); // Array of available plan types
  const [selectedPlanType, setSelectedPlanType] = useState(null); // 'customized' or 'manual'

  const buildDefaultFormData = (leadData) => ({
    lead: leadData?._id || leadData?.id || '',
    package: leadData?.package?._id || leadData?.package || '',
    type: 'standard',
    mode: 'summary',
    items: (leadData?.costLines || []).map((l) => ({
      description: l.description,
      category: l.category || 'other',
      quantity: l.quantity || 1,
      unitPrice: Number(l.quotedUnitPrice ?? l.estimatedUnitPrice ?? 0),
      notes: l.source === 'MANUAL' ? 'Manual' : null,
    })),
    taxRate: 0,
    discountType: 'none',
    discountValue: 0,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
    paymentTerms: '',
    includedServices: [],
    excludedServices: [],
    coverImage: '',
    images: [], // Array of {url: string, isCover: boolean}
  });

  const [formData, setFormData] = useState(buildDefaultFormData(lead));
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);

  // formatCurrency is now imported from utils/currency

  const formatDateLabel = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      return new Date(dateValue).toLocaleDateString(LOCALE, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getModeLabel = (mode) => (mode === 'detailed' ? 'Detailed' : 'Non Detailed');

  const handleDownloadExistingQuotation = async (quotationId) => {
    if (!quotationId || quotationId === 'new') {
      return;
    }
    try {
      await quotationAPI.downloadPDF(quotationId);
      toast.success('Quotation PDF downloaded');
    } catch (error) {
      console.error('Error downloading quotation PDF:', error);
      toast.error('Failed to download quotation PDF');
    }
  };

  useEffect(() => {
    if (!isOpen || !lead) {
      return;
    }

    // Reset state
    setExistingQuotations([]);
    setCurrentQuotation(null);
    setCurrentQuotationId(null);
    setIsEditing(false);
    setIsDetailedMode(false);
    setDetectedPackage(null);
    setDetectedPackageType(null);
    setFormData(buildDefaultFormData(lead));
    setSelectedQuotationId(null);
    setHasInitializedNew(false);

    // Fetch data - only once when dialog opens
    fetchPackages();
    detectPackageType();
    fetchExistingQuotations(true);

    // Cleanup function to prevent memory leaks
    return () => {
      // Cancel any pending operations if component unmounts
    };
  }, [isOpen, lead?._id || lead?.id]); // Only depend on lead ID, not entire lead object

  // Load manual itinerary with all activities extracted (for non-detailed mode)
  const loadManualItinerarySimple = async () => {
    if (!lead) return;

    try {
      const manualResponse = await manualItineraryAPI.getByLead(lead._id || lead.id);
      if (manualResponse.success || manualResponse.status === 'success') {
        const manualItinerary = manualResponse.data || manualResponse;
        if (manualItinerary?.days && Array.isArray(manualItinerary.days) && manualItinerary.days.length > 0) {
          // Extract all activities, events, and details (same as detail mode but read-only)
          // Use try-catch to handle any extraction errors
          // Don't show toast in non-detail mode
          try {
            extractItemsFromItinerary(manualItinerary.days, false);
          } catch (extractError) {
            console.error('Error extracting items from manual itinerary:', extractError);
            // Fallback: create simple day items if extraction fails
            const simplifiedItems = manualItinerary.days.map((day, index) => ({
              description: `Day ${day.dayNumber || index + 1}: ${day.description || day.title || 'Itinerary day'}`,
              category: 'other',
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0,
              notes: '',
            }));
            setFormData(prev => {
              const existingPackageItem = prev.items.find(item => item.category === 'package');
              const newItems = existingPackageItem
                ? [existingPackageItem, ...simplifiedItems]
                : [...simplifiedItems];
              return { ...prev, items: newItems };
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading manual itinerary:', error);
      toast.error('Failed to load manual itinerary');
    }
  };

  useEffect(() => {
    if (!isOpen || !lead) {
      return;
    }

    if (selectedQuotationId === null) {
      return;
    }

    if (selectedQuotationId === 'new') {
      if (!hasInitializedNew) {
        resetToNewQuotation();
        setHasInitializedNew(true);
      }
      return;
    }

    setHasInitializedNew(false);

    const selectedQuote = existingQuotations.find(
      (quotation) => (quotation._id || quotation.id) === selectedQuotationId,
    );

    if (!selectedQuote) {
      setSelectedQuotationId('new');
      return;
    }

    setCurrentQuotation(selectedQuote);
    setCurrentQuotationId(selectedQuote._id || selectedQuote.id);
    setIsEditing(true);
    // Ensure mode is explicitly set - default to summary if not detailed
    const quoteMode = (selectedQuote.mode || 'summary') === 'detailed';
    setIsDetailedMode(quoteMode);

    setFormData({
      lead: lead._id || lead.id,
      package: selectedQuote.package?._id || selectedQuote.package || '',
      type: selectedQuote.type || 'standard',
      mode: selectedQuote.mode || 'summary',
      items: selectedQuote.items?.length > 0
        ? selectedQuote.items.map((item) => ({
          description: item.description || '',
          category: item.category || 'other',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          notes: item.notes || '',
        }))
        : buildDefaultFormData(lead).items,
      taxRate: selectedQuote.taxRate || 0,
      discountType: selectedQuote.discountType || 'none',
      discountValue: selectedQuote.discountValue || 0,
      validUntil: selectedQuote.validUntil
        ? new Date(selectedQuote.validUntil).toISOString().split('T')[0]
        : buildDefaultFormData(lead).validUntil,
      notes: selectedQuote.notes || '',
      terms: selectedQuote.terms || '',
      paymentTerms: selectedQuote.paymentTerms || '',
      includedServices: selectedQuote.includedServices || [],
      excludedServices: selectedQuote.excludedServices || [],
      coverImage: selectedQuote.coverImage || '',
      images: selectedQuote.images || (selectedQuote.coverImage ? [{ url: selectedQuote.coverImage, isCover: true }] : []),
    });

    setSendEmailAddress(
      selectedQuote.customer?.email ||
      selectedQuote.lead?.email ||
      lead?.email ||
      '',
    );

    if (selectedQuote.package) {
      const packageId = selectedQuote.package._id || selectedQuote.package;
      const hasPackageItem = selectedQuote.items?.some(
        (item) =>
          item.category === 'package' ||
          item.description?.toLowerCase().includes('package'),
      );

      if (!hasPackageItem) {
        setTimeout(() => loadPackageData(packageId), 100);
      }
    }
  }, [selectedQuotationId, existingQuotations, isOpen, lead, currentQuotation, isEditing]);

  const resetToNewQuotation = () => {
    if (!lead) return;

    setFormData(buildDefaultFormData(lead));
    setCurrentQuotation(null);
    setCurrentQuotationId(null);
    setIsEditing(false);
    setIsDetailedMode(false);
    setDetectedPackage(null);
    setDetectedPackageType(null);
    setSendEmailAddress(lead?.email || lead?.customer?.email || '');

    detectPackageType();

    // In summary mode (default), load all itinerary items/activities but they'll be read-only
    // Only load if not already loading and mode is still summary
    if (lead.manualItinerary?._id || lead.manualItinerary) {
      // Small delay to ensure state is set
      setTimeout(() => {
        if (!isDetailedMode && !loadingItinerary) {
          loadManualItinerarySimple();
        }
      }, 100);
    } else if (lead.package?._id || lead.package || lead.customizedPackage?._id || lead.customizedPackage) {
      // For packages/customized packages, load all activities in summary mode
      // Use longer timeout to ensure package detection is complete
      setTimeout(() => {
        if (!isDetailedMode && !loadingItinerary) {
          loadDetailedItems(); // Load all activities even in summary mode
        }
      }, 600);
    }
  };

  // Auto-detect package type from lead
  const detectPackageType = async () => {
    if (!lead) return;

    console.log('🔍 [Quotation] Detecting package type for lead:', lead._id || lead.id);
    console.log('🔍 [Quotation] Lead data:', {
      customizedPackage: lead.customizedPackage,
      manualItinerary: lead.manualItinerary,
      package: lead.package,
      packageName: lead.packageName
    });

    // NEW: Detect all available plans
    const plans = [];

    // Check for customized package
    const hasCustomizedPackage = !!(lead.customizedPackage?._id || lead.customizedPackage);
    // Check for manual itinerary
    const hasManualItinerary = !!(lead.manualItinerary?._id || lead.manualItinerary);
    // Check for regular package
    const hasRegularPackage = !!(lead.package?._id || lead.package || lead.packageName);

    console.log('🔍 [Quotation] Plan availability:', {
      hasCustomizedPackage,
      hasManualItinerary,
      hasRegularPackage
    });

    if (hasCustomizedPackage) plans.push('customized');
    if (hasManualItinerary) plans.push('manual');
    if (hasRegularPackage && !hasCustomizedPackage) plans.push('package');

    setAvailablePlans(plans);
    console.log('✅ [Quotation] Available plans:', plans);

    // Set initial selected plan (prefer customized, then manual, then regular)
    if (!selectedPlanType) {
      let initialPlan = null;
      if (hasCustomizedPackage) {
        initialPlan = 'customized';
        setSelectedPlanType('customized');
      } else if (hasManualItinerary) {
        initialPlan = 'manual';
        setSelectedPlanType('manual');
      } else if (hasRegularPackage) {
        initialPlan = 'package';
        setSelectedPlanType('package');
      }
      console.log('✅ [Quotation] Initial selected plan:', initialPlan);
    }

    // Check for customized package first
    if (lead.customizedPackage?._id || lead.customizedPackage) {
      const packageId = lead.customizedPackage._id || lead.customizedPackage;
      setDetectedPackageType('customized');

      // Ensure selectedPlanType is also set if not already
      if (!selectedPlanType) {
        setSelectedPlanType('customized');
      }

      try {
        const response = await customizedPackageAPI.getById(packageId);
        if (response.success || response.status === 'success') {
          setDetectedPackage(response.data || response);
          // Auto-populate package price
          if (response.data?.price || response.price) {
            const pkg = response.data || response;
            addPackageItem(pkg.name, pkg.price, 'customized');
          }
          // In summary mode or detailed mode, load all activities immediately
          // Increase timeout to ensure state updates complete (selectedPlanType must be set)
          setTimeout(() => {
            console.log('⏰ [Quotation] Delayed load for customized package (initial)');
            loadDetailedItems();
          }, 600); // Increased from 500ms to 600ms to ensure state is set
        }
      } catch (error) {
        console.error('Error loading customized package:', error);
      }
      return;
    }

    // Check for regular package
    if (lead.package?._id || lead.package || lead.packageName) {
      const packageId = lead.package?._id || lead.package;
      setDetectedPackageType('package');

      // Ensure selectedPlanType is also set if not already
      if (!selectedPlanType) {
        setSelectedPlanType('package');
      }

      if (packageId) {
        try {
          const response = await packageAPI.getById(packageId);
          if (response.success || response.status === 'success') {
            const pkg = response.data || response;
            setDetectedPackage(pkg);
            // Auto-populate package price
            if (pkg.price) {
              addPackageItem(pkg.name, pkg.price, 'package');
            }
            // In summary mode or detailed mode, load all activities immediately
            // Increase timeout to ensure state updates complete
            setTimeout(() => {
              console.log('⏰ [Quotation] Delayed load for regular package (initial)');
              loadDetailedItems();
            }, 600); // Increased to 600ms
          }
        } catch (error) {
          console.error('Error loading package:', error);
        }
      }
      return;
    }

    // Check for manual itinerary
    if (lead.manualItinerary?._id || lead.manualItinerary) {
      setDetectedPackageType('manual');
      setDetectedPackage({ type: 'manual', name: 'Manual Itinerary' });

      // Ensure selectedPlanType is also set if not already
      if (!selectedPlanType) {
        setSelectedPlanType('manual');
      }
    }
  };

  // Add package item to quotation
  const addPackageItem = (packageName, price, type = 'package') => {
    const cleanName = `${packageName}`.trim();
    const packageItem = {
      description: `${cleanName} Package`,
      category: 'package',
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      notes: type === 'customized' ? 'Customized package' : '',
    };

    setFormData(prev => {
      // Check if package item already exists
      const existingIndex = prev.items.findIndex(item =>
        item.category === 'package' ||
        item.description?.toLowerCase().includes('package')
      );

      if (existingIndex >= 0) {
        // Update existing package item and remove empty items
        const updatedItems = [...prev.items];
        updatedItems[existingIndex] = packageItem;
        // Filter out empty items (items with no description or empty description)
        const cleanedItems = updatedItems.filter(item =>
          (item.description && item.description.trim() !== '') ||
          item.category === 'package'
        );
        return { ...prev, items: cleanedItems.length > 0 ? cleanedItems : [packageItem] };
      } else {
        // Add new package item and remove empty items
        const currentItems = prev.items && prev.items.length > 0
          ? prev.items.filter(item => item.description && item.description.trim() !== '')
          : [];
        return { ...prev, items: [packageItem, ...currentItems.filter(item => item.category !== 'package')] };
      }
    });
  };

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await packageAPI.getAll();
      if (response.success || response.status === 'success') {
        const packagesData = response.data?.packages || response.data || [];
        setPackages(packagesData.filter(pkg => pkg.isActive !== false));
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const fetchExistingQuotations = async (initialize = false, targetQuotationId = null) => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingExisting(true);
      const response = await quotationAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const quotesData = response.data?.quotations || response.data?.data || response.data || [];
        const quotesArray = Array.isArray(quotesData) ? quotesData : [];
        setExistingQuotations(quotesArray);
        setSelectedQuotationId((prev) => {
          const ids = quotesArray.map((q) => q._id || q.id);

          if (targetQuotationId && ids.includes(targetQuotationId)) {
            return targetQuotationId;
          }

          if (initialize) {
            if (quotesArray.length === 0) {
              return 'new';
            }

            if (prev && prev !== 'new' && ids.includes(prev)) {
              return prev;
            }

            return ids[0];
          }

          if (prev === 'new') {
            return 'new';
          }

          if (prev && ids.includes(prev)) {
            return prev;
          }

          if (!prev) {
            return quotesArray.length > 0 ? ids[0] : 'new';
          }

          return quotesArray.length > 0 ? ids[0] : 'new';
        });
      }
    } catch (error) {
      console.error('Error fetching existing quotations:', error);
      if (initialize) {
        setSelectedQuotationId('new');
      }
      if (targetQuotationId) {
        setSelectedQuotationId('new');
      }
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleSendWhatsApp = (quotationId) => {
    if (!lead?.whatsapp) {
      toast.error('WhatsApp number not available for this lead');
      return;
    }

    const whatsappNumber = lead.whatsapp.replace(/[^0-9]/g, '');
    if (!whatsappNumber) {
      toast.error('Invalid WhatsApp number');
      return;
    }

    const quotationNumber = currentQuotation?.quotationNumber || `#${quotationId?.slice(-6)}` || 'Quotation';
    const message = encodeURIComponent(
      `Hello ${lead.name || 'there'},\n\n` +
      `Your quotation ${quotationNumber} is ready. ` +
      `Please contact us for the detailed quotation document.\n\n` +
      getThankYouMessage()
    );

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendEmail = async () => {
    const targetId =
      (selectedQuotationId && selectedQuotationId !== 'new')
        ? selectedQuotationId
        : currentQuotationId;

    if (!targetId) {
      toast.error('Please save the quotation before sending the email');
      return;
    }

    const trimmedEmail = sendEmailAddress.trim();
    if (!trimmedEmail) {
      toast.error('Please provide a recipient email address');
      return;
    }

    try {
      setSendingEmail(true);
      await quotationAPI.send(targetId, { email: trimmedEmail });
      toast.success('Quotation emailed successfully');
      await fetchExistingQuotations(false, targetId);
    } catch (error) {
      toast.error(error.message || 'Failed to send quotation email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePreviewPDF = (quotationId) => {
    setCurrentQuotationId(quotationId);
    setShowPDFPreview(true);
  };

  const loadPackageData = async (packageId, packageType = 'package') => {
    if (!packageId) return;

    try {
      let response;
      if (packageType === 'customized') {
        response = await customizedPackageAPI.getById(packageId);
      } else {
        response = await packageAPI.getById(packageId);
      }

      if (response.success || response.status === 'success' || response.data) {
        const pkg = response.data || response;

        // If package has a price, add it as an item
        if (pkg.price && pkg.price > 0) {
          addPackageItem(pkg.name, pkg.price, packageType === 'customized' ? 'customized' : 'package');
          toast.success(`Package price (${pkg.price.toFixed(2)}) added to items`);
        } else {
          toast('This package has no price set', { icon: 'ℹ️' });
        }
      }
    } catch (error) {
      console.error('Error loading package:', error);
      toast.error('Failed to load package data');
    }
  };

  // Load itinerary and extract items for detailed mode
  const loadDetailedItems = async (typeOverride = null) => {
    if (!lead) return;

    console.log('📋 [Quotation] loadDetailedItems called with override:', typeOverride);
    console.log('📋 [Quotation] selectedPlanType:', selectedPlanType);
    console.log('📋 [Quotation] detectedPackageType:', detectedPackageType);

    setLoadingItinerary(true);
    try {
      let itineraryData = null;

      // NEW: Use typeOverride (if provided) or selectedPlanType to respect user's choice
      // Passing typeOverride avoids stale closure issues in setTimeout
      const planToLoad = typeOverride || selectedPlanType || detectedPackageType;
      console.log('📋 [Quotation] Plan to load:', planToLoad);

      // Get itinerary based on selected plan type
      if (planToLoad === 'customized' && lead.customizedPackage) {
        const packageId = lead.customizedPackage._id || lead.customizedPackage;
        console.log('📦 [Quotation] Loading customized package:', packageId);

        // Fetch itinerary for customized package
        try {
          const itineraryResponse = await customizedPackageAPI.getItineraryByPackage(packageId);
          console.log('📦 [Quotation] Itinerary API response:', itineraryResponse);

          if (itineraryResponse.success || itineraryResponse.status === 'success') {
            itineraryData = itineraryResponse.data || itineraryResponse;
          } else if (itineraryResponse.data) {
            // Sometimes data is directly in response
            itineraryData = itineraryResponse.data;
          }
        } catch (error) {
          console.error('❌ [Quotation] Error fetching customized package itinerary:', error);
          // Try alternative: get the customized package and check if it has itinerary
          try {
            const customPkgResponse = await customizedPackageAPI.getById(packageId);
            console.log('📦 [Quotation] Customized package response:', customPkgResponse);

            if (customPkgResponse.success || customPkgResponse.status === 'success') {
              const customPkg = customPkgResponse.data || customPkgResponse;
              console.log('📦 [Quotation] Customized package data:', customPkg);
              console.log('📦 [Quotation] Has itinerary:', !!customPkg.itinerary);
              console.log('📦 [Quotation] Has days:', !!customPkg.days);

              if (customPkg.itinerary?.days) {
                itineraryData = { days: customPkg.itinerary.days };
                console.log('✅ [Quotation] Using itinerary.days:', customPkg.itinerary.days.length, 'days');
              } else if (customPkg.days) {
                itineraryData = { days: customPkg.days };
                console.log('✅ [Quotation] Using days:', customPkg.days.length, 'days');
              }
            }
          } catch (err) {
            console.error('❌ [Quotation] Error fetching customized package:', err);
          }
        }
      } else if (planToLoad === 'package' && lead.package) {
        const packageId = lead.package._id || lead.package;
        console.log('📦 [Quotation] Loading regular package:', packageId);

        // Fetch itinerary using package ID
        try {
          const itineraryResponse = await packageAPI.getItineraryByPackage(packageId);
          console.log('📦 [Quotation] Package itinerary response:', itineraryResponse);

          if (itineraryResponse.success || itineraryResponse.status === 'success') {
            itineraryData = itineraryResponse.data || itineraryResponse;
          } else if (itineraryResponse.data) {
            itineraryData = itineraryResponse.data;
          }
        } catch (error) {
          console.error('❌ [Quotation] Error fetching package itinerary:', error);
        }
      } else if (planToLoad === 'manual' && lead.manualItinerary) {
        console.log('📋 [Quotation] Loading manual itinerary for lead:', lead._id || lead.id);

        try {
          const manualResponse = await manualItineraryAPI.getByLead(lead._id || lead.id);
          console.log('📋 [Quotation] Manual itinerary response:', manualResponse);

          if (manualResponse.success || manualResponse.status === 'success') {
            const manualItinerary = manualResponse.data || manualResponse;
            console.log('📋 [Quotation] Manual itinerary data:', manualItinerary);

            if (manualItinerary?.days) {
              itineraryData = { days: manualItinerary.days };
              console.log('✅ [Quotation] Manual itinerary days:', manualItinerary.days.length);
            }
          } else if (manualResponse.days) {
            itineraryData = { days: manualResponse.days };
            console.log('✅ [Quotation] Manual itinerary days (direct):', manualResponse.days.length);
          }
        } catch (error) {
          console.error('❌ [Quotation] Error fetching manual itinerary:', error);
        }
      }

      console.log('📋 [Quotation] Final itinerary data:', itineraryData);
      console.log('📋 [Quotation] Has days:', !!itineraryData?.days);
      console.log('📋 [Quotation] Days count:', itineraryData?.days?.length || 0);

      if (itineraryData && itineraryData.days && Array.isArray(itineraryData.days) && itineraryData.days.length > 0) {
        console.log('✅ [Quotation] Extracting items from', itineraryData.days.length, 'days');
        extractItemsFromItinerary(itineraryData.days);
      } else {
        console.warn('⚠️ [Quotation] No valid itinerary data found', { itineraryData, planToLoad });
        if (isDetailedMode) {
          toast('No itinerary data found for this plan', { icon: 'ℹ️' });
        }
      }
    } catch (error) {
      console.error('❌ [Quotation] Error loading itinerary:', error);
      toast.error('Failed to load itinerary data');
    } finally {
      setLoadingItinerary(false);
    }
  };

  // Extract items from itinerary days
  const extractItemsFromItinerary = (days, showToast = true) => {
    if (!days || !Array.isArray(days) || days.length === 0) {
      console.warn('extractItemsFromItinerary: Invalid days data', days);
      return;
    }

    const extractedItems = [];

    days.forEach((day, dayIndex) => {
      if (!day) return; // Skip null/undefined days
      // Accommodation
      if (day.accommodation?.name) {
        extractedItems.push({
          description: `Day ${day.dayNumber || dayIndex + 1}: ${day.accommodation.name} - ${day.accommodation.type || 'Accommodation'}`,
          category: 'accommodation',
          quantity: 1,
          unitPrice: 0, // User can enter price
          totalPrice: 0,
          notes: day.accommodation.address || '',
          isExtracted: true, // Mark as extracted from itinerary
        });
      }

      // Transport
      if (day.transport) {
        extractedItems.push({
          description: `Day ${day.dayNumber || dayIndex + 1}: ${day.transport} Transportation`,
          category: 'transportation',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          notes: '',
          isExtracted: true, // Mark as extracted from itinerary
        });
      }

      // Meals
      const meals = [];
      if (day.meals?.breakfast) meals.push('Breakfast');
      if (day.meals?.lunch) meals.push('Lunch');
      if (day.meals?.dinner) meals.push('Dinner');
      if (meals.length > 0) {
        extractedItems.push({
          description: `Day ${day.dayNumber || dayIndex + 1}: Meals (${meals.join(', ')})`,
          category: 'food',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          notes: '',
          isExtracted: true, // Mark as extracted from itinerary
        });
      }

      // Activities
      if (day.activities && Array.isArray(day.activities) && day.activities.length > 0) {
        day.activities.forEach((activity, actIndex) => {
          extractedItems.push({
            description: `Day ${day.dayNumber || dayIndex + 1}: ${activity}`,
            category: 'activity',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            notes: '',
            isExtracted: true, // Mark as extracted from itinerary
          });
        });
      }

      // Places
      if (day.places && Array.isArray(day.places) && day.places.length > 0) {
        day.places.forEach((place) => {
          extractedItems.push({
            description: `Day ${day.dayNumber || dayIndex + 1}: ${place.name || 'Place visit'}`,
            category: 'activity',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            notes: place.description || '',
            isExtracted: true, // Mark as extracted from itinerary
          });
        });
      }
    });

    // PRODUCTION FIX: Strictly use fresh database data
    // Do NOT merge with existing items - this causes mixed activities when toggling
    // Only preserve the package item, replace everything else
    setFormData(prev => {
      const existingItems = prev.items || [];
      const existingPackageItem = existingItems.find(item => item.category === 'package');

      // Use ONLY fresh extracted items from database
      // Do NOT include existing items - this prevents mixing when toggling plans
      const freshItems = extractedItems;

      // Final Assembly: Package Item + Fresh Items ONLY
      const finalItems = existingPackageItem
        ? [existingPackageItem, ...freshItems]
        : freshItems;

      return { ...prev, items: finalItems };
    });

    if (showToast) {
      if (extractedItems.length > 0) {
        toast.success(`Extracted ${extractedItems.length} items from itinerary`);
      } else {
        toast('No items found in itinerary', { icon: 'ℹ️' });
      }
    }
  };

  // Toggle detailed mode
  const handleToggleDetailedMode = async () => {
    // Prevent rapid toggling when already loading
    if (loadingItinerary) {
      return;
    }

    const newMode = !isDetailedMode;

    console.log('🔄 [Quotation] Toggling detailed mode:', isDetailedMode, '→', newMode);

    // Immediately update the state to prevent UI inconsistencies
    setIsDetailedMode(newMode);

    if (newMode) {
      // Enable detailed mode
      console.log('📋 [Quotation] Enabling detailed mode (editable items)');
      setFormData((prev) => ({
        ...prev,
        mode: 'detailed',
      }));

      // Check if we already have items (other than package)
      const hasExistingItems = formData.items.some(
        item => item.category !== 'package' && item.description
      );

      console.log('📋 [Quotation] Has existing items:', hasExistingItems);

      // Only load from itinerary if we don't have existing items
      if (!hasExistingItems) {
        console.log('📋 [Quotation] No existing items, loading from itinerary');
        if (loadingItinerary) return;

        // Use timeout to allow state update
        setTimeout(() => {
          loadDetailedItems();
        }, 50);
      } else {
        // We have items, do NOT overwrite them automatically
        console.log('📋 [Quotation] Preserving existing items');
        toast('Detailed mode enabled - items preserved', { icon: '📝' });
      }
    } else {
      // Disable detailed mode (Summary) - Just change display, DON'T reload items
      console.log('📋 [Quotation] Disabling detailed mode (read-only display)');
      setFormData((prev) => ({
        ...prev,
        mode: 'summary',
      }));

      // DO NOT reload items - just change the display mode
      // The existing items will be shown in read-only mode
      toast('Summary mode enabled - items are now read-only', { icon: '👁️' });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate totalPrice for this item
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity || 0;
      const price = field === 'unitPrice' ? parseFloat(value) || 0 : newItems[index].unitPrice || 0;
      newItems[index].totalPrice = qty * price;
    } else if (field === 'totalPrice') {
      // When totalPrice is changed directly, update unitPrice and quantity to match
      const totalPrice = parseFloat(value) || 0;
      newItems[index].totalPrice = totalPrice;
      newItems[index].unitPrice = totalPrice;
      newItems[index].quantity = 1;
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    // Add a new item to the form (works in both detailed and summary mode)
    setFormData(prev => {
      const newItem = {
        description: '',
        category: 'other',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        notes: '',
        isManual: true, // Mark as manually added
      };

      // In detailed mode, keep package items at the beginning, then add new item
      // In summary mode, add extra fields after package item
      const packageItems = prev.items.filter(item => item.category === 'package');
      const otherItems = prev.items.filter(item => item.category !== 'package');
      return {
        ...prev,
        items: [...packageItems, ...otherItems, newItem],
      };
    });
  };

  const removeItem = (index) => {
    // Count visible items (excluding package items in detailed mode)
    const visibleItems = formData.items.filter(item =>
      (!isDetailedMode || item.category !== 'package') &&
      item.description !== undefined
    );

    // Allow removal if there's more than one visible item
    if (visibleItems.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      // In detailed mode, keep package items; in summary mode, keep all non-empty items
      const cleanedItems = isDetailedMode
        ? newItems.filter(item => item.category === 'package' || item.description !== undefined)
        : newItems.filter(item => item.description !== undefined || item.category === 'package');
      setFormData(prev => ({ ...prev, items: cleanedItems.length > 0 ? cleanedItems : [] }));
    } else {
      toast.error('At least one item is required');
    }
  };

  const calculateTotals = () => {
    // When in detailed mode, exclude package items from calculation
    // When in summary mode, include package item + all extra fields (manually added items)
    const itemsToCalculate = isDetailedMode
      ? formData.items.filter(item => item.category !== 'package')
      : formData.items.filter(item => {
        // In summary mode, include package item and all manually added extra fields
        return item.category === 'package' || item.isManual === true;
      });

    // Calculate subtotal from all items (excluding package items in detailed mode)
    // Use totalPrice if available, otherwise calculate from quantity * unitPrice
    const subtotal = itemsToCalculate.reduce((sum, item) => {
      const itemTotal = item.totalPrice !== undefined && item.totalPrice !== null
        ? item.totalPrice
        : (item.quantity || 0) * (item.unitPrice || 0);
      return sum + itemTotal;
    }, 0);

    let discountAmount = 0;
    if (formData.discountType === 'percentage') {
      discountAmount = (subtotal * (formData.discountValue || 0)) / 100;
    } else if (formData.discountType === 'fixed') {
      discountAmount = formData.discountValue || 0;
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * (formData.taxRate || 0)) / 100;
    const totalAmount = taxableAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  const handleSubmit = async (status = 'send') => {
    // When in detailed mode, exclude package items from submission
    let itemsToSubmit = isDetailedMode
      ? formData.items.filter(item => item.category !== 'package')
      : formData.items;

    // Filter out blank/empty items (items with no description or empty description)
    itemsToSubmit = itemsToSubmit.filter(item =>
      item.description && item.description.trim() !== ''
    );

    if (itemsToSubmit.length === 0) {
      toast.error('Please add at least one item with description');
      return;
    }

    const totals = calculateTotals();
    const quotationMode = isDetailedMode ? 'detailed' : 'summary';

    // Prepare payload and filter out empty strings
    const payload = {
      ...formData,
      mode: quotationMode,
      type: selectedPlanType === 'manual' ? 'custom' : (selectedPlanType === 'customized' ? 'package-based' : 'standard'),
      items: itemsToSubmit, // Use filtered items (without blank entries and without package items in detailed mode)
      ...totals,
      validUntil: new Date(formData.validUntil).toISOString(),
      status: status === 'send' ? 'sent' : 'draft',
    };

    // Remove empty strings from ObjectId fields (Mongoose can't cast empty strings)
    // IMPORTANT: For manual itinerary with a base package, preserve the package reference
    // so the PDF can access package images and inclusions/exclusions
    const hasBasePackage = lead?.package || lead?.customizedPackage;
    if (payload.package === '' || (!payload.package && !(selectedPlanType === 'manual' && hasBasePackage))) {
      delete payload.package;
    }
    if (payload.quotation === '' || !payload.quotation) {
      delete payload.quotation;
    }
    if (payload.lead === '' || !payload.lead) {
      delete payload.lead;
    }

    try {
      setLoading(true);

      // For manual/custom quotations, create an itinerary from the items
      let itineraryId = null;
      if (selectedPlanType === 'manual' && itemsToSubmit.length > 0) {
        console.log('[Quotation] Creating itinerary for manual quotation');

        // Group items by day
        const dayGroups = {};
        itemsToSubmit.forEach(item => {
          const dayMatch = item.description?.match(/Day\s+(\d+)/i);
          if (dayMatch) {
            const dayNum = parseInt(dayMatch[1]);
            if (!dayGroups[dayNum]) {
              dayGroups[dayNum] = [];
            }
            dayGroups[dayNum].push(item);
          }
        });

        console.log('[Quotation] Grouped items into', Object.keys(dayGroups).length, 'days');

        // Convert to itinerary days format
        const itineraryDays = Object.keys(dayGroups).sort((a, b) => parseInt(a) - parseInt(b)).map(dayNum => {
          const dayItems = dayGroups[dayNum];
          const dayNumber = parseInt(dayNum);

          // Extract title (first item description or default)
          const titleItem = dayItems[0];
          const title = titleItem?.description?.split(':')[0]?.trim() || `Day ${dayNumber}`;

          // Extract locations
          const locations = [];
          dayItems.forEach(item => {
            if (item.category === 'hotel' || item.category === 'accommodation') {
              const locationMatch = item.description?.match(/([^-:]+)(?:\s*-|\s*:)/);
              if (locationMatch) {
                locations.push(locationMatch[1].trim());
              }
            }
          });

          // Extract accommodation
          const hotelItem = dayItems.find(item => item.category === 'hotel' || item.category === 'accommodation');
          const accommodation = hotelItem ? {
            name: hotelItem.description?.split('-')[0]?.trim() || '',
            type: 'hotel'
          } : null;

          // Extract activities
          const activities = dayItems
            .filter(item => !['hotel', 'accommodation', 'transport', 'meal'].includes(item.category))
            .map(item => item.description?.split(':').pop()?.trim() || item.description)
            .filter(Boolean);

          // Extract meals
          const mealItems = dayItems.filter(item => item.category === 'meal');
          const meals = {
            breakfast: mealItems.some(m => m.description?.toLowerCase().includes('breakfast')),
            lunch: mealItems.some(m => m.description?.toLowerCase().includes('lunch')),
            dinner: mealItems.some(m => m.description?.toLowerCase().includes('dinner'))
          };

          return {
            dayNumber,
            title,
            locations: locations.length > 0 ? locations : ['TBD'],
            activities,
            accommodation,
            meals
          };
        });

        console.log('[Quotation] Created', itineraryDays.length, 'itinerary days');

        // Create itinerary via API
        if (itineraryDays.length > 0) {
          try {
            const leadId = lead?._id || lead?.id;
            const itineraryResponse = await manualItineraryAPI.createOrUpdate(leadId, itineraryDays);

            if (itineraryResponse.success || itineraryResponse.status === 'success') {
              itineraryId = itineraryResponse.data?._id || itineraryResponse.data?.id;
              console.log('[Quotation] Created itinerary:', itineraryId);
            }
          } catch (error) {
            console.error('[Quotation] Failed to create itinerary:', error);
          }
        }
      }

      // Add itinerary to payload if created
      if (itineraryId) {
        payload.itinerary = itineraryId;
      }

      const response = await quotationAPI.create(payload);

      if (response.success || response.status === 'success') {
        const createdQuotation = response.data?.data || response.data;
        const newQuotationId = createdQuotation?._id || createdQuotation?.id;

        toast.success('Quotation saved successfully!');

        if (createdQuotation) {
          setCurrentQuotation(createdQuotation);
          setCurrentQuotationId(newQuotationId || null);
        }

        setIsEditing(false);
        setHasInitializedNew(false);

        await fetchExistingQuotations(false, newQuotationId || null);

        if (newQuotationId) {
          setSelectedQuotationId(newQuotationId);
          setCurrentQuotationId(newQuotationId);
          setShowPDFPreview(true);
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        toast.error(response.message || 'Failed to save quotation');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Edit Quotation' : 'New Quotation'}
              </h2>
              <p className="text-slate-400 text-xs">{lead?.name || 'Customer'}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totals.totalAmount, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="flex items-center gap-3 text-xs">
              <span className={`px-2 py-1 rounded text-[10px] font-medium ${isDetailedMode ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-700 text-slate-400'}`}>
                {isDetailedMode ? 'Detailed' : 'Summary'}
              </span>
              <span className="text-slate-500">{formData.items.filter(i => i.description).length} items</span>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="space-y-4">
            {/* TOP ROW: Delivery + Plan Selection + Configuration - Improved Layout */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Delivery Section - Narrower, stacked layout */}
              <div className="w-full lg:w-72 lg:shrink-0 bg-white rounded-lg border border-slate-200 p-3">
                <h3 className="text-xs font-semibold text-slate-600 mb-2">Quotation & Delivery</h3>
                <div className="space-y-2">
                  {/* Row 1: Quotation Selection */}
                  {(loadingExisting || existingQuotations.length > 0) && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Quotation</label>
                      <select
                        value={selectedQuotationId || 'new'}
                        onChange={(e) => setSelectedQuotationId(e.target.value === 'new' ? 'new' : e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        disabled={loadingExisting}
                      >
                        <option value="new">+ Create New</option>
                        {existingQuotations.map((q) => (
                          <option key={q._id || q.id} value={q._id || q.id}>
                            {q.quotationNumber || (q._id || q.id).slice(-6)} • {formatCurrency(q.totalAmount || 0, { minimumFractionDigits: 2 })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Row 2: Email Input */}
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={sendEmailAddress}
                      onChange={(e) => setSendEmailAddress(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  {/* Row 3: Action Buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={sendingEmail || !sendEmailAddress.trim()}
                      className="flex-1 px-2 py-1.5 bg-teal-600 text-white rounded text-[10px] font-medium hover:bg-teal-700 disabled:opacity-40 flex items-center justify-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      {sendingEmail ? '...' : 'Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(currentQuotationId || currentQuotation?._id)}
                      disabled={!currentQuotationId || currentQuotationId === 'new' || !lead?.whatsapp}
                      className="flex-1 px-2 py-1.5 bg-emerald-600 text-white rounded text-[10px] font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </button>
                    {selectedQuotationId !== 'new' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadExistingQuotation(selectedQuotationId)}
                        className="px-2 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded text-[10px] font-medium hover:bg-slate-200 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Selection - Wider with better UX */}
              {availablePlans.length > 1 ? (
                <div className="flex-1 bg-white rounded-lg border border-slate-200 p-3">
                  <h3 className="text-xs font-semibold text-slate-600 mb-2">Plan Type</h3>
                  <div className="flex gap-2">
                    {availablePlans.includes('customized') && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const packageItem = prev.items.find(item => item.category === 'package');
                            return { ...prev, items: packageItem ? [packageItem] : [] };
                          });
                          setSelectedPlanType('customized');
                          setDetectedPackageType('customized');
                          setTimeout(() => loadDetailedItems('customized'), 200);
                          toast.success('Customized Package selected');
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${selectedPlanType === 'customized'
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50'}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>✨</span>
                          <span>Customized</span>
                        </div>
                        <div className="text-[9px] opacity-75 mt-0.5">Modified package</div>
                      </button>
                    )}
                    {availablePlans.includes('manual') && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const packageItem = prev.items.find(item => item.category === 'package');
                            return { ...prev, items: packageItem ? [packageItem] : [] };
                          });
                          setSelectedPlanType('manual');
                          setDetectedPackageType('manual');
                          setTimeout(() => isDetailedMode ? loadDetailedItems('manual') : loadManualItinerarySimple(), 200);
                          toast.success('Manual Itinerary selected');
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${selectedPlanType === 'manual'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>📋</span>
                          <span>Manual</span>
                        </div>
                        <div className="text-[9px] opacity-75 mt-0.5">Custom itinerary</div>
                      </button>
                    )}
                    {availablePlans.includes('package') && !availablePlans.includes('customized') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanType('package');
                          setDetectedPackageType('package');
                          setTimeout(() => loadDetailedItems('package'), 100);
                          toast.success('Standard Package selected');
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${selectedPlanType === 'package'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>📦</span>
                          <span>Package</span>
                        </div>
                        <div className="text-[9px] opacity-75 mt-0.5">Standard template</div>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* Configuration - Improved */}
              <div className="w-full lg:w-64 lg:shrink-0 bg-white rounded-lg border border-slate-200 p-3">
                <h3 className="text-xs font-semibold text-slate-600 mb-2">Mode & Status</h3>
                <div className="space-y-2">
                  {/* Current Plan Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Active:</span>
                    {detectedPackageType === 'customized' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-medium">✨ {detectedPackage?.name?.slice(0, 20) || 'Customized'}</span>
                    )}
                    {detectedPackageType === 'package' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium">📦 {detectedPackage?.name?.slice(0, 20) || 'Package'}</span>
                    )}
                    {detectedPackageType === 'manual' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">📋 Manual Itinerary</span>
                    )}
                    {!detectedPackageType && (
                      <span className="text-[10px] text-slate-400 italic">No plan selected</span>
                    )}
                  </div>
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">View:</span>
                    <div className="flex-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => !isDetailedMode ? null : handleToggleDetailedMode()}
                        disabled={loadingItinerary || !detectedPackageType}
                        className={`flex-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${!isDetailedMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} ${loadingItinerary || !detectedPackageType ? 'opacity-40' : ''}`}
                      >
                        Summary
                      </button>
                      <button
                        type="button"
                        onClick={() => isDetailedMode ? null : handleToggleDetailedMode()}
                        disabled={loadingItinerary || !detectedPackageType}
                        className={`flex-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${isDetailedMode ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} ${loadingItinerary || !detectedPackageType ? 'opacity-40' : ''}`}
                      >
                        Day-by-Day
                      </button>
                    </div>
                  </div>
                  {/* Valid Until */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-2">
                    <span className="text-[10px] text-slate-400">Valid:</span>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MANUAL ASSETS SECTION - Only for Pure Manual Itineraries (No Package Linked) */}
            {((detectedPackageType === 'manual' || selectedPlanType === 'manual') && !formData.package && !lead?.package && !lead?.customizedPackage) && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4 shadow-sm">
                <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <span>🖼️</span>
                    Quotation Assets (Manual Plan)
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {/* Multiple Images Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Package Images
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          if (files.length === 0) return;

                          try {
                            const loadingToast = toast.loading(`Uploading ${files.length} image(s)...`);

                            // Upload all files
                            const uploadPromises = files.map(file => uploadAPI.uploadSingle(file));
                            const results = await Promise.all(uploadPromises);

                            toast.dismiss(loadingToast);

                            const newImages = [];
                            let successCount = 0;

                            results.forEach(result => {
                              if (result.success || result.status === 'success') {
                                const imageUrl = result.data?.image?.url || result.data?.url || result.url || result.data;

                                if (typeof imageUrl === 'string') {
                                  newImages.push({
                                    url: imageUrl,
                                    isCover: formData.images.length === 0 && newImages.length === 0 // First image is cover by default
                                  });
                                  successCount++;
                                }
                              }
                            });

                            if (successCount > 0) {
                              setFormData({
                                ...formData,
                                images: [...formData.images, ...newImages],
                                coverImage: formData.images.length === 0 ? newImages[0]?.url : formData.coverImage
                              });
                              toast.success(`${successCount} image(s) uploaded successfully`);
                            } else {
                              toast.error('Failed to upload images');
                            }
                          } catch (error) {
                            console.error('Upload error:', error);
                            toast.error('Error uploading images');
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    {/* Image Gallery */}
                    {formData.images && formData.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {formData.images.map((img, index) => (
                          <div key={index} className="relative group">
                            <div className={`relative h-32 bg-gray-100 rounded-md overflow-hidden border-2 ${img.isCover ? 'border-orange-500' : 'border-gray-200'}`}>
                              <img
                                src={img.url}
                                alt={`Image ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />

                              {/* Cover Badge */}
                              {img.isCover && (
                                <div className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                                  Cover
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!img.isCover && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedImages = formData.images.map((image, i) => ({
                                        ...image,
                                        isCover: i === index
                                      }));
                                      setFormData({
                                        ...formData,
                                        images: updatedImages,
                                        coverImage: img.url
                                      });
                                      toast.success('Cover image updated');
                                    }}
                                    className="bg-orange-500 text-white rounded-full p-1 hover:bg-orange-600 shadow-sm text-xs"
                                    title="Set as cover"
                                  >
                                    ★
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedImages = formData.images.filter((_, i) => i !== index);
                                    // If we deleted the cover image, set first image as cover
                                    if (img.isCover && updatedImages.length > 0) {
                                      updatedImages[0].isCover = true;
                                    }
                                    setFormData({
                                      ...formData,
                                      images: updatedImages,
                                      coverImage: updatedImages.find(i => i.isCover)?.url || ''
                                    });
                                  }}
                                  className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                                  title="Remove image"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-center">Image {index + 1}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Upload multiple images for the itinerary. Click ★ to set an image as the cover. The cover image will appear on the first page of the quotation PDF.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Inclusions */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Inclusions
                      </label>
                      <textarea
                        value={formData.includedServices?.join('\n') || ''}
                        onChange={(e) => setFormData({ ...formData, includedServices: e.target.value.split('\n') })}
                        placeholder="Enter inclusions (one per line)..."
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Exclusions */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Exclusions
                      </label>
                      <textarea
                        value={formData.excludedServices?.join('\n') || ''}
                        onChange={(e) => setFormData({ ...formData, excludedServices: e.target.value.split('\n') })}
                        placeholder="Enter exclusions (one per line)..."
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Items Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200">
                <h3 className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                  <span>📋</span>
                  Items {isDetailedMode ? '(Detailed - Day by Day)' : '(Summary)'}
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-md text-xs font-medium hover:bg-teal-700 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isDetailedMode ? 'Add Item' : 'Add Field'}
                </button>
              </div>
              <div className="p-4">
                {!isDetailedMode ? (
                  /* Summary Mode: Package price input + All activities as read-only text */
                  <div className="space-y-4">
                    {/* Package Price Input (Editable) */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Package Total Price
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{CURRENCY_CODE}</span>
                        <input
                          type="number"
                          value={(() => {
                            const packageItem = formData.items.find(item => item.category === 'package');
                            return packageItem ? (packageItem.totalPrice || packageItem.unitPrice || 0) : 0;
                          })()}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0;
                            setFormData(prev => {
                              const packageItemIndex = prev.items.findIndex(item => item.category === 'package');
                              if (packageItemIndex >= 0) {
                                const newItems = [...prev.items];
                                newItems[packageItemIndex] = {
                                  ...newItems[packageItemIndex],
                                  totalPrice: price,
                                  unitPrice: price,
                                  quantity: 1,
                                };
                                return { ...prev, items: newItems };
                              } else {
                                // If no package item exists, create one
                                return {
                                  ...prev,
                                  items: [
                                    {
                                      description: 'Package Total',
                                      category: 'package',
                                      quantity: 1,
                                      unitPrice: price,
                                      totalPrice: price,
                                      notes: '',
                                    },
                                    ...prev.items.filter(item => item.category !== 'package'),
                                  ],
                                };
                              }
                            });
                          }}
                          min="0"
                          step="0.01"
                          className="flex-1 px-3 py-2 border border-green-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Enter package total price"
                        />
                      </div>
                    </div>

                    {/* Extra Fields Only - No included activities shown */}
                    {formData.items.filter(item => item.category !== 'package' && item.isManual === true).length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Extra Fields
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {formData.items
                            .map((item, originalIndex) => {
                              // Skip package items and non-manual items (activities from itinerary)
                              if (item.category === 'package' || item.isManual !== true) return null;

                              // Only show manually added extra fields
                              return (
                                <div
                                  key={originalIndex}
                                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded"
                                >
                                  <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)}
                                    placeholder="Field description"
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="number"
                                    value={item.totalPrice || item.unitPrice || 0}
                                    onChange={(e) => {
                                      const price = parseFloat(e.target.value) || 0;
                                      // Update both totalPrice and unitPrice in a single state update
                                      const newItems = [...formData.items];
                                      newItems[originalIndex] = {
                                        ...newItems[originalIndex],
                                        totalPrice: price,
                                        unitPrice: price,
                                        quantity: 1,
                                      };
                                      setFormData({ ...formData, items: newItems });
                                    }}
                                    min="0"
                                    step="0.01"
                                    placeholder="Price"
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <button
                                    onClick={() => removeItem(originalIndex)}
                                    className="text-red-600 hover:text-red-800"
                                    type="button"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })
                            .filter(item => item !== null)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Detailed Mode: All items with editable price inputs (Grouped by Day) */
                  <div className="overflow-x-auto">
                    {/* helper to group items */}
                    {(() => {
                      const items = formData.items.filter(i => i.category !== 'package');
                      if (items.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500 text-sm border-t">
                            No items added yet. Click "Reset from Itinerary" or "Add Item" to populate.
                          </div>
                        );
                      }

                      // Group by Day
                      const grouped = {};
                      const others = [];

                      items.forEach((item, index) => {
                        const originalIndex = formData.items.indexOf(item);
                        const match = item.description?.match(/^Day\s*(\d+)/i);
                        if (match) {
                          const dayNum = parseInt(match[1]);
                          if (!grouped[dayNum]) grouped[dayNum] = [];
                          grouped[dayNum].push({ ...item, originalIndex });
                        } else {
                          others.push({ ...item, originalIndex });
                        }
                      });

                      const dayKeys = Object.keys(grouped).sort((a, b) => a - b);

                      return (
                        <div className="space-y-4">
                          {/* Render days in 2-column grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {dayKeys.map(day => (
                              <div key={day} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                                <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-3 py-2 border-b border-slate-300 flex justify-between items-center shrink-0">
                                  <h4 className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                                    <span className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-[10px] text-slate-600 shadow-sm border border-slate-200 font-bold">{day}</span>
                                    Day {day}
                                  </h4>
                                  <span className="text-[9px] font-medium text-slate-500 bg-white/50 px-1.5 py-0.5 rounded border border-slate-200">{grouped[day].length} items</span>
                                </div>
                                <div className="divide-y divide-slate-100 overflow-y-auto max-h-60 bg-white custom-scrollbar">
                                  {grouped[day].map(({ originalIndex, description, totalPrice, unitPrice, quantity }) => (
                                    <div key={originalIndex} className="group relative px-3 py-2.5 hover:bg-slate-50 transition-colors">
                                      <div className="flex gap-2 items-start">
                                        <div className="flex-1 min-w-0">
                                          <textarea
                                            value={description || ''}
                                            onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)}
                                            rows={1}
                                            onInput={(e) => {
                                              e.target.style.height = 'auto';
                                              e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            className="w-full text-xs text-slate-700 bg-transparent border-0 p-0 focus:ring-0 resize-none font-medium leading-relaxed placeholder-slate-300"
                                            placeholder="Item description..."
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-1">
                                          <div className="relative group/price">
                                            <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                                              <span className="text-[10px] text-slate-400">{getCurrencySymbol()}</span>
                                            </div>
                                            <input
                                              type="number"
                                              value={totalPrice !== undefined ? totalPrice : (unitPrice || 0) * (quantity || 1)}
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newItems = [...formData.items];
                                                newItems[originalIndex] = { ...newItems[originalIndex], totalPrice: val, unitPrice: val, quantity: 1 };
                                                setFormData({ ...formData, items: newItems });
                                              }}
                                              className="w-20 pl-4 pr-1 py-1 text-right text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all font-semibold"
                                              placeholder="0.00"
                                            />
                                          </div>
                                          <button
                                            onClick={() => removeItem(originalIndex)}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Item"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {grouped[day].length === 0 && (
                                    <div className="px-4 py-8 text-center text-[10px] text-slate-400 italic bg-slate-50/50">
                                      No items for this day
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>


                          {
                            others.length > 0 && (
                              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm mt-4">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                  <h4 className="font-semibold text-slate-700 text-xs flex items-center gap-2">
                                    <span>📦</span> General Items
                                  </h4>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {others.map(({ originalIndex, description, totalPrice, unitPrice, quantity }) => (
                                    <div key={originalIndex} className="group relative px-4 py-3 hover:bg-slate-50 transition-colors">
                                      <div className="flex gap-3 items-start">
                                        <div className="flex-1 min-w-0">
                                          <textarea
                                            value={description || ''}
                                            onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)}
                                            rows={1}
                                            onInput={(e) => {
                                              e.target.style.height = 'auto';
                                              e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            className="w-full text-xs text-slate-700 bg-transparent border-0 p-0 focus:ring-0 resize-none font-medium leading-relaxed placeholder-slate-300"
                                            placeholder="Item description..."
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          <div className="relative group/price">
                                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                              <span className="text-[10px] text-slate-400">{getCurrencySymbol()}</span>
                                            </div>
                                            <input
                                              type="number"
                                              value={totalPrice !== undefined ? totalPrice : (unitPrice || 0) * (quantity || 1)}
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newItems = [...formData.items];
                                                newItems[originalIndex] = { ...newItems[originalIndex], totalPrice: val, unitPrice: val, quantity: 1 };
                                                setFormData({ ...formData, items: newItems });
                                              }}
                                              className="w-24 pl-5 pr-2 py-1.5 text-right text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all font-semibold"
                                              placeholder="0.00"
                                            />
                                          </div>
                                          <button
                                            onClick={() => removeItem(originalIndex)}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Item"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }


                          {/* Resync Button */}
                          < div className="flex justify-end pt-4" >
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('This will reload items from the itinerary, effectively resetting your manual edits for this section. Continue?')) {
                                  loadDetailedItems();
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                            >
                              ↻ Reset/Reload Items from Itinerary
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )
                }
              </div>
            </div>

            {/* Calculations & Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tax & Discount Card */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                  <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <span>💰</span> Tax & Discount
                  </h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={formData.taxRate}
                        onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 mb-1">Discount Type</label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value, discountValue: 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="none">None</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>
                  </div>
                  {formData.discountType !== 'none' && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Discount Value {formData.discountType === 'percentage' ? '(%)' : `(${getCurrencySymbol()})`}
                      </label>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden text-white">
                <div className="px-4 py-2.5 border-b border-slate-700">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-teal-400" />
                    <span>Summary</span>
                  </h4>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Discount:</span>
                      <span>-{formatCurrency(totals.discountAmount, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {totals.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Tax ({formData.taxRate}%):</span>
                      <span className="font-medium">{formatCurrency(totals.taxAmount, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-3 mt-3">
                    <span>Total:</span>
                    <span className="text-teal-400">{formatCurrency(totals.totalAmount, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span>📝</span> Notes
                  </label>
                </div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 border-0 text-sm focus:outline-none focus:ring-0 resize-none"
                  placeholder="Additional notes or special instructions..."
                />
              </div>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200">
                  <label className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                    <span>💳</span> Payment Terms
                  </label>
                </div>
                <textarea
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 border-0 text-sm focus:outline-none focus:ring-0 resize-none"
                  placeholder="Payment terms and conditions..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            {currentQuotationId && (
              <button
                onClick={() => handlePreviewPDF(currentQuotationId)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                <Eye className="w-4 h-4" />
                Preview PDF
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('save')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Quotation'}
            </button>
          </div>
        </div>

        {/* PDF Preview Dialog */}
        {showPDFPreview && currentQuotationId && (
          <PDFPreviewDialog
            isOpen={showPDFPreview}
            onClose={() => {
              setShowPDFPreview(false);
              setCurrentQuotationId(null);
              onSuccess?.();
              onClose();
            }}
            onBack={() => {
              setShowPDFPreview(false);
              // Keep the form dialog open, just close PDF preview
            }}
            pdfUrl={`/billing/quotations/${currentQuotationId}/pdf`}
            documentName="Quotation"
            onDownload={true}
            documents={existingQuotations}
            currentIndex={existingQuotations.findIndex(q =>
              (q._id || q.id) === currentQuotationId
            )}
            onNavigate={(index) => {
              if (existingQuotations[index]) {
                const quotationId = existingQuotations[index]._id || existingQuotations[index].id;
                setCurrentQuotationId(quotationId);
              }
            }}
          />
        )}
      </div>
    </div >
  );
};

export default QuotationDialog;
