import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plane, Search, ListChecks, SlidersHorizontal } from 'lucide-react';
import { toast } from '@/lib/toast';
import { flightAPI } from '../../services/flight.service';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import FlightErrorBoundary from './FlightErrorBoundary';
import OfferCard, { OfferSkeleton } from './OfferCard';
import SearchForm from './SearchForm';
import { TravelerDetailsStep, ReviewStep, ConfirmationStep } from './BookingWizard';
import BookingsPanel from './BookingsPanel';
import { SORT_OPTIONS, emptyTraveler, segmentStops, todayStr } from './helpers';
import type {
  BookingStep,
  ContactForm,
  FlightBookingRecord,
  FlightOffer,
  FlightTab,
  SearchFormState,
  TravelerForm,
  TravelerType,
  TripType,
} from './types';

const SORT_LABEL: Record<string, string> = Object.fromEntries(SORT_OPTIONS.map((s) => [s.id, s.label]));

export default function FlightSearch() {
  const [activeTab, setActiveTab] = useState<FlightTab>('search');

  const [tripType, setTripType] = useState<TripType>('oneWay');
  const [form, setForm] = useState<SearchFormState>({
    origin: '',
    destination: '',
    departureDate: todayStr(),
    returnDate: '',
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: 'Economy',
  });
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [searching, setSearching] = useState(false);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchSummary, setSearchSummary] = useState('');

  const [sortBy, setSortBy] = useState('price');
  const [filterStops, setFilterStops] = useState<number[]>([]);
  const [filterAirlines, setFilterAirlines] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [step, setStep] = useState<BookingStep>('results');
  const [selectedOffer, setSelectedOffer] = useState<FlightOffer | null>(null);
  const [travelers, setTravelers] = useState<TravelerForm[]>([]);
  const [contact, setContact] = useState<ContactForm>({ name: '', email: '', phone: '' });
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{ pnr: string } | null>(null);

  const [bookings, setBookings] = useState<FlightBookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);

  const paxCount = form.adults + form.children + form.infants;

  const availableAirlines = useMemo(() => {
    const set = new Map<string, string>();
    offers.forEach((o) => {
      if (o.airlineCode && !set.has(o.airlineCode)) set.set(o.airlineCode, o.airline || o.airlineCode);
    });
    return Array.from(set.entries()).map(([code, name]) => ({ code, name }));
  }, [offers]);

  const sortedAndFilteredOffers = useMemo(() => {
    let list = [...offers];

    if (filterStops.length > 0) {
      list = list.filter((o) => filterStops.includes(segmentStops(o.segments)));
    }
    if (filterAirlines.length > 0) {
      list = list.filter((o) => o.airlineCode && filterAirlines.includes(o.airlineCode));
    }
    if (nonstopOnly) {
      list = list.filter((o) => segmentStops(o.segments) === 0);
    }

    switch (sortBy) {
      case 'price':
        list.sort((a, b) => a.fareTotal - b.fareTotal);
        break;
      case 'departure':
        list.sort((a, b) => new Date(a.segments?.[0]?.departureAt || 0).getTime() - new Date(b.segments?.[0]?.departureAt || 0).getTime());
        break;
      case 'duration': {
        const dur = (o: FlightOffer) => (o.segments || []).reduce((s, seg) => s + (seg.durationMinutes || 0), 0);
        list.sort((a, b) => dur(a) - dur(b));
        break;
      }
      case 'stops':
        list.sort((a, b) => segmentStops(a.segments) - segmentStops(b.segments));
        break;
    }

    return list;
  }, [offers, sortBy, filterStops, filterAirlines, nonstopOnly]);

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (bookingStatusFilter !== 'all') {
      list = list.filter((b) => b.status === bookingStatusFilter);
    }
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      list = list.filter(
        (b) =>
          b.pnr?.toLowerCase().includes(q) ||
          b.segments?.some((s) => s.origin?.toLowerCase().includes(q) || s.destination?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [bookings, bookingStatusFilter, bookingSearch]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length, confirmed: 0, pending: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (c[b.status] !== undefined) c[b.status]++;
    });
    return c;
  }, [bookings]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.origin || !form.destination || !form.departureDate) {
      toast.error('Origin, destination and departure date are required');
      return;
    }
    if (tripType === 'roundTrip' && !form.returnDate) {
      toast.error('Return date is required for round trips');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setOffers([]);
    setFilterStops([]);
    setFilterAirlines([]);
    setSortBy('price');
    setStep('results');

    try {
      const response = await flightAPI.search({
        origin: form.origin,
        destination: form.destination,
        departureDate: form.departureDate,
        returnDate: tripType === 'roundTrip' ? form.returnDate : undefined,
        adults: form.adults,
        children: form.children || 0,
        infants: form.infants || 0,
        cabinClass: form.cabinClass,
        tripType,
      });
      const results: FlightOffer[] = response.data || [];
      setOffers(results);
      setSearchSummary(
        results.length > 0
          ? `${form.origin} → ${form.destination}, ${new Date(form.departureDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
          : ''
      );
      if (!results.length) toast('No flights found for this search', { type: 'info' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- flight.service.js is untyped JS, error shape is unknown at this boundary
    } catch (error: any) {
      toast.error(error.message || 'Flight search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSwap = () => {
    setForm((f) => ({ ...f, origin: f.destination, destination: f.origin }));
  };

  const selectOffer = useCallback(
    (offer: FlightOffer) => {
      setSelectedOffer(offer);
      const newTravelers = [
        ...Array.from({ length: form.adults }, () => emptyTraveler('adult' as TravelerType)),
        ...Array.from({ length: form.children }, () => emptyTraveler('child' as TravelerType)),
        ...Array.from({ length: form.infants }, () => emptyTraveler('infant' as TravelerType)),
      ];
      setTravelers(newTravelers);
      setStep('travelers');
    },
    [form.adults, form.children, form.infants]
  );

  const updateTraveler = (index: number, field: keyof TravelerForm, value: string) => {
    setTravelers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
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
    setStep('review');
  };

  const confirmBooking = async () => {
    setBooking(true);
    try {
      const response = await flightAPI.book({ offer: selectedOffer, tripType, travelers, contact });
      setConfirmedBooking(response.data);
      setStep('confirmation');
      toast.success('Flight booked successfully');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- flight.service.js is untyped JS, error shape is unknown at this boundary
    } catch (error: any) {
      toast.error(error.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const resetSearch = () => {
    setOffers([]);
    setHasSearched(false);
    setSearchSummary('');
    setSelectedOffer(null);
    setTravelers([]);
    setContact({ name: '', email: '', phone: '' });
    setConfirmedBooking(null);
    setStep('results');
    setFilterStops([]);
    setFilterAirlines([]);
  };

  const copyPNR = (pnr: string) => {
    navigator.clipboard?.writeText(pnr);
    toast.success('PNR copied to clipboard');
  };

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const response = await flightAPI.listBookings();
      setBookings(response.data || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- flight.service.js is untyped JS, error shape is unknown at this boundary
    } catch (error: any) {
      toast.error(error.message || 'Failed to load flight bookings');
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, fetchBookings]);

  const cancelBooking = async (id: string, reason: string) => {
    try {
      await flightAPI.cancelBooking(id, reason || 'Cancelled by agent');
      toast.success('Booking cancelled');
      setCancelDialog(null);
      fetchBookings();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- flight.service.js is untyped JS, error shape is unknown at this boundary
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel booking');
    }
  };

  return (
    <FlightErrorBoundary>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary p-2.5 text-primary-foreground">
            <Plane className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Flights</h1>
            <p className="text-sm text-muted-foreground">Search, book and manage flight reservations</p>
          </div>
        </div>

        <div className="mb-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (!value) return;
              setActiveTab(value as FlightTab);
              if (value === 'search') resetSearch();
            }}
          >
            <TabsList variant="line">
              <TabsTrigger value="search">
                <Search className="h-4 w-4" /> Search &amp; Book
              </TabsTrigger>
              <TabsTrigger value="bookings">
                <ListChecks className="h-4 w-4" /> Manage Bookings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === 'search' && (
          <>
            {step === 'results' && (
              <SearchForm
                tripType={tripType}
                setTripType={setTripType}
                form={form}
                setForm={setForm}
                nonstopOnly={nonstopOnly}
                setNonstopOnly={setNonstopOnly}
                searching={searching}
                onSubmit={handleSearch}
                onSwap={handleSwap}
              />
            )}

            {step === 'results' && (
              <>
                {searching && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <OfferSkeleton key={i} />
                    ))}
                  </div>
                )}

                {hasSearched && !searching && (
                  <>
                    {offers.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">
                            {sortedAndFilteredOffers.length} flight{sortedAndFilteredOffers.length !== 1 ? 's' : ''} found
                          </h2>
                          {searchSummary && <p className="text-sm text-muted-foreground">{searchSummary}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={showFilters || filterStops.length > 0 || filterAirlines.length > 0 ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Filters
                            {(filterStops.length > 0 || filterAirlines.length > 0) && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                {filterStops.length + filterAirlines.length}
                              </span>
                            )}
                          </Button>

                          <Select value={sortBy} onValueChange={(value) => value && setSortBy(value)}>
                            <SelectTrigger size="sm">
                              <SelectValue>{(value: string) => SORT_LABEL[value] || value}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {SORT_OPTIONS.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {showFilters && offers.length > 0 && (
                      <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 shadow-card md:grid-cols-2">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Stops</div>
                          <div className="flex flex-wrap gap-2">
                            {[0, 1, 2].map((stops) => (
                              <button
                                key={stops}
                                type="button"
                                onClick={() =>
                                  setFilterStops((prev) => (prev.includes(stops) ? prev.filter((s) => s !== stops) : [...prev, stops]))
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                  filterStops.includes(stops) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                }`}
                              >
                                {stops === 0 ? 'Direct' : stops === 1 ? '1 Stop' : '2+ Stops'}
                              </button>
                            ))}
                            {filterStops.length > 0 && (
                              <button type="button" onClick={() => setFilterStops([])} className="px-2 py-1 text-xs text-destructive hover:text-destructive/80">
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Airlines</div>
                          <div className="flex flex-wrap gap-2">
                            {availableAirlines.map(({ code, name }) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() =>
                                  setFilterAirlines((prev) => (prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]))
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                  filterAirlines.includes(code) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                }`}
                              >
                                {code} · {name}
                              </button>
                            ))}
                            {filterAirlines.length > 0 && (
                              <button type="button" onClick={() => setFilterAirlines([])} className="px-2 py-1 text-xs text-destructive hover:text-destructive/80">
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {sortedAndFilteredOffers.length === 0 && !searching && hasSearched && (
                      <div className="rounded-lg border border-border bg-card py-16 text-center shadow-card">
                        <Plane className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                        <h3 className="mb-1 text-lg font-semibold text-foreground">No flights found</h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                          {offers.length > 0 ? 'Try adjusting your filters to see more results.' : 'Try different dates or airports.'}
                        </p>
                        {offers.length > 0 && (filterStops.length > 0 || filterAirlines.length > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterStops([]);
                              setFilterAirlines([]);
                            }}
                            className="text-sm font-medium text-primary hover:text-primary/80"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      {sortedAndFilteredOffers.map((offer) => (
                        <OfferCard key={offer.offerId} offer={offer} onSelect={selectOffer} paxCount={paxCount} />
                      ))}
                    </div>
                  </>
                )}

                {!hasSearched && !searching && (
                  <div className="rounded-lg border border-border bg-card py-20 text-center shadow-card">
                    <Search className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
                    <h3 className="mb-1 text-lg font-semibold text-muted-foreground">Search for flights</h3>
                    <p className="text-sm text-muted-foreground/80">Enter origin, destination and dates to find available flights</p>
                  </div>
                )}
              </>
            )}

            {step === 'travelers' && selectedOffer && (
              <TravelerDetailsStep
                selectedOffer={selectedOffer}
                travelers={travelers}
                updateTraveler={updateTraveler}
                contact={contact}
                setContact={setContact}
                onBack={() => setStep('results')}
                onNext={goToReview}
              />
            )}

            {step === 'review' && selectedOffer && (
              <ReviewStep
                selectedOffer={selectedOffer}
                travelers={travelers}
                contact={contact}
                booking={booking}
                onBack={() => setStep('travelers')}
                onConfirm={confirmBooking}
              />
            )}

            {step === 'confirmation' && confirmedBooking && (
              <ConfirmationStep
                pnr={confirmedBooking.pnr}
                selectedOffer={selectedOffer}
                travelerCount={travelers.length}
                onCopyPNR={() => copyPNR(confirmedBooking.pnr)}
                onNewSearch={resetSearch}
                onViewBookings={() => {
                  setActiveTab('bookings');
                  resetSearch();
                }}
              />
            )}
          </>
        )}

        {activeTab === 'bookings' && (
          <BookingsPanel
            bookings={bookings}
            filteredBookings={filteredBookings}
            loading={loadingBookings}
            statusFilter={bookingStatusFilter}
            setStatusFilter={setBookingStatusFilter}
            statusCounts={statusCounts}
            search={bookingSearch}
            setSearch={setBookingSearch}
            cancelDialog={cancelDialog}
            setCancelDialog={setCancelDialog}
            onCancel={cancelBooking}
          />
        )}
      </div>
    </FlightErrorBoundary>
  );
}
