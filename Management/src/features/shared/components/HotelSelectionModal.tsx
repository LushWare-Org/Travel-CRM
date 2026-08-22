import { useState, useEffect } from 'react';
import {
  Search, MapPin, RefreshCw, Loader2, Star,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Users, Info, CheckCircle2, Building2, Phone, Bed,
} from 'lucide-react';
import HotelService from '../../../services/hotel.service';
import toast from 'react-hot-toast';
import CountrySelect from '../../../components/CountrySelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Card } from '../../../components/ui/card';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════
type HotelBookingStep = 'form' | 'results' | 'guests' | 'review' | 'confirming' | 'confirmed';

interface HotelRate {
  offerId?: string;
  totalAmount?: number;
  currency?: string;
  roomType?: string;
  boardType?: string;
  refundable?: boolean;
}

interface Hotel {
  hotelId?: string;
  name?: string;
  images?: string[];
  starRating?: number;
  rating?: number;
  address?: string;
  contactNumber?: string;
  description?: string;
  cheapestRate?: HotelRate;
}

interface Guest {
  firstName: string;
  lastName: string;
  title: string;
}

interface HotelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'suggest' | 'search';

  // Suggest mode
  onSelectHotel?: (hotel: Hotel) => void;
  destination?: string;
  packageType?: string;
  category?: string;
  locations?: string[];

  // Search/booking mode
  onBookHotel?: (booking: any) => void;
  initialCheckin?: string;
  initialCheckout?: string;
  travelers?: number;
  leadContext?: Record<string, any>;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };

function fmtDate(iso?: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(amount?: number, currency?: string) {
  if (amount == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
}

function StarRating({ rating, showEmpty = true }: { rating?: number; showEmpty?: boolean }) {
  const hasRating = rating != null && rating > 0;
  if (!hasRating && !showEmpty) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${hasRating && i < Math.round(rating!) ? 'fill-warning text-warning' : 'text-muted'}`}
        />
      ))}
      {!hasRating && (
        <span className="text-xs text-muted-foreground ml-1">—</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Hotel Card with expandable details
// ═══════════════════════════════════════════════════════════════════
function HotelCard({ hotel, isBest, rank, onSelect, mode }: { hotel: Hotel; isBest: boolean; rank: number; onSelect: (hotel: Hotel) => void; mode: 'suggest' | 'search' }) {
  const [expanded, setExpanded] = useState(false);
  const rate = hotel.cheapestRate || {};

  return (
    <Card className={`overflow-hidden ${isBest ? 'ring-success/40 bg-success/5' : 'hover:ring-primary/30'}`}>
      {/* Main row — always visible */}
      <div className="px-4 flex items-start gap-4">
        {/* Image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
          {hotel.images?.[0] ? (
            <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Building2 className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
              {isBest ? '★' : rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground truncate">{hotel.name}</h4>
                {isBest && (
                  <Badge className="bg-success text-success-foreground border-transparent">Best Match</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={hotel.starRating} />
                {hotel.starRating != null && hotel.starRating > 0 && (
                  <span className="text-xs text-muted-foreground">{hotel.starRating}-star</span>
                )}
              </div>
              {hotel.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" /> {hotel.address}
                </p>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Hide details</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> View details</>
            )}
          </button>
        </div>

        {/* Price + CTA */}
        <div className="text-right shrink-0">
          {rate.totalAmount != null ? (
            <>
              <div className="text-lg font-bold text-foreground font-mono tabular-nums">{fmtMoney(rate.totalAmount, rate.currency)}</div>
              <div className="text-xs text-muted-foreground">per night</div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">Price on request</div>
          )}
          <Button
            className="mt-2"
            variant={isBest ? 'default' : 'default'}
            onClick={(e) => { e.stopPropagation(); onSelect(hotel); }}
          >
            {mode === 'search' ? 'Book' : isBest ? 'Select Best' : 'Select'}
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 mt-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {hotel.address && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{hotel.address}</span>
              </div>
            )}
            {hotel.contactNumber && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{hotel.contactNumber}</span>
              </div>
            )}
            {rate.roomType && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Bed className="w-3.5 h-3.5 shrink-0" />
                <span>Room: {rate.roomType}</span>
              </div>
            )}
            {rate.boardType && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Board: {rate.boardType}</span>
              </div>
            )}
            {rate.refundable && (
              <div className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Refundable</span>
              </div>
            )}
            {hotel.rating != null && hotel.rating > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Star className="w-3.5 h-3.5 text-warning shrink-0" />
                <span>Rating: {parseFloat(String(hotel.rating)).toFixed(1)} / 5</span>
              </div>
            )}
          </div>
          {hotel.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{hotel.description}</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════
export default function HotelSelectionModal({
  isOpen,
  onClose,
  mode = 'suggest',

  // Suggest mode
  onSelectHotel,
  destination = '',
  onBookHotel,
  initialCheckin,
  initialCheckout,
  travelers: initialTravelers = 1,
  leadContext = {},
}: HotelSelectionModalProps) {
  const isSuggestMode = mode === 'suggest';

  // ── Search form ─────────────────────────────────────────────────
  const [searchForm, setSearchForm] = useState({
    city: '',
    country: 'LK',
    checkin: initialCheckin || todayStr(),
    checkout: initialCheckout || tomorrowStr(),
    adults: typeof initialTravelers === 'number' ? initialTravelers : 1,
    children: 0,
    currency: 'USD',
  });
  const [searchResults, setSearchResults] = useState<Hotel[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bestMatch] = useState<Hotel | null>(null);

  // ── Booking flow (search mode only) ─────────────────────────────
  const [bookingStep, setBookingStep] = useState<HotelBookingStep>('form');
  const [selectedOffer, setSelectedOffer] = useState<Hotel | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const paxCount = searchForm.adults + searchForm.children;

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
      setBookingStep('form');
      setSelectedOffer(null);
      setConfirmedBooking(null);
      // Pre-fill city from destination
      if (destination) {
        setSearchForm(prev => ({
          ...prev,
          city: typeof destination === 'string' ? destination : '',
          checkin: initialCheckin || todayStr(),
          checkout: initialCheckout || tomorrowStr(),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const performSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchForm.city && !destination) {
      toast.error('Please enter a city or destination');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setSearchResults([]);
    setSearchError(null);
    setBookingStep('results');

    try {
      // Both modes use the real hotel search API for concrete results
      const searchCity = searchForm.city || destination || '';
      const response = await HotelService.search({
        city: searchCity || undefined,
        country: searchForm.country,
        checkin: searchForm.checkin,
        checkout: searchForm.checkout,
        occupancies: [{ adults: searchForm.adults, children: searchForm.children || 0 }],
        currency: searchForm.currency,
        guestNationality: searchForm.country,
        limit: 20,
      });
      const data = response.data || [];
      setSearchResults(data);
      if (!data.length) toast('No hotels found', { icon: '🏨' });
    } catch (error: any) {
      setSearchError(error.message || 'Search failed');
      toast.error(error.message || 'Hotel search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (hotel: Hotel) => {
    if (isSuggestMode) {
      onSelectHotel?.(hotel);
      onClose();
    } else {
      setSelectedOffer(hotel);
      setGuests(Array.from({ length: paxCount }, () => ({ firstName: '', lastName: '', title: 'Mr' })));
      setBookingStep('guests');
    }
  };

  const handleBook = async () => {
    setBooking(true);
    try {
      const offerId = selectedOffer?.cheapestRate?.offerId;
      const pre = await HotelService.prebook({ offerId: offerId || 'mock-offer' });
      const bookPayload = {
        prebookId: pre.data?.prebookId || 'mock-prebook-id',
        guests,
        contact,
        offer: selectedOffer,
        ...leadContext,
      };
      const response = leadContext.leadId
        ? await HotelService.bookWithContext(bookPayload)
        : await HotelService.book(bookPayload);
      setConfirmedBooking(response.data);
      setBookingStep('confirmed');
      onBookHotel?.(response.data);
      toast.success('Hotel booked');
    } catch (err: any) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {bookingStep === 'confirmed'
              ? 'Booking Confirmed'
              : bookingStep === 'guests' || bookingStep === 'review'
                ? 'Complete Booking'
                : 'Search Hotels'}
          </DialogTitle>
          <DialogDescription>
            {isSuggestMode
              ? 'Select a hotel for this itinerary day'
              : bookingStep === 'confirmed'
                ? 'Hotel booked successfully'
                : 'Search and book hotels worldwide'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ═══════ SEARCH FORM ═══════ */}
          {(bookingStep === 'form' || (isSuggestMode && bookingStep === 'results' && searchResults.length === 0 && !searching)) && (
            <form onSubmit={performSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {isSuggestMode ? 'City / Destination' : 'City'}
                  </label>
                  <Input
                    value={searchForm.city}
                    onChange={(e) => setSearchForm({ ...searchForm, city: e.target.value })}
                    placeholder={isSuggestMode ? (destination || 'e.g. Colombo, Dubai') : 'e.g. Colombo, Dubai'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Country</label>
                  <CountrySelect
                    value={searchForm.country}
                    onChange={(code: string) => setSearchForm({ ...searchForm, country: code })}
                    placeholder="Search country..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Check-in</label>
                  <Input type="date" value={searchForm.checkin} min={todayStr()}
                    onChange={(e) => setSearchForm({ ...searchForm, checkin: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Check-out</label>
                  <Input type="date" value={searchForm.checkout} min={searchForm.checkin || todayStr()}
                    onChange={(e) => setSearchForm({ ...searchForm, checkout: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Guests</label>
                  <div className="flex gap-1">
                    <Select value={String(searchForm.adults)} onValueChange={(value) => setSearchForm({ ...searchForm, adults: Number(value) })}>
                      <SelectTrigger className="flex-1 w-full">
                        <SelectValue>{(value: string) => `${value} adult${Number(value) > 1 ? 's' : ''}`}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9].map(n => <SelectItem key={n} value={String(n)}>{n} adult{n>1?'s':''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={String(searchForm.children)} onValueChange={(value) => setSearchForm({ ...searchForm, children: Number(value) })}>
                      <SelectTrigger className="flex-1 w-full">
                        <SelectValue>{(value: string) => `${value} child${Number(value) !== 1 ? 'ren' : ''}`}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {[0,1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} child{n!==1?'ren':''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {searching ? 'Searching...' : isSuggestMode ? 'Find Hotels' : 'Search Hotels'}
              </Button>
            </form>
          )}

          {/* ═══════ RESULTS ═══════ */}
          {(bookingStep === 'results' && !isSuggestMode) || (isSuggestMode && bookingStep === 'results') ? (
            <>
              {searching && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">{isSuggestMode ? 'Finding best hotels...' : 'Searching hotels...'}</p>
                </div>
              )}

              {searchError && !searching && (
                <div className="text-center py-8">
                  <p className="text-destructive mb-3">{searchError}</p>
                  <Button variant="ghost" size="sm" onClick={() => performSearch()}>Try again</Button>
                </div>
              )}

              {!searching && !searchError && searchResults.length === 0 && hasSearched && (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No hotels found. Try a different city or dates.</p>
                </div>
              )}

              {!searching && !searchError && searchResults.length > 0 && (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-foreground">{searchResults.length} hotel{searchResults.length !== 1 ? 's' : ''} found</h3>
                    <Button variant="outline" size="sm" disabled={searching} onClick={() => performSearch()}>
                      <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} /> Search Again
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {searchResults.map((hotel, i) => (
                      <HotelCard
                        key={hotel.hotelId || hotel.name || i}
                        hotel={hotel}
                        isBest={Boolean(isSuggestMode && bestMatch && hotel.name === bestMatch.name)}
                        rank={i + 1}
                        onSelect={handleSelect}
                        mode={mode}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}

          {/* ═══════ GUEST DETAILS (search mode) ═══════ */}
          {!isSuggestMode && bookingStep === 'guests' && selectedOffer && (
            <>
              <Button variant="ghost" size="sm" className="mb-4" onClick={() => setBookingStep('results')}>
                <ChevronLeft className="w-4 h-4" /> Back to results
              </Button>
              <div className="bg-muted rounded-lg p-3 mb-4">
                <div className="font-semibold text-sm text-foreground">{selectedOffer.name}</div>
                <StarRating rating={selectedOffer.starRating} />
                <div className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">{fmtMoney(selectedOffer.cheapestRate?.totalAmount, selectedOffer.cheapestRate?.currency)}</div>
              </div>
              <h3 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Guest Details
              </h3>
              {guests.map((g, i) => (
                <div key={i} className="border border-border rounded-lg p-3 mb-2">
                  <div className="text-sm font-semibold text-foreground mb-2">Guest {i + 1}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={g.title} onValueChange={(value) => {
                      setGuests(prev => prev.map((g2, idx) => idx === i ? { ...g2, title: String(value) } : g2));
                    }}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Mr', 'Mrs', 'Ms', 'Miss'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="First name *" value={g.firstName}
                      onChange={(e) => setGuests(prev => prev.map((g2, idx) => idx === i ? { ...g2, firstName: e.target.value } : g2))} />
                    <Input placeholder="Last name *" value={g.lastName}
                      onChange={(e) => setGuests(prev => prev.map((g2, idx) => idx === i ? { ...g2, lastName: e.target.value } : g2))} />
                  </div>
                </div>
              ))}
              <div className="border border-border rounded-lg p-3 mb-4">
                <div className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" /> Contact
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  <Input placeholder="Email *" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  <Input placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
              </div>
              <Button onClick={() => {
                for (const g of guests) {
                  if (!g.firstName || !g.lastName) { toast.error('Every guest needs a first and last name'); return; }
                }
                if (!contact.email) { toast.error('Contact email is required'); return; }
                setBookingStep('review');
              }}>
                Review <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* ═══════ REVIEW + CONFIRM ═══════ */}
          {!isSuggestMode && bookingStep === 'review' && selectedOffer && (
            <>
              <Button variant="ghost" size="sm" className="mb-4" onClick={() => setBookingStep('guests')}>
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <h3 className="text-lg font-semibold text-foreground mb-3">Review & Confirm</h3>
              <div className="bg-muted rounded-lg p-3 mb-3">
                <div className="font-semibold text-foreground">{selectedOffer.name}</div>
                <p className="text-sm text-muted-foreground">{fmtDate(searchForm.checkin)} → {fmtDate(searchForm.checkout)} · {guests.length} guest{guests.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Guests</div>
                {guests.map((g, i) => <div key={i} className="text-sm text-foreground">{g.title} {g.firstName} {g.lastName}</div>)}
              </div>
              <div className="border-t border-border pt-3 mb-4">
                <div className="flex justify-between text-lg font-bold text-foreground">
                  <span>Total</span><span className="font-mono tabular-nums">{fmtMoney(selectedOffer.cheapestRate?.totalAmount, selectedOffer.cheapestRate?.currency)}</span>
                </div>
              </div>
              <Button onClick={handleBook} disabled={booking}>
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {booking ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </>
          )}

          {/* ═══════ CONFIRMED ═══════ */}
          {!isSuggestMode && bookingStep === 'confirmed' && confirmedBooking && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Booking Confirmed</h3>
              <p className="text-muted-foreground mb-4">{confirmedBooking.hotelName || 'Hotel'} · {confirmedBooking.id}</p>
              <Button onClick={onClose}>Done</Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center -mx-4 -mb-4 mt-2 px-4 py-3 border-t bg-muted/50 rounded-b-xl">
          Search powered by hotel provider API.
        </p>
      </DialogContent>
    </Dialog>
  );
}
