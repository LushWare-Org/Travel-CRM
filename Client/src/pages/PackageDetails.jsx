import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Star, MapPin, Check, X, Calendar, Users, Download, ChevronLeft, ChevronRight, XCircle, Shield, Award, Heart, Share2, FileText, Map, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const mockDestinations = [
  { id: 1, name: 'Bali', country: 'Indonesia' },
  { id: 2, name: 'Paris', country: 'France' }
];

const mockPackages = [
  {
    id: 1,
    title: 'Ultimate Bali Adventure',
    description: 'Experience the magic of Bali with our comprehensive tour package. From pristine beaches to ancient temples, lush rice terraces to vibrant markets, this journey offers an authentic taste of Indonesian paradise. Immerse yourself in local culture, savor traditional cuisine, and create unforgettable memories in one of the world\'s most enchanting destinations.',
    destination_id: 1,
    duration_days: 7,
    price_from: 1299,
    rating: 4.8,
    reviews_count: 156,
    category: 'adventure',
    images: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600',
      'https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=1600',
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1600',
      'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1600'
    ],
    highlights: [
      'Private beach resort accommodation',
      'Traditional Balinese cooking class',
      'Sunrise trek to Mount Batur',
      'Ubud rice terrace exploration',
      'Sacred monkey forest visit',
      'Sunset dinner cruise'
    ],
    itinerary: [
      { title: 'Arrival & Beach Welcome', description: 'Arrive in Bali and transfer to your beachfront resort. Enjoy a welcome dinner with ocean views and relax after your journey.' },
      { title: 'Ubud Cultural Experience', description: 'Visit the sacred monkey forest, explore traditional art markets, and take a cooking class to learn authentic Balinese cuisine.' },
      { title: 'Mount Batur Sunrise Trek', description: 'Early morning trek to watch the sunrise from the summit. Return for breakfast and spa relaxation at the resort.' },
      { title: 'Rice Terraces & Waterfalls', description: 'Explore the famous Tegalalang rice terraces and visit the stunning Tegenungan waterfall. Evening free for shopping.' },
      { title: 'Temple & Beach Day', description: 'Visit the iconic Tanah Lot temple and spend the afternoon at Seminyak beach with water sports activities.' },
      { title: 'Island Exploration', description: 'Full day boat trip to nearby Nusa Penida island for snorkeling, cliff views, and pristine beaches.' },
      { title: 'Departure', description: 'Final morning at leisure, spa treatment, and transfer to airport. Farewell Bali!' }
    ],
    inclusions: [
      'Airport transfers in private vehicle',
      '6 nights accommodation in 4-star resort',
      'Daily breakfast and 4 dinners',
      'All entrance fees and activities',
      'English-speaking tour guide',
      'Travel insurance coverage'
    ],
    exclusions: [
      'International flights',
      'Personal expenses and souvenirs',
      'Meals not mentioned in itinerary',
      'Optional activities',
      'Tips and gratuities'
    ]
  }
];

