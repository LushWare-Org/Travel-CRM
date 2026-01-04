import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchPackages } from '../../utils/packageApi';
import { formatCurrency } from '../../utils/currency';

const ALL_STATS = [
  {
    value: 11000,
    suffix: '+',
    label: 'Happy Customers'
  },
  {
    value: 100,
    suffix: '%',
    label: 'Easy Booking'
  },
  {
    value: 100,
    suffix: '%',
    label: 'Satisfaction'
  },
  {
    value: 100,
    suffix: '%',
    label: 'Your Assurance'
  },
  {
    value: 100,
    suffix: '+',
    label: 'Best Price & Experience'
  },
  {
    value: 24,
    suffix: '/7',
    label: 'On-Trip Support'
  },
];

export default function RecommendedPackagesSection() {
  const navigate = useNavigate();
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [categoryPackages, setCategoryPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchPackages({ limit: 100 })
      .then(({ packages }) => {
        if (!isMounted) return;
        const grouped = {};
        packages.forEach(pkg => {
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
          
          const getShortDescription = (description) => {
            if (!description) return '';
            const words = description.split(' ').slice(0, 5).join(' ');
            return words.length < description.length ? `${words}...` : words;
          };
          
          return {
            id: lowestPricePackage.id,
            title: `${category} Packages`,
            categoryName: category,
            image: lowestPricePackage.image_url || lowestPricePackage.images?.[0],
            price: lowestPricePackage.price_from,
            slug: lowestPricePackage.slug,
            description: getShortDescription(lowestPricePackage.description),
          };
        }).slice(0, 6); 
        setCategoryPackages(categoryList);
        setLoading(false);
      })
      .catch((err) => {
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
      setCurrentStatIndex((prev) => prev + 1);
      setCurrentSlide((prev) => (prev + 1) % categoryPackages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [categoryPackages.length]);

  const nextSlide = () => {
    if (isAnimating || categoryPackages.length === 0) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % categoryPackages.length);
    setCurrentStatIndex((prev) => prev + 1);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const prevSlide = () => {
    if (isAnimating || categoryPackages.length === 0) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev - 1 + categoryPackages.length) % categoryPackages.length);
    setCurrentStatIndex((prev) => prev - 1);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handlePackageClick = (categoryName) => {
    navigate(`/packages?category=${encodeURIComponent(categoryName.toLowerCase())}`);
  };

  const getVisiblePackages = () => {
    if (categoryPackages.length === 0) return [];
    const packages = [];
    for (let i = 0; i < 4; i++) {
      packages.push(categoryPackages[(currentSlide + i) % categoryPackages.length]);
    }
    return packages;
  };
  const allStatsExtended = [];
  for (let i = 0; i < 100; i++) {
    allStatsExtended.push(...ALL_STATS);
  }

  return (
    <section className="stats-section py-10 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 items-start">
           {/* <div className="lg:col-span-4 space-y-8 lg:ml-9">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 font-poppins leading-tight">
              Excellence in 
              <span className="block mt-2 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Every Journey
              </span>
            </h2>
            
            <div className="space-y-8">
              {[0, 1, 2].map((offset) => {
                const displayIndex = currentStatIndex + offset;
                return (
                  <div key={offset} className="h-[70px] flex items-center group">
                    <div className="flex items-start gap-6 w-full p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-orange-300">
                      <div className="flex items-center gap-0">
                        <div className="relative h-12 overflow-hidden inline-block">
                          <div 
                            className="transition-transform duration-1000 ease-in-out"
                            style={{ 
                              transform: `translateY(-${displayIndex * 3}rem)`,
                            }}
                          >
                            {allStatsExtended.map((stat, index) => (
                              <div key={index} className="h-12 flex items-center">
                                <span className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent leading-none">
                                  {stat.value.toLocaleString()}{stat.suffix}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative h-12 overflow-hidden flex-1">
                        <div 
                          className="transition-transform duration-1000 ease-in-out"
                          style={{ 
                            transform: `translateY(-${displayIndex * 3}rem)`,
                          }}
                        >
                          {allStatsExtended.map((stat, index) => (
                            <div key={index} className="h-12 flex items-center">
                              <p className="text-lg font-semibold text-gray-700">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div> */}

          {/* Right Side */}
          <div className="lg:col-span-8 relative">
            <div className="mb-6">
              <div className="mb-12 text-center">
                <h2 className="text-4xl font-bold text-gray-900 font-poppins mb-4">
                  Discover Your Perfect Holiday
                </h2>
              <p className="text-lg text-gray-600 md-2">From relaxing escapes to thrilling adventures - find your ideal trip here.</p>
            </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
              </div>
            ) : categoryPackages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No packages available at the moment.</p>
              </div>
            ) : (
              <div className="relative overflow-hidden">

            {/* Carousel Container */}
            <div className="overflow-hidden">
              <div className="flex gap-4 transition-transform duration-1000 ease-in-out relative">
                <button
                  onClick={prevSlide}
                  disabled={isAnimating}
                  className="absolute left-0 top-1/3 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={isAnimating}
                  className="absolute right-0 top-1/3 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50"
                  aria-label="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                {getVisiblePackages().map((pkg, index) => {
                  return (
                    <div
                      key={`${pkg.id}-${currentSlide}-${index}`}
                      className="flex-shrink-0 w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] cursor-pointer"
                      onClick={() => handlePackageClick(pkg.categoryName)}
                    >
                      <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-orange-100 group h-full flex flex-col">
                        <div className="relative h-56 overflow-hidden flex-shrink-0">
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
                          <img
                            src={pkg.image}
                            alt={pkg.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            placeholderClassName="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="text-xl font-bold text-gray-900 mb-3">
                            {pkg.categoryName.charAt(0).toUpperCase() + pkg.categoryName.slice(1)} Packages
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
                            {pkg.description}
                          </p>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                            <span className="text-sm text-gray-600">Starting from</span>
                            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                              ₹ {pkg.price?.toLocaleString() || '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}