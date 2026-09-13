import { SlidersHorizontal, X, Grid, List } from 'lucide-react';
import type { SortOption, ViewMode } from '../DestinationsContainer';
import StickyToolbar from '../../../components/shared/StickyToolbar';
import { pluralize } from '../../../lib/pluralize';

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
    <StickyToolbar>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto">
          <button
            onClick={onToggleFilters}
            aria-pressed={showFilters}
            className={`flex items-center space-x-2 px-3.5 md:px-4 py-2 rounded-xl transition-colors duration-300 text-sm md:text-base ${
              showFilters
                ? 'bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-200'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-semibold">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className="bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
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
            className="w-full md:w-auto px-3.5 md:px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white transition-colors duration-200 text-sm md:text-base"
          >
            <option value="popularity">Most Popular</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name (A-Z)</option>
          </select>
          <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1 w-full md:w-auto">
            <button
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid view"
              className={`p-2 rounded-xl transition-colors duration-200 ${viewMode === 'grid'
                  ? 'bg-brand-50 text-brand-600 border border-brand-200'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              aria-label="List view"
              className={`p-2 rounded-xl transition-colors duration-200 ${viewMode === 'list'
                  ? 'bg-brand-50 text-brand-600 border border-brand-200'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <div className="text-gray-600 font-medium text-sm md:text-base whitespace-nowrap">{pluralize(destinationCount, 'destination')}</div>
        </div>
      </div>
    </StickyToolbar>
  );
}
