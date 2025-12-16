import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Globe,
  Zap,
  Target,
  Crown,
  Award,
  Headphones,
  Gift,
  Plane,
} from 'lucide-react';
import DealSlider from './DealSlider';
import RecentlyBookedSlider from './RecentlyBookedSlider';
import DestinationsSection from './DestinationsSection';
import FeaturedPackages from './FeaturedPackages';
import WhyChooseUs from './WhyChooseUs';
import TestimonialsSection from './TestimonialsSection';
import FAQSection from './FAQ';
import KeyPartnersSection from './KeyPartners';
import { fetchPackages } from '../../utils/packageApi';
import { fetchRecentBookings } from '../../utils/bookingApi';
import { formatCurrency } from '../../utils/currency';
import Stats from './Stats';
import AboutSection from './AboutSection';

const heroSlides = [
  { title: 'Discover Your Dream Destination', subtitle: 'Explore the world with our curated travel experiences' },
  { title: 'Experience the World Differently', subtitle: 'Discover hidden gems and authentic adventures beyond the ordinary' },
  { title: 'Create Your Perfect Getaway', subtitle: 'Customize every moment of your trip with our tailor-made packages' },
  { title: 'Unforgettable Adventures Await', subtitle: 'Book your dream vacation with exclusive deals and offers' },
];

const BANNER_IMAGES = [
  'https://i.postimg.cc/k4MRXkFx/maldives-3793871_1280.jpg',
  'https://i.postimg.cc/8CYsNjcV/pexels-asadphoto-3426880.jpg',
];

const MONTHS = [
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' },
];

