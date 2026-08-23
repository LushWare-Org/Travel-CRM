import { useState, useRef, useEffect } from "react";
import { Users, ChevronDown, Plus, Minus } from "lucide-react";

const PASSENGER_TYPES = [
  { key: "adults", label: "Adults", min: 1, max: 9, hint: "12+ years" },
  { key: "children", label: "Children", min: 0, max: 9, hint: "2–11 years" },
  { key: "infants", label: "Infants", min: 0, max: 4, hint: "Under 2" },
];

/**
 * Passenger count selector with dropdown.
 * Shows total count + breakdown in the trigger button.
 */
export default function PassengerSelector({ adults = 1, children = 0, infants = 0, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const counts = { adults, children, infants };
  const total = adults + children + infants;

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const update = (key, delta) => {
    const def = PASSENGER_TYPES.find((t) => t.key === key);
    const next = Math.min(def.max, Math.max(def.min, (counts[key] || 0) + delta));
    onChange({ ...counts, [key]: next });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 flex items-center gap-2 w-full rounded-lg border border-gray-300 px-3 py-1 text-sm text-left focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white hover:border-gray-400 transition-colors"
      >
        <Users className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 text-gray-700">
          {total} traveler{total !== 1 ? "s" : ""}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-lg p-4 right-0">
          {PASSENGER_TYPES.map(({ key, label, min, max, hint }) => (
            <div key={key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 border-b border-gray-100 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-700">{label}</div>
                <div className="text-xs text-gray-400">{hint}</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => update(key, -1)}
                  disabled={counts[key] <= min}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-5 text-center text-sm font-semibold text-gray-900">{counts[key]}</span>
                <button
                  type="button"
                  onClick={() => update(key, 1)}
                  disabled={counts[key] >= max}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
