import { useState, useEffect, useCallback } from 'react';
import {
  X, Plane, Search, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, ArrowRightLeft, Users, Info, AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { flightAPI } from '../../../services/flight.service';
import AirportAutocomplete from '../../../components/AirportAutocomplete';
import PassengerSelector from '../../../components/PassengerSelector';

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════
const todayStr = () => new Date().toISOString().split('T')[0];

const emptyTraveler = (type = 'adult') => ({
  type,
  title: 'Mr',
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  passportNumber: '',
  passportExpiry: '',
  nationality: '',
  frequentFlyerNumber: '',
});

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(mins) {
  if (mins == null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? `${m}m` : ''}`;
}

function fmtMoney(amount, currency) {
  if (amount == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
}

function staggerDelay(idx) {
  return `${idx * 60}ms`;
}

const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];
const TRIP_TYPES = [
  { id: 'oneWay', label: 'One Way' },
  { id: 'roundTrip', label: 'Round Trip' },
];
const DEPARTURE_TIMES = [
  { id: 'morning', label: 'Morning (6am–12pm)' },
  { id: 'afternoon', label: 'Afternoon (12pm–6pm)' },
  { id: 'evening', label: 'Evening (6pm–12am)' },
];

// ═══════════════════════════════════════════════════════════════════
//  Offer Card (booking mode)
// ═══════════════════════════════════════════════════════════════════
function OfferCard({ offer, onSelect, paxCount }) {
  const segs = offer.segments || [];
  const firstSeg = segs[0];
  const lastSeg = segs[segs.length - 1];
  const totalDuration = segs.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
      style={{ animationDelay: staggerDelay(0) }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
            {offer.airlineCode}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{offer.airline}</div>
            <div className="text-xs text-gray-500">{offer.cabinClass}</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {offer.refundable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Refundable</span>
            )}
            {firstSeg?.stops === 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Direct</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-1">
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">{fmtTime(firstSeg?.departureAt)}</div>
            <div className="text-xs font-medium text-gray-500">{firstSeg?.origin}</div>
          </div>
          <div className="flex-1 flex flex-col items-center px-2">
            <div className="text-xs text-gray-400 mb-0.5">{fmtDuration(totalDuration)}</div>
            <div className="w-full h-0.5 bg-gray-200 relative">
              <div className="absolute -top-0.5 left-0 w-2 h-1.5 bg-blue-500 rounded-full" />
              <div className="absolute -top-0.5 right-0 w-2 h-1.5 bg-blue-500 rounded-full" />
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {segs.length === 1 ? 'Nonstop' : `${segs.length - 1} stop${segs.length > 2 ? 's' : ''}`}
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{fmtTime(lastSeg?.arrivalAt)}</div>
            <div className="text-xs font-medium text-gray-500">{lastSeg?.destination}</div>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 lg:border-l lg:border-gray-100 lg:pl-4">
        <div className="text-xl font-bold text-gray-900">{fmtMoney(offer.fareTotal, offer.currency)}</div>
        <div className="text-xs text-gray-500 mb-2">
          {paxCount} traveler{paxCount > 1 ? 's' : ''}
        </div>
        <button
          onClick={() => onSelect(offer)}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all active:scale-95"
        >
          Select <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════
export default function FlightSelectionModal({
  isOpen,
  onClose,
  mode = 'template',

  // Template mode
  onSelectTemplate,
  initialData = {},

  // Booking mode
  onBookFlight,
  travelDate: initialTravelDate,
  returnDate: initialReturnDate,
  tripType: initialTripType = 'oneWay',
  travelers: initialTravelers,
  leadContext = {},
}) {
  // ── Template mode state ─────────────────────────────────────────
  const [template, setTemplate] = useState({
    origin: initialData?.origin || '',
    destination: initialData?.destination || '',
    cabinClass: initialData?.cabinClass || 'Economy',
    departureTime: initialData?.departureTime || '',
    airlinePreference: initialData?.airlinePreference || '',
  });

  // ── Booking mode state ──────────────────────────────────────────
  const [bookingStep, setBookingStep] = useState('form');
  const [searchForm, setSearchForm] = useState({
    origin: initialData?.origin || '',
    destination: initialData?.destination || '',
    departureDate: initialTravelDate || todayStr(),
    returnDate: initialReturnDate || '',
    adults: initialTravelers?.filter(t => t.type === 'adult').length || 1,
    children: initialTravelers?.filter(t => t.type === 'child').length || 0,
    infants: initialTravelers?.filter(t => t.type === 'infant').length || 0,
    cabinClass: initialData?.cabinClass || 'Economy',
  });
  const [tripType, setTripType] = useState(initialTripType);
  const [searching, setSearching] = useState(false);
  const [offers, setOffers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const paxCount = searchForm.adults + searchForm.children + searchForm.infants;

  // Reset on open
  useEffect(() => {
    if (isOpen && mode === 'booking') {
      setBookingStep('form');
      setOffers([]);
      setHasSearched(false);
      setSelectedOffer(null);
      setConfirmedBooking(null);
      setSearchError(null);
    }
  }, [isOpen, mode]);

  const selectOffer = useCallback((offer) => {
    setSelectedOffer(offer);
    const newTravelers = [
      ...Array.from({ length: searchForm.adults }, () => emptyTraveler('adult')),
      ...Array.from({ length: searchForm.children }, () => emptyTraveler('child')),
      ...Array.from({ length: searchForm.infants }, () => emptyTraveler('infant')),
    ];
    setTravelers(newTravelers);
    setBookingStep('travelers');
  }, [searchForm]);

  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════════
  //  Template mode handlers
  // ═══════════════════════════════════════════════════════════════
  const handleTemplateSubmit = () => {
    onSelectTemplate?.({
      origin: template.origin,
      destination: template.destination,
      cabinClass: template.cabinClass,
      departureTime: template.departureTime,
      airlinePreference: template.airlinePreference,
    });
    onClose();
  };

  const handleTemplateSwap = () => {
    setTemplate(t => ({ ...t, origin: t.destination, destination: t.origin }));
  };

  // ═══════════════════════════════════════════════════════════════
  //  Booking mode handlers
  // ═══════════════════════════════════════════════════════════════
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchForm.origin || !searchForm.destination || !searchForm.departureDate) {
      toast.error('Origin, destination and departure date are required');
      return;
    }
    if (tripType === 'roundTrip' && !searchForm.returnDate) {
      toast.error('Return date is required for round trips');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setOffers([]);
    setSearchError(null);

    try {
      const response = await flightAPI.search({
        origin: searchForm.origin,
        destination: searchForm.destination,
        departureDate: searchForm.departureDate,
        returnDate: tripType === 'roundTrip' ? searchForm.returnDate : undefined,
        adults: searchForm.adults,
        children: searchForm.children || 0,
        infants: searchForm.infants || 0,
        cabinClass: searchForm.cabinClass,
        tripType,
      });
      setOffers(response.data || []);
      if (!response.data?.length) toast('No flights found', { icon: '✈️' });
    } catch (error) {
      setSearchError(error.message || 'Flight search failed');
      toast.error(error.message || 'Flight search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSwap = () => {
    setSearchForm(f => ({ ...f, origin: f.destination, destination: f.origin }));
  };

  const updateTraveler = (index, field, value) => {
    setTravelers(prev => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const goToReview = () => {
    for (let i = 0; i < travelers.length; i++) {
      const t = travelers[i];
      if (!t.firstName || !t.lastName) {
        toast.error('Every traveler needs a first and last name');
        return;
      }
      if (t.type === 'adult' && !t.gender) {
        toast.error(`Gender is required for traveler ${i + 1}`);
        return;
      }
    }
    if (!contact.email) {
      toast.error('Contact email is required');
      return;
    }
    setBookingStep('review');
  };

  const confirmBooking = async () => {
    setBooking(true);
    try {
      const payload = {
        offer: selectedOffer,
        tripType,
        travelers,
        contact,
        ...leadContext,
      };
      const response = leadContext.leadId
        ? await flightAPI.bookForLead(payload)
        : await flightAPI.book(payload);
      setConfirmedBooking(response.data);
      setBookingStep('confirmed');
      onBookFlight?.(response.data);
      toast.success('Flight booked successfully');
    } catch (error) {
      toast.error(error.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  Render — Template mode
  // ═══════════════════════════════════════════════════════════════
  if (mode === 'template') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Select Flight Route</h2>
                <p className="text-xs text-gray-500">Set flight preferences for this itinerary day</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
              <AirportAutocomplete
                value={template.origin}
                onChange={(code) => setTemplate({ ...template, origin: code })}
                placeholder="Departure airport"
                excludeCode={template.destination}
              />
            </div>
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleTemplateSwap}
                title="Swap origin and destination"
                className="p-1.5 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4 rotate-90" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <AirportAutocomplete
                value={template.destination}
                onChange={(code) => setTemplate({ ...template, destination: code })}
                placeholder="Arrival airport"
                excludeCode={template.origin}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cabin Class</label>
                <select
                  value={template.cabinClass}
                  onChange={(e) => setTemplate({ ...template, cabinClass: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {CABIN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                <select
                  value={template.departureTime}
                  onChange={(e) => setTemplate({ ...template, departureTime: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Any time</option>
                  {DEPARTURE_TIMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Airline (optional)</label>
              <input
                type="text"
                value={template.airlinePreference}
                onChange={(e) => setTemplate({ ...template, airlinePreference: e.target.value.toUpperCase() })}
                placeholder="e.g., EK, QR, BA"
                maxLength={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTemplateSubmit}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Save Flight Preferences
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  Render — Booking mode
  // ═══════════════════════════════════════════════════════════════
  const maxW = bookingStep === 'form' ? 'max-w-2xl' : bookingStep === 'results' ? 'max-w-4xl' : 'max-w-3xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxW} max-h-[92vh] overflow-auto`}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {bookingStep === 'confirmed' ? 'Booking Confirmed' : 'Search & Book Flight'}
              </h2>
              <p className="text-xs text-gray-500">
                {bookingStep === 'form' && 'Search for available flights'}
                {bookingStep === 'results' && `${offers.length} flight${offers.length !== 1 ? 's' : ''} found`}
                {bookingStep === 'travelers' && 'Enter traveler details'}
                {bookingStep === 'review' && 'Review and confirm booking'}
                {bookingStep === 'confirmed' && 'Flight booked successfully'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* ── Step 1: Search form ─────────────────────────── */}
          {bookingStep === 'form' && (
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
                  {TRIP_TYPES.map(tt => (
                    <button
                      key={tt.id}
                      type="button"
                      onClick={() => setTripType(tt.id)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        tripType === tt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tt.label}
                    </button>
                  ))}
                </div>
                <select
                  value={searchForm.cabinClass}
                  onChange={(e) => setSearchForm({ ...searchForm, cabinClass: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {CABIN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                <AirportAutocomplete
                  label="From"
                  value={searchForm.origin}
                  onChange={(code) => setSearchForm({ ...searchForm, origin: code })}
                  placeholder="City or airport"
                  excludeCode={searchForm.destination}
                />
                <button
                  type="button"
                  onClick={handleSwap}
                  className="hidden md:flex w-9 h-9 rounded-full border border-gray-300 items-center justify-center text-gray-400 hover:text-blue-600 transition-colors self-end mb-0.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <AirportAutocomplete
                  label="To"
                  value={searchForm.destination}
                  onChange={(code) => setSearchForm({ ...searchForm, destination: code })}
                  placeholder="City or airport"
                  excludeCode={searchForm.origin}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Departure</label>
                  <input
                    type="date"
                    value={searchForm.departureDate}
                    min={todayStr()}
                    onChange={(e) => setSearchForm({ ...searchForm, departureDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                {tripType === 'roundTrip' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Return</label>
                    <input
                      type="date"
                      value={searchForm.returnDate}
                      min={searchForm.departureDate || todayStr()}
                      onChange={(e) => setSearchForm({ ...searchForm, returnDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Passengers</label>
                  <PassengerSelector
                    adults={searchForm.adults}
                    children={searchForm.children}
                    infants={searchForm.infants}
                    onChange={(c) => setSearchForm({ ...searchForm, ...c })}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={searching}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 transition-all"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {searching ? 'Searching...' : 'Search Flights'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── Step 2: Results ─────────────────────────────── */}
          {bookingStep === 'results' && (
            <>
              {searching && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
                  <p className="text-gray-500">Searching flights...</p>
                </div>
              )}

              {searchError && !searching && (
                <div className="text-center py-10">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                  <p className="text-red-600 font-medium mb-3">{searchError}</p>
                  <button
                    onClick={() => { setBookingStep('form'); setSearchError(null); }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!searching && !searchError && offers.length === 0 && hasSearched && (
                <div className="text-center py-12">
                  <Plane className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500 mb-1">No flights found</h3>
                  <p className="text-sm text-gray-400 mb-3">Try different dates or airports</p>
                  <button
                    onClick={() => { setBookingStep('form'); setHasSearched(false); }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Modify search
                  </button>
                </div>
              )}

              {!searching && !searchError && offers.length > 0 && (
                <>
                  <button
                    onClick={() => { setBookingStep('form'); setOffers([]); setHasSearched(false); }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
                  >
                    <ChevronLeft className="w-4 h-4" /> Modify search
                  </button>
                  <div className="space-y-3">
                    {offers.map(offer => (
                      <OfferCard key={offer.offerId} offer={offer} onSelect={selectOffer} paxCount={paxCount} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Step 3: Traveler details ────────────────────── */}
          {bookingStep === 'travelers' && selectedOffer && (
            <>
              <button
                onClick={() => setBookingStep('results')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <ChevronLeft className="w-4 h-4" /> Back to results
              </button>

              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                  {selectedOffer.airlineCode}
                </div>
                <div>
                  <div className="text-sm font-semibold">{selectedOffer.airline} · {selectedOffer.cabinClass}</div>
                  <div className="text-xs text-gray-500">
                    {(selectedOffer.segments || []).map((s, i) => (
                      <span key={i}>{s.origin} → {s.destination}{i < (selectedOffer.segments || []).length - 1 ? ' · ' : ''}</span>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-lg font-bold">{fmtMoney(selectedOffer.fareTotal, selectedOffer.currency)}</div>
                </div>
              </div>

              <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Traveler Details
              </h3>

              {(['adult', 'child', 'infant']).map(type => {
                const indexes = travelers.map((t, i) => t.type === type ? i : -1).filter(i => i >= 0);
                if (indexes.length === 0) return null;
                const label = type === 'adult' ? 'Adults' : type === 'child' ? 'Children' : 'Infants';
                return (
                  <div key={type} className="mb-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase mb-2">{label} ({indexes.length})</div>
                    {indexes.map((idx) => {
                      const t = travelers[idx];
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3 mb-2">
                          <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                            Traveler {idx + 1} <span className="text-xs text-gray-400 capitalize">({t.type})</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <select value={t.title} onChange={(e) => updateTraveler(idx, 'title', e.target.value)}
                              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                              {['Mr', 'Mrs', 'Ms', 'Miss'].map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                            <input placeholder="First name *" value={t.firstName}
                              onChange={(e) => updateTraveler(idx, 'firstName', e.target.value)}
                              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                            <input placeholder="Last name *" value={t.lastName}
                              onChange={(e) => updateTraveler(idx, 'lastName', e.target.value)}
                              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                            {t.type === 'adult' && (
                              <select value={t.gender} onChange={(e) => updateTraveler(idx, 'gender', e.target.value)}
                                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                                <option value="">Gender *</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div className="border border-gray-200 rounded-lg p-3 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-400" /> Contact Details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input placeholder="Full name" value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                  <input placeholder="Email *" type="email" value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                  <input placeholder="Phone" value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
              </div>

              <button onClick={goToReview}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                Review Booking <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ── Step 4: Review ──────────────────────────────── */}
          {bookingStep === 'review' && selectedOffer && (
            <>
              <button onClick={() => setBookingStep('travelers')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ChevronLeft className="w-4 h-4" /> Back to traveler details
              </button>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Review & Confirm</h3>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                    {selectedOffer.airlineCode}
                  </div>
                  <span className="font-semibold text-sm">{selectedOffer.airline} · {selectedOffer.cabinClass}</span>
                </div>
                {(selectedOffer.segments || []).map((seg, i) => (
                  <div key={i} className="text-sm text-gray-600 ml-8">
                    <span className="font-semibold text-gray-900">{seg.origin}</span>{' '}→{' '}
                    <span className="font-semibold text-gray-900">{seg.destination}</span>{' '}·{' '}
                    {seg.marketingCarrier}{seg.flightNumber?.replace(seg.marketingCarrier, '')}{' '}·{' '}
                    {new Date(seg.departureAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Travelers</div>
                {travelers.map((t, i) => (
                  <div key={i} className="text-sm text-gray-700">{t.title} {t.firstName} {t.lastName} <span className="text-xs text-gray-400 capitalize">({t.type})</span></div>
                ))}
              </div>

              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Contact</div>
                <div className="text-sm text-gray-700">{contact.name} · {contact.email}{contact.phone ? ` · ${contact.phone}` : ''}</div>
              </div>

              <div className="border-t pt-3 mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Base fare</span><span>{fmtMoney(selectedOffer.baseFare, selectedOffer.currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Taxes & fees</span><span>{fmtMoney(selectedOffer.taxes, selectedOffer.currency)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                  <span>Total</span><span>{fmtMoney(selectedOffer.fareTotal, selectedOffer.currency)}</span>
                </div>
              </div>

              <button onClick={confirmBooking} disabled={booking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-all">
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
            </>
          )}

          {/* ── Step 5: Confirmed ────────────────────────────── */}
          {bookingStep === 'confirmed' && confirmedBooking && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Booking Confirmed</h3>
              <div className="inline-flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 mb-4">
                <span className="text-xs text-gray-400 uppercase">PNR</span>
                <span className="text-lg font-mono font-bold text-blue-600">{confirmedBooking.pnr}</span>
              </div>
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
