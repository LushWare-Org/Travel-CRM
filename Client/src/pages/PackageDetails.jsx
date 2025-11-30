import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, Star, MapPin, Check, X, Calendar, Download, ChevronLeft, ChevronRight,
  Award, Sparkles, ArrowRight, ChevronDown, Phone, Mail,
} from 'lucide-react';
import { fetchPackageById } from '../utils/packageApi';
import { formatCurrency } from '../utils/currency';
import { generateManagementPDF } from '../utils/managementPdfBridge';
import { useAuth } from '../context/AuthContext';
import { submitBookingRequest } from '../utils/bookingApi';

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', travelers: 1, date: '', message: '',
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionType, setSubmissionType] = useState('booking');
  const [formErrors, setFormErrors] = useState({});
  const [shouldDownloadAfterSubmit, setShouldDownloadAfterSubmit] = useState(false);
  const [reviewData, setReviewData] = useState({
    name: '', email: '', rating: 0, comment: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchPackageById(id)
      .then((packageData) => {
        if (!isMounted) return;
        setPkg(packageData);
        const raw = packageData?.raw ?? {};
        const fetchedReviews = Array.isArray(raw.reviews)
          ? raw.reviews.map((review) => ({
              id: review._id || review.id,
              user_name: review.author?.name || review.user?.name || 'Traveler',
              rating: review.rating || 0,
              comment: review.comment || '',
              created_at: review.createdAt || review.created_at || new Date().toISOString(),
            }))
          : [];
        setReviews(fetchedReviews);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load package details');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const heroImages = pkg?.images || [];
  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') return false;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 5 && digits.length <= 15;
  };

  useEffect(() => {
    if (!heroImages || heroImages.length <= 1 || isImageHovered) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const nextIndex = (prev + 1) % heroImages.length;
        return nextIndex;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [heroImages.length, isImageHovered]);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pkg) return;

    // Validate form fields
    const errors = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      errors.phone = 'Phone number is not valid (e.g., +1 234 567 8900 or 534543678)';
    }
    
    if (!formData.date) {
      errors.date = 'Travel date is required';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setIsSubmittingBooking(true);
    try {
      const submissionData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        travelers: Number(formData.travelers) || 1,
        travelDate: formData.date,
        message: formData.message,
        packageId: pkg.id || pkg._id || pkg?.raw?._id,
        type: submissionType,
      };
      if (submissionType === 'booking') {
        await submitBookingRequest(submissionData);
        setPkg((prevPkg) => {
          if (!prevPkg) return prevPkg;
          const updatedBookings = (prevPkg.bookings || 0) + 1;
          return {
            ...prevPkg,
            bookings: updatedBookings,
            raw: prevPkg.raw
              ? { ...prevPkg.raw, bookings: (prevPkg.raw.bookings || 0) + 1 }
              : prevPkg.raw,
          };
        });
      } else if (submissionType === 'lead') {
        await submitBookingRequest(submissionData);
      }

      setShowSuccessModal(true);
      setFormData({ name: '', email: '', phone: '', travelers: 1, date: '', message: '' });
      
      // If this was a lead submission for download, trigger PDF download
      if (submissionType === 'lead' && shouldDownloadAfterSubmit) {
        setTimeout(() => {
          downloadPDF();
          setShouldDownloadAfterSubmit(false);
        }, 1000);
      }
      
      setSubmissionType('booking');
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        alert(err.message);
      } else {
        alert('Unable to submit your booking request right now. Please try again.');
      }
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const downloadPDF = async () => {
    if (!pkg) return;
    setIsDownloading(true);
    try {
      await generateManagementPDF(pkg.raw || pkg);
    } catch (error) {
      console.error('Failed to generate itinerary PDF via management service.', error);
      window.alert('Unable to generate the itinerary PDF right now. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'itinerary', label: 'Itinerary', icon: Calendar },
    { id: 'inclusions', label: 'What\'s Included', icon: Award },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md text-center bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-black text-gray-900 mb-4">Unable to load package</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/packages')}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Browse packages
          </button>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-black text-gray-900 mb-2">Package not found</h2>
          <p className="text-gray-600 mb-6">The package you're looking for may have been removed.</p>
          <button
            type="button"
            onClick={() => navigate('/packages')}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Explore packages
          </button>
        </div>
      </div>
    );
  }

  const images = heroImages.length > 0 ? heroImages : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <style>{`
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        @keyframes horizontalScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% { opacity: 0.3; }
          50% {
            transform: translateY(-100vh) translateX(50px);
            opacity: 0.5;
          }
          90% { opacity: 0.3; }
          100% {
            transform: translateY(-100vh) translateX(100px);
            opacity: 0;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes seamlessTransition {
          0% {
            opacity: 1;
            transform: scale(1.05) translateX(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.08) translateX(0);
          }
          25% {
            opacity: 0;
            transform: scale(1.1) translateX(10%);
          }
          30% {
            opacity: 0;
            transform: scale(1.05) translateX(-10%);
          }
          100% {
            opacity: 0;
            transform: scale(1) translateX(0);
          }
        }
        @keyframes seamlessEnter {
          0% {
            opacity: 0;
            transform: scale(0.95) translateX(-10%);
          }
          20% {
            opacity: 1;
            transform: scale(1.02) translateX(0);
          }
          100% {
            opacity: 1;
            transform: scale(1.05) translateX(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-float {
          animation: float linear infinite;
        }
        .ken-burns-active {
          animation: kenBurns 15s ease-out infinite;
        }
        .slide-horizontal {
          animation: horizontalScroll 1s ease-in-out;
        }
        .seamless-transition-out {
          animation: seamlessTransition 3.5s ease-out forwards;
        }
        .seamless-transition-in {
          animation: seamlessEnter 1.5s ease-out forwards;
        }
      `}</style>

      {/* Hero Section - SEAMLESS END-TO-END TRANSITION */}
      <div
        className="relative h-[83vh] overflow-hidden"
        onMouseEnter={() => setIsImageHovered(true)}
        onMouseLeave={() => setIsImageHovered(false)}
      >
        <div className="absolute inset-0">
          {images.map((img, idx) => {
            const isCurrent = idx === currentImageIndex;
            const isNext = idx === (currentImageIndex + 1) % images.length;
            const isPrevious = idx === (currentImageIndex - 1 + images.length) % images.length;
            
            return (
              <div
                key={idx}
                className={`
                  absolute inset-0 transition-all duration-1000 ease-out
                  ${isCurrent 
                    ? 'opacity-100 z-10 ken-burns-active slide-horizontal seamless-transition-in' 
                    : isNext || isPrevious 
                      ? 'opacity-0 z-5 seamless-transition-out' 
                      : 'opacity-0 scale-100 z-0'
                  }
                `}
              >
                <img
                  src={img}
                  alt={`${pkg.title} - ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
              </div>
            );
          })}
        </div>

        {/* Hero Content */}
        <div className={`relative z-30 h-full flex items-end pb-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
            {pkg.destination && (
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full mb-6 transform hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-white/90 font-medium text-sm">
                  {pkg.destination.name}{pkg.destination.country && `, ${pkg.destination.country}`}
                </span>
              </div>
            )}
            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-none tracking-tight max-w-5xl">
              <span className="inline-block animate-fadeInUp">
                {pkg.title && pkg.title.split(' ').map((word, i) => (
                  <span
                    key={i}
                    className="inline-block mr-4 mb-2"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      textShadow: '0 4px 30px rgba(0,0,0,0.7)'
                    }}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </h1>
            {/* Info Cards */}
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
              <span className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 backdrop-blur-sm text-black rounded-full font-semibold capitalize">
                {pkg.category}
              </span>
            </div>
            </div>
            </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 animate-bounce">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs uppercase tracking-wider font-semibold">Scroll</span>
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-110 text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-110 text-white"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-8 -mt-6 relative py-20 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-200 overflow-x-auto">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex-1 flex items-center justify-center gap-3 px-6 py-5 font-black transition-all duration-300 whitespace-nowrap ${
                        activeSection === section.id
                          ? 'bg-black text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
              <div className="p-10">
                {activeSection === 'overview' && (
                  <div className="space-y-10">
                    <div>
                      <p className="text-lg text-gray-700 leading-relaxed">{pkg.description}</p>
                    </div>
                    {pkg.highlights && pkg.highlights.length > 0 && (
                      <div>
                        <h3 className="text-3xl font-black text-gray-900 mb-6">Premium Highlights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {pkg.highlights.map((h, i) => (
                            <div
                              key={i}
                              className="group relative bg-gray-50 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 border hover:border-amber-300"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Check className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-black font-semibold leading-relaxed flex-1">{h}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeSection === 'itinerary' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black text-gray-900 mb-8 bg-black bg-clip-text text-transparent">
                      Journey Timeline
                    </h2>
                    {pkg.itinerary?.map((day, i) => (
                      <div key={i} className="group relative">
                        <div className="flex gap-6">
                          <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg group-hover:scale-110 transition-transform">
                              {i + 1}
                            </div>
                            {i < (pkg.itinerary?.length || 0) && (
                              <div className="absolute top-20 left-1/2 -translate-x-1/2 w-1 h-12 bg-gradient-to-b from-orange-300 to-transparent" />
                            )}
                          </div>
                          <div className="flex-1 bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 hover:border-amber-300 hover:shadow-xl transition-all">
                            <h3 className="text-2xl font-black text-gray-900 mb-3">{day.title}</h3>
                            <p className="text-gray-700 leading-relaxed text-lg">{day.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeSection === 'inclusions' && (
                  <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                          <h3 className="text-3xl font-bold text-gray-900">Inclusions</h3>
                        </div>
                        <ul className="space-y-3">
                          {pkg.inclusions?.map((inc, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-700">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                          <h3 className="text-3xl font-bold text-gray-900">Exclusions</h3>
                        </div>
                        <ul className="space-y-3">
                          {pkg.exclusions?.map((exc, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-700">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center mt-0.5">
                                <X className="w-4 h-4 text-red-600" />
                              </div>
                              <span>{exc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {/* Booking Policies */}
                    <div className="rounded-3xl p-8 border-2 border-amber-200">
                      <h3 className="text-3xl font-black text-gray-900 mb-6">Booking Terms</h3>
                      <div className="space-y-5">
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <h4 className="font-black text-gray-900 mb-2 text-lg">Cancellation Policy</h4>
                            <p className="text-gray-700 leading-relaxed">Free cancellation up to 48 hours before departure. Cancellations made within 48 hours will incur a 50% charge. No-shows will be charged 100% of the booking amount.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <h4 className="font-black text-gray-900 mb-2 text-lg">Payment Terms</h4>
                            <p className="text-gray-700 leading-relaxed">A 30% deposit is required at the time of booking. The remaining balance must be paid 14 days before departure. We accept all major credit cards, bank transfers, and PayPal.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <h4 className="font-black text-gray-900 mb-2 text-lg">Group Bookings</h4>
                            <p className="text-gray-700 leading-relaxed">Special rates available for groups of 10 or more travelers. Contact our team for customized group packages and discounts.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeSection === 'reviews' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl font-bold text-gray-900">Customer Reviews</h2>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                            <Star className="w-6 h-6 text-yellow-400 fill-current" />
                            {pkg.rating}
                          </div>
                          <p className="text-sm text-gray-500">{pkg.reviews_count} reviews</p>
                        </div>
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:from-yellow-400 hover:to-orange-600 transform hover:scale-[1.02] transition-all whitespace-nowrap"
                        >
                          Write a Review
                        </button>
                      </div>
                    </div>
                    {reviews.length === 0 && (
                      <p className="text-gray-600">No reviews have been shared yet. Be the first to travel with us and leave a review!</p>
                    )}
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
          {/* Sidebar */}
         <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Starting from</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-gray-900">{formatCurrency(pkg.price_from)}</p>
                    <span className="text-gray-500 font-medium">/person</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSubmissionType('booking');
                    setShowBookingModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:from-yellow-600 hover:to-orange-600 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Book Now
                </button>
                <button
                  onClick={() => {
                    setSubmissionType('lead');
                    setShouldDownloadAfterSubmit(true);
                    setShowBookingModal(true);
                  }}
                  className="w-full mt-3 border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Itinerary
                </button>
                <button
                  onClick={() => navigate(`/package/${pkg.id}/customize`)}
                  className="w-full mt-3 border-2 border-yellow-500 text-yellow-700 py-4 rounded-xl font-semibold hover:bg-yellow-50 hover:border-yellow-600 transition-all flex items-center justify-center gap-2"
                >
                  Customize Package
                </button>
              </div>
               <div className="bg-gradient-to-br from-black to-gray-800 rounded-3xl shadow-2xl p-8 text-white">
                <h4 className="text-2xl font-black mb-6">Need Assistance?</h4>
                <div className="space-y-4">
                  <a
                    href="tel:+1234567890"
                    className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/20 transition-all"
                  >
                    <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center">
                      <Phone className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-200 uppercase tracking-wide">Call Us</p>
                      <p className="font-black text-lg">+91 (987) 6543-210</p>
                    </div>
                  </a>
                  <a
                    href="mailto:info@tripskyway.com"
                    className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/20 transition-all"
                  >
                    <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center">
                      <Mail className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-200 uppercase tracking-wide">Email Us</p>
                      <p className="font-black text-lg">info@tripskyway.com</p>
                    </div>
                  </a>
                </div>
              </div>
              </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black mb-2">
                    {submissionType === 'lead' ? 'Get Your Itinerary' : 'Book Your Adventure'}
                  </h3>
                  <p className="text-amber-100">
                    {submissionType === 'lead' 
                      ? 'Fill in your details to download the complete itinerary PDF' 
                      : 'Fill in your details and we\'ll get back to you within 24 hours'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setShouldDownloadAfterSubmit(false);
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      if (formErrors.name) {
                        setFormErrors({...formErrors, name: ''});
                      }
                    }}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-amber-100 transition-all ${
                      formErrors.name 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:border-amber-500'
                    }`}
                    placeholder="John Doe"
                  />
                  {formErrors.name && (
                    <p className="text-red-600 text-sm font-semibold mt-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18.101 12.93a1 1 0 00-1.414-1.414L10 17.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                      </svg>
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      if (formErrors.email) {
                        setFormErrors({...formErrors, email: ''});
                      }
                    }}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-amber-100 transition-all ${
                      formErrors.email 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:border-amber-500'
                    }`}
                    placeholder="john@example.com"
                  />
                  {formErrors.email && (
                    <p className="text-red-600 text-sm font-semibold mt-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18.101 12.93a1 1 0 00-1.414-1.414L10 17.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                      </svg>
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      // Clear error when user starts typing
                      if (formErrors.phone) {
                        setFormErrors({...formErrors, phone: ''});
                      }
                    }}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-amber-100 transition-all ${
                      formErrors.phone 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:border-amber-500'
                    }`}
                    placeholder="+1 234 567 890 or 5345436"
                  />
                  {formErrors.phone && (
                    <p className="text-red-600 text-sm font-semibold mt-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18.101 12.93a1 1 0 00-1.414-1.414L10 17.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                      </svg>
                      {formErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">Travel Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({...formData, date: e.target.value});
                      if (formErrors.date) {
                        setFormErrors({...formErrors, date: ''});
                      }
                    }}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-amber-100 transition-all ${
                      formErrors.date 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:border-amber-500'
                    }`}
                  />
                  {formErrors.date && (
                    <p className="text-red-600 text-sm font-semibold mt-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18.101 12.93a1 1 0 00-1.414-1.414L10 17.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                      </svg>
                      {formErrors.date}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 mb-2">Number of Travelers</label>
                <input
                  type="number"
                  min="1"
                  value={formData.travelers}
                  onChange={(e) => setFormData({...formData, travelers: +e.target.value})}
                  className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 mb-2">Special Requests</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all resize-none"
                  placeholder="Any dietary requirements, accessibility needs, or special occasions?"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className={`w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-5 rounded-2xl font-black text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3 ${
                    isSubmittingBooking ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmittingBooking 
                    ? submissionType === 'lead' 
                      ? 'Processing...' 
                      : 'Submitting...'
                    : submissionType === 'lead'
                    ? 'Get Itinerary'
                    : 'Submit Booking Request'}
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
       {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Write a Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                console.log('Review submitted:', reviewData);
                setReviewData({ name: '', email: '', rating: 0, comment: '' });
                setShowReviewModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  value={reviewData.name}
                  onChange={(e) => setReviewData({ ...reviewData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900">Rating</label>
                  <span className="text-sm text-gray-600">{reviewData.rating} out of 5</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="transition-colors"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewData.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Your Review</label>
                <textarea
                  required
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none"
                  rows={4}
                  placeholder="Share your experience..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:shadow-lg hover:from-orange-600 hover:to-yellow-400 transform hover:scale-[1.02] transition-all"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-3">Submitted Successfully!</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Thank you for your booking request. We'll review your details and contact you within 24 hours to confirm your adventure!
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setShowBookingModal(false);
                }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-300"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}