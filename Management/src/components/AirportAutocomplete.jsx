import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MapPin, X, Search } from "lucide-react";
import AIRPORTS from "../data/airports";

/**
 * Airport autocomplete — search by city name, airport name, or IATA code.
 * Keyboard navigable, click-outside-to-close.
 *
 * `listMode` ("popular" | "all") controls the default list shown on focus
 * before typing: "popular" (default) is a curated shortlist of major hubs,
 * "all" is every airport in alphabetical order.
 *
 * @param {Object} props
 * @param {string} [props.value]
 * @param {(code: string) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {string} [props.label]
 * @param {string} [props.id]
 * @param {string} [props.excludeCode]
 * @param {"popular"|"all"} [props.listMode]
 * @param {string} [props.prioritizeCountry]
 */
export default function AirportAutocomplete({
  value = "",
  onChange,
  placeholder = "City or airport",
  label = undefined,
  id = undefined,
  excludeCode = undefined,
  listMode = "popular",
  prioritizeCountry = undefined,
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
    if (listMode === "all") {
      const all = [...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city));
      if (prioritizeCountry) {
        all.sort((a, b) => {
          const aMatch = a.country === prioritizeCountry ? 0 : 1;
          const bMatch = b.country === prioritizeCountry ? 0 : 1;
          return aMatch - bMatch;
        });
      }
      return all;
    }
    const popular = popularCodes.map((c) => AIRPORTS.find((a) => a.code === c)).filter(Boolean);
    // Also include top airports from the prioritized country
    if (prioritizeCountry) {
      const countryAirports = AIRPORTS.filter(
        (a) => a.country === prioritizeCountry && !popularCodes.includes(a.code),
      ).slice(0, 3);
      return [...countryAirports, ...popular];
    }
    return popular;
  }, [listMode, prioritizeCountry]);

  const defaultLabel = listMode === "all" ? "All airports" : "Popular airports";

  // Filter airports based on typed input, boosting matches from prioritizeCountry
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
    // Boost airports in the prioritized country
    if (prioritizeCountry) {
      filtered.sort((a, b) => {
        const aMatch = a.country === prioritizeCountry ? 0 : 1;
        const bMatch = b.country === prioritizeCountry ? 0 : 1;
        return aMatch - bMatch;
      });
    }
    return filtered.slice(0, 15);
  }, [query, value, excludeCode, prioritizeCountry]);

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
        <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
          className="h-8 w-full rounded-lg border border-input pl-9 pr-9 py-1 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:outline-none transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-accent text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Default list — shown on focus before typing */}
      {showDefault && (
        <div className="absolute z-50 mt-1 w-full bg-popover rounded-lg border border-border shadow-[var(--shadow-dropdown)] max-h-72 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {defaultLabel}
          </div>
          {defaultList.map((ap, idx) => (
            <button
              key={ap.code}
              type="button"
              onClick={() => handleSelect(ap)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors ${
                idx === highlightIdx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
              }`}
            >
              <span className="shrink-0 w-10 h-7 flex items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs">
                {ap.code}
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">{ap.city}</div>
                <div className="text-xs text-muted-foreground truncate">{ap.name}</div>
              </div>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{ap.country}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search results */}
      {showResults && (
        <div className="absolute z-50 mt-1 w-full bg-popover rounded-lg border border-border shadow-[var(--shadow-dropdown)] max-h-60 overflow-y-auto">
          {results.map((ap, idx) => (
            <button
              key={ap.code}
              type="button"
              onClick={() => handleSelect(ap)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors ${
                idx === highlightIdx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
              }`}
            >
              <span className="shrink-0 w-10 h-7 flex items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs">
                {ap.code}
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">{ap.city}</div>
                <div className="text-xs text-muted-foreground truncate">{ap.name}</div>
              </div>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{ap.country}</span>
            </button>
          ))}
        </div>
      )}

      {open && query && !showDefault && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover rounded-lg border border-border shadow-[var(--shadow-dropdown)] p-4 text-center">
          <Search className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm text-muted-foreground">No airports found</p>
        </div>
      )}
    </div>
  );
}
