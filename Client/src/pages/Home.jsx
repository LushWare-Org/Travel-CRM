import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Star, TrendingUp, Heart, Users, Calendar, Search, ArrowRight, CheckCircle, Quote, Globe, Shield, ChevronRight, ChevronDown, Check, Play, ChevronLeft, Sparkles, CreditCard, Plane, FileText, Wallet } from 'lucide-react';
import FAQSection from './Landing/FAQ';
import KeyPartnersSection from './Landing/KeyPartners';
import { mockDestinations as dataDestinations, mockPackages as dataPackages } from '../data/mockData';

const experiences = [
  { title: 'Adventure Tours', count: '1,200+', color: 'from-orange-500 to-red-500' },
  { title: 'Beach Holidays', count: '950+', color: 'from-cyan-500 to-blue-500' },
  { title: 'Cultural Trips', count: '800+', color: 'from-purple-500 to-pink-500' },
  { title: 'Luxury Escapes', count: '600+', color: 'from-amber-500 to-yellow-500' }
];

const mockDestinations = dataDestinations || [];
const mockLocalDestinations = mockDestinations.filter(d => d.country === 'India' || d.region === 'India' || d.state);
const mockPackages = (dataPackages || []).map(p => ({ ...p, destination: mockDestinations.find(d => d.id === p.destination_id) }));

const testimonials = [
  { name: 'Sarah Johnson', location: 'New York', rating: 5, text: 'Absolutely wonderful experience! The trip was perfectly planned and exceeded all expectations.' },
  { name: 'Michael Chen', location: 'Singapore', rating: 5, text: 'Best travel platform I have used. Customer service was exceptional throughout our journey.' },
  { name: 'Emma Williams', location: 'London', rating: 5, text: 'Highly recommend! Made our honeymoon planning stress-free and magical.' }
];

const regions = [
  { id: 'asia', label: 'Asia', gradient: 'from-red-500 to-orange-500' },
  { id: 'europe', label: 'Europe', gradient: 'from-blue-500 to-purple-500' },
  { id: 'middle-east', label: 'Middle East', gradient: 'from-amber-500 to-yellow-500' },
  { id: 'oceania', label: 'Oceania', gradient: 'from-cyan-500 to-blue-500' }
];

