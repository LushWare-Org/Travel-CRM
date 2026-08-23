import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, Package, Loader2, RefreshCw, Mail, MessageCircle,
  Eye, Send, Pencil, CheckCircle2, MapPin, Users, Calendar, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from '@/lib/toast';
import Swal from 'sweetalert2';
import { leadAPI, quotationAPI, packageAPI } from '../../../../services/api';
import PDFPreviewDialog from '@/components/shared/PdfPreview';
import { Row, ChannelTab } from '../shared/BillingPrimitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', LKR: 'Rs ' };
const MANUAL_LABEL = 'Manual Itinerary';

const formatMoney = (amount: number | string | null | undefined, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const selectionLabel = (sel: any) => (sel?.isManual ? MANUAL_LABEL : sel?.packageName || 'Package');

interface Lead {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  primarySelectionId?: string;
  destination?: string;
  numberOfTravelers?: number;
  travelDate?: string;
  endDate?: string;
}

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
  onEditLead?: (lead: Lead, selectionId: string | null) => void;
  initialSelectionId?: string;
}

/**
 * Read-only quotation sender. Picks a package the lead is considering, shows a
 * summary + final price, generates/links a versioned billing quotation, and
 * delivers it by email or WhatsApp. Detail edits are delegated to the lead
 * editor via `onEditLead`.
 */
