/**
 * Destination Selector Component
 * User-friendly destination picker with popular and categorized destinations
 * Styled to match the PlanYourTrip form theme (orange/yellow gradient)
 */

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Globe, Home, ChevronDown } from 'lucide-react';
import {
  POPULAR_INTERNATIONAL,
  POPULAR_DOMESTIC,
  OTHER_INTERNATIONAL,
  OTHER_DOMESTIC,
} from '../utils/destinations';

const DestinationSelector = ({ value, onChange, placeholder = 'Select Destination' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('popular-international');
  const [customDestination, setCustomDestination] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter destinations based on search
  const getFilteredDestinations = (destinations) => {
    if (!searchTerm) return destinations;
    return destinations.filter((dest) =>
      dest.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSelect = (destination) => {
    onChange(destination);
    setIsOpen(false);
    setSearchTerm('');
    setCustomDestination('');
  };

  const handleCustomDestinationSubmit = () => {
    const customValue = customDestination.trim();
    if (customValue) {
      handleSelect({ value: customValue, label: customValue });
      setCustomDestination('');
    }
  };

  const handleCustomDestinationKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomDestinationSubmit();
    }
  };

  const renderDestinationGrid = (destinations, emptyMessage) => {
    const filtered = getFilteredDestinations(destinations);
    
    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 text-sm">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2">
        {filtered.map((dest) => (
          <button
            key={dest.value}
            type="button"
            onClick={() => handleSelect(dest)}
            className={`px-3 py-2 text-sm text-left rounded-xl transition-all ${
              value?.value === dest.value || value?.label === dest.label
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold shadow-md'
                : 'bg-gray-50 hover:bg-orange-50 text-gray-700 hover:text-orange-700 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {dest.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Value Display / Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white cursor-pointer flex items-center justify-between hover:border-orange-500 transition-colors focus:ring-2 focus:ring-orange-500"
      >
        <div className="flex items-center gap-2 flex-1">
          <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {value?.label || value || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-[calc(100vw-1rem)] sm:w-full sm:min-w-[520px] max-w-[600px] mt-2 bg-white border-2 border-orange-200 rounded-2xl shadow-2xl overflow-hidden left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600" size={18} />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search destinations..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('popular-international')}
              className={`flex-1 px-4 py-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'popular-international'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
              }`}
            >
              <Globe size={14} />
              Popular International
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('popular-domestic')}
              className={`flex-1 px-4 py-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'popular-domestic'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
              }`}
            >
              <Home size={14} />
              Popular Domestic
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('other')}
              className={`flex-1 px-4 py-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'other'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
              }`}
            >
              <MapPin size={14} />
              More
            </button>
          </div>

          {/* Content based on active tab */}
          <div className="p-3 bg-gray-50">
            {activeTab === 'popular-international' && (
              <div>
                <div className="px-2 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <Globe size={12} className="text-orange-600" />
                  Popular International Destinations
                </div>
                {renderDestinationGrid(
                  POPULAR_INTERNATIONAL,
                  'No international destinations found'
                )}
              </div>
            )}

            {activeTab === 'popular-domestic' && (
              <div>
                <div className="px-2 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <Home size={12} className="text-orange-600" />
                  Popular Domestic Destinations (India)
                </div>
                {renderDestinationGrid(
                  POPULAR_DOMESTIC,
                  'No domestic destinations found'
                )}
              </div>
            )}

            {activeTab === 'other' && (
              <div className="space-y-4">
                {/* Other International */}
                <div>
                  <div className="px-2 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 bg-white rounded-lg mb-2">
                    <Globe size={12} className="text-orange-600" />
                    Other International
                  </div>
                  {renderDestinationGrid(
                    OTHER_INTERNATIONAL,
                    'No international destinations found'
                  )}
                </div>

                {/* Other Domestic */}
                <div>
                  <div className="px-2 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 bg-white rounded-lg mb-2 mt-4">
                    <Home size={12} className="text-orange-600" />
                    Other Domestic (India)
                  </div>
                  {renderDestinationGrid(
                    OTHER_DOMESTIC,
                    'No domestic destinations found'
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Custom Input Option */}
          <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <div className="text-sm text-gray-700 font-medium mb-2 flex items-center gap-2">
              <MapPin size={14} className="text-orange-600" />
              Don't see your destination?
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                onKeyPress={handleCustomDestinationKeyPress}
                placeholder="Type custom destination..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
              />
              <button
                type="button"
                onClick={handleCustomDestinationSubmit}
                disabled={!customDestination.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setCustomDestination('');
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationSelector;

