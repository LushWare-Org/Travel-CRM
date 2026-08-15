import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, FileText, Package, Loader2, RefreshCw, Mail, MessageCircle,
  Eye, Send, Pencil, CheckCircle2, MapPin, Users, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI, quotationAPI } from '../../../../services/api';
import PDFPreviewDialog from '../PDFPreviewDialog';
import { Row, ChannelTab } from '../shared/BillingPrimitives';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', LKR: 'Rs ' };
const MANUAL_LABEL = 'Manual Itinerary';

const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const selectionLabel = (sel) => (sel.isManual ? MANUAL_LABEL : sel.packageName || 'Package');

/**
 * Read-only quotation sender. Picks a package the lead is considering, shows a
 * summary + final price, generates/links a versioned billing quotation, and
 * delivers it by email or WhatsApp. Detail edits are delegated to the lead
 * editor via `onEditLead`.
 */
const QuotationModal = ({ isOpen, onClose, lead, onSuccess, onEditLead, initialSelectionId }) => {
  const leadId = lead?.id || lead?._id;

  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [quoteIds, setQuoteIds] = useState({}); // selectionId → current quotation id
  const [generatingId, setGeneratingId] = useState(null);
  const [sending, setSending] = useState(false);

  const [channel, setChannel] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [previewQuoteId, setPreviewQuoteId] = useState(null);

  const loadSelections = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await leadAPI.getPackageSelections(leadId);
      const list = res?.data || [];
      setSelections(list);
      setQuoteIds(Object.fromEntries(list.filter((s) => s.currentQuoteId).map((s) => [s.id, s.currentQuoteId])));
      const preferred = list.find((s) => s.id === initialSelectionId)
        || list.find((s) => s.id === lead?.primarySelectionId)
        || list[0];
      setActiveId(preferred ? preferred.id : null);
    } catch (err) {
      toast.error(err.message || 'Failed to load packages for this lead');
      setSelections([]);
    } finally {
      setLoading(false);
    }
  }, [leadId, lead?.primarySelectionId, initialSelectionId]);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(lead?.email || '');
    setPhone(lead?.whatsapp || lead?.phone || '');
    setChannel('email');
    setPreviewQuoteId(null);
    loadSelections();
  }, [isOpen, lead, loadSelections]);

  const activeSelection = useMemo(
    () => selections.find((s) => s.id === activeId) || null,
    [selections, activeId],
  );
  const activeQuoteId = activeId ? quoteIds[activeId] : null;
  const pricing = activeSelection?.pricing || null;
  const currency = pricing?.currency || 'USD';

  const handleGenerate = async () => {
    if (!activeSelection) return;
    setGeneratingId(activeSelection.id);
    try {
      const res = await leadAPI.quotePackageSelection(leadId, activeSelection.id);
      const quotation = res?.data?.quotation;
      const updatedSelection = res?.data?.selection;
      if (quotation?.id) {
        setQuoteIds((prev) => ({ ...prev, [activeSelection.id]: quotation.id }));
      }
      if (updatedSelection) {
        setSelections((prev) => prev.map((s) => (s.id === updatedSelection.id ? updatedSelection : s)));
      }
      toast.success('Quotation generated');
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Failed to generate quotation');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSend = async () => {
    if (!activeQuoteId) return;
    const recipient = channel === 'email' ? email.trim() : phone.trim();
    if (!recipient) {
      toast.error(channel === 'email' ? 'Enter a recipient email' : 'Enter a WhatsApp number');
      return;
    }
    setSending(true);
    try {
      const payload = channel === 'email' ? { channel, email: recipient } : { channel, phone: recipient };
      await quotationAPI.send(activeQuoteId, payload);
      toast.success(channel === 'email' ? 'Quotation emailed' : 'Quotation sent via WhatsApp');
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Failed to send quotation');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !lead) return null;

  const generating = generatingId === activeId;
  const tripMeta = [
    lead.destination && { icon: MapPin, text: lead.destination },
    lead.numberOfTravelers && { icon: Users, text: `${lead.numberOfTravelers} traveller${lead.numberOfTravelers > 1 ? 's' : ''}` },
    (formatDate(lead.travelDate) || formatDate(lead.endDate)) && {
      icon: Calendar,
      text: [formatDate(lead.travelDate), formatDate(lead.endDate)].filter(Boolean).join(' → '),
    },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-500 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2"><FileText className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-semibold">Send Quotation</h2>
              <p className="text-sm text-teal-50">{lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading packages…
            </div>
          ) : selections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500">
              <Package className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p>No packages attached to this lead yet.</p>
              <button
                onClick={() => onEditLead?.(lead, null)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <Pencil className="h-4 w-4" /> Add a package
              </button>
            </div>
          ) : (
            <>
              {/* Package selector */}
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Package</p>
                <div className="flex flex-wrap gap-2">
                  {selections.map((sel) => {
                    const isActive = sel.id === activeId;
                    const quoted = Boolean(quoteIds[sel.id]);
                    return (
                      <button
                        key={sel.id}
                        onClick={() => setActiveId(sel.id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'border-teal-600 bg-teal-50 text-teal-800'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {sel.isManual ? <FileText className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                        {selectionLabel(sel)}
                        {quoted && <CheckCircle2 className="h-4 w-4 text-emerald-500" title="Quoted" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">{selectionLabel(activeSelection)}</h3>
                    {tripMeta.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        {tripMeta.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5"><m.icon className="h-3.5 w-3.5" />{m.text}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {activeQuoteId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Quoted
                    </span>
                  )}
                </div>

                {/* Itinerary at a glance */}
                {activeSelection?.itineraryDays?.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Itinerary at a glance</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {activeSelection.itineraryDays.slice(0, 6).map((day, i) => (
                        <li key={day.id || i} className="flex gap-2">
                          <span className="font-medium text-slate-400">D{day.dayNumber || i + 1}</span>
                          <span className="truncate">{day.title || 'Day plan'}</span>
                        </li>
                      ))}
                      {activeSelection.itineraryDays.length > 6 && (
                        <li className="text-xs text-slate-400">+{activeSelection.itineraryDays.length - 6} more days</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Pricing */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {pricing ? (
                    <dl className="space-y-1.5 text-sm">
                      <Row label="Subtotal" value={formatMoney(pricing.sellSubtotal, currency)} />
                      {Number(pricing.discountAmount) > 0 && (
                        <Row label="Discount" value={`- ${formatMoney(pricing.discountAmount, currency)}`} />
                      )}
                      {Number(pricing.taxAmount) > 0 && <Row label="Tax" value={formatMoney(pricing.taxAmount, currency)} />}
                      {Number(pricing.serviceChargeAmount) > 0 && (
                        <Row label="Service charge" value={formatMoney(pricing.serviceChargeAmount, currency)} />
                      )}
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-base font-semibold text-slate-800">Total</span>
                        <span className="text-lg font-bold text-teal-700">{formatMoney(pricing.totalAmount, currency)}</span>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-amber-600">
                      No pricing yet for this package. Use <strong>Edit details</strong> to set it up.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !pricing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {activeQuoteId ? 'Update quotation' : 'Generate quotation'}
                  </button>
                  <button
                    onClick={() => setPreviewQuoteId(activeQuoteId)}
                    disabled={!activeQuoteId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Eye className="h-4 w-4" /> Preview PDF
                  </button>
                  <button
                    onClick={() => onEditLead?.(lead, activeSelection?.id ?? null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" /> Edit details
                  </button>
                </div>
              </div>

              {/* Delivery */}
              <div className="mt-5 rounded-xl border border-slate-200 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Send via</p>
                <div className="mb-3 inline-flex rounded-lg border border-slate-200 p-1">
                  <ChannelTab active={channel === 'email'} onClick={() => setChannel('email')} icon={Mail} label="Email" />
                  <ChannelTab active={channel === 'whatsapp'} onClick={() => setChannel('whatsapp')} icon={MessageCircle} label="WhatsApp" />
                </div>
                {channel === 'email' ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recipient@email.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                ) : (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                )}
                <button
                  onClick={handleSend}
                  disabled={sending || !activeQuoteId}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {activeQuoteId ? `Send via ${channel === 'email' ? 'Email' : 'WhatsApp'}` : 'Generate a quotation first'}
                </button>
              </div>
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

      {previewQuoteId && (
        <PDFPreviewDialog
          isOpen={Boolean(previewQuoteId)}
          onClose={() => setPreviewQuoteId(null)}
          pdfUrl={`/billing/quotations/${previewQuoteId}/pdf`}
          documentName={`Quotation preview`}
        />
      )}
    </div>
  );
};

export default QuotationModal;
