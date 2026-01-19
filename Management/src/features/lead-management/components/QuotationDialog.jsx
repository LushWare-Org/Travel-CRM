import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Calculator, Eye, ToggleLeft, ToggleRight, Download, Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotationAPI, packageAPI, customizedPackageAPI, manualItineraryAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';

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
    items: [], // Start with empty array - items will be added when package is detected or manually added
    taxRate: 0,
    discountType: 'none',
    discountValue: 0,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
    paymentTerms: '',
    includedServices: [],
    excludedServices: [],
  });

  const [formData, setFormData] = useState(buildDefaultFormData(lead));
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) {
      return '0.00';
    }
    const value = Number(amount) || 0;
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDateLabel = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      return new Date(dateValue).toLocaleDateString('en-IN', {
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
      `Thank you for choosing Trip Sky Way!`
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
    if (payload.package === '' || !payload.package) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-600 to-green-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit Quotation' : 'Create Quotation'}
            </h2>
            <p className="text-green-100 text-sm mt-1">
              {lead?.name && `For: ${lead.name}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {(loadingExisting || existingQuotations.length > 0) && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Existing Quotations
                  </label>
                  <select
                    value={selectedQuotationId || 'new'}
                    onChange={(e) => setSelectedQuotationId(e.target.value === 'new' ? 'new' : e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loadingExisting}
                  >
                    <option value="new">Create New Quotation</option>
                    {existingQuotations.map((quotation) => {
                      const quotationId = quotation._id || quotation.id;
                      return (
                        <option key={quotationId} value={quotationId}>
                          {`${quotation.quotationNumber || quotationId} • ${getModeLabel(quotation.mode)} • INR ${formatCurrency(quotation.totalAmount || 0)} • ${formatDateLabel(quotation.createdAt)}`}
                        </option>
                      );
                    })}
                  </select>
                  {loadingExisting && (
                    <p className="text-xs text-gray-500 mt-1">Loading quotations...</p>
                  )}
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => handleDownloadExistingQuotation(selectedQuotationId)}
                    disabled={selectedQuotationId === 'new'}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="Download selected quotation PDF"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={sendEmailAddress}
                  onChange={(e) => setSendEmailAddress(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We will send the quotation PDF to this address using the configured mail server.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !sendEmailAddress.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail ? 'Sending…' : 'Send Email'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(currentQuotationId || currentQuotation?._id)}
                  disabled={!currentQuotationId || currentQuotationId === 'new' || !lead?.whatsapp}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            </div>

            {/* NEW: Plan Selection Toggle - Show when multiple plans are available */}
            {availablePlans.length > 1 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-blue-600">🎯</span>
                      Select Plan to Quote
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      This lead has multiple travel plans. Choose which one to include in this quotation.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {availablePlans.includes('customized') && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔄 [Quotation] Switching to Customized Package');

                        // Clear existing items (except package item) before loading new plan
                        setFormData(prev => {
                          const packageItem = prev.items.find(item => item.category === 'package');
                          return {
                            ...prev,
                            items: packageItem ? [packageItem] : []
                          };
                        });

                        setSelectedPlanType('customized');
                        setDetectedPackageType('customized');

                        // Increase timeout to ensure state updates complete
                        setTimeout(() => {
                          console.log('⏰ [Quotation] Loading customized package items');
                          // Pass explicit type to avoid stale closure issues
                          loadDetailedItems('customized');
                        }, 200);

                        toast.success('Switched to Customized Package plan');
                      }}
                      className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${selectedPlanType === 'customized'
                        ? 'bg-purple-600 border-purple-600 text-white shadow-lg scale-105'
                        : 'bg-white border-purple-300 text-purple-700 hover:border-purple-500 hover:bg-purple-50'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">✨</span>
                        <span className="font-semibold text-sm">Customized Package</span>
                        <span className="text-xs opacity-80">Personalized for Lead</span>
                      </div>
                    </button>
                  )}

                  {availablePlans.includes('manual') && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔄 [Quotation] Switching to Manual Itinerary');

                        // Clear existing items (except package item) before loading new plan
                        setFormData(prev => {
                          const packageItem = prev.items.find(item => item.category === 'package');
                          return {
                            ...prev,
                            items: packageItem ? [packageItem] : []
                          };
                        });

                        setSelectedPlanType('manual');
                        setDetectedPackageType('manual');

                        // Increase timeout to ensure state updates complete
                        setTimeout(() => {
                          console.log('⏰ [Quotation] Loading manual itinerary items');
                          if (isDetailedMode) {
                            // Pass explicit type to avoid stale closure issues
                            loadDetailedItems('manual');
                          } else {
                            loadManualItinerarySimple();
                          }
                        }, 200);

                        toast.success('Switched to Manual Itinerary plan');
                      }}
                      className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${selectedPlanType === 'manual'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                        : 'bg-white border-blue-300 text-blue-700 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">📋</span>
                        <span className="font-semibold text-sm">Manual Itinerary</span>
                        <span className="text-xs opacity-80">
                          {lead.manualItinerary?.title || 'Custom Day-by-Day Plan'}
                        </span>
                      </div>
                    </button>
                  )}

                  {availablePlans.includes('package') && !availablePlans.includes('customized') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanType('package');
                        setDetectedPackageType('package');
                        setTimeout(() => {
                          loadDetailedItems('package');
                        }, 100);
                        toast.success('Switched to Regular Package plan');
                      }}
                      className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${selectedPlanType === 'package'
                        ? 'bg-green-600 border-green-600 text-white shadow-lg scale-105'
                        : 'bg-white border-green-300 text-green-700 hover:border-green-500 hover:bg-green-50'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">📦</span>
                        <span className="font-semibold text-sm">Regular Package</span>
                        <span className="text-xs opacity-80">
                          {lead.package?.name || lead.packageName || 'Standard Plan'}
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 bg-white rounded px-3 py-2">
                  <span className="font-semibold text-blue-600">💡 Tip:</span>
                  <span>You can create separate quotations for each plan and send both to the customer for comparison.</span>
                </div>
              </div>
            )}

            {/* Package Detection & Detailed Mode Toggle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detected Package
                </label>
                <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50">
                  {detectedPackageType === 'customized' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-purple-700">
                        ✨ Customized Package: {detectedPackage?.name || 'N/A'}
                      </span>
                    </div>
                  )}
                  {detectedPackageType === 'package' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        📦 Package: {detectedPackage?.name || 'N/A'}
                      </span>
                    </div>
                  )}
                  {detectedPackageType === 'manual' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-700">
                        📋 Manual Itinerary
                      </span>
                    </div>
                  )}
                  {!detectedPackageType && (
                    <span className="text-sm text-gray-500">No package detected</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Quotation
                </label>
                <button
                  type="button"
                  onClick={handleToggleDetailedMode}
                  disabled={loadingItinerary || !detectedPackageType}
                  className={`w-full px-3 py-2 border rounded flex items-center justify-center gap-2 transition-colors ${isDetailedMode
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    } ${loadingItinerary || !detectedPackageType ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isDetailedMode ? (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      <span>Detailed Mode ON</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      <span>Detailed Mode OFF</span>
                    </>
                  )}
                </button>
                {loadingItinerary && (
                  <p className="text-xs text-gray-500 mt-1">Loading itinerary...</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Current mode: <span className="font-semibold text-gray-700">{getModeLabel(formData.mode)}</span>
                  {currentQuotation && ' (loaded from selected quotation)'}
                </p>
              </div>
            </div>

            {/* Valid Until */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Items {isDetailedMode ? '(Detailed Mode - Individual Pricing)' : '(Summary Mode - Package Price Only)'}
                </h3>
                {/* Show Add Item/Field button */}
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {isDetailedMode ? 'Add Item' : 'Add Field'}
                </button>
              </div>

              {!isDetailedMode ? (
                /* Summary Mode: Package price input + All activities as read-only text */
                <div className="space-y-4">
                  {/* Package Price Input (Editable) */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Package Total Price
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">INR</span>
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
                      <div className="space-y-6">
                        {dayKeys.map(day => (
                          <div key={day} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                              <h4 className="font-bold text-gray-700">Day {day}</h4>
                              <span className="text-xs text-gray-500">{grouped[day].length} items</span>
                            </div>
                            <table className="w-full border-collapse">
                              <tbody className="divide-y divide-gray-100">
                                {grouped[day].map(({ originalIndex, description, totalPrice, unitPrice, quantity }) => (
                                  <tr key={originalIndex} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 w-full">
                                      <input
                                        type="text"
                                        value={description || ''}
                                        onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)}
                                        className="w-full px-2 py-1 border-0 bg-transparent focus:ring-0 text-sm text-gray-700"
                                      />
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">INR</span>
                                        <input
                                          type="number"
                                          value={totalPrice !== undefined ? totalPrice : (unitPrice || 0) * (quantity || 1)}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const newItems = [...formData.items];
                                            newItems[originalIndex] = { ...newItems[originalIndex], totalPrice: val, unitPrice: val, quantity: 1 };
                                            setFormData({ ...formData, items: newItems });
                                          }}
                                          className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-green-500"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 w-10 text-center">
                                      <button
                                        onClick={() => removeItem(originalIndex)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}

                        {others.length > 0 && (
                          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                              <h4 className="font-bold text-gray-700">General Items</h4>
                            </div>
                            <table className="w-full border-collapse">
                              <tbody className="divide-y divide-gray-100">
                                {others.map(({ originalIndex, description, totalPrice, unitPrice, quantity }) => (
                                  <tr key={originalIndex} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 w-full">
                                      <input
                                        type="text"
                                        value={description || ''}
                                        onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)}
                                        className="w-full px-2 py-1 border-0 bg-transparent focus:ring-0 text-sm text-gray-700"
                                        placeholder="Item description"
                                      />
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">INR</span>
                                        <input
                                          type="number"
                                          value={totalPrice !== undefined ? totalPrice : (unitPrice || 0) * (quantity || 1)}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const newItems = [...formData.items];
                                            newItems[originalIndex] = { ...newItems[originalIndex], totalPrice: val, unitPrice: val, quantity: 1 };
                                            setFormData({ ...formData, items: newItems });
                                          }}
                                          className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-green-500"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 w-10 text-center">
                                      <button
                                        onClick={() => removeItem(originalIndex)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Resync Button */}
                        <div className="flex justify-end pt-4">
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
              )}
            </div>

            {/* Calculations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value, discountValue: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                {formData.discountType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Summary
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">{totals.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-green-600">{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Additional notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <textarea
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Payment terms and conditions..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            {currentQuotationId && (
              <button
                onClick={() => handlePreviewPDF(currentQuotationId)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                title="Preview/Download Quotation PDF"
              >
                <Eye className="w-4 h-4" />
                View PDF
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('save')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Quotation
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
    </div>
  );
};

export default QuotationDialog;

