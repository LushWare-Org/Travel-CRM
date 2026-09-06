import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { formatCurrency } from '../../../lib/currency';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PackageCard from '../../../components/shared/PackageCard';
/** One recent-booking card, as shaped by HomeContainer's `recentItems`. */
export interface RecentBookingItem {
  id?: string;
  packageName?: string;
  image?: string;
  duration?: string;
  price?: number;
  pax?: number;
  bookedAgo?: string;
  traveler?: { name?: string; from?: string };
  slug?: string;
}

interface RecentlyBookedSliderProps {
  items?: RecentBookingItem[];
}

export default function RecentlyBookedSlider({ items = [] }: RecentlyBookedSliderProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);
  const [cardsPerView, setCardsPerView] = useState(4);

  const getCardsPerView = () => {
    if (typeof window === 'undefined') return 5;
    if (window.innerWidth < 440) return 1;
    if (window.innerWidth < 640) return 2;
    if (window.innerWidth < 769) return 2;
    if (window.innerWidth < 1024) return 3;
    if (window.innerWidth < 1366) return 3;
    return 4;
  };
  useEffect(() => {
    const handleResize = () => {
      const newCardsPerView = getCardsPerView();
      setCardsPerView(newCardsPerView);
      setSlideIdx(0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const totalSlides = Math.max(items.length, 1);
  const extendedItems = items.length > 0 ? [...items, ...items] : [];

  // Auto-play
  useEffect(() => {
    if (totalSlides <= cardsPerView) return;

    if (window.innerWidth >= 768 && window.innerWidth < 1025) return;
    const interval = setInterval(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setSlideIdx(prev => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [totalSlides, cardsPerView]);

  // Seamless loop reset
  const handleTransitionEnd = () => {
    if (slideIdx >= totalSlides) {
      setEnableTransition(false);
      setSlideIdx(slideIdx - totalSlides);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true));
      });
    }
    animatingRef.current = false;
  };

  const goPrev = () => {
    if (totalSlides <= cardsPerView) return;
    setSlideIdx(prev => prev <= 0 ? totalSlides - 1 : prev - 1);
  };

  const goNext = () => {
    if (totalSlides <= cardsPerView) return;
    setSlideIdx(prev => prev + 1);
  };

  const formatDurationString = (value?: string) => {
    if (!value) return '';
    const dn = value.match(/(\d+)\s*[Dd]\s*(\d+)\s*[Nn]/i);
    if (dn) return `${dn[1]} Days / ${dn[2]} Nights`;
    const days = value.match(/(\d+)\s*[Dd]ays?/i);
    const nights = value.match(/(\d+)\s*[Nn]ights?/i);
    if (days && nights) return `${days[1]} Days / ${nights[1]} Nights`;
    return value;
  };

  if (!items.length) {
    // First-visit empty state: a real zero-bookings account sees this before
    // they (or anyone) has booked. There is no "popular packages" feed wired
    // into this component — HomeContainer owns the packages fetch — so instead
    // of inventing a second data source here, point the visitor at the catalog
    // with a clear CTA. Same dark band as the populated state so the section
    // doesn't flash a different canvas while the parent fetch resolves.
    return (
      <section className="relative overflow-hidden bg-brand-dark-950 py-section-md font-body">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="mb-4 font-display text-3xl font-bold text-white md:text-4xl">
              Recently Booked Packages
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/70">
              Discover the most recent bookings - get inspired for your next journey
            </p>
            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 sm:px-10">
              <h3 className="mb-3 font-display text-2xl font-semibold text-white">
                Be the first to book a getaway
              </h3>
              <p className="mb-8 text-base leading-relaxed text-white/70">
                Real bookings from fellow travellers appear here as they happen.
                Until then, browse our packages and start your own journey.
              </p>
              <Link
                to="/packages"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'h-12 rounded-xl bg-white px-8 font-semibold text-brand-900 hover:bg-brand-50'
                )}
              >
                Explore Packages
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const translateX = -(slideIdx * (100 / cardsPerView));

  return (
    <section className="relative overflow-hidden bg-brand-dark-950 py-section-md font-body">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-white md:text-4xl">
            Recently Booked Packages
          </h2>
          <p className="text-lg text-white/70">
            Discover the most recent bookings - get inspired for your next journey
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div
            className={`absolute -top-12 right-0 gap-3 z-raised ${
              totalSlides > cardsPerView ? 'flex' : 'hidden'
            }`}
          >
            <button
              onClick={goPrev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-floating transition-colors duration-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              aria-label="Previous"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={goNext}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-floating transition-colors duration-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              aria-label="Next"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="overflow-hidden">
            <div
              onTransitionEnd={handleTransitionEnd}
              className={`flex ${enableTransition ? 'transition-transform duration-700 ease-in-out' : ''}`}
              style={{ transform: `translateX(${translateX}%)` }}
            >
              {extendedItems.map((item, idx) => {
                const travelerName = item.traveler?.name;

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex-shrink-0 px-2"
                    style={{ width: `${100 / cardsPerView}%` }}
                  >
                    <PackageCard
                      href={`/package/${item.id}`}
                      image={item.image}
                      title={item.packageName || 'Travel Package'}
                      price={formatCurrency(item.price)}
                      imageClassName="aspect-[4/3]"
                      badge={
                        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-800">
                          {item.bookedAgo ? `${item.bookedAgo} ago` : 'Recently'}
                        </span>
                      }
                      overlayMeta={
                        <>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700">
                            <User className="size-5" />
                          </div>
                          <p className="text-sm font-semibold drop-shadow-sm">{travelerName}</p>
                        </>
                      }
                      meta={
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="size-4 text-brand-accent-600" />
                          <span>{formatDurationString(item.duration)}</span>
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
