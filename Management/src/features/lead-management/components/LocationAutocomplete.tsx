import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { getCountryCodeFromDestination } from '../../itinerary/utils/destinationMapping';

interface LocationSuggestion {
  id: string | number;
  displayName: string;
  fullName: string;
  lat: string;
  lon: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSelect?: (value: string) => void;
  destination?: string | null;
  country?: string | null;
  prioritizeRegion?: boolean;
}

const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = 'e.g., Colombo, Sri Lanka',
  onSelect = undefined,
  // Context props for destination-aware suggestions
  destination = null,
  country = null,
}: LocationAutocompleteProps) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Debounced search function
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Get country code from destination for context-aware filtering
      const countryCode = country || getCountryCodeFromDestination(destination);

      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        limit: String(countryCode ? 10 : 5),
        addressdetails: '1',
      });

      if (countryCode) {
        params.append('countrycodes', countryCode.toLowerCase());
      }

      // Use Nominatim API with proper headers
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'Trip-Sky-Way/1.0', // Nominatim requires a User-Agent
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Location search failed');
      }

      const data = await response.json();

      const formattedSuggestions: LocationSuggestion[] = data.map((item: any, index: number) => {
        const parts: string[] = [];
        if (item.name && item.name !== item.display_name.split(',')[0]) {
          parts.push(item.name);
        }
        if (item.address?.city) {
          parts.push(item.address.city);
        } else if (item.address?.town) {
          parts.push(item.address.town);
        } else if (item.address?.village) {
          parts.push(item.address.village);
        }
        if (item.address?.state) {
          parts.push(item.address.state);
        }
        if (item.address?.country) {
          parts.push(item.address.country);
        }

        const displayText = parts.length > 0 ? parts.join(', ') : item.display_name;

        return {
          id: item.place_id || index,
          displayName: displayText,
          fullName: item.display_name,
          lat: item.lat,
          lon: item.lon,
        };
      });

      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce: wait 500ms after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      if (newValue.trim().length >= 2) {
        searchLocations(newValue);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.displayName);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(suggestion.displayName);
    if (onSelect) {
      onSelect(suggestion.displayName);
    }
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onChange(query);
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else {
          onChange(query);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onChange('');
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="w-full h-8 pl-10 pr-8 border border-input rounded-md bg-transparent text-sm focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
            type="button"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-[var(--shadow-dropdown)] max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors ${index === selectedIndex ? 'bg-primary/10' : ''}`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{suggestion.displayName}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !isLoading && suggestions.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-[var(--shadow-dropdown)] p-3">
          <p className="text-sm text-muted-foreground">No locations found</p>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
