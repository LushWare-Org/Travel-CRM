import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchPackages } from '../../../services/api/packages';
import type { NormalizedPackage } from '../../../services/api/packages.transform';
import { formatCurrency } from '../../../lib/currency';
import { FALLBACK_IMAGE } from '../../../config/media';
import { Card } from '@/components/ui/card';

/** A category-derived card shown in the stats section carousel. */
interface CategoryPackage {
  id?: string;
  title: string;
  categoryName: string;
  image?: string;
  price: number;
  slug?: string;
  description: string;
}

function CategoryCard({ pkg, className }: { pkg: CategoryPackage; className?: string }) {
  return (
    <Link
      to={`/packages?category=${encodeURIComponent(pkg.categoryName.toLowerCase())}`}
      className={`group block h-full ${className ?? ''}`}
    >
      <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 ring-0 transition-colors duration-300 group-hover:border-gray-300">
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-gray-100">
          <img
            src={pkg.image}
            alt={pkg.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 transition-colors duration-300 group-hover:text-brand-600">
            {pkg.categoryName.charAt(0).toUpperCase() + pkg.categoryName.slice(1)} Packages
          </h3>
          <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-600">
            {pkg.description}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-600">Starting from</span>
            <span className="font-display text-xl font-bold text-brand-600">
              {formatCurrency(pkg.price)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function RecommendedPackagesSection() {
  const mobileScrollerRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [categoryPackages, setCategoryPackages] = useState<CategoryPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchPackages({ limit: 100 })
      .then(({ packages }) => {
        if (!isMounted) return;
        const grouped: Record<string, NormalizedPackage[]> = {};
        packages.forEach((pkg: NormalizedPackage) => {
          const category = pkg.category || 'Other';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(pkg);
        });
        const categoryList = Object.entries(grouped).map(([category, pkgs]) => {
          const lowestPricePackage = pkgs.reduce((min, pkg) =>
            (pkg.price_from < min.price_from) ? pkg : min
          );

          const getShortDescription = (description: string) => {
            if (!description) return '';
            const words = description.split(' ').slice(0, 5).join(' ');
            return words.length < description.length ? `${words}...` : words;
          };

          return {
            id: lowestPricePackage.id,
            title: `${category} Packages`,
            categoryName: category,
            image: lowestPricePackage.image_url || lowestPricePackage.images?.[0] || FALLBACK_IMAGE,
            price: lowestPricePackage.price_from,
            slug: lowestPricePackage.slug,
            description: getShortDescription(lowestPricePackage.description),
          };
        }).slice(0, 6);
        setCategoryPackages(categoryList);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (isMounted) {
          console.error('Failed to fetch packages:', err);
          setCategoryPackages([]);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-rotate stats every 4 seconds
  useEffect(() => {
    if (categoryPackages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % categoryPackages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [categoryPackages.length]);

  const nextSlide = () => {
    if (isAnimating || categoryPackages.length === 0) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % categoryPackages.length);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const prevSlide = () => {
    if (isAnimating || categoryPackages.length === 0) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev - 1 + categoryPackages.length) % categoryPackages.length);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const getVisiblePackages = () => {
    if (categoryPackages.length === 0) return [];
    const packages = [];
    for (let i = 0; i < 4; i++) {
      packages.push(categoryPackages[(currentSlide + i) % categoryPackages.length]);
    }
    return packages;
  };

  // Mobile (< md) uses a native snap-scroll rail; the arrow buttons drive the
  // rail on small screens and the rotating desktop track from md up.
  const handleArrow = (direction: 1 | -1) => {
    const rail = mobileScrollerRef.current;
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 767px)').matches &&
      rail
    ) {
      const card = rail.querySelector<HTMLElement>('[data-carousel-card]');
      const step = card ? card.offsetWidth + 16 : rail.clientWidth * 0.85;
      rail.scrollBy({ left: direction * step, behavior: 'smooth' });
      return;
    }
    if (direction > 0) {
      nextSlide();
    } else {
      prevSlide();
    }
  };

  const arrowClasses =
    'absolute top-1/2 z-elevated -translate-y-1/2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-floating transition-colors duration-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-40';

  return (
    <section className="stats-section bg-white py-section-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 md:text-4xl">
            Discover Your Perfect Holiday
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
            From relaxing escapes to thrilling adventures - find your ideal trip here.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-t-4 border-b-4 border-brand-500" role="status" aria-label="Loading categories" />
          </div>
        ) : categoryPackages.length === 0 ? (
          <div className="mx-auto max-w-xl text-center">
            <p className="text-gray-500">No packages available at the moment.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Mobile rail — native horizontal snap scroll (swipeable). */}
            <div
              ref={mobileScrollerRef}
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:hidden"
            >
              {categoryPackages.map((pkg) => (
                <div key={pkg.id ?? pkg.categoryName} data-carousel-card className="w-[85%] shrink-0 snap-start sm:w-[48%]">
                  <CategoryCard pkg={pkg} />
                </div>
              ))}
            </div>

            {/* Desktop/tablet rotation — slide window of 4 (2 on sm→md). */}
            <div className="hidden md:block">
              <div className="flex gap-4">
                {getVisiblePackages().map((pkg, index) => (
                  <div
                    key={`${pkg.id}-${currentSlide}-${index}`}
                    className="w-full shrink-0 sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
                  >
                    <CategoryCard pkg={pkg} />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleArrow(-1)}
              className={`${arrowClasses} left-1`}
              aria-label="Previous"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => handleArrow(1)}
              className={`${arrowClasses} right-1`}
              aria-label="Next"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
