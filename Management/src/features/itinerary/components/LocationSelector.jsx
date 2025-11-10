/**
 * Location Selector Component
 * Allows selecting from destination-specific locations and adding custom ones
 */

import { useState } from 'react';
import { Plus, X, MapPin, Search } from 'lucide-react';
import { getLocationsForDestination, ALL_LOCATIONS } from '../utils/locations';
import LocationAutocomplete from '../../lead-management/components/LocationAutocomplete';

const LocationSelector = ({ locations = [], onChange, destination = '' }) => {
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
    
    return locationsToFilter.filter(location =>
      location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredLocations = getFilteredLocations();

  const handleAddLocation = (location) => {
    if (!locationsArray.includes(location)) {
      onChange([...locationsArray, location]);
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    onChange(locationsArray.filter(l => l !== locationToRemove));
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

      {/* Toggle Selector Button */}
      <button
        type="button"
        onClick={() => setShowSelector(!showSelector)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
      >
        <Plus size={16} />
        {showSelector ? 'Hide Location Selector' : 'Add Locations'}
      </button>

      {/* Location Selector Panel */}
      {showSelector && (
        <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50 space-y-4">
          {/* Custom Location Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add Custom Location
            </label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <LocationAutocomplete
                  value={customLocation}
                  onChange={(value) => setCustomLocation(value)}
                  onSelect={(value) => {
                    if (value && !locationsArray.includes(value)) {
                      onChange([...locationsArray, value]);
                      setCustomLocation('');
                    }
                  }}
                  placeholder="Type custom location name..."
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomLocation}
                disabled={!customLocation.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          {/* Predefined Locations Section */}
          <div className="border-t border-green-300 pt-4">
            {hasDestinationLocations ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Popular Locations in {destination}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllLocations(!showAllLocations)}
                    className="text-xs text-green-700 hover:text-green-800 underline"
                  >
                    {showAllLocations ? 'Show destination locations' : 'Show all locations'}
                  </button>
                </div>
              </>
            ) : (
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Location
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (Showing all locations - no destination selected)
                </span>
              </label>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            {/* Locations Grid */}
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-white">
              {filteredLocations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                  {filteredLocations.map((location) => {
                    const isSelected = locationsArray.includes(location);
                    return (
                      <button
                        key={location}
                        type="button"
                        onClick={() => handleAddLocation(location)}
                        disabled={isSelected}
                        className={`px-3 py-2 text-left text-sm rounded transition-colors ${
                          isSelected
                            ? 'bg-green-100 text-green-800 cursor-not-allowed'
                            : 'bg-gray-50 hover:bg-green-100 text-gray-700'
                        }`}
                      >
                        {location}
                        {isSelected && <span className="ml-2 text-xs">✓ Added</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
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
              <div className="text-xs text-gray-600 mt-2">
                Showing {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
                {hasDestinationLocations && !showAllLocations && ` in ${destination}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {locationsArray.length === 0 && !showSelector && (
        <p className="text-xs text-gray-500">
          Click "Add Locations" to select locations or add custom ones
        </p>
      )}
    </div>
  );
};

export default LocationSelector;