const mockReviews = [
  {
    id: 1,
    package_id: 1,
    user_name: 'Sarah Johnson',
    rating: 5,
    comment: 'Absolutely incredible experience! The organization was flawless and every detail was taken care of. Our guide was knowledgeable and friendly. Highly recommend!',
    created_at: '2024-10-15'
  },
  {
    id: 2,
    package_id: 1,
    user_name: 'Michael Chen',
    rating: 5,
    comment: 'Best vacation ever! The sunrise trek was breathtaking and the cooking class was so much fun. Great value for money.',
    created_at: '2024-09-28'
  },
  {
    id: 3,
    package_id: 1,
    user_name: 'Emma Williams',
    rating: 4,
    comment: 'Wonderful trip overall. Accommodation was beautiful and activities were well-planned. Only minor issue was some timing delays.',
    created_at: '2024-09-10'
  }
];

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', travelers: 2, date: '', message: '',
  });

  const pdfRef = useRef(null);

  useEffect(() => {
    if (id) {
      const packageData = mockPackages.find((p) => p.id === parseInt(id));
      if (packageData) {
        setPkg(packageData);
        setReviews(mockReviews.filter((r) => r.package_id === parseInt(id)));
      }
    }
  }, [id]);

  const heroImages = pkg?.images || [];

  useEffect(() => {
    if (!heroImages || heroImages.length <= 1) return;
    if (lightboxOpen) return;
    if (isHovered) return;

    const idt = setInterval(() => {
      setLightboxIndex(prev => (prev + 1) % heroImages.length);
    }, 4000);

    return () => clearInterval(idt);
  }, [heroImages.length, lightboxOpen, isHovered]);

  const pkgDestination = pkg ? mockDestinations.find((d) => d.id === pkg.destination_id) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Booking request submitted successfully! We\'ll contact you within 24 hours.');
    setShowBookingForm(false);
    setFormData({ name: '', email: '', phone: '', travelers: 2, date: '', message: '' });
  };

  const downloadPDF = async () => {
    const element = pdfRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`${pkg.title.replace(/ /g, '_')}.pdf`);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'itinerary', label: 'Itinerary', icon: Map },
    { id: 'inclusions', label: 'Inclusions', icon: CheckCircle },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  if (!pkg) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hidden PDF Content */}
      <div className="hidden">
        <div ref={pdfRef} className="p-10 bg-white">
          <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1>
          <p className="mb-4">{pkg.description}</p>
          <p><strong>Duration:</strong> {pkg.duration_days} Days | <strong>From:</strong> ${pkg.price_from}</p>
          <h2 className="text-xl font-bold mt-6 mb-2">Itinerary</h2>
          {pkg.itinerary?.map((day, i) => (
            <div key={i} className="mb-3">
              <strong>Day {i + 1}: {day.title}</strong>
              <p>{day.description}</p>
            </div>
          ))}
          <h2 className="text-xl font-bold mt-6 mb-2">Inclusions</h2>
          <ul>{pkg.inclusions?.map((inc, i) => <li key={i}>Checkmark {inc}</li>)}</ul>
        </div>
      </div>

      {/* Hero Section */}
      <div
        className="relative h-[70vh] overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0">
          {heroImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                idx === lightboxIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={img || FALLBACK_IMG}
                alt={`${pkg.title} - ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"></div>

        {heroImages.length > 1 && (
          <>
            <button
              onClick={() => setLightboxIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length)}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-all z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setLightboxIndex((prev) => (prev + 1) % heroImages.length)}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-all z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {heroImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === lightboxIndex ? 'bg-white w-8' : 'bg-white/50'
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pb-12">
            <div className="flex items-center gap-2 text-white/90 text-sm mb-3">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{pkgDestination?.name}, {pkgDestination?.country}</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              {pkg.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Clock className="w-5 h-5" />
                <span className="font-medium">{pkg.duration_days} Days</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-medium">{pkg.rating}</span>
                <span className="text-white/80">({pkg.reviews_count} reviews)</span>
              </div>
              <span className="px-4 py-2 bg-yellow-500/90 backdrop-blur-sm text-white rounded-full font-semibold capitalize">
                {pkg.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-6 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Overview</h3>
                  <div className="flex flex-wrap gap-3 p-2 bg-gray-100 rounded-2xl mb-6">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                            activeTab === tab.id
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg scale-105'
                              : 'text-gray-600 hover:bg-white hover:text-gray-900'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                {/* Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-4">About This Package</h2>
                      <p className="text-gray-600 leading-relaxed text-lg">{pkg.description}</p>
                    </div>
                    {pkg.highlights && (
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Key Highlights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pkg.highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-yellow-100">
                              <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-gray-700 font-medium">{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Itinerary */}
                {activeTab === 'itinerary' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Day by Day Itinerary</h2>
                    {pkg.itinerary?.map((day, i) => (
                      <div key={i} className="group relative rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition-all">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                              {i + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xl font-bold text-gray-900">{day.title}</h3>
                            </div>
                            <p className="text-gray-600 leading-relaxed">{day.description}</p>
                          </div>
                          {heroImages[i] && (
                            <div className="md:w-56 h-40 rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                              <img
                                src={heroImages[i]}
                                alt={day.title}
                                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inclusions */}
                {activeTab === 'inclusions' && (
                  <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                          <h3 className="text-2xl font-bold text-gray-900">Inclusions</h3>
                        </div>
                        <ul className="space-y-3">
                          {pkg.inclusions?.map((inc, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-700">
                              <Check className="w-5 h-5 mt-1 flex-shrink-0 text-green-600" />
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                          <h3 className="text-2xl font-bold text-gray-900">Exclusions</h3>
                        </div>
                        <ul className="space-y-3">
                          {pkg.exclusions?.map((exc, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-700">
                              <X className="w-5 h-5 mt-1 flex-shrink-0 text-red-600" />
                              <span>{exc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Booking Policies Section */}
                    <div className="mt-12">
                      <h3 className="text-2xl font-bold text-gray-900 mb-6">Booking Policies</h3>
                      <div className="space-y-4 text-gray-700">
                        <div className="border-l-4 border-yellow-500 pl-4 py-2">
                          <h4 className="font-semibold text-gray-900 mb-1">Cancellation Policy</h4>
                          <p>Free cancellation up to 48 hours before departure. Cancellations made within 48 hours will incur a 50% charge. No-shows will be charged 100% of the booking amount.</p>
                        </div>
                        <div className="border-l-4 border-yellow-500 pl-4 py-2">
                          <h4 className="font-semibold text-gray-900 mb-1">Payment Terms</h4>
                          <p>A 30% deposit is required at the time of booking. The remaining balance must be paid 14 days before departure. We accept all major credit cards, bank transfers, and PayPal.</p>
                        </div>
                        <div className="border-l-4 border-yellow-500 pl-4 py-2">
                          <h4 className="font-semibold text-gray-900 mb-1">Group Bookings</h4>
                          <p>Special rates available for groups of 10 or more travelers. Contact our team for customized group packages and discounts.</p>
                        </div>
                        <div className="border-l-4 border-yellow-500 pl-4 py-2">
                          <h4 className="font-semibold text-gray-900 mb-1">Changes & Modifications</h4>
                          <p>Changes to travel dates are subject to availability and may incur additional charges. Modifications must be requested at least 7 days before departure.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl font-bold text-gray-900">Customer Reviews</h2>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                          <Star className="w-6 h-6 text-yellow-400 fill-current" />
                          {pkg.rating}
                        </div>
                        <p className="text-sm text-gray-500">{pkg.reviews_count} reviews</p>
                      </div>
                    </div>
                    {reviews.map((r) => (
                      <div key={r.id} className="border-b border-gray-200 pb-6 last:border-0">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{r.user_name}</p>
                            <p className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-5 h-5 ${i < r.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Starting from</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-gray-900">${pkg.price_from}</p>
                    <span className="text-gray-500 font-medium">/person</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowBookingForm(!showBookingForm)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:from-yellow-600 hover:to-orange-600 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Book Now
                </button>
                <button
                  onClick={downloadPDF}
                  className="w-full mt-3 border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Itinerary
                </button>
                <button
                  onClick={() => navigate(`/itinerary/edit/${pkg.id}`)}
                  className="w-full mt-3 border-2 border-yellow-500 text-yellow-700 py-4 rounded-xl font-semibold hover:bg-yellow-50 hover:border-yellow-600 transition-all flex items-center justify-center gap-2"
                >
                  Edit Itinerary
                </button>
              </div>

              {showBookingForm && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-fade-in">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Inquiry</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" required placeholder="Full Name" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="email" required placeholder="Email Address" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input type="tel" required placeholder="Phone Number" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" min="1" placeholder="Travelers" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" value={formData.travelers} onChange={e => setFormData({...formData, travelers: +e.target.value})} />
                      <input type="date" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <textarea placeholder="Special requests or questions..." rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all resize-none" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                    <button type="submit" className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all">
                      Send Inquiry
                    </button>
                  </form>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <h4 className="font-bold text-gray-900 text-lg mb-4">Need Help?</h4>
                <p className="text-gray-600 text-sm mb-4">Our travel experts are here to help you plan your perfect trip.</p>
                <div className="space-y-3">
                  <a href="tel:+1234567890" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Call us</p>
                      <p className="font-semibold">+1 (234) 567-890</p>
                    </div>
                  </a>
                  <a href="mailto:info@travel.com" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email us</p>
                      <p className="font-semibold">info@travel.com</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}