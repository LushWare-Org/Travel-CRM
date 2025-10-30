import React, { useState, useEffect } from 'react';
import { X, Search, AlertCircle } from 'lucide-react';
import { PAYMENT_METHODS } from '../../types';

const PaymentReceiptForm = ({ formData, setFormData, onSave, onCancel, leads = [], invoices = [] }) => {
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const filteredLeads = leads.filter(lead => {
    if (!lead) return false;
    const name = (lead.name || '').toString().toLowerCase();
    const id = (lead.id || '').toString().toLowerCase();
    const email = (lead.email || '').toString().toLowerCase();
    const search = searchLeadTerm.toLowerCase();
    
    return name.includes(search) || id.includes(search) || email.includes(search);
  });

  useEffect(() => {
    if (formData.leadId) {
      const leadInvoices = invoices.filter(inv => inv.leadId === formData.leadId);
      setAvailableInvoices(leadInvoices);
    }
  }, [formData.leadId, invoices]);

  useEffect(() => {
    if (formData.invoiceId) {
      const invoice = invoices.find(inv => inv.id === formData.invoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
        
        // Calculate previous payments
        const previousPayments = invoices
          .filter(inv => inv.id === formData.invoiceId)
          .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        
        // Calculate remaining balance
        const remainingBalance = invoice.total - previousPayments - (parseFloat(formData.amount) || 0);
        
        // Determine status based on payment amount
        let status = 'paid-in-advance';
        if (remainingBalance <= 0) {
          status = 'paid-in-full';
        }
        
        setFormData(prev => ({
          ...prev,
          invoiceTotal: invoice.total,
          previousPayments: previousPayments,
          remainingBalance: Math.max(0, remainingBalance),
          status: status,
        }));
      }
    }
  }, [formData.invoiceId, formData.amount]);

  const handleLeadSelect = (lead) => {
    setFormData({
      ...formData,
      leadId: lead.id,
      customerName: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      invoiceId: '',
    });
    setSearchLeadTerm(lead.name);
    setShowLeadDropdown(false);
    setSelectedInvoice(null);
  };

  const handleInvoiceSelect = (e) => {
    const invoiceId = e.target.value;
    setFormData({ ...formData, invoiceId });
  };

  const handleAmountChange = (value) => {
    const amount = parseFloat(value) || 0;
    setFormData({ ...formData, amount });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  const generateTransactionId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TXN-${timestamp}-${random}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {formData.id ? 'Edit Payment Receipt' : 'New Payment Receipt'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Lead Selection */}
          <div className="bg-purple-50 p-4 rounded-lg space-y-4">
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              
              {showLeadDropdown && filteredLeads.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto border border-gray-200">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleLeadSelect(lead)}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-purple-50"
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
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invoice Selection */}
          {formData.leadId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Invoice <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.invoiceId}
                onChange={handleInvoiceSelect}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Select an invoice...</option>
                {availableInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.id} - {invoice.packageName} - ${invoice.total.toFixed(2)}
                    {invoice.status === 'paid' ? ' (Paid)' : invoice.status === 'partial' ? ' (Partial)' : ' (Unpaid)'}
                  </option>
                ))}
              </select>
              {availableInvoices.length === 0 && (
                <p className="mt-1 text-sm text-amber-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  No invoices found for this lead. Please create an invoice first.
                </p>
              )}
            </div>
          )}

          {/* Invoice Summary */}
          {selectedInvoice && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h3 className="font-medium text-gray-900">Invoice Details</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Invoice Total:</span>
                  <p className="font-semibold text-gray-900">${selectedInvoice.total.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Previous Payments:</span>
                  <p className="font-semibold text-gray-900">${formData.previousPayments.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Balance Due:</span>
                  <p className="font-semibold text-orange-600">
                    ${(selectedInvoice.total - formData.previousPayments).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Select method...</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction ID
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-l-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="TXN-..."
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionId: generateTransactionId() })}
                  className="px-3 py-2 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-300 text-sm"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          {/* Status Display */}
          {formData.amount > 0 && selectedInvoice && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <div className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    formData.status === 'paid-in-full' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {formData.status === 'paid-in-full' ? 'Paid in Full' : 'Paid in Advance'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Balance</label>
                  <div className={`text-lg font-bold ${
                    formData.remainingBalance <= 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    ${formData.remainingBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Additional notes about the payment..."
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
              disabled={!formData.leadId || !formData.invoiceId || formData.amount <= 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {formData.id ? 'Update Receipt' : 'Create Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentReceiptForm;
