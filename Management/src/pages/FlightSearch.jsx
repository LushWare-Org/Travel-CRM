import { useState, useEffect, useMemo, useCallback, Component } from "react";
import {
  Plane, Search, Calendar, X, ChevronRight, ChevronLeft, ChevronDown,
  Loader2, CheckCircle2, Ban, ArrowRightLeft, Luggage, ListChecks,
  Clock, Filter, SlidersHorizontal, Copy, ExternalLink, AlertCircle,
  ArrowUpDown, Info, AlertTriangle, Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { flightAPI } from "../services/flight.service";
import AirportAutocomplete from "../components/AirportAutocomplete";
import PassengerSelector from "../components/PassengerSelector";

// ═══════════════════════════════════════════════════════════════════
//  Error boundary — catches render crashes
// ═══════════════════════════════════════════════════════════════════
class FlightErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[FlightSearch] Render crash:", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-lg mx-auto mt-20">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
            <p className="text-sm text-red-600 mb-4">{this.state.error.message}</p>
            <pre className="text-xs text-left bg-red-100 rounded-lg p-3 mb-4 max-h-40 overflow-auto whitespace-pre-wrap">
              {this.state.error.stack?.slice(0, 800)}
            </pre>
            <button
              onClick={() => this.setState({ error: null, info: null })}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════
const CABIN_CLASSES = ["Economy", "Premium Economy", "Business", "First"];
const TRIP_TYPES = [
  { id: "oneWay", label: "One Way" },
  { id: "roundTrip", label: "Round Trip" },
];
const SORT_OPTIONS = [
  { id: "price", label: "Price (lowest)" },
  { id: "departure", label: "Departure (earliest)" },
  { id: "duration", label: "Duration (shortest)" },
  { id: "stops", label: "Stops (fewest)" },
];
const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "cancelled", label: "Cancelled" },
];

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════
const todayStr = () => new Date().toISOString().split("T")[0];

