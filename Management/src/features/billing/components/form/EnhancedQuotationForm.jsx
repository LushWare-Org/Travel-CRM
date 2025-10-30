import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, PackageOpen, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * EnhancedQuotationForm - Professional quotation builder with package integration
 * 
 * Features:
 * - Package selection with auto-population of pricing
 * - Service breakdown (Accommodation, Transportation, Activities, etc.)
 * - Dynamic pricing calculator
 * - Tax and discount management
 * - Professional terms and conditions
 * - Visual pricing summary
 */
const EnhancedQuotationForm = ({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel, 
  leads = [], 
  packages = [] 
}) => {
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [searchPackageTerm, setSearchPackageTerm] = useState('');
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newService, setNewService] = useState({
    category: 'accommodation',
    description: '',
    quantity: 1,
    unitPrice: 0,
    notes: '',
  });

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    if (!lead) return false;
    const name = (lead.name || '').toString().toLowerCase();
    const id = (lead.id || '').toString().toLowerCase();
    const email = (lead.email || '').toString().toLowerCase();
    const search = searchLeadTerm.toLowerCase();
    return name.includes(search) || id.includes(search) || email.includes(search);
  });

  // Filter packages
  const filteredPackages = packages.filter(pkg => {
    if (!pkg) return false;
    const name = (pkg.name || '').toString().toLowerCase();
    const dest = (pkg.destination || '').toString().toLowerCase();
    const search = searchPackageTerm.toLowerCase();
    return name.includes(search) || dest.includes(search);
  });

  // Handle lead selection
  const handleLeadSelect = (lead) => {
    setFormData({
      ...formData,
      leadId: lead.id,
      customerName: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      address: lead.address || '',
      gstNumber: lead.gstNumber || '',
    });
    setSearchLeadTerm(lead.name);
    setShowLeadDropdown(false);
  };

  // Handle package selection
  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setSearchPackageTerm(pkg.name);
    setShowPackageDropdown(false);

    // Pre-populate quotation with package details
    const packageItem = {
      description: `${pkg.name} - ${pkg.duration} Days`,
      category: 'package-base',
      quantity: 1,
      unitPrice: pkg.price,
      totalPrice: pkg.price,
      notes: `Duration: ${pkg.duration} days | Destination: ${pkg.destination}`,
    };

    setFormData(prev => ({
      ...prev,
      packageId: pkg.id,
      packageName: pkg.name,
      destination: pkg.destination,
      duration: pkg.duration,
      items: [packageItem, ...prev.items.filter(item => item.category !== 'package-base')],
    }));
  };

  // Add service/item
  const handleAddService = () => {
    if (!newService.description || newService.unitPrice <= 0) {
      alert('Please fill in description and unit price');
      return;
    }

    const totalPrice = newService.quantity * newService.unitPrice;
    const service = {
      ...newService,
      totalPrice,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, service],
    }));

    setNewService({
      category: 'accommodation',
      description: '',
      quantity: 1,
      unitPrice: 0,
      notes: '',
    });
    setShowServiceForm(false);
  };

  // Remove service
  const handleRemoveService = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Update service
  const handleUpdateService = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
    }));
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = (subtotal * formData.taxRate) / 100;
  const discountAmount = formData.discountType === 'percentage' 
    ? (subtotal * formData.discountValue) / 100
    : formData.discountValue;
  const serviceCharge = (subtotal * formData.serviceChargeRate) / 100;
  const total = subtotal - discountAmount + serviceCharge + taxAmount;

  // Update form data with calculated values
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      amount: subtotal,
      taxAmount,
      discountAmount,
      serviceChargeAmount: serviceCharge,
      total,
    }));
  }, [formData.items, formData.taxRate, formData.discountType, formData.discountValue, formData.serviceChargeRate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.leadId) {
      alert('Please select a lead');
      return;
    }
    if (formData.items.length === 0) {
      alert('Please add at least one service/item');
      return;
    }
    onSave();
  };

  const SERVICE_CATEGORIES = [
    { value: 'accommodation', label: '🏨 Accommodation' },
    { value: 'transportation', label: '🚗 Transportation' },
    { value: 'activity', label: '🎯 Activities' },
    { value: 'food', label: '🍽️ Food & Beverages' },
    { value: 'guide', label: '👨‍💼 Tour Guide' },
    { value: 'insurance', label: '🛡️ Insurance' },
    { value: 'visa', label: '📝 Visa' },
    { value: 'other', label: '📌 Other' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              {formData.id ? 'Edit Quotation' : 'Create New Quotation'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">Professional quotation with package integration</p>
          </div>
          <button onClick={onCancel} className="text-white hover:bg-blue-500 p-2 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Customer & Lead Selection */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">1</div>
              <h3 className="text-lg font-semibold text-gray-900">Customer & Lead Information</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Lead Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Lead <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchLeadTerm}
                    onChange={(e) => {
                      setSearchLeadTerm(e.target.value);
                      setShowLeadDropdown(true);
                    }}
                    onFocus={() => setShowLeadDropdown(true)}
                    placeholder="Search by name, ID, or email..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {showLeadDropdown && filteredLeads.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => handleLeadSelect(lead)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{lead.name}</p>
                            <p className="text-sm text-gray-500">{lead.email}</p>
                          </div>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{lead.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Lead Info */}
              {formData.leadId && (
                <div className="bg-white border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{formData.customerName}</p>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-gray-600">Email</p>
                          <p className="text-gray-900 font-medium">{formData.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Phone</p>
                          <p className="text-gray-900 font-medium">{formData.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Lead ID</p>
                          <p className="text-gray-900 font-medium">{formData.leadId}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Package Selection */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">2</div>
              <h3 className="text-lg font-semibold text-gray-900">Select Travel Package</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Optional but recommended</span>
            </div>

            {/* Package Search */}
            <div className="relative mb-4">
              <div className="relative">
                <PackageOpen className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchPackageTerm}
                  onChange={(e) => {
                    setSearchPackageTerm(e.target.value);
                    setShowPackageDropdown(true);
                  }}
                  onFocus={() => setShowPackageDropdown(true)}
                  placeholder="Search packages by name or destination..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {showPackageDropdown && filteredPackages.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                  {filteredPackages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handlePackageSelect(pkg)}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{pkg.name}</p>
                          <p className="text-sm text-gray-600">{pkg.destination} • {pkg.duration} days</p>
                          <p className="text-xs text-gray-500 mt-1">{pkg.description?.substring(0, 60)}...</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${pkg.price?.toLocaleString() || '0'}</p>
                          <p className="text-xs text-gray-500">Base Price</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Package Info */}
            {selectedPackage && (
              <div className="bg-white border border-green-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedPackage.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedPackage.destination} • {selectedPackage.duration} days</p>
                    <div className="mt-2 text-sm text-gray-600">
                      {selectedPackage.description?.substring(0, 100)}...
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${selectedPackage.price?.toLocaleString() || '0'}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackage(null);
                        setSearchPackageTerm('');
                      }}
                      className="text-sm text-red-600 hover:text-red-700 mt-2"
                    >
                      Change Package
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Services & Items */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">3</div>
                <h3 className="text-lg font-semibold text-gray-900">Services & Add-ons</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceForm(!showServiceForm)}
                className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>

            {/* Add Service Form */}
            {showServiceForm && (
              <div className="bg-white border-2 border-purple-300 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-4">Add New Service</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newService.category}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {SERVICE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={newService.quantity}
                      onChange={(e) => setNewService({ ...newService, quantity: parseFloat(e.target.value) || 1 })}
                      min="1"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      placeholder="e.g., 5-star hotel accommodation, Flight tickets"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      value={newService.unitPrice}
                      onChange={(e) => setNewService({ ...newService, unitPrice: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                    <input
                      type="text"
                      value={`$${(newService.quantity * newService.unitPrice).toFixed(2)}`}
                      disabled
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-semibold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={newService.notes}
                      onChange={(e) => setNewService({ ...newService, notes: e.target.value })}
                      placeholder="Add any additional details..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    Add Service
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Services List */}
            <div className="space-y-3">
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No services added yet. Select a package or add services manually.</p>
                </div>
              ) : (
                formData.items.map((item, idx) => (
                  <div key={`item-${idx}-${item.description}-${item.unitPrice}`} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="text-xs text-gray-600">Category</p>
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdateService(idx, 'category', e.target.value)}
                          className="mt-1 block w-full text-sm px-2 py-1 border border-gray-300 rounded"
                        >
                          {SERVICE_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Description</p>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateService(idx, 'description', e.target.value)}
                          className="mt-1 block w-full text-sm px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Qty</p>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateService(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          min="1"
                          className="mt-1 block w-full text-sm px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Unit Price</p>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateService(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="mt-1 block w-full text-sm px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Total</p>
                          <p className="mt-1 text-sm font-bold text-purple-600">${item.totalPrice.toFixed(2)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveService(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-600 mt-2 italic">{item.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Pricing Breakdown
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {/* Discount */}
              {formData.discountValue > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount ({formData.discountType === 'percentage' ? `${formData.discountValue}%` : 'Fixed'}):</span>
                  <span className="font-medium text-red-600">-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Service Charge */}
              {formData.serviceChargeRate > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Service Charge ({formData.serviceChargeRate}%):</span>
                  <span className="font-medium">+${serviceCharge.toFixed(2)}</span>
                </div>
              )}

              {/* Tax */}
              {formData.taxRate > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax ({formData.taxRate}%):</span>
                  <span className="font-medium">+${taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t-2 border-blue-300 pt-3">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold">4</div>
              <h3 className="text-lg font-semibold text-gray-900">Pricing Settings</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="0.01"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="none">None</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              {formData.discountType !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount {formData.discountType === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Charge (%)</label>
                <input
                  type="number"
                  value={formData.serviceChargeRate}
                  onChange={(e) => setFormData({ ...formData, serviceChargeRate: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="net-30">Net 30 Days</option>
                <option value="net-15">Net 15 Days</option>
                <option value="due-on-receipt">Due on Receipt</option>
                <option value="deposit-60-balance">50% Deposit, 50% Before Travel</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quotation Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft (Not Sent)</option>
                <option value="sent">Sent to Customer</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows="4"
                placeholder="Include any specific terms, cancellation policy, or special conditions..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                placeholder="Internal notes not visible to customer..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition shadow-lg"
            >
              {formData.id ? 'Update Quotation' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedQuotationForm;
