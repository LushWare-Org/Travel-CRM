import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Star, Clock, IndianRupee, Filter, X, SlidersHorizontal, Grid, List, ArrowRight, Compass, Sun, Users } from 'lucide-react';
import { fetchPackages } from '../utils/packageApi';
import { createSlug } from '../utils/packageTransform';
import { formatCurrency } from '../utils/currency';

const filterOptions = {
  priceRanges: [
    { label: 'Below ₹ 50 k', min: 0, max: 50000 },
    { label: '₹ 50k - ₹ 75k', min: 50000, max: 75000 },
    { label: '₹ 75k - ₹ 1 L', min: 75000, max: 100000 },
    { label: '₹ 1 L - ₹ 1.5L', min: 100000, max: 150000 },
    { label: '₹ 1.5L - ₹ 2 L', min: 150000, max: 200000 },
    { label: 'Above ₹ 2L', min: 200000, max: Infinity }
  ],
  durations: [
    { label: 'Short (1-4 days)', min: 1, max: 4 },
    { label: 'Medium (5-7 days)', min: 5, max: 7 },
    { label: 'Long (8+ days)', min: 8, max: Infinity }
  ],
  ratings: [5, 4, 3],
};

export default function PackagesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stateSlug = searchParams.get('state');
  const countrySlug = searchParams.get('country');
  const destinationQuery = searchParams.get('destination');
  const categoryQuery = searchParams.get('category');
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
  const [showFilters, setShowFilters] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => setIsVisible(true), []);

  useEffect(() => {
    const handleResize = () => {
      setShowFilters(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const destinationPackages = useMemo(() => {
    let filtered = packagesData;
    if (selectedDestination) {
      filtered = filtered.filter(
        (pkg) => pkg.destination?.key === selectedDestination.id
          || pkg.destination?.slug === selectedDestination.slug
          || pkg.destination?.nameSlug === selectedDestination.nameSlug,
      );
    }
    if (categoryQuery) {
      filtered = filtered.filter(
        (pkg) => pkg.category?.toLowerCase() === categoryQuery.toLowerCase()
      );
    }
    return filtered;
  }, [packagesData, selectedDestination, categoryQuery]);

  const enrichedPackages = useMemo(() => {
    return destinationPackages.map((pkg) => {
      const nights = Math.max(pkg.duration_days - 1, 1);
      return {
        ...pkg,
        durationLabel: pkg.duration_days ? `${pkg.duration_days}D/${nights}N` : '',
      };
    });
  }, [destinationPackages]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4"><div className="max-w-md text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">We ran into an issue</h2><p className="text-gray-600 mb-6">{error}</p><button onClick={() => window.location.reload()} className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700">Try again</button></div></div>;

  const destinationLabel = selectedDestination?.name || 'All Destinations';
  const destinationTypeLabel = selectedDestination
    ? selectedDestination.type === 'domestic' ? 'Domestic' : 'International'
    : 'Curated';
  const categoryLabel = categoryQuery
    ? categoryQuery.charAt(0).toUpperCase() + categoryQuery.slice(1)
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative w-full py-24 overflow-hidden">
        <div className="absolute inset-0">
          <video
            src="/v4.mp4"
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ lineHeight: '1.15' }}
          >
            {categoryLabel || destinationLabel}{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Holiday Packages
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path
                  d="M2 10C50 2 100 2 150 6C200 10 250 10 298 4"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>
          <p
            className={`text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8 transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {categoryLabel ? categoryLabel + ' Packages' : destinationTypeLabel} • {filteredPackages.length} packages available
          </p>
          {/* Social Proof */}
          <div
            className={`mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-8 transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Join 11,000+</p>
                <p className="text-white/60 text-xs">Happy Travelers</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-10 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <span className="text-white font-semibold">4.9/5</span>
              <span className="text-white/60 text-sm">(250K+ reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sticky Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4 mb-4 md:mb-6 sticky top-16 z-40">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  showFilters
                    ? 'bg-gray-100 hover:bg-gray-200 text-black shadow-md hover:shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 hover:border-orange-300'
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
                <button onClick={clearAllFilters} className="text-sm text-gray-600 hover:text-orange-600 font-medium flex items-center space-x-1 transition-colors duration-200">
                  <X className="w-4 h-4" />
                  <span>Clear all</span>
                </button>
              )}
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200"
              >
                <option value="popularity">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="duration">Shortest Trip</option>
              </select>
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1 w-full md:w-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-200'
                      : 'text-gray-500 hover:bg-gray-200 hover:border-orange-300'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-200'
                      : 'text-gray-500 hover:bg-gray-200 hover:border-orange-300'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Filters */}
          {showFilters && (
            <div className="w-full md:w-72 md:flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100 md:sticky md:top-32">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-orange-600" />
                </h3>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-900">Budget</span>
                  </h4>
                  <div className="space-y-2">
                    {filterOptions.priceRanges.map(range => (
                      <label
                        key={range.label}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orange-50/50 cursor-pointer transition-all duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPriceRange?.label === range.label}
                          onChange={() => setSelectedPriceRange((prev) => (prev?.label === range.label ? null : range))}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
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
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orange-50/50 cursor-pointer transition-all duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDuration?.label === dur.label}
                          onChange={() => setSelectedDuration((prev) => (prev?.label === dur.label ? null : dur))}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
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
                    {[5, 4, 3].map((starCount) => (
                      <label
                        key={starCount}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orange-50/50 cursor-pointer transition-all duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={minRating === starCount}
                          onChange={() => setMinRating((prev) => (prev === starCount ? 0 : starCount))}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < starCount ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
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
          )}

          {/* Packages */}
          <div className="flex-1">
            {filteredPackages.length === 0 ? (
              <div className="text-center py-24 bg-gray-50 rounded-2xl">
                <Filter className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No packages found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className={`grid gap-4 md:gap-6 lg:gap-8 ${showFilters ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {filteredPackages.map(pkg => (
                  <Link
                    key={pkg.id}
                    to={`/package/${pkg.id}`}
                    className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-yellow-500 hover:shadow-2xl transition-all duration-300 transform"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
                    <div className="relative overflow-hidden h-56">
                      <img
                        src={(pkg.images && pkg.images[0]) || pkg.image_url}
                        alt={pkg.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm">{pkg.durationLabel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                        {pkg.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{pkg.description}</p>
                      <div className="flex items-center justify-between pt-4">
                        <div>
                          <p className="text-sm text-gray-500">Starting from</p>
                          <p className="text-2xl font-bold text-orange-600">{formatCurrency(pkg.price_from)}</p>
                        </div>
                        <button className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-md hover:shadow-xl">
                          View Details
                        </button>
                      </div>
                    </div>
                  </Link>
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
                    className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-100 hover:shadow-2xl hover:border-yellow-500 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col lg:flex-row">
                      <div className="relative lg:w-80 h-64 lg:h-80 overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
                        <img
                          src={(pkg.images && pkg.images[0]) || pkg.image_url}
                          alt={pkg.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                      </div>
                      <div className="flex-1 p-4 lg:p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                              {pkg.title}
                            </h3>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-5 leading-relaxed">{pkg.description}</p>
                        <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{pkg.durationLabel}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Starting Price</p>
                            <p className="text-3xl font-bold text-orange-600">{formatCurrency(pkg.price_from)}</p>
                          </div>
                          <Link
                            to={`/package/${pkg.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-8 py-3 bg-black hover:bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
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

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-twinkle {
          animation: twinkle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}