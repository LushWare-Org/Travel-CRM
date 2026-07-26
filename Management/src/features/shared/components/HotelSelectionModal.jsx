import { useState, useEffect } from 'react';
import {
  X, Search, MapPin, RefreshCw, Loader, Loader2, Star,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Users, Info, CheckCircle2, Building2, Phone, Bed,
} from 'lucide-react';
import HotelService from '../../../services/hotel.service';
import toast from 'react-hot-toast';
import { COUNTRIES_PRIORITY } from '../../../data/countries';

const todayStr = () => new Date().toISOString().split('T')[0];
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(amount, currency) {
  if (amount == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
}

function StarRating({ rating, showEmpty = true }) {
  const hasRating = rating != null && rating > 0;
  if (!hasRating && !showEmpty) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${hasRating && i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
      {!hasRating && (
        <span className="text-xs text-gray-400 ml-1">—</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Hotel Card with expandable details
// ═══════════════════════════════════════════════════════════════════
function HotelCard({ hotel, isBest, rank, onSelect, mode }) {
  const [expanded, setExpanded] = useState(false);
  const rate = hotel.cheapestRate || {};

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isBest ? 'border-green-400 bg-green-50/50 shadow-md' : 'border-gray-200 bg-white hover:border-amber-300 hover:shadow-md'
      }`}
    >
      {/* Main row — always visible */}
      <div className="p-4 flex items-start gap-4">
        {/* Image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {hotel.images?.[0] ? (
            <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Building2 className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0 mt-0.5">
              {isBest ? '★' : rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{hotel.name}</h4>
                {isBest && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-500 text-white rounded font-medium shrink-0">Best Match</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={hotel.starRating} />
                {hotel.starRating != null && hotel.starRating > 0 && (
                  <span className="text-xs text-gray-400">{hotel.starRating}-star</span>
                )}
              </div>
              {hotel.address && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" /> {hotel.address}
                </p>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="mt-2 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
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
              <div className="text-lg font-bold text-gray-900">{fmtMoney(rate.totalAmount, rate.currency)}</div>
              <div className="text-xs text-gray-500">per night</div>
            </>
          ) : (
            <div className="text-xs text-gray-400">Price on request</div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(hotel); }}
            className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ${
              isBest ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {mode === 'search' ? 'Book' : isBest ? 'Select Best' : 'Select'}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {hotel.address && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{hotel.address}</span>
              </div>
            )}
            {hotel.contactNumber && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{hotel.contactNumber}</span>
              </div>
            )}
            {rate.roomType && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Bed className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Room: {rate.roomType}</span>
              </div>
            )}
            {rate.boardType && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Board: {rate.boardType}</span>
              </div>
            )}
            {rate.refundable && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Refundable</span>
              </div>
            )}
            {hotel.rating != null && hotel.rating > 0 && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Rating: {parseFloat(hotel.rating).toFixed(1)} / 5</span>
              </div>
            )}
          </div>
          {hotel.description && (
            <p className="text-xs text-gray-500 leading-relaxed">{hotel.description}</p>
          )}
        </div>
      )}
    </div>
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
  packageType,
  category,
  locations = [],

  // Search/booking mode
  onBookHotel,
  initialCheckin,
  initialCheckout,
  travelers: initialTravelers = 1,
  leadContext = {},
}) {
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
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [bestMatch, setBestMatch] = useState(null);

  // ── Booking flow (search mode only) ─────────────────────────────
  const [bookingStep, setBookingStep] = useState('form'); // 'form' | 'results' | 'guests' | 'review' | 'confirming' | 'confirmed'
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [guests, setGuests] = useState([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const paxCount = searchForm.adults + searchForm.children;

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
      setBestMatch(null);
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
  }, [isOpen]);

  if (!isOpen) return null;

  const performSearch = async (e) => {
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
    } catch (error) {
      setSearchError(error.message || 'Search failed');
      toast.error(error.message || 'Hotel search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (hotel) => {
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
      const offerId = selectedOffer.cheapestRate?.offerId;
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
    } catch (err) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-xl font-bold">
              {bookingStep === 'confirmed'
                ? 'Booking Confirmed'
                : bookingStep === 'guests' || bookingStep === 'review'
                  ? 'Complete Booking'
                  : 'Search Hotels'}
            </h2>
            <p className="text-amber-100 text-sm mt-0.5">
              {isSuggestMode
                ? 'Select a hotel for this itinerary day'
                : bookingStep === 'confirmed'
                  ? 'Hotel booked successfully'
                  : 'Search and book hotels worldwide'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* ═══════ SEARCH FORM ═══════ */}
          {(bookingStep === 'form' || (isSuggestMode && bookingStep === 'results' && searchResults.length === 0 && !searching)) && (
            <form onSubmit={performSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {isSuggestMode ? 'City / Destination' : 'City'}
                  </label>
                  <input
                    value={searchForm.city}
                    onChange={(e) => setSearchForm({ ...searchForm, city: e.target.value })}
                    placeholder={isSuggestMode ? (destination || 'e.g. Colombo, Dubai') : 'e.g. Colombo, Dubai'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                  <select value={searchForm.country} onChange={(e) => setSearchForm({ ...searchForm, country: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    {COUNTRIES_PRIORITY.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
                  <input type="date" value={searchForm.checkin} min={todayStr()}
                    onChange={(e) => setSearchForm({ ...searchForm, checkin: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
                  <input type="date" value={searchForm.checkout} min={searchForm.checkin || todayStr()}
                    onChange={(e) => setSearchForm({ ...searchForm, checkout: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Guests</label>
                  <div className="flex gap-1">
                    <select value={searchForm.adults} onChange={(e) => setSearchForm({ ...searchForm, adults: Number(e.target.value) })}
                      className="rounded-lg border border-gray-300 px-2 py-2.5 text-sm flex-1">
                      {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n} adult{n>1?'s':''}</option>)}
                    </select>
                    <select value={searchForm.children} onChange={(e) => setSearchForm({ ...searchForm, children: Number(e.target.value) })}
                      className="rounded-lg border border-gray-300 px-2 py-2.5 text-sm flex-1">
                      {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} child{n!==1?'ren':''}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={searching}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold hover:from-amber-700 hover:to-orange-700 disabled:opacity-60 transition-all">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {searching ? 'Searching...' : isSuggestMode ? 'Find Hotels' : 'Search Hotels'}
              </button>
            </form>
          )}

          {/* ═══════ RESULTS ═══════ */}
          {(bookingStep === 'results' && !isSuggestMode) || (isSuggestMode && bookingStep === 'results') ? (
            <>
              {searching && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
                  <p className="text-gray-500">{isSuggestMode ? 'Finding best hotels...' : 'Searching hotels...'}</p>
                </div>
              )}

              {searchError && !searching && (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-3">{searchError}</p>
                  <button onClick={(e) => performSearch(e)} className="text-sm text-amber-600 font-medium">Try again</button>
                </div>
              )}

              {!searching && !searchError && searchResults.length === 0 && hasSearched && (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No hotels found. Try a different city or dates.</p>
                </div>
              )}

              {!searching && !searchError && searchResults.length > 0 && (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">{searchResults.length} hotel{searchResults.length !== 1 ? 's' : ''} found</h3>
                    <button onClick={(e) => performSearch(e)} disabled={searching}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs">
                      <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} /> Search Again
                    </button>
                  </div>
                  <div className="space-y-3">
                    {searchResults.map((hotel, i) => (
                      <HotelCard
                        key={hotel.hotelId || hotel.name || i}
                        hotel={hotel}
                        isBest={isSuggestMode && bestMatch && hotel.name === bestMatch.name}
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
              <button onClick={() => setBookingStep('results')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ChevronLeft className="w-4 h-4" /> Back to results
              </button>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="font-semibold text-sm">{selectedOffer.name}</div>
                <StarRating rating={selectedOffer.starRating} />
                <div className="text-lg font-bold mt-1">{fmtMoney(selectedOffer.cheapestRate?.totalAmount, selectedOffer.cheapestRate?.currency)}</div>
              </div>
              <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Guest Details
              </h3>
              {guests.map((g, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Guest {i + 1}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={g.title} onChange={(e) => {
                      setGuests(prev => prev.map((g2, idx) => idx === i ? { ...g2, title: e.target.value } : g2));
                    }} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                      {['Mr', 'Mrs', 'Ms', 'Miss'].map(x => <option key={x}>{x}</option>)}
                    </select>
                    <input placeholder="First name *" value={g.firstName}
                      onChange={(e) => setGuests(prev => prev.map((g2, idx) => idx === i ? { ...g2, firstName: e.target.value } : g2))}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                    <input placeholder="Last name *" value={g.lastName}
                      onChange={(e) => setGuests(prev => prev.map((g2, idx) => idx === i ? { ...g2, lastName: e.target.value } : g2))}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                  </div>
                </div>
              ))}
              <div className="border border-gray-200 rounded-lg p-3 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-400" /> Contact
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                  <input placeholder="Email *" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                  <input placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
              </div>
              <button onClick={() => {
                for (const g of guests) {
                  if (!g.firstName || !g.lastName) { toast.error('Every guest needs a first and last name'); return; }
                }
                if (!contact.email) { toast.error('Contact email is required'); return; }
                setBookingStep('review');
              }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors">
                Review <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ═══════ REVIEW + CONFIRM ═══════ */}
          {!isSuggestMode && bookingStep === 'review' && selectedOffer && (
            <>
              <button onClick={() => setBookingStep('guests')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <h3 className="text-lg font-semibold mb-3">Review & Confirm</h3>
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="font-semibold">{selectedOffer.name}</div>
                <p className="text-sm text-gray-500">{fmtDate(searchForm.checkin)} → {fmtDate(searchForm.checkout)} · {guests.length} guest{guests.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Guests</div>
                {guests.map((g, i) => <div key={i} className="text-sm text-gray-700">{g.title} {g.firstName} {g.lastName}</div>)}
              </div>
              <div className="border-t pt-3 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span><span>{fmtMoney(selectedOffer.cheapestRate?.totalAmount, selectedOffer.cheapestRate?.currency)}</span>
                </div>
              </div>
              <button onClick={handleBook} disabled={booking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-all">
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
            </>
          )}

          {/* ═══════ CONFIRMED ═══════ */}
          {!isSuggestMode && bookingStep === 'confirmed' && confirmedBooking && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold mb-1">Booking Confirmed</h3>
              <p className="text-gray-500 mb-4">{confirmedBooking.hotelName || 'Hotel'} · {confirmedBooking.id}</p>
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors">
                Done
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-3 bg-gray-50 shrink-0 rounded-b-2xl">
          <p className="text-xs text-gray-400 text-center">
            {'Search powered by hotel provider API.'}
          </p>
        </div>
      </div>
    </div>
  );
}
