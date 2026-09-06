import { Filter, X, Banknote, Clock, Star } from 'lucide-react';
import { getCurrencySymbol } from '../../../lib/currency';
import FilterPanelShell from '../../../components/shared/FilterPanelShell';
import RangeFilterGroup from '../../../components/shared/RangeFilterGroup';

const CURRENCY_SYMBOL = getCurrencySymbol();

export interface RangeOption {
  label: string;
  min: number;
  max: number;
}

const filterOptions = {
  priceRanges: [
    { label: `Below ${CURRENCY_SYMBOL} 50 k`, min: 0, max: 50000 },
    { label: `${CURRENCY_SYMBOL} 50k - ${CURRENCY_SYMBOL} 75k`, min: 50000, max: 75000 },
    { label: `${CURRENCY_SYMBOL} 75k - ${CURRENCY_SYMBOL} 1 L`, min: 75000, max: 100000 },
    { label: `${CURRENCY_SYMBOL} 1 L - ${CURRENCY_SYMBOL} 1.5L`, min: 100000, max: 150000 },
    { label: `${CURRENCY_SYMBOL} 1.5L - ${CURRENCY_SYMBOL} 2 L`, min: 150000, max: 200000 },
    { label: `Above ${CURRENCY_SYMBOL} 2L`, min: 200000, max: Infinity }
  ],
  durations: [
    { label: 'Short (1-4 days)', min: 1, max: 4 },
    { label: 'Medium (5-7 days)', min: 5, max: 7 },
    { label: 'Long (8+ days)', min: 8, max: Infinity }
  ],
  ratings: [5, 4, 3],
};

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
        options={filterOptions.priceRanges}
        selected={selectedPriceRange}
        onChange={onPriceRangeChange}
      />

      {/* Trip Duration */}
      <RangeFilterGroup
        label="Trip Duration"
        icon={<Clock />}
        options={filterOptions.durations}
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
          {filterOptions.ratings.map((starCount) => (
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
