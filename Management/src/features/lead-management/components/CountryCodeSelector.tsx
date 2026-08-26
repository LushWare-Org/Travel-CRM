import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { COUNTRIES } from '../../../data/countries';

// Derived from centralized country data — single source of truth
const countryCodes = COUNTRIES
  .map((c) => ({ code: c.phoneCode, country: c.code, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface CountryCodeSelectorProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

const CountryCodeSelector = ({ value, onChange, className = '' }: CountryCodeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const selectedCountry = countryCodes.find((c) => c.code === value) || countryCodes[0];
  const filteredCountries = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.includes(searchTerm) ||
    c.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 items-center gap-2 px-3 border border-input rounded-l-md bg-transparent hover:bg-muted focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 min-w-[100px]"
      >
        <span className="text-sm font-medium text-foreground">{selectedCountry.code}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-[var(--shadow-dropdown)] z-50 w-80 max-h-80 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Search country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 px-3 border border-input rounded bg-transparent focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 text-sm text-foreground"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto max-h-64">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={`${country.code}-${country.country}`}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-3 ${
                    value === country.code ? 'bg-primary/10' : ''
                  }`}
                >
                  <span className="text-sm font-medium w-16 text-foreground">{country.code}</span>
                  <span className="text-sm text-muted-foreground flex-1">{country.name}</span>
                  {value === country.code && (
                    <span className="text-primary text-sm">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelector;
