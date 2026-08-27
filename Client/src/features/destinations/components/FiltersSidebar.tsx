import { Search, Filter, X, Globe, ChevronRight, IndianRupee, Star } from 'lucide-react';

export interface PriceRange {
  label: string;
  min: number;
  max: number;
}

const filterOptions = {
  regions: ['All', 'Asia', 'Europe', 'Middle East', 'Oceania', 'Africa', 'Americas'],
  priceRanges: [
    { label: 'Below ₹ 50 k', min: 0, max: 50000 },
    { label: '₹ 50k - ₹ 75k', min: 50000, max: 75000 },
    { label: '₹ 75k - ₹ 1 L', min: 75000, max: 100000 },
    { label: '₹ 1 L - ₹ 1.5L', min: 100000, max: 150000 },
    { label: '₹ 1.5L - ₹ 2 L', min: 150000, max: 200000 },
    { label: 'Above ₹ 2L', min: 200000, max: Infinity },
  ],
  ratings: [5, 4, 3],
};

interface FiltersSidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedRegions: string[];
  onToggleRegion: (region: string) => void;
  countriesByRegion: Record<string, string[]>;
  selectedCountries: string[];
  onToggleCountry: (country: string) => void;
  selectedPriceRange: PriceRange | null;
  onPriceRangeChange: (range: PriceRange | null) => void;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  onClose: () => void;
}

export default function FiltersSidebar({
  searchQuery,
  onSearchChange,
  selectedRegions,
  onToggleRegion,
  countriesByRegion,
  selectedCountries,
  onToggleCountry,
  selectedPriceRange,
  onPriceRangeChange,
  minRating,
  onMinRatingChange,
  onClose,
}: FiltersSidebarProps) {
  return (
    <div className="w-72 fixed top-0 left-0 max-h-screen z-50 md:w-96 md:flex-shrink-0 md:fixed md:top-0 md:left-0 md:bottom-0 md:right-auto md:h-screen md:rounded-none 2xl:static 2xl:w-72 2xl:h-auto 2xl:inset-auto 2xl:rounded-2xl">
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100 h-screen md:rounded-none md:h-full md:overflow-y-auto md:flex md:flex-col 2xl:sticky 2xl:top-32 2xl:rounded-2xl 2xl:h-auto overflow-y-auto">
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search destinations, countries..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-900 placeholder-gray-400 transition-all duration-200"
            />
          </div>
        </div>

        {/* Region */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-600" />
            <span className="text-gray-900">Region</span>
          </h4>
          <div className="space-y-1">
            {filterOptions.regions.map((region) => (
              <div key={region}>
                <button
                  onClick={() => onToggleRegion(region)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group cursor-pointer border border-gray-200 hover:border-brand-300 hover:shadow-sm ${selectedRegions.includes(region)
                      ? 'bg-gradient-to-r from-brand-50 via-brand-accent-50 to-brand-100 text-brand-800 border-brand-300 shadow-sm'
                      : 'bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <span className="font-medium">{region}</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${selectedRegions.includes(region)
                        ? 'text-brand-600'
                        : 'text-gray-400 group-hover:text-brand-500'
                      }`}
                  />
                </button>
                {region !== 'All' && selectedRegions.includes(region) && countriesByRegion[region] && (
                  <div className="mt-2 ml-4 space-y-1 pl-2 border-l-2 border-brand-200">
                    {countriesByRegion[region].map((country) => (
                      <label key={country} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-50/50 cursor-pointer transition-all duration-200">
                        <input
                          type="checkbox"
                          checked={selectedCountries.includes(country)}
                          onChange={() => onToggleCountry(country)}
                          className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 focus:ring-2"
                        />
                        <span className="text-gray-700">{country}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-gray-600" />
            <span className="text-gray-900">Budget</span>
          </h4>
          <div className="space-y-2">
            {filterOptions.priceRanges.map((range) => (
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

        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-gray-600" />
            <span className="text-gray-900">Hotel Rating</span>
          </h4>
          <div className="space-y-2">
            {[5, 4, 3].map((starCount) => (
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
