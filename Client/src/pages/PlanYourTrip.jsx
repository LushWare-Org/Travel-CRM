import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  Clock,
  Wallet,
  CreditCard,
  Sparkles,
  Globe,
} from "lucide-react";

const international = [
  { id: 1, name: "Maldives", country: "Maldives", region: "Asia" },
  { id: 2, name: "Bali", country: "Indonesia", region: "Asia" },
  { id: 3, name: "Switzerland", country: "Switzerland", region: "Europe" },
  { id: 4, name: "Paris", country: "France", region: "Europe" },
  { id: 5, name: "Dubai", country: "UAE", region: "Middle East" },
  { id: 6, name: "Santorini", country: "Greece", region: "Europe" },
  { id: 7, name: "Thailand", country: "Thailand", region: "Asia" },
  { id: 8, name: "New Zealand", country: "New Zealand", region: "Oceania" },
];

const local = [
  { id: 101, name: "Kashmir", state: "Jammu & Kashmir", region: "North India" },
  { id: 102, name: "Kerala", state: "Kerala", region: "South India" },
  { id: 103, name: "Goa", state: "Goa", region: "West India" },
  { id: 104, name: "Rajasthan", state: "Rajasthan", region: "North India" },
  { id: 105, name: "Himachal Pradesh", state: "Himachal Pradesh", region: "North India" },
  { id: 106, name: "Andaman", state: "Andaman & Nicobar", region: "Bay of Bengal" },
  { id: 107, name: "Ladakh", state: "Ladakh", region: "North India" },
  { id: 108, name: "Uttarakhand", state: "Uttarakhand", region: "North India" },
];

const activities = [
  "Beach & Relaxation",
  "Adventure & Trekking",
  "Cultural Exploration",
  "Wildlife Safari",
  "Food & Culinary",
  "Romantic Getaway",
  "Family Vacation",
  "Luxury Experience",
];

const budgetOptions = [
  { label: "Budget", range: "$500 - $1,500", icon: Wallet },
  { label: "Mid-Range", range: "$1,500 - $3,500", icon: CreditCard },
  { label: "Premium", range: "$3,500 - $7,000", icon: Sparkles },
  { label: "Luxury", range: "$7,000+", icon: Globe },
];

