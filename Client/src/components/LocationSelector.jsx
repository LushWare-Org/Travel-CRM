/**
 * Location Selector Component
 * Allows selecting from destination-specific locations and adding custom ones
 * Styled to match Plan Your Trip theme (orange/yellow gradient)
 */

import { useState } from 'react';
import { Plus, X, MapPin, Search } from 'lucide-react';
import { getLocationsForDestination, ALL_LOCATIONS } from '../utils/locations';
import LocationAutocomplete from './LocationAutocomplete';

const LocationSelector = ({ locations = [], onChange, destination = '' }) => {
  const [showSelector, setShowSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [showAllLocations, setShowAllLocations] = useState(false);

  // Convert locations to array if it's a string
  const locationsArray = Array.isArray(locations) 
    ? locations 
    : (typeof locations === 'string' ? locations.split(',').map(l => l.trim()).filter(Boolean) : []);

  // Get destination name (handle object format from DestinationSelector)
  const destinationName = typeof destination === 'object' 
    ? (destination?.label || destination?.value || '') 
    : destination;

  // Get locations for the selected destination
  const destinationLocations = getLocationsForDestination(destinationName);
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

  const handleCustomLocationSelect = (value) => {
    if (value && !locationsArray.includes(value)) {
      onChange([...locationsArray, value]);
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
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 rounded-full text-sm font-medium border border-orange-200"
            >
              <MapPin size={12} className="text-orange-600" />
              {location}
              <button
                type="button"
                onClick={() => handleRemoveLocation(location)}
                className="hover:bg-orange-200 rounded-full p-0.5 transition-colors ml-1"
              >
                <X size={14} className="text-orange-700" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toggle Selector Button */}
      <button
        type="button"
        onClick={() => setShowSelector(!showSelector)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all text-sm font-semibold shadow-md"
      >
        <Plus size={16} />
        {showSelector ? 'Hide Location Selector' : 'Add Locations'}
      </button>

      {/* Location Selector Panel */}
      {showSelector && (
        <div className="border-2 border-orange-200 rounded-xl p-4 bg-gradient-to-br from-orange-50 to-yellow-50 space-y-4">
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
                  onSelect={handleCustomLocationSelect}
                  placeholder="Type custom location name..."
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomLocation}
                disabled={!customLocation.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl hover:from-orange-700 hover:to-yellow-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          {/* Predefined Locations Section */}
          <div className="border-t border-orange-300 pt-4">
            {hasDestinationLocations ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Popular Locations in {destinationName}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllLocations(!showAllLocations)}
                    className="text-xs text-orange-700 hover:text-orange-800 underline font-medium"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
              />
            </div>

            {/* Locations Grid */}
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-xl bg-white">
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
                        className={`px-3 py-2 text-left text-sm rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 cursor-not-allowed border border-orange-200'
                            : 'bg-gray-50 hover:bg-gradient-to-r hover:from-orange-50 hover:to-yellow-50 text-gray-700 border border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {location}
                        {isSelected && <span className="ml-2 text-xs text-orange-600">✓ Added</span>}
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
              <div className="text-xs text-gray-600 mt-2 font-medium">
                Showing {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
                {hasDestinationLocations && !showAllLocations && ` in ${destinationName}`}
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

