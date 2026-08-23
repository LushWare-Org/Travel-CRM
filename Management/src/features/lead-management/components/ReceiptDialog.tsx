import { useState, useEffect } from 'react';
import { Save, CreditCard, Eye, Receipt, Calendar, FileText } from 'lucide-react';
import toast from '@/lib/toast';
import { receiptAPI, invoiceAPI } from '../../../services/api';
import PDFPreviewDialog from '@/components/shared/PdfPreview';
import SendDocumentPanel from './shared/SendDocumentPanel';
import { formatCurrency, getCurrencySymbol, CURRENCY_CODE } from '../../../utils/currency.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface PaymentDetails {
  cardType: string;
  cardLastFour: string;
  bankName: string;
  accountNumber: string;
  transactionReference: string;
  chequeNumber: string;
  chequeDate: string;
  chequeBank: string;
  paymentGateway: string;
  gatewayTransactionId: string;
  upiId: string;
  upiTransactionId: string;
}

interface Lead {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  customer?: { email?: string };
  whatsapp?: string;
  phone?: string;
}

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

const emptyPaymentDetails = (): PaymentDetails => ({
  cardType: '', cardLastFour: '', bankName: '', accountNumber: '', transactionReference: '',
  chequeNumber: '', chequeDate: '', chequeBank: '', paymentGateway: '', gatewayTransactionId: '',
  upiId: '', upiTransactionId: '',
});