const QuotationModal = ({ isOpen, onClose, lead, onSuccess, onEditLead, initialSelectionId }: QuotationModalProps) => {
  const leadId = lead?.id || lead?._id;

  const [selections, setSelections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quoteIds, setQuoteIds] = useState<Record<string, string>>({}); // selectionId -> current quotation id
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);

  // The selected package's own destination — locked in at package creation,
  // so it's the authoritative source unless a rep explicitly overrides it
  // below (with confirmation, since that's a deliberate deviation).
  const [activePackage, setActivePackage] = useState<any>(null);
  const [destinationDraft, setDestinationDraft] = useState('');
  const [savingDestination, setSavingDestination] = useState(false);

  const loadSelections = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await leadAPI.getPackageSelections(leadId);
      const list = res?.data || [];
      setSelections(list);
      setQuoteIds(Object.fromEntries(list.filter((s: any) => s.currentQuoteId).map((s: any) => [s.id, s.currentQuoteId])));
      const preferred = list.find((s: any) => s.id === initialSelectionId)
        || list.find((s: any) => s.id === lead?.primarySelectionId)
        || list[0];
      setActiveId(preferred ? preferred.id : null);
    } catch (err: any) {
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

  useEffect(() => {
    if (!activeSelection?.packageId) {
      setActivePackage(null);
      return;
    }
    let cancelled = false;
    packageAPI.getById(activeSelection.packageId)
      .then((res: any) => { if (!cancelled) setActivePackage(res?.data || null); })
      .catch(() => { if (!cancelled) setActivePackage(null); });
    return () => { cancelled = true; };
  }, [activeSelection?.packageId]);

  // Same precedence as the backend's quotation snapshot: rep override wins,
  // then the package's own (locked-in-at-creation) destination, then the
  // lead's own inquiry-stage destination as a last resort.
  const packageDestination = activePackage?.destination || null;
  const resolvedDestination = activeSelection?.destinationOverride || packageDestination || lead?.destination || '';

  useEffect(() => {
    setDestinationDraft(resolvedDestination);
  }, [activeSelection?.id, resolvedDestination]);

  const destinationDirty = destinationDraft.trim() !== resolvedDestination.trim();

  const handleSaveDestination = async () => {
    if (!activeSelection || !leadId) return;
    const trimmed = destinationDraft.trim();
    const packageDest = (packageDestination || '').trim();
    const isRealOverride = Boolean(packageDest) && Boolean(trimmed) && trimmed !== packageDest;

    const commit = async () => {
      setSavingDestination(true);
      try {
        const res = await leadAPI.updatePackageSelection(leadId, activeSelection.id, {
          destinationOverride: trimmed || null,
        });
        const updated = res?.data;
        setSelections((prev) => prev.map((s) => (
          s.id === activeSelection.id
            ? { ...s, destinationOverride: updated?.destinationOverride ?? (trimmed || null) }
            : s
        )));
        toast.success('Destination updated');
      } catch (err: any) {
        toast.error(err.message || 'Failed to update destination');
      } finally {
        setSavingDestination(false);
      }
    };

    if (isRealOverride) {
      const result = await Swal.fire({
        title: 'Override the package destination?',
        html: `This quote will show <strong>${trimmed}</strong> instead of the package's own destination (<strong>${packageDest}</strong>).`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, override',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0f766e',
      });
      if (!result.isConfirmed) return;
    }
    await commit();
  };

  const handleGenerate = async () => {
    if (!activeSelection || !leadId) return;
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
    } catch (err: any) {
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to send quotation');
    } finally {
      setSending(false);
    }
  };

  if (!lead) return null;

  const generating = generatingId === activeId;
  const tripMeta: { icon: LucideIcon; text: string }[] = [
    lead.numberOfTravelers ? { icon: Users, text: `${lead.numberOfTravelers} traveller${lead.numberOfTravelers > 1 ? 's' : ''}` } : null,
    (formatDate(lead.travelDate) || formatDate(lead.endDate)) ? {
      icon: Calendar,
      text: [formatDate(lead.travelDate), formatDate(lead.endDate)].filter(Boolean).join(' → '),
    } : null,
  ].filter(Boolean) as { icon: LucideIcon; text: string }[];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 space-y-0">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-foreground/20 p-2"><FileText className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-primary-foreground">Send Quotation</DialogTitle>
                <DialogDescription className="text-primary-foreground/80">{lead.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading packages…
              </div>
            ) : selections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
                <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p>No packages attached to this lead yet.</p>
                <Button onClick={() => onEditLead?.(lead, null)} className="mt-4">
                  <Pencil className="h-4 w-4" /> Add a package
                </Button>
              </div>
            ) : (
              <>
                {/* Package selector */}
                <div className="mb-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Package</p>
                  <div className="flex flex-wrap gap-2">
                    {selections.map((sel) => {
                      const isActive = sel.id === activeId;
                      const quoted = Boolean(quoteIds[sel.id]);
                      return (
                        <button
                          key={sel.id}
                          onClick={() => setActiveId(sel.id)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                            isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-ring'
                          }`}
                        >
                          {sel.isManual ? <FileText className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                          {selectionLabel(sel)}
                          {quoted && <CheckCircle2 className="h-4 w-4 text-success" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{selectionLabel(activeSelection)}</h3>
                      {tripMeta.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {tripMeta.map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5"><m.icon className="h-3.5 w-3.5" />{m.text}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {activeQuoteId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Quoted
                      </span>
                    )}
                  </div>

                  {/* Destination — defaults to the package's own (locked-in-at-creation)
                      destination; editing it away from that requires confirmation. */}
                  <div className="mt-3 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <Input
                      type="text"
                      value={destinationDraft}
                      onChange={(e) => setDestinationDraft(e.target.value)}
                      placeholder="No destination set"
                      aria-label="Quote destination"
                      className="flex-1"
                    />
                    {destinationDirty && (
                      <Button size="sm" onClick={handleSaveDestination} disabled={savingDestination}>
                        {savingDestination ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    )}
                  </div>

                  {/* Itinerary at a glance */}
                  {activeSelection?.itineraryDays?.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itinerary at a glance</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {activeSelection.itineraryDays.slice(0, 6).map((day: any, i: number) => (
                          <li key={day.id || i} className="flex gap-2">
                            <span className="font-medium text-muted-foreground/70">D{day.dayNumber || i + 1}</span>
                            <span className="truncate">{day.title || 'Day plan'}</span>
                          </li>
                        ))}
                        {activeSelection.itineraryDays.length > 6 && (
                          <li className="text-xs text-muted-foreground">+{activeSelection.itineraryDays.length - 6} more days</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="mt-4 border-t border-border pt-4">
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
                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                          <span className="text-base font-semibold text-foreground">Total</span>
                          <span className="text-lg font-bold text-primary">{formatMoney(pricing.totalAmount, currency)}</span>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-warning">
                        No pricing yet for this package. Use <strong>Edit details</strong> to set it up.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={handleGenerate} disabled={generating || !pricing}>
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {activeQuoteId ? 'Update quotation' : 'Generate quotation'}
                    </Button>
                    <Button variant="outline" onClick={() => setPreviewQuoteId(activeQuoteId)} disabled={!activeQuoteId}>
                      <Eye className="h-4 w-4" /> Preview PDF
                    </Button>
                    <Button variant="outline" onClick={() => onEditLead?.(lead, activeSelection?.id ?? null)}>
                      <Pencil className="h-4 w-4" /> Edit details
                    </Button>
                  </div>
                </div>

                {/* Delivery */}
                <div className="mt-5 rounded-xl border border-border p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Send via</p>
                  <div className="mb-3 inline-flex rounded-lg border border-border p-1">
                    <ChannelTab active={channel === 'email'} onClick={() => setChannel('email')} icon={Mail} label="Email" />
                    <ChannelTab active={channel === 'whatsapp'} onClick={() => setChannel('whatsapp')} icon={MessageCircle} label="WhatsApp" />
                  </div>
                  {channel === 'email' ? (
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="recipient@email.com" />
                  ) : (
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
                  )}
                  <Button onClick={handleSend} disabled={sending || !activeQuoteId} className="mt-3 w-full">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {activeQuoteId ? `Send via ${channel === 'email' ? 'Email' : 'WhatsApp'}` : 'Generate a quotation first'}
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      {previewQuoteId && (
        <PDFPreviewDialog
          isOpen={Boolean(previewQuoteId)}
          onClose={() => setPreviewQuoteId(null)}
          pdfUrl={`/billing/quotations/${previewQuoteId}/pdf`}
          documentName="Quotation preview"
        />
      )}
    </>
  );
};

export default QuotationModal;