const heroSlides = [
  { image: 'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg', title: 'Discover Your Dream Destination', subtitle: 'Explore the world with our curated travel experiences' },
  { image: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg', title: 'Experience the World Differently', subtitle: 'Discover hidden gems and authentic adventures beyond the ordinary' },
  { image: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg', title: 'Create Your Perfect Getaway', subtitle: 'Customize every moment of your trip with our tailor-made packages' },
];

const slugify = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const dealData = [
  { destination: 'Maldives Paradise', subtitle: 'Overwater Villa Experience', image: 'https://i.postimg.cc/vHSsVM8W/pexels-photo-3155666.jpg', originalPrice: 3499, discountPrice: 2299, discount: 34, duration: '7 Days / 6 Nights', inclusions: ['5-Star Resort', 'All Meals', 'Spa Access', 'Water Sports'], validUntil: 'December 31, 2025', savings: 1200 },
  { destination: 'Swiss Alps Adventure', subtitle: 'Mountain Luxury Retreat', image: 'https://i.postimg.cc/7ZgJsCTT/pexels-photo-2662116.jpg', originalPrice: 4299, discountPrice: 2999, discount: 30, duration: '8 Days / 7 Nights', inclusions: ['Luxury Chalet', 'Ski Passes', 'Mountain Guides', 'Gourmet Dining'], validUntil: 'December 31, 2025', savings: 1300 },
  { destination: 'Santorini Escape', subtitle: 'Romantic Sunset Villa', image: 'https://i.postimg.cc/tCd6qS95/pexels-photo-1285625.jpg', originalPrice: 2999, discountPrice: 1999, discount: 33, duration: '6 Days / 5 Nights', inclusions: ['Cave Suite', 'Wine Tours', 'Private Cruise', 'Breakfast'], validUntil: 'December 31, 2025', savings: 1000 },
];

const recentItineraries = [
  {
    id: 1,
    packageName: 'Overwater Honeymoon',
    location: 'Maldives',
    image: 'https://i.postimg.cc/vHSsVM8W/pexels-photo-3155666.jpg',
    duration: '7D/6N',
    price: 2999,
    pax: 2,
    bookedAgo: '2 hours ago',
    traveler: { name: 'Sarah Johnson', from: 'New York, USA' },
  },
  {
    id: 2,
    packageName: 'Swiss Alps Ski & Stay',
    location: 'Switzerland',
    image: 'https://i.postimg.cc/7ZgJsCTT/pexels-photo-2662116.jpg',
    duration: '8D/7N',
    price: 3499,
    pax: 2,
    bookedAgo: '5 hours ago',
    traveler: { name: 'Michael Chen', from: 'Singapore' },
  },
  {
    id: 3,
    packageName: 'Bali Cultural Retreat',
    location: 'Indonesia',
    image: 'https://i.postimg.cc/vmrk3dyn/pexels-photo-2166559.jpg',
    duration: '6D/5N',
    price: 1899,
    pax: 1,
    bookedAgo: '8 hours ago',
    traveler: { name: 'Emma Williams', from: 'London, UK' },
  },
  {
    id: 4,
    packageName: 'Santorini Sunset Villa',
    location: 'Greece',
    image: 'https://i.postimg.cc/tCd6qS95/pexels-photo-1285625.jpg',
    duration: '5D/4N',
    price: 2499,
    pax: 2,
    bookedAgo: '12 hours ago',
    traveler: { name: 'Raj Patel', from: 'Mumbai, India' },
  },
  {
    id: 5,
    packageName: 'Dubai Desert & City Luxe',
    location: 'UAE',
    image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
    duration: '5D/4N',
    price: 2799,
    pax: 1,
    bookedAgo: '1 hour ago',
    traveler: { name: 'Lisa Anderson', from: 'Sydney, Australia' },
  },
  {
    id: 6,
    packageName: 'Thailand Island Hopper',
    location: 'Thailand',
    image: 'https://i.postimg.cc/yxmz4zh3/pexels-photo-1007426.jpg',
    duration: '7D/6N',
    price: 899,
    pax: 3,
    bookedAgo: '3 hours ago',
    traveler: { name: 'David Martinez', from: 'Toronto, Canada' },
  },
];

function RecentlyBookedSlider() {
  const total = recentItineraries.length;
  const cardsPerView = 4;
  const combined = [...recentItineraries, ...recentItineraries];
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (total < cardsPerView) return;
    setEnableTransition(false);
    setSlideIdx(0);
    animatingRef.current = false;
    requestAnimationFrame(() => requestAnimationFrame(() => setEnableTransition(true)));
    const id = setInterval(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setEnableTransition(true);
      setSlideIdx((i) => i + 1);
    }, 4000);
    return () => clearInterval(id);
  }, [total]);

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
    setEnableTransition(true);
    animatingRef.current = true;
    setSlideIdx((i) => (i <= 0 ? total - 1 : i - 1));
  };

  const goNext = () => {
    setEnableTransition(true);
    animatingRef.current = true;
    setSlideIdx((i) => i + 1);
  };

  const widthPct = 100 / cardsPerView;

  const formatDurationString = (s) => {
    if (!s) return '';
    const dn = s.match(/(\d+)\s*[Dd]\s*\/\s*(\d+)\s*[Nn]/);
    if (dn) return `${dn[1]} Days / ${dn[2]} Nights`;
    const d = s.match(/(\d+)\s*[Dd]/);
    const n = s.match(/(\d+)\s*[Nn]/);
    if (d && n) return `${d[1]} Days / ${n[1]} Nights`;
    if (/days|day|nights|night/i.test(s)) return s;
    return s;
  };

  return (
    <section className="py-16 bg-[#001d3d] relative overflow-hidden font-opensans">
      <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-poppins">
            Recently Booked Itineraries
          </h2>
          <p className="text-lg text-white max-w-2xl mx-auto">
            Real travelers, real bookings — happening right now
          </p>
        </div>
        <div className="relative">
          <button onClick={goPrev} className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all duration-300 border border-gray-200">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button onClick={goNext} className="absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all duration-300 border border-gray-200">
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>
          <div className="overflow-hidden">
            <div onTransitionEnd={onTransitionEnd} className={`flex ${enableTransition ? 'transition-transform duration-700 ease-in-out' : ''}`} style={{ transform: `translateX(-${slideIdx * widthPct}%)` }}>
              {combined.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex-shrink-0 px-3" style={{ width: `${widthPct}%` }}>
                  <div className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full border border-gray-100">
                    <div className="relative h-64 overflow-hidden">
                      <img src={item.image} alt={item.packageName} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#001d3d]/80 via-[#001d3d]/40 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          {item.bookedAgo}
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-lg px-3 py-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs">{item.traveler.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{item.traveler.name}</p>
                            <p className="text-white/80 text-xs truncate">from {item.traveler.from}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div className="sm:pr-4 flex-1 min-w-0">
                          <h3 className="text-[#001d3d] font-bold text-lg mb-3 line-clamp-2 leading-tight font-poppins">{item.packageName}</h3>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{formatDurationString(item.duration)}</span>
                            </div>
                            <div className="mt-1">{item.pax === 2 ? 'Per Couple' : 'Per Person'}</div>
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 text-right">
                          <div className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent font-poppins">
                            ${item.price}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <button className="w-full bg-gradient-to-r from-orange-500 to-yellow-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 font-opensans">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DealSlider() {
  const total = dealData.length;
  const cardsPerView = 3;
  const combined = [...dealData, ...dealData];
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (total < cardsPerView) return;
    setEnableTransition(false);
    setSlideIdx(0);
    animatingRef.current = false;
    requestAnimationFrame(() => requestAnimationFrame(() => setEnableTransition(true)));
    const id = setInterval(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setEnableTransition(true);
      setSlideIdx((i) => i + 1);
    }, 4000);
    return () => clearInterval(id);
  }, [total]);

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

  const goPrev = () => { setEnableTransition(true); animatingRef.current = true; setSlideIdx(i => i - 1); };
  const goNext = () => { setEnableTransition(true); animatingRef.current = true; setSlideIdx(i => i + 1); };
  const widthPct = 100 / cardsPerView;

  return (
    <div className="relative font-opensans">
      <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
        <ChevronLeft className="w-6 h-6 text-gray-800" />
      </button>
      <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
        <ChevronRight className="w-6 h-6 text-gray-800" />
      </button>
      <div className="overflow-hidden">
        <div onTransitionEnd={onTransitionEnd} className={`flex ${enableTransition ? 'transition-transform duration-700 ease-linear' : ''}`} style={{ transform: `translateX(-${slideIdx * widthPct}%)` }}>
          {combined.map((deal, idx) => (
            <div key={idx} className="w-1/3 flex-shrink-0 px-3">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-2xl hover:border-orange-300 transition-all duration-300 h-full">
                <div className="relative h-56 overflow-hidden group">
                  <img src={deal.image} alt={deal.destination} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute top-4 right-4 z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-500 blur-xl opacity-50 animate-pulse" />
                      <div className="relative bg-gradient-to-br from-red-600 to-red-500 text-white rounded-xl shadow-xl px-3 py-2 text-center">
                        <div className="text-2xl font-black leading-none font-poppins">{deal.discount}%</div>
                        <div className="text-xs font-bold">OFF</div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <h3 className="text-2xl font-black text-white mb-1 font-poppins">{deal.destination}</h3>
                    <p className="text-white/90 text-sm font-medium">{deal.subtitle}</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-4 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent font-poppins">
                          ${deal.discountPrice}
                        </span>
                      </div>
                      <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        Save ${deal.savings}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-semibold">{deal.duration}</span>
                      </div>
                      <span>•</span>
                      <span className="font-semibold">Per Person</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {deal.inclusions.map((item, i) => (
                        <div key={i} className="flex items-start space-x-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-700 font-medium leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4 p-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <div className="text-xs text-gray-900 font-bold">Valid Till: {deal.validUntil}</div>
                    </div>
                  </div>
                  <Link to="/customize" className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 block font-opensans">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative px-4 py-3 flex items-center justify-center space-x-2">
                      <span>Book Now</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InternationalSlider({ destinations, activeRegion }) {
  const filtered = (destinations || []).filter((d) => {
    if (!d || !d.region) return false;
    const regionVal = String(d.region).toLowerCase().trim();
    const active = String(activeRegion).toLowerCase().replace(/-/g, ' ').trim();
    if (active === 'all') return true;
    return regionVal === active;
  });
  const total = filtered.length;
  const cardsPerView = Math.min(4);
  const combined = [...filtered, ...filtered];
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);

  useEffect(() => {
    setEnableTransition(false);
    setSlideIdx(0);
    animatingRef.current = false;
    requestAnimationFrame(() => requestAnimationFrame(() => setEnableTransition(true)));
    const id = setInterval(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setEnableTransition(true);
      setSlideIdx((i) => i + 1);
    }, 4000);
    return () => clearInterval(id);
  }, [total, activeRegion]);

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

  const goPrev = () => { setEnableTransition(true); animatingRef.current = true; setSlideIdx(i => i - 1); };
  const goNext = () => { setEnableTransition(true); animatingRef.current = true; setSlideIdx(i => i + 1); };
  const widthPct = 100 / cardsPerView;

  return (
    <div className="relative font-opensans">
      <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
        <ChevronLeft className="w-6 h-6 text-gray-800" />
      </button>
      <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
        <ChevronRight className="w-6 h-6 text-gray-800" />
      </button>
      <div className="overflow-hidden">
        <div onTransitionEnd={onTransitionEnd} className={`flex ${enableTransition ? 'transition-transform duration-700 ease-linear' : ''}`} style={{ transform: `translateX(-${slideIdx * widthPct}%)` }}>
              {combined.map((dest, idx) => (
            <div key={`${dest.id}-${idx}`} className="flex-shrink-0 px-3" style={{ width: `${widthPct}%` }}>
              <Link to={`/packages?country=${dest.slug_country}`} className="group relative overflow-hidden rounded-2xl aspect-[3/4] hover:shadow-2xl transition-all duration-300 block">
                <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center space-x-2 text-white/80 text-sm mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{dest.state || dest.country || dest.region}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 font-poppins">{dest.name}</h3>
                  <p className="text-white/80 text-sm line-clamp-2">{dest.description}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocalSlider({ destinations }) {
  const filtered = destinations || [];
  const total = filtered.length;
  const cardsPerView = Math.min(4, total || 1);
  const combined = [...filtered, ...filtered];
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);

  useEffect(() => {
    setEnableTransition(false);
    setSlideIdx(0);
    animatingRef.current = false;
    requestAnimationFrame(() => requestAnimationFrame(() => setEnableTransition(true)));
    const id = setInterval(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setEnableTransition(true);
      setSlideIdx((i) => i + 1);
    }, 4000);
    return () => clearInterval(id);
  }, [total]);

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

  const goPrev = () => { setEnableTransition(true); animatingRef.current = true; setSlideIdx(i => i - 1); };
  const goNext = () => { setEnableTransition(true); animatingRef.current = true; setSlideIdx(i => i + 1); };
  const widthPct = 100 / cardsPerView;

  return (
    <div className="relative font-opensans">
      <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
        <ChevronLeft className="w-6 h-6 text-gray-800" />
      </button>
      <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
        <ChevronRight className="w-6 h-6 text-gray-800" />
      </button>
      <div className="overflow-hidden">
        <div onTransitionEnd={onTransitionEnd} className={`flex ${enableTransition ? 'transition-transform duration-700 ease-linear' : ''}`} style={{ transform: `translateX(-${slideIdx * widthPct}%)` }}>
              {combined.map((dest, idx) => (
            <div key={`${dest.id}-${idx}`} className="flex-shrink-0 px-3" style={{ width: `${widthPct}%` }}>
              <Link to={`/packages?state=${dest.slug_state}`} className="group relative overflow-hidden rounded-2xl aspect-[3/4] hover:shadow-2xl transition-all duration-300 block">
                <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center space-x-2 text-white/80 text-sm mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{dest.state || dest.country || dest.region}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 font-poppins">{dest.name}</h3>
                  <p className="text-white/80 text-sm line-clamp-2">{dest.description}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [destinations, setDestinations] = useState([]);
  const [localDestinations, setLocalDestinations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [visible, setVisible] = useState(3);
  const [happyCustomers, setHappyCustomers] = useState(0);
  const [easyBookingPct, setEasyBookingPct] = useState(0);
  const [satisfactionPct, setSatisfactionPct] = useState(0);
  const [assurancePct, setAssurancePct] = useState(0);
  const [activeRegion, setActiveRegion] = useState('asia');
  const statsRef = useRef(null);
  const whyRef = useRef(null);
  const videoRef = useRef(null);

  const animateValue = (from, to, setter, duration = 1500) => {
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      const current = Math.round(from + (to - from) * eased);
      setter(current);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    setDestinations((mockDestinations || []).filter(d => d.country !== 'India'));
    setLocalDestinations(mockLocalDestinations);
    setPackages(mockPackages);
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const happy = packages.length || 0;
          animateValue(0, 7000, setHappyCustomers, 1500);
          animateValue(0, 100, setEasyBookingPct, 1200);
          animateValue(0, 100, setSatisfactionPct, 1300);
          animateValue(0, 100, setAssurancePct, 1100);
        } else {
          setHappyCustomers(0); setEasyBookingPct(0); setSatisfactionPct(0); setAssurancePct(0);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [packages]);

  useEffect(() => {
    const el = whyRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          vid.play().catch(() => {});
        } else {
          if (!vid.paused) vid.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const maxIndex = testimonials.length - visible;
    const testimonialTimer = setInterval(() => {
      setCurrentTestimonial((prev) => {
        let next = prev + 1;
        if (next > maxIndex) next = 0;
        return next;
      });
    }, 5000);
    return () => clearInterval(testimonialTimer);
  }, [visible]);

  useEffect(() => {
    const handleResize = () => {
      const newVisible = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
      setVisible(newVisible);
      if (currentTestimonial > testimonials.length - newVisible) {
        setCurrentTestimonial(0);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [currentTestimonial]);

  const getHighlightedTitle = (title) => {
    const words = title.split(' ');
    const lastWord = words.pop() || '';
    const mainTitle = words.join(' ');
    return (
      <span className="inline">
        {mainTitle} <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent font-bold font-poppins">{lastWord}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen with-fixed-header font-opensans">
      {/* HERO SECTION */}
      <div className="relative h-[80vh] lg:h-[84vh] overflow-hidden"> {/*98vh*/}
        {heroSlides.map((slide, index) => (
          <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
            {index >= 0 && index < 3 && (
              <video aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" src={`/v${index + 1}.mp4`} autoPlay muted loop playsInline />
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-gray-800/90 to-black/20"></div>
          </div>
        ))}
        <div className="relative z-20 absolute inset-0 flex items-center pt-8 lg:pt-42">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-4xl relative">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight mt-8 md:mt-12 lg:mt-24 font-poppins">
                {getHighlightedTitle(heroSlides[currentSlide].title)}
              </h1>
              <p className="text-xl text-gray-200 mb-12">{heroSlides[currentSlide].subtitle}</p>
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Where do you want to go?</label>
                        <select className="w-full outline-none text-gray-900 font-medium bg-transparent rounded-md px-2 py-2 cursor-pointer appearance-none focus:ring-2 focus:ring-orange-200 relative z-50">
                          <option value="">Select destination</option>
                          <option value="maldives">Maldives</option>
                          <option value="bali">Bali</option>
                          <option value="switzerland">Switzerland</option>
                          <option value="paris">Paris</option>
                          <option value="dubai">Dubai</option>
                          <option value="santorini">Santorini</option>
                          <option value="thailand">Thailand</option>
                          <option value="kashmir">Kashmir</option>
                          <option value="kerala">Kerala</option>
                          <option value="goa">Goa</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="relative border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">When</label>
                        <select className="w-full outline-none text-gray-900 font-medium bg-transparent rounded-md px-3 py-2 cursor-pointer appearance-none pr-8 focus:ring-2 focus:ring-orange-200 relative z-50">
                          <option value="">Select dates</option>
                          <option value="this-week">This Week</option>
                          <option value="next-week">Next Week</option>
                          <option value="this-month">This Month</option>
                          <option value="next-month">Next Month</option>
                          <option value="custom">Custom Dates</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="relative border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-4">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Travelers</label>
                        <select className="w-full outline-none text-gray-900 font-medium bg-transparent rounded-md px-3 py-2 cursor-pointer appearance-none pr-8 focus:ring-2 focus:ring-orange-200 relative z-50">
                          <option value="">How many?</option>
                          <option value="1">1 Person</option>
                          <option value="2">2 People</option>
                          <option value="3-4">3-4 People</option>
                          <option value="5-6">5-6 People</option>
                          <option value="7+">7+ People</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:from-orange-500 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 font-opensans">
                    <Search className="w-5 h-5" />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="relative -mt-5 z-30 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={statsRef} className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
            <div className="grid grid-cols-2 lg:grid-cols-6 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-gray-100">
              <div className="p-8 text-center group hover:bg-gradient-to-br hover:from-yellow-50 hover:to-orange-50 transition-all duration-300">
                <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-br from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2 font-poppins">
                  {happyCustomers > 0 ? `${happyCustomers}+` : '0+'}
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">Happy Customers</div>
                <div className="text-xs text-gray-500">Experienced the best</div>
              </div>
              <div className="p-8 text-center group hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 transition-all duration-300">
                <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2 font-poppins">
                  {easyBookingPct}%
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">Easy Booking</div>
                <div className="text-xs text-gray-500">For any destination</div>
              </div>
              <div className="p-8 text-center group hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 transition-all duration-300">
                <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 font-poppins">
                  {satisfactionPct}%
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">Satisfaction</div>
                <div className="text-xs text-gray-500">Your happiness guaranteed</div>
              </div>
              <div className="p-8 text-center group hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2 font-poppins">
                  {assurancePct}%
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">Your Assurance</div>
                <div className="text-xs text-gray-500">Our promise to you</div>
              </div>
              <div className="p-8 text-center group hover:bg-gradient-to-br hover:from-amber-50 hover:to-yellow-50 transition-all duration-300">
                <div className="text-3xl lg:text-4xl font-bold bg-red-700 bg-clip-text text-transparent mb-2 font-poppins">Best</div>
                <div className="text-sm font-semibold text-gray-900 mb-1">Price & Experience</div>
                <div className="text-xs text-gray-500">Your journey matters</div>
              </div>
              <div className="p-8 text-center group hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-50 transition-all duration-300">
                <div className="text-3xl lg:text-4xl font-bold bg-gray-800 bg-clip-text text-transparent mb-2 font-poppins">24/7</div>
                <div className="text-sm font-semibold text-gray-900 mb-1">On-Trip Support</div>
                <div className="text-xs text-gray-500">Always here for you</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEAL OF THE MONTH */}
      <section className="py-16 bg-white relative overflow-hidden font-opensans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">Deals of the Month</h2>
            <p className="text-lg text-gray-600">Exclusive offers you won't find anywhere else</p>
          </div>
          <DealSlider />
        </div>
      </section>

      <RecentlyBookedSlider />

      {/* INTERNATIONAL DESTINATIONS */}
      <section className="py-16 bg-white relative overflow-hidden font-opensans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center font-poppins">
              Popular International Destinations
            </h2>
            <p className="text-lg text-gray-600 mb-8 text-center">
              Journey through continents and discover extraordinary destinations
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setActiveRegion(region.id)}
                  className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 font-opensans ${
                    activeRegion === region.id
                      ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>
          <InternationalSlider destinations={destinations} activeRegion={activeRegion} />
          <div className="text-center mt-8">
            <Link to="/destinations" className="inline-flex items-center px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors font-opensans">
              Explore All Destinations
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* LOCAL DESTINATIONS */}
      <section className="py-16 bg-white font-opensans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">Most Popular Local Destinations</h2>
            <p className="text-lg text-gray-600">Explore the incredible beauty of India</p>
          </div>
          <LocalSlider destinations={localDestinations} />
          <div className="text-center mt-8">
            <Link to="/destinations" className="inline-flex items-center px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors font-opensans">
              Explore India
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED PACKAGES */}
      <section className="py-16 bg-gray-50 font-opensans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
              Featured Packages
            </h2>
            <p className="text-lg text-gray-600">
              Handpicked experiences for unforgettable journeys
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.slice(0, 6).map((pkg) => (
              <Link key={pkg.id} to={`/package/${pkg.id}`} className="group bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="relative overflow-hidden aspect-[4/3]">
                  {/* prefer pkg.image_url, fallback to first image in pkg.images (from mockData.js) */}
                  <img src={pkg.image_url || pkg.images?.[0]} alt={pkg.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-1 text-xs font-semibold text-gray-900">
                    {pkg.category.charAt(0).toUpperCase() + pkg.category.slice(1)}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-yellow-600 transition-colors font-poppins">
                    {pkg.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pkg.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{pkg.duration_days}D</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span>{pkg.rating}</span>
                        <span className="text-gray-400">({pkg.reviews_count})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-sm text-gray-500">Starting from</div>
                      <div className="text-2xl font-bold text-gray-900 font-poppins">${pkg.price_from}</div>
                    </div>
                    <button className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow font-opensans">
                      View Details
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
  <div className="py-20 bg-gray-100 font-opensans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
              Trusted by Travelers Worldwide
            </h2>
            <p className="text-lg text-gray-600">Hear what our clients have to say about their experiences</p>
          </div>
          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentTestimonial * (100 / visible)}%)` }}>
              {testimonials.map((test, idx) => (
                <div key={idx} className="flex-shrink-0 px-4" style={{ width: `${100 / visible}%` }}>
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 h-full">
                    <div className="flex items-center mb-6">
                      {[...Array(test.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed mb-8">
                      "{test.text}"
                    </p>
                    <div className="flex items-center space-x-4 pt-6 border-t border-gray-100">
                      <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                        {test.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg font-poppins">{test.name}</h4>
                        <p className="text-gray-500">{test.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WHY SECTION */}
      <section className="py-20 bg-[#012a4a] relative overflow-hidden font-opensans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-poppins">
                Why Travel With Us?
              </h2>
              <p className="text-xl text-gray-300 mb-10">
                We believe in creating unforgettable memories through perfectly curated travel experiences.
              </p>
              <div className="space-y-5">
                {['Personalized Itineraries', 'Expert Local Guides', 'Best Price Guarantee', '24/7 Customer Support'].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-4 group">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1 font-poppins">{item}</h3>
                      <p className="text-gray-300 text-md">
                        {idx === 0 && 'Every journey is uniquely crafted to match your dreams and preferences'}
                        {idx === 1 && 'Connect with authentic experiences through our expert local guides'}
                        {idx === 2 && 'Transparent pricing with no hidden fees—your trust matters to us'}
                        {idx === 3 && 'Round-the-clock assistance ensures you are never alone on your journey'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 relative" ref={whyRef}>
              <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[500px]">
                <video
                  ref={videoRef}
                  src="/v2.mp4"
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                  autoPlay
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              </div>
              <div className="absolute -bottom-8 -left-8 bg-white rounded-2xl shadow-2xl p-6 max-w-xs">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Star className="w-8 h-8 text-white fill-current" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 font-poppins">7000+</div>
                    <div className="text-sm text-gray-600">Happy Customers</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm font-medium">Plan your holiday with Trip Sky Way</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQSection />
      <KeyPartnersSection />

      {/* FINAL CTA */}
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
              <Link to="/destinations" className="flex-none w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 whitespace-nowrap overflow-hidden font-opensans">
                Customize Your Trip <ArrowRight className="ml-3 w-5 h-5 flex-shrink-0" />
              </Link>
              <Link to="/customize" className="flex-none w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transform hover:scale-105 transition-all duration-300 whitespace-nowrap overflow-hidden font-opensans">
                Still Have Questions?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}