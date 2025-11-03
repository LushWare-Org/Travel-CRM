import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Send, Calculator, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotationAPI, packageAPI } from '../../../services/api';
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
  
  const [formData, setFormData] = useState({
    lead: lead?._id || lead?.id,
    package: '',
    type: 'standard',
    items: [
      {
        description: '',
        category: 'other',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        notes: '',
      },
    ],
    taxRate: 0,
    discountType: 'none',
    discountValue: 0,
    serviceChargeRate: 0,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
    paymentTerms: '',
    includedServices: [],
    excludedServices: [],
  });

  useEffect(() => {
    if (isOpen && lead) {
      // Reset form with lead data
      const leadPackageId = lead.package?._id || lead.package || '';
      setFormData(prev => ({
        ...prev,
        lead: lead._id || lead.id,
        package: leadPackageId,
      }));
      
      // Fetch packages
      fetchPackages();
      // Fetch existing quotations for this lead
      fetchExistingQuotations();
      
      // If lead has a package but no quotation exists yet, load package data
      if (leadPackageId && existingQuotations.length === 0) {
        // Wait a bit for packages to load, then add package price
        setTimeout(() => {
          loadPackageData(leadPackageId);
        }, 500);
      }
    }
  }, [isOpen, lead]);

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

  const fetchExistingQuotations = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingExisting(true);
      const response = await quotationAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const quotesData = response.data?.quotations || response.data?.data || response.data || [];
        const quotesArray = Array.isArray(quotesData) ? quotesData : [];
        setExistingQuotations(quotesArray);
        
        // Load the most recent quotation into form for editing
        if (quotesArray.length > 0) {
          const latestQuote = quotesArray[0]; // Most recent first
          setCurrentQuotation(latestQuote);
          setIsEditing(true);
          
          // Populate form with existing quotation data
          setFormData({
            lead: lead._id || lead.id,
            package: latestQuote.package?._id || latestQuote.package || '',
            type: latestQuote.type || 'standard',
            items: latestQuote.items?.length > 0 ? latestQuote.items.map(item => ({
              description: item.description || '',
              category: item.category || 'other',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
              notes: item.notes || '',
            })) : [{
              description: '',
              category: 'other',
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0,
              notes: '',
            }],
            taxRate: latestQuote.taxRate || 0,
            discountType: latestQuote.discountType || 'none',
            discountValue: latestQuote.discountValue || 0,
            serviceChargeRate: latestQuote.serviceChargeRate || 0,
            validUntil: latestQuote.validUntil ? new Date(latestQuote.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: latestQuote.notes || '',
            terms: latestQuote.terms || '',
            paymentTerms: latestQuote.paymentTerms || '',
            includedServices: latestQuote.includedServices || [],
            excludedServices: latestQuote.excludedServices || [],
          });
          
          setCurrentQuotationId(latestQuote._id || latestQuote.id);
          
          // If quotation has a package, ensure package price is in items
          if (latestQuote.package) {
            const packageId = latestQuote.package._id || latestQuote.package;
            // Check if package item already exists in items
            const hasPackageItem = latestQuote.items?.some(item => 
              item.category === 'package' || 
              item.description?.toLowerCase().includes('package')
            );
            
            // If no package item exists, load package data to add it
            if (!hasPackageItem) {
              setTimeout(() => loadPackageData(packageId), 100);
            }
          }
        } else {
          setIsEditing(false);
          setCurrentQuotation(null);
        }
      }
    } catch (error) {
      console.error('Error fetching existing quotations:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handlePreviewPDF = (quotationId) => {
    setCurrentQuotationId(quotationId);
    setShowPDFPreview(true);
  };

  const loadPackageData = async (packageId) => {
    if (!packageId) return;
    
    try {
      // Fetch package details
      const response = await packageAPI.getById(packageId);
      
      if (response.success || response.status === 'success' || response.data) {
        const pkg = response.data || response;
        
        // If package has a price, add it as an item
        if (pkg.price && pkg.price > 0) {
          // Check if package item already exists
          const existingPackageItem = formData.items.find(item => 
            item.description?.toLowerCase().includes(pkg.name?.toLowerCase()) ||
            item.category === 'package'
          );
          
          if (existingPackageItem) {
            // Update existing package item
            const updatedItems = formData.items.map(item => {
              if (item.description?.toLowerCase().includes(pkg.name?.toLowerCase()) ||
                  item.category === 'package') {
                const newTotalPrice = pkg.price * (item.quantity || 1);
                return {
                  ...item,
                  description: `${pkg.name} Package`,
                  unitPrice: pkg.price,
                  quantity: item.quantity || 1,
                  totalPrice: newTotalPrice, // Ensure totalPrice is calculated
                  category: 'package',
                };
              }
              return item;
            });
            
            // Calculate new subtotal (including package price)
            const newSubtotal = updatedItems.reduce((sum, item) => {
              const itemTotal = item.totalPrice || (item.quantity || 0) * (item.unitPrice || 0);
              return sum + itemTotal;
            }, 0);
            
            setFormData(prev => ({
              ...prev,
              items: updatedItems,
            }));
            toast.success(`Package price updated. Subtotal: ${newSubtotal.toFixed(2)}`);
          } else {
            // Add new package item at the beginning of the items list
            const packageItem = {
              description: `${pkg.name} Package`,
              category: 'package',
              quantity: 1,
              unitPrice: pkg.price,
              totalPrice: pkg.price * 1, // Ensure totalPrice is calculated (quantity * unitPrice)
              notes: pkg.description ? pkg.description.substring(0, 100) : '',
            };
            
            setFormData(prev => ({
              ...prev,
              items: [packageItem, ...prev.items], // Add package item at the top
            }));
            
            // Calculate and show updated subtotal (including package price)
            const newItems = [packageItem, ...prev.items];
            const newSubtotal = newItems.reduce((sum, item) => {
              const itemTotal = item.totalPrice !== undefined && item.totalPrice !== null
                ? item.totalPrice
                : (item.quantity || 0) * (item.unitPrice || 0);
              return sum + itemTotal;
            }, 0);
            toast.success(`Package price (${pkg.price.toFixed(2)}) added to items. Subtotal: ${newSubtotal.toFixed(2)}`);
          }
        } else {
          toast.info('This package has no price set');
        }
      }
    } catch (error) {
      console.error('Error loading package:', error);
      toast.error('Failed to load package data');
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
    // Calculate subtotal from all items (including package items)
    // Use totalPrice if available, otherwise calculate from quantity * unitPrice
    const subtotal = formData.items.reduce((sum, item) => {
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
    
    const serviceChargeAmount = (subtotal * (formData.serviceChargeRate || 0)) / 100;
    const taxableAmount = subtotal - discountAmount + serviceChargeAmount;
    const taxAmount = (taxableAmount * (formData.taxRate || 0)) / 100;
    const totalAmount = taxableAmount + taxAmount;
    
    return { subtotal, discountAmount, serviceChargeAmount, taxAmount, totalAmount };
  };

  const handleSubmit = async (status = 'send') => {
    if (!formData.items.some(item => item.description.trim())) {
      toast.error('Please add at least one item with description');
      return;
    }

    const totals = calculateTotals();
    
    const payload = {
      ...formData,
      ...totals,
      validUntil: new Date(formData.validUntil).toISOString(),
      status: status === 'send' ? 'sent' : 'draft',
    };

    try {
      setLoading(true);
      let response;
      
      // Update existing quotation if editing, otherwise create new
      if (isEditing && currentQuotation) {
        const quotationId = currentQuotation._id || currentQuotation.id;
        response = await quotationAPI.update(quotationId, payload);
        setCurrentQuotationId(quotationId);
      } else {
        response = await quotationAPI.create(payload);
        if (response.success || response.status === 'success') {
          const quotationId = response.data?._id || response.data?.id;
          setCurrentQuotationId(quotationId);
        }
      }
      
      if (response.success || response.status === 'success') {
        toast.success(`Quotation ${isEditing ? 'updated' : 'created'} successfully!`);
        
        // Show PDF preview after successful save
        if (currentQuotationId || (response.data?._id || response.data?.id)) {
          const idToPreview = currentQuotationId || (response.data?._id || response.data?.id);
          setCurrentQuotationId(idToPreview);
          setShowPDFPreview(true);
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        toast.error(response.message || `Failed to ${isEditing ? 'update' : 'create'} quotation`);
      }
    } catch (error) {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} quotation`);
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
            {/* Package Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package (Optional)
                </label>
                <select
                  value={formData.package}
                  onChange={(e) => {
                    const packageId = e.target.value;
                    setFormData({ ...formData, package: packageId });
                    if (packageId) {
                      loadPackageData(packageId);
                    } else {
                      // Remove package item when package is deselected
                      setFormData(prev => ({
                        ...prev,
                        items: prev.items.filter(item => item.category !== 'package'),
                      }));
                    }
                  }}
                  disabled={loadingPackages}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{loadingPackages ? 'Loading...' : 'No Package'}</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id || pkg.id} value={pkg._id || pkg.id}>
                      {pkg.name} {pkg.price ? `(${pkg.price.toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
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
                <h3 className="text-lg font-semibold text-gray-800">Items</h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
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
              onClick={() => handleSubmit('send')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Quotation' : 'Save & Send Quotation'}
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

