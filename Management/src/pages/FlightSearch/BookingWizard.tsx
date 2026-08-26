import { ChevronLeft, ChevronRight, Info, Users, AlertCircle, CheckCircle2, Loader2, Copy, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { fmtDate, fmtMoney } from './helpers';
import type { ContactForm, FlightOffer, TravelerForm, TravelerType } from './types';

const TRAVELER_TYPE_LABEL: Record<TravelerType, string> = { adult: 'Adults', child: 'Children', infant: 'Infants' };
const GENDER_LABEL: Record<string, string> = { M: 'Male', F: 'Female' };

// ── Flight summary bar (shared by the traveler-details and review steps) ──
function FlightSummary({ offer }: { offer: FlightOffer }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {offer.airlineCode}
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{offer.airline} · {offer.cabinClass}</div>
        <div className="text-xs text-muted-foreground">
          {(offer.segments || []).map((s, i) => (
            <span key={i}>
              {s.origin} → {s.destination}
              {i < (offer.segments || []).length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="ml-auto text-right">
        <div className="font-mono text-lg font-bold tabular-nums text-foreground">{fmtMoney(offer.fareTotal, offer.currency)}</div>
        <div className="text-xs text-muted-foreground">total fare</div>
      </div>
    </div>
  );
}

interface TravelerDetailsStepProps {
  selectedOffer: FlightOffer;
  travelers: TravelerForm[];
  updateTraveler: (index: number, field: keyof TravelerForm, value: string) => void;
  contact: ContactForm;
  setContact: (contact: ContactForm) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TravelerDetailsStep({ selectedOffer, travelers, updateTraveler, contact, setContact, onBack, onNext }: TravelerDetailsStepProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-card">
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to results
      </button>

      <FlightSummary offer={selectedOffer} />

      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Users className="h-5 w-5 text-muted-foreground" /> Traveler Details
      </h2>

      {(['adult', 'child', 'infant'] as TravelerType[]).map((type) => {
        const indexes = travelers.map((t, i) => (t.type === type ? i : -1)).filter((i) => i >= 0);
        if (indexes.length === 0) return null;
        return (
          <div key={type} className="mb-5">
            <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
              {TRAVELER_TYPE_LABEL[type]} ({indexes.length})
            </div>
            {indexes.map((idx) => {
              const t = travelers[idx];
              return (
                <div key={idx} className="mb-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/30">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    Traveler {idx + 1}
                    <span className="text-xs font-normal capitalize text-muted-foreground">({t.type})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Select value={t.title} onValueChange={(value) => value && updateTraveler(idx, 'title', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Mr', 'Mrs', 'Ms', 'Miss'].map((x) => (
                          <SelectItem key={x} value={x}>
                            {x}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="First name *"
                      value={t.firstName}
                      onChange={(e) => updateTraveler(idx, 'firstName', e.target.value)}
                    />
                    <Input
                      placeholder="Last name *"
                      value={t.lastName}
                      onChange={(e) => updateTraveler(idx, 'lastName', e.target.value)}
                    />
                    <Input
                      type="date"
                      value={t.dob}
                      onChange={(e) => updateTraveler(idx, 'dob', e.target.value)}
                      title="Date of birth"
                    />
                    {t.type === 'adult' && (
                      <Select value={t.gender || null} onValueChange={(value) => value && updateTraveler(idx, 'gender', value)}>
                        <SelectTrigger>
                          <SelectValue>{(value: string) => GENDER_LABEL[value] || 'Gender *'}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      placeholder="Passport number"
                      value={t.passportNumber}
                      onChange={(e) => updateTraveler(idx, 'passportNumber', e.target.value.toUpperCase())}
                      className="font-mono"
                      maxLength={12}
                    />
                    <Input
                      type="date"
                      value={t.passportExpiry}
                      onChange={(e) => updateTraveler(idx, 'passportExpiry', e.target.value)}
                      title="Passport expiry date"
                    />
                    <Input
                      placeholder="Nationality (e.g. LK)"
                      value={t.nationality}
                      onChange={(e) => updateTraveler(idx, 'nationality', e.target.value.toUpperCase())}
                      maxLength={2}
                    />
                    <Input
                      placeholder="Frequent flyer #"
                      value={t.frequentFlyerNumber}
                      onChange={(e) => updateTraveler(idx, 'frequentFlyerNumber', e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="mb-6 rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Info className="h-4 w-4 text-muted-foreground" /> Contact Details
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          <Input placeholder="Email *" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          <Input placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
        </div>
      </div>

      <Button onClick={onNext}>
        Review Booking <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ReviewStepProps {
  selectedOffer: FlightOffer;
  travelers: TravelerForm[];
  contact: ContactForm;
  booking: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function ReviewStep({ selectedOffer, travelers, contact, booking, onBack, onConfirm }: ReviewStepProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-card">
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to traveler details
      </button>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Review &amp; Confirm</h2>

      <div className="mb-4 rounded-lg bg-muted/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {selectedOffer.airlineCode}
          </div>
          <span className="text-sm font-semibold text-foreground">{selectedOffer.airline} · {selectedOffer.cabinClass}</span>
          {selectedOffer.refundable && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Refundable</span>
          )}
        </div>
        {(selectedOffer.segments || []).map((seg, i) => (
          <div key={i} className="ml-9 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{seg.origin}</span>
            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold text-foreground">{seg.destination}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono tabular-nums">{fmtDate(seg.departureAt)} → {fmtDate(seg.arrivalAt)}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs">{seg.marketingCarrier}{seg.flightNumber?.replace(seg.marketingCarrier ?? '', '')}</span>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Travelers</div>
        {travelers.map((t, i) => (
          <div key={i} className="flex items-center gap-2 py-1 text-sm text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
            {t.title} {t.firstName} {t.lastName}
            <span className="text-xs capitalize text-muted-foreground">({t.type})</span>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Contact</div>
        <div className="text-sm text-foreground">{contact.name} · {contact.email}{contact.phone ? ` · ${contact.phone}` : ''}</div>
      </div>

      <div className="mb-6 border-t border-border pt-4">
        <div className="mb-1 flex justify-between text-sm text-muted-foreground">
          <span>Base fare</span>
          <span className="font-mono tabular-nums">{fmtMoney(selectedOffer.baseFare, selectedOffer.currency)}</span>
        </div>
        <div className="mb-1 flex justify-between text-sm text-muted-foreground">
          <span>Taxes &amp; fees</span>
          <span className="font-mono tabular-nums">{fmtMoney(selectedOffer.taxes, selectedOffer.currency)}</span>
        </div>
        {!selectedOffer.refundable && (
          <div className="mt-2 flex items-center gap-1 text-xs text-warning">
            <AlertCircle className="h-3 w-3" /> This fare is non-refundable
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-lg font-bold text-foreground">
          <span>Total</span>
          <span className="font-mono tabular-nums">{fmtMoney(selectedOffer.fareTotal, selectedOffer.currency)}</span>
        </div>
      </div>

      <Button variant="default" className="bg-success text-success-foreground hover:bg-success/80" disabled={booking} onClick={onConfirm}>
        {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {booking ? 'Booking...' : 'Confirm Booking'}
      </Button>
    </div>
  );
}

interface ConfirmationStepProps {
  pnr: string;
  selectedOffer: FlightOffer | null;
  travelerCount: number;
  onCopyPNR: () => void;
  onNewSearch: () => void;
  onViewBookings: () => void;
}

export function ConfirmationStep({ pnr, selectedOffer, travelerCount, onCopyPNR, onNewSearch, onViewBookings }: ConfirmationStepProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center shadow-card">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-9 w-9 text-success" />
      </div>
      <h2 className="mb-1 text-xl font-bold text-foreground">Booking Confirmed</h2>
      <p className="mb-6 text-muted-foreground">Your flight has been booked successfully</p>

      <div className="mb-6 inline-flex items-center gap-3 rounded-lg bg-muted/50 px-6 py-4">
        <div>
          <div className="mb-0.5 text-xs font-medium uppercase text-muted-foreground">PNR / Record Locator</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-primary">{pnr}</div>
        </div>
        <button type="button" onClick={onCopyPNR} className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10" title="Copy PNR">
          <Copy className="h-4 w-4" />
        </button>
      </div>

      {selectedOffer && (
        <div className="mx-auto mb-6 max-w-md rounded-lg bg-muted/50 p-4 text-left">
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Airline</span><span className="font-medium text-foreground">{selectedOffer.airline}</span></div>
            <div className="flex justify-between"><span>Route</span><span className="font-medium text-foreground">{selectedOffer.segments?.[0]?.origin} → {selectedOffer.segments?.[(selectedOffer.segments?.length ?? 1) - 1]?.destination}</span></div>
            <div className="flex justify-between"><span>Travelers</span><span className="font-mono font-medium tabular-nums text-foreground">{travelerCount}</span></div>
            <div className="flex justify-between"><span>Total</span><span className="font-mono font-medium tabular-nums text-foreground">{fmtMoney(selectedOffer.fareTotal, selectedOffer.currency)}</span></div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button onClick={onNewSearch}>New Search</Button>
        <Button variant="outline" onClick={onViewBookings}>
          View Bookings
        </Button>
      </div>
    </div>
  );
}
