import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function RecentlyBookedSlider({ items = [] }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const getCardsPerView = () => {
    if (windowWidth < 640) return 1;
    if (windowWidth < 1024) return 2; 
    return 5; 
  };
  
  const cardsPerView = Math.min(getCardsPerView(), Math.max(items.length, 1));
  const total = Math.max(items.length, 1);
  const combined = items.length > 0 ? [...items, ...items] : items;
  
  if (!items.length) {
    return (
      <section className="py-16 bg-[#001d3d] relative overflow-hidden font-opensans">
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl"></div>
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-poppins">
              Recently Booked Itineraries
            </h2>
            <p className="text-lg text-white max-w-2xl mx-auto">
              Real travelers, real bookings - happening right now
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">Loading recent bookings...</p>
          </div>
        </div>
      </section>
    );
  }
  useEffect(() => {
    if (total <= 1) {
      setEnableTransition(false);
      setSlideIdx(0);
      return;
    }

    setEnableTransition(false);
    setSlideIdx(0);
    animatingRef.current = false;
    requestAnimationFrame(() => requestAnimationFrame(() => setEnableTransition(true)));

    const id = setInterval(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setEnableTransition(true);
      setSlideIdx((i) => i + 1);
    }, 3000); 
    return () => clearInterval(id);
  }, [total, cardsPerView, windowWidth]);

  // Infinite loop reset
  const onTransitionEnd = () => {
    if (slideIdx >= total) {
      setEnableTransition(false);
      setSlideIdx(slideIdx - total);
      animatingRef.current = false;
      requestAnimationFrame(() => requestAnimationFrame(() => setEnableTransition(true)));
    } else {
      animatingRef.current = false;
    }
  };

  const goPrev = () => {
    if (total <= 1) return; 
    setEnableTransition(true);
    animatingRef.current = true;
    setSlideIdx((i) => (i <= 0 ? total - 1 : i - 1));
  };

  const goNext = () => {
    if (total <= 1) return; 
    setEnableTransition(true);
    animatingRef.current = true;
    setSlideIdx((i) => i + 1);
  };

  const widthPct = 100 / cardsPerView; // 20% for 5 cards
  const showControls = total > 1; 

  const formatDurationString = (value) => {
    if (!value) return '';
    const dn = value.match(/(\d+)\s*[Dd]\s*\/\s*(\d+)\s*[Nn]/);
    if (dn) return `${dn[1]} Days / ${dn[2]} Nights`;
    const d = value.match(/(\d+)\s*[Dd]/);
    const n = value.match(/(\d+)\s*[Nn]/);
    if (d && n) return `${d[1]} Days / ${n[1]} Nights`;
    if (/days|day|nights|night/i.test(value)) return value;
    return value;
  };

  return (
    <section className="py-16 bg-[#001d3d] relative overflow-hidden font-opensans">
      <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl"></div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3 font-poppins">
            Recently Booked Itineraries
          </h2>
          <p className="text-base md:text-lg text-white max-w-2xl mx-auto">
            Real travelers, real bookings - happening right now
          </p>
        </div>

        <div className="relative w-full">
          {/* Slider Track */}
          <div className="overflow-hidden w-full">
            <div
              onTransitionEnd={onTransitionEnd}
              className={`flex gap-2 md:gap-3 ${enableTransition ? 'transition-transform duration-700 ease-in-out' : ''}`}
              style={{ transform: `translateX(-${slideIdx * (100 / cardsPerView)}%)` }}
            >
              {combined.map((item, idx) => {
                const travelerName = item.traveler?.name || 'Traveler';
                const travelerFrom = item.traveler?.from || 'Worldwide';
                const travelerInitial = travelerName.charAt(0);

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex-shrink-0 px-1.5 md:px-3"
                    style={{ width: `${100 / cardsPerView}%` }} 
                  >
                    <div className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full border border-gray-100">
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>

                     <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.packageName}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          <div className="absolute top-4 right-4">
                          <div className="bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                            {item.bookedAgo}
                          </div>
                        </div>

                        {/* Traveler Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 group-hover:bg-white/20 transition-colors duration-300">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                              <span className="text-white font-bold text-xs">{travelerInitial}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold truncate">{travelerName}</p>
                              <p className="text-white/80 text-xs truncate">from {travelerFrom}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white">
                        <h3 className="text-[#001d3d] font-bold text-lg mb-3 line-clamp-2 leading-tight font-poppins group-hover:text-orange-600 transition-colors duration-300">
                          {item.packageName}
                        </h3>
                        <div className="text-sm text-gray-600 mb-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors duration-300" />
                            <span className="font-medium whitespace-nowrap">{formatDurationString(item.duration)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent font-poppins group-hover:scale-105 transition-transform duration-300">
                            {formatCurrency(item.price)}
                          </div>
                        </div>

                        <div>
                          <Link
                            to={item.slug ? `/package/${item.slug}` : `/package/${item.id}`}
                            className="w-full block text-center bg-gradient-to-r from-orange-600 to-yellow-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 hover:shadow-orange-500/50"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {showControls && (
            <div className="absolute -top-16 right-0 z-20 hidden md:flex items-center gap-3">
              <button
                onClick={goPrev}
                className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 bg-white border-2 border-white hover:border-orange-500 group"
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700 group-hover:text-orange-500 transition-colors duration-300" />
              </button>
              <button
                onClick={goNext}
                className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 bg-white border-2 border-white hover:border-orange-500 group"
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6 text-gray-700 group-hover:text-orange-500 transition-colors duration-300" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}