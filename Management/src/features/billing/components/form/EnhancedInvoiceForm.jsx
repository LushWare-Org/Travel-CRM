import React, { useState } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { PAYMENT_METHODS } from '../../types';

const EnhancedInvoiceForm = ({ formData, setFormData, onSave, onCancel, leads = [], quotations = [] }) => {
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [availableQuotations, setAvailableQuotations] = useState([]);

  const filteredLeads = leads.filter(lead => {
    if (!lead) return false;
    const name = (lead.name || '').toString().toLowerCase();
    const id = (lead.id || '').toString().toLowerCase();
    const email = (lead.email || '').toString().toLowerCase();
    const search = searchLeadTerm.toLowerCase();
    
    return name.includes(search) || id.includes(search) || email.includes(search);
  });

  const handleLeadSelect = (lead) => {
    // Filter quotations for this lead
    const leadQuotations = quotations.filter(q => q.leadId === lead.id && q.status === 'accepted');
    setAvailableQuotations(leadQuotations);
    
    setFormData({
      ...formData,
      leadId: lead.id,
      customerName: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      quotationId: '',
    });
    setSearchLeadTerm(lead.name);
    setShowLeadDropdown(false);
  };

  const handleQuotationSelect = (e) => {
    const quotationId = e.target.value;
    if (quotationId) {
      const quotation = quotations.find(q => q.id === quotationId);
      if (quotation) {
        setFormData({
          ...formData,
          quotationId: quotationId,
          packageName: quotation.packageName,
          items: quotation.items,
          amount: quotation.amount,
          tax: quotation.tax,
          discount: quotation.discount,
          total: quotation.total,
        });
      }
    } else {
      setFormData({ ...formData, quotationId: '' });
    }
  };

  const addItem = () => {
    const newItem = {
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.tax, formData.discount);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.tax, formData.discount);
  };

  const calculateTotals = (items, tax, discount) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * tax) / 100;
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal + taxAmount - discountAmount;
    
    setFormData(prev => ({
      ...prev,
      amount: subtotal,
      total: total,
    }));
  };

  const handleTaxChange = (value) => {
    const taxPercent = parseFloat(value) || 0;
    setFormData({ ...formData, tax: taxPercent });
    calculateTotals(formData.items, taxPercent, formData.discount);
  };

  const handleDiscountChange = (value) => {
    const discountPercent = parseFloat(value) || 0;
    setFormData({ ...formData, discount: discountPercent });
    calculateTotals(formData.items, formData.tax, discountPercent);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {formData.id ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Lead Selection */}
          <div className="grid grid-cols-1 gap-6 bg-green-50 p-4 rounded-lg">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Lead <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchLeadTerm}
                  onChange={(e) => {
                    setSearchLeadTerm(e.target.value);
                    setShowLeadDropdown(true);
                  }}
                  onFocus={() => setShowLeadDropdown(true)}
                  placeholder="Search by name, ID, or email..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              {showLeadDropdown && filteredLeads.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto border border-gray-200">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleLeadSelect(lead)}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-green-50"
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{lead.name}</span>
                        <span className="ml-2 text-sm text-gray-500">({lead.id})</span>
                      </div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formData.leadId && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead ID</label>
                  <input
                    type="text"
                    value={formData.leadId}
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            )}

            {/* Quotation Selection (Optional) */}
            {formData.leadId && availableQuotations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Quotation (Optional)
                </label>
                <select
                  value={formData.quotationId}
                  onChange={handleQuotationSelect}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Create invoice from scratch</option>
                  {availableQuotations.map((quotation) => (
                    <option key={quotation.id} value={quotation.id}>
                      {quotation.id} - {quotation.packageName} - ${quotation.total.toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select an accepted quotation to auto-fill invoice details
                </p>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.packageName}
                onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Line Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-5">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="1"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate ($)</label>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="text"
                      value={`$${item.amount.toFixed(2)}`}
                      disabled
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 max-w-md ml-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
                <input
                  type="text"
                  value={`$${formData.amount.toFixed(2)}`}
                  disabled
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax (%)</label>
                <input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => handleTaxChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                <input
                  type="text"
                  value={`$${formData.total.toFixed(2)}`}
                  disabled
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-bold text-lg"
                />
              </div>
            </div>
          </div>

          {/* Status and Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {(formData.status === 'paid' || formData.status === 'partial') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.paidAmount || 0}
                  onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              placeholder="Additional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              {formData.id ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedInvoiceForm;
