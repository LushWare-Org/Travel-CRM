import { Filter, X, Banknote, Clock, Star } from 'lucide-react';
import FilterPanelShell from '../../../components/shared/FilterPanelShell';
import RangeFilterGroup, { type RangeOption } from '../../../components/shared/RangeFilterGroup';
import { DURATION_OPTIONS, PRICE_RANGE_OPTIONS, RATING_OPTIONS } from '../filterOptions';

// The option lists live in ../filterOptions because PackagesContainer matches
// a URL back to one of them to restore the selection, and RangeFilterGroup
// compares by label — so the two must read from the same source.
export type { RangeOption };

interface FiltersSidebarProps {
  selectedPriceRange: RangeOption | null;
  selectedDuration: RangeOption | null;
  minRating: number;
  onPriceRangeChange: (range: RangeOption | null) => void;
  onDurationChange: (duration: RangeOption | null) => void;
  onMinRatingChange: (rating: number) => void;
  onClose: () => void;
}

export default function FiltersSidebar({
  selectedPriceRange,
  selectedDuration,
  minRating,
  onPriceRangeChange,
  onDurationChange,
  onMinRatingChange,
  onClose,
}: FiltersSidebarProps) {
  return (
    <FilterPanelShell onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Filter className="w-5 h-5 text-brand-600" />
        </h3>
        <button
          onClick={onClose}
          aria-label="Close filters"
          className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600 hover:text-gray-900" />
        </button>
      </div>

      {/* Price Range */}
      <RangeFilterGroup
        label="Budget"
        icon={<Banknote />}
        options={PRICE_RANGE_OPTIONS}
        selected={selectedPriceRange}
        onChange={onPriceRangeChange}
      />

      {/* Trip Duration */}
      <RangeFilterGroup
        label="Trip Duration"
        icon={<Clock />}
        options={DURATION_OPTIONS}
        selected={selectedDuration}
        onChange={onDurationChange}
      />

      {/* Rating */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-gray-600" />
          <span className="text-gray-900">Hotel Rating</span>
        </h4>
        <div className="space-y-2">
          {RATING_OPTIONS.map((starCount) => (
            <label
              key={starCount}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-50/50 cursor-pointer transition-all duration-200"
            >
              <input
                type="checkbox"
                checked={minRating === starCount}
                onChange={() => onMinRatingChange(minRating === starCount ? 0 : starCount)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 focus:ring-2"
              />
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < starCount ? 'fill-brand-accent-400 text-brand-accent-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-gray-700 font-medium text-sm">{starCount} Star{starCount !== 1 ? 's' : ''}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </FilterPanelShell>
  );
}
