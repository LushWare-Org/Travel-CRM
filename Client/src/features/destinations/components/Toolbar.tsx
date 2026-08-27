import { SlidersHorizontal, X, Grid, List } from 'lucide-react';
import type { SortOption, ViewMode } from '../DestinationsContainer';

interface ToolbarProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  onClearAllFilters: () => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  destinationCount: number;
}

export default function Toolbar({
  showFilters,
  onToggleFilters,
  activeFiltersCount,
  onClearAllFilters,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  destinationCount,
}: ToolbarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4 mb-4 md:mb-6 sticky top-16 z-40">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto">
          <button
            onClick={onToggleFilters}
            className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-300 text-sm md:text-base ${showFilters
                ? 'bg-gray-100 hover:bg-gray-200 text-black shadow-md hover:shadow-lg'
                : 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200 hover:border-brand-300'
              }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-semibold">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className={`bg-black text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
                {activeFiltersCount}
              </span>
            )}
          </button>
          {activeFiltersCount > 0 && (
            <button onClick={onClearAllFilters} className="text-xs md:text-sm text-gray-600 hover:text-brand-600 font-medium flex items-center space-x-1 transition-colors duration-200 whitespace-nowrap">
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full md:w-auto px-3 md:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white transition-all duration-200 text-sm md:text-base"
          >
            <option value="popularity">Most Popular</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name (A-Z)</option>
          </select>
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1 w-full md:w-auto">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid'
                  ? 'bg-brand-50 text-brand-600 shadow-sm border border-brand-200'
                  : 'text-gray-500 hover:bg-gray-200 hover:border-brand-300'
                }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list'
                  ? 'bg-brand-50 text-brand-600 shadow-sm border border-brand-200'
                  : 'text-gray-500 hover:bg-gray-200 hover:border-brand-300'
                }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <div className="text-gray-600 font-medium text-sm md:text-base whitespace-nowrap">{destinationCount} destinations</div>
        </div>
      </div>
    </div>
  );
}