export default function Home() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [localDestinations, setLocalDestinations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 5;

  // Search
  const [searchFilters, setSearchFilters] = useState({ destination: '', when: '' });
  const destinationTexts = ['Select Destination', 'Choose Your Dream Place', 'Where To Go?', 'Pick A Location'];
  const whenTexts = ['Any Month', 'When Are You Traveling?', 'Pick a Month', 'Choose Travel Date'];

  const [destinationPlaceholder, setDestinationPlaceholder] = useState('');
  const [whenPlaceholder, setWhenPlaceholder] = useState('');
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target)) {
        setMonthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let destIndex = 0;
    let whenIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout;

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
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, currentSlide < 5 ? 5000 : 2500);
    return () => clearInterval(timer);
  }, [currentSlide, totalSlides]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
      if (e.key === 'ArrowRight') setCurrentSlide((prev) => (prev + 1) % totalSlides);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlides]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPackages({ limit: 100 })
      .then(({ packages: pkg, destinations: dest }) => {
        if (!mounted) return;
        const sorted = dest.slice().sort((a, b) => (b.packagesCount || 0) - (a.packagesCount || 0));
        setPackages(pkg);
        setDestinations(sorted.filter((d) => d.type !== 'domestic'));
        setLocalDestinations(sorted.filter((d) => d.type === 'domestic'));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load travel data');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchRecentBookings(8)
      .then((bookingsData) => {
        if (!mounted) return;
        console.log('Fetched bookings:', bookingsData);
        setBookings(bookingsData || []);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to fetch recent bookings:', err);
        setBookings([]);
      });
    return () => (mounted = false);
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

  const dealItems = useMemo(() => packages.slice(0, 6).map((pkg) => ({
    id: pkg.id,
    destination: pkg.destination?.name || pkg.title,
    subtitle: pkg.category ? `${pkg.category.charAt(0).toUpperCase()}${pkg.category.slice(1)} experience` : 'Limited-time offer',
    image: pkg.image_url || pkg.images?.[0],
    originalPrice: Math.round(pkg.price_from * 1.2),
    discountPrice: pkg.price_from,
    discount: Math.round(Math.random() * 30 + 20),
    duration: pkg.duration_days ? `${pkg.duration_days} Days / ${pkg.duration_days - 1} Nights` : '',
    inclusions: pkg.inclusions?.slice(0, 4) || ['Personalized planning', 'Support throughout', 'Curated experiences', 'Flexible payments'],
    validUntil: 'December 31, 2025',
    savings: Math.round(pkg.price_from * 0.3),
    slug: pkg.slug,
  })), [packages]);

  const recentItems = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return [];
    }
    
    return bookings.map((booking, i) => {
      try {
        const pkg = booking.package;
        if (!pkg) return null;
        
        const timeDiffSeconds = booking.createdAt 
          ? Math.floor((new Date() - new Date(booking.createdAt)) / 1000) 
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
          id: pkg._id,
          packageName: pkg.name,
          image: pkg.images && pkg.images[0] && pkg.images[0].url ? pkg.images[0].url : '',
          duration: `${pkg.duration}D/${pkg.duration - 1}N`,
          price: pkg.price,
          pax: booking.numberOfTravelers,
          bookedAgo: bookedAgoText,
          traveler: { 
            name: booking.user?.name || `Traveler ${i + 1}`, 
            from: pkg.destination 
          },
          slug: pkg.slug,
        };
      } catch (error) {
        console.error('Error mapping booking:', error, booking);
        return null;
      }
    }).filter(item => item !== null);
  }, [bookings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-4">We couldn't load travel experiences</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen with-fixed-header font-opensans">
      {/* HERO SECTION */}
      <div className="relative h-[80vh] lg:h-[83vh] bg-black">
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-sm border-t border-white/10 overflow-hidden">
          <style>{`
            @keyframes scroll-left {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-100%);
              }
            }
            .animate-scroll-continuous {
              animation: scroll-left 20s linear infinite;
            }
            .animate-scroll-continuous:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="flex animate-scroll-continuous whitespace-nowrap py-5">
            {/* Tags */}
            <div className="flex items-center">
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Globe className="w-5 h-5 text-orange-400 flex-shrink-0" /> Explore 100+ Destinations
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Zap className="w-5 h-5 text-orange-400 flex-shrink-0" /> Exclusive Deals Up to 40% Off
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Target className="w-5 h-5 text-orange-400 flex-shrink-0" /> Personalized Itineraries
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Crown className="w-5 h-5 text-orange-400 flex-shrink-0" /> Premium Travel Experiences
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Award className="w-5 h-5 text-orange-400 flex-shrink-0" /> Award-Winning Service
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Headphones className="w-5 h-5 text-orange-400 flex-shrink-0" /> 24/7 Customer Support
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Gift className="w-5 h-5 text-orange-400 flex-shrink-0" /> Special Group Discounts
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Plane className="w-5 h-5 text-orange-400 flex-shrink-0" /> Hassle-Free Bookings
              </span>
            </div>
            {/* Duplicate set */}
            <div className="flex items-center">
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Globe className="w-5 h-5 text-orange-400 flex-shrink-0" /> Explore 100+ Destinations
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Zap className="w-5 h-5 text-orange-400 flex-shrink-0" /> Exclusive Deals Up to 40% Off
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Target className="w-5 h-5 text-orange-400 flex-shrink-0" /> Personalized Itineraries
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Crown className="w-5 h-5 text-orange-400 flex-shrink-0" /> Premium Travel Experiences
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Award className="w-5 h-5 text-orange-400 flex-shrink-0" /> Award-Winning Service
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Headphones className="w-5 h-5 text-orange-400 flex-shrink-0" /> 24/7 Customer Support
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Gift className="w-5 h-5 text-orange-400 flex-shrink-0" /> Special Group Discounts
              </span>
              <span className="inline-flex items-center px-6 text-white/90 font-medium text-md gap-2">
                <Plane className="w-5 h-5 text-orange-400 flex-shrink-0" /> Hassle-Free Bookings
              </span>
            </div>
          </div>
        </div>       
         {/* Video Slides */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={`video-${i}`}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <video className="absolute inset-0 w-full h-full object-cover" src={`/v${i + 1}.mp4`} autoPlay muted loop playsInline />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/20" />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        ))}

        {/* Image Slides */}
        {/* <div className="absolute inset-0">
          {BANNER_IMAGES.map((img, i) => {
            const idx = i + 5;
            const active = idx === currentSlide;
            const next = idx === (currentSlide + 1) % totalSlides;
            const prev = idx === (currentSlide - 1 + totalSlides) % totalSlides;
            return (
              <div
                key={`banner-${i}`}
                className={`absolute inset-0 transition-all duration-700 ease-in-out ${active ? 'translate-x-0 opacity-100 z-10' : next ? 'translate-x-full opacity-100 z-5' : prev ? '-translate-x-full opacity-100 z-5' : 'translate-x-full opacity-0 z-0'}`}
              >
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${img})` }} />
                <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/50 to-black/10" />
              </div>
            );
          })}
        </div> */}

        <button onClick={goToPrevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 hidden md:flex" aria-label="Previous">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={goToNextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 hidden md:flex" aria-label="Next">
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Hero Content */}
      <div className="relative z-30 h-full flex flex-col items-center justify-start pt-28 md:pt-25 px-4">          
        <div className="max-w-7xl text-center mx-auto">
            <div className="max-w-4xl">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-5 md:mb-6 leading-tight font-poppins">
                {(() => {
                  const { title } = heroSlides[currentSlide % 4];
                  const words = title.split(' ');
                  const last = words.pop();
                  return (
                    <>
                      {words.join(' ')}{' '}
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">{last}</span>
                    </>
                  );
                })()}
              </h1>
              <p className="text-lg sm:text-xl md:text-xl text-gray-200 mb-6 sm:mb-7 md:mb-8 px-2 sm:px-0 leading-relaxed">{heroSlides[currentSlide % 4].subtitle}</p>             

              {/* Search bar */}
              <div className="relative mt-12 md:mt-15 lg:mt-15">
                <div className="bg-white/99 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/20 overflow-visible">
                  <div className="h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-gradient-x" />
                  <div className="p-4 sm:p-5 overflow-visible">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                      <div className="lg:col-span-5 relative group">
                        <label className="flex items-center text-sm sm:text-base font-semibold text-white mb-3">
                          <MapPin className="w-4 h-4 mr-2 text-white" /> Where to?
                        </label>
                        <div className="relative">
                          <select
                            value={searchFilters.destination}
                            onChange={(e) => setSearchFilters(p => ({ ...p, destination: e.target.value }))}
                            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-100/80 border-2 border-gray-200 rounded-2xl text-gray-900 font-medium text-sm sm:text-base appearance-none cursor-pointer transition-all focus:border-orange-500 focus:bg-white focus:shadow-lg hover:border-gray-300"
                          >
                            <option value="" disabled hidden>{destinationPlaceholder || 'Select Destination'}</option>
                            <optgroup label="🌏 International Destinations">
                              {destinations.slice(0, 30).map((d) => (
                                <option key={d.id} value={d.name.toLowerCase()}>
                                  {d.name} {d.packagesCount ? `(${d.packagesCount} packages)` : ''}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="🏠 Domestic Destinations">
                              {localDestinations.slice(0, 20).map((d) => (
                                <option key={d.id} value={d.name.toLowerCase()}>
                                  {d.name} {d.packagesCount ? `(${d.packagesCount} packages)` : ''}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-4 relative group" ref={monthDropdownRef}>
                        <label className="flex items-center text-sm sm:text-base font-semibold text-white mb-3">
                          <Calendar className="w-4 h-4 mr-2 text-white" /> When?
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
                            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-100/80 border-2 border-gray-200 rounded-2xl text-left text-gray-900 font-medium text-sm sm:text-base flex items-center justify-between transition-all focus:border-orange-500 focus:bg-white hover:border-gray-300"
                          >
                            <span>
                              {searchFilters.when
                                ? MONTHS.find(m => m.value === searchFilters.when)?.label || 'Any Month'
                                : whenPlaceholder || 'Any Month'}
                            </span>
                            <svg className={`w-5 h-5 text-orange-800 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Month */}
                          {monthDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-[9998]" 
                                onClick={() => setMonthDropdownOpen(false)}
                              />
                              {/* Dropdown */}
                              <div className="fixed z-[9999] mt-2 w-screen left-1/2 -translate-x-1/2 md:w-96 md:absolute md:left-0 md:translate-x-0 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto">
                                <div className="p-4 grid grid-cols-3 gap-3">
                                  {MONTHS.map((month) => (
                                    <button
                                      key={month.value}
                                      onClick={() => {
                                        setSearchFilters(p => ({ ...p, when: month.value }));
                                        setMonthDropdownOpen(false);
                                      }}
                                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-center ${
                                        searchFilters.when === month.value
                                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                      }`}
                                    >
                                      {month.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Search button */}
                      <div className="lg:col-span-3">
                        <button
                          onClick={handleSearch}
                          className="w-full group relative overflow-hidden px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-2xl font-bold text-sm sm:text-base shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                        >
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                          <span className="relative flex items-center justify-center space-x-2">
                            <Search className="w-5 h-5" />
                            <span>Search</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Stats/>
      <AboutSection />

      {/* Deals of the Month */}
      {/* <section className="py-16 bg-white relative overflow-hidden font-opensans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">Deals of the Month</h2>
            <p className="text-lg text-gray-600">Exclusive offers you won't find anywhere else</p>
          </div>
          <DealSlider deals={dealItems} />
        </div>
      </section> */}

      <RecentlyBookedSlider items={recentItems} />
      <DestinationsSection destinations={destinations} localDestinations={localDestinations} />
      <WhyChooseUs />
      <FeaturedPackages packages={packages} />
      <TestimonialsSection />
      <FAQSection />
      <KeyPartnersSection />

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 relative overflow-hidden font-opensans">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-50 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-92 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight font-poppins">
              Ready to Explore<br className="hidden md:block" /> the World?
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-snug mb-6">
              Transform your travel dreams into reality with personalized itineraries crafted by our expert team
            </p>
          </div>
          <div className="w-full max-w-3xl mx-auto rounded-2xl py-2 px-0 lg:py-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link to="/planner" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                Customize Your Trip <ArrowRight className="ml-3 w-5 h-5" />
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