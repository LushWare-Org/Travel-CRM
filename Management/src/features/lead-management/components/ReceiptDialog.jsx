import { useState, useEffect } from 'react';
import { X, Save, DollarSign, Eye, Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { receiptAPI, invoiceAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';
import { getThankYouMessage } from '../../../config/branding';

const ReceiptDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentReceiptId, setCurrentReceiptId] = useState(null);
  const [existingReceipts, setExistingReceipts] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sendEmailAddress, setSendEmailAddress] = useState(lead?.email || lead?.customer?.email || '');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [formData, setFormData] = useState({
    lead: lead?._id || lead?.id,
    invoice: '',
    amount: 0,
    currency: 'INR', // Fixed to INR only
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'installment',
    transactionId: '',
    notes: '',
    paymentDetails: {
      cardType: '',
      cardLastFour: '',
      bankName: '',
      accountNumber: '',
      transactionReference: '',
      chequeNumber: '',
      chequeDate: '',
      chequeBank: '',
      paymentGateway: '',
      gatewayTransactionId: '',
      upiId: '',
      upiTransactionId: '',
    },
  });

  useEffect(() => {
    if (isOpen && lead) {
      // Reset form to initial state for creating new receipt
      setFormData({
        lead: lead._id || lead.id,
        invoice: '',
        amount: 0,
        currency: 'INR',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentType: 'installment',
        transactionId: '',
        notes: '',
        paymentDetails: {
          cardType: '',
          cardLastFour: '',
          bankName: '',
          accountNumber: '',
          transactionReference: '',
          chequeNumber: '',
          chequeDate: '',
          chequeBank: '',
          paymentGateway: '',
          gatewayTransactionId: '',
          upiId: '',
          upiTransactionId: '',
        },
      });
      setSelectedInvoice(null);
      setSendEmailAddress(lead?.email || lead?.customer?.email || '');
      setCurrentReceiptId(null);
      setCurrentReceipt(null);
      setIsEditing(false);

      // Fetch invoices first, then receipts (receipts need invoices loaded)
      fetchInvoices().then(() => {
        // Fetch existing receipts for this lead after invoices are loaded (for display only)
        fetchExistingReceipts();
      });
    }
  }, [isOpen, lead]);

  const fetchInvoices = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingInvoices(true);
      const response = await invoiceAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const invoicesData = response.data?.invoices || response.data || [];
        // Filter out cancelled invoices and fully paid invoices (outstandingAmount = 0)
        setInvoices(invoicesData.filter(inv => {
          if (inv.status === 'cancelled') return false;
          const outstanding = inv.outstandingAmount ?? (inv.totalAmount - (inv.paidAmount || 0));
          return outstanding > 0; // Only show invoices with remaining balance
        }));
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchExistingReceipts = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingExisting(true);
      const response = await receiptAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const receiptsData = response.data?.receipts || response.data?.data || response.data || [];
        const receiptsArray = Array.isArray(receiptsData) ? receiptsData : [];
        setExistingReceipts(receiptsArray);
        // Always start with a fresh form for creating new receipts
        // Do not auto-load existing receipts for editing
        setIsEditing(false);
        setCurrentReceipt(null);
        setCurrentReceiptId(null);
      }
    } catch (error) {
      console.error('Error fetching existing receipts:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleSendWhatsApp = (receiptId) => {
    if (!lead?.whatsapp) {
      toast.error('WhatsApp number not available for this lead');
      return;
    }

    const whatsappNumber = lead.whatsapp.replace(/[^0-9]/g, '');
    if (!whatsappNumber) {
      toast.error('Invalid WhatsApp number');
      return;
    }

    const receiptNumber = currentReceipt?.receiptNumber || `#${receiptId?.slice(-6)}` || 'Receipt';
    const amount = currentReceipt?.amount || formData.amount || 0;
    const message = encodeURIComponent(
      `Hello ${lead.name || 'there'},\n\n` +
      `Your payment receipt ${receiptNumber} for ${amount.toFixed(2)} is ready. ` +
      `Please contact us for the detailed receipt document.\n\n` +
      getThankYouMessage()
    );

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendReceiptEmail = async () => {
    const targetId =
      currentReceiptId || currentReceipt?._id || currentReceipt?.id || null;

    if (!targetId) {
      toast.error('Please save the receipt before sending the email');
      return;
    }

    const trimmedEmail = sendEmailAddress.trim();
    if (!trimmedEmail) {
      toast.error('Please provide a recipient email address');
      return;
    }

    try {
      setSendingEmail(true);
      await receiptAPI.send(targetId, { email: trimmedEmail });
      toast.success('Receipt emailed successfully');
      await fetchExistingReceipts();
    } catch (error) {
      toast.error(error.message || 'Failed to send receipt email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePreviewPDF = (receiptId) => {
    setCurrentReceiptId(receiptId);
    setShowPDFPreview(true);
  };

  const handleInvoiceSelect = async (invoiceId) => {
    setFormData({ ...formData, invoice: invoiceId });

    if (invoiceId) {
      const invoice = invoices.find(inv => (inv._id || inv.id) === invoiceId);
      setSelectedInvoice(invoice);

      // Set default amount to outstanding balance
      if (invoice) {
        const outstanding = invoice.outstandingAmount || invoice.totalAmount - (invoice.paidAmount || 0);
        setFormData(prev => ({
          ...prev,
          invoice: invoiceId,
          amount: outstanding,
        }));
      }
    } else {
      setSelectedInvoice(null);
    }
  };

  const handlePaymentMethodChange = (method) => {
    setFormData({ ...formData, paymentMethod: method, paymentDetails: { ...formData.paymentDetails } });
  };

  const handlePaymentDetailChange = (field, value) => {
    setFormData({
      ...formData,
      paymentDetails: {
        ...formData.paymentDetails,
        [field]: value,
      },
    });
  };

  const handleSubmit = async () => {
    if (!formData.invoice) {
      toast.error('Please select an invoice');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (selectedInvoice) {
      const outstanding = selectedInvoice.outstandingAmount ||
        (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0));

      if (formData.amount > outstanding) {
        toast.error(`Payment amount cannot exceed outstanding balance of ${outstanding.toFixed(2)}`);
        return;
      }
    }

    const payload = {
      ...formData,
      paymentDate: new Date(formData.paymentDate).toISOString(),
    };

    // Clean up paymentDetails - only include relevant fields based on payment method
    const cleanedDetails = {};
    if (formData.paymentMethod === 'card') {
      cleanedDetails.cardType = formData.paymentDetails.cardType;
      cleanedDetails.cardLastFour = formData.paymentDetails.cardLastFour;
    } else if (formData.paymentMethod === 'bank-transfer') {
      cleanedDetails.bankName = formData.paymentDetails.bankName;
      cleanedDetails.accountNumber = formData.paymentDetails.accountNumber;
      cleanedDetails.transactionReference = formData.paymentDetails.transactionReference;
    } else if (formData.paymentMethod === 'cheque') {
      cleanedDetails.chequeNumber = formData.paymentDetails.chequeNumber;
      cleanedDetails.chequeDate = formData.paymentDetails.chequeDate;
      cleanedDetails.chequeBank = formData.paymentDetails.chequeBank;
    } else if (formData.paymentMethod === 'online') {
      cleanedDetails.paymentGateway = formData.paymentDetails.paymentGateway;
      cleanedDetails.gatewayTransactionId = formData.paymentDetails.gatewayTransactionId;
    } else if (formData.paymentMethod === 'upi') {
      cleanedDetails.upiId = formData.paymentDetails.upiId;
      cleanedDetails.upiTransactionId = formData.paymentDetails.upiTransactionId;
    }

    payload.paymentDetails = cleanedDetails;
    if (formData.transactionId) {
      payload.transactionId = formData.transactionId;
    }

    try {
      setLoading(true);

      // Always create a new receipt (never update existing ones)
      const response = await receiptAPI.create(payload);
      if (response.success || response.status === 'success') {
        const receiptId = response.data?._id || response.data?.id;
        setCurrentReceiptId(receiptId);
        toast.success('Payment receipt created successfully!');

        // Refresh invoices to get updated outstanding amounts
        await fetchInvoices();

        // Refresh existing receipts list
        await fetchExistingReceipts();

        // Update selected invoice if it still exists
        if (formData.invoice) {
          const updatedInvoice = invoices.find(inv => (inv._id || inv.id) === formData.invoice);
          if (updatedInvoice) {
            setSelectedInvoice(updatedInvoice);
            // Update outstanding balance display
            const newOutstanding = updatedInvoice.outstandingAmount ?? (updatedInvoice.totalAmount - (updatedInvoice.paidAmount || 0));
            if (newOutstanding <= 0) {
              // Invoice is now fully paid, clear selection
              setFormData(prev => ({ ...prev, invoice: '', amount: 0 }));
              setSelectedInvoice(null);
              toast.success('Invoice is now fully paid and settled!');
            } else {
              // Reset amount to 0 for next receipt
              setFormData(prev => ({ ...prev, amount: 0 }));
            }
          }
        }

        // Show PDF preview after successful save
        if (currentReceiptId || (response.data?._id || response.data?.id)) {
          const idToPreview = currentReceiptId || (response.data?._id || response.data?.id);
          setCurrentReceiptId(idToPreview);
          setShowPDFPreview(true);
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        toast.error(response.message || 'Failed to create payment receipt');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create payment receipt');
    } finally {
      setLoading(false);
    }
  };

  const outstandingBalance = selectedInvoice
    ? (selectedInvoice.outstandingAmount || (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)))
    : 0;

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold">
              Create Payment Receipt
            </h2>
            <p className="text-orange-100 text-sm mt-1">
              {lead?.name && `For: ${lead.name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group"
          >
            <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Invoice Selection Section */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Invoice Information</h3>
                <p className="text-xs text-gray-500 mt-1">Select the invoice for this payment receipt</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Invoice <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.invoice}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  disabled={loadingInvoices}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                >
                  <option value="">{loadingInvoices ? 'Loading invoices...' : 'Select Invoice'}</option>
                  {invoices.map((invoice) => (
                    <option key={invoice._id || invoice.id} value={invoice._id || invoice.id}>
                      {invoice.invoiceNumber || invoice._id} - Outstanding: INR {(
                        invoice.outstandingAmount ||
                        (invoice.totalAmount - (invoice.paidAmount || 0))
                      ).toFixed(2)}
                    </option>
                  ))}
                </select>
                {invoices.length === 0 && !loadingInvoices && (
                  <p className="text-xs text-gray-500 mt-2">
                    No unpaid invoices found for this lead
                  </p>
                )}
              </div>
            </div>

            {/* Invoice Summary */}
            {selectedInvoice && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Invoice Summary
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-gray-500 block mb-1">Invoice Number</span>
                    <span className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber || 'N/A'}</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-gray-500 block mb-1">Total Amount</span>
                    <span className="font-semibold text-gray-900">INR {selectedInvoice.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-gray-500 block mb-1">
                      Paid Amount {formData.amount > 0 && <span className="text-orange-600">(Projected)</span>}
                    </span>
                    <span className="font-semibold text-green-600">
                      INR {((selectedInvoice.paidAmount || 0) + (formData.amount || 0)).toFixed(2)}
                    </span>
                    {formData.amount > 0 && (
                      <span className="text-xs text-gray-400 block mt-1">
                        Current: INR {(selectedInvoice.paidAmount || 0).toFixed(2)} + Payment: INR {formData.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300">
                    <span className="text-xs text-gray-500 block mb-1">
                      Outstanding Balance {formData.amount > 0 && <span className="text-orange-600">(After Payment)</span>}
                    </span>
                    <span className="font-bold text-lg text-orange-600">
                      INR {Math.max(0, (outstandingBalance - (formData.amount || 0))).toFixed(2)}
                    </span>
                    {formData.amount > 0 && (
                      <span className="text-xs text-gray-400 block mt-1">
                        Current: INR {outstandingBalance.toFixed(2)} - Payment: INR {formData.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Email & Communication Section */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Communication</h3>
                <p className="text-xs text-gray-500 mt-1">Send receipt via email or WhatsApp</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      value={sendEmailAddress}
                      onChange={(e) => setSendEmailAddress(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSendReceiptEmail}
                      disabled={sendingEmail || !sendEmailAddress.trim()}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm font-medium"
                      title="Send receipt via email"
                    >
                      <Send className="w-4 h-4" />
                      {sendingEmail ? 'Sending…' : 'Send'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(currentReceiptId || currentReceipt?._id)}
                      disabled={!currentReceiptId || !lead?.whatsapp}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm font-medium"
                      title="Send via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  The receipt PDF will be emailed to this address after saving.
                </p>
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                <p className="text-xs text-gray-500 mt-1">Enter payment amount and related information</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount (INR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">INR</span>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      min="0.01"
                      step="0.01"
                      max={outstandingBalance}
                      className="w-full pl-16 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  {selectedInvoice && (
                    <p className="text-xs text-gray-500 mt-2">
                      Maximum: INR {outstandingBalance.toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Type
                  </label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  >
                    <option value="advance">Advance Payment</option>
                    <option value="installment">Installment</option>
                    <option value="full-payment">Full Payment</option>
                    <option value="final-payment">Final Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="online">Online Payment</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="wallet">Wallet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Method Specific Fields */}
            {formData.paymentMethod === 'card' && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Card Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Card Type</label>
                    <select
                      value={formData.paymentDetails.cardType}
                      onChange={(e) => handlePaymentDetailChange('cardType', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select Card Type</option>
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">Amex</option>
                      <option value="discover">Discover</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last 4 Digits</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.cardLastFour}
                      onChange={(e) => handlePaymentDetailChange('cardLastFour', e.target.value)}
                      maxLength="4"
                      placeholder="1234"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'bank-transfer' && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Bank Transfer Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.bankName}
                      onChange={(e) => handlePaymentDetailChange('bankName', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.accountNumber}
                      onChange={(e) => handlePaymentDetailChange('accountNumber', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction Reference</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.transactionReference}
                      onChange={(e) => handlePaymentDetailChange('transactionReference', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter transaction reference"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'cheque' && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Cheque Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cheque Number</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.chequeNumber}
                      onChange={(e) => handlePaymentDetailChange('chequeNumber', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter cheque number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cheque Date</label>
                    <input
                      type="date"
                      value={formData.paymentDetails.chequeDate}
                      onChange={(e) => handlePaymentDetailChange('chequeDate', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cheque Bank</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.chequeBank}
                      onChange={(e) => handlePaymentDetailChange('chequeBank', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter bank name"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'online' && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Online Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Gateway</label>
                    <select
                      value={formData.paymentDetails.paymentGateway}
                      onChange={(e) => handlePaymentDetailChange('paymentGateway', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select Gateway</option>
                      <option value="stripe">Stripe</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="paypal">PayPal</option>
                      <option value="square">Square</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction ID</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.gatewayTransactionId}
                      onChange={(e) => handlePaymentDetailChange('gatewayTransactionId', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter transaction ID"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'upi' && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">UPI Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">UPI ID</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.upiId}
                      onChange={(e) => handlePaymentDetailChange('upiId', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter UPI ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">UPI Transaction ID</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.upiTransactionId}
                      onChange={(e) => handlePaymentDetailChange('upiTransactionId', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Enter transaction ID"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                <p className="text-xs text-gray-500 mt-1">Optional transaction details and notes</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="External transaction reference"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                  placeholder="Additional notes about this payment..."
                />
              </div>
            </div>

            {/* Payment Summary */}
            {selectedInvoice && formData.amount > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  Payment Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-orange-100">
                    <span className="text-sm text-gray-600">Previous Outstanding:</span>
                    <span className="font-semibold text-gray-900">INR {outstandingBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-green-100">
                    <span className="text-sm text-gray-600">Payment Amount:</span>
                    <span className="font-semibold text-green-600">- INR {formData.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg p-4 border-2 border-orange-300 mt-2">
                    <span className="font-semibold text-gray-900">New Outstanding:</span>
                    <span className="font-bold text-lg text-orange-600">
                      INR {(outstandingBalance - formData.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            {currentReceiptId && (
              <button
                onClick={() => handlePreviewPDF(currentReceiptId)}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-medium shadow-sm"
                title="Preview/Download Receipt PDF"
              >
                <Eye className="w-4 h-4" />
                View PDF
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.invoice || !formData.amount}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md"
            >
              <Save className="w-5 h-5" />
              Create Receipt
            </button>
          </div>
        </div>

        {/* PDF Preview Dialog */}
        {showPDFPreview && currentReceiptId && (
          <PDFPreviewDialog
            isOpen={showPDFPreview}
            onClose={() => {
              setShowPDFPreview(false);
              setCurrentReceiptId(null);
              onSuccess?.();
              onClose();
            }}
            onBack={() => {
              setShowPDFPreview(false);
              // Keep the form dialog open, just close PDF preview
            }}
            pdfUrl={`/billing/receipts/${currentReceiptId}/pdf`}
            documentName="Payment Receipt"
            onDownload={true}
            documents={existingReceipts}
            currentIndex={existingReceipts.findIndex(rec =>
              (rec._id || rec.id) === currentReceiptId
            )}
            onNavigate={(index) => {
              if (existingReceipts[index]) {
                const receiptId = existingReceipts[index]._id || existingReceipts[index].id;
                setCurrentReceiptId(receiptId);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ReceiptDialog;

