import { useState, useEffect } from 'react';
import { X, Save, DollarSign, Eye, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { receiptAPI, invoiceAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';

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
    currency: 'LKR',
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
      setFormData(prev => ({
        ...prev,
        lead: lead._id || lead.id,
      }));
      setSendEmailAddress(lead?.email || lead?.customer?.email || '');
      // Fetch invoices first, then receipts (receipts need invoices loaded)
      fetchInvoices().then(() => {
        // Fetch existing receipts for this lead after invoices are loaded
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
        setInvoices(invoicesData.filter(inv => 
          inv.status !== 'cancelled' && inv.paymentStatus !== 'paid'
        ));
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
        
        // Load the most recent receipt into form for editing
        if (receiptsArray.length > 0) {
          const latestReceipt = receiptsArray[0]; // Most recent first
          setCurrentReceipt(latestReceipt);
          setIsEditing(true);
          
          // Populate form with existing receipt data
          setFormData({
            lead: lead._id || lead.id,
            invoice: latestReceipt.invoice?._id || latestReceipt.invoice || '',
            amount: latestReceipt.amount || 0,
            paymentMethod: latestReceipt.paymentMethod || 'cash',
            paymentType: latestReceipt.paymentType || 'full',
            paymentDate: latestReceipt.paymentDate ? new Date(latestReceipt.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            paymentDetails: latestReceipt.paymentDetails || {
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
            transactionId: latestReceipt.transactionId || '',
            notes: latestReceipt.notes || '',
          });
          
          setCurrentReceiptId(latestReceipt._id || latestReceipt.id);

          setSendEmailAddress(
            latestReceipt.customer?.email ||
              latestReceipt.lead?.email ||
              lead?.email ||
              '',
          );
          
          // Load invoice details if invoice is set
          if (latestReceipt.invoice) {
            const invoiceId = latestReceipt.invoice._id || latestReceipt.invoice;
            const invoice = invoices.find(inv => (inv._id || inv.id) === invoiceId);
            if (invoice) {
              setSelectedInvoice(invoice);
            } else {
              // Try to find it from the invoices array or fetch it
              handleInvoiceSelect(invoiceId);
            }
          }
        } else {
          setIsEditing(false);
          setCurrentReceipt(null);
        }
      }
    } catch (error) {
      console.error('Error fetching existing receipts:', error);
    } finally {
      setLoadingExisting(false);
    }
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
      let response;
      
      // Update existing receipt if editing, otherwise create new
      if (isEditing && currentReceipt) {
        const receiptId = currentReceipt._id || currentReceipt.id;
        response = await receiptAPI.update(receiptId, payload);
        setCurrentReceiptId(receiptId);
      } else {
        response = await receiptAPI.create(payload);
        if (response.success || response.status === 'success') {
          const receiptId = response.data?._id || response.data?.id;
          setCurrentReceiptId(receiptId);
        }
      }
      
      if (response.success || response.status === 'success') {
        toast.success(`Payment receipt ${isEditing ? 'updated' : 'created'} successfully!`);
        
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
        toast.error(response.message || `Failed to ${isEditing ? 'update' : 'create'} payment receipt`);
      }
    } catch (error) {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} payment receipt`);
    } finally {
      setLoading(false);
    }
  };

  const outstandingBalance = selectedInvoice 
    ? (selectedInvoice.outstandingAmount || (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)))
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-600 to-orange-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit Payment Receipt' : 'Create Payment Receipt'}
            </h2>
            <p className="text-orange-100 text-sm mt-1">
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
            {/* Invoice Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.invoice}
                onChange={(e) => handleInvoiceSelect(e.target.value)}
                disabled={loadingInvoices}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">{loadingInvoices ? 'Loading invoices...' : 'Select Invoice'}</option>
                {invoices.map((invoice) => (
                  <option key={invoice._id || invoice.id} value={invoice._id || invoice.id}>
                    {invoice.invoiceNumber || invoice._id} - Outstanding: {(
                      invoice.outstandingAmount || 
                      (invoice.totalAmount - (invoice.paidAmount || 0))
                    ).toFixed(2)}
                  </option>
                ))}
              </select>
              {invoices.length === 0 && !loadingInvoices && (
                <p className="text-xs text-gray-500 mt-1">
                  No unpaid invoices found for this lead
                </p>
              )}
            </div>

            {/* Invoice Summary */}
            {selectedInvoice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Invoice Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-medium ml-2">{selectedInvoice.invoiceNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium ml-2">{selectedInvoice.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="font-medium ml-2">{selectedInvoice.paidAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Outstanding:</span>
                    <span className="font-bold text-orange-600 ml-2">{outstandingBalance.toFixed(2)}</span>
                  </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The receipt PDF will be emailed to this address after saving.
                </p>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSendReceiptEmail}
                  disabled={sendingEmail || !sendEmailAddress.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded hover:from-orange-700 hover:to-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail ? 'Sending…' : 'Send Email'}
                </button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  min="0.01"
                  step="0.01"
                  max={outstandingBalance}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {selectedInvoice && (
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {outstandingBalance.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type
                </label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="advance">Advance Payment</option>
                  <option value="installment">Installment</option>
                  <option value="full-payment">Full Payment</option>
                  <option value="final-payment">Final Payment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
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

            {/* Payment Method Specific Fields */}
            {formData.paymentMethod === 'card' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                  <select
                    value={formData.paymentDetails.cardType}
                    onChange={(e) => handlePaymentDetailChange('cardType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select</option>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">Amex</option>
                    <option value="discover">Discover</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last 4 Digits</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.cardLastFour}
                    onChange={(e) => handlePaymentDetailChange('cardLastFour', e.target.value)}
                    maxLength="4"
                    placeholder="1234"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {formData.paymentMethod === 'bank-transfer' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.bankName}
                    onChange={(e) => handlePaymentDetailChange('bankName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.accountNumber}
                    onChange={(e) => handlePaymentDetailChange('accountNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.transactionReference}
                    onChange={(e) => handlePaymentDetailChange('transactionReference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {formData.paymentMethod === 'cheque' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Number</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.chequeNumber}
                    onChange={(e) => handlePaymentDetailChange('chequeNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Date</label>
                  <input
                    type="date"
                    value={formData.paymentDetails.chequeDate}
                    onChange={(e) => handlePaymentDetailChange('chequeDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Bank</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.chequeBank}
                    onChange={(e) => handlePaymentDetailChange('chequeBank', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {formData.paymentMethod === 'online' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Gateway</label>
                  <select
                    value={formData.paymentDetails.paymentGateway}
                    onChange={(e) => handlePaymentDetailChange('paymentGateway', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select</option>
                    <option value="stripe">Stripe</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="paypal">PayPal</option>
                    <option value="square">Square</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.gatewayTransactionId}
                    onChange={(e) => handlePaymentDetailChange('gatewayTransactionId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {formData.paymentMethod === 'upi' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.upiId}
                    onChange={(e) => handlePaymentDetailChange('upiId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UPI Transaction ID</label>
                  <input
                    type="text"
                    value={formData.paymentDetails.upiTransactionId}
                    onChange={(e) => handlePaymentDetailChange('upiTransactionId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID (Optional)
              </label>
              <input
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="External transaction reference"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Additional notes about this payment..."
              />
            </div>

            {/* Payment Summary */}
            {selectedInvoice && formData.amount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Previous Outstanding:</span>
                    <span className="font-medium">{outstandingBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Amount:</span>
                    <span className="font-medium text-green-600">-{formData.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>New Outstanding:</span>
                    <span className="text-orange-600">
                      {(outstandingBalance - formData.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            {currentReceiptId && (
              <button
                onClick={() => handlePreviewPDF(currentReceiptId)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors font-medium"
                title="Preview/Download Receipt PDF"
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
              onClick={handleSubmit}
              disabled={loading || !formData.invoice || !formData.amount}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Receipt' : 'Save Receipt'}
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