const emptyTraveler = (type = "adult") => ({
  type,
  title: "Mr",
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  passportNumber: "",
  passportExpiry: "",
  nationality: "",
  frequentFlyerNumber: "",
});

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(mins) {
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? `${m}m` : ""}`;
}

function fmtMoney(amount, currency) {
  if (amount == null) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
}

function staggerDelay(idx) {
  return `${idx * 60}ms`;
}

// ═══════════════════════════════════════════════════════════════════
//  Skeleton card for loading state
// ═══════════════════════════════════════════════════════════════════
function OfferSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
      </div>
      <div className="flex items-center gap-4 mb-2">
        <div className="h-5 w-16 bg-gray-200 rounded" />
        <div className="h-0.5 flex-1 bg-gray-100" />
        <div className="h-5 w-16 bg-gray-200 rounded" />
      </div>
      <div className="h-3 w-40 bg-gray-100 rounded" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Offer card
// ═══════════════════════════════════════════════════════════════════
function OfferCard({ offer, onSelect, paxCount }) {
  const segs = offer.segments || [];
  const firstSeg = segs[0];
  const lastSeg = segs[segs.length - 1];
  const totalDuration = segs.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col lg:flex-row lg:items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
      style={{ animationDelay: staggerDelay(0) }}
    >
      {/* Airline + timing */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
            {offer.airlineCode}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{offer.airline}</div>
            <div className="text-xs text-gray-500">{offer.cabinClass}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {offer.refundable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Refundable</span>
            )}
            {firstSeg?.stops === 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Direct</span>
            )}
          </div>
        </div>

        {/* Timing bar */}
        <div className="flex items-center gap-3 mb-2">
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
              {segs.length === 1 ? "Nonstop" : `${segs.length - 1} stop${segs.length > 2 ? "s" : ""}`}
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{fmtTime(lastSeg?.arrivalAt)}</div>
            <div className="text-xs font-medium text-gray-500">{lastSeg?.destination}</div>
          </div>
        </div>

        {/* Segment details (expandable) */}
        {segs.length > 1 && (
          <details className="text-xs text-gray-500 mt-2">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
              {segs.length} segments — view details
            </summary>
            <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200">
              {segs.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-gray-400">#{seg.sequence}</span>
                  <span className="font-medium">{seg.origin} → {seg.destination}</span>
                  <span className="text-gray-400">{seg.marketingCarrier}{seg.flightNumber?.replace(seg.marketingCarrier, "")}</span>
                  <span>{fmtDuration(seg.durationMinutes)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Price + CTA */}
      <div className="text-right shrink-0 lg:border-l lg:border-gray-100 lg:pl-5">
        <div className="text-2xl font-bold text-gray-900">{fmtMoney(offer.fareTotal, offer.currency)}</div>
        <div className="text-xs text-gray-500 mb-3">
          {paxCount} traveler{paxCount > 1 ? "s" : ""}
        </div>
        <button
          onClick={() => onSelect(offer)}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all active:scale-95"
        >
          Select <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════════════
export default function FlightSearch() {
  const [activeTab, setActiveTab] = useState("search");

  // ── Search form state ──────────────────────────────────────────
  const [tripType, setTripType] = useState("oneWay");
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    departureDate: todayStr(),
    returnDate: "",
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "Economy",
  });
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [searching, setSearching] = useState(false);
  const [offers, setOffers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchSummary, setSearchSummary] = useState("");

  // ── Filter / sort state ────────────────────────────────────────
  const [sortBy, setSortBy] = useState("price");
  const [filterStops, setFilterStops] = useState([]); // [0] = direct only, [0,1] = direct + 1 stop
  const [filterAirlines, setFilterAirlines] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // ── Booking wizard ─────────────────────────────────────────────
  const [step, setStep] = useState("results");
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // ── Manage bookings ────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [cancelDialog, setCancelDialog] = useState(null); // { id, reason }

  const paxCount = form.adults + form.children + form.infants;

  // ══════════════════════════════════════════════════════════════
  //  Derived data
  // ══════════════════════════════════════════════════════════════
  const availableAirlines = useMemo(() => {
    const set = new Map();
    offers.forEach((o) => {
      if (!set.has(o.airlineCode)) set.set(o.airlineCode, o.airline);
    });
    return Array.from(set.entries()).map(([code, name]) => ({ code, name }));
  }, [offers]);

  const sortedAndFilteredOffers = useMemo(() => {
    let list = [...offers];

    // Apply stop filter
    if (filterStops.length > 0) {
      list = list.filter((o) => {
        const stops = o.segments?.[0]?.stops ?? (o.segments?.length || 1) - 1;
        return filterStops.includes(stops);
      });
    }

    // Apply airline filter
    if (filterAirlines.length > 0) {
      list = list.filter((o) => filterAirlines.includes(o.airlineCode));
    }

    // Apply nonstop
    if (nonstopOnly) {
      list = list.filter((o) => {
        const stops = o.segments?.[0]?.stops ?? (o.segments?.length || 1) - 1;
        return stops === 0;
      });
    }

    // Sort
    switch (sortBy) {
      case "price":
        list.sort((a, b) => a.fareTotal - b.fareTotal);
        break;
      case "departure":
        list.sort((a, b) => new Date(a.segments?.[0]?.departureAt || 0) - new Date(b.segments?.[0]?.departureAt || 0));
        break;
      case "duration": {
        const dur = (o) => (o.segments || []).reduce((s, seg) => s + (seg.durationMinutes || 0), 0);
        list.sort((a, b) => dur(a) - dur(b));
        break;
      }
      case "stops": {
        const stops = (o) => o.segments?.[0]?.stops ?? (o.segments?.length || 1) - 1;
        list.sort((a, b) => stops(a) - stops(b));
        break;
      }
    }

    return list;
  }, [offers, sortBy, filterStops, filterAirlines, nonstopOnly]);

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (bookingStatusFilter !== "all") {
      list = list.filter((b) => b.status === bookingStatusFilter);
    }
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      list = list.filter(
        (b) =>
          b.pnr?.toLowerCase().includes(q) ||
          b.segments?.some((s) => s.origin?.toLowerCase().includes(q) || s.destination?.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [bookings, bookingStatusFilter, bookingSearch]);

  const statusCounts = useMemo(() => {
    const c = { all: bookings.length, confirmed: 0, pending: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (c[b.status] !== undefined) c[b.status]++;
    });
    return c;
  }, [bookings]);

  // ══════════════════════════════════════════════════════════════
  //  Search
  // ══════════════════════════════════════════════════════════════
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!form.origin || !form.destination || !form.departureDate) {
      toast.error("Origin, destination and departure date are required");
      return;
    }
    if (tripType === "roundTrip" && !form.returnDate) {
      toast.error("Return date is required for round trips");
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setOffers([]);
    setFilterStops([]);
    setFilterAirlines([]);
    setSortBy("price");
    setStep("results");

    try {
      const response = await flightAPI.search({
        origin: form.origin,
        destination: form.destination,
        departureDate: form.departureDate,
        returnDate: tripType === "roundTrip" ? form.returnDate : undefined,
        adults: form.adults,
        children: form.children || 0,
        infants: form.infants || 0,
        cabinClass: form.cabinClass,
        tripType,
      });
      const results = response.data || [];
      setOffers(results);
      setSearchSummary(
        results.length > 0
          ? `${form.origin} → ${form.destination}, ${new Date(form.departureDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : "",
      );
      if (!results.length) toast("No flights found for this search", { icon: "✈️" });
    } catch (error) {
      toast.error(error.message || "Flight search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSwap = () => {
    setForm((f) => ({ ...f, origin: f.destination, destination: f.origin }));
  };

  // ══════════════════════════════════════════════════════════════
  //  Booking flow
  // ══════════════════════════════════════════════════════════════
  const selectOffer = useCallback((offer) => {
    console.log("[FlightSearch] selectOffer called", { offerId: offer?.offerId, adults: form.adults, children: form.children, infants: form.infants });
    setSelectedOffer(offer);
    const newTravelers = [
      ...Array.from({ length: form.adults }, () => emptyTraveler("adult")),
      ...Array.from({ length: form.children }, () => emptyTraveler("child")),
      ...Array.from({ length: form.infants }, () => emptyTraveler("infant")),
    ];
    console.log("[FlightSearch] travelers created", { count: newTravelers.length, types: newTravelers.map(t => t.type) });
    setTravelers(newTravelers);
    setStep("travelers");
  }, [form.adults, form.children, form.infants]);

  const updateTraveler = (index, field, value) => {
    setTravelers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const goToReview = () => {
    for (let i = 0; i < travelers.length; i++) {
      const t = travelers[i];
      if (!t.firstName || !t.lastName) {
        toast.error("Every traveler needs a first and last name");
        return;
      }
      if (t.type === "adult" && !t.gender) {
        toast.error(`Gender is required for traveler ${i + 1}`);
        return;
      }
    }
    if (!contact.email) {
      toast.error("Contact email is required");
      return;
    }
    setStep("review");
  };

  const confirmBooking = async () => {
    setBooking(true);
    try {
      const response = await flightAPI.book({
        offer: selectedOffer,
        tripType,
        travelers,
        contact,
      });
      setConfirmedBooking(response.data);
      setStep("confirmation");
      toast.success("Flight booked successfully");
    } catch (error) {
      toast.error(error.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  const resetSearch = () => {
    setOffers([]);
    setHasSearched(false);
    setSearchSummary("");
    setSelectedOffer(null);
    setTravelers([]);
    setContact({ name: "", email: "", phone: "" });
    setConfirmedBooking(null);
    setStep("results");
    setFilterStops([]);
    setFilterAirlines([]);
  };

  const copyPNR = (pnr) => {
    navigator.clipboard?.writeText(pnr);
    toast.success("PNR copied to clipboard");
  };

  // ══════════════════════════════════════════════════════════════
  //  Manage bookings
  // ══════════════════════════════════════════════════════════════
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const response = await flightAPI.listBookings();
      setBookings(response.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load flight bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === "bookings") fetchBookings();
  }, [activeTab]);

  const cancelBooking = async (id, reason) => {
    try {
      await flightAPI.cancelBooking(id, reason || "Cancelled by agent");
      toast.success("Booking cancelled");
      setCancelDialog(null);
      fetchBookings();
    } catch (error) {
      toast.error(error.message || "Failed to cancel booking");
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════════════════════════
  return (
    <FlightErrorBoundary>
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
          <Plane className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flights</h1>
          <p className="text-sm text-gray-500">Search, book and manage flight reservations</p>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { id: "search", label: "Search & Book", icon: Search },
          { id: "bookings", label: "Manage Bookings", icon: ListChecks },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "search") resetSearch();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/*  SEARCH & BOOK TAB                                     */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "search" && (
        <>
          {/* ── Search form ────────────────────────────────── */}
          {step === "results" && (
          <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
            {/* Trip type + cabin */}
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
                {TRIP_TYPES.map((tt) => (
                  <button
                    key={tt.id}
                    type="button"
                    onClick={() => setTripType(tt.id)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      tripType === tt.id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">Class:</label>
                <select
                  value={form.cabinClass}
                  onChange={(e) => setForm({ ...form, cabinClass: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {CABIN_CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 ml-auto">
                <input
                  type="checkbox"
                  checked={nonstopOnly}
                  onChange={(e) => setNonstopOnly(e.target.checked)}
                  className="rounded accent-blue-600"
                />
                Nonstop only
              </label>
            </div>

            {/* Airports */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 mb-4 items-end">
              <AirportAutocomplete
                label="From"
                value={form.origin}
                onChange={(code) => setForm({ ...form, origin: code })}
                placeholder="City or airport"
                excludeCode={form.destination}
              />
              <button
                type="button"
                onClick={handleSwap}
                className="hidden md:flex w-9 h-9 rounded-full border border-gray-300 items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors self-end mb-0.5"
                title="Swap origin and destination"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <AirportAutocomplete
                label="To"
                value={form.destination}
                onChange={(code) => setForm({ ...form, destination: code })}
                placeholder="City or airport"
                excludeCode={form.origin}
              />
            </div>

            {/* Dates + passengers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Departure</label>
                <input
                  type="date"
                  value={form.departureDate}
                  min={todayStr()}
                  onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {tripType === "roundTrip" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Return</label>
                  <input
                    type="date"
                    value={form.returnDate}
                    min={form.departureDate || todayStr()}
                    onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Passengers</label>
                <PassengerSelector
                  adults={form.adults}
                  children={form.children}
                  infants={form.infants}
                  onChange={(c) => setForm({ ...form, ...c })}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={searching}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {searching ? "Searching..." : "Search Flights"}
                </button>
              </div>
            </div>
          </form>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/*  RESULTS                                             */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "results" && (
            <>
              {searching && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <OfferSkeleton key={i} />)}
                </div>
              )}

              {hasSearched && !searching && (
                <>
                  {/* Results header */}
                  {offers.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {sortedAndFilteredOffers.length} flight{sortedAndFilteredOffers.length !== 1 ? "s" : ""} found
                        </h2>
                        {searchSummary && <p className="text-sm text-gray-500">{searchSummary}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            showFilters || filterStops.length > 0 || filterAirlines.length > 0
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Filters
                          {(filterStops.length > 0 || filterAirlines.length > 0) && (
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                              {filterStops.length + filterAirlines.length}
                            </span>
                          )}
                        </button>

                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          {SORT_OPTIONS.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Filter panel */}
                  {showFilters && offers.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Stop filter */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Stops</div>
                        <div className="flex flex-wrap gap-2">
                          {[0, 1, 2].map((stops) => (
                            <button
                              key={stops}
                              type="button"
                              onClick={() =>
                                setFilterStops((prev) =>
                                  prev.includes(stops) ? prev.filter((s) => s !== stops) : [...prev, stops],
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filterStops.includes(stops)
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {stops === 0 ? "Direct" : stops === 1 ? "1 Stop" : "2+ Stops"}
                            </button>
                          ))}
                          {filterStops.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFilterStops([])}
                              className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Airline filter */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Airlines</div>
                        <div className="flex flex-wrap gap-2">
                          {availableAirlines.map(({ code, name }) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() =>
                                setFilterAirlines((prev) =>
                                  prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code],
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filterAirlines.includes(code)
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {code} · {name}
                            </button>
                          ))}
                          {filterAirlines.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFilterAirlines([])}
                              className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Offer list */}
                  {sortedAndFilteredOffers.length === 0 && !searching && hasSearched && (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                      <Plane className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-1">No flights found</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {offers.length > 0
                          ? "Try adjusting your filters to see more results."
                          : "Try different dates or airports."}
                      </p>
                      {offers.length > 0 && (filterStops.length > 0 || filterAirlines.length > 0) && (
                        <button
                          onClick={() => { setFilterStops([]); setFilterAirlines([]); }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                  <Search className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-500 mb-1">Search for flights</h3>
                  <p className="text-sm text-gray-400">Enter origin, destination and dates to find available flights</p>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/*  TRAVELER DETAILS (STEP 2)                          */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "travelers" && selectedOffer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => setStep("results")}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to results
              </button>

              {/* Flight summary bar */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-4 flex-wrap">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                  {selectedOffer.airlineCode}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{selectedOffer.airline} · {selectedOffer.cabinClass}</div>
                  <div className="text-xs text-gray-500">
                    {(selectedOffer.segments || []).map((s, i) => (
                      <span key={i}>
                        {s.origin} → {s.destination}
                        {i < (selectedOffer.segments || []).length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-lg font-bold text-gray-900">{fmtMoney(selectedOffer.fareTotal, selectedOffer.currency)}</div>
                  <div className="text-xs text-gray-500">total fare</div>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" /> Traveler Details
              </h2>

              {/* Group travelers by type */}
              {(["adult", "child", "infant"]).map((type) => {
                const indexes = travelers
                  .map((t, i) => (t.type === type ? i : -1))
                  .filter((i) => i >= 0);
                if (indexes.length === 0) return null;
                const label = type === "adult" ? "Adults" : type === "child" ? "Children" : "Infants";
                return (
                  <div key={type} className="mb-5">
                    <div className="text-xs font-semibold text-gray-400 uppercase mb-3">{label} ({indexes.length})</div>
                    {indexes.map((idx, n) => {
                      const t = travelers[idx];
                      if (!t) return null;
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 hover:border-gray-300 transition-colors">
                          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            Traveler {idx + 1}
                            <span className="text-xs font-normal text-gray-400 capitalize">({t.type})</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <select
                              value={t.title}
                              onChange={(e) => updateTraveler(idx, "title", e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              {["Mr", "Mrs", "Ms", "Miss"].map((x) => <option key={x} value={x}>{x}</option>)}
                            </select>
                            <input
                              placeholder="First name *"
                              value={t.firstName}
                              onChange={(e) => updateTraveler(idx, "firstName", e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300"
                            />
                            <input
                              placeholder="Last name *"
                              value={t.lastName}
                              onChange={(e) => updateTraveler(idx, "lastName", e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300"
                            />
                            <input
                              type="date"
                              value={t.dob}
                              onChange={(e) => updateTraveler(idx, "dob", e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              title="Date of birth"
                            />
                            {t.type === "adult" && (
                              <select
                                value={t.gender}
                                onChange={(e) => updateTraveler(idx, "gender", e.target.value)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="">Gender *</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                              </select>
                            )}
                            <input
                              placeholder="Passport number"
                              value={t.passportNumber}
                              onChange={(e) => updateTraveler(idx, "passportNumber", e.target.value.toUpperCase())}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300 font-mono"
                              maxLength={12}
                            />
                            <input
                              type="date"
                              value={t.passportExpiry}
                              onChange={(e) => updateTraveler(idx, "passportExpiry", e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              title="Passport expiry date"
                            />
                            <input
                              placeholder="Nationality (e.g. LK)"
                              value={t.nationality}
                              onChange={(e) => updateTraveler(idx, "nationality", e.target.value.toUpperCase())}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300"
                              maxLength={2}
                            />
                            <input
                              placeholder="Frequent flyer #"
                              value={t.frequentFlyerNumber}
                              onChange={(e) => updateTraveler(idx, "frequentFlyerNumber", e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Contact */}
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-400" /> Contact Details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    placeholder="Full name"
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300"
                  />
                  <input
                    placeholder="Email *"
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300"
                  />
                  <input
                    placeholder="Phone"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-300"
                  />
                </div>
              </div>

              <button
                onClick={goToReview}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
              >
                Review Booking <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/*  REVIEW & CONFIRM (STEP 3)                         */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "review" && selectedOffer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => setStep("travelers")}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to traveler details
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Review &amp; Confirm</h2>

              {/* Flight card */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                    {selectedOffer.airlineCode}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{selectedOffer.airline} · {selectedOffer.cabinClass}</span>
                  {selectedOffer.refundable && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Refundable</span>
                  )}
                </div>
                {(selectedOffer.segments || []).map((seg, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600 ml-9">
                    <span className="font-semibold text-gray-900">{seg.origin}</span>
                    <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                    <span className="font-semibold text-gray-900">{seg.destination}</span>
                    <span className="text-gray-400">·</span>
                    <span>{fmtDate(seg.departureAt)} → {fmtDate(seg.arrivalAt)}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-xs">{seg.marketingCarrier}{seg.flightNumber?.replace(seg.marketingCarrier, "")}</span>
                  </div>
                ))}
              </div>

              {/* Travelers */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Travelers</div>
                {travelers.map((t, i) => (
                  <div key={i} className="text-sm text-gray-700 flex items-center gap-2 py-1">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                    {t.title} {t.firstName} {t.lastName}
                    <span className="text-xs text-gray-400 capitalize">({t.type})</span>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Contact</div>
                <div className="text-sm text-gray-700">{contact.name} · {contact.email}{contact.phone ? ` · ${contact.phone}` : ""}</div>
              </div>

              {/* Price breakdown */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Base fare</span>
                  <span>{fmtMoney(selectedOffer.baseFare, selectedOffer.currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Taxes &amp; fees</span>
                  <span>{fmtMoney(selectedOffer.taxes, selectedOffer.currency)}</span>
                </div>
                {!selectedOffer.refundable && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                    <AlertCircle className="w-3 h-3" /> This fare is non-refundable
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 mt-3 pt-3 border-t border-gray-100">
                  <span>Total</span>
                  <span>{fmtMoney(selectedOffer.fareTotal, selectedOffer.currency)}</span>
                </div>
              </div>

              <button
                onClick={confirmBooking}
                disabled={booking}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
              >
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {booking ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/*  CONFIRMATION (STEP 4)                              */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "confirmation" && confirmedBooking && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Booking Confirmed</h2>
              <p className="text-gray-500 mb-6">Your flight has been booked successfully</p>

              <div className="inline-flex items-center gap-3 bg-gray-50 rounded-xl px-6 py-4 mb-6">
                <div>
                  <div className="text-xs text-gray-400 uppercase font-medium mb-0.5">PNR / Record Locator</div>
                  <div className="text-2xl font-mono font-bold text-blue-600">{confirmedBooking.pnr}</div>
                </div>
                <button
                  onClick={() => copyPNR(confirmedBooking.pnr)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                  title="Copy PNR"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Booking summary */}
              {selectedOffer && (
                <div className="text-left max-w-md mx-auto mb-6 bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between"><span>Airline</span><span className="font-medium text-gray-900">{selectedOffer.airline}</span></div>
                    <div className="flex justify-between"><span>Route</span><span className="font-medium text-gray-900">{selectedOffer.segments?.[0]?.origin} → {selectedOffer.segments?.[selectedOffer.segments.length - 1]?.destination}</span></div>
                    <div className="flex justify-between"><span>Travelers</span><span className="font-medium text-gray-900">{travelers.length}</span></div>
                    <div className="flex justify-between"><span>Total</span><span className="font-medium text-gray-900">{fmtMoney(selectedOffer.fareTotal, selectedOffer.currency)}</span></div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={resetSearch}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  New Search
                </button>
                <button
                  onClick={() => { setActiveTab("bookings"); resetSearch(); }}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  View Bookings
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/*  MANAGE BOOKINGS TAB                                   */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Filters bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex gap-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setBookingStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      bookingStatusFilter === tab.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1.5 opacity-70">{statusCounts[tab.id]}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search by PNR or route..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs w-56 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          {loadingBookings ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-16 text-center">
              <ListChecks className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-500 mb-1">
                {bookings.length === 0 ? "No flight bookings yet" : "No matching bookings"}
              </h3>
              <p className="text-sm text-gray-400">
                {bookings.length === 0
                  ? "Search and book flights to see them here"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">PNR</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Departure</th>
                      <th className="px-4 py-3">Travelers</th>
                      <th className="px-4 py-3">Fare</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-gray-900">{b.pnr || "-"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {b.segments?.[0]?.origin} → {b.segments?.[b.segments.length - 1]?.destination}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(b.segments?.[0]?.departureAt)}</td>
                        <td className="px-4 py-3 text-gray-600">{b.travelers?.length || 0}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{fmtMoney(b.totalAmount, b.currency)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              b.status === "cancelled"
                                ? "bg-red-50 text-red-700"
                                : b.status === "confirmed" || b.status === "ticketed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {b.status !== "cancelled" && (
                            <button
                              onClick={() => setCancelDialog({ id: b.id, reason: "" })}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" /> Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredBookings.length > 10 && (
                <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 text-center">
                  Showing {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/*  CANCEL DIALOG (MODAL)                                 */}
      {/* ══════════════════════════════════════════════════════ */}
      {cancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            <textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelDialog.reason}
              onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelDialog(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={() => cancelBooking(cancelDialog.id, cancelDialog.reason)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </FlightErrorBoundary>
  );
}
