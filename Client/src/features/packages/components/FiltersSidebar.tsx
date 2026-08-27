import { Filter, X, Banknote, Clock, Star } from 'lucide-react';
import { getCurrencySymbol } from '../../../lib/currency';

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
    <div className="w-72 fixed top-0 left-0 max-h-screen z-50 md:w-96 md:flex-shrink-0 md:fixed md:top-0 md:left-0 md:bottom-0 md:right-auto md:h-screen md:rounded-none 2xl:static 2xl:w-72 2xl:h-auto 2xl:inset-auto 2xl:rounded-2xl">
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100 h-screen md:rounded-none md:h-full md:overflow-y-auto md:flex md:flex-col 2xl:sticky 2xl:top-24 2xl:rounded-2xl 2xl:h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 2xl:mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-600" />
          </h3>
          <button
            onClick={onClose}
            className="2xl:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 hover:text-gray-900" />
          </button>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-gray-600" />
            <span className="text-gray-900">Budget</span>
          </h4>
          <div className="space-y-2">
            {filterOptions.priceRanges.map(range => (
              <label
                key={range.label}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-50/50 cursor-pointer transition-all duration-200"
              >
                <input
                  type="checkbox"
                  checked={selectedPriceRange?.label === range.label}
                  onChange={() => onPriceRangeChange(selectedPriceRange?.label === range.label ? null : range)}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 focus:ring-2"
                />
                <span className="text-gray-700 font-medium">{range.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-gray-900">Trip Duration</span>
          </h4>
          <div className="space-y-2">
            {filterOptions.durations.map(dur => (
              <label
                key={dur.label}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-50/50 cursor-pointer transition-all duration-200"
              >
                <input
                  type="checkbox"
                  checked={selectedDuration?.label === dur.label}
                  onChange={() => onDurationChange(selectedDuration?.label === dur.label ? null : dur)}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 focus:ring-2"
                />
                <span className="text-gray-700 font-medium">{dur.label}</span>
              </label>
            ))}
          </div>
        </div>

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
      </div>
    </div>
  );
}
