import { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import RecentlyBookedSlider from './components/RecentlyBookedSlider';
import DestinationsSection from './components/DestinationsSection';
import FeaturedPackages from './components/FeaturedPackages';
import WhyChooseUs from './components/WhyChooseUs';
import TestimonialsSection from './components/TestimonialsSection';
import FAQSection from './components/FAQ';
import KeyPartnersSection from './components/KeyPartners';
import Stats from './components/Stats';
import AboutSection from './components/AboutSection';
import { fetchPackages } from '../../services/api/packages';
import type { NormalizedPackage, AggregatedDestination } from '../../services/api/packages.transform';
import { fetchRecentBookings } from '../../services/api/booking';
import { HERO_SLIDES } from '../../content/home';
import { MONTHS } from './utils/constants';
import { HERO_MEDIA } from '../../config/media';
import HeroBackground from '../../components/shared/HeroBackground';
import { isLushTheme } from '../../config/activeTheme';
import SustainabilityStrip from './components/SustainabilityStrip';
import AIPlanningExplainer from './components/AIPlanningExplainer';
import {
  InlineMapPin,
  InlineCalendar,
  InlineSearch,
  InlineChevronLeft,
  InlineChevronRight,
  InlineArrowRight,
} from './components/icons';

/** Raw shape of a recent booking as returned by `fetchRecentBookings`. */
interface RecentBooking {
  id?: string;
  packageId?: string;
  packageName?: string;
  packageDestination?: string;
  packageDuration?: number;
  packageCoverImage?: string;
  packageSlug?: string;
  packagePrice?: number;
  createdAt?: string;
  numberOfTravelers?: number;
  userName?: string;
}

/** Placeholder phrases cycled by the hero search bar's typewriter effect. */
const destinationTexts = ['Select Destination', 'Choose Your Dream Place', 'Where To Go?', 'Pick A Location'];
const whenTexts = ['Any Month', 'When Are You Traveling?', 'Pick a Month', 'Choose Travel Date'];

export default function HomeContainer() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<AggregatedDestination[]>([]);
  const [packages, setPackages] = useState<NormalizedPackage[]>([]);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  // Kept for parity with the original Home.jsx: the loading flag drives the
  // old fetch flow but is not read in the rendered tree.
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 4;

  // Search
  const [searchFilters, setSearchFilters] = useState({ destination: '', when: '' });

  const [destinationPlaceholder, setDestinationPlaceholder] = useState('');
  const [whenPlaceholder, setWhenPlaceholder] = useState('');
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement | null>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = monthDropdownRef.current?.contains(target);
      const insidePanel = dropdownPanelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) {
        setMonthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!monthDropdownOpen) return;
    const updatePosition = () => {
      const rect = monthButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [monthDropdownOpen]);

  useEffect(() => {
    let destIndex = 0;
    let whenIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const type = () => {
      const destText = destinationTexts[destIndex];
      const whenText = whenTexts[whenIndex];

      if (!isDeleting) {
        const destChar = destText.substring(0, charIndex + 1);
        const whenChar = whenText.substring(0, charIndex + 1);
        setDestinationPlaceholder(destChar);
        setWhenPlaceholder(whenChar);
        charIndex++;

        if (charIndex > Math.max(destText.length, whenText.length)) {
          isDeleting = true;
          timeout = setTimeout(type, 1800);
          return;
        }
      } else {
        const destChar = destText.substring(0, charIndex - 1);
        const whenChar = whenText.substring(0, charIndex - 1);
        setDestinationPlaceholder(destChar);
        setWhenPlaceholder(whenChar);
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          destIndex = (destIndex + 1) % destinationTexts.length;
          whenIndex = (whenIndex + 1) % whenTexts.length;
          timeout = setTimeout(type, 400);
          return;
        }
      }
      timeout = setTimeout(type, isDeleting ? 50 : 100);
    };

    type();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, currentSlide < 5 ? 5000 : 2500);
    return () => clearInterval(timer);
  }, [currentSlide, totalSlides]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
      if (e.key === 'ArrowRight') setCurrentSlide((prev) => (prev + 1) % totalSlides);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlides]);

  useEffect(() => {
    let mounted = true;
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (!mounted) return;
        setLoading(true);
        fetchPackages({ limit: 6 })
          .then(({ packages: pkg, destinations: dest }) => {
            if (!mounted) return;
            const sorted = dest.slice().sort((a, b) => (b.packagesCount || 0) - (a.packagesCount || 0));
            setPackages(pkg);
            setDestinations(sorted);
          })
          .catch((err: Error) => {
            if (!mounted) return;
            setError(err.message || 'Failed to load travel data');
          })
          .finally(() => {
            if (mounted) setLoading(false);
          });
      });
    } else {
      setTimeout(() => {
        if (!mounted) return;
        setLoading(true);
        fetchPackages({ limit: 6 })
          .then(({ packages: pkg, destinations: dest }) => {
            if (!mounted) return;
            const sorted = dest.slice().sort((a, b) => (b.packagesCount || 0) - (a.packagesCount || 0));
            setPackages(pkg);
            setDestinations(sorted);
          })
          .catch((err: Error) => {
            if (!mounted) return;
            setError(err.message || 'Failed to load travel data');
          })
          .finally(() => {
            if (mounted) setLoading(false);
          });
      }, 0);
    }
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchRecentBookings(8)
      .then((bookingsData) => {
        if (!mounted) return;
        setBookings((bookingsData as RecentBooking[]) || []);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        console.error('Failed to fetch recent bookings:', err);
        setBookings([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const goToNextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const goToPrevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchFilters.destination) {
      params.append('destination', searchFilters.destination);
    }
    if (searchFilters.when) {
      params.append('month', searchFilters.when);
    }
    navigate(`/packages?${params.toString()}`);
  };

  const recentItems = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return [];
    }

    return bookings
      .map((booking, i) => {
        try {
          if (!booking.packageId) return null;

          const timeDiffSeconds = booking.createdAt
            ? Math.floor((Date.now() - new Date(booking.createdAt).getTime()) / 1000)
            : 0;

          let bookedAgoText = 'Just now';
          if (timeDiffSeconds < 1) {
            bookedAgoText = 'Just now';
          } else if (timeDiffSeconds < 60) {
            bookedAgoText = timeDiffSeconds === 1 ? '1 second' : `${timeDiffSeconds} seconds`;
          } else if (timeDiffSeconds < 3600) {
            const minutes = Math.floor(timeDiffSeconds / 60);
            bookedAgoText = minutes === 1 ? '1 minute' : `${minutes} minutes`;
          } else if (timeDiffSeconds < 86400) {
            const hours = Math.floor(timeDiffSeconds / 3600);
            bookedAgoText = hours === 1 ? '1 hour' : `${hours} hours`;
          } else if (timeDiffSeconds < 2592000) {
            const days = Math.floor(timeDiffSeconds / 86400);
            bookedAgoText = days === 1 ? '1 day' : `${days} days`;
          } else if (timeDiffSeconds < 31536000) {
            const months = Math.floor(timeDiffSeconds / 2592000);
            bookedAgoText = months === 1 ? '1 month' : `${months} months`;
          } else {
            const years = Math.floor(timeDiffSeconds / 31536000);
            bookedAgoText = years === 1 ? '1 year' : `${years} years`;
          }

          return {
            id: booking.packageId,
            packageName: booking.packageName,
            image: booking.packageCoverImage || '',
            duration:
              booking.packageDuration && booking.packageDuration > 0
                ? `${booking.packageDuration}D/${booking.packageDuration - 1}N`
                : '',
            price: booking.packagePrice,
            pax: booking.numberOfTravelers,
            bookedAgo: bookedAgoText,
            traveler: {
              name: booking.userName || `Traveler ${i + 1}`,
              from: booking.packageDestination,
            },
            slug: booking.packageSlug,
          };
        } catch (error) {
          console.error('Error mapping booking:', error, booking);
          return null;
        }
      })
      .filter((item) => item !== null);
  }, [bookings]);

  if (error && packages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-4">We couldn't load travel experiences</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const heroTitle = HERO_SLIDES[currentSlide % 4].title;
  const heroSubtitle = HERO_SLIDES[currentSlide % 4].subtitle;
  const heroWords = heroTitle.split(' ');
  const heroLastWord = heroWords.pop();
  const heroHeadline = (
    <>
      {heroWords.join(' ')}{' '}
      <span className="bg-gradient-to-r from-brand-accent-400 to-brand-400 bg-clip-text text-transparent">{heroLastWord}</span>
    </>
  );

  const searchControls = (
    <>
      <div className="lg:col-span-5 relative group">
        <label className="flex items-center text-sm sm:text-base font-semibold text-white mb-3">
          <InlineMapPin /> Where to?
        </label>
        <div className="relative">
          <select
            value={searchFilters.destination}
            onChange={(e) => setSearchFilters(p => ({ ...p, destination: e.target.value }))}
            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-100/80 border-2 border-gray-200 rounded-2xl text-gray-900 font-medium text-sm sm:text-base appearance-none cursor-pointer transition-all focus:border-brand-500 focus:bg-white focus:shadow-lg hover:border-gray-300"
          >
            <option value="" disabled hidden>{destinationPlaceholder || 'Select Destination'}</option>
            <optgroup label="🌏 Destinations">
              {destinations.slice(0, 30).map((d) => (
                <option key={d.id} value={d.name.toLowerCase()}>
                  {d.name} {d.packagesCount ? `(${d.packagesCount} packages)` : ''}
                </option>
              ))}
            </optgroup>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 relative group" ref={monthDropdownRef}>
        <label className="flex items-center text-sm sm:text-base font-semibold text-white mb-3">
          <InlineCalendar /> When?
        </label>
        <div className="relative">
          <button
            type="button"
            ref={monthButtonRef}
            onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-100/80 border-2 border-gray-200 rounded-2xl text-left text-gray-900 font-medium text-sm sm:text-base flex items-center justify-between transition-all focus:border-brand-500 focus:bg-white hover:border-gray-300"
          >
            <span>
              {searchFilters.when
                ? MONTHS.find(m => m.value === searchFilters.when)?.label || 'Any Month'
                : whenPlaceholder || 'Any Month'}
            </span>
            <svg className={`w-5 h-5 text-brand-800 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Month */}
          {monthDropdownOpen && dropdownPos && createPortal(
            <>
              <div
                className="fixed inset-0 z-dropdown"
                onClick={() => setMonthDropdownOpen(false)}
              />
              <div
                ref={dropdownPanelRef}
                className="absolute z-dropdown"
                style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
              >
                <div className="mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto">
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {MONTHS.map((month) => (
                      <button
                        key={month.value}
                        onClick={() => {
                          setSearchFilters(p => ({ ...p, when: month.value }));
                          setMonthDropdownOpen(false);
                        }}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-center ${searchFilters.when === month.value
                            ? 'bg-gradient-to-r from-brand-500 to-red-500 text-white shadow-lg'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                      >
                        {month.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>

      {/* Search button */}
      <div className="lg:col-span-3">
        <button
          onClick={handleSearch}
          className="w-full group relative overflow-hidden px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-brand-accent-400 to-brand-500 text-black rounded-2xl font-bold text-sm sm:text-base shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <span className="relative flex items-center justify-center space-x-2">
            <InlineSearch />
            <span>Search</span>
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen font-body">
      {/* HERO SECTION */}
      <div className="relative z-base h-[80vh] lg:h-[80vh] bg-brand-dark-950">
        <style>{`
          @media (min-width: 768px) and (max-width: 1024px) {
            .relative.h-\\[80vh\\] {
              height: 65vh;
            }
            button[aria-label="Previous"],
            button[aria-label="Next"] {
              display: none !important;
            }
            .relative.mt-16 {
              margin-top: 2rem;
            }
          }
        `}</style>
        {/* Media Slides — clipped to the hero's own box via a dedicated
            overflow-hidden wrapper (not the hero root itself), so the Ken
            Burns zoom stays contained without also clipping popups (e.g. the
            "When?" dropdown below) anchored to the hero's edge. */}
        <div className="absolute inset-0 overflow-hidden z-base">
          {[0, 1, 2, 3].map((i) => {
            const isActive = i === currentSlide;
            const item = HERO_MEDIA.find((m) => m.id === `v${i + 1}`);

            return (
              <div
                key={`media-${i}`}
                className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100 z-raised' : 'opacity-0 z-base'
                  }`}
              >
                {item && <HeroBackground item={item} isActive={isActive} eager={i === 0} />}

                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/20" />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            );
          })}
        </div>

        {/* Lush's headline is bottom-anchored and left-aligned (unlike generic's
            centered block), so it can grow upward into a vertically-centered
            arrow's band on longer slides — anchor Lush's arrows in the gap
            between the search bar top (137px) and the headline block's
            bottom edge (pushed to bottom-64/256px below, from bottom-44's
            176px, to make that gap wide enough for the arrow). */}
        <button onClick={goToPrevSlide} className={`absolute left-4 z-prominent bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 hidden md:flex ${isLushTheme ? 'bottom-40' : 'top-1/2 -translate-y-1/2'}`} aria-label="Previous">
          <InlineChevronLeft />
        </button>
        <button onClick={goToNextSlide} className={`absolute right-4 z-prominent bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 hidden md:flex ${isLushTheme ? 'bottom-40' : 'top-1/2 -translate-y-1/2'}`} aria-label="Next">
          <InlineChevronRight />
        </button>

        {/* Hero Content */}
        {isLushTheme ? (
          <>
            <div className="absolute bottom-64 left-0 max-w-2xl px-6 md:px-16 z-lifted">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-hero font-display text-white mb-4 sm:mb-5 md:mb-6 leading-tight lg:leading-[1.02]">
                {heroHeadline}
              </h1>
              <p className="text-lg sm:text-xl md:text-xl text-gray-200 leading-relaxed">{heroSubtitle}</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 w-full bg-brand-dark-950/70 backdrop-blur-md border-t border-white/10 z-lifted">
              <div className="max-w-7xl mx-auto pl-6 pr-20 md:pl-16 md:pr-24 2xl:px-16 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  {searchControls}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-lifted h-full flex flex-col items-center justify-start pt-28 md:pt-25 px-4">
            <div className="max-w-7xl text-center mx-auto">
              <div className="max-w-4xl">
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-5 md:mb-6 leading-tight font-display">
                  {heroHeadline}
                </h1>
                <p className="text-lg sm:text-xl md:text-xl text-gray-200 mb-6 sm:mb-7 md:mb-8 px-2 sm:px-0 leading-relaxed">{heroSubtitle}</p>

                {/* Search bar */}
                <div className="relative mt-16 md:mt-15 lg:mt-15">
                  <div className="bg-white/99 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/20 overflow-visible">
                    <div className="h-1 bg-gradient-to-r from-brand-accent-400 via-brand-500 to-red-500 animate-gradient-x" />
                    <div className="p-4 sm:p-5 overflow-visible">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                        {searchControls}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Stats />
      {isLushTheme && <SustainabilityStrip />}
      <AboutSection />

      {/* Deals of the Month */}
      {/* <section className="py-16 bg-white relative overflow-hidden font-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">Deals of the Month</h2>
            <p className="text-lg text-gray-600">Exclusive offers you won't find anywhere else</p>
          </div>
          <DealSlider deals={dealItems} />
        </div>
      </section> */}

      <RecentlyBookedSlider items={recentItems} />
      <DestinationsSection />
      <WhyChooseUs />
      {isLushTheme && <AIPlanningExplainer />}
      <FeaturedPackages packages={packages} />
      <TestimonialsSection />
      <FAQSection />
      <KeyPartnersSection />

      {/* CTA */}
      <section className={`py-12 relative overflow-hidden font-body ${isLushTheme ? 'bg-gradient-to-br from-brand-dark-950 via-brand-dark-900 to-brand-800' : 'bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950'}`}>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-50 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-92 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-raised">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight font-display">
              Ready to Explore<br className="hidden md:block" /> the World?
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-snug mb-6">
              Transform your travel dreams into reality with personalized itineraries crafted by our expert team
            </p>
          </div>
          <div className="w-full max-w-3xl mx-auto rounded-2xl py-2 px-0 lg:py-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link to="/planner" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-brand-accent-600 to-brand-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                Customize Your Trip <InlineArrowRight />
              </Link>
              <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transform hover:scale-105 transition-all duration-300">
                Still Have Questions?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
