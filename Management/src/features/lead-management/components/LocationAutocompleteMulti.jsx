/**
 * Location Autocomplete Multi-Select Component
 * Allows adding multiple locations using autocomplete (for manual itineraries)
 * Similar to LocationSelector but uses LocationAutocomplete for each location
 */

import { useState } from 'react';
import { Plus, X, MapPin } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';

const LocationAutocompleteMulti = ({ locations = [], onChange }) => {
  const [newLocation, setNewLocation] = useState('');

  // Convert locations to array if needed
  const locationsArray = Array.isArray(locations) 
    ? locations 
    : (typeof locations === 'string' ? locations.split(',').map(l => l.trim()).filter(Boolean) : []);

  const handleAddLocation = (location) => {
    const trimmed = location.trim();
    if (trimmed && !locationsArray.includes(trimmed)) {
      onChange([...locationsArray, trimmed]);
      setNewLocation('');
    }
  };

  const handleLocationSelect = (location) => {
    // Called when user selects from autocomplete dropdown
    if (location && !locationsArray.includes(location)) {
      onChange([...locationsArray, location]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    onChange(locationsArray.filter(l => l !== locationToRemove));
  };

  return (
    <div className="space-y-3">
      {/* Selected Locations */}
      {locationsArray.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locationsArray.map((location, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
            >
              <MapPin size={12} />
              {location}
              <button
                type="button"
                onClick={() => handleRemoveLocation(location)}
                className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add Location Input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Add Location
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <LocationAutocomplete
              value={newLocation}
              onChange={(value) => {
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
            <button
              type="button"
              onClick={() => handleAddLocation(newLocation)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Help Text */}
      {locationsArray.length === 0 && (
        <p className="text-xs text-gray-500">
          Start typing to search for locations using OpenStreetMap
        </p>
      )}
    </div>
  );
};

export default LocationAutocompleteMulti;

