import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MapPin, X, Search } from "lucide-react";
import AIRPORTS from "../data/airports";

/**
 * Airport autocomplete — search by city name, airport name, or IATA code.
 * Keyboard navigable, click-outside-to-close.
 *
 * @param {"popular"|"all"} listMode - default list shown on focus before typing.
 *   "popular" (default) — curated shortlist of major hubs
 *   "all" — every airport in alphabetical order
 */
export default function AirportAutocomplete({
  value = "",
  onChange,
  placeholder = "City or airport",
  label,
  id,
  excludeCode,
  listMode = "popular",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value → input display
  useEffect(() => {
    if (value && value !== query) {
      const ap = AIRPORTS.find((a) => a.code === value);
      setQuery(ap ? `${ap.city} (${ap.code})` : value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Default list (shown on focus before typing) ──────────────────
  const popularCodes = ["DXB", "LHR", "JFK", "SIN", "CMB", "MLE", "BKK", "CDG", "IST", "DEL", "KUL", "AUH"];

  /** Airports shown on focus when input is empty */
  const defaultList = useMemo(() => {
    if (listMode === "all") return [...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city));
    return popularCodes.map((c) => AIRPORTS.find((a) => a.code === c)).filter(Boolean);
  }, [listMode]);

  const defaultLabel = listMode === "all" ? "All airports" : "Popular airports";

  // Filter airports based on typed input
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || query === value) return [];
    const filtered = AIRPORTS.filter((a) => {
      if (excludeCode && a.code === excludeCode) return false;
      return (
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
      );
    });
    return filtered.slice(0, 15);
  }, [query, value, excludeCode]);

  const showDefault = !query && open;
  const showResults = open && results.length > 0;

  /** Combined list for keyboard navigation */
  const navList = showDefault ? defaultList : results;

  // Click outside → close
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(
    (airport) => {
      onChange(airport.code);
      setQuery(`${airport.city} (${airport.code})`);
      setOpen(false);
      setHighlightIdx(-1);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev < navList.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : navList.length - 1));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(navList[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIdx(-1);
    }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (!v) {
      onChange("");
      setOpen(false);
    } else {
      setOpen(true);
      setHighlightIdx(-1);
    }
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-gray-300 pl-9 pr-9 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Default list — shown on focus before typing */}
      {showDefault && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-72 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {defaultLabel}
          </div>
          {defaultList.map((ap, idx) => (
            <button
              key={ap.code}
              type="button"
              onClick={() => handleSelect(ap)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors ${
                idx === highlightIdx ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="shrink-0 w-10 h-7 flex items-center justify-center rounded bg-blue-50 text-blue-700 font-bold text-xs">
                {ap.code}
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">{ap.city}</div>
                <div className="text-xs text-gray-400 truncate">{ap.name}</div>
              </div>
              <span className="ml-auto text-xs text-gray-400 shrink-0">{ap.country}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search results */}
      {showResults && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
          {results.map((ap, idx) => (
            <button
              key={ap.code}
              type="button"
              onClick={() => handleSelect(ap)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors ${
                idx === highlightIdx ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="shrink-0 w-10 h-7 flex items-center justify-center rounded bg-blue-50 text-blue-700 font-bold text-xs">
                {ap.code}
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">{ap.city}</div>
                <div className="text-xs text-gray-400 truncate">{ap.name}</div>
              </div>
              <span className="ml-auto text-xs text-gray-400 shrink-0">{ap.country}</span>
            </button>
          ))}
        </div>
      )}

      {open && query && !showDefault && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg p-4 text-center">
          <Search className="w-5 h-5 text-gray-300 mx-auto mb-1" />
          <p className="text-sm text-gray-500">No airports found</p>
        </div>
      )}
    </div>
  );
}