export default function PlanYourTrip() {
  const [step, setStep] = useState(1);
  const [destTab, setDestTab] = useState("intl");
  const [selectedDest, setSelectedDest] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState(2);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [budget, setBudget] = useState("");
  const [accommodation, setAccommodation] = useState("4-star");
  const [mealPlan, setMealPlan] = useState("breakfast");
  const [specialRequest, setSpecialRequest] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');

  const duration =
    startDate && endDate
      ? Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const progress = (step / 4) * 100;

  const next = () => {
    console.log('PlanYourTrip.next called', { step, selectedDest, startDate, endDate, name, email, phone });
    // validations
    if (step === 1 && !selectedDest) {
      setValidationMsg('Please choose a destination before continuing.');
      return;
    }
    if (step === 2 && (!startDate || !endDate)) {
      setValidationMsg('Please select travel dates before continuing.');
      return;
    }
    if (step === 4 && (!name || !email || !phone)) {
      setValidationMsg('Please fill in your name, email and phone to submit.');
      return;
    }
    setValidationMsg('');
    if (step < 4) setStep(step + 1);
    else {
      console.log('All validations passed, showing success modal');
      setShowSuccess(true);
    }
  };

  const back = () => step > 1 && setStep(step - 1);

  // --- Date Range Calendar ---
  function DateRangeCalendar({ initialStart, initialEnd, onChange, onClose }) {
    const calRef = useRef(null);
    const [viewMonth, setViewMonth] = useState(() => {
      const d = initialStart ? new Date(initialStart) : new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [rangeStart, setRangeStart] = useState(initialStart ? new Date(initialStart) : null);
    const [rangeEnd, setRangeEnd] = useState(initialEnd ? new Date(initialEnd) : null);
    const [selecting, setSelecting] = useState(false);
    const [awaitingEnd, setAwaitingEnd] = useState(false);

    useEffect(() => {
      function onDoc(e) {
        if (calRef.current && !calRef.current.contains(e.target)) onClose();
      }
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, [onClose]);

    const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

    const formatISO = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    function buildCalendar(month) {
      const first = startOfMonth(month);
      const startWeekDay = first.getDay();
      const total = daysInMonth(month.getFullYear(), month.getMonth());
      const cells = [];
      for (let i = 0; i < startWeekDay; i++) cells.push(null);
      for (let d = 1; d <= total; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
      return cells;
    }

    function inRange(date) {
      if (!rangeStart || !rangeEnd) return false;
      const a = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const b = rangeStart < rangeEnd ? rangeEnd : rangeStart;
      return date >= startOfDay(a) && date <= startOfDay(b);
    }

    function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

    function handleDayDown(d) {
      if (awaitingEnd && rangeStart) {
        setRangeEnd(d);
        setAwaitingEnd(false);
        const a = rangeStart < d ? rangeStart : d;
        const b = rangeStart < d ? d : rangeStart;
        onChange(formatISO(a), formatISO(b));
        return;
      }

      setSelecting(true);
      setRangeStart(d);
      setRangeEnd(d);
      setAwaitingEnd(false);
    }

    function handleDayEnter(d) {
      if (!selecting && !awaitingEnd) return;
      setRangeEnd(d);
    }

    function handleDayUp() {
      setSelecting(false);
      if (rangeStart && rangeEnd) {
        if (startOfDay(rangeStart).getTime() === startOfDay(rangeEnd).getTime()) {
          setAwaitingEnd(true);
          return;
        }
        const a = rangeStart < rangeEnd ? rangeStart : rangeEnd;
        const b = rangeStart < rangeEnd ? rangeEnd : rangeStart;
        onChange(formatISO(a), formatISO(b));
      }
    }

    const cells = buildCalendar(viewMonth);

    return (
      <div ref={calRef} className="bg-white rounded-xl shadow-lg p-4 w-[320px]">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="px-2 py-1">◀</button>
          <div className="font-semibold">{viewMonth.toLocaleString(undefined, { month: 'long' })} {viewMonth.getFullYear()}</div>
          <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="px-2 py-1">▶</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500 mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div onMouseUp={handleDayUp} className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            const isNull = c === null;
            const isSelected = !isNull && inRange(startOfDay(c));
            return (
              <div key={i} className={`h-8 flex items-center justify-center ${isNull ? '' : 'cursor-pointer'}`}>
                {isNull ? <div /> : (
                  <div
                    onMouseDown={() => handleDayDown(startOfDay(c))}
                    onMouseEnter={() => handleDayEnter(startOfDay(c))}
                    className={`w-8 h-8 rounded-md flex items-center justify-center ${isSelected ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'}`}
                  >
                    {c.getDate()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-3">
          <button type="button" onClick={() => { onClose(); }} className="px-3 py-1 text-sm text-gray-600">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 font-opensans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <form onSubmit={(e) => { e.preventDefault(); next(); }}>
          <div className="bg-white rounded-3xl shadow-md p-6 mb-6">
            <div className="max-w-5xl mx-auto px-8">
              <div className="flex items-start justify-between">
                {[1, 2, 3, 4].map((s, idx) => (
                  <div key={s} className="flex items-start" style={{ flex: s < 4 ? '1 1 0%' : '0 0 auto' }}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                          s <= step
                            ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {s}
                      </div>
                      <div className="mt-2 text-xs text-center text-gray-600 font-medium whitespace-nowrap">
                        {['Destination', 'Dates & Travelers', 'Preferences', 'Contact Info'][idx]}
                      </div>
                    </div>
                    {s < 4 && (
                      <div
                        className={`flex-1 h-1 mx-4 mt-5 transition-all ${
                          s < step ? 'bg-gradient-to-r from-orange-600 to-yellow-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* ==== STEP 1 : Destination ==== */}
          {step === 1 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">
                  Where do you want to go?
                </h2>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200">
                {["intl", "local"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDestTab(t)}
                    className={`px-6 py-2 font-semibold transition-all ${
                      destTab === t
                        ? "text-orange-600 border-b-2 border-orange-600"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {t === "intl" ? "International" : "Local (India)"}
                  </button>
                ))}
              </div>

              {/* Destination List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                {(destTab === "intl" ? international : local).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDest(d)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedDest?.id === d.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{d.name}</p>
                        <p className="text-sm text-gray-500">
                          {d.country || d.state} • {d.region}
                        </p>
                      </div>
                      {selectedDest?.id === d.id && (
                        <Check className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ==== STEP 2 : Dates & Travelers ==== */}
          {step === 2 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">
                  When & How Many?
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-sm font-semibold mb-2">Start Date</label>
                  <input
                    readOnly
                    type="text"
                    value={startDate || ""}
                    onClick={() => setShowCal(true)}
                    placeholder="Select start date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white cursor-pointer"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold mb-2">End Date</label>
                  <input
                    readOnly
                    type="text"
                    value={endDate || ""}
                    onClick={() => setShowCal(true)}
                    placeholder="Select end date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white cursor-pointer"
                    required
                  />
                </div>
                {showCal && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 mt-4 z-50">
                    <DateRangeCalendar
                      initialStart={startDate}
                      initialEnd={endDate}
                      onChange={(s, e) => { setStartDate(s); setEndDate(e); setShowCal(false); }}
                      onClose={() => setShowCal(false)}
                    />
                  </div>
                )}
              </div>

              {duration > 0 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <p className="text-orange-800 font-semibold">
                    {duration} Days / {duration - 1} Nights
                  </p>
                </div>
              )}

              <div className="mt-6">
                <label className="block text-sm font-semibold mb-3">Travelers</label>
                <div className="flex items-center space-x-6 bg-gray-50 rounded-xl p-5">
                  <button
                    type="button"
                    onClick={() => setTravelers(Math.max(1, travelers - 1))}
                    className="w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-3xl font-bold text-gray-900 font-poppins">{travelers}</div>
                    <div className="text-sm text-gray-600">Person(s)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTravelers(travelers + 1)}
                    className="w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==== STEP 3 : Preferences ==== */}
          {step === 3 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 space-y-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">
                  Customize Your Trip
                </h2>
              </div>

              {/* Activities */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Interests</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {activities.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setSelectedActivities((prev) =>
                          prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                        )
                      }
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        selectedActivities.includes(a)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 mr-1" /> Budget per person
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {budgetOptions.map((b) => {
                    const Icon = b.icon;
                    return (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => setBudget(b.label)}
                        className={`p-5 rounded-xl border-2 transition-all ${
                          budget === b.label
                            ? "border-orange-500 bg-gradient-to-br from-orange-50 to-yellow-50"
                            : "border-gray-200 hover:border-orange-300"
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 mx-auto mb-2 ${
                            budget === b.label ? "text-orange-600" : "text-gray-400"
                          }`}
                        />
                        <div className="font-semibold">{b.label}</div>
                        <div className="text-xs text-gray-600">{b.range}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accommodation & Meals */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Accommodation</label>
                  <select
                    value={accommodation}
                    onChange={(e) => setAccommodation(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="3-star">3-Star Comfort</option>
                    <option value="4-star">4-Star Premium</option>
                    <option value="5-star">5-Star Luxury</option>
                    <option value="boutique">Boutique Stay</option>
                    <option value="villa">Private Villa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Meal Plan</label>
                  <select
                    value={mealPlan}
                    onChange={(e) => setMealPlan(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="breakfast">Breakfast Only</option>
                    <option value="half-board">Half Board</option>
                    <option value="full-board">Full Board</option>
                    <option value="all-inclusive">All Inclusive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Special Requests</label>
                <textarea
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  placeholder="Anniversary, dietary needs, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ==== STEP 4 : Contact ==== */}
          {step === 4 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">Your Contact Details</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* full trip summary */}
                <div>
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200 h-full">
                    <h3 className="font-bold mb-4 flex items-center text-lg">
                      <Check className="w-5 h-5 mr-2 text-orange-600" /> Trip Summary
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                      <div>
                        <div className="text-xs text-gray-500">Destination</div>
                        <div className="font-semibold">{selectedDest?.name || '—'}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Dates</div>
                        <div className="font-semibold">{startDate ? startDate : '—'} {startDate && endDate ? `→ ${endDate}` : ''}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Duration</div>
                        <div className="font-semibold">{duration} days</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Travelers</div>
                        <div className="font-semibold">{travelers}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Budget</div>
                        <div className="font-semibold">{budget || 'Not selected'}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Accommodation</div>
                        <div className="font-semibold">{accommodation}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Meal Plan</div>
                        <div className="font-semibold">{mealPlan}</div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">Special Requests</div>
                        <div className="font-semibold">{specialRequest || '—'}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">Interests</div>
                        <div className="font-semibold">{selectedActivities.length ? selectedActivities.join(', ') : 'None selected'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==== Navigation Buttons ==== */}
          <div className="flex gap-4 mt-10">
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 flex items-center justify-center space-x-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={next}
              aria-disabled={
                (step === 1 && !selectedDest) ||
                (step === 2 && (!startDate || !endDate)) ||
                (step === 4 && (!name || !email || !phone))
              }
              className={`flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                (step === 1 && !selectedDest) || (step === 2 && (!startDate || !endDate)) || (step === 4 && (!name || !email || !phone))
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              <span>{step === 4 ? "Get My Plan" : "Next"}</span>
              {step < 4 && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Successfully Submitted!
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Your trip request has been submitted successfully. We'll contact you soon at {email}.
              </p>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setStep(1);
                  setSelectedDest(null);
                  setStartDate('');
                  setEndDate('');
                  setTravelers(2);
                  setSelectedActivities([]);
                  setBudget('');
                  setName('');
                  setEmail('');
                  setPhone('');
                  setSpecialRequest('');
                }}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}