import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Star,
  Clock,
  Filter,
  X,
  SlidersHorizontal,
  Heart,
  Globe,
  Compass,
  ChevronRight,
  IndianRupee,
  Grid,
  List,
  ArrowRight,
  Sun, 
} from 'lucide-react';
import { fetchPackages } from '../utils/packageApi';
import { formatCurrency } from '../utils/currency';

const FALLBACK_IMAGE = 'https://via.placeholder.com/1200x800?text=Trip+Sky+Way';

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

export default function DestinationsInternational() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState(['All']);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(typeof window !== 'undefined' ? window.innerWidth > 1280 : false);
  const [favorites, setFavorites] = useState([]);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => setIsVisible(true), []);

  useEffect(() => {
    const handleResize = () => {
      setShowFilters(window.innerWidth > 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPackages({ limit: 100 })
      .then(({ destinations: dest }) => {
        if (!isMounted) return;
        const international = dest.filter(d => d.type !== 'domestic');
        setDestinations(international);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load destinations');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const preparedDestinations = useMemo(() => (
    destinations.map(dest => ({
      ...dest,
      price: dest.price || 0,
      rating: dest.rating || 0,
      reviews: dest.reviews || 0,
      duration: dest.durationLabel || 'Flexible',
      packagesCount: dest.packagesCount || 0,
      country: dest.country || dest.region || 'Worldwide',
    }))
  ), [destinations]);

  const countriesByRegion = useMemo(() => {
    const map = {};
    preparedDestinations.forEach(dest => {
      const region = dest.region || 'Other';
      if (!map[region]) map[region] = new Set();
      if (dest.country) map[region].add(dest.country);
    });
    return Object.fromEntries(
      Object.entries(map).map(([r, c]) => [r, Array.from(c).sort()])
    );
  }, [preparedDestinations]);

  useEffect(() => {
    let filtered = [...preparedDestinations];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.country?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    if (!selectedRegions.includes('All')) filtered = filtered.filter(d => selectedRegions.includes(d.region));
    if (selectedCountries.length > 0) filtered = filtered.filter(d => selectedCountries.includes(d.country));
    if (selectedPriceRange) filtered = filtered.filter(d => d.price >= selectedPriceRange.min && d.price <= selectedPriceRange.max);
    if (minRating > 0) filtered = filtered.filter(d => d.rating >= minRating);

    switch (sortBy) {
      case 'popularity': filtered.sort((a, b) => b.packagesCount - a.packagesCount); break;
      case 'price-low': filtered.sort((a, b) => a.price - b.price); break;
      case 'price-high': filtered.sort((a, b) => b.price - a.price); break;
      case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    setFilteredDestinations(filtered);

    let count = 0;
    if (!selectedRegions.includes('All')) count += selectedRegions.length;
    if (selectedCountries.length > 0) count += selectedCountries.length;
    if (selectedActivities.length > 0) count += selectedActivities.length;
    if (selectedPriceRange) count += 1;
    if (minRating > 0) count += 1;
    setActiveFiltersCount(count);
  }, [preparedDestinations, searchQuery, selectedRegions, selectedCountries, selectedActivities, selectedPriceRange, minRating, sortBy]);

  const toggleActivity = a => setSelectedActivities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  const toggleCountry = c => setSelectedCountries(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleRegion = r => {
    if (r === 'All') { setSelectedRegions(['All']); setSelectedCountries([]); return; }
    setSelectedRegions(p => {
      const next = new Set(p.filter(x => x !== 'All'));
      next.has(r) ? next.delete(r) : next.add(r);
      return next.size === 0 ? ['All'] : Array.from(next);
    });
  };
  const toggleFavorite = id => setFavorites(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const clearAllFilters = () => {
    setSearchQuery(''); setSelectedRegions(['All']); setSelectedCountries([]); setSelectedActivities([]); setSelectedPriceRange(null); setMinRating(0);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4"><div className="max-w-md text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to load destinations</h2><p className="text-gray-600 mb-6">{error}</p><button onClick={() => window.location.reload()} className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700">Try again</button></div></div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero section */}
      <div className="relative w-full py-24 overflow-hidden">
        <div className="absolute inset-0">
          <video
            src="/v3.mp4"
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
            Discover Your Next{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Adventure
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
            Explore {destinations.length} incredible international destinations crafted for comfort, class & unforgettable moments
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
              <span className="text-white text-sm">(250 + Reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sticky Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4 mb-4 md:mb-6 sticky top-16 z-40">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-300 text-sm md:text-base ${
                  showFilters
                    ? 'bg-gray-100 hover:bg-gray-200 text-black shadow-md hover:shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-200 hover:border-orange-300'
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
                <button onClick={clearAllFilters} className="text-xs md:text-sm text-gray-600 hover:text-orange-600 font-medium flex items-center space-x-1 transition-colors duration-200 whitespace-nowrap">
                  <X className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto px-3 md:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm md:text-base"
              >
                <option value="popularity">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
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
              <div className="text-gray-600 font-medium text-sm md:text-base whitespace-nowrap">{filteredDestinations.length} destinations</div>
            </div>
          </div>
        </div>
        {showFilters && (
          <div className="hidden md:block lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowFilters(false)} />
        )}

        <div className="flex flex-col md:flex-row gap-4 md:gap-8 relative">
          {showFilters && (
            <div className="w-full md:w-96 md:flex-shrink-0 md:fixed md:inset-0 md:top-0 md:left-0 md:bottom-0 md:right-auto md:z-50 md:h-screen md:rounded-none lg:static lg:w-72 lg:h-auto lg:fixed:none lg:inset-auto lg:rounded-2xl">
              <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100 md:rounded-none md:h-full md:overflow-y-auto md:flex md:flex-col lg:sticky lg:top-32 lg:rounded-2xl lg:h-auto">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-orange-600" /> 
                </h3>

                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search destinations, countries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-gray-900 placeholder-gray-400 transition-all duration-200"
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
                          onClick={() => toggleRegion(region)}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group cursor-pointer border border-gray-200 hover:border-orange-300 hover:shadow-sm ${
                            selectedRegions.includes(region)
                              ? 'bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 text-orange-800 border-orange-300 shadow-sm'
                              : 'bg-white hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className="font-medium">{region}</span>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${
                              selectedRegions.includes(region) 
                                ? 'text-orange-600' 
                                : 'text-gray-400 group-hover:text-orange-500'
                            }`}
                          />
                        </button>
                        {region !== 'All' && selectedRegions.includes(region) && countriesByRegion[region] && (
                          <div className="mt-2 ml-4 space-y-1 pl-2 border-l-2 border-orange-200">
                            {countriesByRegion[region].map((country) => (
                              <label key={country} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orange-50/50 cursor-pointer transition-all duration-200">
                                <input
                                  type="checkbox"
                                  checked={selectedCountries.includes(country)}
                                  onChange={() => toggleCountry(country)}
                                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
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

          <div className="flex-1">
            {filteredDestinations.length === 0 ? (
              <div className="text-center py-24 bg-gray-50 rounded-2xl">
                <Filter className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No destinations found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className={`grid gap-4 md:gap-5 md:gap-6 ${showFilters ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                {filteredDestinations.map(dest => (
                  <Link
                    key={dest.id}
                    to={`/packages?destination=${dest.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-yellow-500 hover:shadow-2xl transition-all duration-300 transform"
                  > <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
                    <div className="relative overflow-hidden aspect-[5/3]">
                      <img
                        src={dest.image_url || FALLBACK_IMAGE}
                        alt={dest.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm">{dest.duration}</span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-white">
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600  transition-colors">
                        {dest.name}, {dest.country}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{dest.description}</p>
                      <div className="flex items-center justify-between py-2 border-t border-b border-gray-200">
                        <div className="text-left">
                          <div className="flex items-center gap-1 text-gray-700 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold text-gray-900">{dest.duration}</span>
                          </div>
                          <p className="text-xs text-gray-500">Duration</p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{dest.packagesCount}</div>
                          <p className="text-xs text-gray-500">Packages</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-sm text-gray-500">Starting from</p>
                          <p className="text-xl font-bold text-orange-600">{formatCurrency(dest.price)}</p>
                        </div>
                        <button className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-md hover:shadow-xl text-sm">
                          View Details
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="space-y-6">
                {filteredDestinations.map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => navigate(`/packages?destination=${dest.slug}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/packages?destination=${dest.slug}`); }}
                    role="button"
                    tabIndex={0}
                    className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-100 hover:shadow-2xl hover:border-yellow-500 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col lg:flex-row">
                      <div className="relative lg:w-80 h-64 lg:h-80 overflow-hidden flex-shrink-0">
                        <img
                          src={dest.image_url || FALLBACK_IMAGE}
                          alt={dest.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                      </div>
                      <div className="flex-1 p-4 lg:p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                              {dest.name}, {dest.country}
                            </h3>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-5 line-clamp-2">{dest.description}</p>
                        <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{dest.duration || 'Flexible'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Sun className="w-4 h-4" />
                            <span>{dest.packagesCount} curated packages</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Starting Price</p>
                            <p className="text-3xl font-bold text-orange-600">{formatCurrency(dest.price)}</p>
                          </div>
                          <Link
                            to={`/packages?destination=${dest.slug}`}
                            onClick={(e) => e.stopPropagation()}
                        className="px-8 py-3 bg-black hover:bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
                          >
                            <span>View Packages</span>
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