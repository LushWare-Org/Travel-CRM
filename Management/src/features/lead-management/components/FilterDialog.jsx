import { useState } from 'react';
import { X, Calendar, Globe, Check } from 'lucide-react';

const platformOptions = [
  { id: 'Website Form', label: 'Website' },
  { id: 'Social Media', label: 'Social' },
  { id: 'Phone Call', label: 'Phone' },
  { id: 'Referral', label: 'Referral' },
  { id: 'Email', label: 'Email' },
  { id: 'Walk-in', label: 'Walk-in' },
];

const FilterDialog = ({
  isOpen,
  onClose,
  filterTravelDateStart,
  setFilterTravelDateStart,
  filterTravelDateEnd,
  setFilterTravelDateEnd,
  filterPlatforms,
  setFilterPlatforms,
}) => {
  const handlePlatformToggle = (platform) => {
    if (filterPlatforms.includes(platform)) {
      setFilterPlatforms(filterPlatforms.filter(p => p !== platform));
    } else {
      setFilterPlatforms([...filterPlatforms, platform]);
    }
  };

  const clearFilters = () => {
    setFilterTravelDateStart('');
    setFilterTravelDateEnd('');
    setFilterPlatforms([]);
  };

  const hasActiveFilters = filterTravelDateStart || filterTravelDateEnd || filterPlatforms.length > 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Travel Date Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              Travel Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={filterTravelDateStart}
                  onChange={(e) => setFilterTravelDateStart(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={filterTravelDateEnd}
                  onChange={(e) => setFilterTravelDateEnd(e.target.value)}
                  min={filterTravelDateStart || undefined}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Globe className="w-4 h-4 text-gray-400" />
              Lead Source
            </label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((platform) => {
                const isSelected = filterPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSelected
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                Active filters:
                {filterTravelDateStart && ` From ${filterTravelDateStart}`}
                {filterTravelDateEnd && ` To ${filterTravelDateEnd}`}
                {filterPlatforms.length > 0 && ` • ${filterPlatforms.length} source(s)`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterDialog;
