import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Send, Calculator, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoiceAPI, quotationAPI, packageAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';

const InvoiceDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    lead: lead?._id || lead?.id,
    quotation: '',
    package: '',
    type: 'invoice',
    items: [
      {
        description: '',
        category: 'other',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        taxRate: 0,
        notes: '',
      },
    ],
    taxRate: 0,
    discountType: 'none',
    discountValue: 0,
    serviceChargeRate: 0,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
    paymentTerms: '',
    paymentInstructions: '',
  });

  useEffect(() => {
    if (isOpen && lead) {
      // Reset form with lead data
      setFormData(prev => ({
        ...prev,
        lead: lead._id || lead.id,
        package: lead.package?._id || lead.package || '',
      }));
      
      // Fetch quotations and packages
      fetchQuotations();
      fetchPackages();
      // Fetch existing invoices for this lead
      fetchExistingInvoices();
    }
  }, [isOpen, lead]);

  const fetchQuotations = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingQuotations(true);
      const response = await quotationAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const quotesData = response.data?.quotations || response.data || [];
        const filteredQuotes = quotesData.filter(q => q.status !== 'converted');
        setQuotations(filteredQuotes);
        
        // If form has a quotation selected, reload the latest quotation data
        if (formData.quotation) {
          const selectedQuote = filteredQuotes.find(q => 
            (q._id || q.id) === formData.quotation
          );
          if (selectedQuote) {
            // Reload quotation data to get latest updates
            loadQuotationData(formData.quotation);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoadingQuotations(false);
    }
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

  const fetchExistingInvoices = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingExisting(true);
      const response = await invoiceAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const invoicesData = response.data?.invoices || response.data?.data || response.data || [];
        const invoicesArray = Array.isArray(invoicesData) ? invoicesData : [];
        setExistingInvoices(invoicesArray);
        
        // Load the most recent invoice into form for editing
        if (invoicesArray.length > 0) {
          const latestInvoice = invoicesArray[0]; // Most recent first
          setCurrentInvoice(latestInvoice);
          setIsEditing(true);
          
          // Populate form with existing invoice data
          setFormData({
            lead: lead._id || lead.id,
            quotation: latestInvoice.quotation?._id || latestInvoice.quotation || '',
            package: latestInvoice.package?._id || latestInvoice.package || '',
            type: latestInvoice.type || 'invoice',
            items: latestInvoice.items?.length > 0 ? latestInvoice.items.map(item => ({
              description: item.description || '',
              category: item.category || 'other',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
              taxRate: item.taxRate || 0,
              notes: item.notes || '',
            })) : [{
              description: '',
              category: 'other',
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0,
              taxRate: 0,
              notes: '',
            }],
            taxRate: latestInvoice.taxRate || 0,
            discountType: latestInvoice.discountType || 'none',
            discountValue: latestInvoice.discountValue || 0,
            serviceChargeRate: latestInvoice.serviceChargeRate || 0,
            issueDate: latestInvoice.issueDate ? new Date(latestInvoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            dueDate: latestInvoice.dueDate ? new Date(latestInvoice.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: latestInvoice.notes || '',
            terms: latestInvoice.terms || '',
            paymentTerms: latestInvoice.paymentTerms || '',
            paymentInstructions: latestInvoice.paymentInstructions || '',
          });
          
          setCurrentInvoiceId(latestInvoice._id || latestInvoice.id);
          
          // If invoice has a quotation, load the latest quotation data
          if (latestInvoice.quotation) {
            const quotationId = latestInvoice.quotation._id || latestInvoice.quotation;
            loadQuotationData(quotationId);
          }
        } else {
          setIsEditing(false);
          setCurrentInvoice(null);
        }
      }
    } catch (error) {
      console.error('Error fetching existing invoices:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handlePreviewPDF = (invoiceId) => {
    setCurrentInvoiceId(invoiceId);
    setShowPDFPreview(true);
  };

  const loadQuotationData = async (quotationId) => {
    if (!quotationId) return;
    
    try {
      // Always fetch fresh quotation data from API to get latest updates
      const response = await quotationAPI.getById(quotationId);

      if (response.success || response.status === 'success' || response.data) {
        const quote = response.data || response;
        
        // Update form with latest quotation data
        setFormData(prev => ({
          ...prev,
          quotation: quotationId, // Ensure quotation ID is set
          items: quote.items?.length > 0 ? quote.items.map(item => ({
            description: item.description || '',
            category: item.category || 'other',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            taxRate: item.taxRate || 0,
            notes: item.notes || '',
          })) : prev.items,
          taxRate: quote.taxRate !== undefined ? quote.taxRate : prev.taxRate,
          discountType: quote.discountType || prev.discountType,
          discountValue: quote.discountValue !== undefined ? quote.discountValue : prev.discountValue,
          serviceChargeRate: quote.serviceChargeRate !== undefined ? quote.serviceChargeRate : prev.serviceChargeRate,
          notes: quote.notes !== undefined ? quote.notes : prev.notes,
          terms: quote.terms !== undefined ? quote.terms : prev.terms,
          paymentTerms: quote.paymentTerms !== undefined ? quote.paymentTerms : prev.paymentTerms,
        }));
        
        toast.success('Quotation data refreshed successfully');
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      toast.error('Failed to load quotation data');
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
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: '',
          category: 'other',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          taxRate: 0,
          notes: '',
        },
      ],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    } else {
      toast.error('At least one item is required');
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    let discountAmount = 0;
    if (formData.discountType === 'percentage') {
      discountAmount = (subtotal * (formData.discountValue || 0)) / 100;
    } else if (formData.discountType === 'fixed') {
      discountAmount = formData.discountValue || 0;
    }
    
    const serviceChargeAmount = (subtotal * (formData.serviceChargeRate || 0)) / 100;
    const taxableAmount = subtotal - discountAmount + serviceChargeAmount;
    const taxAmount = (taxableAmount * (formData.taxRate || 0)) / 100;
    const totalAmount = taxableAmount + taxAmount;
    
    return { subtotal, discountAmount, serviceChargeAmount, taxAmount, totalAmount };
  };

  const handleSubmit = async (status = 'draft') => {
    if (!formData.items.some(item => item.description.trim())) {
      toast.error('Please add at least one item with description');
      return;
    }

    const totals = calculateTotals();
    
    const payload = {
      ...formData,
      ...totals,
      paidAmount: 0,
      outstandingAmount: totals.totalAmount,
      issueDate: new Date(formData.issueDate).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
      status: status === 'send' ? 'sent' : 'draft',
      paymentStatus: 'unpaid',
    };

    try {
      setLoading(true);
      let response;
      
      // Update existing invoice if editing, otherwise create new
      if (isEditing && currentInvoice) {
        const invoiceId = currentInvoice._id || currentInvoice.id;
        response = await invoiceAPI.update(invoiceId, payload);
        setCurrentInvoiceId(invoiceId);
      } else {
        response = await invoiceAPI.create(payload);
        if (response.success || response.status === 'success') {
          const invoiceId = response.data?._id || response.data?.id;
          setCurrentInvoiceId(invoiceId);
        }
      }
      
      if (response.success || response.status === 'success') {
        toast.success(`Invoice ${isEditing ? 'updated' : 'created'} successfully!`);
        
        // Show PDF preview after successful save
        if (currentInvoiceId || (response.data?._id || response.data?.id)) {
          const idToPreview = currentInvoiceId || (response.data?._id || response.data?.id);
          setCurrentInvoiceId(idToPreview);
          setShowPDFPreview(true);
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        toast.error(response.message || `Failed to ${isEditing ? 'update' : 'create'} invoice`);
      }
    } catch (error) {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} invoice`);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <p className="text-purple-100 text-sm mt-1">
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
            {/* Quotation Selection */}
            {quotations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Convert from Quotation (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={formData.quotation}
                    onChange={(e) => {
                      setFormData({ ...formData, quotation: e.target.value });
                      if (e.target.value) {
                        loadQuotationData(e.target.value);
                      } else {
                        // Reset items if no quotation selected
                        setFormData(prev => ({
                          ...prev,
                          quotation: '',
                          items: [{
                            description: '',
                            category: 'other',
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                            taxRate: 0,
                            notes: '',
                          }],
                        }));
                      }
                    }}
                    disabled={loadingQuotations}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{loadingQuotations ? 'Loading...' : 'No Quotation'}</option>
                    {quotations.map((quote) => (
                      <option key={quote._id || quote.id} value={quote._id || quote.id}>
                        {quote.quotationNumber || quote._id} - {quote.totalAmount?.toFixed(2) || '0.00'}
                      </option>
                    ))}
                  </select>
                  {formData.quotation && (
                    <button
                      type="button"
                      onClick={() => {
                        // Refresh quotation data to get latest updates
                        loadQuotationData(formData.quotation);
                      }}
                      className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      title="Refresh Quotation Data"
                    >
                      🔄
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Type and Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="invoice">Invoice</option>
                  <option value="proforma">Proforma Invoice</option>
                  <option value="tax-invoice">Tax Invoice</option>
                  <option value="commercial-invoice">Commercial Invoice</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Items</h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Unit Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Item description"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="accommodation">Accommodation</option>
                            <option value="transportation">Transportation</option>
                            <option value="activity">Activity</option>
                            <option value="food">Food</option>
                            <option value="guide">Guide</option>
                            <option value="insurance">Insurance</option>
                            <option value="visa">Visa</option>
                            <option value="other">Other</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            min="1"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium">
                            {item.totalPrice.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                            disabled={formData.items.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value, discountValue: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Charge Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.serviceChargeRate}
                    onChange={(e) => setFormData({ ...formData, serviceChargeRate: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
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
                {totals.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Charge:</span>
                    <span className="font-medium">{totals.serviceChargeAmount.toFixed(2)}</span>
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
                  <span className="text-purple-600">{totals.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 pt-2 border-t">
                  <span>Outstanding:</span>
                  <span className="font-medium">{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <textarea
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Payment terms..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Instructions
                </label>
                <textarea
                  value={formData.paymentInstructions}
                  onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Bank details, payment methods..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            {currentInvoiceId && (
              <button
                onClick={() => handlePreviewPDF(currentInvoiceId)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors font-medium"
                title="Preview/Download Invoice PDF"
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
              onClick={() => handleSubmit('send')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Invoice' : 'Save & Send Invoice'}
            </button>
          </div>
        </div>

        {/* PDF Preview Dialog */}
        {showPDFPreview && currentInvoiceId && (
          <PDFPreviewDialog
            isOpen={showPDFPreview}
            onClose={() => {
              setShowPDFPreview(false);
              setCurrentInvoiceId(null);
              onSuccess?.();
              onClose();
            }}
            onBack={() => {
              setShowPDFPreview(false);
              // Keep the form dialog open, just close PDF preview
            }}
            pdfUrl={`/billing/invoices/${currentInvoiceId}/pdf`}
            documentName="Invoice"
            onDownload={true}
            documents={existingInvoices}
            currentIndex={existingInvoices.findIndex(inv => 
              (inv._id || inv.id) === currentInvoiceId
            )}
            onNavigate={(index) => {
              if (existingInvoices[index]) {
                const invoiceId = existingInvoices[index]._id || existingInvoices[index].id;
                setCurrentInvoiceId(invoiceId);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default InvoiceDialog;

