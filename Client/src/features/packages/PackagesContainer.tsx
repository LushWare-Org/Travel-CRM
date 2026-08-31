import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { fetchPackages } from '../../services/api/packages';
import { createSlug } from '../../services/api/packages.transform';
import type { AggregatedDestination, NormalizedPackage } from '../../services/api/packages.transform';
import HeroSection from './components/HeroSection';
import Toolbar from './components/Toolbar';
import FiltersSidebar, { type RangeOption } from './components/FiltersSidebar';
import PackageCard from './components/PackageCard';
import PackageListItem from './components/PackageListItem';
import Pagination from './components/Pagination';
import { pluralize } from '../../lib/pluralize';

export type SortOption = 'popularity' | 'price-low' | 'price-high' | 'duration';
export type ViewMode = 'grid' | 'list';

/** A package enriched with the display-oriented duration label used by the cards. */
export interface EnrichedPackage extends NormalizedPackage {
  durationLabel: string;
}

export default function PackagesContainer() {
  const [searchParams] = useSearchParams();
  const stateSlug = searchParams.get('state');
  const countrySlug = searchParams.get('country');
  const destinationQuery = searchParams.get('destination');
  const categoryQuery = searchParams.get('category');
  const destinationParam = (destinationQuery || stateSlug || countrySlug || '').toLowerCase();

  const [packagesData, setPackagesData] = useState<NormalizedPackage[]>([]);
  const [destinations, setDestinations] = useState<AggregatedDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPriceRange, setSelectedPriceRange] = useState<RangeOption | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<RangeOption | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [showFilters, setShowFilters] = useState(typeof window !== 'undefined' ? window.innerWidth > 1400 : false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => setIsVisible(true), []);

  useEffect(() => {
    const handleResize = () => {
      setShowFilters(window.innerWidth > 1400);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
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

  const selectedDestination = useMemo<AggregatedDestination | null>(() => {
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

  const enrichedPackages = useMemo<EnrichedPackage[]>(() => {
    return destinationPackages.map((pkg) => {
      const nights = Math.max(pkg.duration_days - 1, 1);
      return {
        ...pkg,
        durationLabel: pkg.duration_days ? `${pkg.duration_days}D/${nights}N` : '',
      };
    });
  }, [destinationPackages]);

  const filteredPackages = useMemo<EnrichedPackage[]>(() => {
    let filtered = [...enrichedPackages];
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
  }, [enrichedPackages, selectedPriceRange, selectedDuration, minRating, sortBy]);

  const paginatedPackages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPackages.slice(startIndex, endIndex);
  }, [filteredPackages, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);

  useEffect(() => {
    let count = 0;
    if (selectedPriceRange) count++;
    if (selectedDuration) count++;
    if (minRating > 0) count++;
    setActiveFiltersCount(count);
  }, [selectedPriceRange, selectedDuration, minRating]);

  const clearAllFilters = () => {
    setSelectedPriceRange(null);
    setSelectedDuration(null);
    setMinRating(0);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-500" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4"><div className="max-w-md text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">We ran into an issue</h2><p className="text-gray-600 mb-6">{error}</p><button onClick={() => window.location.reload()} className="px-6 py-3 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700">Try again</button></div></div>;

  const destinationLabel = selectedDestination?.name || 'All Destinations';
  const destinationTypeLabel = selectedDestination
    ? 'International'
    : 'Curated';
  const categoryLabel = categoryQuery
    ? categoryQuery.charAt(0).toUpperCase() + categoryQuery.slice(1)
    : null;

  return (
    <div className="min-h-screen bg-white">
      <HeroSection
        isVisible={isVisible}
        title={categoryLabel || destinationLabel}
        subtitle={`${categoryLabel ? categoryLabel + ' Packages' : destinationTypeLabel} • ${pluralize(filteredPackages.length, 'package')} available`}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sticky Toolbar */}
        <Toolbar
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          activeFiltersCount={activeFiltersCount}
          onClearAllFilters={clearAllFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {showFilters && (
          <div className="block 2xl:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-elevated" onClick={() => setShowFilters(false)} />
        )}

        <div className="flex flex-col md:flex-row gap-4 md:gap-8 relative">
          {/* Filters */}
          {showFilters && (
            <FiltersSidebar
              selectedPriceRange={selectedPriceRange}
              selectedDuration={selectedDuration}
              minRating={minRating}
              onPriceRangeChange={setSelectedPriceRange}
              onDurationChange={setSelectedDuration}
              onMinRatingChange={setMinRating}
              onClose={() => setShowFilters(false)}
            />
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
              <>
                <div className={`grid gap-4 md:gap-6 lg:gap-8 ${showFilters ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                  {paginatedPackages.map(pkg => (
                    <PackageCard key={pkg.id} pkg={pkg} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            ) : (
              <>
                <div className="space-y-6">
                  {paginatedPackages.map(pkg => (
                    <PackageListItem key={pkg.id} pkg={pkg} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
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
