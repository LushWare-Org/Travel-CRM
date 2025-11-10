import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Clock, DollarSign, Filter, X, SlidersHorizontal, Grid, List, Heart, ArrowRight, Globe, Compass, Sun, ChevronRight } from 'lucide-react';
import { mockDestinations, mockPackages } from '../data/mockData';

const filterOptions = {
  priceRanges: [
    { label: 'Budget', min: 0, max: 500 },
    { label: 'Mid-Range', min: 500, max: 1200 },
    { label: 'Luxury', min: 1200, max: 2500 }
  ],
  activities: ['Beach', 'Mountains', 'Culture', 'Adventure', 'Luxury', 'Food', 'Shopping', 'Nature', 'Romance'],
  ratings: [4.9, 4.8, 4.7, 4.5, 4.0],
};

export default function DestinationsDomestic() {
  const navigate = useNavigate();
  const domesticDestinations = mockDestinations.filter(d => d.country === 'India');
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(true);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const allDestinationNames = useMemo(() => {
    return domesticDestinations.map(d => d.name).sort();
  }, []);

  const enrichedDestinations = domesticDestinations.map(dest => {
    const packages = mockPackages.filter(p => p.destination_id === dest.id);
    const avgRating = packages.length > 0
      ? (packages.reduce((sum, p) => sum + p.rating, 0) / packages.length).toFixed(1)
      : 4.5;
    const reviews = packages.reduce((sum, p) => sum + p.reviews_count, 0);
    const minPrice = packages.length > 0 ? Math.min(...packages.map(p => p.price_from)) : 399;
    const duration = packages.length > 0
      ? `${Math.min(...packages.map(p => p.duration_days))}D/${Math.min(...packages.map(p => p.duration_days)) - 1}N`
      : '4D/3N';
    const inferredActivities = new Set();
    packages.forEach(p => {
      p.highlights.forEach(h => {
        if (h.includes('Beach') || h.includes('Island') || h.includes('Sea')) inferredActivities.add('Beach');
        if (h.includes('Mountain') || h.includes('Hill') || h.includes('Trekking')) inferredActivities.add('Mountains');
        if (h.includes('Culture') || h.includes('Temple') || h.includes('Heritage') || h.includes('Palace')) inferredActivities.add('Culture');
        if (h.includes('Adventure') || h.includes('Safari') || h.includes('Skydiving') || h.includes('Water Sports')) inferredActivities.add('Adventure');
        if (h.includes('Luxury') || h.includes('Spa') || h.includes('Villa') || h.includes('5-Star')) inferredActivities.add('Luxury');
        if (h.includes('Food') || h.includes('Cuisine') || h.includes('Cooking')) inferredActivities.add('Food');
        if (h.includes('Shopping') || h.includes('Market') || h.includes('Mall')) inferredActivities.add('Shopping');
        if (h.includes('Nature') || h.includes('Wildlife') || h.includes('Backwaters')) inferredActivities.add('Nature');
        if (h.includes('Honeymoon') || h.includes('Romance') || h.includes('Candlelight')) inferredActivities.add('Romance');
      });
    });
    return {
      ...dest,
      rating: parseFloat(avgRating),
      reviews,
      price: minPrice,
      duration,
      packages: packages.length,
      activities: Array.from(inferredActivities || []),
      tags: dest.popular ? ['Trending'] : []
    };
  });

  useEffect(() => {
    let filtered = [...enrichedDestinations];
    if (searchQuery) {
      filtered = filtered.filter(dest =>
        dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dest.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedDestinations.length > 0) {
      filtered = filtered.filter(dest => selectedDestinations.includes(dest.name));
    }
    if (selectedActivities.length > 0) {
      filtered = filtered.filter(dest =>
        selectedActivities.some(act => dest.activities.includes(act))
      );
    }
    if (selectedPriceRange) {
      filtered = filtered.filter(dest =>
        dest.price >= selectedPriceRange.min && dest.price <= selectedPriceRange.max
      );
    }
    if (minRating > 0) {
      filtered = filtered.filter(dest => dest.rating >= minRating);
    }
    switch (sortBy) {
      case 'popularity':
        filtered.sort((a, b) => b.packages - a.packages);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    setFilteredDestinations(filtered);
    let count = 0;
    if (selectedDestinations.length > 0) count += selectedDestinations.length;
    if (selectedActivities.length > 0) count += selectedActivities.length;
    if (selectedPriceRange) count++;
    if (minRating > 0) count++;
    setActiveFiltersCount(count);
  }, [searchQuery, selectedDestinations, selectedActivities, selectedPriceRange, minRating, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedDestinations([]);
    setSelectedActivities([]);
    setSelectedPriceRange(null);
    setMinRating(0);
  };

  const toggleActivity = (act) => {
    setSelectedActivities(prev =>
      prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]
    );
  };

  const toggleDestination = (destName) => {
    setSelectedDestinations(prev =>
      prev.includes(destName) ? prev.filter(d => d !== destName) : [...prev, destName]
    );
  };

  return (
    <div className="min-h-screen font-sans bg-white">
       {/* Hero */}
      <div className="relative h-[40vh] overflow-hidden bg-black/90">
        <div className="absolute inset-0 ">
          <video
            src="/v1.mp4"
            className="w-full h-full object-cover"
            autoPlay
            loop
          >
          </video>
        </div>
        <div className="absolute inset-0 bg-black/50 "></div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-center">
            Discover Your Next <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-300">Adventure</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl text-center mb-8">
            Explore {domesticDestinations.length} incredible local destinations
          </p>
        </div>
      </div>
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 sticky top-55 z-40">
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
                <option value="name">Name (A-Z)</option>
              </select>
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
              <div className="text-gray-600 font-medium">
                {filteredDestinations.length} destinations
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-6">
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-38 h-[calc(180vh-10rem)] overflow-y-auto">
                <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-orange-600" />
                  <span>Filter Destinations</span>
                </h3>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search destinations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:border-orange-500 focus:outline-none text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                </div>
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span>Destinations</span>
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {allDestinationNames.map(destName => (
                      <label
                        key={destName}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDestinations.includes(destName)}
                          onChange={() => toggleDestination(destName)}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-gray-700">{destName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
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
                        <span className="text-sm">${range.min} - ${range.max}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-gray-600" />
                    <span>Activities</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.activities.map(act => (
                      <button
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                          selectedActivities.includes(act)
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>
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
          <div className="flex-1">
            {filteredDestinations.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No destinations found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filters</p>
                <button onClick={clearAllFilters} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Clear all filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDestinations.map(dest => (
                  <div
                    key={dest.id}
                    onClick={() => navigate(`/packages?state=${dest.slug_state}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/packages?state=${dest.slug_state}`); }}
                    role="button"
                    tabIndex={0}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center space-x-2 text-white">
                          <MapPin className="w-5 h-5" />
                          <span className="font-semibold text-lg">{dest.name}, India</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{dest.description}</p>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="font-bold text-gray-900">{dest.rating}</span>
                          </div>
                          <p className="text-xs text-gray-500">{dest.reviews} reviews</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="font-bold text-gray-900">{dest.duration}</span>
                          </div>
                          <p className="text-xs text-gray-500">Duration</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center mb-1">
                            <span className="font-bold text-gray-900">{dest.packages}</span>
                          </div>
                          <p className="text-xs text-gray-500">Packages</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Starting from</p>
                          <p className="text-2xl font-bold text-gray-900">${dest.price}</p>
                        </div>
                        <Link
                          to={`/packages?state=${dest.slug_state}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
                        >
                          <span>Explore</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDestinations.map(dest => (
                  <div
                    key={dest.id}
                    onClick={() => navigate(`/packages?state=${dest.slug_state}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/packages?state=${dest.slug_state}`); }}
                    role="button"
                    tabIndex={0}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="relative md:w-80 h-64 md:h-auto flex-shrink-0 overflow-hidden">
                        <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
                      </div>
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                              {dest.name}, India
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>India</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1.5 rounded-lg">
                            <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                            <span className="font-bold text-gray-900">{dest.rating}</span>
                            <span className="text-gray-500 text-sm">({dest.reviews})</span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4 leading-relaxed">{dest.description}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-6">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Starting from</p>
                              <p className="text-3xl font-bold text-gray-900">${dest.price}</p>
                            </div>
                            <div className="text-sm text-gray-600">
                              <div className="flex items-center space-x-1 mb-1">
                                <Clock className="w-4 h-4" />
                                <span className="font-semibold">{dest.duration}</span>
                              </div>
                              <div>{dest.packages} packages available</div>
                            </div>
                          </div>
                          <Link
                            to={`/packages?state=${dest.slug_state}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
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
    </div>
  );
}