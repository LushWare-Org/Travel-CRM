import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Star, User } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function RecentlyBookedSlider({ items = [] }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);

  const getCardsPerView = () => {
    if (typeof window === 'undefined') return 5;
    if (window.innerWidth < 640) return 1; 
    if (window.innerWidth < 768) return 2; 
    if (window.innerWidth < 1280) return 4;  
    return 4; 
  };

  const cardsPerView = getCardsPerView();
  const totalSlides = Math.max(items.length, 1);
  const extendedItems = items.length > 0 ? [...items, ...items] : [];

  // Auto-play
  useEffect(() => {
    if (totalSlides <= cardsPerView) return;

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

  const formatDurationString = (value) => {
    if (!value) return '';
    const dn = value.match(/(\d+)\s*[Dd]\s*\/\s*(\d+)\s*[Nn]/i);
    if (dn) return `${dn[1]} Days / ${dn[2]} Nights`;
    const days = value.match(/(\d+)\s*[Dd]ays?/i);
    const nights = value.match(/(\d+)\s*[Nn]ights?/i);
    if (days && nights) return `${days[1]} Days / ${nights[1]} Nights`;
    return value;
  };

  if (!items.length) {
    return (
      <section className="py-16 bg-gray-50 font-poppins">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Where Our Travelers Are Heading Next
            </h2>
            <p className="text-lg text-gray-600">
              Discover the most recent bookings - get inspired for your next journey
            </p>
          </div>
          <div className="text-center py-12 text-gray-600 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <p>No recent bookings available yet.</p>
          </div>
        </div>
      </section>
    );
  }

  const showControls = totalSlides > cardsPerView;
  const translateX = -(slideIdx * (100 / cardsPerView));

  return (
    <section className="py-16 bg-[#051C35] relative overflow-hidden font-opensans">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Recently Booked Itineraries
          </h2>
          <p className="text-lg text-white">
            Discover the most recent bookings - get inspired for your next journey
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="hidden md:flex absolute -top-12 right-0 gap-3 z-10">
            <button
              onClick={goPrev}
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all border-2 border-white hover:border-yellow-500"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={goNext}
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all border-2 border-white hover:border-yellow-500"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl">
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
                    <Link
                      to={`/package/${item.id}`}
                      className="group block bg-white rounded-2xl border-2 border-gray-300 hover:border-yellow-500 hover:shadow-2xl transition-all duration-300 h-full overflow-hidden"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                       <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
                        <img
                          src={item.image}
                          alt={item.packageName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        
                        <div className="absolute top-3 right-3">
                          <span className="bg-gray-200 border px-2 py-1 rounded-full text-xs font-semibold text-black">
                            {item.bookedAgo} ago
                          </span>
                        </div>
                        
                        <div className="absolute bottom-3 left-4 flex items-center gap-3 text-white">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{travelerName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors line-clamp-2">
                          {item.packageName}
                        </h3>

                        <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-yellow-500" />
                              <span>{formatDurationString(item.duration)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <span className="text-xl font-bold text-orange-600">
                            {formatCurrency(item.price)}
                          </span>
                          <button className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg transition-all">
                            View Details
                          </button>
                        </div>
                      </div>
                    </Link>
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