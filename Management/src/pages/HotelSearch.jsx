import { useState, useEffect, useMemo } from "react";
import {
  Hotel, Search, X, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, Ban, ListChecks, Star,
  Users, MapPin, Building2, Info,
} from "lucide-react";
import { toast } from "react-hot-toast";
import HotelService from "../services/hotel.service";

const todayStr = () => new Date().toISOString().split("T")[0];
const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0];
};

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(amount, currency) {
  if (amount == null) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Hotel Card
// ═══════════════════════════════════════════════════════════════════
function HotelCard({ offer, onSelect }) {
  const rate = offer.cheapestRate || {};
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col md:flex-row gap-4 hover:border-blue-300 hover:shadow-md transition-all">
      {/* Image */}
      <div className="w-full md:w-48 h-36 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {offer.images?.[0] ? (
          <img src={offer.images[0]} alt={offer.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Building2 className="w-10 h-10" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-semibold text-gray-900">{offer.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={offer.starRating || 3} />
              <span className="text-xs text-gray-400">{offer.starRating}-star</span>
            </div>
          </div>
        </div>
        {offer.address && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3" /> {offer.address}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{rate.roomType || "Standard"}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{rate.boardType || "Room Only"}</span>
          {rate.refundable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Refundable</span>
          )}
        </div>
      </div>

      {/* Price + CTA */}
      <div className="text-right shrink-0 flex flex-col justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">{fmtMoney(rate.totalAmount, rate.currency)}</div>
          <div className="text-xs text-gray-500">incl. taxes</div>
        </div>
        <button
          onClick={() => onSelect(offer)}
          className="mt-3 flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all active:scale-95"
        >
          Select <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════
export default function HotelSearch() {
  const [activeTab, setActiveTab] = useState("search");

  // ── Search form ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    city: "",
    country: "LK",
    checkin: todayStr(),
    checkout: tomorrowStr(),
    adults: 1, children: 0,
    currency: "USD",
  });
  const [searching, setSearching] = useState(false);
  const [offers, setOffers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Booking flow ─────────────────────────────────────────────────
  const [step, setStep] = useState("results");
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [guests, setGuests] = useState([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // ── Manage bookings ──────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(null);

  const paxCount = form.adults + form.children;

  // ═══════════════════════════════════════════════════════════════
  //  Search
  // ═══════════════════════════════════════════════════════════════
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!form.city && !form.checkin) { toast.error("City and dates are required"); return; }

    setSearching(true); setHasSearched(true); setOffers([]); setStep("results");
    try {
      const response = await HotelService.search({
        city: form.city || undefined,
        country: form.country,
        checkin: form.checkin,
        checkout: form.checkout,
        occupancies: [{ adults: form.adults, children: form.children || 0 }],
        currency: form.currency,
        guestNationality: form.country,
        limit: 20,
      });
      setOffers(response.data || []);
      if (!response.data?.length) toast("No hotels found", { icon: "🏨" });
    } catch (err) {
      toast.error(err.message || "Hotel search failed");
    } finally { setSearching(false); }
  };

  const selectOffer = (offer) => {
    setSelectedOffer(offer);
    setGuests(Array.from({ length: paxCount }, () => ({ firstName: "", lastName: "", title: "Mr" })));
    setStep("guests");
  };

  const updateGuest = (i, field, value) => setGuests((prev) => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g));

  const goToReview = () => {
    for (const g of guests) { if (!g.firstName || !g.lastName) { toast.error("Every guest needs a first and last name"); return; } }
    if (!contact.email) { toast.error("Contact email is required"); return; }
    setStep("review");
  };

  const confirmBooking = async () => {
    setBooking(true);
    try {
      // Prebook with offerId, then book
      const offerId = selectedOffer.cheapestRate?.offerId;
      const pre = await HotelService.prebook({ offerId: offerId || 'mock-offer' });
      const response = await HotelService.book({
        prebookId: pre.data?.prebookId || "mock-prebook-id",
        guests, contact, offer: selectedOffer,
      });
      setConfirmedBooking(response.data);
      setStep("confirmation");
      toast.success("Hotel booked");
    } catch (err) { toast.error(err.message || "Booking failed"); }
    finally { setBooking(false); }
  };

  const resetSearch = () => {
    setOffers([]); setHasSearched(false); setSelectedOffer(null); setGuests([]);
    setContact({ name: "", email: "", phone: "" }); setConfirmedBooking(null); setStep("results");
  };

  // ═══════════════════════════════════════════════════════════════
  //  Manage bookings
  // ═══════════════════════════════════════════════════════════════
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try { const r = await HotelService.listBookings(); setBookings(r.data || []); }
    catch (err) { toast.error(err.message || "Failed to load bookings"); }
    finally { setLoadingBookings(false); }
  };
  useEffect(() => { if (activeTab === "bookings") fetchBookings(); }, [activeTab]);

  const cancelBooking = async (id, reason) => {
    try { await HotelService.cancelBooking(id, reason); toast.success("Cancelled"); setCancelDialog(null); fetchBookings(); }
    catch (err) { toast.error(err.message || "Cancel failed"); }
  };

  // ═══════════════════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25"><Hotel className="w-6 h-6" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Hotels</h1><p className="text-sm text-gray-500">Search and book hotels worldwide</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { id: "search", label: "Search & Book", icon: Search },
          { id: "bookings", label: "Bookings", icon: ListChecks },
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === "search") resetSearch(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ SEARCH TAB ═══════════ */}
      {activeTab === "search" && (
        <>
          {/* Search form */}
          {step === "results" && (
            <>
              <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Colombo, Dubai" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                    <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none">
                      <option value="LK">Sri Lanka</option>
                      <option value="AE">UAE</option>
                      <option value="IN">India</option>
                      <option value="MV">Maldives</option>
                      <option value="TH">Thailand</option>
                      <option value="SG">Singapore</option>
                      <option value="MY">Malaysia</option>
                      <option value="GB">UK</option>
                      <option value="US">USA</option>
                      <option value="FR">France</option>
                      <option value="IT">Italy</option>
                      <option value="JP">Japan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
                    <input type="date" value={form.checkin} min={todayStr()} onChange={(e) => setForm({ ...form, checkin: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
                    <input type="date" value={form.checkout} min={form.checkin || todayStr()} onChange={(e) => setForm({ ...form, checkout: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Guests</label>
                    <div className="flex items-center gap-1">
                      <select value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
                        className="rounded-lg border border-gray-300 px-2 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none flex-1">
                        {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n} adult{n>1?"s":""}</option>)}
                      </select>
                      <select value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
                        className="rounded-lg border border-gray-300 px-2 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none flex-1">
                        {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} child{n!==1?"ren":""}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={searching}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold hover:from-amber-700 hover:to-orange-700 disabled:opacity-60 transition-all shadow-md shadow-amber-500/20 active:scale-[0.98]">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {searching ? "Searching..." : "Search Hotels"}
                </button>
              </form>

              {/* Results */}
              {searching && <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /><p className="text-sm text-gray-400 mt-2">Searching hotels...</p></div>}
              {hasSearched && !searching && (
                offers.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <Hotel className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">No hotels found. Try a different city or dates.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">{offers.length} hotel{offers.length !== 1 ? "s" : ""} found</p>
                    {offers.map((offer) => <HotelCard key={offer.hotelId} offer={offer} onSelect={selectOffer} />)}
                  </div>
                )
              )}
            </>
          )}

          {/* ═══════════ GUESTS STEP ═══════════ */}
          {step === "guests" && selectedOffer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button onClick={() => setStep("results")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ChevronLeft className="w-4 h-4" /> Back to results</button>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-4 flex-wrap">
                <div><div className="text-sm font-semibold">{selectedOffer.name}</div><StarRating rating={selectedOffer.starRating} /></div>
                <div className="ml-auto text-right"><div className="text-lg font-bold">{fmtMoney(selectedOffer.cheapestRate?.totalAmount, selectedOffer.cheapestRate?.currency)}</div><div className="text-xs text-gray-500">total</div></div>
              </div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-gray-400" /> Guest Details</h2>
              {guests.map((g, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Guest {i + 1}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <select value={g.title} onChange={(e) => updateGuest(i, "title", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">{["Mr","Mrs","Ms","Miss"].map(x=><option key={x}>{x}</option>)}</select>
                    <input placeholder="First name *" value={g.firstName} onChange={(e) => updateGuest(i, "firstName", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input placeholder="Last name *" value={g.lastName} onChange={(e) => updateGuest(i, "lastName", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              ))}
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-gray-400" /> Contact</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input placeholder="Email *" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <button onClick={goToReview} className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors">Review Booking <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}

          {/* ═══════════ REVIEW STEP ═══════════ */}
          {step === "review" && selectedOffer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button onClick={() => setStep("guests")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ChevronLeft className="w-4 h-4" /> Back</button>
              <h2 className="text-lg font-semibold mb-4">Review & Confirm</h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="font-semibold">{selectedOffer.name}</div>
                <div className="text-sm text-gray-500">{fmtDate(form.checkin)} → {fmtDate(form.checkout)} · {guests.length} guest{guests.length!==1?"s":""}</div>
              </div>
              <div className="mb-4"><div className="text-xs font-semibold text-gray-400 uppercase mb-2">Guests</div>
                {guests.map((g,i)=><div key={i} className="text-sm text-gray-700">{g.title} {g.firstName} {g.lastName}</div>)}
              </div>
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{fmtMoney(selectedOffer.cheapestRate?.totalAmount, selectedOffer.cheapestRate?.currency)}</span></div>
              </div>
              <button onClick={confirmBooking} disabled={booking}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-all">
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {booking ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          )}

          {/* ═══════════ CONFIRMATION ═══════════ */}
          {step === "confirmation" && confirmedBooking && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-9 h-9 text-emerald-600" /></div>
              <h2 className="text-xl font-bold mb-1">Booking Confirmed</h2>
              <p className="text-gray-500 mb-4">{confirmedBooking.hotelName || "Hotel"} · {confirmedBooking.bookingId}</p>
              <button onClick={resetSearch} className="px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700">New Search</button>
            </div>
          )}
        </>
      )}

      {/* ═══════════ BOOKINGS TAB ═══════════ */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingBookings ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
          ) : bookings.length === 0 ? (
            <div className="p-16 text-center"><ListChecks className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-500">No hotel bookings yet.</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <tr><th className="px-4 py-3">Hotel</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Guests</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{b.hotelName || "Unknown"}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(b.checkin)}</td>
                    <td className="px-4 py-3 text-gray-600">{b.guestInfo?.length || "-"}</td>
                    <td className="px-4 py-3 font-medium">{fmtMoney(b.totalAmount, b.currency)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${b.status==="cancelled"?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{b.status}</span></td>
                    <td className="px-4 py-3">{b.status!=="cancelled" && <button onClick={()=>setCancelDialog({id:b.id,reason:""})} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium"><Ban className="w-3.5 h-3.5"/>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Cancel Dialog */}
      {cancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Cancel Booking</h3>
            <textarea placeholder="Reason (optional)" value={cancelDialog.reason} onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelDialog(null)} className="px-4 py-2 rounded-lg border text-sm">Keep</button>
              <button onClick={() => cancelBooking(cancelDialog.id, cancelDialog.reason)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm">Cancel Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
