import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function DealSlider({ deals = [] }) {
  if (!deals.length) return null;

  const cardsPerView = Math.min(3, deals.length);
  const total = deals.length;
  const combined = [...deals, ...deals];
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (total <= cardsPerView) {
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
    }, 4000);
    return () => clearInterval(id);
  }, [total, cardsPerView]);

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
    if (total <= cardsPerView) return;
    setEnableTransition(true);
    animatingRef.current = true;
    setSlideIdx((i) => (i <= 0 ? total - 1 : i - 1));
  };

  const goNext = () => {
    if (total <= cardsPerView) return;
    setEnableTransition(true);
    animatingRef.current = true;
    setSlideIdx((i) => i + 1);
  };

  const widthPct = cardsPerView > 0 ? 100 / cardsPerView : 100;
  const showControls = total > cardsPerView;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {showControls && (
        <>
          <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all">
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>
        </>
      )}
      <div className="overflow-hidden">
        <div onTransitionEnd={onTransitionEnd} className={`flex ${enableTransition ? 'transition-transform duration-700 ease-linear' : ''}`} style={{ transform: `translateX(-${slideIdx * widthPct}%)` }}>
          {combined.map((deal, idx) => (
            <div key={`${deal.id}-${idx}`} className="w-1/3 flex-shrink-0 px-3">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-2xl hover:border-orange-300 transition-all duration-300 h-full">
                <div className="relative h-56 overflow-hidden group">
                  <img src={deal.image } alt={deal.destination} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
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
                          {formatCurrency(deal.discountPrice)}
                        </span>
                        <span className="text-sm text-gray-400 line-through">{formatCurrency(deal.originalPrice)}</span>
                      </div>
                      <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        Save {formatCurrency(deal.savings)}
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
                      {deal.inclusions?.slice(0, 4).map((item, i) => (
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
                  <Link
                    to={deal.slug ? `/package/${deal.slug}` : `/package/${deal.id}`}
                    className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 block font-opensans text-center"
                  >
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

















// import { ChevronRight } from 'lucide-react';
// import { useState } from 'react';

// export default function SpecialOffers() {
//   const [activeTab, setActiveTab] = useState('All');

//   const tabs = ['All', 'Flights', 'Hotels', 'Holidays', 'Buses', 'Rajasthan Attractions'];

//   const offers = [
//     {
//       id: 1,
//       brand: 'IndiGo',
//       logo: '✈️',
//       title: 'Indigo Black Friday Sale',
//       description: 'On Domestic Flights',
//       price: 'Fares starting from Rs. 1,799*',
//       image: 'plane',
//       bgColor: 'bg-blue-200'
//     },
//     {
//       id: 2,
//       brand: 'AXIS BANK',
//       logo: '🏦',
//       title: 'Flat 10% OFF (Up to Rs. 1,800) + Interes...',
//       description: 'On Domestic Flights',
//       details: 'Offer valid on Axis Bank Credit Card EMI Transactions Only',
//       promoCode: 'YRAXISEMI',
//       image: 'plane',
//       bgColor: 'bg-blue-100'
//     },
//     {
//       id: 3,
//       brand: 'virgin atlantic',
//       logo: '✈️',
//       title: 'Virgin Atlantic Sale',
//       description: 'On International Flights',
//       price: 'Up to Rs. 10,000 OFF*',
//       image: 'plane-sunset',
//       bgColor: 'bg-purple-200'
//     }
//   ];

//   return (
//     <div className="w-full max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6">
//         <h2 className="text-3xl font-bold text-gray-900">Special Offers</h2>
//         <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
//           <ChevronRight className="w-6 h-6 text-gray-600" />
//         </button>
//       </div>

//       {/* Tabs */}
//       <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
//         {tabs.map((tab) => (
//           <button
//             key={tab}
//             onClick={() => setActiveTab(tab)}
//             className={`px-6 py-2 rounded-full whitespace-nowrap transition-all ${
//               activeTab === tab
//                 ? 'bg-red-100 text-red-600 font-medium'
//                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//             }`}
//           >
//             {tab}
//           </button>
//         ))}
//       </div>

//       {/* Offers Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
//         {offers.map((offer) => (
//           <div
//             key={offer.id}
//             className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow flex"
//           >
//             {/* Image Section - Left Side */}
//             <div className={`${offer.bgColor} w-48 flex-shrink-0 relative flex items-center justify-center p-4`}>
//               <div className="absolute top-4 left-4">
//                 <div className="flex items-center gap-2 mb-1">
//                   <span className="text-xl">{offer.logo}</span>
//                   <span className="font-bold text-sm text-gray-800">{offer.brand}</span>
//                 </div>
//               </div>
//               <div className="text-7xl opacity-30 mt-8">✈️</div>
//             </div>

//             {/* Content Section - Right Side */}
//             <div className="flex-1 p-6 flex flex-col">
//               <h3 className="text-xl font-bold text-gray-900 mb-3">{offer.title}</h3>
//               <p className="text-sm text-gray-600 mb-2">{offer.description}</p>
//               {offer.price && (
//                 <p className="text-base font-semibold text-gray-900 mb-3">{offer.price}</p>
//               )}
//               {offer.details && (
//                 <p className="text-sm text-gray-700 mb-3">{offer.details}</p>
//               )}
//               {offer.promoCode && (
//                 <div className="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm mb-4 w-fit">
//                   {offer.promoCode}
//                 </div>
//               )}
//               <button className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 mt-auto">
//                 View Details
//                 <ChevronRight className="w-4 h-4" />
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* View All Offers Link */}
//       <div className="text-center">
//         <button className="inline-flex items-center gap-2 text-blue-600 font-semibold text-lg hover:text-blue-700 transition-colors">
//           View all offers
//           <span className="text-xl">↗</span>
//         </button>
//       </div>
//     </div>
//   );
// }