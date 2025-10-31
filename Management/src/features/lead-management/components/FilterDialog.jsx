import { X } from 'lucide-react';

const FilterDialog = ({ 
  isOpen, 
  onClose, 
  travelDateStart, 
  travelDateEnd, 
  platforms,
  filterPlatforms,
  onTravelDateStartChange,
  onTravelDateEndChange,
  onPlatformFilterChange,
  onClear,
  onApply
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Filter Leads</h2>
            <p className="text-sm text-gray-600 mt-1">Select filters to refine lead list</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={travelDateStart}
                  onChange={(e) => onTravelDateStartChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={travelDateEnd}
                  onChange={(e) => onTravelDateEndChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={filterPlatforms.includes(platform)}
                    onChange={() => onPlatformFilterChange(platform)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {platform}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClear}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
            >
              Clear
            </button>
            <button
              onClick={onApply}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterDialog;

