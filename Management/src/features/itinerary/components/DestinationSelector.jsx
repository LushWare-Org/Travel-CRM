/**
 * Destination Selector Component
 * User-friendly destination picker with popular and categorized destinations
 */

import { useState } from 'react';
import { Search, MapPin, Globe } from 'lucide-react';
import {
  POPULAR_INTERNATIONAL,
  OTHER_INTERNATIONAL,
  ALL_DESTINATIONS,
} from '../utils/countries';

const DestinationSelector = ({ value, onChange, name = 'destination' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('popular-international');

  // Filter destinations based on search
  const getFilteredDestinations = (destinations) => {
    if (!searchTerm) return destinations;
    return destinations.filter((dest) =>
      dest.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSelect = (destination) => {
    onChange({ target: { name, value: destination.label } });
    setIsOpen(false);
    setSearchTerm('');
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
            className={`px-3 py-2 text-sm text-left rounded-md transition-all ${value === dest.label
                ? 'bg-blue-500 text-white font-medium shadow-md'
                : 'bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200'
              }`}
          >
            {dest.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Selected Value Display / Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-gray-400" />
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value || 'Select Destination'}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-[5] w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search destinations..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setActiveTab('popular-international')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'popular-international'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-blue-600'
                }`}
            >
              <Globe size={14} />
              Popular Destinations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('other-international')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'other-international'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-blue-600'
                }`}
            >
              <MapPin size={14} />
              More Destinations
            </button>
          </div>

          {/* Content based on active tab */}
          <div className="p-2">
            {activeTab === 'popular-international' && (
              <div>
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 flex items-center gap-1">
                  <Globe size={12} />
                  Popular International Destinations
                </div>
                {renderDestinationGrid(
                  POPULAR_INTERNATIONAL,
                  'No destinations found'
                )}
              </div>
            )}

            {activeTab === 'other-international' && (
              <div>
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 flex items-center gap-1 bg-gray-100 rounded">
                  <Globe size={12} />
                  More International Destinations
                </div>
                {renderDestinationGrid(
                  OTHER_INTERNATIONAL,
                  'No destinations found'
                )}
              </div>
            )}
          </div>

          {/* Custom Input Option */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600 mb-2">Don't see your destination?</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type custom destination..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const customValue = e.target.value.trim();
                    if (customValue) {
                      handleSelect({ label: customValue });
                      e.target.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[4]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DestinationSelector;
