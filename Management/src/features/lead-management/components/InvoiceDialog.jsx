import { useState, useEffect, useCallback } from 'react';
import {
  X, FileText, Download, Loader2, Mail, MessageCircle, Eye, Send,
  Receipt, ScrollText, StickyNote, CheckCircle2, MapPin, Calendar, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { invoiceAPI, quotationAPI, adminAPI } from '../../../services/api';
import PDFPreviewDialog from './PDFPreviewDialog';
import { formatCurrency, LOCALE } from '../../../utils/currency.js';
import { Row, ChannelTab } from './shared/BillingPrimitives';
import EditableBulletSection from './shared/EditableBulletSection';

const EMPTY_CUSTOMER_OVERRIDES = { customerName: '', customerEmail: '', customerPhone: '', customerAddress: '', customerGstNumber: '', destination: '' };
const emptyFormData = () => ({
  quotation: '', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  bookingId: '', notes: '', paymentTerms: '', paymentInstructions: '',
});

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  viewed: 'bg-indigo-50 text-indigo-700',
  paid: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
  refunded: 'bg-slate-100 text-slate-500',
};

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Quotation-derived invoice window. Pricing is never editable here — it's
 * shown verbatim from the selected quotation (create) or the invoice itself
 * (view), matching what quotationAPI.convertToInvoice already enforces
 * server-side. Visually mirrors QuotationModal (teal header, single-column
 * cards, channel-tab send) rather than the old indigo split-panel design.
 */
const InvoiceDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const leadId = lead?.id || lead?._id;

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [orgDefaults, setOrgDefaults] = useState(null);

  const [viewMode, setViewMode] = useState('create'); // 'create' | 'view'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [quotationSnapshot, setQuotationSnapshot] = useState(null);

  const [formData, setFormData] = useState(emptyFormData());
  const [customerOverrideEnabled, setCustomerOverrideEnabled] = useState(false);
  const [customerOverrides, setCustomerOverrides] = useState(EMPTY_CUSTOMER_OVERRIDES);

  const [creating, setCreating] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(null);
  const [channel, setChannel] = useState('email');
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  const invoiceId = selectedInvoice?.id || selectedInvoice?._id || null;

  const loadQuotationData = useCallback(async (quotationId) => {
    if (!quotationId) { setQuotationSnapshot(null); return; }
    try {
      const response = await quotationAPI.getById(quotationId);
      const quote = response.data || response;
      const snapshot = {
        packageTitle: quote.packageTitle, quotationNumber: quote.quotationNumber,
        customerName: quote.customerName || '', customerEmail: quote.customerEmail || '',
        customerPhone: quote.customerPhone || '', customerAddress: quote.customerAddress || '',
        customerGstNumber: quote.customerGstNumber || '', destination: quote.destination || '',
        subtotal: quote.subtotal || 0, discountAmount: quote.discountAmount || 0,
        taxAmount: quote.taxAmount || 0, taxRate: quote.taxRate || 0,
        serviceChargeAmount: quote.serviceChargeAmount || 0, serviceChargeRate: quote.serviceChargeRate || 0,
        totalAmount: quote.totalAmount || 0, items: quote.items || [], notes: quote.notes || '',
      };
      setQuotationSnapshot(snapshot);
      setCustomerOverrideEnabled(false);
      setCustomerOverrides({
        customerName: snapshot.customerName, customerEmail: snapshot.customerEmail,
        customerPhone: snapshot.customerPhone, customerAddress: snapshot.customerAddress,
        customerGstNumber: snapshot.customerGstNumber, destination: snapshot.destination,
      });
      setFormData((prev) => ({ ...prev, quotation: quotationId, notes: prev.notes || snapshot.notes }));
    } catch (err) {
      toast.error(err.message || 'Failed to load quotation data');
    }
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    setViewMode('create');
    setSelectedInvoice(null);
    setQuotationSnapshot(null);
    setFormData(emptyFormData());
    setCustomerOverrideEnabled(false);
    setChannel('email');
    setSendEmail(lead?.email || lead?.customer?.email || '');
    setSendPhone(lead?.whatsapp || lead?.phone || '');

    try {
      const [quoteRes, invoiceRes, brandingRes] = await Promise.all([
        quotationAPI.getByLead(leadId),
        invoiceAPI.getByLead(leadId),
        adminAPI.getOrganizationBranding().catch(() => null),
      ]);

      const quoteList = (quoteRes.data?.quotations || quoteRes.data || []).filter((q) => q.status !== 'converted');
      setQuotations(quoteList);

      const invoiceData = invoiceRes.data?.invoices || invoiceRes.data?.data || invoiceRes.data || [];
      const invoiceList = Array.isArray(invoiceData) ? invoiceData : [];
      setExistingInvoices(invoiceList);

      const branding = brandingRes?.data?.branding || null;
      setOrgDefaults(branding);

      if (invoiceList.length > 0) {
        setViewMode('view');
        setSelectedInvoice(invoiceList[0]);
      } else {
        setViewMode('create');
        if (quoteList.length > 0) {
          const latest = quoteList[0];
          const latestId = latest._id || latest.id;
          await loadQuotationData(latestId);
        }
        setFormData((prev) => ({
          ...prev,
          paymentTerms: prev.paymentTerms || branding?.invoicePaymentTerms || '',
          paymentInstructions: prev.paymentInstructions || branding?.invoicePaymentInstructions || '',
        }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load invoice data');
    } finally {
      setLoading(false);
    }
  }, [leadId, lead, loadQuotationData]);

  useEffect(() => {
    if (isOpen && leadId) initialize();
  }, [isOpen, leadId, initialize]);

  const startNewInvoice = () => {
    setViewMode('create');
    setSelectedInvoice(null);
    setFormData({ ...emptyFormData(), paymentTerms: orgDefaults?.invoicePaymentTerms || '', paymentInstructions: orgDefaults?.invoicePaymentInstructions || '' });
    setCustomerOverrideEnabled(false);
    if (quotations.length > 0) {
      const latest = quotations[0];
      loadQuotationData(latest._id || latest.id);
    } else {
      setQuotationSnapshot(null);
    }
  };

  const viewInvoice = (inv) => {
    setViewMode('view');
    setSelectedInvoice(inv);
    setChannel('email');
    setSendEmail(inv.customerEmail || lead?.email || '');
    setSendPhone(inv.customerPhone || lead?.whatsapp || lead?.phone || '');
  };

  const handleQuotationSelect = (quotationId) => {
    setFormData((prev) => ({ ...prev, quotation: quotationId }));
    if (quotationId) loadQuotationData(quotationId); else setQuotationSnapshot(null);
  };

  const toggleCustomerOverride = () => {
    setCustomerOverrideEnabled((prev) => {
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

  const handleDownloadQuotationPDF = async () => {
    if (!formData.quotation) return;
    try { await quotationAPI.downloadPDF(formData.quotation); toast.success('Quotation PDF downloaded'); }
    catch { toast.error('Failed to download quotation PDF'); }
  };

  const showOrgSettingsErrorToast = (message) => {
    if (/organization settings/i.test(message)) {
      toast.error((t) => (
        <div className="text-sm">
          <p className="mb-1.5">{message}</p>
          <a href="/settings" className="font-semibold text-teal-700 underline" onClick={() => toast.dismiss(t.id)}>
            Open Organization Settings →
          </a>
        </div>
      ), { duration: 9000 });
    } else {
      toast.error(message);
    }
  };

  const handleCreateFromQuotation = async () => {
    if (!formData.quotation) { toast.error('Please select a quotation'); return; }
    const overrides = {};
    if (formData.dueDate) overrides.dueDate = new Date(formData.dueDate).toISOString();
    if (formData.bookingId?.trim()) overrides.bookingId = formData.bookingId.trim();
    if (formData.notes?.trim()) overrides.notes = formData.notes.trim();
    if (formData.paymentTerms?.trim()) overrides.paymentTerms = formData.paymentTerms.trim();
    if (formData.paymentInstructions?.trim()) overrides.paymentInstructions = formData.paymentInstructions.trim();
    if (customerOverrideEnabled) {
      for (const field of ['customerName', 'customerEmail', 'customerPhone', 'customerAddress', 'customerGstNumber', 'destination']) {
        const value = customerOverrides[field]?.trim();
        if (value) overrides[field] = value;
      }
    }

    try {
      setCreating(true);
      const response = await quotationAPI.convertToInvoice(formData.quotation, overrides);
      const created = response.data;
      toast.success('Invoice created from quotation');
      setExistingInvoices((prev) => [created, ...prev]);
      viewInvoice(created);
      setShowPDFPreview(true);
      onSuccess?.();
    } catch (err) {
      showOrgSettingsErrorToast(err.message || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleSectionSave = async (field, value) => {
    if (viewMode === 'view' && invoiceId) {
      setSectionSaving(field);
      try {
        const response = await invoiceAPI.update(invoiceId, { [field]: value });
        const updated = response.data;
        setSelectedInvoice(updated);
        setExistingInvoices((prev) => prev.map((inv) => ((inv.id || inv._id) === invoiceId ? updated : inv)));
        toast.success('Invoice updated');
      } catch (err) {
        toast.error(err.message || 'Failed to update invoice');
        throw err;
      } finally {
        setSectionSaving(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSend = async () => {
    if (!invoiceId) return;
    const recipient = channel === 'email' ? sendEmail.trim() : sendPhone.trim();
    if (!recipient) { toast.error(channel === 'email' ? 'Enter a recipient email' : 'Enter a WhatsApp number'); return; }
    setSending(true);
    try {
      const payload = channel === 'email' ? { channel, email: recipient } : { channel, phone: recipient };
      const response = await invoiceAPI.send(invoiceId, payload);
      const updated = response.data;
      if (updated) {
        setSelectedInvoice(updated);
        setExistingInvoices((prev) => prev.map((inv) => ((inv.id || inv._id) === invoiceId ? updated : inv)));
      }
      toast.success(channel === 'email' ? 'Invoice emailed' : 'Invoice sent via WhatsApp');
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !lead) return null;

  const totals = viewMode === 'create'
    ? quotationSnapshot
    : selectedInvoice && {
      subtotal: selectedInvoice.subtotal, discountAmount: selectedInvoice.discountAmount,
      taxAmount: selectedInvoice.taxAmount, taxRate: selectedInvoice.taxRate,
      serviceChargeAmount: selectedInvoice.serviceChargeAmount, totalAmount: selectedInvoice.totalAmount,
      items: selectedInvoice.items,
    };

  const displayCustomer = viewMode === 'create' ? quotationSnapshot : selectedInvoice;
  const tripMeta = [
    displayCustomer?.destination && { icon: MapPin, text: displayCustomer.destination },
    (viewMode === 'view' && selectedInvoice?.dueDate) && { icon: Calendar, text: `Due ${formatDate(selectedInvoice.dueDate)}` },
  ].filter(Boolean);

  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleBackdropClick}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-500 px-6 py-4 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-lg bg-white/20 p-2 shrink-0"><Receipt className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {viewMode === 'view' && selectedInvoice ? selectedInvoice.invoiceNumber : 'New Invoice'}
              </h2>
              <p className="text-sm text-teal-50 truncate">{lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/20 shrink-0" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {/* Previous invoices pill row */}
              {existingInvoices.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices for this lead</p>
                  <div className="flex flex-wrap gap-2">
                    {existingInvoices.map((inv) => {
                      const id = inv.id || inv._id;
                      const isActive = viewMode === 'view' && invoiceId === id;
                      return (
                        <button
                          key={id}
                          onClick={() => viewInvoice(inv)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                            isActive ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          {inv.invoiceNumber}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                            {inv.status}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      onClick={startNewInvoice}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        viewMode === 'create' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-dashed border-slate-300 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      <Plus className="h-4 w-4" /> New from quotation
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'create' && (
                <div className="mb-5 rounded-xl border border-slate-200 p-5">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Select Quotation</label>
                  {quotations.length === 0 ? (
                    <p className="text-sm text-amber-600">No quotations available for this lead yet.</p>
                  ) : (
                    <div className="flex gap-3">
                      <select
                        value={formData.quotation}
                        onChange={(e) => handleQuotationSelect(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="">— Select Quotation —</option>
                        {quotations.map((q) => (
                          <option key={q._id || q.id} value={q._id || q.id}>{q.packageTitle || 'Package'} — {q.quotationNumber || q._id}</option>
                        ))}
                      </select>
                      {formData.quotation && (
                        <button type="button" onClick={handleDownloadQuotationPDF} className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50" aria-label="Download quotation PDF">
                          <Download className="h-4 w-4 text-slate-600" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(viewMode === 'create' ? quotationSnapshot : selectedInvoice) && (
                <div className="space-y-5">
                  {/* Summary card */}
                  <div className="rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-800">
                          {viewMode === 'create' ? (quotationSnapshot.packageTitle || 'Package') : 'Invoice Summary'}
                        </h3>
                        {tripMeta.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            {tripMeta.map((m, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5"><m.icon className="h-3.5 w-3.5" />{m.text}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {viewMode === 'view' && selectedInvoice?.emailSent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                        </span>
                      )}
                    </div>

                    {/* Tax breakdown */}
                    {totals && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <dl className="space-y-1.5 text-sm">
                          <Row label="Subtotal" value={formatCurrency(totals.subtotal, { minimumFractionDigits: 2 })} />
                          {totals.discountAmount > 0 && <Row label="Discount" value={`- ${formatCurrency(totals.discountAmount, { minimumFractionDigits: 2 })}`} />}
                          {totals.taxAmount > 0 && <Row label={`Tax${totals.taxRate ? ` (${totals.taxRate}%)` : ''}`} value={formatCurrency(totals.taxAmount, { minimumFractionDigits: 2 })} />}
                          {totals.serviceChargeAmount > 0 && <Row label="Service charge" value={formatCurrency(totals.serviceChargeAmount, { minimumFractionDigits: 2 })} />}
                          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                            <span className="text-base font-semibold text-slate-800">Total</span>
                            <span className="text-lg font-bold text-teal-700">{formatCurrency(totals.totalAmount, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>

                  {/* Due date / booking id — only meaningful while creating */}
                  {viewMode === 'create' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 p-4">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
                        <input type="date" value={formData.dueDate} onChange={(e) => setFormData((f) => ({ ...f, dueDate: e.target.value }))} className="w-full text-sm font-medium text-slate-800 focus:outline-none" />
                      </div>
                      <div className="rounded-xl border border-slate-200 p-4">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Booking Id (optional)</label>
                        <input type="text" value={formData.bookingId} onChange={(e) => setFormData((f) => ({ ...f, bookingId: e.target.value }))} placeholder="—" className="w-full text-sm font-medium text-slate-800 focus:outline-none placeholder:text-slate-300" />
                      </div>
                    </div>
                  )}

                  {/* Customer details — only editable/overridable during creation */}
                  {viewMode === 'create' && quotationSnapshot && (
                    <div className="rounded-xl border border-slate-200 p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Customer Details</p>
                        <button type="button" onClick={toggleCustomerOverride} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
                          {customerOverrideEnabled ? '↺ Use quotation details' : '✎ Override for this invoice'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          ['customerName', 'Name'], ['customerEmail', 'Email'], ['customerPhone', 'Phone'],
                          ['customerAddress', 'Address'], ['customerGstNumber', 'GST Number'], ['destination', 'Place of Supply'],
                        ].map(([field, label]) => (
                          <div key={field}>
                            <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
                            {customerOverrideEnabled ? (
                              <input type="text" value={customerOverrides[field]} onChange={(e) => setCustomerOverrides((prev) => ({ ...prev, [field]: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                            ) : (
                              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{quotationSnapshot[field] || '—'}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewMode === 'view' && selectedInvoice && (
                    <div className="rounded-xl border border-slate-200 p-5">
                      <p className="mb-3 text-sm font-semibold text-slate-800">Customer Details</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          ['customerName', 'Name'], ['customerEmail', 'Email'], ['customerPhone', 'Phone'],
                          ['customerAddress', 'Address'], ['customerGstNumber', 'GST Number'], ['destination', 'Place of Supply'],
                        ].map(([field, label]) => (
                          <div key={field}>
                            <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
                            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{selectedInvoice[field] || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Point-form terms — load default, edit, Save/Cancel per section */}
                  <EditableBulletSection
                    icon={ScrollText}
                    title="Payment Terms"
                    subtitle="Shown on the invoice PDF as bullet points"
                    mode="bullets"
                    value={viewMode === 'view' ? (selectedInvoice?.paymentTerms || '') : formData.paymentTerms}
                    onSave={(v) => handleSectionSave('paymentTerms', v)}
                    saving={sectionSaving === 'paymentTerms'}
                  />
                  <EditableBulletSection
                    icon={ScrollText}
                    title="Payment Instructions"
                    subtitle="Shown below the bank details on the invoice PDF"
                    mode="bullets"
                    value={viewMode === 'view' ? (selectedInvoice?.paymentInstructions || '') : formData.paymentInstructions}
                    onSave={(v) => handleSectionSave('paymentInstructions', v)}
                    saving={sectionSaving === 'paymentInstructions'}
                  />
                  <EditableBulletSection
                    icon={StickyNote}
                    title="Notes"
                    subtitle="Internal — not shown on the invoice PDF"
                    mode="text"
                    value={viewMode === 'view' ? (selectedInvoice?.notes || '') : formData.notes}
                    onSave={(v) => handleSectionSave('notes', v)}
                    saving={sectionSaving === 'notes'}
                  />

                  {viewMode === 'create' ? (
                    <button
                      onClick={handleCreateFromQuotation}
                      disabled={creating || !formData.quotation}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {creating ? 'Creating…' : 'Create Invoice'}
                    </button>
                  ) : (
                    <>
                      {/* Delivery */}
                      <div className="rounded-xl border border-slate-200 p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Send via</p>
                        <div className="mb-3 inline-flex rounded-lg border border-slate-200 p-1">
                          <ChannelTab active={channel === 'email'} onClick={() => setChannel('email')} icon={Mail} label="Email" />
                          <ChannelTab active={channel === 'whatsapp'} onClick={() => setChannel('whatsapp')} icon={MessageCircle} label="WhatsApp" />
                        </div>
                        {channel === 'email' ? (
                          <input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="recipient@email.com" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                        ) : (
                          <input type="tel" value={sendPhone} onChange={(e) => setSendPhone(e.target.value)} placeholder="+1 555 123 4567" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                        )}
                        <button
                          onClick={handleSend}
                          disabled={sending}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {sending ? 'Sending…' : `Send via ${channel === 'email' ? 'Email' : 'WhatsApp'}`}
                        </button>
                      </div>

                      <button
                        onClick={() => setShowPDFPreview(true)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" /> Preview PDF
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 px-6 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Close
          </button>
        </div>
      </div>

      {showPDFPreview && invoiceId && (
        <PDFPreviewDialog
          isOpen={showPDFPreview}
          onClose={() => setShowPDFPreview(false)}
          pdfUrl={`/billing/invoices/${invoiceId}/pdf`}
          documentName="Invoice"
          onDownload
        />
      )}
    </div>
  );
};

export default InvoiceDialog;
