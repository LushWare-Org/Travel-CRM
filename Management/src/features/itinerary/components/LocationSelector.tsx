/**
 * Location Selector Component
 * Allows selecting from destination-specific locations and adding custom ones
 */

import { useState } from 'react';
import { Plus, X, MapPin, Search } from 'lucide-react';
import { getLocationsForDestination, ALL_LOCATIONS } from '../utils/locations';
import LocationAutocomplete from '../../lead-management/components/LocationAutocomplete';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
  locations?: string[] | string;
  onChange: (locations: string[]) => void;
  destination?: string;
}

const LocationSelector = ({ locations = [], onChange, destination = '' }: LocationSelectorProps) => {
  const [showSelector, setShowSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [showAllLocations, setShowAllLocations] = useState(false);

  // Convert locations to array if it's a string
  const locationsArray = Array.isArray(locations)
    ? locations
    : (typeof locations === 'string' ? locations.split(',').map(l => l.trim()).filter(Boolean) : []);

  // Get locations for the selected destination
  const destinationLocations = getLocationsForDestination(destination);
  const hasDestinationLocations = destinationLocations.length > 0;

  // Filter locations based on search
  const getFilteredLocations = () => {
    const locationsToFilter = showAllLocations ? ALL_LOCATIONS : destinationLocations;

    if (!searchTerm) return locationsToFilter;

    return locationsToFilter.filter((location: string) =>
      location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredLocations = getFilteredLocations();

  const handleAddLocation = (location: string) => {
    if (!locationsArray.includes(location)) {
      onChange([...locationsArray, location]);
    }
  };

  const handleRemoveLocation = (locationToRemove: string) => {
    onChange(locationsArray.filter((l) => l !== locationToRemove));
  };

  const handleAddCustomLocation = () => {
    const trimmed = customLocation.trim();
    if (trimmed && !locationsArray.includes(trimmed)) {
      onChange([...locationsArray, trimmed]);
      setCustomLocation('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Locations */}
      {locationsArray.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locationsArray.map((location, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              <MapPin size={12} />
              {location}
              <button
                type="button"
                onClick={() => handleRemoveLocation(location)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toggle Selector Button */}
      <Button type="button" onClick={() => setShowSelector(!showSelector)} size="sm">
        <Plus size={16} />
        {showSelector ? 'Hide Location Selector' : 'Add Locations'}
      </Button>

      {/* Location Selector Panel */}
      {showSelector && (
        <div className="border border-border rounded-lg p-4 bg-muted space-y-4">
          {/* Custom Location Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Add Custom Location
            </label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <LocationAutocomplete
                  value={customLocation}
                  onChange={(value: string) => setCustomLocation(value)}
                  onSelect={(value: string) => {
                    if (value && !locationsArray.includes(value)) {
                      onChange([...locationsArray, value]);
                      setCustomLocation('');
                    }
                  }}
                  placeholder="Type custom location name..."
                />
              </div>
              <Button
                type="button"
                onClick={handleAddCustomLocation}
                disabled={!customLocation.trim()}
              >
                <Plus size={14} />
                Add
              </Button>
            </div>
          </div>

          {/* Predefined Locations Section */}
          <div className="border-t border-border pt-4">
            {hasDestinationLocations ? (
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Popular Locations in {destination}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAllLocations(!showAllLocations)}
                  className="text-xs text-primary hover:underline"
                >
                  {showAllLocations ? 'Show destination locations' : 'Show all locations'}
                </button>
              </div>
            ) : (
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Select Location
                <span className="text-xs text-muted-foreground font-normal ml-2 normal-case tracking-normal">
                  (Showing all locations - no destination selected)
                </span>
              </label>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations..."
                className="pl-9"
              />
            </div>

            {/* Locations Grid */}
            <div className="max-h-64 overflow-y-auto border border-border rounded-md bg-card">
              {filteredLocations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                  {filteredLocations.map((location: string) => {
                    const isSelected = locationsArray.includes(location);
                    return (
                      <button
                        key={location}
                        type="button"
                        onClick={() => handleAddLocation(location)}
                        disabled={isSelected}
                        className={cn(
                          'px-3 py-2 text-left text-sm rounded-md transition-colors',
                          isSelected
                            ? 'bg-success/10 text-success cursor-not-allowed'
                            : 'bg-muted hover:bg-accent text-foreground'
                        )}
                      >
                        {location}
                        {isSelected && <span className="ml-2 text-xs">✓ Added</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {searchTerm
                    ? 'No locations found. Try different search terms or add as custom location above.'
                    : hasDestinationLocations
                      ? 'No locations available'
                      : 'Select a destination first to see popular locations, or add custom locations.'
                  }
                </div>
              )}
            </div>

            {/* Results Count */}
            {filteredLocations.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                Showing {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
                {hasDestinationLocations && !showAllLocations && ` in ${destination}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {locationsArray.length === 0 && !showSelector && (
        <p className="text-xs text-muted-foreground">
          Click "Add Locations" to select locations or add custom ones
        </p>
      )}
    </div>
  );
};

export default LocationSelector;
