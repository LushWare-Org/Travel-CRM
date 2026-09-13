import { useState, useEffect, useRef, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import BRANDING from '../../config/branding';

/**
 * One result from the Nominatim /search endpoint. Only the fields the
 * component reads are declared; the rest of the (much larger) payload is
 * ignored. Unvalidated external API boundary — shape mirrors the live API.
 */
interface NominatimResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface LocationSuggestion {
  id: number;
  displayName: string;
  fullName: string;
  lat: string;
  lon: string;
}

interface LocationAutocompleteProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSelect?: (value: string) => void;
  inputClassName?: string;
  iconColorClass?: string;
}

const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = "e.g., Colombo, Sri Lanka",
  onSelect,
  inputClassName,
  iconColorClass,
}: LocationAutocompleteProps) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Id of the newest accepted search: a response whose id is no longer current
   * is dropped, so a result arriving after the list was closed cannot put it back.
   */
  const searchSeqRef = useRef(0);

  /**
   * Abandons whatever the field was about to show — the debounce timer left by
   * the last keystroke and any search already in flight. Every path that hides
   * the list calls this: a keystroke made a moment before the list closed would
   * otherwise re-open it (the list reappearing right after a pick).
   */
  const cancelPendingSearch = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    searchSeqRef.current += 1;
  }, []);

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

    const searchId = ++searchSeqRef.current;
    setIsLoading(true);
    
    try {
      // Use Nominatim API with proper headers
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': `${BRANDING.company.shortName}/1.0`, // Nominatim requires a User-Agent
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Location search failed');
      }

      const data = (await response.json()) as NominatimResult[];
      
      // Format results
      const formattedSuggestions = data.map((item, index) => {
        // Build a readable location string
        const parts: string[] = [];
        if (item.name && item.name !== item.display_name.split(',')[0]) {
          parts.push(item.name);
        }
        
        // Add city/town
        if (item.address?.city) {
          parts.push(item.address.city);
        } else if (item.address?.town) {
          parts.push(item.address.town);
        } else if (item.address?.village) {
          parts.push(item.address.village);
        }
        
        // Add state/region
        if (item.address?.state) {
          parts.push(item.address.state);
        }
        
        // Add country
        if (item.address?.country) {
          parts.push(item.address.country);
        }

        const displayText = parts.length > 0 
          ? parts.join(', ') 
          : item.display_name;

        return {
          id: item.place_id || index,
          displayName: displayText,
          fullName: item.display_name,
          lat: item.lat,
          lon: item.lon,
        };
      });

      if (searchId !== searchSeqRef.current) return;

      setSuggestions(formattedSuggestions);
    } catch (error) {
      if (searchId !== searchSeqRef.current) return;
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      if (searchId === searchSeqRef.current) setIsLoading(false);
    }
  };

  // Debounce input
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedIndex(-1);
    
    // Clear previous timer
    clearTimeout(debounceTimerRef.current ?? undefined);

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

  // Handle selection
  const handleSelect = (suggestion: LocationSuggestion) => {
    cancelPendingSearch();
    setQuery(suggestion.displayName);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(suggestion.displayName);
    if (onSelect) {
      onSelect(suggestion.displayName);
    }
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        cancelPendingSearch();
        onChange(query);
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else {
          cancelPendingSearch();
          onChange(query);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        cancelPendingSearch();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Clear input
  const handleClear = () => {
    cancelPendingSearch();
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
        cancelPendingSearch();
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [cancelPendingSearch]);

  // The forms that host this field unmount it wholesale; drop any pending search
  // so nothing lands after the field is gone.
  useEffect(() => () => cancelPendingSearch(), [cancelPendingSearch]);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${iconColorClass || 'text-brand-600'}`} />
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
          className={`w-full pl-10 pr-8 py-2.5 rounded-xl focus:outline-none text-sm ${inputClassName || 'border border-gray-300 focus:ring-2 focus:ring-brand-500'}`}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
            type="button"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-dropdown w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full px-4 py-2 text-left hover:bg-brand-50 transition-colors ${
                index === selectedIndex ? 'bg-brand-50' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className={`w-4 h-4 ${iconColorClass || 'text-brand-600'} mt-0.5 flex-shrink-0`} />
                <span className="text-sm text-gray-700">{suggestion.displayName}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !isLoading && suggestions.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-dropdown w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg p-3">
          <p className="text-sm text-gray-500">No locations found</p>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
