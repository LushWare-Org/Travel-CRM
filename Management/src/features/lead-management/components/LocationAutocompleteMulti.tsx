/**
 * Location Autocomplete Multi-Select Component
 * Allows adding multiple locations using autocomplete (for manual itineraries)
 * Similar to LocationSelector but uses LocationAutocomplete for each location
 */

import { useState } from 'react';
import { Plus, X, MapPin } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import { Button } from '@/components/ui/button';

interface LocationAutocompleteMultiProps {
  locations?: string[] | string;
  onChange: (locations: string[]) => void;
}

const LocationAutocompleteMulti = ({ locations = [], onChange }: LocationAutocompleteMultiProps) => {
  const [newLocation, setNewLocation] = useState('');

  // Convert locations to array if needed
  const locationsArray = Array.isArray(locations)
    ? locations
    : (typeof locations === 'string' ? locations.split(',').map((l) => l.trim()).filter(Boolean) : []);

  const handleAddLocation = (location: string) => {
    const trimmed = location.trim();
    if (trimmed && !locationsArray.includes(trimmed)) {
      onChange([...locationsArray, trimmed]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (locationToRemove: string) => {
    onChange(locationsArray.filter((l) => l !== locationToRemove));
  };

  return (
    <div className="space-y-3">
      {/* Selected Locations */}
      {locationsArray.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locationsArray.map((location, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success rounded-full text-sm"
            >
              <MapPin size={12} />
              {location}
              <button
                type="button"
                onClick={() => handleRemoveLocation(location)}
                className="hover:bg-success/20 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add Location Input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground mb-2">
          Add Location
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <LocationAutocomplete
              value={newLocation}
              onChange={(value: string) => {
                // When user selects from dropdown or types a location, add it
                if (value && !locationsArray.includes(value)) {
                  onChange([...locationsArray, value]);
                  setNewLocation('');
                } else {
                  setNewLocation(value);
                }
              }}
              placeholder="Search and select location..."
            />
          </div>
          {newLocation && !locationsArray.includes(newLocation) && (
            <Button type="button" onClick={() => handleAddLocation(newLocation)}>
              <Plus size={16} />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Help Text */}
      {locationsArray.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Start typing to search for locations using OpenStreetMap
        </p>
      )}
    </div>
  );
};

export default LocationAutocompleteMulti;
