import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { COUNTRIES_PRIORITY } from '../data/countries';

/**
 * Searchable country dropdown — shows top 10 initially, filters on keystrokes.
 * Emits ISO alpha-2 code via onChange.
 */
export default function CountrySelect({
  value = '',
  onChange,
  placeholder = 'Select country',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Display name for currently selected country
  const selected = useMemo(
    () => COUNTRIES_PRIORITY.find((c) => c.code === value),
    [value],
  );

  // Filtered list — top 10 when empty, filtered when typing
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES_PRIORITY.slice(0, 10);
    return COUNTRIES_PRIORITY.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync display when value changes externally
  useEffect(() => {
    if (!open) {
      setQuery(selected ? `${selected.flag} ${selected.name}` : '');
    }
  }, [value, open]);

  const select = (country) => {
    onChange(country.code);
    setQuery(`${country.flag} ${country.name}`);
    setOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlightIdx((prev) => (prev < visible.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : visible.length - 1));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      select(visible[highlightIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIdx(-1);
    }
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query.replace(/^[^\s]+\s/, '') : query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            setHighlightIdx(-1);
            if (!v) onChange('');
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
            setHighlightIdx(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="h-8 w-full pl-9 pr-9 py-1 text-sm bg-popover border-2 border-border rounded-xl focus:outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/10 transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen(!open); if (!open) { setQuery(''); inputRef.current?.focus(); } }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        >
          {value ? (
            <X className="w-4 h-4" onClick={(e) => { e.stopPropagation(); handleClear(); }} />
          ) : (
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover rounded-lg border border-border shadow-[var(--shadow-dropdown)] max-h-64 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">No countries found</div>
          ) : (
            visible.map((c, idx) => (
              <button
                key={c.code}
                type="button"
                onClick={() => select(c)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm transition-colors ${
                  idx === highlightIdx ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent'
                } ${c.code === value ? 'bg-accent/50 font-medium' : ''}`}
              >
                <span className="text-base shrink-0">{c.flag}</span>
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0">{c.code}</span>
              </button>
            ))
          )}
          {!query && COUNTRIES_PRIORITY.length > 10 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground text-center border-t border-border">
              Type to search all {COUNTRIES_PRIORITY.length} countries
            </div>
          )}
        </div>
      )}
    </div>
  );
}
