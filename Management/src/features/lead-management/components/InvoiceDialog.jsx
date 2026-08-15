import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Calculator, Eye, Download, Send, MessageCircle, FileText, Calendar, Package, Receipt, CreditCard, Percent, ChevronDown, ChevronUp, Sparkles, User, ScrollText } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoiceAPI, quotationAPI, packageAPI, customizedPackageAPI, manualItineraryAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';
import { getThankYouMessage } from '../../../config/branding';
import { formatCurrency, getCurrencySymbol, CURRENCY_CODE, LOCALE } from '../../../utils/currency.js';

const EMPTY_CUSTOMER_OVERRIDES = { customerName: '', customerEmail: '', customerPhone: '', customerAddress: '', customerGstNumber: '', destination: '' };

const InvoiceDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [detectedPackage, setDetectedPackage] = useState(null);
  const [detectedPackageType, setDetectedPackageType] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ items: true, discount: false, communication: false, customer: false, paymentTerms: false });
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  // Set once a quotation is picked for a *new* invoice — drives the
  // read-only totals/customer-override UI. Pricing here is never recomputed
  // client-side: it's shown verbatim from the quotation and the server
  // (convertQuotationToInvoice) copies it verbatim too.
  const [quotationSnapshot, setQuotationSnapshot] = useState(null);
  const [customerOverrideEnabled, setCustomerOverrideEnabled] = useState(false);
  const [customerOverrides, setCustomerOverrides] = useState(EMPTY_CUSTOMER_OVERRIDES);

  const [formData, setFormData] = useState({
    lead: lead?._id || lead?.id, quotation: '', package: '', type: 'invoice',
    items: [{ description: '', category: 'other', quantity: 1, unitPrice: 0, totalPrice: 0, taxRate: 0, notes: '' }],
    taxRate: 0, discountType: 'none', discountValue: 0,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    bookingId: '',
    notes: '', terms: '', paymentTerms: '', paymentInstructions: '',
  });
  const [quotationMode, setQuotationMode] = useState('summary');
  const isDetailedMode = quotationMode === 'detailed';
  // True only for a brand-new invoice being created straight from a
  // quotation — editing an existing invoice keeps using the classic
  // items/discount form below, untouched.
  const usingQuotationFlow = Boolean(formData.quotation) && Boolean(quotationSnapshot) && !isEditing;
  const [sendEmailAddress, setSendEmailAddress] = useState(lead?.email || lead?.customer?.email || '');
  const [sendingEmail, setSendingEmail] = useState(false);

  // formatCurrency is now imported from utils/currency
  const formatDateLabel = (dateValue) => { if (!dateValue) return 'N/A'; try { return new Date(dateValue).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return 'N/A'; } };
  const getModeLabel = (mode) => mode === 'detailed' ? 'Detailed' : 'Summary';

  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const handleDownloadQuotationPDF = async (quotationId) => { if (!quotationId) return; try { await quotationAPI.downloadPDF(quotationId); toast.success('Quotation PDF downloaded'); } catch (error) { toast.error('Failed to download quotation PDF'); } };

  useEffect(() => {
    if (isOpen && lead) {
      setQuotationMode('summary'); detectPackageType();
      setFormData(prev => ({ ...prev, lead: lead._id || lead.id, package: lead.package?._id || lead.package || '' }));
      setSendEmailAddress(lead?.email || lead?.customer?.email || '');
      fetchQuotations(); fetchExistingInvoices();
      if (lead.manualItinerary?._id || lead.manualItinerary) loadManualItinerarySimple();
    }
  }, [isOpen, lead]);

  const loadManualItinerarySimple = async () => {
    if (!lead) return;
    try {
      const manualResponse = await manualItineraryAPI.getByLead(lead._id || lead.id);
      if (manualResponse.success || manualResponse.status === 'success') {
        const manualItinerary = manualResponse.data || manualResponse;
        if (manualItinerary?.days && Array.isArray(manualItinerary.days)) {
          const simplifiedItems = manualItinerary.days.map((day, index) => ({ description: `Day ${day.dayNumber || index + 1}`, category: 'other', quantity: 1, unitPrice: 0, totalPrice: 0, taxRate: 0, notes: '' }));
          setFormData(prev => { const existingPackageItem = prev.items.find(item => item.category === 'package'); return { ...prev, items: existingPackageItem ? [existingPackageItem, ...simplifiedItems] : simplifiedItems }; });
        }
      }
    } catch (error) { console.error('Error loading manual itinerary:', error); }
  };

  const detectPackageType = async () => {
    if (!lead) return;
    if (lead.customizedPackage?._id || lead.customizedPackage) {
      const packageId = lead.customizedPackage._id || lead.customizedPackage; setDetectedPackageType('customized');
      try { const response = await customizedPackageAPI.getById(packageId); if (response.success || response.status === 'success') { setDetectedPackage(response.data || response); if (response.data?.price || response.price) { const pkg = response.data || response; addPackageItem(pkg.name, pkg.price, 'customized'); } } } catch (error) { console.error('Error loading customized package:', error); }
      return;
    }
    if (lead.package?._id || lead.package || lead.packageName) {
      const packageId = lead.package?._id || lead.package; setDetectedPackageType('package');
      if (packageId) { try { const response = await packageAPI.getById(packageId); if (response.success || response.status === 'success') { const pkg = response.data || response; setDetectedPackage(pkg); if (pkg.price) addPackageItem(pkg.name, pkg.price, 'package'); } } catch (error) { console.error('Error loading package:', error); } }
      return;
    }
    if (lead.manualItinerary?._id || lead.manualItinerary) { setDetectedPackageType('manual'); setDetectedPackage({ type: 'manual', name: 'Manual Itinerary' }); }
  };

  const addPackageItem = (packageName, price, type = 'package') => {
    const packageItem = { description: `${packageName} ${type === 'customized' ? '(Customized)' : ''} Package`, category: 'package', quantity: 1, unitPrice: price, totalPrice: price, taxRate: 0, notes: type === 'customized' ? 'Customized package' : '' };
    setFormData(prev => {
      const existingIndex = prev.items.findIndex(item => item.category === 'package' || item.description?.toLowerCase().includes('package'));
      if (existingIndex >= 0) { const updatedItems = [...prev.items]; updatedItems[existingIndex] = packageItem; return { ...prev, items: updatedItems }; }
      else { const currentItems = prev.items?.length > 0 ? prev.items : [{ description: '', category: 'other', quantity: 1, unitPrice: 0, totalPrice: 0, taxRate: 0, notes: '' }]; return { ...prev, items: [packageItem, ...currentItems.filter(item => item.category !== 'package')] }; }
    });
  };

  const fetchQuotations = async () => {
    if (!lead?._id && !lead?.id) return;
    try { setLoadingQuotations(true); const response = await quotationAPI.getByLead(lead._id || lead.id); if (response.success || response.status === 'success') { const quotesData = response.data?.quotations || response.data || []; setQuotations(quotesData.filter(q => q.status !== 'converted')); if (formData.quotation) { const selectedQuote = quotesData.find(q => (q._id || q.id) === formData.quotation); if (selectedQuote) loadQuotationData(formData.quotation); } } } catch (error) { console.error('Error fetching quotations:', error); } finally { setLoadingQuotations(false); }
  };

  const fetchExistingInvoices = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingExisting(true); const response = await invoiceAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const invoicesData = response.data?.invoices || response.data?.data || response.data || [];
        const invoicesArray = Array.isArray(invoicesData) ? invoicesData : [];
        setExistingInvoices(invoicesArray);
        if (invoicesArray.length > 0) {
          const latestInvoice = invoicesArray[0]; setCurrentInvoice(latestInvoice); setIsEditing(true);
          const deduplicateItems = (items) => { if (!items?.length) return [{ description: '', category: 'other', quantity: 1, unitPrice: 0, totalPrice: 0, taxRate: 0, notes: '' }]; const uniqueMap = new Map(); const uniqueItems = []; items.forEach(item => { const normalizedDesc = (item.description || '').trim().toLowerCase(); if (!normalizedDesc) return; if (!uniqueMap.has(normalizedDesc)) { uniqueMap.set(normalizedDesc, true); uniqueItems.push({ description: item.description || '', category: item.category || 'other', quantity: item.quantity || 1, unitPrice: item.unitPrice || 0, totalPrice: item.totalPrice || 0, taxRate: item.taxRate || 0, notes: item.notes || '' }); } }); return uniqueItems.length > 0 ? uniqueItems : [{ description: '', category: 'other', quantity: 1, unitPrice: 0, totalPrice: 0, taxRate: 0, notes: '' }]; };
          setFormData({ lead: lead._id || lead.id, quotation: latestInvoice.quotation?._id || latestInvoice.quotation || '', package: latestInvoice.package?._id || latestInvoice.package || '', type: latestInvoice.type || 'invoice', items: deduplicateItems(latestInvoice.items), taxRate: latestInvoice.taxRate || 0, discountType: latestInvoice.discountType || 'none', discountValue: latestInvoice.discountValue || 0, issueDate: latestInvoice.issueDate ? new Date(latestInvoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], dueDate: latestInvoice.dueDate ? new Date(latestInvoice.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookingId: latestInvoice.bookingId || '', notes: latestInvoice.notes || '', terms: latestInvoice.terms || '', paymentTerms: latestInvoice.paymentTerms || '', paymentInstructions: latestInvoice.paymentInstructions || '' });
          setQuotationMode((latestInvoice.quotation?.mode) || 'summary');
          setSendEmailAddress(latestInvoice.customer?.email || latestInvoice.lead?.email || lead?.email || '');
          setCurrentInvoiceId(latestInvoice._id || latestInvoice.id);
          if (latestInvoice.quotation) loadQuotationData(latestInvoice.quotation._id || latestInvoice.quotation);
        } else { setIsEditing(false); setCurrentInvoice(null); setQuotationMode('summary'); }
      }
    } catch (error) { console.error('Error fetching existing invoices:', error); } finally { setLoadingExisting(false); }
  };

  const handleSendWhatsApp = (invoiceId) => { if (!lead?.whatsapp) { toast.error('WhatsApp number not available'); return; } const whatsappNumber = lead.whatsapp.replace(/[^0-9]/g, ''); if (!whatsappNumber) { toast.error('Invalid WhatsApp number'); return; } const invoiceNumber = currentInvoice?.invoiceNumber || `#${invoiceId?.slice(-6)}` || 'Invoice'; const totalAmount = currentInvoice?.totalAmount || formData.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0; const message = encodeURIComponent(`Hello ${lead.name || 'there'},\n\nYour invoice ${invoiceNumber} for ${totalAmount.toFixed(2)} is ready.\n\n${getThankYouMessage()}`); window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank'); };
  const handleSendInvoiceEmail = async () => { const targetId = currentInvoiceId || currentInvoice?._id || currentInvoice?.id; if (!targetId) { toast.error('Please save the invoice first'); return; } const trimmedEmail = sendEmailAddress.trim(); if (!trimmedEmail) { toast.error('Please provide a recipient email'); return; } try { setSendingEmail(true); await invoiceAPI.send(targetId, { email: trimmedEmail }); toast.success('Invoice emailed successfully'); await fetchExistingInvoices(); } catch (error) { toast.error(error.message || 'Failed to send invoice email'); } finally { setSendingEmail(false); } };
  const handlePreviewPDF = (invoiceId) => { setCurrentInvoiceId(invoiceId); setShowPDFPreview(true); };

  // For a brand-new invoice, this only stores the quotation's snapshot for
  // read-only display + as the override baseline — it deliberately does NOT
  // copy items/taxRate/discount into editable formData: the invoice is
  // created via quotationAPI.convertToInvoice, which copies pricing on the
  // server, verbatim, from the quotation itself. When editing an existing
  // invoice instead (isEditing), it keeps the previous behavior of loading
  // the quotation's items into the editable form, since that path still
  // goes through invoiceAPI.update.
  const loadQuotationData = async (quotationId) => {
    if (!quotationId) { setQuotationSnapshot(null); return; }
    try {
      const response = await quotationAPI.getById(quotationId);
      if (response.success || response.status === 'success' || response.data) {
        const quote = response.data || response; const quoteMode = quote.mode || 'summary'; setQuotationMode(quoteMode);

        const snapshot = {
          packageTitle: quote.packageTitle, quotationNumber: quote.quotationNumber,
          customerName: quote.customerName || '', customerEmail: quote.customerEmail || '',
          customerPhone: quote.customerPhone || '', customerAddress: quote.customerAddress || '',
          customerGstNumber: quote.customerGstNumber || '', destination: quote.destination || '',
          subtotal: quote.subtotal || 0, discountAmount: quote.discountAmount || 0,
          taxAmount: quote.taxAmount || 0, taxRate: quote.taxRate || 0,
          serviceChargeAmount: quote.serviceChargeAmount || 0, serviceChargeRate: quote.serviceChargeRate || 0,
          totalAmount: quote.totalAmount || 0, items: quote.items || [],
        };
        setQuotationSnapshot(snapshot);
        setCustomerOverrideEnabled(false);
        setCustomerOverrides({
          customerName: snapshot.customerName, customerEmail: snapshot.customerEmail,
          customerPhone: snapshot.customerPhone, customerAddress: snapshot.customerAddress,
          customerGstNumber: snapshot.customerGstNumber, destination: snapshot.destination,
        });

        if (isEditing) {
          // Legacy edit path: keep populating the editable item/discount form.
          const deduplicateItems = (items) => { if (!items?.length) return []; const uniqueMap = new Map(); const uniqueItems = []; items.forEach(item => { const normalizedDesc = (item.description || '').trim().toLowerCase(); if (!normalizedDesc) return; if (!uniqueMap.has(normalizedDesc)) { uniqueMap.set(normalizedDesc, true); uniqueItems.push({ description: item.description || '', category: item.category || 'other', quantity: item.quantity || 1, unitPrice: item.unitPrice || 0, totalPrice: item.totalPrice || 0, taxRate: item.taxRate || 0, notes: item.notes || '', isManual: item.isManual !== undefined ? item.isManual : (quoteMode === 'summary' && item.category === 'other' && item.category !== 'package') }); } }); return uniqueItems; };
          setFormData(prev => ({ ...prev, quotation: quotationId, items: deduplicateItems(quote.items), taxRate: quote.taxRate !== undefined ? quote.taxRate : prev.taxRate, discountType: quote.discountType || prev.discountType, discountValue: quote.discountValue !== undefined ? quote.discountValue : prev.discountValue, notes: quote.notes !== undefined ? quote.notes : prev.notes, terms: quote.terms !== undefined ? quote.terms : prev.terms, paymentTerms: quote.paymentTerms !== undefined ? quote.paymentTerms : prev.paymentTerms }));
        } else {
          setFormData(prev => ({ ...prev, quotation: quotationId }));
        }
        toast.success('Quotation data loaded');
      }
    } catch (error) { toast.error('Failed to load quotation data'); }
  };

  const handleItemChange = (index, field, value) => { const newItems = [...formData.items]; newItems[index] = { ...newItems[index], [field]: value }; if (field === 'quantity' || field === 'unitPrice') { const qty = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity || 0; const price = field === 'unitPrice' ? parseFloat(value) || 0 : newItems[index].unitPrice || 0; newItems[index].totalPrice = qty * price; } else if (field === 'totalPrice') { const totalPrice = parseFloat(value) || 0; newItems[index].totalPrice = totalPrice; newItems[index].unitPrice = totalPrice; newItems[index].quantity = 1; } setFormData({ ...formData, items: newItems }); };
  const addItem = () => { setFormData({ ...formData, items: [...formData.items, { description: '', category: 'other', quantity: 1, unitPrice: 0, totalPrice: 0, taxRate: 0, notes: '', isManual: true }] }); };
  const removeItem = (index) => { if (formData.items.length > 1) setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) }); else toast.error('At least one item is required'); };

  const calculateTotals = () => {
    if (usingQuotationFlow) {
      return { subtotal: quotationSnapshot.subtotal, discountAmount: quotationSnapshot.discountAmount, taxAmount: quotationSnapshot.taxAmount, serviceChargeAmount: quotationSnapshot.serviceChargeAmount, totalAmount: quotationSnapshot.totalAmount };
    }
    const itemsToCalculate = isDetailedMode ? formData.items.filter(item => item.category !== 'package') : formData.items.filter(item => item.category === 'package' || item.isManual === true);
    const subtotal = itemsToCalculate.reduce((sum, item) => { const itemTotal = item.totalPrice !== undefined && item.totalPrice !== null ? item.totalPrice : (item.quantity || 0) * (item.unitPrice || 0); return sum + itemTotal; }, 0);
    let discountAmount = 0; if (formData.discountType === 'percentage') discountAmount = (subtotal * (formData.discountValue || 0)) / 100; else if (formData.discountType === 'fixed') discountAmount = formData.discountValue || 0;
    const taxableAmount = subtotal - discountAmount; const taxAmount = (taxableAmount * (formData.taxRate || 0)) / 100; return { subtotal, discountAmount, taxAmount, totalAmount: taxableAmount + taxAmount };
  };

  const toggleCustomerOverride = () => {
    setCustomerOverrideEnabled(prev => {
      const next = !prev;
      if (!next && quotationSnapshot) {
        setCustomerOverrides({
          customerName: quotationSnapshot.customerName, customerEmail: quotationSnapshot.customerEmail,
          customerPhone: quotationSnapshot.customerPhone, customerAddress: quotationSnapshot.customerAddress,
          customerGstNumber: quotationSnapshot.customerGstNumber, destination: quotationSnapshot.destination,
        });
      }
      return next;
    });
  };

  const showOrgSettingsErrorToast = (message) => {
    if (/organization settings/i.test(message)) {
      toast.error((t) => (
        <div className="text-sm">
          <p className="mb-1.5">{message}</p>
          <a href="/settings" className="text-indigo-600 underline font-semibold" onClick={() => toast.dismiss(t.id)}>
            Open Organization Settings →
          </a>
        </div>
      ), { duration: 9000 });
    } else {
      toast.error(message);
    }
  };

  // Creates a new invoice from the selected quotation via
  // quotationAPI.convertToInvoice — pricing is never sent from the client,
  // only the fields the admin explicitly opted to override.
  const handleCreateFromQuotation = async () => {
    if (!formData.quotation) { toast.error('Please select a quotation'); return; }
    const overrides = {};
    if (formData.dueDate) overrides.dueDate = new Date(formData.dueDate).toISOString();
    if (formData.bookingId?.trim()) overrides.bookingId = formData.bookingId.trim();
    if (customerOverrideEnabled) {
      for (const field of ['customerName', 'customerEmail', 'customerPhone', 'customerAddress', 'customerGstNumber', 'destination']) {
        const value = customerOverrides[field]?.trim();
        if (value) overrides[field] = value;
      }
    }
    if (formData.paymentTerms?.trim()) overrides.paymentTerms = formData.paymentTerms.trim();
    if (formData.paymentInstructions?.trim()) overrides.paymentInstructions = formData.paymentInstructions.trim();

    try {
      setLoading(true);
      const response = await quotationAPI.convertToInvoice(formData.quotation, overrides);
      if (response.success || response.status === 'success') {
        const newId = response.data?._id || response.data?.id;
        toast.success('Invoice created from quotation');
        setCurrentInvoiceId(newId);
        setShowPDFPreview(true);
      } else {
        showOrgSettingsErrorToast(response.message || 'Failed to create invoice');
      }
    } catch (error) {
      showOrgSettingsErrorToast(error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (status = 'draft') => {
    const itemsToSubmit = isDetailedMode ? formData.items.filter(item => item.category !== 'package') : formData.items;
    if (!itemsToSubmit.some(item => item.description.trim())) { toast.error('Please add at least one item'); return; }
    const totals = calculateTotals();
    const payload = { ...formData, items: itemsToSubmit, ...totals, paidAmount: 0, outstandingAmount: totals.totalAmount, issueDate: new Date(formData.issueDate).toISOString(), dueDate: new Date(formData.dueDate).toISOString(), status: status === 'send' ? 'sent' : 'draft', paymentStatus: 'unpaid' };
    if (!payload.package) delete payload.package; if (!payload.quotation) delete payload.quotation; if (!payload.lead) delete payload.lead;
    try {
      setLoading(true); let response;
      if (isEditing && currentInvoice) { response = await invoiceAPI.update(currentInvoice._id || currentInvoice.id, payload); setCurrentInvoiceId(currentInvoice._id || currentInvoice.id); }
      else { response = await invoiceAPI.create(payload); if (response.success || response.status === 'success') setCurrentInvoiceId(response.data?._id || response.data?.id); }
      if (response.success || response.status === 'success') { toast.success(`Invoice ${isEditing ? 'updated' : 'created'}!`); if (currentInvoiceId || (response.data?._id || response.data?.id)) { setCurrentInvoiceId(currentInvoiceId || (response.data?._id || response.data?.id)); setShowPDFPreview(true); } else { onSuccess?.(); onClose(); } }
      else toast.error(response.message || 'Failed to save invoice');
    } catch (error) { toast.error(error.message || 'Failed to save invoice'); } finally { setLoading(false); }
  };

  const handlePrimarySubmit = () => { if (usingQuotationFlow) handleCreateFromQuotation(); else handleSubmit(); };

  const totals = calculateTotals();
  if (!isOpen) return null;
  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  const invoiceTypes = [
    { value: 'invoice', label: 'Standard', icon: '📄' },
    { value: 'proforma', label: 'Proforma', icon: '📋' },
    { value: 'tax-invoice', label: 'Tax Invoice', icon: '🧾' },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/70 via-purple-900/60 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4" onClick={handleBackdropClick}>
      <div className="bg-gradient-to-b from-white to-slate-50 rounded-none sm:rounded-3xl shadow-2xl w-full max-w-6xl h-full sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                <Receipt className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-white">{isEditing ? 'Edit Invoice' : 'New Invoice'}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-indigo-200 text-sm">{lead?.name || 'Customer'}</span>
                  {detectedPackageType && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">{detectedPackageType === 'customized' ? '✨ Custom' : detectedPackageType === 'manual' ? '📋 Manual' : '📦 Package'}</span>
                  )}
                  {usingQuotationFlow && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">From {quotationSnapshot.quotationNumber}</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><X className="w-6 h-6 text-white" /></button>
          </div>
        </div>

        {/* Main Content with Floating Summary */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Form Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Issue Date</p>
                <input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="w-full text-sm font-semibold text-gray-800 bg-transparent focus:outline-none" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Due Date</p>
                <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full text-sm font-semibold text-gray-800 bg-transparent focus:outline-none" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Booking Id</p>
                <input type="text" value={formData.bookingId} onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })} placeholder="Optional" className="w-full text-sm font-semibold text-gray-800 bg-transparent focus:outline-none placeholder:font-normal placeholder:text-gray-300" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Mode</p>
                <p className="text-sm font-semibold text-indigo-600">{getModeLabel(quotationMode)}</p>
              </div>
            </div>

            {/* Quotation Selector — only offered when creating a brand-new invoice */}
            {!isEditing && quotations.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <label className="text-sm font-semibold text-gray-700 mb-3 block">Select Quotation</label>
                <div className="flex gap-3">
                  <select value={formData.quotation} onChange={(e) => { setFormData({ ...formData, quotation: e.target.value }); if (e.target.value) loadQuotationData(e.target.value); else { setQuotationSnapshot(null); setQuotationMode('summary'); } }} className="flex-1 px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" disabled={loadingQuotations}>
                    <option value="">{loadingQuotations ? 'Loading...' : '— Select Quotation —'}</option>
                    {quotations.map(q => (<option key={q._id || q.id} value={q._id || q.id}>{q.packageTitle || 'Package'} — {q.quotationNumber || q._id}</option>))}
                  </select>
                  {formData.quotation && (<button type="button" onClick={() => handleDownloadQuotationPDF(formData.quotation)} className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><Download className="w-4 h-4 text-gray-600" /></button>)}
                </div>
              </div>
            )}

            {usingQuotationFlow ? (
              <>
                {/* Read-only totals, taken verbatim from the quotation — an
                    invoice never re-derives tax/discount, it just carries
                    what the quotation already agreed. */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-indigo-600" /></div>
                    <div>
                      <p className="font-semibold text-gray-900">Quotation Items & Total</p>
                      <p className="text-xs text-gray-500">Read-only — matches the quotation exactly</p>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-4 space-y-2">
                    {(quotationSnapshot.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700">{item.description}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.totalPrice || 0, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Details — read-only from the quotation snapshot
                    by default, with an explicit toggle to override for this
                    invoice only. */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button type="button" onClick={() => toggleSection('customer')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><User className="w-5 h-5 text-blue-600" /></div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Customer Details</p>
                        <p className="text-xs text-gray-500">{customerOverrideEnabled ? 'Overridden for this invoice' : 'From quotation'}</p>
                      </div>
                    </div>
                    {expandedSections.customer ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.customer && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                      <button type="button" onClick={toggleCustomerOverride} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mb-3">
                        {customerOverrideEnabled ? '↺ Use quotation details' : '✎ Override for this invoice'}
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          ['customerName', 'Name'], ['customerEmail', 'Email'], ['customerPhone', 'Phone'],
                          ['customerAddress', 'Address'], ['customerGstNumber', 'GST Number'], ['destination', 'Place of Supply'],
                        ].map(([field, label]) => (
                          <div key={field}>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{label}</label>
                            {customerOverrideEnabled ? (
                              <input type="text" value={customerOverrides[field]} onChange={(e) => setCustomerOverrides(prev => ({ ...prev, [field]: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" />
                            ) : (
                              <p className="px-3 py-2.5 text-sm text-gray-700 bg-gray-50 rounded-xl">{quotationSnapshot[field] || '—'}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Terms & Instructions — blank uses the org-level
                    default (resolved server-side); typing here overrides it
                    for this invoice only. */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button type="button" onClick={() => toggleSection('paymentTerms')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><ScrollText className="w-5 h-5 text-amber-600" /></div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Payment Terms & Instructions</p>
                        <p className="text-xs text-gray-500">{formData.paymentTerms || formData.paymentInstructions ? 'Overridden for this invoice' : 'Using organization default'}</p>
                      </div>
                    </div>
                    {expandedSections.paymentTerms ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.paymentTerms && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-2 block">Payment Terms (one bullet per line)</label>
                        <textarea value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} rows="4" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 border-0" placeholder="Leave blank to use the organization default" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-2 block">Payment Instructions (one bullet per line)</label>
                        <textarea value={formData.paymentInstructions} onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })} rows="4" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 border-0" placeholder="Leave blank to use the organization default" />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Items Section - Collapsible */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button type="button" onClick={() => toggleSection('items')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-indigo-600" /></div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Invoice Items</p>
                        <p className="text-xs text-gray-500">{formData.items.length} items</p>
                      </div>
                    </div>
                    {expandedSections.items ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.items && (
                    <div className="px-5 pb-5 border-t border-gray-100">
                      {!isDetailedMode ? (
                        <div className="mt-4 space-y-4">
                          {/* Package Price - Large Input */}
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                            <label className="text-sm font-semibold text-gray-700 mb-3 block">Package Total Amount</label>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getCurrencySymbol()}</span>
                              <input type="number" value={(() => { const pkg = formData.items.find(i => i.category === 'package'); return pkg ? (pkg.totalPrice || pkg.unitPrice || 0) : 0; })()} onChange={(e) => { const price = parseFloat(e.target.value) || 0; setFormData(prev => { const pkgIdx = prev.items.findIndex(i => i.category === 'package'); if (pkgIdx >= 0) { const items = [...prev.items]; items[pkgIdx] = { ...items[pkgIdx], totalPrice: price, unitPrice: price, quantity: 1 }; return { ...prev, items }; } else { return { ...prev, items: [{ description: 'Package Total', category: 'package', quantity: 1, unitPrice: price, totalPrice: price, notes: '' }, ...prev.items] }; } }); }} className="flex-1 text-3xl font-bold text-gray-900 bg-transparent border-0 focus:outline-none" placeholder="0.00" />
                            </div>
                          </div>
                          {/* Extra Items */}
                          {formData.items.filter(i => i.category !== 'package' && i.isManual).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-gray-600">Additional Items</p>
                              {formData.items.map((item, originalIndex) => {
                                if (item.category === 'package' || !item.isManual) return null;
                                return (
                                  <div key={originalIndex} className="flex gap-3 items-center">
                                    <input type="text" value={item.description || ''} onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)} placeholder="Description" className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 border-0" />
                                    <div className="flex items-center bg-gray-50 rounded-xl px-3"><span className="text-gray-400 text-sm">{getCurrencySymbol()}</span><input type="number" value={item.totalPrice || 0} onChange={(e) => { const val = parseFloat(e.target.value) || 0; const items = [...formData.items]; items[originalIndex] = { ...items[originalIndex], totalPrice: val, unitPrice: val, quantity: 1 }; setFormData({ ...formData, items }); }} className="w-24 py-3 bg-transparent text-right text-sm font-medium focus:outline-none" /></div>
                                    <button type="button" onClick={() => removeItem(originalIndex)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <button type="button" onClick={addItem} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"><Plus className="w-4 h-4" />Add Item</button>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {formData.items.filter(i => i.category !== 'package').map((item, idx) => {
                            const originalIndex = formData.items.indexOf(item);
                            return (
                              <div key={originalIndex} className="flex gap-3 items-center bg-gray-50 rounded-xl p-3">
                                <input type="text" value={item.description || ''} onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)} className="flex-1 px-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-indigo-500" placeholder="Item description" />
                                <div className="flex items-center bg-white rounded-lg px-3 border border-gray-200"><span className="text-gray-400 text-xs">{getCurrencySymbol()}</span><input type="number" value={item.totalPrice ?? 0} onChange={(e) => { const val = parseFloat(e.target.value) || 0; const items = [...formData.items]; items[originalIndex] = { ...items[originalIndex], totalPrice: val, unitPrice: val, quantity: 1 }; setFormData({ ...formData, items }); }} className="w-20 py-2 bg-transparent text-right text-sm focus:outline-none" /></div>
                                <button type="button" onClick={() => removeItem(originalIndex)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            );
                          })}
                          <button type="button" onClick={addItem} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"><Plus className="w-4 h-4" />Add Item</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Discount & Tax Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button type="button" onClick={() => toggleSection('discount')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Percent className="w-5 h-5 text-green-600" /></div>
                      <div className="text-left"><p className="font-semibold text-gray-900">Discount & Tax</p><p className="text-xs text-gray-500">{formData.taxRate > 0 ? `${formData.taxRate}% tax` : 'No tax'}{formData.discountType !== 'none' ? `, ${formData.discountValue}${formData.discountType === 'percentage' ? '%' : ' flat'} discount` : ''}</p></div>
                    </div>
                    {expandedSections.discount ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.discount && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-2 block">Tax Rate (%)</label>
                        <input type="number" value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-green-500 border-0" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-2 block">Discount Type</label>
                        <select value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value, discountValue: 0 })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-green-500 border-0">
                          <option value="none">None</option>
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed Amount</option>
                        </select>
                      </div>
                      {formData.discountType !== 'none' && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-2 block">Discount Value</label>
                          <input type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-green-500 border-0" placeholder="0" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Terms</label>
                    <textarea value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} rows="3" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 border-0" placeholder="Payment terms..." />
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="3" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 border-0" placeholder="Additional notes..." />
                  </div>
                </div>
              </>
            )}

            {/* Communication */}
            {currentInvoiceId && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Send Invoice</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="email" value={sendEmailAddress} onChange={(e) => setSendEmailAddress(e.target.value)} placeholder="customer@example.com" className="flex-1 px-4 py-3 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 border-0" />
                  <button type="button" onClick={handleSendInvoiceEmail} disabled={sendingEmail} className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm flex items-center gap-2"><Send className="w-4 h-4" />{sendingEmail ? '...' : 'Email'}</button>
                  <button type="button" onClick={() => handleSendWhatsApp(currentInvoiceId)} disabled={!lead?.whatsapp} className="px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50"><MessageCircle className="w-4 h-4" />WhatsApp</button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Desktop Summary Panel - hidden on mobile */}
          <div className="hidden md:flex md:flex-col md:w-80 bg-gradient-to-b from-gray-900 to-slate-900 text-white p-6 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Calculator className="w-5 h-5" /></div>
              <div>
                <p className="font-semibold">Invoice Summary</p>
                <p className="text-xs text-gray-400">{getModeLabel(quotationMode)} Mode</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal, { minimumFractionDigits: 2 })}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Discount</span>
                    <span className="text-green-400">-{formatCurrency(totals.discountAmount, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax {!usingQuotationFlow && `(${formData.taxRate}%)`}</span>
                    <span>{formatCurrency(totals.taxAmount, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {totals.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Service Charge</span>
                    <span>{formatCurrency(totals.serviceChargeAmount, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400">Total Amount</span>
                  <div className="text-right">
                    <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totals.totalAmount, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-500 mt-1">Due: {formatDateLabel(formData.dueDate)}</p>
                  </div>
                </div>
              </div>

              {/* Existing Invoices */}
              {existingInvoices.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-gray-400 mb-2">Previous Invoices</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {existingInvoices.slice(0, 5).map((inv, idx) => (
                      <div key={inv._id || inv.id} className={`p-2 rounded-lg text-xs cursor-pointer transition-colors ${currentInvoice?._id === inv._id ? 'bg-indigo-600' : 'bg-white/5 hover:bg-white/10'}`} onClick={() => { setCurrentInvoice(inv); setCurrentInvoiceId(inv._id || inv.id); setIsEditing(true); }}>
                        <p className="font-medium">{inv.invoiceNumber || `Invoice #${idx + 1}`}</p>
                        <p className="text-gray-500">{formatCurrency(inv.totalAmount || 0, { minimumFractionDigits: 2 })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-6 pt-4 border-t border-white/10">
              {currentInvoiceId && (
                <button onClick={() => handlePreviewPDF(currentInvoiceId)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-sm transition-colors">
                  <Eye className="w-4 h-4" />Preview PDF
                </button>
              )}
              <button onClick={handlePrimarySubmit} disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg">
                {loading ? 'Saving...' : isEditing ? 'Update Invoice' : 'Create Invoice'}
              </button>
              <button type="button" onClick={onClose} className="w-full px-4 py-3 text-gray-400 hover:text-white transition-colors text-sm">Cancel</button>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Summary Bar */}
        <div className="md:hidden bg-gradient-to-b from-gray-900 to-slate-900 text-white">
          {/* Expandable Summary Drawer */}
          {showMobileSummary && (
            <div className="px-4 pt-4 pb-2 space-y-3 max-h-[40vh] overflow-y-auto border-t border-white/10">
              {/* Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal, { minimumFractionDigits: 2 })}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Discount</span>
                    <span className="text-green-400">-{formatCurrency(totals.discountAmount, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax {!usingQuotationFlow && `(${formData.taxRate}%)`}</span>
                    <span>{formatCurrency(totals.taxAmount, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Due date & Mode */}
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-white/10">
                <span>Due: {formatDateLabel(formData.dueDate)}</span>
                <span className="text-indigo-400 font-medium">{getModeLabel(quotationMode)} Mode</span>
              </div>

              {/* Existing Invoices */}
              {existingInvoices.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Previous Invoices</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {existingInvoices.slice(0, 5).map((inv, idx) => (
                      <button key={inv._id || inv.id} className={`shrink-0 px-3 py-2 rounded-lg text-xs transition-colors ${currentInvoice?._id === inv._id ? 'bg-indigo-600' : 'bg-white/5 active:bg-white/10'}`} onClick={() => { setCurrentInvoice(inv); setCurrentInvoiceId(inv._id || inv.id); setIsEditing(true); setShowMobileSummary(false); }}>
                        <p className="font-medium">{inv.invoiceNumber || `#${idx + 1}`}</p>
                        <p className="text-gray-500">{formatCurrency(inv.totalAmount || 0, { minimumFractionDigits: 2 })}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview PDF */}
              {currentInvoiceId && (
                <button onClick={() => handlePreviewPDF(currentInvoiceId)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 active:bg-white/20 rounded-xl font-medium text-sm transition-colors">
                  <Eye className="w-4 h-4" />Preview PDF
                </button>
              )}
            </div>
          )}

          {/* Compact Bottom Bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
            <button type="button" onClick={() => setShowMobileSummary(!showMobileSummary)} className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                {showMobileSummary ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
                <p className="text-lg font-bold truncate">{formatCurrency(totals.totalAmount, { minimumFractionDigits: 2 })}</p>
              </div>
            </button>
            <button onClick={handlePrimarySubmit} disabled={loading} className="shrink-0 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 active:from-indigo-600 active:to-purple-700 rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-lg">
              <Save className="w-4 h-4" />
              {loading ? '...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>

      {showPDFPreview && currentInvoiceId && (
        <PDFPreviewDialog isOpen={showPDFPreview} onClose={() => { setShowPDFPreview(false); setCurrentInvoiceId(null); onSuccess?.(); onClose(); }} onBack={() => setShowPDFPreview(false)} pdfUrl={`/billing/invoices/${currentInvoiceId}/pdf`} documentName="Invoice" onDownload={true} documents={existingInvoices} currentIndex={existingInvoices.findIndex(inv => (inv._id || inv.id) === currentInvoiceId)} onNavigate={(index) => { if (existingInvoices[index]) setCurrentInvoiceId(existingInvoices[index]._id || existingInvoices[index].id); }} />
      )}
    </div>
  );
};

export default InvoiceDialog;
