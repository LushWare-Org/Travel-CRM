import { useState, useEffect } from 'react';
import { X, Save, CreditCard, Eye, Send, MessageCircle, Receipt, Calendar, FileText, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { receiptAPI, invoiceAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';
import { getThankYouMessage } from '../../../config/branding';
import { formatCurrency, getCurrencySymbol, CURRENCY_CODE } from '../../../../utils/currency';

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
    currency: CURRENCY_CODE,
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
      setFormData({
        lead: lead._id || lead.id,
        invoice: '',
        amount: 0,
        currency: CURRENCY_CODE,
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
      fetchInvoices().then(() => {
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
        setInvoices(invoicesData.filter(inv => {
          if (inv.status === 'cancelled') return false;
          const outstanding = inv.outstandingAmount ?? (inv.totalAmount - (inv.paidAmount || 0));
          return outstanding > 0;
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
    const targetId = currentReceiptId || currentReceipt?._id || currentReceipt?.id || null;
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
      const response = await receiptAPI.create(payload);
      if (response.success || response.status === 'success') {
        const receiptId = response.data?._id || response.data?.id;
        setCurrentReceiptId(receiptId);
        toast.success('Payment receipt created successfully!');
        await fetchInvoices();
        await fetchExistingReceipts();

        if (formData.invoice) {
          const updatedInvoice = invoices.find(inv => (inv._id || inv.id) === formData.invoice);
          if (updatedInvoice) {
            setSelectedInvoice(updatedInvoice);
            const newOutstanding = updatedInvoice.outstandingAmount ?? (updatedInvoice.totalAmount - (updatedInvoice.paidAmount || 0));
            if (newOutstanding <= 0) {
              setFormData(prev => ({ ...prev, invoice: '', amount: 0 }));
              setSelectedInvoice(null);
              toast.success('Invoice is now fully paid and settled!');
            } else {
              setFormData(prev => ({ ...prev, amount: 0 }));
            }
          }
        }

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

  // Payment method options with icons
  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'card', label: 'Card', icon: '💳' },
    { value: 'bank-transfer', label: 'Bank Transfer', icon: '🏦' },
    { value: 'upi', label: 'UPI', icon: '📱' },
    { value: 'online', label: 'Online', icon: '🌐' },
    { value: 'cheque', label: 'Cheque', icon: '📝' },
    { value: 'wallet', label: 'Wallet', icon: '👛' },
    { value: 'other', label: 'Other', icon: '📋' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Payment Receipt</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {lead?.name && `Recording payment for ${lead.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Invoice Selection */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Select Invoice</h3>
              </div>
              <select
                value={formData.invoice}
                onChange={(e) => handleInvoiceSelect(e.target.value)}
                disabled={loadingInvoices}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-gray-900"
              >
                <option value="">{loadingInvoices ? 'Loading invoices...' : 'Choose an invoice'}</option>
                {invoices.map((invoice) => (
                  <option key={invoice._id || invoice.id} value={invoice._id || invoice.id}>
                    {invoice.invoiceNumber || invoice._id} - Outstanding: {formatCurrency(
                      invoice.outstandingAmount ||
                      (invoice.totalAmount - (invoice.paidAmount || 0)), { minimumFractionDigits: 2 }
                    )}
                  </option>
                ))}
              </select>
              {invoices.length === 0 && !loadingInvoices && (
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  No unpaid invoices found for this lead
                </p>
              )}
            </div>

            {/* Invoice Summary Card */}
            {selectedInvoice && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <h4 className="font-semibold text-gray-900 mb-4">Invoice Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Invoice #</p>
                    <p className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(selectedInvoice.totalAmount, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Paid</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(selectedInvoice.paidAmount || 0, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border-2 border-amber-200">
                    <p className="text-xs text-gray-500 mb-1">Outstanding</p>
                    <p className="font-bold text-amber-600">{formatCurrency(outstandingBalance, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Amount & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{getCurrencySymbol()}</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    min="0.01"
                    step="0.01"
                    max={outstandingBalance}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
                {selectedInvoice && (
                  <p className="text-xs text-gray-500 mt-2">Maximum: {formatCurrency(outstandingBalance, { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => handlePaymentMethodChange(method.value)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 transition-all ${formData.paymentMethod === method.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Specific Fields */}
            {formData.paymentMethod === 'card' && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Card Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Card Type</label>
                    <select
                      value={formData.paymentDetails.cardType}
                      onChange={(e) => handlePaymentDetailChange('cardType', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">Amex</option>
                      <option value="rupay">RuPay</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Last 4 Digits</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.cardLastFour}
                      onChange={(e) => handlePaymentDetailChange('cardLastFour', e.target.value)}
                      maxLength="4"
                      placeholder="1234"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'bank-transfer' && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Bank Transfer Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.bankName}
                      onChange={(e) => handlePaymentDetailChange('bankName', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Transaction Ref</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.transactionReference}
                      onChange={(e) => handlePaymentDetailChange('transactionReference', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Reference number"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'upi' && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">UPI Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">UPI ID</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.upiId}
                      onChange={(e) => handlePaymentDetailChange('upiId', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="name@upi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Transaction ID</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.upiTransactionId}
                      onChange={(e) => handlePaymentDetailChange('upiTransactionId', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Transaction ID"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'cheque' && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Cheque Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Cheque Number</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.chequeNumber}
                      onChange={(e) => handlePaymentDetailChange('chequeNumber', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Cheque #"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Cheque Date</label>
                    <input
                      type="date"
                      value={formData.paymentDetails.chequeDate}
                      onChange={(e) => handlePaymentDetailChange('chequeDate', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.chequeBank}
                      onChange={(e) => handlePaymentDetailChange('chequeBank', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === 'online' && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Online Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Payment Gateway</label>
                    <select
                      value={formData.paymentDetails.paymentGateway}
                      onChange={(e) => handlePaymentDetailChange('paymentGateway', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="paytm">Paytm</option>
                      <option value="stripe">Stripe</option>
                      <option value="paypal">PayPal</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Transaction ID</label>
                    <input
                      type="text"
                      value={formData.paymentDetails.gatewayTransactionId}
                      onChange={(e) => handlePaymentDetailChange('gatewayTransactionId', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Transaction ID"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              >
                <option value="advance">Advance Payment</option>
                <option value="installment">Installment</option>
                <option value="full-payment">Full Payment</option>
                <option value="final-payment">Final Payment</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                placeholder="Any additional notes about this payment..."
              />
            </div>

            {/* Communication */}
            {currentReceiptId && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Send Receipt</h4>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={sendEmailAddress}
                      onChange={(e) => setSendEmailAddress(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendReceiptEmail}
                    disabled={sendingEmail || !sendEmailAddress.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    {sendingEmail ? 'Sending...' : 'Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(currentReceiptId)}
                    disabled={!lead?.whatsapp}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Payment Preview */}
            {selectedInvoice && formData.amount > 0 && (
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                <h4 className="font-semibold text-gray-900 mb-4">Payment Preview</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-amber-200">
                    <span className="text-gray-600">Current Outstanding</span>
                    <span className="font-medium">{formatCurrency(outstandingBalance, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-amber-200">
                    <span className="text-gray-600">This Payment</span>
                    <span className="font-medium text-emerald-600">- {formatCurrency(formData.amount, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="font-semibold text-gray-900">New Balance</span>
                    <span className="text-xl font-bold text-amber-600">
                      {formatCurrency(Math.max(0, outstandingBalance - formData.amount), { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            {currentReceiptId && (
              <button
                onClick={() => handlePreviewPDF(currentReceiptId)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <Eye className="w-4 h-4" />
                View PDF
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.invoice || !formData.amount}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Receipt'}
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