const ReceiptDialog = ({ isOpen, onClose, lead, onSuccess }: ReceiptDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(null);
  const [existingReceipts, setExistingReceipts] = useState<any[]>([]);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [sendEmailAddress, setSendEmailAddress] = useState(lead?.email || lead?.customer?.email || '');
  const [sendPhone, setSendPhone] = useState(lead?.whatsapp || lead?.phone || '');
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    leadId: lead?._id || lead?.id,
    invoiceId: '',
    amount: 0,
    currency: CURRENCY_CODE,
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'installment',
    transactionId: '',
    notes: '',
    paymentDetails: emptyPaymentDetails(),
  });

  useEffect(() => {
    if (isOpen && lead) {
      setFormData({
        leadId: lead._id || lead.id,
        invoiceId: '',
        amount: 0,
        currency: CURRENCY_CODE,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentType: 'installment',
        transactionId: '',
        notes: '',
        paymentDetails: emptyPaymentDetails(),
      });
      setSelectedInvoice(null);
      setChannel('email');
      setSendEmailAddress(lead?.email || lead?.customer?.email || '');
      setSendPhone(lead?.whatsapp || lead?.phone || '');
      setCurrentReceiptId(null);
      fetchInvoices().then(() => {
        fetchExistingReceipts();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead]);

  const fetchInvoices = async () => {
    if (!lead?._id && !lead?.id) return;
    try {
      setLoadingInvoices(true);
      const response = await invoiceAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const invoicesData = response.data?.invoices || response.data || [];
        setInvoices(invoicesData.filter((inv: any) => {
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
      const response = await receiptAPI.getByLead(lead._id || lead.id);
      if (response.success || response.status === 'success') {
        const receiptsData = response.data?.receipts || response.data?.data || response.data || [];
        const receiptsArray = Array.isArray(receiptsData) ? receiptsData : [];
        setExistingReceipts(receiptsArray);
        setCurrentReceiptId(null);
      }
    } catch (error) {
      console.error('Error fetching existing receipts:', error);
    }
  };

  const handleSend = async () => {
    const targetId = currentReceiptId;
    if (!targetId) {
      toast.error('Please save the receipt before sending it');
      return;
    }
    const recipient = channel === 'email' ? sendEmailAddress.trim() : sendPhone.trim();
    if (!recipient) {
      toast.error(channel === 'email' ? 'Please provide a recipient email address' : 'Please provide a recipient WhatsApp number');
      return;
    }
    try {
      setSending(true);
      const payload = channel === 'email' ? { channel, email: recipient } : { channel, phone: recipient };
      await receiptAPI.send(targetId, payload);
      toast.success(channel === 'email' ? 'Receipt emailed successfully' : 'Receipt sent via WhatsApp');
      await fetchExistingReceipts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send receipt');
    } finally {
      setSending(false);
    }
  };

  const handlePreviewPDF = (receiptId: string) => {
    setCurrentReceiptId(receiptId);
    setShowPDFPreview(true);
  };

  const handleInvoiceSelect = async (invoiceId: string) => {
    setFormData({ ...formData, invoiceId });
    if (invoiceId) {
      const invoice = invoices.find((inv) => (inv._id || inv.id) === invoiceId);
      setSelectedInvoice(invoice);
      if (invoice) {
        const outstanding = invoice.outstandingAmount || invoice.totalAmount - (invoice.paidAmount || 0);
        setFormData((prev) => ({ ...prev, invoiceId, amount: outstanding }));
      }
    } else {
      setSelectedInvoice(null);
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setFormData({ ...formData, paymentMethod: method, paymentDetails: { ...formData.paymentDetails } });
  };

  const handlePaymentDetailChange = (field: keyof PaymentDetails, value: string) => {
    setFormData({
      ...formData,
      paymentDetails: { ...formData.paymentDetails, [field]: value },
    });
  };

  const handleSubmit = async () => {
    if (!formData.invoiceId) {
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

    const payload: any = {
      ...formData,
      paymentDate: new Date(formData.paymentDate).toISOString(),
    };

    const cleanedDetails: Record<string, string> = {};
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

        if (formData.invoiceId) {
          const updatedInvoice = invoices.find((inv) => (inv._id || inv.id) === formData.invoiceId);
          if (updatedInvoice) {
            setSelectedInvoice(updatedInvoice);
            const newOutstanding = updatedInvoice.outstandingAmount ?? (updatedInvoice.totalAmount - (updatedInvoice.paidAmount || 0));
            if (newOutstanding <= 0) {
              setFormData((prev) => ({ ...prev, invoiceId: '', amount: 0 }));
              setSelectedInvoice(null);
              toast.success('Invoice is now fully paid and settled!');
            } else {
              setFormData((prev) => ({ ...prev, amount: 0 }));
            }
          }
        }

        setCurrentReceiptId(receiptId);
        setShowPDFPreview(true);
      } else {
        toast.error(response.message || 'Failed to create payment receipt');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create payment receipt');
    } finally {
      setLoading(false);
    }
  };

  const outstandingBalance = selectedInvoice
    ? (selectedInvoice.outstandingAmount || (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)))
    : 0;

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
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[95vh] p-0 gap-0 rounded-none sm:rounded-2xl overflow-hidden flex flex-col">
          <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border space-y-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle>Create Payment Receipt</DialogTitle>
                <DialogDescription>
                  {lead?.name && `Recording payment for ${lead.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="space-y-6">
              {/* Invoice Selection */}
              <div className="bg-muted rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Select Invoice</h3>
                </div>
                <Select value={formData.invoiceId} onValueChange={(value) => handleInvoiceSelect(String(value))} disabled={loadingInvoices}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingInvoices ? 'Loading invoices...' : 'Choose an invoice'}>
                      {(value: string) => {
                        const inv = invoices.find((i) => (i._id || i.id) === value);
                        if (!inv) return value;
                        const outstanding = inv.outstandingAmount || (inv.totalAmount - (inv.paidAmount || 0));
                        return `${inv.invoiceNumber || inv._id} - Outstanding: ${formatCurrency(outstanding, { minimumFractionDigits: 2 })}`;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice._id || invoice.id} value={invoice._id || invoice.id}>
                        {invoice.invoiceNumber || invoice._id} - Outstanding: {formatCurrency(
                          invoice.outstandingAmount || (invoice.totalAmount - (invoice.paidAmount || 0)), { minimumFractionDigits: 2 }
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {invoices.length === 0 && !loadingInvoices && (
                  <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-warning rounded-full"></span>
                    No unpaid invoices found for this lead
                  </p>
                )}
              </div>

              {/* Invoice Summary Card */}
              {selectedInvoice && (
                <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
                  <h4 className="font-semibold text-foreground mb-4">Invoice Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-card rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Invoice #</p>
                      <p className="font-semibold text-foreground">{selectedInvoice.invoiceNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-card rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                      <p className="font-semibold text-foreground">{formatCurrency(selectedInvoice.totalAmount, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-card rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Paid</p>
                      <p className="font-semibold text-success">{formatCurrency(selectedInvoice.paidAmount || 0, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-card rounded-lg p-3 text-center border-2 border-warning/30">
                      <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                      <p className="font-bold text-warning">{formatCurrency(outstandingBalance, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Amount & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Payment Amount <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{getCurrencySymbol()}</span>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      min="0.01"
                      step="0.01"
                      max={outstandingBalance}
                      className="pl-10 h-11 text-lg font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                  {selectedInvoice && (
                    <p className="text-xs text-muted-foreground mt-2">Maximum: {formatCurrency(outstandingBalance, { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Payment Date <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Payment Method</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => handlePaymentMethodChange(method.value)}
                      className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 transition-all ${
                        formData.paymentMethod === method.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-ring'
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
                <div className="bg-muted rounded-xl p-4 border border-border space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Card Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Card Type</label>
                      <Select value={formData.paymentDetails.cardType} onValueChange={(v) => handlePaymentDetailChange('cardType', String(v))}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="mastercard">Mastercard</SelectItem>
                          <SelectItem value="amex">Amex</SelectItem>
                          <SelectItem value="rupay">RuPay</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Last 4 Digits</label>
                      <Input type="text" value={formData.paymentDetails.cardLastFour} onChange={(e) => handlePaymentDetailChange('cardLastFour', e.target.value)} maxLength={4} placeholder="1234" />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'bank-transfer' && (
                <div className="bg-muted rounded-xl p-4 border border-border space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Bank Transfer Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Bank Name</label>
                      <Input type="text" value={formData.paymentDetails.bankName} onChange={(e) => handlePaymentDetailChange('bankName', e.target.value)} placeholder="Enter bank name" />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Transaction Ref</label>
                      <Input type="text" value={formData.paymentDetails.transactionReference} onChange={(e) => handlePaymentDetailChange('transactionReference', e.target.value)} placeholder="Reference number" />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'upi' && (
                <div className="bg-muted rounded-xl p-4 border border-border space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">UPI Payment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">UPI ID</label>
                      <Input type="text" value={formData.paymentDetails.upiId} onChange={(e) => handlePaymentDetailChange('upiId', e.target.value)} placeholder="name@upi" />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Transaction ID</label>
                      <Input type="text" value={formData.paymentDetails.upiTransactionId} onChange={(e) => handlePaymentDetailChange('upiTransactionId', e.target.value)} placeholder="Transaction ID" />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'cheque' && (
                <div className="bg-muted rounded-xl p-4 border border-border space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Cheque Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Cheque Number</label>
                      <Input type="text" value={formData.paymentDetails.chequeNumber} onChange={(e) => handlePaymentDetailChange('chequeNumber', e.target.value)} placeholder="Cheque #" />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Cheque Date</label>
                      <Input type="date" value={formData.paymentDetails.chequeDate} onChange={(e) => handlePaymentDetailChange('chequeDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Bank Name</label>
                      <Input type="text" value={formData.paymentDetails.chequeBank} onChange={(e) => handlePaymentDetailChange('chequeBank', e.target.value)} placeholder="Bank name" />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'online' && (
                <div className="bg-muted rounded-xl p-4 border border-border space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Online Payment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Payment Gateway</label>
                      <Select value={formData.paymentDetails.paymentGateway} onValueChange={(v) => handlePaymentDetailChange('paymentGateway', String(v))}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="razorpay">Razorpay</SelectItem>
                          <SelectItem value="paytm">Paytm</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Transaction ID</label>
                      <Input type="text" value={formData.paymentDetails.gatewayTransactionId} onChange={(e) => handlePaymentDetailChange('gatewayTransactionId', e.target.value)} placeholder="Transaction ID" />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Payment Type</label>
                <Select value={formData.paymentType} onValueChange={(v) => setFormData({ ...formData, paymentType: String(v) })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">Advance Payment</SelectItem>
                    <SelectItem value="installment">Installment</SelectItem>
                    <SelectItem value="full-payment">Full Payment</SelectItem>
                    <SelectItem value="final-payment">Final Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="resize-none"
                  placeholder="Any additional notes about this payment..."
                />
              </div>

              {/* Communication */}
              {currentReceiptId && (
                <SendDocumentPanel
                  channel={channel}
                  onChannelChange={setChannel}
                  email={sendEmailAddress}
                  onEmailChange={setSendEmailAddress}
                  phone={sendPhone}
                  onPhoneChange={setSendPhone}
                  onSend={handleSend}
                  sending={sending}
                />
              )}

              {/* Payment Preview */}
              {selectedInvoice && formData.amount > 0 && (
                <div className="bg-warning/5 rounded-xl p-5 border border-warning/20">
                  <h4 className="font-semibold text-foreground mb-4">Payment Preview</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-warning/20">
                      <span className="text-muted-foreground">Current Outstanding</span>
                      <span className="font-medium">{formatCurrency(outstandingBalance, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-warning/20">
                      <span className="text-muted-foreground">This Payment</span>
                      <span className="font-medium text-success">- {formatCurrency(formData.amount, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="font-semibold text-foreground">New Balance</span>
                      <span className="text-xl font-bold text-warning">
                        {formatCurrency(Math.max(0, outstandingBalance - formData.amount), { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row items-stretch sm:items-center sm:justify-between">
            <div>
              {currentReceiptId && (
                <Button variant="secondary" onClick={() => handlePreviewPDF(currentReceiptId)}>
                  <Eye className="w-4 h-4" />
                  View PDF
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !formData.invoiceId || !formData.amount}>
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Receipt'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          onDownload
          documents={existingReceipts}
          currentIndex={existingReceipts.findIndex((rec) => (rec._id || rec.id) === currentReceiptId)}
          onNavigate={(index) => {
            if (existingReceipts[index]) {
              const receiptId = existingReceipts[index]._id || existingReceipts[index].id;
              setCurrentReceiptId(receiptId);
            }
          }}
        />
      )}
    </>
  );
};

export default ReceiptDialog;
