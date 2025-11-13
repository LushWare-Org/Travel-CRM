import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Star, Clock, IndianRupee, Filter, X, SlidersHorizontal, Grid, List, ArrowRight, Compass, Sun, Users } from 'lucide-react';
import { fetchPackages } from '../utils/packageApi';
import { createSlug } from '../utils/packageTransform';
import { formatCurrency } from '../utils/currency';

const filterOptions = {
  priceRanges: [
    { label: 'Budget', min: 0, max: 1500 },
    { label: 'Mid-Range', min: 1500, max: 3000 },
    { label: 'Premium', min: 3000, max: 6000 },
    { label: 'Luxury', min: 6000, max: Infinity }
  ],
  durations: [
    { label: 'Short (1-4 days)', min: 1, max: 4 },
    { label: 'Medium (5-7 days)', min: 5, max: 7 },
    { label: 'Long (8+ days)', min: 8, max: Infinity }
  ],
  activities: ['Beach', 'Mountains', 'Culture', 'Adventure', 'Luxury', 'Food', 'Shopping', 'Nature', 'Romance', 'Honeymoon', 'Family'],
  ratings: [4.9, 4.8, 4.7, 4.5, 4.0],
};

export default function PackagesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stateSlug = searchParams.get('state');
  const countrySlug = searchParams.get('country');
  const destinationQuery = searchParams.get('destination');
  const destinationParam = (destinationQuery || stateSlug || countrySlug || '').toLowerCase();

  const [packagesData, setPackagesData] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(true);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchPackages({ limit: 100 })
      .then(({ packages, destinations: dest }) => {
        if (!isMounted) return;
        setPackagesData(packages);
        setDestinations(dest);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load packages');
        setPackagesData([]);
        setDestinations([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedDestination = useMemo(() => {
    if (!destinationParam) return null;
    const slugCandidate = createSlug(destinationParam);
    const match = destinations.find((dest) => {
      const slug = dest.slug?.toLowerCase();
      const id = dest.id?.toLowerCase();
      const nameSlug = dest.nameSlug?.toLowerCase();
      const countrySlug = dest.countrySlug?.toLowerCase();
      return (
        (slug && slug === destinationParam) ||
        (slug && slug === slugCandidate) ||
        (id && (id === destinationParam || id === slugCandidate)) ||
        (nameSlug && (nameSlug === destinationParam || nameSlug === slugCandidate)) ||
        (countrySlug && (countrySlug === destinationParam || countrySlug === slugCandidate))
      );
    });
    return match || null;
  }, [destinationParam, destinations]);

  // Filter packages by destination
  const destinationPackages = useMemo(() => {
    if (selectedDestination) {
      return packagesData.filter(
        (pkg) => pkg.destination?.key === selectedDestination.id
          || pkg.destination?.slug === selectedDestination.slug
          || pkg.destination?.nameSlug === selectedDestination.nameSlug,
      );
    }
    return packagesData;
  }, [packagesData, selectedDestination]);

  const enrichedPackages = useMemo(() => {
    return destinationPackages.map((pkg) => {
      const nights = Math.max(pkg.duration_days - 1, 1);
      return {
        ...pkg,
        activities: pkg.activities || [],
        durationLabel: pkg.duration_days ? `${pkg.duration_days}D/${nights}N` : '',
      };
    });
  }, [destinationPackages]);

  // Apply filters
  const filteredPackages = useMemo(() => {
    let filtered = [...enrichedPackages];

    if (selectedActivities.length > 0) {
      filtered = filtered.filter(pkg =>
        selectedActivities.some(act => pkg.activities.includes(act))
      );
    }

    if (selectedPriceRange) {
      filtered = filtered.filter(pkg =>
        pkg.price_from >= selectedPriceRange.min &&
        (selectedPriceRange.max === Infinity || pkg.price_from <= selectedPriceRange.max)
      );
    }

    if (selectedDuration) {
      filtered = filtered.filter(pkg =>
        pkg.duration_days >= selectedDuration.min &&
        (selectedDuration.max === Infinity || pkg.duration_days <= selectedDuration.max)
      );
    }

    if (minRating > 0) {
      filtered = filtered.filter(pkg => pkg.rating >= minRating);
    }

    // Sorting
    switch (sortBy) {
      case 'popularity':
        filtered.sort((a, b) => b.reviews_count - a.reviews_count);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price_from - b.price_from);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price_from - a.price_from);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'duration':
        filtered.sort((a, b) => a.duration_days - b.duration_days);
        break;
    }

    return filtered;
  }, [enrichedPackages, selectedActivities, selectedPriceRange, selectedDuration, minRating, sortBy]);

  useEffect(() => {
    let count = 0;
    if (selectedActivities.length > 0) count += selectedActivities.length;
    if (selectedPriceRange) count++;
    if (selectedDuration) count++;
    if (minRating > 0) count++;
    setActiveFiltersCount(count);
  }, [selectedActivities, selectedPriceRange, selectedDuration, minRating]);

  const clearAllFilters = () => {
    setSelectedActivities([]);
    setSelectedPriceRange(null);
    setSelectedDuration(null);
    setMinRating(0);
  };

  const toggleActivity = (act) => {
    setSelectedActivities(prev =>
      prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">We ran into an issue</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const destinationLabel = selectedDestination?.name || 'All Destinations';
  const destinationTypeLabel = selectedDestination
    ? selectedDestination.type === 'domestic' ? 'Domestic' : 'International'
    : 'Curated';

  return (
    <div className="min-h-screen font-sans bg-white">
       {/* Hero */}
      <div className="relative h-[40vh] overflow-hidden bg-black/90">
        <div className="absolute inset-0">
          <video
            src="/v1.mp4"
            className="w-full h-full object-cover opacity-80"
            autoPlay
            loop
          >
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-8 text-center">
            {destinationLabel}{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-300">
              Holiday Packages
            </span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl text-center mb-8">
            {destinationTypeLabel} • {filteredPackages.length} packages available
          </p>
        </div>
      </div>
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 sticky top-16 z-40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="font-semibold">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters} className="text-sm text-gray-600 hover:text-orange-600 font-medium flex items-center space-x-1">
                  <X className="w-4 h-4" />
                  <span>Clear all</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="popularity">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="duration">Shortest Trip</option>
              </select>
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-38 h-[calc(160vh-12rem)] overflow-y-auto">
                <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-orange-600" />
                  <span>Filter Packages</span>
                </h3>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <IndianRupee className="w-4 h-4 text-gray-600" />
                    <span>Price Range</span>
                  </h4>
                  <div className="space-y-2">
                    {filterOptions.priceRanges.map(range => (
                      <button
                        key={range.label}
                        onClick={() => setSelectedPriceRange(selectedPriceRange?.label === range.label ? null : range)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                          selectedPriceRange?.label === range.label
                            ? 'bg-green-50 border-2 border-green-500 text-green-900'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                        }`}
                      >
                        <span>{range.label}</span>
                        <span className="text-sm">
                          {range.max === Infinity
                            ? `${formatCurrency(range.min)}+`
                            : `${formatCurrency(range.min)} - ${formatCurrency(range.max)}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span>Trip Duration</span>
                  </h4>
                  <div className="space-y-2">
                    {filterOptions.durations.map(dur => (
                      <button
                        key={dur.label}
                        onClick={() => setSelectedDuration(selectedDuration?.label === dur.label ? null : dur)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                          selectedDuration?.label === dur.label
                            ? 'bg-blue-50 border-2 border-blue-500 text-blue-900'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                        }`}
                      >
                        <span>{dur.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activities */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3-3 flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-gray-600" />
                    <span>Activities & Themes</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.activities.map(act => (
                      <button
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                          selectedActivities.includes(act)
                            ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Star className="w-4 h-4 text-gray-600" />
                    <span>Minimum Rating</span>
                  </h4>
                  <div className="space-y-2">
                    {filterOptions.ratings.map(r => (
                      <button
                        key={r}
                        onClick={() => setMinRating(minRating === r ? 0 : r)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
                          minRating === r
                            ? 'bg-yellow-50 border-2 border-yellow-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span>{r}+ & above</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Packages */}
          <div className="flex-1">
            {filteredPackages.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-2xl">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                  <Filter className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No packages found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filters</p>
                <button onClick={clearAllFilters} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPackages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => navigate(`/package/${pkg.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/package/${pkg.id}`); }}
                    role="button"
                    tabIndex={0}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={(pkg.images && pkg.images[0]) || pkg.image_url}
                        alt={pkg.title}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/1200x800?text=No+Image'; }}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                        {pkg.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{pkg.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {pkg.activities.slice(0, 3).map(act => (
                          <span key={act} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                            {act}
                          </span>
                        ))}
                        {pkg.activities.length > 3 && (
                          <span className="text-xs text-gray-500">+{pkg.activities.length - 3} more</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-bold text-gray-900">{pkg.rating}</span>
                          <span className="text-sm text-gray-500">({pkg.reviews_count})</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">{pkg.durationLabel}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Starting from</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(pkg.price_from)}</p>
                        </div>
                        <Link
                          to={`/package/${pkg.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-5 py-2 bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center space-x-2 text-sm"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPackages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => navigate(`/package/${pkg.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/package/${pkg.id}`); }}
                    role="button"
                    tabIndex={0}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col lg:flex-row">
                      <div className="relative lg:w-96 h-64 lg:h-auto overflow-hidden flex-shrink-0">
                        <img
                          src={(pkg.images && pkg.images[0]) || pkg.image_url}
                          alt={pkg.title}
                          loading="lazy"
                          onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/1200x800?text=No+Image'; }}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-orange-600">
                          {pkg.category}
                        </div>
                      </div>
                      <div className="flex-1 p-6 lg:p-8">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                              {pkg.title}
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {pkg.activities.map(act => (
                                <span key={act} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                                  {act}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1.5 rounded-lg">
                            <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                            <span className="font-bold text-gray-900">{pkg.rating}</span>
                            <span className="text-gray-500 text-sm">({pkg.reviews_count})</span>
                          </div>
                        </div>

                        <p className="text-gray-600 mb-5 leading-relaxed">{pkg.description}</p>

                        <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{pkg.durationLabel}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>Suitable for {pkg.category}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Starting Price</p>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(pkg.price_from)}</p>
                          </div>
                          <Link
                            to={`/package/${pkg.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
                          >
                            <span>View Package</span>
                            <ArrowRight className="w-5 h-5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}