import { useState, useEffect } from "react";
import {
  Plane, Search, Calendar, Users, X, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, Ban, ArrowRightLeft, Luggage, ListChecks,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { flightAPI } from "../services/flight.service";

const CABIN_CLASSES = ["Economy", "Premium Economy", "Business", "First"];

const emptyTraveler = (type = "adult") => ({
  type, title: "Mr", firstName: "", lastName: "", dob: "", gender: "",
  passportNumber: "", passportExpiry: "", nationality: "", frequentFlyerNumber: "",
});

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(amount, currency) {
  if (amount == null) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
}

const FlightSearch = () => {
  const [activeTab, setActiveTab] = useState("search");

  // ── Search form ────────────────────────────────────────────────
  const [tripType, setTripType] = useState("oneWay");
  const [form, setForm] = useState({
    origin: "", destination: "", departureDate: "", returnDate: "",
    adults: 1, children: 0, infants: 0, cabinClass: "Economy",
  });
  const [searching, setSearching] = useState(false);
  const [offers, setOffers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Booking wizard ─────────────────────────────────────────────
  const [step, setStep] = useState("results"); // results | travelers | review | confirmation
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // ── Manage bookings tab ──────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const paxCount = Number(form.adults) + Number(form.children) + Number(form.infants);

  const handleSearch = async (e) => {
    e.preventDefault();
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
    try {
      const response = await flightAPI.search({
        origin: form.origin,
        destination: form.destination,
        departureDate: form.departureDate,
        returnDate: tripType === "roundTrip" ? form.returnDate : undefined,
        adults: Number(form.adults),
        children: Number(form.children),
        infants: Number(form.infants),
        cabinClass: form.cabinClass,
        tripType,
      });
      setOffers(response.data || []);
      if (!response.data?.length) toast("No flights found for this search", { icon: "✈️" });
    } catch (error) {
      toast.error(error.message || "Flight search failed");
    } finally {
      setSearching(false);
    }
  };

  const selectOffer = (offer) => {
    setSelectedOffer(offer);
    setTravelers(
      Array.from({ length: form.adults }, () => emptyTraveler("adult"))
        .concat(Array.from({ length: form.children }, () => emptyTraveler("child")))
        .concat(Array.from({ length: form.infants }, () => emptyTraveler("infant")))
    );
    setStep("travelers");
  };

  const updateTraveler = (index, field, value) => {
    setTravelers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const goToReview = () => {
    for (const t of travelers) {
      if (!t.firstName || !t.lastName) {
        toast.error("Every traveler needs a first and last name");
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
    setSelectedOffer(null);
    setTravelers([]);
    setContact({ name: "", email: "", phone: "" });
    setConfirmedBooking(null);
    setStep("results");
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const cancelBooking = async (id) => {
    if (!window.confirm("Cancel this flight booking?")) return;
    try {
      await flightAPI.cancelBooking(id, "Cancelled by agent");
      toast.success("Booking cancelled");
      fetchBookings();
    } catch (error) {
      toast.error(error.message || "Failed to cancel booking");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Plane className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flights</h1>
          <p className="text-sm text-gray-500">Search, price and book flights via Travelport</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { id: "search", label: "Search & Book", icon: Search },
          { id: "bookings", label: "Manage Bookings", icon: ListChecks },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === "search") resetSearch(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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

      {activeTab === "search" && (
        <>
          {step === "results" && (
            <>
              <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                <div className="flex gap-4 mb-4">
                  {["oneWay", "roundTrip"].map((tt) => (
                    <label key={tt} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="radio"
                        checked={tripType === tt}
                        onChange={() => setTripType(tt)}
                        className="accent-blue-600"
                      />
                      {tt === "oneWay" ? "One way" : "Round trip"}
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Origin (airport code)</label>
                    <input
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                      placeholder="e.g. CMB"
                      maxLength={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Destination (airport code)</label>
                    <input
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
                      placeholder="e.g. DXB"
                      maxLength={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Departure date</label>
                    <input
                      type="date"
                      value={form.departureDate}
                      onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  {tripType === "roundTrip" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Return date</label>
                      <input
                        type="date"
                        value={form.returnDate}
                        onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    ["adults", "Adults"],
                    ["children", "Children"],
                    ["infants", "Infants"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                      <input
                        type="number"
                        min={key === "adults" ? 1 : 0}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: Math.max(key === "adults" ? 1 : 0, Number(e.target.value)) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cabin class</label>
                    <select
                      value={form.cabinClass}
                      onChange={(e) => setForm({ ...form, cabinClass: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {CABIN_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {searching ? "Searching..." : "Search Flights"}
                </button>
              </form>

              {hasSearched && !searching && (
                <div className="space-y-3">
                  {offers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No flights found. Try adjusting your search.</div>
                  )}
                  {offers.map((offer) => (
                    <div key={offer.offerId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                          <Plane className="w-4 h-4 text-blue-600" />
                          {offer.airline} · {offer.cabinClass}
                          {offer.refundable && (
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Refundable</span>
                          )}
                        </div>
                        {(offer.segments || []).map((seg, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-gray-600 mb-1">
                            <span className="font-medium text-gray-900">{seg.origin}</span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium text-gray-900">{seg.destination}</span>
                            <span className="text-gray-400">|</span>
                            <span>{formatDateTime(seg.departureAt)} → {formatDateTime(seg.arrivalAt)}</span>
                            <span className="text-gray-400">|</span>
                            <span>{seg.marketingCarrier}{seg.flightNumber?.replace(seg.marketingCarrier, "")}</span>
                            {seg.stops === 0 && <span className="text-xs text-emerald-600">Direct</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-gray-900">{formatMoney(offer.fareTotal, offer.currency)}</div>
                        <div className="text-xs text-gray-500 mb-3">total for {paxCount} traveler{paxCount > 1 ? "s" : ""}</div>
                        <button
                          onClick={() => selectOffer(offer)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Select <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "travelers" && selectedOffer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button onClick={() => setStep("results")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ChevronLeft className="w-4 h-4" /> Back to results
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Traveler Details</h2>

              {travelers.map((t, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3 capitalize">Traveler {i + 1} ({t.type})</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <select value={t.title} onChange={(e) => updateTraveler(i, "title", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      {["Mr", "Mrs", "Ms", "Miss"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <input placeholder="First name" value={t.firstName} onChange={(e) => updateTraveler(i, "firstName", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input placeholder="Last name" value={t.lastName} onChange={(e) => updateTraveler(i, "lastName", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input type="date" placeholder="DOB" value={t.dob} onChange={(e) => updateTraveler(i, "dob", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input placeholder="Passport number" value={t.passportNumber} onChange={(e) => updateTraveler(i, "passportNumber", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input type="date" placeholder="Passport expiry" value={t.passportExpiry} onChange={(e) => updateTraveler(i, "passportExpiry", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input placeholder="Nationality" value={t.nationality} onChange={(e) => updateTraveler(i, "nationality", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input placeholder="Frequent flyer #" value={t.frequentFlyerNumber} onChange={(e) => updateTraveler(i, "frequentFlyerNumber", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              ))}

              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">Contact Details</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input placeholder="Email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <button onClick={goToReview} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                Review Booking <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "review" && selectedOffer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button onClick={() => setStep("travelers")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ChevronLeft className="w-4 h-4" /> Back to traveler details
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h2>

              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">{selectedOffer.airline} · {selectedOffer.cabinClass}</div>
                {(selectedOffer.segments || []).map((seg, i) => (
                  <div key={i} className="text-sm text-gray-600">
                    {seg.origin} → {seg.destination} · {formatDateTime(seg.departureAt)} → {formatDateTime(seg.arrivalAt)} · {seg.marketingCarrier}{seg.flightNumber?.replace(seg.marketingCarrier, "")}
                  </div>
                ))}
              </div>

              <div className="mb-4 text-sm text-gray-600">
                <div>Travelers: {travelers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}</div>
                <div>Contact: {contact.name} · {contact.email} · {contact.phone}</div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-4 mb-6">
                <div className="text-sm text-gray-500 flex items-center gap-1"><Luggage className="w-4 h-4" /> Base {formatMoney(selectedOffer.baseFare, selectedOffer.currency)} + Taxes {formatMoney(selectedOffer.taxes, selectedOffer.currency)}</div>
                <div className="text-xl font-bold text-gray-900">{formatMoney(selectedOffer.fareTotal, selectedOffer.currency)}</div>
              </div>

              <button
                onClick={confirmBooking}
                disabled={booking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {booking ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          )}

          {step === "confirmation" && confirmedBooking && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Booking Confirmed</h2>
              <p className="text-gray-500 mb-4">PNR / Record Locator</p>
              <div className="text-3xl font-mono font-bold text-blue-600 mb-6">{confirmedBooking.pnr}</div>
              <button onClick={resetSearch} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                Search Another Flight
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingBookings ? (
            <div className="p-12 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No flight bookings yet.</div>
          ) : (
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
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{b.pnr || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {b.segments?.[0]?.origin} → {b.segments?.[b.segments.length - 1]?.destination}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(b.segments?.[0]?.departureAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{b.travelers?.length || 0}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatMoney(b.totalAmount, b.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.status === "cancelled" ? "bg-red-50 text-red-700"
                        : b.status === "confirmed" || b.status === "ticketed" ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.status !== "cancelled" && (
                        <button onClick={() => cancelBooking(b.id)} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium">
                          <Ban className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default FlightSearch;
