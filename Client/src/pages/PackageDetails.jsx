import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, Star, MapPin, Check, X, Calendar, Download, ChevronLeft, ChevronRight,
  Award, Sparkles, ArrowRight, ChevronDown, Phone, Mail, Users,
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { fetchPackageById, submitReview, fetchPackageReviews } from '../utils/packageApi';
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
    name: '', email: '', phone: '', travelers: 1, travelDate: null, endDate: null, message: '',
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionType, setSubmissionType] = useState('booking');
  const [formErrors, setFormErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [reviewData, setReviewData] = useState({
    name: '', email: '', rating: 0, comment: '',
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);
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
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load package details');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    fetchPackageReviews(id, 50, 1)
      .then((reviewsData) => {
        if (!isMounted) return;
        const fetchedReviews = Array.isArray(reviewsData.reviews)
          ? reviewsData.reviews.map((review) => ({
              id: review.id,
              user_name: review.user_name || 'Traveler',
              rating: review.rating || 0,
              comment: review.comment || '',
              created_at: review.created_at || new Date().toISOString(),
            }))
          : [];
        setReviews(fetchedReviews);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching reviews:', err);
        setReviews([]);
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

  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      // Step 1: Only email is required
      if (!formData.email?.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFormErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pkg) return;

    // Validate final step
    const errors = validateStep(1);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setCurrentStep(1);
      return;
    }
    setFormErrors({});

    setIsSubmittingBooking(true);
    try {
      const formatDate = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
          // If it's already a string, try to parse it
          const parsed = new Date(date);
          if (isNaN(parsed.getTime())) return '';
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, '0');
          const day = String(parsed.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const submissionData = {
        name: formData.name?.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone || undefined,
        travelers: Number(formData.travelers) || 1,
        travelDate: formatDate(formData.travelDate),
        endDate: formatDate(formData.endDate) || undefined,
        message: formData.message?.trim() || undefined,
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
      setCurrentStep(1);
      setFormData({ name: '', email: '', phone: '', travelers: 1, travelDate: null, endDate: null, message: '' });
      
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
      // Get the package data - prefer raw (original API response) which has _id
      // If raw doesn't exist, use pkg but ensure it has the ID
      const packageData = pkg.raw || pkg;
      
      // Ensure the package has an ID for dynamic fetching
      // The PDF service will fetch the latest package data from API using this ID
      const packageWithId = {
        ...packageData,
        _id: packageData._id || packageData.id || id,
        id: packageData.id || packageData._id || id,
      };
      
      console.log('[PDF Download] Package ID:', packageWithId._id || packageWithId.id);
      console.log('[PDF Download] Package name:', packageWithId.name || packageWithId.title);
      
      // Use the same approach as management side - pass package with ID
      // The PDF service will fetch latest data dynamically
      await generateManagementPDF(packageWithId);
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

        /* Mobile-specific styles */
        @media (max-width: 1024px) {
          .hero-height-mobile {
            height: 70vh !important;
          }
          .hero-title-mobile {
            font-size: 2.5rem !important;
            line-height: 1.2 !important;
          }
          .hero-subtitle-mobile {
            font-size: 1.125rem !important;
          }
          .hero-info-cards-mobile {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          .hero-info-card-mobile {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .section-tabs-mobile {
            flex-direction: column !important;
          }
          .section-tab-mobile {
            border-bottom: 1px solid #e5e7eb !important;
            border-radius: 0 !important;
            justify-content: flex-start !important;
          }
          .section-tab-mobile:last-child {
            border-bottom: none !important;
          }
          .section-tab-active-mobile {
            background: linear-gradient(135deg, #000 0%, #1f2937 100%) !important;
            color: white !important;
            border-left: 4px solid #f59e0b !important;
          }
          .itinerary-day-mobile {
            flex-direction: column !important;
            gap: 1rem !important;
          }
          .itinerary-day-number-mobile {
            align-self: flex-start !important;
            margin-bottom: 0.5rem !important;
          }
          .itinerary-connector-mobile {
            display: none !important;
          }
          .inclusions-grid-mobile {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .reviews-header-mobile {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .reviews-rating-section-mobile {
            align-self: stretch !important;
            text-align: left !important;
          }
          .sidebar-sticky-mobile {
            position: relative !important;
            top: auto !important;
          }
          .pricing-card-mobile {
            padding: 1.5rem !important;
          }
          .pricing-title-mobile {
            font-size: 1.125rem !important;
          }
          .pricing-amount-mobile {
            font-size: 2.5rem !important;
          }
          .booking-buttons-mobile {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          .assistance-card-mobile {
            padding: 1.5rem !important;
          }
          .assistance-contact-mobile {
            padding: 1rem !important;
            gap: 1rem !important;
          }
          .modal-max-height-mobile {
            max-height: 95vh !important;
          }
          .modal-padding-mobile {
            padding: 1.5rem !important;
          }
          .form-grid-mobile {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .form-input-mobile {
            padding: 0.875rem 1rem !important;
          }
          .review-modal-mobile {
            max-width: 95vw !important;
            margin: 1rem !important;
          }
          .success-modal-mobile {
            max-width: 90vw !important;
          }
        }

        @media (max-width: 640px) {
          .hero-height-sm {
            height: 60vh !important;
          }
          .hero-title-sm {
            font-size: 2rem !important;
          }
          .hero-padding-sm {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            padding-bottom: 2rem !important;
          }
          .main-content-padding-sm {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            padding-top: 1rem !important;
          }
          .section-padding-sm {
            padding: 1.5rem !important;
          }
          .tabs-padding-sm {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          .itinerary-padding-sm {
            padding: 1.25rem !important;
          }
          .inclusions-padding-sm {
            padding: 1.25rem !important;
          }
          .review-card-padding-sm {
            padding: 1.25rem !important;
          }
          .pricing-padding-sm {
            padding: 1.25rem !important;
          }
          .assistance-padding-sm {
            padding: 1.25rem !important;
          }
          .modal-header-padding-sm {
            padding: 1.5rem 1.25rem !important;
          }
          .modal-form-padding-sm {
            padding: 1.5rem 1.25rem !important;
          }
          .button-padding-sm {
            padding: 0.875rem 1rem !important;
          }
        }
      `}</style>

      {/* Hero Section */}
      <div
        className="relative h-[70vh] lg:h-[83vh] overflow-hidden"
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
                <span className="font-medium">4.9</span>
                <span className="text-white/80">(250k+ Reviews)</span>
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
              className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-40 w-10 lg:w-12 h-10 lg:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-110 text-white hidden lg:flex"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-40 w-10 lg:w-12 h-10 lg:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-110 text-white hidden lg:flex"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-4 lg:px-8 -mt-6 lg:-mt-6 relative py-12 lg:py-20 z-10 main-content-padding-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-12 lg:pb-20">
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              
              {/* Section Tabs */}
              <div className="flex flex-col lg:flex-row border-b border-gray-200 section-tabs-mobile">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full lg:flex-1 flex items-center justify-start lg:justify-center gap-3 px-4 lg:px-6 py-4 lg:py-5 font-black transition-all duration-300 section-tab-mobile ${
                        activeSection === section.id
                          ? 'section-tab-active-mobile bg-gradient-to-r from-black to-gray-800 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="hidden sm:inline">{section.label}</span>
                      <span className="sm:hidden">{section.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 lg:p-10 section-padding-sm">
                {activeSection === 'overview' && (
                  <div className="space-y-6 lg:space-y-10">
                    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-orange-200">
                      <div className="flex items-center gap-3 mb-10">
                        <Award className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
                        <h3 className="text-2xl lg:text-3xl font-black text-black">Why Choose Trip Sky Way?</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">Expert Local Guides</p>
                            <p className="text-black text-xs lg:text-sm mt-1">Authentic experiences with guides who know every corner</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">Personalized Itineraries</p>
                            <p className="text-black text-xs lg:text-sm mt-1">Customized journeys tailored to your preferences</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">Rated 4.9 on Google</p>
                            <p className="text-black text-xs lg:text-sm mt-1">Trusted by 250k+ happy travelers</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">24/7 Customer Support</p>
                            <p className="text-gray-600 text-xs lg:text-sm mt-1">Round-the-clock assistance on your journey</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-base lg:text-lg text-gray-700 leading-relaxed">{pkg.description}</p>
                    </div>
                    {pkg.highlights && pkg.highlights.length > 0 && (
                      <div>
                        <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4 lg:mb-6">Premium Highlights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                          {pkg.highlights.map((h, i) => (
                            <div
                              key={i}
                              className="group relative bg-gray-50 rounded-2xl p-4 lg:p-5 hover:shadow-lg transition-all duration-300 border hover:border-amber-300"
                            >
                              <div className="flex items-start gap-3 lg:gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Check className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                                </div>
                                <p className="text-black font-semibold leading-relaxed flex-1 text-sm lg:text-base">{h}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeSection === 'itinerary' && (
                  <div className="space-y-4 lg:space-y-6">
                    <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-6 lg:mb-8 bg-black bg-clip-text text-transparent">
                      Journey Timeline
                    </h2>
                    {pkg.itinerary?.map((day, i) => (
                      <div key={i} className="group relative">
                        <div className="itinerary-day-mobile flex flex-col lg:flex-row gap-4 lg:gap-6">
                          <div className="relative flex-shrink-0 itinerary-day-number-mobile">
                            <div className="w-14 lg:w-16 h-14 lg:h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl lg:text-3xl shadow-lg group-hover:scale-110 transition-transform">
                              {i + 1}
                            </div>
                            {i < (pkg.itinerary?.length || 0)  && (
                              <div className="itinerary-connector-mobile lg:absolute lg:top-20 lg:left-1/2 lg:-translate-x-1/2 w-1 h-12 lg:h-12 bg-gradient-to-b from-orange-300 to-transparent" />
                            )}
                          </div>
                          <div className="flex-1 bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 lg:p-8 border border-gray-200 hover:border-amber-300 hover:shadow-xl transition-all itinerary-padding-sm">
                            <h3 className="text-xl lg:text-2xl font-black text-gray-900 mb-2 lg:mb-3">{day.title}</h3>
                            <p className="text-gray-700 leading-relaxed text-base lg:text-lg">{day.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeSection === 'inclusions' && (
                  <div className="space-y-6 lg:space-y-8">
                    <div className="inclusions-grid-mobile lg:grid-cols-2 grid gap-6 lg:gap-8">
                      <div className="rounded-2xl p-5 lg:p-6 border border-gray-200 inclusions-padding-sm">
                        <div className="flex items-center gap-3 mb-4 lg:mb-6">
                          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">Inclusions</h3>
                        </div>
                        <ul className="space-y-3">
                          {pkg.inclusions?.map((inc, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-700">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-sm lg:text-base">{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl p-5 lg:p-6 border border-gray-200 inclusions-padding-sm">
                        <div className="flex items-center gap-3 mb-4 lg:mb-6">
                          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">Exclusions</h3>
                        </div>
                        <ul className="space-y-3">
                          {pkg.exclusions?.map((exc, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-700">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center mt-0.5">
                                <X className="w-4 h-4 text-red-600" />
                              </div>
                              <span className="text-sm lg:text-base">{exc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="rounded-3xl p-6 lg:p-8 border-2 border-amber-200">
                      <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4 lg:mb-6">Booking Terms</h3>
                      <div className="space-y-4 lg:space-y-5">
                        <div className="flex items-start gap-3 lg:gap-4">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-black text-gray-900 mb-2 text-base lg:text-lg">Cancellation Policy</h4>
                            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">Free cancellation up to 48 hours before departure. Cancellations made within 48 hours will incur a 50% charge. No-shows will be charged 100% of the booking amount.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 lg:gap-4">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-black text-gray-900 mb-2 text-base lg:text-lg">Payment Terms</h4>
                            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">A 30% deposit is required at the time of booking. The remaining balance must be paid 14 days before departure. We accept all major credit cards, bank transfers, and PayPal.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 lg:gap-4">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-black text-gray-900 mb-2 text-base lg:text-lg">Group Bookings</h4>
                            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">Special rates available for groups of 10 or more travelers. Contact our team for customized group packages and discounts.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeSection === 'reviews' && (
                  <div className="space-y-4 lg:space-y-6">
                    <div className="mb-6 lg:mb-8">
                      <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Google Reviews</h2>
                      <p className="text-gray-600 text-sm lg:text-base">Verified reviews from real travelers on Google</p>
                    </div>
                    
                    {/* Elfsight */}
                    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100">
                      <div className="elfsight-app-29a1900e-0181-4873-aac0-7b426c7a478b" data-elfsight-app-lazy></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky lg:sticky top-6 lg:top-24 space-y-4 lg:space-y-6 sidebar-sticky-mobile">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 lg:p-6 pricing-card-mobile pricing-padding-sm">
                <div className="mb-4 lg:mb-6">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1 pricing-title-mobile">Starting from</p>
                  <div className="flex items-baseline gap-2 pricing-amount-mobile">
                    <p className="text-4xl lg:text-5xl font-bold text-gray-900">{formatCurrency(pkg.price_from)}</p>
                    <span className="text-gray-500 font-medium text-sm lg:text-base">/person</span>
                  </div>
                </div>
                <div className="booking-buttons-mobile space-y-3 lg:space-y-4">
                  <button
                    onClick={() => {
                      setSubmissionType('booking');
                      setShowBookingModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3.5 lg:py-4 rounded-xl font-bold text-base lg:text-lg hover:shadow-xl hover:from-yellow-600 hover:to-orange-600 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 button-padding-sm"
                  >
                    <Calendar className="w-4 h-4 lg:w-5 lg:h-5" />
                    Book Now
                  </button>
                  <button
                    onClick={() => navigate(`/package/${pkg.id}/customize`)}
                    className="w-full border-2 border-yellow-500 text-yellow-700 py-3.5 lg:py-4 rounded-xl font-semibold hover:bg-yellow-50 hover:border-yellow-600 transition-all flex items-center justify-center gap-2 button-padding-sm"
                  >
                    Customize Package
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-black to-gray-800 rounded-3xl shadow-2xl p-6 lg:p-8 text-white assistance-card-mobile assistance-padding-sm">
                <h4 className="text-xl lg:text-2xl font-black mb-4 lg:mb-6">Need Assistance?</h4>
                <div className="space-y-3 lg:space-y-4">
                  <a
                    href="tel:+1234567890"
                    className="flex items-center gap-3 lg:gap-4 p-4 assistance-contact-mobile bg-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/20 transition-all block"
                  >
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-200 uppercase tracking-wide">Call Us</p>
                      <p className="font-black text-base lg:text-lg">+91 (987) 6543-210</p>
                    </div>
                  </a>
                  <a
                    href="mailto:info@tripskyway.com"
                    className="flex items-center gap-3 lg:gap-4 p-4 assistance-contact-mobile bg-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/20 transition-all block"
                  >
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-200 uppercase tracking-wide">Email Us</p>
                      <p className="font-black text-base lg:text-lg">info@tripskyway.com</p>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-max-height-mobile">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl lg:max-w-5xl w-full max-h-[95vh] overflow-y-auto modal-max-height-mobile">
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 p-6 lg:p-8 text-white modal-header-padding-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl lg:text-3xl font-black mb-2">
                    Book Your Adventure
                  </h3>
                  <p className="text-amber-100 text-sm lg:text-base">
                    Fill in your details and we'll get back to you within 24 hours
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setCurrentStep(1);
                    setFormErrors({});
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 lg:w-8 lg:h-8" />
                </button>
              </div>
            </div>
            {/* Step Progress Indicator */}
            <div className="px-6 lg:px-8 pt-6">
              <div className="flex items-center justify-between mb-6">
                {[1, 2, 3].map((step) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          currentStep >= step
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {currentStep > step ? <Check className="w-5 h-5" /> : step}
                      </div>
                      <p className={`text-xs mt-2 font-semibold ${
                        currentStep >= step ? 'text-amber-600' : 'text-gray-400'
                      }`}>
                        {step === 1 ? 'Contact' : step === 2 ? 'Travel' : 'Review'}
                      </p>
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        currentStep > step ? 'bg-amber-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6 modal-form-padding-sm relative">
              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h4>
                    <p className="text-sm text-gray-600 mb-6">Let's start with your contact details</p>
                  </div>
                  
                  {/* Email - Required */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="block text-sm font-black text-gray-900">Email Address</label>
                      <span className="px-2.5 py-1 text-xs font-bold text-amber-600 bg-amber-100 rounded-full">Required</span>
                    </div>
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
                      className={`w-full px-5 py-4 text-base border-2 rounded-2xl focus:ring-4 focus:ring-amber-100 transition-all form-input-mobile ${
                        formErrors.email
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-amber-500/30 focus:border-amber-500 bg-amber-50/50'
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {formErrors.email && (
                      <p className="text-red-600 text-sm font-semibold mt-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="form-grid-mobile lg:grid-cols-2 grid gap-6">
                    {/* Name - Optional */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                        <span className="text-xs text-gray-500">(Optional)</span>
                      </div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({...formData, name: e.target.value});
                          if (formErrors.name) {
                            setFormErrors({...formErrors, name: ''});
                          }
                        }}
                        className="w-full px-5 py-4 text-base border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all form-input-mobile bg-white hover:bg-gray-50"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Phone - Optional with country code */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="block text-sm font-semibold text-gray-700">Phone Number</label>
                        <span className="text-xs text-gray-500">(Optional)</span>
                      </div>
                      <PhoneInput
                        international
                        defaultCountry="LK"
                        value={formData.phone}
                        onChange={(value) => {
                          setFormData({...formData, phone: value || ''});
                          if (formErrors.phone) {
                            setFormErrors({...formErrors, phone: ''});
                          }
                        }}
                        className="phone-input-wrapper"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 lg:py-5 rounded-2xl font-black text-base lg:text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3 button-padding-sm"
                    >
                      Next Step
                      <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Travel Details */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  {/* Enhanced Header */}
                  <div className="text-center pb-4 border-b border-amber-100">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      Plan Your Journey
                    </h4>
                    <p className="text-sm text-gray-600">Select your travel dates and preferences</p>
                  </div>

                  {/* Date Range Picker - Enhanced */}
                  <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-3xl p-6 lg:p-8 border-2 border-amber-100 shadow-lg w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
                        <Calendar className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="block text-base font-bold text-gray-900">Travel Date Range</label>
                        <span className="text-xs text-amber-600 font-medium">Click dates to select your range</span>
                      </div>
                    </div>
                    <div className="flex justify-center bg-white rounded-2xl p-4 lg:p-6 shadow-inner w-full overflow-x-auto">
                      <DatePicker
                          selected={formData.travelDate ? (typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate) : null}
                          onChange={(dates) => {
                          // With selectsRange, dates is either [start, end] array or a single Date
                          if (dates) {
                            if (Array.isArray(dates)) {
                              // Both dates selected - [startDate, endDate]
                              const [start, end] = dates;
                              setFormData({
                                ...formData,
                                travelDate: start || null,
                                endDate: end || null,
                              });
                            } else {
                              // Single date clicked - react-datepicker handles range selection automatically
                              // First click sets start, second click sets end
                              // We just need to update our state accordingly
                              if (!formData.travelDate || formData.endDate) {
                                // Starting new selection or resetting
                                setFormData({
                                  ...formData,
                                  travelDate: dates,
                                  endDate: null,
                                });
                              } else {
                                // Second date clicked - set as end date
                                if (dates >= formData.travelDate) {
                                  setFormData({
                                    ...formData,
                                    endDate: dates,
                                  });
                                } else {
                                  // Selected date is before start, make it the new start
                                  setFormData({
                                    ...formData,
                                    travelDate: dates,
                                    endDate: null,
                                  });
                                }
                              }
                            }
                          } else {
                            // Cleared
                            setFormData({
                              ...formData,
                              travelDate: null,
                              endDate: null,
                            });
                          }
                        }}
                        startDate={formData.travelDate ? (typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate) : null}
                        endDate={formData.endDate ? (typeof formData.endDate === 'string' ? new Date(formData.endDate) : formData.endDate) : null}
                        selectsRange
                        inline
                        minDate={new Date()}
                        calendarClassName="!shadow-2xl !border-gray-200 !rounded-2xl"
                      />
                    </div>
                    {formData.travelDate && (
                      <div className={`mt-4 p-4 rounded-xl transition-all duration-300 ${
                        formData.endDate 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                          : 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Check className={`w-5 h-5 ${formData.endDate ? 'text-green-600' : 'text-amber-600'}`} />
                          <p className={`text-sm font-bold ${formData.endDate ? 'text-green-800' : 'text-amber-800'}`}>
                            {formData.endDate 
                              ? `Selected: ${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${(typeof formData.endDate === 'string' ? new Date(formData.endDate) : formData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              : `Start Date: ${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - Select end date`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Travelers & Requests Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Number of Travelers - Enhanced */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-6 border-2 border-blue-100 hover:border-blue-200 transition-all min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-base font-bold text-gray-900">Number of Travelers</label>
                          <span className="text-xs text-gray-500">(Optional)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, travelers: Math.max(1, formData.travelers - 1)})}
                          className="w-12 h-12 rounded-xl bg-white border-2 border-blue-200 text-blue-600 font-bold text-lg hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center shadow-sm"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={formData.travelers}
                          onChange={(e) => setFormData({...formData, travelers: +e.target.value || 1})}
                          className="flex-1 px-5 py-4 text-center text-2xl font-bold border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white"
                          placeholder="2"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, travelers: formData.travelers + 1})}
                          className="w-12 h-12 rounded-xl bg-white border-2 border-blue-200 text-blue-600 font-bold text-lg hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Special Requests - Enhanced */}
                    <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/30 rounded-2xl p-6 border-2 border-purple-100 hover:border-purple-200 transition-all min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-xl flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-base font-bold text-gray-900">Special Requests</label>
                          <span className="text-xs text-gray-500">(Optional)</span>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        className="w-full px-5 py-4 text-base border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all resize-none bg-white hover:bg-purple-50/50 placeholder:text-gray-400"
                        placeholder="Any dietary requirements, accessibility needs, or special occasions? We're here to make your trip perfect!"
                      />
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-6 flex gap-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-base lg:text-lg hover:bg-gray-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 button-padding-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-black text-base lg:text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3 button-padding-sm"
                    >
                      Next Step
                      <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-4">Review & Submit</h4>
                    <p className="text-sm text-gray-600 mb-6">Please review your information before submitting</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                    <div className="border-b border-gray-200 pb-4">
                      <h5 className="font-bold text-gray-900 mb-3">Contact Information</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Email:</span> {formData.email || <span className="text-gray-400">Not provided</span>}</p>
                        <p><span className="font-semibold">Name:</span> {formData.name || <span className="text-gray-400">Not provided</span>}</p>
                        <p><span className="font-semibold">Phone:</span> {formData.phone || <span className="text-gray-400">Not provided</span>}</p>
                      </div>
                    </div>
                    <div className="border-b border-gray-200 pb-4">
                      <h5 className="font-bold text-gray-900 mb-3">Travel Details</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Date Range:</span> {
                          formData.travelDate && formData.endDate
                            ? `${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${(typeof formData.endDate === 'string' ? new Date(formData.endDate) : formData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : formData.travelDate
                            ? `${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (Start only)`
                            : <span className="text-gray-400">Not provided</span>
                        }</p>
                        <p><span className="font-semibold">Travelers:</span> {formData.travelers || 1}</p>
                        <p><span className="font-semibold">Special Requests:</span> {formData.message || <span className="text-gray-400">None</span>}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-base lg:text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 button-padding-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingBooking}
                      className={`flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-black text-base lg:text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3 button-padding-sm ${
                        isSubmittingBooking ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmittingBooking
                        ? 'Submitting...'
                        : 'Submit Booking Request'}
                      <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Review Modal - Mobile Responsive */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full review-modal-mobile p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Write a Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reviewData.name || !reviewData.rating || !reviewData.comment) {
                  alert('Please fill in all fields');
                  return;
                }
                setIsSubmittingReview(true);
                try {
                  const newReview = await submitReview(id, reviewData);
                  if (newReview) {
                    setReviews([
                      {
                        id: newReview.id,
                        user_name: newReview.user_name,
                        rating: newReview.rating,
                        comment: newReview.comment,
                        created_at: newReview.created_at,
                      },
                      ...reviews,
                    ]);
                  }
                  setReviewData({ name: '', email: '', rating: 0, comment: '' });
                  setShowReviewModal(false);
                  setShowReviewSuccess(true);
                  setTimeout(() => setShowReviewSuccess(false), 4000);
                } catch (error) {
                  console.error('Error submitting review:', error);
                  alert('Failed to submit review. Please try again.');
                } finally {
                  setIsSubmittingReview(false);
                }
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none form-input-mobile"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900">Rating</label>
                  <span className="text-sm text-gray-600">{reviewData.rating} out of 5</span>
                </div>
                <div className="flex gap-2 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="transition-colors p-1"
                    >
                      <Star
                        className={`w-7 h-7 lg:w-8 lg:h-8 ${
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none form-input-mobile"
                  rows={4}
                  placeholder="Share your experience..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors button-padding-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed button-padding-sm"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal - Mobile Responsive */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full success-modal-mobile p-6 lg:p-8">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-3">Booking Submitted Successfully!</h2>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm lg:text-base">
                Thank you for your booking request. We'll review your details and contact you within 24 hours to confirm your adventure!
              </p>
              {isDownloading && (
                <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 font-semibold flex items-center justify-center gap-2">
                    <Download className="w-5 h-5 animate-bounce" />
                    Downloading your itinerary PDF...
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setIsDownloading(true);
                    try {
                      await downloadPDF();
                    } catch (error) {
                      console.error('Error downloading PDF:', error);
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-300 button-padding-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {isDownloading ? 'Downloading...' : 'Download Itinerary PDF'}
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setShowBookingModal(false);
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all duration-300 button-padding-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Success */}
      {showReviewSuccess && (
        <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm mx-auto">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3 lg:gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-white/20 backdrop-blur-sm">
                <Check className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm lg:text-base">Review Submitted!</p>
              <p className="text-sm text-white/90 mt-0.5 line-clamp-2">Thank you for sharing your experience.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}